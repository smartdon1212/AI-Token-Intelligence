# AI Token Intelligence — Architecture & Engineering Decisions (ADR)

**Project:** AI Token Intelligence  
**Document:** Architectural Decision Record (ADR-001)  
**Status:** Approved & Implemented  

---

## Decision 1: SQLite Storage Engine for Initial Prototype

### Context
We need a robust, relational data storage layer to track models, providers, pricing versions, tasks, requests, token usage, cost calculations, predictions, and evaluation metrics without introducing distributed infrastructure overhead in early research phases.

### Decision
Adopt **SQLite 3** (`token_intel.db` via Python's standard `sqlite3` and Pandas SQL adapters).

### Rationale
- Zero operational friction: runs locally without separate daemon processes.
- ACID compliant with foreign key constraints enabled (`PRAGMA foreign_keys = ON;`).
- Fast analytical queries and index support for analytical workloads.
- Trivial exportability: database files can be shared as immutable research artifacts for benchmark validation.
- Schema is fully normalized so migration to PostgreSQL / Cloud SQL in Phase 4 requires only connection string updates.

---

## Decision 2: Strict Decoupling of Cost Estimation vs. Invoiced Billing

### Context
In AI FinOps, teams frequently conflate calculated token-based estimates with actual monthly invoices. Real-world invoices incorporate volume tiering, commitment discounts, taxes, rounding policies, and potential provider metering discrepancies.

### Decision
Store `estimated_cost_usd` and `actual_billed_usd` in separate fields inside `cost_records`, along with `cost_discrepancy_usd`. Modeled costs are derived deterministically using versioned pricing matrices (`pricing_records`), while actual billed charges require external invoice synchronization.

### Rationale
- Prevents false confidence in financial models.
- Directly enables our future research objective: **Provider Billing Anomaly Detection**.

---

## Decision 3: Task-Stratified Train/Test Partitioning

### Context
Agent workflows frequently execute 3 to 15 sequential LLM requests to fulfill a single task (e.g. planning -> search -> code generation -> validation). In-context prompts expand monotonically across turns.

### Decision
Partition experimental splits exclusively by `task_id` rather than randomly sampling individual `request_id`s.

### Rationale
Random sampling at the request level causes severe data leakage: test requests would share identical task goals, agent prompts, and system prompts with the training set, artificially inflating forecasting scores.

---

## Decision 4: Deterministic Baseline Models Before Parametric ML

### Context
There is often premature pressure to train neural networks or gradient boosting models before establishing whether simple heuristics suffice.

### Decision
Implement three transparent, non-black-box baselines first:
1. `HISTORICAL_MEAN`
2. `HISTORICAL_MEDIAN`
3. `TASK_FEATURE_HEURISTIC_V1` (Prompt length character-ratio + tool call regression)

### Rationale
Provides empirical benchmarks against which any future scikit-learn or PyTorch models must be compared to justify their added complexity.

---

## Decision 5: Non-Blocking, Modular Gemini Reasoning Integration

### Context
The user requested optional Google AI Studio / Gemini capabilities, specifically using `gemini-4-carbon` with `ThinkingLevel.HIGH` for deep AI token workload audits and reasoning when desired.

### Decision
Implement the Gemini intelligence layer as an optional, decoupled service (`GeminiAuditor`). The core measurements, pricing mathematics, database writes, and baseline evaluations operate strictly in deterministic Python code without requiring an external API key or network access. When a key is available, the auditor provides high-order qualitative analysis of token inefficiency patterns.
