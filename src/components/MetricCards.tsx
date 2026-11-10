import React from 'react';
import { SummaryMetrics } from '../types/telemetry';
import { formatTokens, formatCurrency } from '../utils/tokenMath';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardsProps {
  summary: SummaryMetrics;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary }) => {
  const discrepancy = summary.cost_discrepancy_usd;
  const isOverestimated = discrepancy >= 0;

  return (
    <div className="space-y-4">
      {/* Integrity & Research Rules Notice */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg px-4 py-3 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-amber-400 tracking-wider">
            RESEARCH RULE
          </span>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <span className="text-zinc-300">
            Strict isolation: <strong className="text-zinc-100 font-medium">Estimated Expenditure</strong> is calculated from rate cards; <strong className="text-zinc-100 font-medium">Invoiced Billing</strong> tracks actual provider charges.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <span>Source: <span className="text-zinc-300">SYNTHETIC_BENCHMARK</span></span>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <span>Seed: <span className="text-zinc-300">#42</span></span>
        </div>
      </div>

      {/* Grid of Key FinOps Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Tokens */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span className="font-medium tracking-tight">Total Token Consumption</span>
              <span className="text-[11px] font-mono text-zinc-500">{summary.total_requests} reqs</span>
            </div>
            <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100 mb-3 tabular-nums">
              {formatTokens(summary.total_tokens)}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-zinc-800/70 text-xs">
            {/* Visual ratio bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-sm overflow-hidden flex">
              <div
                style={{ width: `${summary.input_token_ratio_pct}%` }}
                className="bg-cyan-500/80"
                title={`Input: ${summary.input_token_ratio_pct}%`}
              />
              <div
                style={{ width: `${summary.output_token_ratio_pct}%` }}
                className="bg-indigo-500/80"
                title={`Output: ${summary.output_token_ratio_pct}%`}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
              <span>In: <strong className="text-zinc-200">{formatTokens(summary.total_input_tokens)}</strong> ({summary.input_token_ratio_pct}%)</span>
              <span>Out: <strong className="text-zinc-200">{formatTokens(summary.total_output_tokens)}</strong> ({summary.output_token_ratio_pct}%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Estimated Expenditure vs Billed */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span className="font-medium tracking-tight">Estimated Expenditure</span>
              <span className="text-[11px] font-mono text-emerald-400/90 font-medium">Rate Card V1</span>
            </div>
            <div className="text-2xl font-semibold font-mono tracking-tight text-emerald-400 mb-3 tabular-nums">
              {formatCurrency(summary.total_estimated_cost_usd)}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-zinc-800/70 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Invoiced Billed:</span>
              <span className="font-mono text-zinc-200 font-medium">
                {summary.total_actual_billed_usd > 0 ? formatCurrency(summary.total_actual_billed_usd) : 'Pending Invoices'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Discrepancy (Δ):</span>
              <span className={`font-mono flex items-center font-medium ${isOverestimated ? 'text-amber-400' : 'text-rose-400'}`}>
                {isOverestimated ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {formatCurrency(Math.abs(discrepancy))}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Cost Per Completed Task */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span className="font-medium tracking-tight">Cost / Completed Task</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {summary.completed_tasks}/{summary.total_tasks} completed
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100 mb-3 tabular-nums">
              {formatCurrency(summary.cost_per_completed_task_usd)}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-zinc-800/70 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Task Completion Rate:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {summary.total_tasks > 0 ? ((summary.completed_tasks / summary.total_tasks) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Blended Avg / Started Task:</span>
              <span className="font-mono text-zinc-300">
                {formatCurrency(summary.avg_cost_per_task_usd)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Agent Tool & Retry Overhead */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
              <span className="font-medium tracking-tight">Tool & Retry Overhead</span>
              <span className="text-[11px] font-mono text-zinc-500">Agent Loops</span>
            </div>
            <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100 mb-3 tabular-nums">
              {summary.total_retries} <span className="text-xs font-normal text-zinc-500">retries</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-zinc-800/70 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Tool Invocations:</span>
              <span className="font-mono text-zinc-200 font-medium">{summary.total_tool_calls} calls</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Failed Turn Ratio:</span>
              <span className={`font-mono ${summary.failed_requests > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                {summary.failed_requests} ({summary.total_requests > 0 ? ((summary.failed_requests / summary.total_requests) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
