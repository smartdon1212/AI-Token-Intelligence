"""
Initial Analytics Engine for AI Token Intelligence.
Computes FinOps metrics, consumption distributions, task-level expenditures,
retry overhead, model breakdowns, and usage trends.
"""

from typing import Dict, Any, List, Optional
import sqlite3


class AnalyticsEngine:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def get_summary_metrics(self) -> Dict[str, Any]:
        """
        Derives core executive FinOps metrics:
        - Total tokens, input/output breakdown
        - Total estimated expenditure vs actual billed
        - Cost per completed task
        - Failed requests & retry rate
        """
        cur = self.conn.cursor()

        # Token totals
        cur.execute("""
            SELECT
                COUNT(r.request_id) as total_requests,
                COALESCE(SUM(u.input_tokens), 0) as total_input_tokens,
                COALESCE(SUM(u.output_tokens), 0) as total_output_tokens,
                COALESCE(SUM(u.total_tokens), 0) as total_tokens,
                COALESCE(SUM(u.thinking_tokens), 0) as total_thinking_tokens,
                COALESCE(SUM(u.cached_tokens), 0) as total_cached_tokens,
                COALESCE(AVG(r.duration_ms), 0) as avg_latency_ms
            FROM requests r
            JOIN token_usage u ON r.request_id = u.request_id;
        """)
        token_row = cur.fetchone()

        # Cost totals
        cur.execute("""
            SELECT
                COALESCE(SUM(input_cost_usd), 0) as total_input_cost,
                COALESCE(SUM(output_cost_usd), 0) as total_output_cost,
                COALESCE(SUM(estimated_cost_usd), 0) as total_estimated_cost,
                COALESCE(SUM(actual_billed_usd), 0) as total_actual_billed,
                COALESCE(SUM(cost_discrepancy_usd), 0) as total_discrepancy
            FROM cost_records;
        """)
        cost_row = cur.fetchone()

        # Task statistics
        cur.execute("""
            SELECT
                COUNT(task_id) as total_tasks,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_tasks
            FROM tasks;
        """)
        task_row = cur.fetchone()

        # Retries and failures
        cur.execute("""
            SELECT
                SUM(retry_count) as total_retries,
                SUM(CASE WHEN status != 'SUCCESS' THEN 1 ELSE 0 END) as failed_requests,
                SUM(tool_calls_count) as total_tool_calls
            FROM requests;
        """)
        err_row = cur.fetchone()

        total_tasks = task_row["total_tasks"] or 0
        completed_tasks = task_row["completed_tasks"] or 0
        total_est_cost = cost_row["total_estimated_cost"] or 0.0

        avg_cost_per_task = (total_est_cost / total_tasks) if total_tasks > 0 else 0.0
        cost_per_completed_task = (total_est_cost / completed_tasks) if completed_tasks > 0 else 0.0

        total_tokens = token_row["total_tokens"] or 0
        input_tokens = token_row["total_input_tokens"] or 0
        output_tokens = token_row["total_output_tokens"] or 0

        input_ratio = (input_tokens / total_tokens * 100.0) if total_tokens > 0 else 0.0
        output_ratio = (output_tokens / total_tokens * 100.0) if total_tokens > 0 else 0.0

        return {
            "total_requests": token_row["total_requests"],
            "total_tokens": total_tokens,
            "total_input_tokens": input_tokens,
            "total_output_tokens": output_tokens,
            "total_thinking_tokens": token_row["total_thinking_tokens"],
            "total_cached_tokens": token_row["total_cached_tokens"],
            "input_token_ratio_pct": round(input_ratio, 2),
            "output_token_ratio_pct": round(output_ratio, 2),
            "avg_latency_ms": round(token_row["avg_latency_ms"], 1),
            "total_estimated_cost_usd": round(total_est_cost, 6),
            "total_actual_billed_usd": round(cost_row["total_actual_billed"], 6),
            "cost_discrepancy_usd": round(cost_row["total_discrepancy"], 6),
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": task_row["failed_tasks"] or 0,
            "avg_cost_per_task_usd": round(avg_cost_per_task, 6),
            "cost_per_completed_task_usd": round(cost_per_completed_task, 6),
            "total_retries": err_row["total_retries"] or 0,
            "failed_requests": err_row["failed_requests"] or 0,
            "total_tool_calls": err_row["total_tool_calls"] or 0,
        }

    def get_model_level_breakdown(self) -> List[Dict[str, Any]]:
        """Returns token consumption, costs, and latency grouped by model."""
        cur = self.conn.cursor()
        cur.execute("""
            SELECT
                r.model_id,
                m.display_name,
                m.provider_id,
                COUNT(r.request_id) as request_count,
                COALESCE(SUM(u.input_tokens), 0) as input_tokens,
                COALESCE(SUM(u.output_tokens), 0) as output_tokens,
                COALESCE(SUM(u.total_tokens), 0) as total_tokens,
                COALESCE(SUM(c.estimated_cost_usd), 0) as estimated_cost_usd,
                COALESCE(SUM(c.actual_billed_usd), 0) as actual_billed_usd,
                COALESCE(AVG(r.duration_ms), 0) as avg_duration_ms,
                COALESCE(SUM(r.retry_count), 0) as retry_count
            FROM requests r
            JOIN models m ON r.model_id = m.model_id
            JOIN token_usage u ON r.request_id = u.request_id
            JOIN cost_records c ON r.request_id = c.request_id
            GROUP BY r.model_id, m.display_name, m.provider_id
            ORDER BY total_tokens DESC;
        """)
        rows = cur.fetchall()
        return [dict(row) for row in rows]

    def get_task_level_breakdown(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns expenditure, token counts, and status per task."""
        cur = self.conn.cursor()
        cur.execute("""
            SELECT
                t.task_id,
                t.task_type,
                t.description,
                t.status,
                t.is_synthetic,
                t.total_requests,
                COALESCE(SUM(u.total_tokens), 0) as total_tokens,
                COALESCE(SUM(u.input_tokens), 0) as input_tokens,
                COALESCE(SUM(u.output_tokens), 0) as output_tokens,
                COALESCE(SUM(c.estimated_cost_usd), 0) as estimated_cost_usd,
                COALESCE(SUM(r.tool_calls_count), 0) as total_tool_calls,
                COALESCE(SUM(r.retry_count), 0) as total_retries,
                COALESCE(SUM(r.duration_ms), 0) as total_duration_ms
            FROM tasks t
            LEFT JOIN requests r ON t.task_id = r.task_id
            LEFT JOIN token_usage u ON r.request_id = u.request_id
            LEFT JOIN cost_records c ON r.request_id = c.request_id
            GROUP BY t.task_id, t.task_type, t.description, t.status, t.is_synthetic, t.total_requests
            ORDER BY t.start_time DESC
            LIMIT ?;
        """, (limit,))
        rows = cur.fetchall()
        return [dict(row) for row in rows]

    def get_usage_trends(self, bucket_by: str = "hour") -> List[Dict[str, Any]]:
        """Group consumption and costs by time bucket."""
        date_format = "%Y-%m-%d %H:00" if bucket_by == "hour" else "%Y-%m-%d"
        cur = self.conn.cursor()
        cur.execute(f"""
            SELECT
                strftime('{date_format}', r.timestamp) as time_bucket,
                COUNT(r.request_id) as request_count,
                COALESCE(SUM(u.total_tokens), 0) as total_tokens,
                COALESCE(SUM(u.input_tokens), 0) as input_tokens,
                COALESCE(SUM(u.output_tokens), 0) as output_tokens,
                COALESCE(SUM(c.estimated_cost_usd), 0) as estimated_cost_usd
            FROM requests r
            JOIN token_usage u ON r.request_id = u.request_id
            JOIN cost_records c ON r.request_id = c.request_id
            GROUP BY time_bucket
            ORDER BY time_bucket ASC;
        """)
        rows = cur.fetchall()
        return [dict(row) for row in rows]
