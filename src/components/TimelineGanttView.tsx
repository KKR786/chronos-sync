/**
 * @license Apache-2.0
 * Timeline & Gantt Schedule Multi-View Component
 * Renders scheduled blocks, dynamic buffer recovery intervals, and dependency relationships.
 * Fully responsive across all viewports.
 */

import React from 'react';
import { TaskItem } from '../types/index.ts';
import { Clock, ShieldAlert, Cpu, Zap, ArrowRight, Layers, Sparkles, HelpCircle, Play, Pencil, Trash2 } from 'lucide-react';

interface TimelineGanttViewProps {
  timelineTasks: TaskItem[];
  onSelectForFocus: (task: TaskItem) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const TimelineGanttView: React.FC<TimelineGanttViewProps> = ({
  timelineTasks,
  onSelectForFocus,
  onEditTask,
  onDeleteTask,
}) => {
  // Sort tasks chronologically
  const sorted = [...timelineTasks].sort((a, b) => {
    const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
    const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
    return aTime - bTime;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Timeline Schedule &amp; Dynamic Buffer Zones
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consecutive tasks automatically feature dynamic contextual buffers to prevent cascade delays and cognitive switching fatigue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono shrink-0 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Active Execution Slot
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Recovery Buffer
          </span>
        </div>
      </div>

      {/* Timeline Gantt Stack */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4 shadow-xl">
        {sorted.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No tasks with scheduled timelines found. Use Quick Capture (⌘K) to schedule tasks.
          </div>
        ) : (
          sorted.map((task, idx) => {
            const start = task.scheduledStart ? new Date(task.scheduledStart) : null;
            const end = task.scheduledEnd ? new Date(task.scheduledEnd) : null;
            const bufferEnd = task.bufferBlockEnd ? new Date(task.bufferBlockEnd) : null;

            return (
              <div key={task.id} className="relative group">
                {/* Visual Connector Line between consecutive tasks */}
                {idx < sorted.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/40 via-amber-500/40 to-transparent -mb-4 z-0 pointer-events-none hidden md:block" />
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all relative z-10 shadow-md">
                  {/* Time Badge */}
                  <div className="flex md:flex-col items-center justify-between md:justify-center md:w-32 shrink-0 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {end ? `to ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>

                  {/* Task Card Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100 break-words leading-snug">{task.title}</h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                          task.priority === 'URGENT_P0'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : task.priority === 'HIGH_P1'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.isBlocked && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-950/90 text-rose-300 border border-rose-700 flex items-center gap-1 font-semibold">
                          <ShieldAlert className="w-3 h-3 text-rose-400" /> BLOCKED BY DAG
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">{task.description}</p>
                    )}

                    {/* Metadata & Dependency Links */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {task.estimatedMinutes}m duration
                      </span>

                      {task.energyLevel === 'DEEP_WORK' && (
                        <span className="text-purple-400 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5" /> Deep Work
                        </span>
                      )}

                      {task.prerequisites && task.prerequisites.length > 0 && (
                        <span className="text-indigo-400 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Has {task.prerequisites.length} Prerequisite(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Buffer Zone Pill */}
                  {task.bufferMinutes > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/60 flex flex-col justify-center items-center text-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        Recovery Buffer
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        +{task.bufferMinutes}m
                      </span>
                      {bufferEnd && (
                        <span className="text-[9px] text-amber-400/80 font-mono">
                          until {bufferEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions: Edit, Delete, Focus */}
                  <div className="shrink-0 flex items-center gap-1.5 justify-end">
                    {onEditTask && (
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-indigo-500/60 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Edit Task Details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-rose-500/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectForFocus(task)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Focus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
