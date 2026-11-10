import React, { useState } from 'react';
import { EvaluationItem, ScatterPoint } from '../types/telemetry';
import { formatTokens, formatCurrency } from '../utils/tokenMath';
import { Play, Download, ShieldCheck } from 'lucide-react';

interface ForecastingBenchmarkViewProps {
  evaluations: EvaluationItem[];
  scatter: ScatterPoint[];
  onRunBaselines: (trainRatio: number, seed: number, targetVar: string, budgetTokens: number) => Promise<void>;
  isRunning: boolean;
}

export const ForecastingBenchmarkView: React.FC<ForecastingBenchmarkViewProps> = ({
  evaluations,
  scatter,
  onRunBaselines,
  isRunning,
}) => {
  const [trainRatio, setTrainRatio] = useState<number>(0.7);
  const [seed, setSeed] = useState<number>(42);
  const [targetVar, setTargetVar] = useState<string>('total_tokens');
  const [budgetTokens, setBudgetTokens] = useState<number>(1600);
  const [selectedBaselineFilter, setSelectedBaselineFilter] = useState<string>('ALL');

  const modelNames = Array.from(new Set(evaluations.map((e) => e.baseline_model)));

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRunBaselines(trainRatio, seed, targetVar, budgetTokens);
  };

  const filteredScatter = selectedBaselineFilter === 'ALL'
    ? scatter
    : scatter.filter((s) => s.baseline_model === selectedBaselineFilter);

  const exportEvaluationCSV = () => {
    const headers = [
      'Task ID',
      'Request ID',
      'Model',
      'Predicted Tokens',
      'Actual Tokens',
      'Absolute Delta',
      'Error %',
      'Predicted Cost USD',
      'Actual Cost USD'
    ];
    const rows = filteredScatter.map((s) => {
      const delta = Math.abs(s.predicted_total_tokens - s.actual_total_tokens);
      const pct = ((delta / Math.max(1, s.actual_total_tokens)) * 100).toFixed(1);
      return [
        s.task_id,
        s.request_id,
        s.baseline_model,
        s.predicted_total_tokens,
        s.actual_total_tokens,
        delta,
        `${pct}%`,
        s.predicted_cost_usd,
        s.actual_cost_usd
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `token_forecasting_eval_${selectedBaselineFilter.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Experiment Protocol & Split Parameter Bar */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-zinc-800/60">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
              Forecasting Model Matrix & Calibration Engine
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Empirical evaluation across Historical Mean, Prompt Heuristics, LLM Self-Prediction, and Trace-Informed Statistical models
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Task-Stratified Splitting · Zero Turn Bleed</span>
          </div>
        </div>

        {/* Experiment Configuration Form */}
        <form onSubmit={handleRun} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end text-xs">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-zinc-300 font-medium">Task Train / Test Split</label>
              <span className="font-mono text-zinc-400 text-[11px]">
                {Math.round(trainRatio * 100)}% / {Math.round((1 - trainRatio) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.85"
              step="0.05"
              value={trainRatio}
              onChange={(e) => setTrainRatio(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] text-zinc-500 font-mono mt-1 block">Grouped strictly by task_id</span>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">Target Metric</label>
            <select
              value={targetVar}
              onChange={(e) => setTargetVar(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
            >
              <option value="total_tokens">Total Tokens (In + Out)</option>
              <option value="output_tokens">Output Tokens Generated</option>
              <option value="input_tokens">Input Context Tokens</option>
              <option value="estimated_cost_usd">Estimated Cost ($ USD)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">Budget Risk Threshold</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={budgetTokens}
                onChange={(e) => setBudgetTokens(parseInt(e.target.value, 10) || 1600)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
              />
              <span className="text-[11px] text-zinc-500 font-mono">tokens</span>
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">Reproducibility Seed</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 42)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isRunning}
              className="w-full h-8 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 text-xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? 'Calculating...' : 'Run Experiment'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4 Models Benchmarking Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {evaluations.map((ev) => {
          const modelName = ev.baseline_model;
          const isStatistical = modelName.includes('STATISTICAL');
          const isSelf = modelName.includes('SELF');
          const isHeuristic = modelName.includes('PROMPT');
          const isMean = modelName.includes('MEAN');

          const budget = ev.budget_detection || {
            precision_pct: 0,
            recall_pct: 0,
            f1_score: 0,
            true_positives: 0,
            false_positives: 0,
            false_negatives: 0
          };

          return (
            <div
              key={modelName}
              className={`bg-zinc-900/40 border rounded-lg p-4 flex flex-col justify-between transition-colors ${
                isStatistical
                  ? 'border-zinc-700 bg-zinc-900/60 shadow-xs'
                  : 'border-zinc-800/80'
              }`}
            >
              <div>
                {/* Header & Label */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold tracking-tight text-zinc-100 font-mono">
                    {modelName}
                  </h3>
                  {isStatistical && (
                    <span className="text-[10px] font-mono text-emerald-400 font-medium">
                      Best F1
                    </span>
                  )}
                  {isSelf && (
                    <span className="text-[10px] font-mono text-rose-400 font-medium">
                      Underestimates
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mb-3 min-h-[32px] leading-relaxed">
                  {isMean && 'Task sample average conditioned solely on category.'}
                  {isHeuristic && 'Empirical char-to-token ratio lower bound.'}
                  {isSelf && 'Model self-estimate; exhibits weak correlation (r~0.39) and misses retries.'}
                  {isStatistical && 'Trace-informed multivariate model using prompt chars, tool calls, and retries.'}
                </p>

                {/* Point Error & Calibration Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                  <div className="bg-zinc-950/70 p-2 rounded border border-zinc-800/70">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">MAE</div>
                    <div className="text-sm font-semibold font-mono text-zinc-100 tabular-nums">
                      {targetVar.includes('cost') ? formatCurrency(ev.mae) : formatTokens(ev.mae)}
                    </div>
                  </div>

                  <div className="bg-zinc-950/70 p-2 rounded border border-zinc-800/70">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Safe MAPE</div>
                    <div className={`text-sm font-semibold font-mono tabular-nums ${ev.mape_pct < 25 ? 'text-emerald-400' : ev.mape_pct < 35 ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {ev.mape_pct}%
                    </div>
                  </div>

                  <div className="bg-zinc-950/70 p-2 rounded border border-zinc-800/70">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">P10-P90 Cov.</div>
                    <div className="text-xs font-semibold font-mono text-zinc-200 tabular-nums">
                      {ev.interval_coverage_pct}%
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">Target: ~80%</div>
                  </div>

                  <div className="bg-zinc-950/70 p-2 rounded border border-zinc-800/70">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Bias (Sign)</div>
                    <div className={`text-xs font-semibold font-mono tabular-nums ${ev.bias >= 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
                      {ev.bias > 0 ? '+' : ''}{targetVar.includes('cost') ? formatCurrency(ev.bias) : formatTokens(ev.bias)}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">{ev.bias < 0 ? 'Underpredicts' : 'Overpredicts'}</div>
                  </div>
                </div>

                {/* Budget-Exceedance Risk Detection Panel */}
                <div className="bg-zinc-950/80 p-2.5 rounded border border-zinc-800/80 space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[10px] font-medium uppercase">Budget Risk (&gt;{budgetTokens})</span>
                    <span className="text-zinc-500 text-[10px]">F1: <strong className="text-zinc-200">{budget.f1_score}%</strong></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/50">
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Precision</span>
                      <span className="font-semibold text-zinc-200 tabular-nums">{budget.precision_pct}%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Recall</span>
                      <span className={`font-semibold tabular-nums ${budget.recall_pct >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {budget.recall_pct}%
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/50 flex justify-between">
                    <span>Missed overruns:</span>
                    <span className={`font-semibold tabular-nums ${budget.false_negatives > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {budget.false_negatives}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono flex justify-between">
                <span>Evaluated: {ev.sample_size} reqs</span>
                <span>RMSE: {Math.round(ev.rmse)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Held-Out Test Set: Prediction vs Reality Ledger */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold tracking-tight text-zinc-100 uppercase font-mono">
                Held-Out Test Set: Prediction versus Reality
              </h3>
              <span className="text-xs text-zinc-500 font-mono">
                ({filteredScatter.length} observation turns)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Auditing empirical error spread and budget breach classification on unseen evaluation tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBaselineFilter}
              onChange={(e) => setSelectedBaselineFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs rounded-md px-2.5 py-1 text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
            >
              <option value="ALL">All Forecasters</option>
              {modelNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <button
              onClick={exportEvaluationCSV}
              className="h-7 px-2.5 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
              title="Export CSV"
            >
              <Download className="w-3 h-3 text-zinc-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-zinc-950 text-zinc-400 font-mono border-b border-zinc-800 z-10">
              <tr>
                <th className="py-2.5 px-3 font-medium">Task & Turn</th>
                <th className="py-2.5 px-3 font-medium">Forecaster</th>
                <th className="py-2.5 px-3 text-right font-medium">Predicted</th>
                <th className="py-2.5 px-3 text-right font-medium">Actual</th>
                <th className="py-2.5 px-3 text-right font-medium">Delta</th>
                <th className="py-2.5 px-3 text-right font-medium">Error %</th>
                <th className="py-2.5 px-3 text-center font-medium">Overrun Audit</th>
                <th className="py-2.5 px-3 text-right font-medium">Est. Cost</th>
                <th className="py-2.5 px-3 text-right font-medium">Actual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 font-mono text-zinc-300">
              {filteredScatter.slice(0, 75).map((row, idx) => {
                const delta = Math.abs(row.predicted_total_tokens - row.actual_total_tokens);
                const pct = (delta / Math.max(1, row.actual_total_tokens)) * 100;
                const isBreached = row.actual_total_tokens >= budgetTokens;
                const predBreached = row.predicted_total_tokens >= budgetTokens;

                return (
                  <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-2 px-3 text-[11px]">
                      <span className="text-zinc-100 font-medium">{row.task_id}</span>
                      <span className="text-zinc-500 block text-[10px]">{row.request_id}</span>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-zinc-400">
                      {row.baseline_model}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-200 tabular-nums">
                      {formatTokens(row.predicted_total_tokens)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-100 font-medium tabular-nums">
                      {formatTokens(row.actual_total_tokens)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-400 tabular-nums">
                      ±{formatTokens(delta)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span className={pct < 20 ? 'text-emerald-400' : pct < 45 ? 'text-amber-400' : 'text-rose-400'}>
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-[10px]">
                      {isBreached ? (
                        predBreached ? (
                          <span className="text-emerald-400 font-medium">
                            Predicted Breach
                          </span>
                        ) : (
                          <span className="text-rose-400 font-medium">
                            Missed Overrun (FN)
                          </span>
                        )
                      ) : (
                        <span className="text-zinc-500">Within Budget</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400/90 tabular-nums">
                      {formatCurrency(row.predicted_cost_usd)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">
                      {formatCurrency(row.actual_cost_usd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
