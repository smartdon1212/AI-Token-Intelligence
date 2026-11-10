"""
Data structures and domain models for AI Token Intelligence.
Preserves raw observations, type safety, and provenance flags.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class Provider:
    provider_id: str
    display_name: str
    api_type: str = "rest_api"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Model:
    model_id: str
    provider_id: str
    display_name: str
    context_window: int = 128000
    max_output_tokens: int = 8192
    modalities: str = "text"
    is_active: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PricingRecord:
    pricing_id: str
    model_id: str
    version_tag: str
    effective_start: str
    input_price_per_1m: float
    output_price_per_1m: float
    effective_end: Optional[str] = None
    cached_input_price_per_1m: Optional[float] = None
    currency: str = "USD"
    source_notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Task:
    task_id: str
    task_type: str
    description: Optional[str] = None
    total_requests: int = 0
    status: str = "COMPLETED"
    start_time: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    end_time: Optional[str] = None
    is_synthetic: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RequestRecord:
    request_id: str
    task_id: str
    model_id: str
    timestamp: str
    duration_ms: int
    prompt_char_length: int
    tool_calls_count: int = 0
    retry_count: int = 0
    status: str = "SUCCESS"
    data_source: str = "SYNTHETIC_BENCHMARK"
    raw_metadata: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TokenUsage:
    usage_id: str
    request_id: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    thinking_tokens: Optional[int] = 0
    cached_tokens: Optional[int] = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CostRecord:
    cost_id: str
    request_id: str
    pricing_id: str
    input_cost_usd: float
    output_cost_usd: float
    estimated_cost_usd: float
    actual_billed_usd: Optional[float] = None
    cost_discrepancy_usd: Optional[float] = None
    calculated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Prediction:
    prediction_id: str
    request_id: str
    baseline_model: str
    predicted_input_tokens: float
    predicted_output_tokens: float
    predicted_total_tokens: float
    predicted_cost_usd: float
    split_assignment: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EvaluationResult:
    eval_id: str
    baseline_model: str
    metric_name: str
    metric_value: float
    sample_size: int
    target_variable: str
    evaluated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
