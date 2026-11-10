"""
CLI interface and JSON bridge for AI Token Intelligence.
Exposes database and analytics operations cleanly to the backend server and researchers.
"""

import argparse
import json
import sys
from token_intel.database import get_connection, initialize_database
from token_intel.analytics import AnalyticsEngine
from token_intel.forecasting import BaselineForecaster
from token_intel.evaluator import EvaluationEngine
from token_intel.collector import TokenUsageCollector
from token_intel.benchmark_data import generate_benchmark_telemetry


def main():
    parser = argparse.ArgumentParser(description="AI Token Intelligence Research CLI")
    parser.add_argument("command", choices=[
        "init", "summary", "models", "tasks", "trends", "scatter",
        "evaluations", "run_baselines", "generate_benchmark", "import_json"
    ])
    parser.add_argument("--json-input", type=str, default=None, help="JSON string for imports")
    parser.add_argument("--tasks-count", type=int, default=25, help="Number of tasks to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--train-ratio", type=float, default=0.7, help="Train ratio for task split")
    parser.add_argument("--target-var", type=str, default="total_tokens", help="Target variable for evaluation")
    parser.add_argument("--budget-tokens", type=int, default=1600, help="Budget breach threshold in tokens")
    parser.add_argument("--budget-usd", type=float, default=0.025, help="Budget breach threshold in USD")

    args = parser.parse_args()

    initialize_database()
    conn = get_connection()

    try:
        if args.command == "init":
            print(json.dumps({"status": "success", "message": "Database initialized."}))

        elif args.command == "summary":
            analytics = AnalyticsEngine(conn)
            data = analytics.get_summary_metrics()
            print(json.dumps(data))

        elif args.command == "models":
            analytics = AnalyticsEngine(conn)
            data = analytics.get_model_level_breakdown()
            print(json.dumps(data))

        elif args.command == "tasks":
            analytics = AnalyticsEngine(conn)
            data = analytics.get_task_level_breakdown(limit=60)
            print(json.dumps(data))

        elif args.command == "trends":
            analytics = AnalyticsEngine(conn)
            data = analytics.get_usage_trends()
            print(json.dumps(data))

        elif args.command == "scatter":
            evaluator = EvaluationEngine(conn)
            data = evaluator.get_prediction_vs_actual_scatter(limit=100)
            print(json.dumps(data))

        elif args.command == "evaluations":
            evaluator = EvaluationEngine(conn)
            data = evaluator.evaluate_baselines(
                target_variable=args.target_var,
                budget_threshold_tokens=args.budget_tokens,
                budget_threshold_usd=args.budget_usd
            )
            print(json.dumps(data))

        elif args.command == "run_baselines":
            forecaster = BaselineForecaster(conn)
            fit_res = forecaster.fit_and_predict(train_ratio=args.train_ratio, random_seed=args.seed)
            evaluator = EvaluationEngine(conn)
            eval_res = evaluator.evaluate_baselines(
                target_variable=args.target_var,
                budget_threshold_tokens=args.budget_tokens,
                budget_threshold_usd=args.budget_usd
            )
            print(json.dumps({"fit": fit_res, "evaluations": eval_res}))

        elif args.command == "generate_benchmark":
            count = generate_benchmark_telemetry(num_tasks=args.tasks_count, random_seed=args.seed)
            forecaster = BaselineForecaster(conn)
            forecaster.fit_and_predict(train_ratio=args.train_ratio, random_seed=args.seed)
            evaluator = EvaluationEngine(conn)
            evaluator.evaluate_baselines(
                target_variable=args.target_var,
                budget_threshold_tokens=args.budget_tokens,
                budget_threshold_usd=args.budget_usd
            )
            print(json.dumps({"status": "success", "generated_requests": count, "tasks_count": args.tasks_count}))

        elif args.command == "import_json":
            collector = TokenUsageCollector(conn)
            records = json.loads(args.json_input or "[]")
            count = collector.import_from_json(records)
            print(json.dumps({"status": "success", "imported_count": count}))

    finally:
        conn.close()


if __name__ == "__main__":
    main()
