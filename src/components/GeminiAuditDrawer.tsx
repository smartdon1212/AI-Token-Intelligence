import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Info, ShieldAlert, Cpu } from 'lucide-react';
import { SummaryMetrics } from '../types/telemetry';

interface GeminiAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryMetrics;
}

export const GeminiAuditDrawer: React.FC<GeminiAuditDrawerProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const [focusArea, setFocusArea] = useState('Agent Workflow Token Efficiency & Retry Inflation');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workloadSummary: summary,
          focusArea,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || 'Audit execution failed');
      }

      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to complete reasoning audit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs">
      <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-2xl h-full flex flex-col shadow-2xl text-zinc-200 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
                AI FinOps Reasoning Audit
              </h2>
              <span className="text-[11px] font-mono text-zinc-400">
                gemini-4-carbon · Thinking HIGH
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Architectural diagnosis of agent retry loops, token inflation, and cache economics
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Controls */}
          <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800/80 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Audit Focus Dimension
              </label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
              >
                <option value="Agent Workflow Token Efficiency & Retry Inflation">
                  Agent Workflow Token Efficiency & Retry Inflation
                </option>
                <option value="Prompt Caching & Context Window Economics">
                  Prompt Caching & Context Window Economics
                </option>
                <option value="Model Routing & Task-to-Cost Optimization">
                  Model Routing & Task-to-Cost Optimization
                </option>
                <option value="Forecasting Baseline Calibration & Anomaly Detection">
                  Forecasting Baseline Calibration & Anomaly Detection
                </option>
              </select>
            </div>

            <button
              onClick={handleRunAudit}
              disabled={loading}
              className="w-full h-8 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Cpu className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>
                {loading
                  ? 'Analyzing Workload Traces (Thinking Mode)...'
                  : 'Execute AI Reasoning Audit'}
              </span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 text-rose-300 rounded text-xs flex items-center gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {auditResult && (
            <div className="space-y-4">
              {auditResult.notice && (
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 text-zinc-300 rounded text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-zinc-200">Execution Notice</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{auditResult.notice}</div>
                  </div>
                </div>
              )}

              {/* If Gemini 4 Carbon deep thinking response was generated */}
              {auditResult.analysis && (
                <div className="bg-zinc-900/40 p-5 rounded-lg border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-xs font-semibold tracking-tight text-zinc-100 font-mono uppercase">
                      {auditResult.analysis.auditTitle || 'Deep Architectural Audit Report'}
                    </h3>
                    {auditResult.analysis.costOptimizationPotentialPct != null && (
                      <span className="text-xs font-mono text-emerald-400 font-medium">
                        ~{auditResult.analysis.costOptimizationPotentialPct}% Cost Optimization
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {auditResult.analysis.executiveSummary}
                  </p>

                  {/* Detailed Observations */}
                  <div className="space-y-2.5 pt-2">
                    <div className="text-xs font-medium text-zinc-400 uppercase font-mono">
                      Observations & Architectural Remediations
                    </div>
                    {auditResult.analysis.keyObservations?.map((obs: any, idx: number) => {
                      const isHigh = obs.severity === 'HIGH' || obs.severity === 'CRITICAL';
                      return (
                        <div
                          key={idx}
                          className="bg-zinc-950/60 border border-zinc-800/80 rounded p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-200 font-mono text-[11px]">{obs.category}</span>
                            <span
                              className={`text-[10px] font-mono font-medium ${
                                isHigh ? 'text-amber-400' : 'text-zinc-400'
                              }`}
                            >
                              {obs.severity}
                            </span>
                          </div>
                          <div className="text-zinc-300 text-xs">{obs.finding}</div>
                          {obs.engineeringRemediation && (
                            <div className="pt-1 text-[11px] text-zinc-400 bg-zinc-900/80 p-2 rounded border border-zinc-800 font-mono">
                              <span className="text-zinc-300">Remediation: </span>
                              {obs.engineeringRemediation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Future experiments */}
                  {auditResult.analysis.recommendedFutureExperiments && (
                    <div className="pt-3 border-t border-zinc-800 text-xs">
                      <div className="text-xs font-medium text-zinc-400 mb-2 uppercase font-mono">
                        Recommended Research Experiments
                      </div>
                      <ul className="space-y-1 text-zinc-300 list-disc list-inside text-xs">
                        {auditResult.analysis.recommendedFutureExperiments.map((exp: string, i: number) => (
                          <li key={i}>{exp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Local Heuristics Fallback View */}
              {auditResult.findings && (
                <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800 space-y-3">
                  <div className="text-xs font-medium text-zinc-300 font-mono uppercase">
                    Deterministic Baseline FinOps Findings
                  </div>
                  {auditResult.findings.map((f: any, i: number) => (
                    <div key={i} className="bg-zinc-950/70 border border-zinc-800/80 rounded p-3 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-zinc-200">{f.category}</span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs">{f.observation}</p>
                      <div className="text-zinc-300 text-[11px] font-mono mt-1">
                        Remediation: {f.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
