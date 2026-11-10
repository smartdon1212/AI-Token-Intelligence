"""
Database initialization and connection management for AI Token Intelligence.
Uses SQLite3 with strict foreign key constraints, indexes, and transactional safety.
"""

import sqlite3
import os
from typing import Optional, List, Dict, Any, Tuple


DEFAULT_DB_PATH = os.environ.get("DATABASE_PATH", "ai_token_intelligence.db")


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DEFAULT_DB_PATH
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def initialize_database(db_path: Optional[str] = None) -> None:
    """Create all required tables, constraints, and indexes."""
    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.executescript("""
    -- 1. Providers
    CREATE TABLE IF NOT EXISTS providers (
        provider_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        api_type TEXT NOT NULL DEFAULT 'rest_api',
        created_at TEXT NOT NULL
    );

    -- 2. Models
    CREATE TABLE IF NOT EXISTS models (
        model_id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        context_window INTEGER DEFAULT 128000,
        max_output_tokens INTEGER DEFAULT 8192,
        modalities TEXT NOT NULL DEFAULT 'text',
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (provider_id) REFERENCES providers (provider_id) ON DELETE CASCADE
    );

    -- 3. Pricing Records (Versioned)
    CREATE TABLE IF NOT EXISTS pricing_records (
        pricing_id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        version_tag TEXT NOT NULL,
        effective_start TEXT NOT NULL,
        effective_end TEXT,
        input_price_per_1m REAL NOT NULL,
        output_price_per_1m REAL NOT NULL,
        cached_input_price_per_1m REAL,
        currency TEXT NOT NULL DEFAULT 'USD',
        source_notes TEXT,
        FOREIGN KEY (model_id) REFERENCES models (model_id) ON DELETE CASCADE
    );

    -- 4. Tasks (Agent workflows or discrete jobs)
    CREATE TABLE IF NOT EXISTS tasks (
        task_id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        description TEXT,
        total_requests INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        start_time TEXT NOT NULL,
        end_time TEXT,
        is_synthetic INTEGER NOT NULL DEFAULT 1
    );

    -- 5. Requests (Individual LLM execution turns)
    CREATE TABLE IF NOT EXISTS requests (
        request_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        prompt_char_length INTEGER NOT NULL,
        tool_calls_count INTEGER NOT NULL DEFAULT 0,
        retry_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'SUCCESS',
        data_source TEXT NOT NULL DEFAULT 'SYNTHETIC_BENCHMARK',
        raw_metadata TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks (task_id) ON DELETE CASCADE,
        FOREIGN KEY (model_id) REFERENCES models (model_id) ON DELETE CASCADE
    );

    -- 6. Token Usage (Raw telemetry)
    CREATE TABLE IF NOT EXISTS token_usage (
        usage_id TEXT PRIMARY KEY,
        request_id TEXT UNIQUE NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        thinking_tokens INTEGER DEFAULT 0,
        cached_tokens INTEGER DEFAULT 0,
        FOREIGN KEY (request_id) REFERENCES requests (request_id) ON DELETE CASCADE
    );

    -- 7. Cost Records (Estimated vs. Billed separation)
    CREATE TABLE IF NOT EXISTS cost_records (
        cost_id TEXT PRIMARY KEY,
        request_id TEXT UNIQUE NOT NULL,
        pricing_id TEXT NOT NULL,
        input_cost_usd REAL NOT NULL,
        output_cost_usd REAL NOT NULL,
        estimated_cost_usd REAL NOT NULL,
        actual_billed_usd REAL,
        cost_discrepancy_usd REAL,
        calculated_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests (request_id) ON DELETE CASCADE,
        FOREIGN KEY (pricing_id) REFERENCES pricing_records (pricing_id) ON DELETE CASCADE
    );

    -- 8. Predictions (Baseline forecast experiments)
    CREATE TABLE IF NOT EXISTS predictions (
        prediction_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        baseline_model TEXT NOT NULL,
        predicted_input_tokens REAL NOT NULL,
        predicted_output_tokens REAL NOT NULL,
        predicted_total_tokens REAL NOT NULL,
        predicted_cost_usd REAL NOT NULL,
        split_assignment TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests (request_id) ON DELETE CASCADE
    );

    -- 9. Evaluation Results (Metric comparison logs)
    CREATE TABLE IF NOT EXISTS evaluation_results (
        eval_id TEXT PRIMARY KEY,
        baseline_model TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        sample_size INTEGER NOT NULL,
        target_variable TEXT NOT NULL,
        evaluated_at TEXT NOT NULL
    );

    -- Indexes for high-performance analytics
    CREATE INDEX IF NOT EXISTS idx_requests_task_id ON requests (task_id);
    CREATE INDEX IF NOT EXISTS idx_requests_model_id ON requests (model_id);
    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests (timestamp);
    CREATE INDEX IF NOT EXISTS idx_token_usage_request_id ON token_usage (request_id);
    CREATE INDEX IF NOT EXISTS idx_cost_records_request_id ON cost_records (request_id);
    CREATE INDEX IF NOT EXISTS idx_pricing_model_version ON pricing_records (model_id, version_tag);
    CREATE INDEX IF NOT EXISTS idx_predictions_baseline ON predictions (baseline_model, split_assignment);
    """)

    conn.commit()
    seed_canonical_catalogs(conn)
    conn.close()


def seed_canonical_catalogs(conn: sqlite3.Connection) -> None:
    """Seed foundational providers, models, and realistic versioned pricing."""
    cur = conn.cursor()

    # Seed Providers
    providers = [
        ("google", "Google DeepMind", "rest_api", "2025-01-01T00:00:00Z"),
        ("anthropic", "Anthropic", "rest_api", "2025-01-01T00:00:00Z"),
        ("openai", "OpenAI", "rest_api", "2025-01-01T00:00:00Z"),
        ("meta_local", "Meta Llama (Self-Hosted)", "self_hosted", "2025-01-01T00:00:00Z"),
    ]
    cur.executemany("""
    INSERT OR IGNORE INTO providers (provider_id, display_name, api_type, created_at)
    VALUES (?, ?, ?, ?);
    """, providers)

    # Seed Models
    models = [
        ("gemini-3.8-flash", "google", "Gemini 3.8 Flash", 1048576, 8192, "multimodal", 1),
        ("gemini-4-carbon", "google", "Gemini 4 Carbon", 1048576, 8192, "text,code,reasoning", 1),
        ("gemini-4-argon", "google", "Gemini 4 Argon", 1048576, 8192, "text,code", 1),
        ("claude-3-5-sonnet", "anthropic", "Claude 3.5 Sonnet", 200000, 8192, "multimodal", 1),
        ("gpt-4o", "openai", "GPT-4o", 128000, 16384, "multimodal", 1),
        ("gpt-4o-mini", "openai", "GPT-4o Mini", 128000, 16384, "multimodal", 1),
        ("llama-3.3-70b", "meta_local", "Llama 3.3 70B (Local Compute)", 128000, 8192, "text", 1),
    ]
    cur.executemany("""
    INSERT OR IGNORE INTO models (model_id, provider_id, display_name, context_window, max_output_tokens, modalities, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, models)

    # Seed Configurable Pricing Records (Prices in USD per 1,000,000 tokens)
    pricing = [
        ("price-gemini-flash-2025", "gemini-3.8-flash", "2025-01-standard", "2025-01-01T00:00:00Z", None, 0.10, 0.40, 0.025, "USD", "Standard Tier Gemini Flash Jan 2025"),
        ("price-gemini-carbon-2025", "gemini-4-carbon", "2025-01-standard", "2025-01-01T00:00:00Z", None, 1.25, 5.00, 0.30, "USD", "Deep Reasoning Carbon Tier Jan 2025"),
        ("price-gemini-argon-2025", "gemini-4-argon", "2025-01-standard", "2025-01-01T00:00:00Z", None, 0.80, 3.20, 0.20, "USD", "High Performance Argon Tier Jan 2025"),
        ("price-claude-sonnet-2025", "claude-3-5-sonnet", "2025-01-standard", "2025-01-01T00:00:00Z", None, 3.00, 15.00, 0.30, "USD", "Anthropic Claude 3.5 Sonnet Jan 2025"),
        ("price-gpt4o-2025", "gpt-4o", "2025-01-standard", "2025-01-01T00:00:00Z", None, 2.50, 10.00, 1.25, "USD", "OpenAI GPT-4o Rate Card"),
        ("price-gpt4o-mini-2025", "gpt-4o-mini", "2025-01-standard", "2025-01-01T00:00:00Z", None, 0.15, 0.60, 0.075, "USD", "OpenAI GPT-4o Mini Rate Card"),
        ("price-llama-local-2025", "llama-3.3-70b", "2025-01-electricity", "2025-01-01T00:00:00Z", None, 0.05, 0.12, 0.00, "USD", "Estimated GPU compute/electricity amortization"),
    ]
    cur.executemany("""
    INSERT OR IGNORE INTO pricing_records (
        pricing_id, model_id, version_tag, effective_start, effective_end,
        input_price_per_1m, output_price_per_1m, cached_input_price_per_1m, currency, source_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, pricing)

    conn.commit()


if __name__ == "__main__":
    initialize_database()
    print("Database initialized successfully with schema and canonical catalogs.")
