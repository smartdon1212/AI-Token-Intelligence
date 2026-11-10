# AI Token Intelligence — Experiment Plan: Token Consumption Baselines

**Document ID:** EXP-001  
**Status:** ACTIVE  
**Primary Investigator:** Senior AI Systems / FinOps Research Team  
**Date:** 2026-11-10  

---

## 1. Research Problem & Objective

Predicting token consumption and execution expenditure before triggering Large Language Model (LLM) calls or complex agentic pipelines is critical for:
- Pre-execution budget throttling.
- Dynamic model routing (e.g. choosing lightweight vs high-capacity models).
- FinOps variance minimization and cost anomaly detection.

**Core Research Question:**  
*How accurately can simple deterministic heuristics and statistical baselines predict token consumption in agent workflows, and what is the baseline error distribution before training parameterized machine learning models?*

---

## 2. Hypotheses

- **H0 (Null Hypothesis):** Task-level feature heuristics (prompt character length, tool call frequency) do not provide a statistically significant reduction in Mean Absolute Error (MAE) compared to naive historical mean/median prediction on held-out tasks.
- **H1 (Alternative Hypothesis):** Prompt character length strongly bounds input tokens with near-linear correlation, and tool call count positively correlates with output token expansion, leading to >= 20% MAE reduction over unconditional central-tendency baselines.

---

## 3. Data Integrity & Leakage Prevention Protocol

1. **Strict Task-Level Partitioning:**  
   In multi-turn agent workflows, subsequent turns in the same task share context and accumulated history. Splitting data randomly at the *request* level causes severe data leakage. Therefore, all train/test splits are partitioned strictly at the **`task_id`** level (70% Train Tasks, 30% Test Tasks).
2. **Zero-Invention Standard:**  
   All imported demonstration datasets are explicitly tagged as `SYNTHETIC_BENCHMARK`. No synthetic sample may ever be represented as live production user telemetry.
3. **Immutability of Observations:**  
   Raw timestamps, character lengths, duration, and token counts are preserved without trimming or synthetic normalization.
4. **Reproducibility Guarantee:**  
   Random seeds for data generation and task partitioning are explicitly fixed (e.g., `RANDOM_SEED = 42`).

---

## 4. Evaluated Baselines

1. **Baseline 1: Historical Mean (`HISTORICAL_MEAN`)**  
   $$\hat{y}_{input} = \frac{1}{N_{train}}\sum_{i \in Train} y_{i, input}, \quad \hat{y}_{output} = \frac{1}{N_{train}}\sum_{i \in Train} y_{i, output}$$
   Serves as the basic unconditioned parametric benchmark.

2. **Baseline 2: Historical Median (`HISTORICAL_MEDIAN`)**  
   $$\hat{y} = \text{Median}(y_{Train})$$  
   Robust to heavy-tailed distributions and extreme token spikes typical of agentic loops.

3. **Baseline 3: Task-Feature Heuristic V1 (`TASK_FEATURE_HEURISTIC_V1`)**  
   - Input token estimate: $\hat{y}_{input} = \max(1, \lfloor \text{prompt\_char\_length} \times \alpha \rfloor)$ where $\alpha \approx 0.25$ characters-to-tokens (or learned ratio from training split).  
   - Output token estimate: $\hat{y}_{output} = \text{base\_output} + (\text{tool\_calls} \times \beta)$, where parameters are fit on the training partition.

---

## 5. Evaluation Metrics

For actual values $y_i$ and predicted values $\hat{y}_i$ across test requests $i \in \{1, \dots, M\}$:

1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{M} \sum_{i=1}^M |y_i - \hat{y}_i|$$
2. **Root Mean Squared Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{M} \sum_{i=1}^M (y_i - \hat{y}_i)^2}$$
3. **Epsilon-Adjusted MAPE (Safe for zero / near-zero tokens):**
   $$\text{MAPE}_{\epsilon} = \frac{1}{M} \sum_{i=1}^M \frac{|y_i - \hat{y}_i|}{\max(y_i, \epsilon)} \times 100\% \quad (\epsilon = 1.0)$$
4. **Mean Prediction Bias (Signed Error):**
   $$\text{Bias} = \frac{1}{M} \sum_{i=1}^M (\hat{y}_i - y_i)$$
   Positive bias indicates systematic overestimation (budget bloat); negative bias indicates underestimation (risk of quota exhaustion).

---

## 6. Execution Steps & Verification Checklist

- [x] Step 1: Initialize database schema with full constraint checking.
- [x] Step 2: Ingest benchmark telemetry with explicit provenance labels.
- [x] Step 3: Run task-stratified 70/30 partitioning.
- [x] Step 4: Fit baselines exclusively on Train partition.
- [x] Step 5: Generate predictions on Test partition and compute metric matrix.
- [x] Step 6: Log all metric results to `evaluation_results` table for auditability.
