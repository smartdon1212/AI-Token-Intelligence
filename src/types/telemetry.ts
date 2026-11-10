export interface SummaryMetrics {
  total_requests: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_thinking_tokens: number;
  total_cached_tokens: number;
  input_token_ratio_pct: number;
  output_token_ratio_pct: number;
  avg_latency_ms: number;
  total_estimated_cost_usd: number;
  total_actual_billed_usd: number;
  cost_discrepancy_usd: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  avg_cost_per_task_usd: number;
  cost_per_completed_task_usd: number;
  total_retries: number;
  failed_requests: number;
  total_tool_calls: number;
}

export interface ModelMetric {
  model_id: string;
  display_name: string;
  provider_id: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  actual_billed_usd: number;
  avg_duration_ms: number;
  retry_count: number;
}

export interface TaskItem {
  task_id: string;
  task_type: string;
  description: string | null;
  status: string;
  is_synthetic: number;
  total_requests: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  total_tool_calls: number;
  total_retries: number;
  total_duration_ms: number;
}

export interface UsageTrend {
  time_bucket: string;
  request_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
}

export interface BudgetDetectionResult {
  budget_threshold: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision_pct: number;
  recall_pct: number;
  f1_score: number;
}

export interface EvaluationItem {
  baseline_model: string;
  target_variable: string;
  sample_size: number;
  mae: number;
  rmse: number;
  mape_pct: number;
  bias: number;
  median_ae: number;
  interval_coverage_pct: number;
  mean_interval_width: number;
  budget_detection: BudgetDetectionResult;
}

export interface ScatterPoint {
  prediction_id: string;
  baseline_model: string;
  predicted_total_tokens: number;
  predicted_cost_usd: number;
  actual_total_tokens: number;
  actual_input_tokens: number;
  actual_output_tokens: number;
  actual_cost_usd: number;
  request_id: string;
  task_id: string;
  model_id: string;
  duration_ms: number;
  tool_calls_count: number;
  retry_count?: number;
}
