import React, { useState } from 'react';
import { X, UploadCloud, FileCode, Check, AlertCircle } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (records: any[]) => Promise<number>;
}

const SAMPLE_JSON_RECORD = [
  {
    task_id: "TASK-FINOPS-001",
    model_id: "gemini-3.8-flash",
    input_tokens: 1420,
    output_tokens: 520,
    duration_ms: 1840,
    prompt_char_length: 5600,
    task_type: "code_review",
    tool_calls_count: 2,
    retry_count: 0,
    status: "SUCCESS",
    data_source: "MANUAL_JSON_IMPORT",
    is_synthetic: 0
  }
];

export const IngestModal: React.FC<IngestModalProps> = ({ isOpen, onClose, onImport }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_JSON_RECORD, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessCount(null);
    setIsSubmitting(true);

    try {
      const parsed = JSON.parse(jsonText);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      if (records.length === 0) {
        throw new Error("Payload must contain at least one telemetry record.");
      }
      const count = await onImport(records);
      setSuccessCount(count);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || "Invalid JSON syntax or payload format.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-xl w-full p-6 shadow-2xl relative text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
            Import Telemetry Payload
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ingest raw request tokens into the SQLite store and trigger automatic rate card valuation
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/60 text-rose-300 rounded text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successCount !== null && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 rounded text-xs flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 shrink-0" />
            <span>Successfully imported {successCount} records! Telemetry refreshed.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                JSON Telemetry Records
              </label>
              <button
                type="button"
                onClick={() => setJsonText(JSON.stringify(SAMPLE_JSON_RECORD, null, 2))}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer font-mono"
              >
                <FileCode className="w-3 h-3" /> Load Sample
              </button>
            </div>
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-zinc-900/70 border border-zinc-800 rounded-md p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
              placeholder='[ { "task_id": "...", "model_id": "gemini-3.8-flash", "input_tokens": 1000, "output_tokens": 200 } ]'
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Importing...' : 'Validate & Ingest'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
