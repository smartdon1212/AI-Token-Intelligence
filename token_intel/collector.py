"""
Token Usage Collector for AI Token Intelligence.
Handles telemetry ingestion from JSON, CSV, and programmatic APIs.
Validates raw observations, links tasks, requests, token counts, and calculates costs.
"""

import csv
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import sqlite3

from token_intel.models import Task, RequestRecord, TokenUsage, CostRecord
from token_intel.cost_engine import CostCalculationEngine


class TokenUsageCollector:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cost_engine = CostCalculationEngine(conn)

    def record_request_telemetry(
        self,
        task_id: str,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        duration_ms: int,
        prompt_char_length: int,
        task_type: str = "general_task",
        task_description: Optional[str] = None,
        task_status: str = "COMPLETED",
        request_status: str = "SUCCESS",
        tool_calls_count: int = 0,
        retry_count: int = 0,
        thinking_tokens: int = 0,
        cached_tokens: int = 0,
        timestamp_iso: Optional[str] = None,
        data_source: str = "MANUAL_ENTRY",
        is_synthetic: int = 0,
        actual_billed_usd: Optional[float] = None,
        raw_metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[RequestRecord, TokenUsage, CostRecord]:
        """
        Record a single execution turn into requests, token_usage, and cost_records tables atomically.
        Creates or updates the parent task.
        """
        if input_tokens < 0 or output_tokens < 0:
            raise ValueError(f"Tokens must be non-negative: input={input_tokens}, output={output_tokens}")
        if duration_ms < 0:
            raise ValueError(f"Duration must be non-negative: duration_ms={duration_ms}")

        total_tokens = input_tokens + output_tokens
        ts = timestamp_iso or (datetime.utcnow().isoformat() + "Z")
        request_id = f"req-{uuid.uuid4().hex[:12]}"
        usage_id = f"tok-{request_id}"

        cur = self.conn.cursor()

        # 1. Upsert parent task
        cur.execute("SELECT task_id, total_requests FROM tasks WHERE task_id = ?;", (task_id,))
        task_row = cur.fetchone()
        if not task_row:
            cur.execute("""
                INSERT INTO tasks (task_id, task_type, description, total_requests, status, start_time, is_synthetic)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (task_id, task_type, task_description or f"Workflow for {task_id}", 1, task_status, ts, is_synthetic))
        else:
            cur.execute("""
                UPDATE tasks
                SET total_requests = total_requests + 1,
                    status = ?,
                    end_time = ?
                WHERE task_id = ?;
            """, (task_status, ts, task_id))

        # 2. Insert request record
        meta_str = json.dumps(raw_metadata) if raw_metadata else None
        req = RequestRecord(
            request_id=request_id,
            task_id=task_id,
            model_id=model_id,
            timestamp=ts,
            duration_ms=duration_ms,
            prompt_char_length=prompt_char_length,
            tool_calls_count=tool_calls_count,
            retry_count=retry_count,
            status=request_status,
            data_source=data_source,
            raw_metadata=meta_str
        )
        cur.execute("""
            INSERT INTO requests (
                request_id, task_id, model_id, timestamp, duration_ms,
                prompt_char_length, tool_calls_count, retry_count, status,
                data_source, raw_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            req.request_id, req.task_id, req.model_id, req.timestamp, req.duration_ms,
            req.prompt_char_length, req.tool_calls_count, req.retry_count, req.status,
            req.data_source, req.raw_metadata
        ))

        # 3. Insert token usage record
        tok = TokenUsage(
            usage_id=usage_id,
            request_id=request_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            thinking_tokens=thinking_tokens,
            cached_tokens=cached_tokens
        )
        cur.execute("""
            INSERT INTO token_usage (
                usage_id, request_id, input_tokens, output_tokens,
                total_tokens, thinking_tokens, cached_tokens
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            tok.usage_id, tok.request_id, tok.input_tokens, tok.output_tokens,
            tok.total_tokens, tok.thinking_tokens, tok.cached_tokens
        ))

        # 4. Calculate cost record
        cost = self.cost_engine.calculate_cost(
            request_id=request_id,
            model_id=model_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=cached_tokens,
            timestamp_iso=ts,
            actual_billed_usd=actual_billed_usd
        )
        cur.execute("""
            INSERT INTO cost_records (
                cost_id, request_id, pricing_id, input_cost_usd,
                output_cost_usd, estimated_cost_usd, actual_billed_usd,
                cost_discrepancy_usd, calculated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            cost.cost_id, cost.request_id, cost.pricing_id, cost.input_cost_usd,
            cost.output_cost_usd, cost.estimated_cost_usd, cost.actual_billed_usd,
            cost.cost_discrepancy_usd, cost.calculated_at
        ))

        self.conn.commit()
        return req, tok, cost

    def import_from_json(self, json_data: List[Dict[str, Any]], default_source: str = "JSON_IMPORT") -> int:
        """Import a batch of telemetry records from JSON array."""
        count = 0
        for item in json_data:
            self.record_request_telemetry(
                task_id=item.get("task_id", f"task-imp-{uuid.uuid4().hex[:6]}"),
                model_id=item["model_id"],
                input_tokens=int(item["input_tokens"]),
                output_tokens=int(item["output_tokens"]),
                duration_ms=int(item.get("duration_ms", 500)),
                prompt_char_length=int(item.get("prompt_char_length", item["input_tokens"] * 4)),
                task_type=item.get("task_type", "imported_task"),
                task_status=item.get("task_status", "COMPLETED"),
                request_status=item.get("status", "SUCCESS"),
                tool_calls_count=int(item.get("tool_calls_count", 0)),
                retry_count=int(item.get("retry_count", 0)),
                thinking_tokens=int(item.get("thinking_tokens", 0)),
                cached_tokens=int(item.get("cached_tokens", 0)),
                timestamp_iso=item.get("timestamp"),
                data_source=item.get("data_source", default_source),
                is_synthetic=int(item.get("is_synthetic", 0)),
                actual_billed_usd=float(item["actual_billed_usd"]) if item.get("actual_billed_usd") is not None else None
            )
            count += 1
        return count

    def import_from_csv(self, csv_filepath: str, default_source: str = "CSV_IMPORT") -> int:
        """Import telemetry records from a CSV file."""
        count = 0
        with open(csv_filepath, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.record_request_telemetry(
                    task_id=row.get("task_id") or f"task-csv-{uuid.uuid4().hex[:6]}",
                    model_id=row["model_id"],
                    input_tokens=int(row["input_tokens"]),
                    output_tokens=int(row["output_tokens"]),
                    duration_ms=int(row.get("duration_ms", 500)),
                    prompt_char_length=int(row.get("prompt_char_length", int(row["input_tokens"]) * 4)),
                    task_type=row.get("task_type", "imported_csv_task"),
                    task_status=row.get("task_status", "COMPLETED"),
                    request_status=row.get("status", "SUCCESS"),
                    tool_calls_count=int(row.get("tool_calls_count", 0)),
                    retry_count=int(row.get("retry_count", 0)),
                    thinking_tokens=int(row.get("thinking_tokens", 0)),
                    cached_tokens=int(row.get("cached_tokens", 0)),
                    timestamp_iso=row.get("timestamp"),
                    data_source=row.get("data_source", default_source),
                    is_synthetic=int(row.get("is_synthetic", 0)),
                    actual_billed_usd=float(row["actual_billed_usd"]) if row.get("actual_billed_usd") else None
                )
                count += 1
        return count
