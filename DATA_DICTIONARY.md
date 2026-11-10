# AI Token Intelligence — Data Dictionary & Schema Specification

**Version:** 0.1.0-prototype  
**Classification:** Research Prototype  
**Storage Engine:** SQLite 3  
**Status:** Canonical Reference

---

## 1. Overview & Data Integrity Principles

This document formally specifies all data models, field definitions, units of measurement, constraints, and operational semantics for the **AI Token Intelligence** research platform.

### Core FinOps & Integrity Guarantees:
1. **Raw Observation Preservation:** Raw token counts (`input_tokens`, `output_tokens`) and request durations are immutable once recorded.
2. **Estimate vs. Actual Billing Separation:** Modeled expenditures (`estimated_cost_usd`) derived from pricing tables are strictly segregated from provider-invoiced charges (`actual_billed_usd`).
3. **Synthetic Provenance Tracking:** Every record contains a provenance flag (`is_synthetic` or `data_source`), ensuring synthetic benchmarks are never conflated with empirical production telemetry.
4. **Task-Level Aggregation:** Requests belong to distinct computational or agentic tasks (`task_id`), enabling workflow-level efficiency and cost-to-value calculations.

---

## 2. Relational Schema Architecture

```
                  +-------------------+
                  |     providers     |
                  +---------+---------+
                            | 1
                            |
                            | N
                  +---------v---------+
                  |      models       |
                  +---------+---------+
                            | 1
                            |
           +----------------+----------------+
           | 1                               | 1
           | N                               | N
+----------v----------+            +---------v---------+
|   pricing_records   |            |     requests      |
+---------------------+            +----+----+----+----+
                                        |    |    |
           +----------------------------+    |    +---------------------------+
           | 1                               | 1                              | 1
           | 1                               | 1                              | N
+----------v----------+            +---------v---------+            +---------v---------+
|     token_usage     |            |   cost_records    |            |    predictions    |
+---------------------+            +-------------------+            +----+----+---------+
                                                                         |
                                                                         | 1:1
                                                                         |
                                                                    +----v--------------+
                                                                    | evaluation_results|
                                                                    +-------------------+
```

---

## 3. Table Definitions & Field Catalogues

### 3.1 `providers`
Represents the AI model provider (e.g., Google DeepMind, Anthropic, OpenAI, Meta/Local).

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `provider_id` | TEXT | NO | PK | Unique slug identifier (e.g., `google`, `anthropic`, `openai`, `local_ollama`). |
| `display_name` | TEXT | NO | - | Human-readable provider title (e.g., "Google DeepMind"). |
| `api_type` | TEXT | NO | - | Protocol type (`rest_api`, `grpc`, `sdk`, `self_hosted`). |
| `created_at` | TEXT | NO | - | ISO-8601 UTC creation timestamp. |

---

### 3.2 `models`
Catalog of model variants, architectures, and context parameters.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `model_id` | TEXT | NO | PK | Canonical model identifier (e.g., `gemini-4-carbon`, `gemini-3.8-flash`, `claude-3-5-sonnet`, `gpt-4o`). |
| `provider_id` | TEXT | NO | FK -> `providers.provider_id` | Associated provider slug. |
| `display_name` | TEXT | NO | - | Standard user-facing title. |
| `context_window` | INTEGER | YES | - | Maximum supported token window (e.g., 1,048,576). |
| `max_output_tokens`| INTEGER | YES | - | Architectural limit on output/generation length. |
| `modalities` | TEXT | NO | - | Comma-separated list (`text`, `code`, `multimodal_vision`, `audio`). |
| `is_active` | INTEGER | NO | - | Boolean flag (1=active, 0=deprecated/inactive). |

---

### 3.3 `pricing_records`
Versioned pricing configurations. Pricing changes over time; this schema mandates effective dating to prevent historical distortion.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `pricing_id` | TEXT | NO | PK | UUID / deterministic hash of `(model_id, version_tag)`. |
| `model_id` | TEXT | NO | FK -> `models.model_id` | Target model identifier. |
| `version_tag` | TEXT | NO | - | Pricing version label (e.g., `2025-01-standard`, `2024-q4-discount`). |
| `effective_start`| TEXT | NO | - | ISO-8601 UTC start timestamp for this pricing tier. |
| `effective_end` | TEXT | YES | - | ISO-8601 UTC expiry timestamp (NULL = actively current). |
| `input_price_per_1m`| REAL | NO | - | Price in USD per 1,000,000 input tokens. |
| `output_price_per_1m`| REAL | NO | - | Price in USD per 1,000,000 output tokens. |
| `cached_input_price_per_1m` | REAL | YES | - | Optional discount rate for cached prompt prefix tokens. |
| `currency` | TEXT | NO | - | ISO-4217 currency code (default: `USD`). |
| `source_notes` | TEXT | YES | - | Documentation reference (e.g., "Official Google Cloud Pricing Sheet Jan 2025"). |

---

### 3.4 `tasks`
Workflows or user-initiated agent runs containing one or more LLM requests.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `task_id` | TEXT | NO | PK | Task identifier (e.g., `TASK-DATA-ANALYSIS-01`, `AGENT-SYNTH-928`). |
| `task_type` | TEXT | NO | - | Taxonomy category: `code_generation`, `multi_hop_qa`, `data_extraction`, `agent_chain_of_thought`, `summarization`. |
| `description` | TEXT | YES | - | Purpose of the task. |
| `total_requests`| INTEGER| NO | - | Count of associated requests. |
| `status` | TEXT | NO | - | Task terminal state: `COMPLETED`, `FAILED`, `ABORTED`, `IN_PROGRESS`. |
| `start_time` | TEXT | NO | - | ISO-8601 UTC start time. |
| `end_time` | TEXT | YES | - | ISO-8601 UTC finish time. |
| `is_synthetic` | INTEGER | NO | - | 1 if synthetic benchmark workload; 0 if empirical production data. |

---

### 3.5 `requests`
Individual LLM API calls and execution telemetry.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `request_id` | TEXT | NO | PK | Unique request transaction ID. |
| `task_id` | TEXT | NO | FK -> `tasks.task_id` | Associated parent task. |
| `model_id` | TEXT | NO | FK -> `models.model_id` | Target model. |
| `timestamp` | TEXT | NO | - | ISO-8601 UTC execution timestamp. |
| `duration_ms` | INTEGER | NO | - | Round-trip latency in milliseconds. |
| `prompt_char_length`| INTEGER| NO | - | Length of user/system prompt in characters. |
| `tool_calls_count`| INTEGER| NO | - | Number of tool/function invocations requested in this turn. |
| `retry_count` | INTEGER | NO | - | Number of retries triggered before success or final failure (0 = first try). |
| `status` | TEXT | NO | - | `SUCCESS`, `RATE_LIMIT_ERROR`, `TIMEOUT`, `CLIENT_ERROR`, `SERVER_ERROR`. |
| `data_source` | TEXT | NO | - | Data origin: `SYNTHETIC_BENCHMARK`, `CSV_IMPORT`, `JSON_IMPORT`, `LIVE_GEMINI_API`. |
| `raw_metadata` | TEXT | YES | - | JSON string for provider headers, finish reasons, or error traces. |

---

### 3.6 `token_usage`
Fine-grained token metrics corresponding to each request.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `usage_id` | TEXT | NO | PK | Unique token usage identifier. |
| `request_id` | TEXT | NO | FK -> `requests.request_id` | 1-to-1 relationship with `requests`. |
| `input_tokens` | INTEGER | NO | - | Total tokens consumed by prompt and context. |
| `output_tokens`| INTEGER | NO | - | Total tokens generated in response. |
| `total_tokens` | INTEGER | NO | - | Derived as `input_tokens + output_tokens`. |
| `thinking_tokens`| INTEGER| YES | - | Sub-budget of reasoning tokens (Gemini Thinking / CoT). |
| `cached_tokens`| INTEGER | YES | - | Tokens matched from prefix cache (0 if none). |

---

### 3.7 `cost_records`
Financial calculations distinguishing estimated expenditure from actual invoiced charges.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `cost_id` | TEXT | NO | PK | Unique cost calculation record ID. |
| `request_id` | TEXT | NO | FK -> `requests.request_id` | Associated request. |
| `pricing_id` | TEXT | NO | FK -> `pricing_records.pricing_id` | The pricing version utilized for calculation. |
| `input_cost_usd` | REAL | NO | - | `(input_tokens / 1,000,000) * input_price_per_1m`. |
| `output_cost_usd`| REAL | NO | - | `(output_tokens / 1,000,000) * output_price_per_1m`. |
| `estimated_cost_usd` | REAL | NO | - | `input_cost_usd + output_cost_usd`. |
| `actual_billed_usd` | REAL | YES | - | Actual provider-invoiced charge if available via billing export (NULL if unbilled). |
| `cost_discrepancy_usd`| REAL | YES | - | `estimated_cost_usd - actual_billed_usd`. |
| `calculated_at` | TEXT | NO | - | ISO-8601 UTC timestamp of calculation. |

---

### 3.8 `predictions`
Experimental baseline forecasts of token consumption.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `prediction_id`| TEXT | NO | PK | Unique prediction entry. |
| `request_id` | TEXT | NO | FK -> `requests.request_id` | Target request being predicted. |
| `baseline_model`| TEXT | NO | - | Algorithm name: `HISTORICAL_MEAN`, `HISTORICAL_MEDIAN`, `TASK_FEATURE_HEURISTIC_V1`. |
| `predicted_input_tokens` | REAL | NO | - | Forecasted input token count. |
| `predicted_output_tokens`| REAL | NO | - | Forecasted output token count. |
| `predicted_total_tokens` | REAL | NO | - | Forecasted total tokens. |
| `predicted_cost_usd` | REAL | NO | - | Estimated financial impact of prediction. |
| `split_assignment` | TEXT | NO | - | Train/Test fold partition: `TRAIN_SET`, `TEST_SET` (Strict task-level split). |
| `created_at` | TEXT | NO | - | Timestamp when prediction was produced. |

---

### 3.9 `evaluation_results`
Comparative evaluation metrics between predictions and ground-truth telemetry.

| Column Name | Type | Nullable | Primary/Foreign Key | Description & Constraints |
|:---|:---|:---|:---|:---|
| `eval_id` | TEXT | NO | PK | Unique evaluation metric record. |
| `baseline_model` | TEXT | NO | - | Algorithm evaluated. |
| `metric_name` | TEXT | NO | - | Metric identifier: `MAE`, `RMSE`, `MAPE_EPSILON`, `MEAN_PREDICTION_BIAS`, `MEDIAN_AE`. |
| `metric_value` | REAL | NO | - | Calculated numeric value of the metric. |
| `sample_size` | INTEGER | NO | - | Number of test requests evaluated. |
| `target_variable` | TEXT | NO | - | Evaluated quantity (`total_tokens`, `output_tokens`, `total_cost_usd`). |
| `evaluated_at` | TEXT | NO | - | Timestamp of evaluation run. |
