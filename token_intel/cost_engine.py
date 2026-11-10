"""
Configurable Cost Calculation Engine for AI Token Intelligence.
Handles versioned rate cards, input/output/cached token pricing,
and strictly isolates estimated modeled expenditure from actual provider invoices.
NEVER hardcodes pricing.
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime
import sqlite3
from token_intel.models import PricingRecord, CostRecord


class CostCalculationEngine:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def get_effective_pricing(self, model_id: str, timestamp_iso: Optional[str] = None) -> Optional[PricingRecord]:
        """
        Retrieves the active pricing record for a model at a specific point in time.
        If timestamp is not provided, defaults to current time.
        """
        ts = timestamp_iso or (datetime.utcnow().isoformat() + "Z")
        cur = self.conn.cursor()

        # Match record where effective_start <= ts and (effective_end IS NULL or effective_end >= ts)
        # Order by effective_start descending to get the most specific version
        cur.execute("""
            SELECT pricing_id, model_id, version_tag, effective_start, effective_end,
                   input_price_per_1m, output_price_per_1m, cached_input_price_per_1m,
                   currency, source_notes
            FROM pricing_records
            WHERE model_id = ?
              AND effective_start <= ?
              AND (effective_end IS NULL OR effective_end >= ?)
            ORDER BY effective_start DESC
            LIMIT 1;
        """, (model_id, ts, ts))
        row = cur.fetchone()

        if not row:
            # Fallback to any latest pricing for this model if strict timestamp not bounded
            cur.execute("""
                SELECT pricing_id, model_id, version_tag, effective_start, effective_end,
                       input_price_per_1m, output_price_per_1m, cached_input_price_per_1m,
                       currency, source_notes
                FROM pricing_records
                WHERE model_id = ?
                ORDER BY effective_start DESC
                LIMIT 1;
            """, (model_id,))
            row = cur.fetchone()

        if not row:
            return None

        return PricingRecord(
            pricing_id=row["pricing_id"],
            model_id=row["model_id"],
            version_tag=row["version_tag"],
            effective_start=row["effective_start"],
            effective_end=row["effective_end"],
            input_price_per_1m=row["input_price_per_1m"],
            output_price_per_1m=row["output_price_per_1m"],
            cached_input_price_per_1m=row["cached_input_price_per_1m"],
            currency=row["currency"],
            source_notes=row["source_notes"]
        )

    def calculate_cost(
        self,
        request_id: str,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
        timestamp_iso: Optional[str] = None,
        actual_billed_usd: Optional[float] = None
    ) -> CostRecord:
        """
        Calculate estimated cost based on active pricing matrix.
        Calculates discrepancy if actual billed cost is supplied from provider invoices.
        """
        pricing = self.get_effective_pricing(model_id, timestamp_iso)
        if not pricing:
            raise ValueError(f"No pricing record found for model_id: {model_id}")

        # Account for prompt cached tokens if pricing supports it
        regular_input = max(0, input_tokens - cached_tokens)
        input_cost = (regular_input / 1_000_000.0) * pricing.input_price_per_1m

        if cached_tokens > 0 and pricing.cached_input_price_per_1m is not None:
            cached_cost = (cached_tokens / 1_000_000.0) * pricing.cached_input_price_per_1m
            input_cost += cached_cost

        output_cost = (output_tokens / 1_000_000.0) * pricing.output_price_per_1m
        estimated_cost = input_cost + output_cost

        discrepancy = None
        if actual_billed_usd is not None:
            discrepancy = estimated_cost - actual_billed_usd

        cost_id = f"cost-{request_id}"
        return CostRecord(
            cost_id=cost_id,
            request_id=request_id,
            pricing_id=pricing.pricing_id,
            input_cost_usd=round(input_cost, 8),
            output_cost_usd=round(output_cost, 8),
            estimated_cost_usd=round(estimated_cost, 8),
            actual_billed_usd=round(actual_billed_usd, 8) if actual_billed_usd is not None else None,
            cost_discrepancy_usd=round(discrepancy, 8) if discrepancy is not None else None,
            calculated_at=datetime.utcnow().isoformat() + "Z"
        )

    def add_pricing_version(
        self,
        model_id: str,
        version_tag: str,
        effective_start: str,
        input_price_per_1m: float,
        output_price_per_1m: float,
        effective_end: Optional[str] = None,
        cached_input_price_per_1m: Optional[float] = None,
        currency: str = "USD",
        source_notes: Optional[str] = None
    ) -> PricingRecord:
        """Dynamically add or update versioned pricing rate card."""
        pricing_id = f"price-{model_id}-{version_tag}"
        record = PricingRecord(
            pricing_id=pricing_id,
            model_id=model_id,
            version_tag=version_tag,
            effective_start=effective_start,
            effective_end=effective_end,
            input_price_per_1m=input_price_per_1m,
            output_price_per_1m=output_price_per_1m,
            cached_input_price_per_1m=cached_input_price_per_1m,
            currency=currency,
            source_notes=source_notes
        )

        cur = self.conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO pricing_records (
                pricing_id, model_id, version_tag, effective_start, effective_end,
                input_price_per_1m, output_price_per_1m, cached_input_price_per_1m,
                currency, source_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            record.pricing_id, record.model_id, record.version_tag, record.effective_start,
            record.effective_end, record.input_price_per_1m, record.output_price_per_1m,
            record.cached_input_price_per_1m, record.currency, record.source_notes
        ))
        self.conn.commit()
        return record
