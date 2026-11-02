/**
 * @license Apache-2.0
 * Predictive Duration Auditor Component
 * Detects unrealistic estimated durations using empirical variance models
 * and flags tasks with high probability of causing downstream schedule cascades.
 */

import React, { useState, useEffect } from 'react';
import { PredictiveAuditItem, HistoricalMetric } from '../types/index.ts';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Sparkles,
  Zap,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const PredictiveAuditorView: React.FC = () => {
  const [audits, setAudits] = useState<PredictiveAuditItem[]>([]);
  const [metrics, setMetrics] = useState<HistoricalMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/scheduler/predictive-audit');
      const data = await res.json();
      setAudits(data.audits || []);
      setMetrics(data.historicalMetrics || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const unrealisticCount = audits.filter((a) => a.audit.isUnrealistic).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Predictive Time Estimation &amp; Overrun Auditor
          </h2>
          <p className="text-xs text-slate-400">
            Machine estimation layer flagging allocated durations that deviate &gt; 35% from historical empirical completion averages.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={`px-3 py-1 rounded border font-semibold ${
              unrealisticCount > 0
                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
            }`}
          >
            {unrealisticCount} Unrealistic Allocation(s) Flagged
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400 text-xs uppercase font-mono mb-1">Audited Tasks</div>
          <div className="text-2xl font-bold text-white font-mono">{audits.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active backlog &amp; scheduled items</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400 text-xs uppercase font-mono mb-1">Historical Samples</div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">{metrics.length} logged</div>
          <div className="text-[11px] text-slate-500 mt-1">Empirical completion logs across categories</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400 text-xs uppercase font-mono mb-1">Cascade Risk Index</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {unrealisticCount > 0 ? 'HIGH (Action Advised)' : 'LOW (Calibrated)'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Evaluated by PredictiveDurationAuditor</div>
        </div>
      </div>

      {/* Task Audit Inspection List */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Real-Time Duration Audit Report
          </span>
          <button
            onClick={fetchAudits}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-mono cursor-pointer"
          >
            Re-run Audit Engine
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {audits.map((item) => (
            <div
              key={item.taskId}
              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                item.audit.isUnrealistic ? 'bg-rose-950/20' : 'hover:bg-slate-900/40'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {item.audit.isUnrealistic ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                    Category: {item.audit.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 pl-6">{item.audit.advisoryMessage}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0 font-mono text-xs pl-6 md:pl-0">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Allocated</div>
                  <div className="font-bold text-slate-300">{item.estimatedMinutes}m</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Historical Avg</div>
                  <div className="font-bold text-indigo-400">{item.audit.historicalAverageMinutes}m</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Recommended</div>
                  <div
                    className={`font-bold ${
                      item.audit.isUnrealistic ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {item.audit.recommendedDurationMinutes}m
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
