/**
 * @license Apache-2.0
 * Kanban Pipeline Multi-View Component
 * Ultra-responsive Kanban board with visual cues, interactive column tooltips,
 * DAG dependency state lock, and an educational "What is a Kanban Board?" guide.
 */

import React, { useState } from 'react';
import { TaskItem, TaskStatus } from '../types/index.ts';
import { Tooltip } from './Tooltip.tsx';
import {
  Lock,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Cpu,
  ArrowRight,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';

interface KanbanViewProps {
  kanbanData: {
    todo: TaskItem[];
    inProgress: TaskItem[];
    blocked: TaskItem[];
    inReview: TaskItem[];
    completed: TaskItem[];
  };
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onSelectForFocus: (task: TaskItem) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onCreateTask?: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  kanbanData,
  onUpdateStatus,
  onSelectForFocus,
  onEditTask,
  onDeleteTask,
  onCreateTask,
}) => {
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const columns: Array<{
    id: TaskStatus;
    title: string;
    subtitle: string;
    description: string;
    items: TaskItem[];
    accentColor: string;
    headerBg: string;
    badgeColor: string;
  }> = [
    {
      id: 'TODO',
      title: 'To Do',
      subtitle: 'Ready to be worked on',
      description: 'Tasks in the backlog ready for pickup. No unresolved blockers exist for tasks in this column.',
      items: kanbanData.todo,
      accentColor: 'border-slate-800 hover:border-slate-700',
      headerBg: 'bg-slate-900/90 text-slate-200',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    },
    {
      id: 'IN_PROGRESS',
      title: 'In Progress',
      subtitle: 'Currently under execution',
      description: 'Actively ongoing tasks. Kanban encourages limiting tasks in this lane (WIP limit) to maximize focus and finish work before starting new tasks.',
      items: kanbanData.inProgress,
      accentColor: 'border-indigo-500/40 hover:border-indigo-500/60',
      headerBg: 'bg-indigo-950/70 text-indigo-200',
      badgeColor: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60',
    },
    {
      id: 'BLOCKED',
      title: 'Blocked (DAG)',
      subtitle: 'Waiting on prerequisites',
      description: 'Tasks locked by Directed Acyclic Graph (DAG) dependencies. They cannot be started until all prerequisite predecessor tasks are completed.',
      items: kanbanData.blocked,
      accentColor: 'border-rose-500/50 hover:border-rose-500/70',
      headerBg: 'bg-rose-950/80 text-rose-200',
      badgeColor: 'bg-rose-900/60 text-rose-300 border-rose-700/60',
    },
    {
      id: 'IN_REVIEW',
      title: 'In Review / Audit',
      subtitle: 'Awaiting audit & sign-off',
      description: 'Tasks finished by the developer undergoing time tracking audits, QA tests, or code reviews before final completion.',
      items: kanbanData.inReview,
      accentColor: 'border-amber-500/40 hover:border-amber-500/60',
      headerBg: 'bg-amber-950/70 text-amber-200',
      badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/60',
    },
    {
      id: 'COMPLETED',
      title: 'Completed',
      subtitle: 'Finished & Unblocked',
      description: 'Successfully finished tasks. Marking a task completed triggers automatic DAG cascade evaluation to instantly unlock downstream dependent tasks.',
      items: kanbanData.completed,
      accentColor: 'border-emerald-500/40 hover:border-emerald-500/60',
      headerBg: 'bg-emerald-950/70 text-emerald-200',
      badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60',
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT_P0':
        return (
          <span
            title="P0: Critical Blocker / Urgent"
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-700 shrink-0"
          >
            P0 &bull; Urgent
          </span>
        );
      case 'HIGH_P1':
        return (
          <span
            title="P1: High Priority Item"
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700 shrink-0"
          >
            P1 &bull; High
          </span>
        );
      case 'MEDIUM_P2':
        return (
          <span
            title="P2: Standard / Medium Priority"
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/70 shrink-0"
          >
            P2 &bull; Med
          </span>
        );
      default:
        return (
          <span
            title="P3: Low / Flexible Priority"
            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 shrink-0"
          >
            P3 &bull; Low
          </span>
        );
    }
  };

  const getEnergyBadge = (energy: string) => {
    switch (energy) {
      case 'DEEP_WORK':
        return (
          <span
            title="Deep Work: Maximum focus, zero interruptions"
            className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800"
          >
            <Cpu className="w-3 h-3 text-purple-400" /> Deep Work
          </span>
        );
      case 'HIGH_FOCUS':
        return (
          <span
            title="High Focus: Complex problem solving"
            className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800"
          >
            <Zap className="w-3 h-3 text-cyan-400" /> High Focus
          </span>
        );
      case 'MEDIUM_FOCUS':
        return (
          <span
            title="Medium Focus: Regular sprint work"
            className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800"
          >
            <Clock className="w-3 h-3 text-indigo-400" /> Medium
          </span>
        );
      default:
        return (
          <span
            title="Low Energy: Routine admin & light reading"
            className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800"
          >
            Low Energy
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
            Kanban Pipeline &amp; Workflow State Machine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visual workflow: Tasks move left-to-right from <span className="text-slate-300 font-semibold">To Do</span> &rarr;{' '}
            <span className="text-indigo-300 font-semibold">In Progress</span> &rarr;{' '}
            <span className="text-emerald-300 font-semibold">Completed</span>. Unfinished dependencies keep tasks locked in{' '}
            <span className="text-rose-300 font-semibold">Blocked</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono shrink-0 flex-wrap">
          {onCreateTask && (
            <button
              type="button"
              onClick={onCreateTask}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 font-semibold px-3.5 py-2 rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Optimistic Locking Active
          </span>
        </div>
      </div>

      {/* Kanban Board Horizontal Track with Clean Breathing Space */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 smooth-scroll min-w-0">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`flex flex-col bg-slate-900/70 rounded-2xl border ${col.accentColor} w-[300px] sm:w-[320px] min-w-[290px] shrink-0 overflow-hidden shadow-xl transition-all`}
          >
            {/* Column Header with Interactive Tooltip */}
            <div className={`px-4 py-3 border-b border-slate-800 flex flex-col gap-1 ${col.headerBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">{col.title}</span>
                  <Tooltip
                    title={col.title}
                    content={col.description}
                  />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${col.badgeColor}`}>
                  {col.items.length} {col.items.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <span className="text-[11px] opacity-75 font-normal truncate">{col.subtitle}</span>
            </div>

            {/* Column Body / Cards List */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-270px)] min-h-[460px]">
              {col.items.length === 0 ? (
                <div className="h-32 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
                  <p className="font-medium text-slate-400">Lane is empty</p>
                  <p className="text-[11px] text-slate-600 mt-1">No tasks currently in this state</p>
                </div>
              ) : (
                col.items.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border transition-all relative ${
                      task.isBlocked || task.status === 'BLOCKED'
                        ? 'bg-rose-950/25 border-rose-800/80 shadow-md'
                        : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 shadow-lg'
                    }`}
                  >
                    {/* Blocked Barrier Badge */}
                    {(task.isBlocked || task.status === 'BLOCKED') && (
                      <div className="mb-2.5 p-2.5 rounded-lg bg-rose-950/70 border border-rose-700/80 text-rose-200 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-rose-300">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>Locked by Prerequisite Barrier</span>
                        </div>
                        <p className="text-[11px] text-rose-200/90 mt-1 leading-snug">
                          Must complete:{' '}
                          <span className="font-semibold text-white">
                            {task.prerequisiteTitles?.join(', ') || task.blockedReason || 'Prerequisite task'}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Task Title & Priority Header with Edit/Delete buttons */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold text-slate-100 leading-snug break-words flex-1 min-w-0">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {getPriorityBadge(task.priority)}
                        {onEditTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            title="Edit task details"
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTask && (
                          <button
                            type="button"
                            onClick={() => setDeletingTaskId(task.id)}
                            title="Delete task"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Delete Confirmation */}
                    {deletingTaskId === task.id && (
                      <div className="mb-2 p-2 rounded-lg bg-rose-950/90 border border-rose-700 flex items-center justify-between gap-2 text-xs text-rose-200 animate-fadeIn">
                        <span className="font-semibold text-[11px]">Delete task?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTask?.(task.id);
                              setDeletingTaskId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTaskId(null)}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {task.description && (
                      <p className="text-[11px] text-slate-400 mb-2.5 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Badges: Energy, Duration, Buffer */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {getEnergyBadge(task.energyLevel)}

                      <span
                        title="Allocated estimated duration"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800"
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        {task.estimatedMinutes}m est.
                      </span>

                      {task.bufferMinutes > 0 && (
                        <span
                          title="Contextual recovery buffer inserted to prevent cascade delays"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/60"
                        >
                          +{task.bufferMinutes}m buffer
                        </span>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/90 gap-1.5">
                      {/* Left: Focus Launcher */}
                      <button
                        type="button"
                        onClick={() => onSelectForFocus(task)}
                        title="Launch Pomodoro session for this task"
                        className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Play className="w-3 h-3 fill-indigo-400" />
                        <span>Focus</span>
                      </button>

                      {/* Right: State Transitions */}
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {task.status !== 'TODO' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'TODO')}
                            title="Move back to To Do"
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
                          >
                            To Do
                          </button>
                        )}

                        {task.status !== 'IN_PROGRESS' && !task.isBlocked && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'IN_PROGRESS')}
                            title="Start working on this task"
                            className="px-2 py-1 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-[10px] text-white font-mono font-semibold transition-colors cursor-pointer"
                          >
                            Progress
                          </button>
                        )}

                        {task.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'COMPLETED')}
                            title="Mark Completed — Automatically unblocks downstream dependent tasks"
                            className="px-2.5 py-1 rounded-md bg-emerald-700/80 hover:bg-emerald-600 text-white text-[10px] font-mono font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
