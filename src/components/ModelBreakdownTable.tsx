import React, { useState } from 'react';
import { ModelMetric } from '../types/telemetry';
import { formatTokens, formatCurrency } from '../utils/tokenMath';
import { Download } from 'lucide-react';

interface ModelBreakdownTableProps {
  models: ModelMetric[];
}

export const ModelBreakdownTable: React.FC<ModelBreakdownTableProps> = ({ models }) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredModels = models.filter((m) =>
    m.display_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.model_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.provider_id.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const exportCSV = () => {
    const headers = [
      'Model Name',
      'Model ID',
      'Provider',
      'Requests',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Est Cost USD',
      'Actual Billed USD',
      'Discrepancy USD',
      'Avg Latency MS',
      'Retries'
    ];
    const rows = filteredModels.map((m) => [
      m.display_name,
      m.model_id,
      m.provider_id,
      m.request_count,
      m.input_tokens,
      m.output_tokens,
      m.total_tokens,
      m.estimated_cost_usd,
      m.actual_billed_usd,
      (m.estimated_cost_usd - m.actual_billed_usd).toFixed(5),
      Math.round(m.avg_duration_ms),
      m.retry_count
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'model_token_allocation.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
              Model Catalog & Consumption Allocation
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              ({filteredModels.length} models tracked)
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Comparative token volume, rate application, execution duration, and modeled vs billed reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter model or provider..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-xs rounded-md px-2.5 py-1 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono w-48"
          />

          <button
            onClick={exportCSV}
            className="h-7 px-2.5 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
            title="Export CSV"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 font-mono">
              <th className="py-2.5 px-4 font-medium">Model & Provider</th>
              <th className="py-2.5 px-4 font-medium text-right">Requests</th>
              <th className="py-2.5 px-4 font-medium text-right">Input Tokens</th>
              <th className="py-2.5 px-4 font-medium text-right">Output Tokens</th>
              <th className="py-2.5 px-4 font-medium text-right">Total Tokens</th>
              <th className="py-2.5 px-4 font-medium text-right">Est. Cost</th>
              <th className="py-2.5 px-4 font-medium text-right">Actual Invoiced</th>
              <th className="py-2.5 px-4 font-medium text-right">Avg Latency</th>
              <th className="py-2.5 px-4 font-medium text-right">Retries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-zinc-300 font-mono">
            {filteredModels.map((m) => {
              const billedDiff = m.actual_billed_usd > 0 ? m.estimated_cost_usd - m.actual_billed_usd : null;

              return (
                <tr key={m.model_id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-4 font-sans">
                    <div className="font-medium text-zinc-100 flex items-center gap-2">
                      <span>{m.display_name}</span>
                      {m.model_id.includes('carbon') && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          · Thinking High
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500">
                      {m.provider_id} <span className="text-zinc-700">/</span> {m.model_id}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-200 tabular-nums">
                    {m.request_count}
                  </td>
                  <td className="py-3 px-4 text-right text-cyan-400/90 tabular-nums">
                    {formatTokens(m.input_tokens)}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-400/90 tabular-nums">
                    {formatTokens(m.output_tokens)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-zinc-100 tabular-nums">
                    {formatTokens(m.total_tokens)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-medium tabular-nums">
                    {formatCurrency(m.estimated_cost_usd)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {m.actual_billed_usd > 0 ? (
                      <div>
                        <span className="text-zinc-200">{formatCurrency(m.actual_billed_usd)}</span>
                        {billedDiff != null && Math.abs(billedDiff) > 0.0001 && (
                          <div className={`text-[10px] ${billedDiff > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {billedDiff > 0 ? '−' : '+'}{formatCurrency(Math.abs(billedDiff))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">Unbilled</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400 tabular-nums">
                    {Math.round(m.avg_duration_ms)} ms
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className={m.retry_count > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                      {m.retry_count}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
