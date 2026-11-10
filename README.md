# AI Token Intelligence

> **A rigorous research harness and engineering platform for measuring, analyzing, predicting, and optimizing AI token consumption and expenditure across agent workflows.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Database](https://img.shields.io/badge/Storage-SQLite3-brightgreen.svg)](https://www.sqlite.org/)
[![Status](https://img.shields.io/badge/Status-Research%20Prototype%20v0.1.0-orange.svg)]()
[![Integrity](https://img.shields.io/badge/Integrity-Zero--Invention%20Standard-success.svg)]()

---

## 1. Executive Summary

As autonomous multi-turn agents and complex LLM chains proliferate, token consumption unpredictability introduces severe financial volatility, latency degradation, and operational risk. **AI Token Intelligence** provides an open, reproducible research foundation to measure exact token consumption patterns, model cost dynamics, establish baseline prediction benchmarks, and evaluate forecasting models without premature claims or black-box opacity.

---

## 2. System Architecture

The codebase is organized into clean, independent Python modules located in `token_intel/`:

```
ai-token-intelligence/
├── token_intel/                  # Core Python Research Engine
│   ├── __init__.py
│   ├── database.py              # SQLite storage layer & schema migrations
│   ├── collector.py             # Multi-format ingestion (JSON/CSV) & validation
│   ├── cost_engine.py           # Configurable, versioned pricing engine
│   ├── analytics.py             # FinOps aggregation & performance statistics
│   ├── forecasting.py           # Statistical and heuristic baseline forecasters
│   ├── evaluator.py             # Leak-free evaluation matrix (MAE, RMSE, MAPE, Bias)
│   ├── benchmark_data.py        # Reproducible synthetic workload generator
│   ├── gemini_auditor.py        # Optional Gemini-4-Carbon high-thinking audit engine
│   └── api.py                   # FastAPI / REST service endpoints
├── src/                         # Research Dashboard (React + TypeScript + Tailwind)
│   ├── App.tsx
│   ├── components/              # Dense data views, metrics, model comparisons
│   └── lib/                     # API client & TypeScript interfaces
├── DATA_DICTIONARY.md           # Formal database schema & field semantics
├── EXPERIMENT_PLAN.md           # Research plan, hypothesis testing, protocols
├── RESEARCH_LOG.md              # Chronological experiments & findings
├── DECISIONS.md                 # Architecture Decision Records (ADR)
├── requirements.txt             # Python research dependencies
└── server.ts                    # Full-stack Node/Express bridge & dev server
```

### Module Responsibilities:

| Module | Core Responsibility |
|:---|:---|
| **Collector (`collector.py`)** | Ingests token telemetry across providers and agent turns. Validates raw counts, duration, tool calls, and completion status. Formats imports from CSV and JSON. |
| **Cost Engine (`cost_engine.py`)** | Computes input, output, and total expenditure using version-dated pricing matrices. Strictly isolates estimated costs from actual provider invoices. Never hardcodes pricing. |
| **Storage (`database.py`)** | Manages SQLite connection pooling, tables, indexes, and analytical views with enforced relational integrity. |
| **Analytics (`analytics.py`)** | Derives macro metrics: total consumption, expenditure per completed task, retry multipliers, input/output distributions, and model efficiency. |
| **Forecasting (`forecasting.py`)** | Houses deterministic baselines: Historical Mean, Historical Median, and Task-Feature Heuristic. Strictly decoupled from measurement. |
| **Evaluator (`evaluator.py`)** | Evaluates predictions against actuals using task-stratified splits (prevents multi-turn leakage). Calculates MAE, RMSE, safe MAPE, and prediction bias. |
| **Gemini Auditor (`gemini_auditor.py`)** | Optional qualitative reasoning engine leveraging `gemini-4-carbon` with `ThinkingLevel.HIGH` for deep architectural audits of anomalous token expenditures. |

---

## 3. Data Integrity & Research Rules

1. **No Invented Telemetry:** Synthetic demo records are explicitly flagged with `is_synthetic = 1` and `data_source = 'SYNTHETIC_BENCHMARK'`.
2. **Preservation of Raw Observations:** Input/output tokens, character counts, and millisecond latencies are preserved immutably.
3. **Estimate vs. Invoiced Separation:** Modeled financial expenditure (`estimated_cost_usd`) is never conflated with actual cloud invoices (`actual_billed_usd`).
4. **Leak-Free Partitioning:** Train and test partitions are stratified strictly at the `task_id` level to prevent cross-turn leakage in agent workflows.
5. **Baseline Humility:** Naive averages and heuristics are evaluated transparently without being branded as artificial intelligence.

---

## 4. Quick Start & Execution

### Running the Python Research Suite Directly:
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run benchmark seed, forecasting baselines, and evaluation
python3 -m token_intel.benchmark_data --generate --tasks=25
python3 -m token_intel.forecasting --evaluate

# 3. Launch the research dashboard & API
npm run dev
```

Visit `http://localhost:3000` to interact with the Research Dashboard.
