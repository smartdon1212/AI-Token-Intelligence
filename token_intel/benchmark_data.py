"""
Reproducible Synthetic Benchmark Workload Generator for AI Token Intelligence.
Simulates realistic multi-turn agent workflows with deterministic distributions.
MANDATORY RESEARCH RULE: All generated records are explicitly tagged as 'SYNTHETIC_BENCHMARK' with is_synthetic=1.
"""

import random
import uuid
from datetime import datetime, timedelta
import sqlite3
from typing import List, Dict, Any

from token_intel.collector import TokenUsageCollector
from token_intel.database import get_connection, initialize_database


WORKFLOW_ARCHETYPES = [
    {
        "type": "agent_code_generation",
        "description": "Multi-turn autonomous coding: specification analysis, code synthesis, test execution, and bugfix loops.",
        "models": ["gemini-4-carbon", "claude-3-5-sonnet", "gpt-4o"],
        "min_turns": 3,
        "max_turns": 7,
        "prompt_char_base": 1200,
        "prompt_char_per_turn": 850,
        "output_tokens_range": (350, 1400),
        "tool_call_prob": 0.85,
        "retry_prob": 0.20,
    },
    {
        "type": "multi_hop_research",
        "description": "Decomposed search agent: query planning, web search tool invocation, synthesis, and fact verification.",
        "models": ["gemini-3.8-flash", "gpt-4o-mini"],
        "min_turns": 2,
        "max_turns": 5,
        "prompt_char_base": 800,
        "prompt_char_per_turn": 600,
        "output_tokens_range": (150, 600),
        "tool_call_prob": 0.90,
        "retry_prob": 0.05,
    },
    {
        "type": "data_extraction_json",
        "description": "Document analysis: schema parsing, regex matching, and structured JSON output.",
        "models": ["gemini-3.8-flash", "gpt-4o-mini", "llama-3.3-70b"],
        "min_turns": 1,
        "max_turns": 3,
        "prompt_char_base": 3500,
        "prompt_char_per_turn": 400,
        "output_tokens_range": (80, 450),
        "tool_call_prob": 0.15,
        "retry_prob": 0.08,
    },
    {
        "type": "deep_reasoning_audit",
        "description": "Formal systems and mathematical proof verification requiring chain-of-thought thinking tokens.",
        "models": ["gemini-4-carbon", "gemini-4-argon"],
        "min_turns": 1,
        "max_turns": 3,
        "prompt_char_base": 2200,
        "prompt_char_per_turn": 1100,
        "output_tokens_range": (800, 2400),
        "tool_call_prob": 0.40,
        "retry_prob": 0.12,
    }
]


def generate_benchmark_telemetry(num_tasks: int = 30, random_seed: int = 42, db_path: str = None) -> int:
    """
    Generates a reproducible suite of benchmark tasks and associated requests.
    All data is rigorously marked SYNTHETIC.
    """
    rng = random.Random(random_seed)
    initialize_database(db_path)
    conn = get_connection(db_path)
    collector = TokenUsageCollector(conn)

    total_requests_recorded = 0
    base_time = datetime.utcnow() - timedelta(days=5)

    for task_idx in range(num_tasks):
        archetype = rng.choice(WORKFLOW_ARCHETYPES)
        task_id = f"SYNTH-TASK-{1000 + task_idx}"
        task_type = archetype["type"]
        task_desc = f"[SYNTHETIC] {archetype['description']} (Benchmark Run #{task_idx + 1})"

        turns = rng.randint(archetype["min_turns"], archetype["max_turns"])
        model_id = rng.choice(archetype["models"])

        # Decide if task eventually completed or failed
        task_status = "COMPLETED" if rng.random() > 0.10 else "FAILED"
        task_start = base_time + timedelta(hours=task_idx * 3 + rng.uniform(0, 1))

        current_prompt_chars = archetype["prompt_char_base"]

        for turn_idx in range(turns):
            turn_time = task_start + timedelta(minutes=turn_idx * 2 + rng.uniform(5, 45))
            current_prompt_chars += archetype["prompt_char_per_turn"]

            # Real character to token conversion heuristic with natural variance (~0.23 - 0.29)
            char_ratio = rng.uniform(0.24, 0.28)
            input_tokens = int(current_prompt_chars * char_ratio)

            # Output tokens with archetype variance
            out_min, out_max = archetype["output_tokens_range"]
            output_tokens = int(rng.uniform(out_min, out_max))

            # Tool calls
            has_tool_call = rng.random() < archetype["tool_call_prob"]
            tool_calls = rng.randint(1, 4) if has_tool_call else 0
            if tool_calls > 0:
                output_tokens += tool_calls * rng.randint(40, 180)

            # Retries
            is_retry = rng.random() < archetype["retry_prob"]
            retries = rng.randint(1, 2) if is_retry else 0

            # Duration ms roughly correlated with output tokens and tool calls
            duration_ms = int(350 + (output_tokens * rng.uniform(1.2, 2.5)) + (tool_calls * rng.uniform(200, 600)))

            # If last turn of failed task, mark request failed
            is_last_turn = (turn_idx == turns - 1)
            turn_status = "SUCCESS"
            if is_last_turn and task_status == "FAILED":
                turn_status = "SERVER_ERROR" if rng.random() < 0.5 else "TIMEOUT"

            # Optional cached tokens simulation for later turns
            cached_tokens = int(input_tokens * 0.45) if turn_idx >= 2 else 0

            # Thinking tokens for reasoning models
            thinking_tokens = int(output_tokens * rng.uniform(0.35, 0.65)) if "carbon" in model_id else 0

            # Invoiced actual bill simulation with occasional slight discrepancy (e.g. batch discount or variance)
            actual_billed = None
            if rng.random() < 0.40:
                # Slight delta (-2% to +1%) representing external volume tiering or rounding
                pricing = collector.cost_engine.get_effective_pricing(model_id, turn_time.isoformat() + "Z")
                if pricing:
                    est = ((input_tokens / 1e6) * pricing.input_price_per_1m) + ((output_tokens / 1e6) * pricing.output_price_per_1m)
                    actual_billed = max(0.000001, est * rng.uniform(0.97, 1.01))

            collector.record_request_telemetry(
                task_id=task_id,
                model_id=model_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                duration_ms=duration_ms,
                prompt_char_length=current_prompt_chars,
                task_type=task_type,
                task_description=task_desc,
                task_status=task_status if is_last_turn else "IN_PROGRESS",
                request_status=turn_status,
                tool_calls_count=tool_calls,
                retry_count=retries,
                thinking_tokens=thinking_tokens,
                cached_tokens=cached_tokens,
                timestamp_iso=turn_time.isoformat() + "Z",
                data_source="SYNTHETIC_BENCHMARK",
                is_synthetic=1,
                actual_billed_usd=actual_billed,
                raw_metadata={"turn_index": turn_idx, "archetype": task_type, "seed": random_seed}
            )
            total_requests_recorded += 1

    conn.close()
    return total_requests_recorded


if __name__ == "__main__":
    count = generate_benchmark_telemetry(num_tasks=28, random_seed=42)
    print(f"Generated {count} synthetic benchmark requests across 28 tasks.")
