/**
 * @license Apache-2.0
 * BullMQ Auto-Rescheduler & Dynamic Buffer Simulator
 * Simulates upstream task overruns, dispatches jobs to BullMQ queue,
 * and visualizes dynamic timeline recalculations with mandatory recovery buffers.
 * Fully responsive across all devices with plain-English workflow explanations.
 */

import React, { useState } from 'react';
import { TaskItem } from '../types/index.ts';
import {
  RotateCcw,
  Cpu,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Server,
  Layers,
  HelpCircle,
  Info,
} from 'lucide-react';

interface AutoReschedulerProps {
  tasks: TaskItem[];
  onRescheduleComplete: () => void;
}

export const AutoReschedulerView: React.FC<AutoReschedulerProps> = ({
  tasks,
  onRescheduleComplete,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [overrunMinutes, setOverrunMinutes] = useState<number>(45);
  const [mandatoryBuffer, setMandatoryBuffer] = useState<number>(20);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const handleTriggerReschedule = async () => {
    if (!selectedTaskId) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const now = new Date();
      // Calculate overrun timestamp
      const overrunTime = new Date(now.getTime() + overrunMinutes * 60 * 1000).toISOString();

      const res = await fetch('/api/scheduler/auto-reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerTaskId: selectedTaskId,
          actualEndOrOverrunTime: overrunTime,
          overrunMinutes,
          mandatoryBufferMinutes: mandatoryBuffer,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reschedule job failed.');

      setResult(data);
      onRescheduleComplete();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            BullMQ Auto-Rescheduler &amp; Dynamic Buffer Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            When upstream tasks take longer than expected, this worker recalculates upcoming slots, inserts cognitive recovery buffers, and shifts downstream tasks forward.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            Queue: chronos-scheduler-queue
          </span>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-100 mb-0.5">How Dynamic Auto-Rescheduling Works:</p>
          <p className="text-slate-400 leading-relaxed">
            1. Select a task that ran over schedule &bull; 2. Define the delay in minutes &bull; 3. The asynchronous BullMQ worker automatically shifts all lower-priority and dependent tasks while inserting non-negotiable mental recovery buffers between sessions.
          </p>
        </div>
      </div>

      {/* Simulator Control Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Simulate Upstream Task Overrun
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              1. Task Running Over Schedule
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.priority}] {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              2. Overrun Delay (Minutes Behind)
            </label>
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={overrunMinutes}
              onChange={(e) => setOverrunMinutes(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              3. Mandatory Buffer Insertion
            </label>
            <select
              value={mandatoryBuffer}
              onChange={(e) => setMandatoryBuffer(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value={10}>10 min buffer (Light)</option>
              <option value={15}>15 min buffer (Standard)</option>
              <option value={20}>20 min buffer (Deep Work Recovery)</option>
              <option value={30}>30 min buffer (High Incident Recovery)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Selected: <span className="font-semibold text-slate-200">{selectedTask?.title}</span> &bull; Priority: <span className="font-mono text-indigo-400 font-bold">{selectedTask?.priority}</span>
          </p>
          <button
            type="button"
            onClick={handleTriggerReschedule}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Processing in BullMQ Worker...' : 'Simulate Overrun & Dispatch Job'}</span>
          </button>
        </div>
      </div>

      {/* BullMQ Job Execution Telemetry Result */}
      {result && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/50 space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>BullMQ Job #{result.jobId} Executed</span>
            </div>
            <span className="text-xs font-mono text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Total Buffers Inserted: +{result.result?.totalBufferMinutesAdded}m
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The worker successfully recalculated the timeline. Downstream tasks were shifted forward, preserving DAG prerequisites and inserting mandatory buffers:
          </p>

          {/* Rescheduled Tasks Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Task Title</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">New Start Slot</th>
                  <th className="p-3">New End Slot</th>
                  <th className="p-3">Buffer Inserted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {result.result?.rescheduledTasks?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-slate-200">{item.title}</td>
                    <td className="p-3 text-indigo-400">{item.priority}</td>
                    <td className="p-3 text-emerald-400">
                      {new Date(item.newStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-emerald-400">
                      {new Date(item.newEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-amber-400">+{item.bufferMinutes}m recovery</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
