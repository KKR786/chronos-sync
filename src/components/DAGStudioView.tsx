/**
 * @license Apache-2.0
 * DAG Dependency Studio Component
 * Interactive visual inspector for Directed Acyclic Graph (DAG) chains,
 * Kahn's Algorithm topological ordering, and real-time circular cycle deadlock prevention.
 * Responsive on mobile and desktop with clear visual relationship cards.
 */

import React, { useState } from 'react';
import { TaskItem } from '../types/index.ts';
import {
  Layers,
  GitBranch,
  AlertOctagon,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  RotateCcw,
  Info,
} from 'lucide-react';

interface DAGStudioProps {
  tasks: TaskItem[];
  dagEdges: Array<{ id: string; predecessorId: string; successorId: string }>;
  onRefresh: () => void;
}

export const DAGStudioView: React.FC<DAGStudioProps> = ({
  tasks,
  dagEdges,
  onRefresh,
}) => {
  const [predecessorId, setPredecessorId] = useState<string>(tasks[0]?.id || '');
  const [successorId, setSuccessorId] = useState<string>(tasks[1]?.id || '');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taskMap = new Map<string, TaskItem>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tasks/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predecessorId, successorId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'DAG validation failed.');
      }

      setStatusMessage({
        type: 'success',
        text: `Edge validated! Kahn's Topological Sort computed successfully. Total dependencies: ${data.totalDependenciesCount}`,
      });
      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEdge = async (predId: string, succId: string) => {
    try {
      const res = await fetch('/api/tasks/dependencies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predecessorId: predId, successorId: succId }),
      });
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: 'Dependency edge removed. Dependent task unblocking re-evaluated.',
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Directed Acyclic Graph (DAG) Dependency Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define task prerequisite chains. The engine prevents circular deadlocks using 3-color DFS and Kahn's algorithm.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Tasks: {tasks.length}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300">
            Dependencies: {dagEdges.length}
          </span>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-100 mb-0.5">Understanding DAG Prerequisite Chains:</p>
          <p className="text-slate-400 leading-relaxed">
            When you link <strong>Task A &rarr; Task B</strong>, Task B is marked <strong>BLOCKED</strong> until Task A is completed. The engine will strictly reject any circular loop (e.g. A &rarr; B &rarr; A) to protect your team from deadlock states.
          </p>
        </div>
      </div>

      {/* Dependency Creator Form (with live cycle test) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Link Prerequisite &bull; Real-Time Cycle Detection Test
        </h3>

        <form onSubmit={handleAddDependency} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prerequisite Task (Must Finish First)
              </label>
              <select
                value={predecessorId}
                onChange={(e) => setPredecessorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.status}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dependent Task (Blocked Until Prerequisite Done)
              </label>
              <select
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.status}] {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'error'
                  ? 'bg-rose-950/80 border border-rose-800 text-rose-200'
                  : 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {statusMessage.type === 'error' ? 'Cycle Deadlock Prevented' : 'Edge Verified & Added'}
                </p>
                <p className="opacity-90 mt-0.5 leading-relaxed">{statusMessage.text}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-400">
              💡 Tip: Try linking a dependent back to its prerequisite to trigger the cycle prevention check!
            </p>
            <button
              type="submit"
              disabled={isSubmitting || predecessorId === successorId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Evaluating Cycle Graph...' : 'Validate & Link Edge'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active DAG Edges Table / Responsive Cards */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Active Directed Dependency Chains
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {dagEdges.length} Active Constraint(s)
          </span>
        </div>

        {dagEdges.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No dependency constraints defined. All tasks can run concurrently.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {dagEdges.map((edge) => {
              const pred = taskMap.get(edge.predecessorId);
              const succ = taskMap.get(edge.successorId);
              const isPredDone = pred?.status === 'COMPLETED';

              return (
                <div
                  key={edge.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    {/* Predecessor */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                        Prerequisite (Must Finish First)
                      </div>
                      <div className="text-xs font-bold text-slate-200 truncate mt-0.5">
                        {pred?.title || edge.predecessorId}
                      </div>
                      <div className="text-[10px] font-mono mt-1.5 flex items-center gap-1.5">
                        <span className="text-slate-500">Status:</span>
                        <span
                          className={`font-semibold px-2 py-0.2 rounded ${
                            isPredDone
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {pred?.status || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex items-center justify-center text-indigo-400 py-1 sm:py-0 shrink-0">
                      <ArrowRight className="w-5 h-5 hidden sm:block" />
                      <ArrowDown className="w-5 h-5 sm:hidden" />
                    </div>

                    {/* Successor */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                        Dependent (Blocked Until Ready)
                      </div>
                      <div className="text-xs font-bold text-slate-200 truncate mt-0.5">
                        {succ?.title || edge.successorId}
                      </div>
                      <div className="text-[10px] font-mono mt-1.5 flex items-center gap-1.5">
                        <span className="text-slate-500">Current State:</span>
                        {succ?.isBlocked ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-950 px-2 py-0.2 rounded border border-rose-800">
                            <Lock className="w-3 h-3" /> BLOCKED
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.2 rounded border border-emerald-800">
                            READY / UNBLOCKED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="flex justify-end md:justify-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveEdge(edge.predecessorId, edge.successorId)}
                      title="Remove this dependency constraint"
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span className="md:hidden">Remove Edge</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
