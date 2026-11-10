import React, { useState, useEffect } from 'react';
import { SummaryMetrics, ModelMetric, TaskItem, UsageTrend, EvaluationItem, ScatterPoint } from './types/telemetry';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { UsageTrendsChart } from './components/UsageTrendsChart';
import { ModelBreakdownTable } from './components/ModelBreakdownTable';
import { TaskExplorer } from './components/TaskExplorer';
import { ForecastingBenchmarkView } from './components/ForecastingBenchmarkView';
import { ResearchReportView } from './components/ResearchReportView';
import { IngestModal } from './components/IngestModal';
import { GeminiAuditDrawer } from './components/GeminiAuditDrawer';
import { Check } from 'lucide-react';

export default function App() {
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [models, setModels] = useState<ModelMetric[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [trends, setTrends] = useState<UsageTrend[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [scatter, setScatter] = useState<ScatterPoint[]>([]);

  const [activeTab, setActiveTab] = useState<'benchmarks' | 'models' | 'tasks' | 'research'>('benchmarks');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningBaselines, setIsRunningBaselines] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchAllTelemetry = async () => {
    try {
      setIsRefreshing(true);
      const [sumRes, modRes, taskRes, trendRes, evalRes, scatRes] = await Promise.all([
        fetch('/api/telemetry/summary').then((r) => r.json()),
        fetch('/api/telemetry/models').then((r) => r.json()),
        fetch('/api/telemetry/tasks').then((r) => r.json()),
        fetch('/api/telemetry/trends').then((r) => r.json()),
        fetch('/api/evaluations').then((r) => r.json()),
        fetch('/api/telemetry/scatter').then((r) => r.json()),
      ]);

      setSummary(sumRes);
      setModels(modRes || []);
      setTasks(taskRes || []);
      setTrends(trendRes || []);
      setEvaluations(evalRes || []);
      setScatter(scatRes || []);
    } catch (err: any) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllTelemetry();
  }, []);

  const handleRunBaselines = async (
    trainRatio: number,
    seed: number,
    targetVar: string,
    budgetTokens: number
  ) => {
    try {
      setIsRunningBaselines(true);
      const res = await fetch('/api/baselines/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainRatio, seed, targetVar, budgetTokens }),
      });
      const data = await res.json();
      if (data.evaluations) {
        setEvaluations(data.evaluations);
      }
      const scatRes = await fetch('/api/telemetry/scatter').then((r) => r.json());
      setScatter(scatRes || []);

      showNotification('Task-stratified experiment completed · 4 models evaluated');
    } catch (err: any) {
      console.error('Error running baselines:', err);
      showNotification('Error executing baseline experiment');
    } finally {
      setIsRunningBaselines(false);
    }
  };

  const handleImport = async (records: any[]) => {
    const res = await fetch('/api/telemetry/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    const data = await res.json();
    await fetchAllTelemetry();
    showNotification(`Ingested ${data.imported_count} telemetry records into SQLite store`);
    return data.imported_count;
  };

  const handleGenerateBenchmark = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/telemetry/benchmark/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasksCount: 15 }),
      });
      const data = await res.json();
      await fetchAllTelemetry();
      showNotification(`Added ${data.generated_requests} benchmark records across 15 tasks`);
    } catch (err: any) {
      console.error('Error generating benchmark:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navigation */}
      <Header
        onRefresh={fetchAllTelemetry}
        onOpenAudit={() => setIsAuditDrawerOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onGenerateBenchmark={handleGenerateBenchmark}
        isRefreshing={isRefreshing}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-zinc-700/80 text-zinc-200 px-4 py-2.5 rounded-md shadow-2xl text-xs font-mono flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full min-w-0 box-border">
        {isLoading && !summary ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 text-zinc-400">
            <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono">Connecting to SQLite token telemetry repository...</p>
          </div>
        ) : summary ? (
          <>
            {/* Executive FinOps Ledger */}
            <MetricCards summary={summary} />

            {/* Historical Usage Dynamics Chart */}
            <UsageTrendsChart trends={trends} />

            {/* View Navigation Bar */}
            <div className="flex border-b border-zinc-800 gap-1 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('benchmarks')}
                className={`pb-2.5 px-3.5 font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
                  activeTab === 'benchmarks'
                    ? 'border-zinc-100 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Forecasting Baselines & Evaluation</span>
                <span className="text-[10px] font-mono text-zinc-500">4 models</span>
              </button>

              <button
                onClick={() => setActiveTab('models')}
                className={`pb-2.5 px-3.5 font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
                  activeTab === 'models'
                    ? 'border-zinc-100 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Model Catalog & Rates</span>
                <span className="text-[10px] font-mono text-zinc-500">{models.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`pb-2.5 px-3.5 font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
                  activeTab === 'tasks'
                    ? 'border-zinc-100 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Task Workflows Explorer</span>
                <span className="text-[10px] font-mono text-zinc-500">{tasks.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('research')}
                className={`pb-2.5 px-3.5 font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
                  activeTab === 'research'
                    ? 'border-zinc-100 text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Research Dossier & Literature</span>
                <span className="text-[10px] font-mono text-zinc-500">arXiv & Gaps</span>
              </button>
            </div>

            {/* Active Workspace View */}
            {activeTab === 'benchmarks' && (
              <ForecastingBenchmarkView
                evaluations={evaluations}
                scatter={scatter}
                onRunBaselines={handleRunBaselines}
                isRunning={isRunningBaselines}
              />
            )}

            {activeTab === 'models' && <ModelBreakdownTable models={models} />}

            {activeTab === 'tasks' && <TaskExplorer tasks={tasks} />}

            {activeTab === 'research' && <ResearchReportView />}
          </>
        ) : null}
      </main>

      {/* Ingest Modal */}
      <IngestModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      {/* AI Reasoning Audit Drawer */}
      {summary && (
        <GeminiAuditDrawer
          isOpen={isAuditDrawerOpen}
          onClose={() => setIsAuditDrawerOpen(false)}
          summary={summary}
        />
      )}
    </div>
  );
}
