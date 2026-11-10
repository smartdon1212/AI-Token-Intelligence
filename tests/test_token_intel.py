"""
Unit tests for token_intel core research engine.
Tests math correctness, leak-free task splitting, and cost isolation.
"""

import unittest
import os
import sqlite3
import tempfile

from token_intel.database import initialize_database, get_connection
from token_intel.cost_engine import CostCalculationEngine
from token_intel.collector import TokenUsageCollector
from token_intel.analytics import AnalyticsEngine
from token_intel.forecasting import BaselineForecaster
from token_intel.evaluator import EvaluationEngine


class TestTokenIntelligence(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        initialize_database(self.temp_db_path)
        self.conn = get_connection(self.temp_db_path)
        self.collector = TokenUsageCollector(self.conn)
        self.cost_engine = CostCalculationEngine(self.conn)
        self.analytics = AnalyticsEngine(self.conn)
        self.forecaster = BaselineForecaster(self.conn)
        self.evaluator = EvaluationEngine(self.conn)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        os.unlink(self.temp_db_path)

    def test_cost_calculation_isolation(self):
        # Gemini 3.8 Flash pricing in canonical seed is $0.10/1M in, $0.40/1M out
        pricing = self.cost_engine.get_effective_pricing("gemini-3.8-flash")
        self.assertIsNotNone(pricing)
        self.assertEqual(pricing.input_price_per_1m, 0.10)
        self.assertEqual(pricing.output_price_per_1m, 0.40)

        cost = self.cost_engine.calculate_cost(
            request_id="test-req-1",
            model_id="gemini-3.8-flash",
            input_tokens=1_000_000,
            output_tokens=500_000,
            actual_billed_usd=0.28
        )
        # Expected: 1M * 0.10 + 0.5M * 0.40 = 0.10 + 0.20 = 0.30
        self.assertAlmostEqual(cost.input_cost_usd, 0.10, places=4)
        self.assertAlmostEqual(cost.output_cost_usd, 0.20, places=4)
        self.assertAlmostEqual(cost.estimated_cost_usd, 0.30, places=4)
        self.assertAlmostEqual(cost.actual_billed_usd, 0.28, places=4)
        # Discrepancy = 0.30 - 0.28 = 0.02
        self.assertAlmostEqual(cost.cost_discrepancy_usd, 0.02, places=4)

    def test_negative_tokens_rejected(self):
        with self.assertRaises(ValueError):
            self.collector.record_request_telemetry(
                task_id="task-err",
                model_id="gemini-3.8-flash",
                input_tokens=-10,
                output_tokens=100,
                duration_ms=200,
                prompt_char_length=400
            )

    def test_task_level_leak_free_split(self):
        # Seed 4 tasks
        for i in range(4):
            t_id = f"task-split-{i}"
            for turn in range(2):
                self.collector.record_request_telemetry(
                    task_id=t_id,
                    model_id="gemini-3.8-flash",
                    input_tokens=100 * (turn + 1),
                    output_tokens=50,
                    duration_ms=100,
                    prompt_char_length=400 * (turn + 1)
                )

        train_tasks, test_tasks = self.forecaster.get_task_level_split(train_ratio=0.75, random_seed=42)
        # Must be completely disjoint
        overlap = set(train_tasks).intersection(set(test_tasks))
        self.assertEqual(len(overlap), 0)
        self.assertEqual(len(train_tasks) + len(test_tasks), 4)

    def test_forecasting_and_evaluation_pipeline(self):
        # Ingest 10 tasks
        for i in range(10):
            t_id = f"task-pipe-{i}"
            for turn in range(3):
                self.collector.record_request_telemetry(
                    task_id=t_id,
                    model_id="gemini-3.8-flash",
                    input_tokens=200 + (turn * 100),
                    output_tokens=80 + (turn * 40),
                    duration_ms=150,
                    prompt_char_length=800 + (turn * 400),
                    tool_calls_count=turn
                )

        res = self.forecaster.fit_and_predict(train_ratio=0.7, random_seed=42)
        self.assertEqual(res["status"], "success")
        self.assertGreater(res["predictions_generated"], 0)

        evals = self.evaluator.evaluate_baselines("total_tokens")
        self.assertGreaterEqual(len(evals), 3)

        for ev in evals:
            self.assertIn("mae", ev)
            self.assertIn("rmse", ev)
            self.assertIn("mape_pct", ev)
            self.assertIn("bias", ev)
            self.assertGreater(ev["sample_size"], 0)


if __name__ == "__main__":
    unittest.main()
