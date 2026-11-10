import React, { useState } from 'react';
import { TaskItem } from '../types/telemetry';
import { formatTokens, formatCurrency } from '../utils/tokenMath';
import { Search, Download, Check, X } from 'lucide-react';

interface TaskExplorerProps {
  tasks: TaskItem[];
}

export const TaskExplorer: React.FC<TaskExplorerProps> = ({ tasks }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED'>('ALL');

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.task_id.toLowerCase().includes(search.toLowerCase()) ||
      t.task_type.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportCSV = () => {
    const headers = [
      'Task ID',
      'Type',
      'Status',
      'Description',
      'Turns',
      'Total Tokens',
      'Input Tokens',
      'Output Tokens',
      'Estimated Cost USD',
      'Tool Calls',
      'Retries',
      'Duration Sec'
    ];
    const rows = filteredTasks.map((t) => [
      t.task_id,
      t.task_type,
      t.status,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.total_requests,
      t.total_tokens,
      t.input_tokens,
      t.output_tokens,
      t.estimated_cost_usd,
      t.total_tool_calls,
      t.total_retries,
      (t.total_duration_ms / 1000).toFixed(2)
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'task_telemetry_traces.csv');
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
              Task Workflows & Multi-Turn Trace Explorer
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              ({filteredTasks.length} tasks matched)
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Granular agent jobs, prompt progression, tool invocations, and unit cost per workflow
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search task ID or archetype..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs rounded-md pl-8 pr-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono w-48 sm:w-60"
            />
          </div>

          {/* Segmented Status Filter */}
          <div className="flex items-center rounded-md bg-zinc-950 p-0.5 border border-zinc-800 text-xs font-mono">
            {(['ALL', 'COMPLETED', 'FAILED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-[11px] ${
                  statusFilter === s
                    ? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="h-8 px-2.5 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
            title="Export CSV"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 font-mono">
              <th className="py-2.5 px-4 font-medium">Task ID & Archetype</th>
              <th className="py-2.5 px-4 font-medium text-center">Status</th>
              <th className="py-2.5 px-4 font-medium text-right">Turns</th>
              <th className="py-2.5 px-4 font-medium text-right">Total Tokens</th>
              <th className="py-2.5 px-4 font-medium text-right">Input / Output</th>
              <th className="py-2.5 px-4 font-medium text-right">Est. Cost</th>
              <th className="py-2.5 px-4 font-medium text-right">Tools & Retries</th>
              <th className="py-2.5 px-4 font-medium text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-zinc-300 font-mono">
            {filteredTasks.map((t) => {
              const isCompleted = t.status === 'COMPLETED';

              return (
                <tr key={t.task_id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-4 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-100 font-mono text-[11px]">{t.task_id}</span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {t.is_synthetic === 1 ? '· synthetic' : '· empirical'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate max-w-sm mt-0.5">
                      {t.description || t.task_type}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        isCompleted ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{t.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-300 tabular-nums">
                    {t.total_requests} turns
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-zinc-100 tabular-nums">
                    {formatTokens(t.total_tokens)}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400 text-[11px] tabular-nums">
                    <span className="text-cyan-400/90">{formatTokens(t.input_tokens)}</span>
                    <span className="text-zinc-600"> / </span>
                    <span className="text-indigo-400/90">{formatTokens(t.output_tokens)}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-400 tabular-nums">
                    {formatCurrency(t.estimated_cost_usd)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className="text-zinc-200">{t.total_tool_calls} tools</span>
                    {t.total_retries > 0 && (
                      <span className="text-amber-400 ml-1">({t.total_retries} r)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400 text-[11px] tabular-nums">
                    {(t.total_duration_ms / 1000).toFixed(1)}s
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
