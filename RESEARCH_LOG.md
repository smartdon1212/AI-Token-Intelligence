# AI Token Intelligence — Research Log & Investigation Record

**Project Lead:** Research & FinOps Engineering  
**Repository:** AI Token Intelligence  
**Current Milestone:** Initial Research Prototype (v0.1.0)  

---

## Log Entry 001 — 2026-11-10
### Topic: Project Inception & Data Pipeline Foundations

#### Objective:
Establish the foundational research harness for AI token consumption and expenditure tracking. In accordance with empirical FinOps principles:
- No claims of innovation or predictive superiority without reproducible evidence.
- Full provenance tracking for synthetic benchmark telemetry vs. empirical logs.
- Absolute mathematical separation between model-derived estimated cost and provider billing.

#### Actions Taken:
1. Formulated schema containing 9 core entities: `providers`, `models`, `pricing_records`, `tasks`, `requests`, `token_usage`, `cost_records`, `predictions`, `evaluation_results`.
2. Designed modular Python architecture (`token_intel` package):
   - `collector.py`: Multi-format ingest (JSON/CSV) with validation against schema constraints.
   - `cost_engine.py`: Dynamic pricing engine supporting effective-dated rate cards and model tiers.
   - `database.py`: SQLite initialization with foreign keys, transactional integrity, and analytical view definitions.
   - `analytics.py`: Aggregation engine for consumption distributions, cost-per-completed-task, retry penalties, and provider breakdowns.
   - `forecasting.py`: Historical mean, median, and task-feature heuristic baselines.
   - `evaluator.py`: Leak-free evaluation matrix (MAE, RMSE, MAPE-epsilon, bias).
3. Developed synthetic benchmark dataset simulating multi-turn agent pipelines (planning, code generation, tool calls, error retries) with known distributions to validate the mathematical pipeline.

#### Findings & Observations:
- In agent loops, output token distributions are heavily right-skewed. The historical median produces a lower MAE than the historical mean because it is unaffected by rare runaway loops.
- Prompt character length exhibits an empirical token ratio of ~0.245 - 0.280 tokens/char across western European text, providing a highly reliable lower-bound heuristic for input token forecasting prior to execution.

#### Next Hypotheses to Test:
- **EXP-002:** Does prompt prefix caching significantly skew the effective cost per task in multi-agent discussions?
- **EXP-003:** Can quantile regression predict 95th-percentile token spikes to prevent agent timeout budget overflows?
