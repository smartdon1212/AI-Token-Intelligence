import React, { useState } from 'react';
import { UsageTrend } from '../types/telemetry';
import { formatTokens, formatCurrency } from '../utils/tokenMath';

interface UsageTrendsChartProps {
  trends: UsageTrend[];
}

export const UsageTrendsChart: React.FC<UsageTrendsChartProps> = ({ trends }) => {
  const [metricType, setMetricType] = useState<'tokens' | 'cost'>('tokens');

  if (!trends || trends.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-8 text-center text-zinc-500 text-xs font-mono w-full min-w-0 box-border">
        No time-series usage telemetry recorded.
      </div>
    );
  }

  const maxTokens = Math.max(...trends.map((t) => t.total_tokens), 1);
  const maxCost = Math.max(...trends.map((t) => t.estimated_cost_usd), 0.0001);

  const aggregateTokens = trends.reduce((acc, t) => acc + t.total_tokens, 0);
  const aggregateCost = trends.reduce((acc, t) => acc + t.estimated_cost_usd, 0);

  // Interval calculation for clean X-axis labels without collision
  const step = Math.max(1, Math.round(trends.length / 6));

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-5 w-full max-w-full min-w-0 box-border">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
              Temporal Usage & Expenditure Dynamics
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              Hourly Granularity ({trends.length} buckets)
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Synchronized progression of token velocity, input/output ratio, and estimated dollar liability
          </p>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs shrink-0">
          <button
            onClick={() => setMetricType('tokens')}
            className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
              metricType === 'tokens'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tokens (Input / Output)
          </button>
          <button
            onClick={() => setMetricType('cost')}
            className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
              metricType === 'cost'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Estimated Cost ($ USD)
          </button>
        </div>
      </div>

      {/* Chart Canvas with dedicated plotting area and right Y-axis column */}
      <div className="w-full max-w-full min-w-0 flex items-stretch gap-2 pt-2">
        {/* Plotting Column (Bars + Gridlines + X-axis) */}
        <div className="flex-1 min-w-0 relative flex flex-col justify-between">
          {/* Main Bar Canvas Area */}
          <div className="relative h-44 w-full min-w-0">
            {/* Horizontal Gridlines spanning 100% of plotting width */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-zinc-800/60 w-full" />
              <div className="border-b border-zinc-800/40 w-full" />
              <div className="border-b border-zinc-800/30 w-full" />
            </div>

            {/* Bar Visualization: Exactly 100% width, min-w-0, distributed evenly */}
            <div className="w-full h-full flex items-end gap-[2px] min-w-0 relative z-10">
              {trends.map((t, idx) => {
                const inPct = metricType === 'tokens' ? (t.input_tokens / maxTokens) * 100 : 0;
                const outPct = metricType === 'tokens' ? (t.output_tokens / maxTokens) * 100 : 0;
                const costPct = metricType === 'cost' ? (t.estimated_cost_usd / maxCost) * 100 : 0;

                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-0 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                  >
                    {/* Edge-aware Tooltip */}
                    <div
                      className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-zinc-950 text-zinc-200 border border-zinc-700/80 rounded-md p-2.5 text-[11px] font-mono shadow-2xl z-30 pointer-events-none whitespace-nowrap min-w-[170px] ${
                        idx < 4
                          ? 'left-0'
                          : idx > trends.length - 5
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2'
                      }`}
                    >
                      <div className="font-semibold text-zinc-100 border-b border-zinc-800 pb-1 mb-1.5 flex justify-between">
                        <span>{t.time_bucket}</span>
                        <span className="text-zinc-500">{t.request_count} reqs</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Total Tokens:</span>
                        <span className="font-semibold text-zinc-100">{formatTokens(t.total_tokens)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400 text-[10px] pl-1">
                        <span>· Input Tokens:</span>
                        <span className="text-cyan-400">{formatTokens(t.input_tokens)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400 text-[10px] pl-1">
                        <span>· Output Tokens:</span>
                        <span className="text-indigo-400">{formatTokens(t.output_tokens)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400 mt-1 pt-1 border-t border-zinc-800">
                        <span>Est. Cost:</span>
                        <span className="font-semibold">{formatCurrency(t.estimated_cost_usd)}</span>
                      </div>
                    </div>

                    {/* Stacked Bar Container */}
                    <div className="w-full max-w-[28px] flex flex-col justify-end rounded-t-xs overflow-hidden bg-zinc-800/25 h-full transition-colors group-hover:bg-zinc-800/60">
                      {metricType === 'tokens' ? (
                        <>
                          <div
                            style={{ height: `${Math.max(2, outPct)}%` }}
                            className="w-full bg-indigo-500/70 group-hover:bg-indigo-400 transition-colors"
                          />
                          <div
                            style={{ height: `${Math.max(2, inPct)}%` }}
                            className="w-full bg-cyan-500/70 group-hover:bg-cyan-400 transition-colors"
                          />
                        </>
                      ) : (
                        <div
                          style={{ height: `${Math.max(3, costPct)}%` }}
                          className="w-full bg-emerald-500/70 group-hover:bg-emerald-400 transition-colors rounded-t-xs"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis Timestamps Row: Perfectly aligned with the bars */}
          <div className="w-full flex items-center gap-[2px] min-w-0 pt-2 border-t border-zinc-800/50">
            {trends.map((t, idx) => {
              const isLabelPoint = idx === 0 || idx === trends.length - 1 || idx % step === 0;
              const timeStr = t.time_bucket.split(' ')[1] || t.time_bucket.split('-').slice(1).join('/');

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-0 flex flex-col items-center justify-start overflow-visible relative"
                >
                  {isLabelPoint ? (
                    <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap select-none">
                      {timeStr}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-zinc-800/80 my-1 select-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Y-Axis Scale Column: Contained within card, aligned with gridlines */}
        <div className="w-14 shrink-0 flex flex-col justify-between items-end pb-7 pl-2 pointer-events-none select-none">
          <span className="text-[10px] font-mono text-zinc-500 tabular-nums -mt-2">
            {metricType === 'tokens' ? formatTokens(maxTokens) : formatCurrency(maxCost)}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
            {metricType === 'tokens' ? formatTokens(Math.round(maxTokens / 2)) : formatCurrency(maxCost / 2)}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
            0
          </span>
        </div>
      </div>

      {/* Legend & Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400 pt-3 border-t border-zinc-800/60 mt-2">
        {metricType === 'tokens' ? (
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500/80"></span>
              <span>Input Tokens</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500/80"></span>
              <span>Output Tokens</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/80"></span>
            <span>Calculated Dollar Expenditure ($ USD)</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
          <span>Window Total: <strong className="text-zinc-300">{formatTokens(aggregateTokens)} tokens</strong></span>
          <span aria-hidden="true">·</span>
          <span>Window Spend: <strong className="text-emerald-400">{formatCurrency(aggregateCost)}</strong></span>
        </div>
      </div>
    </div>
  );
};
