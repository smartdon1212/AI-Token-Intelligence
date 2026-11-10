import React from 'react';
import { RefreshCw, UploadCloud, Database, Sparkles, Activity } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  onOpenAudit: () => void;
  onOpenImport: () => void;
  onGenerateBenchmark: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onOpenAudit,
  onOpenImport,
  onGenerateBenchmark,
  isRefreshing,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-6">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
            <svg
              className="w-4 h-4 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
                AI Token Intelligence
              </span>
              <span className="text-xs text-zinc-500 font-mono">v0.1.0</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>Token FinOps & Forecasting</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="font-mono text-zinc-400">SQLite Engine Active</span>
            </div>
          </div>
        </div>

        {/* Action Controls Zone */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 px-2.5 text-xs font-medium rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Synchronize telemetry state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-zinc-400' : 'text-zinc-400'}`} />
            <span className="hidden md:inline">Sync</span>
          </button>

          <button
            onClick={onOpenImport}
            className="h-8 px-3 text-xs font-medium rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={onGenerateBenchmark}
            className="h-8 px-3 text-xs font-medium rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Add Benchmark</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="h-8 px-3.5 text-xs font-medium rounded-md bg-zinc-100 hover:bg-white text-zinc-950 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            <span>AI Reasoning Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
