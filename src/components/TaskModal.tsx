/**
 * @license Apache-2.0
 * TaskModal Component: Create and Edit Tasks with full Clean Architecture properties
 * Supports title, description, priority, energy level, scheduling, buffers, tools, and prerequisites.
 * Enhanced with interactive explanatory tooltips, comfortable spacious layout, and local timezone accuracy.
 */

import React, { useState, useEffect } from 'react';
import { TaskItem, Priority, EnergyLevel } from '../types/index.ts';
import { Tooltip } from './Tooltip.tsx';
import {
  X,
  Check,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  Cpu,
  Zap,
  Wrench,
  Layers,
  Save,
  Plus,
  HelpCircle,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task?: TaskItem | null;
  allTasks: TaskItem[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: (taskId: string) => void;
}

// Helpers for accurate local date and time input formatting without UTC drift
const toLocalDateInput = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toLocalTimeInput = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  mode,
  task,
  allTasks,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM_P2');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('MEDIUM_FOCUS');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>([]);
  const [customToolInput, setCustomToolInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Common tool badges
  const commonTools = ['VSCODE', 'TERMINAL', 'PRISMA', 'REDIS', 'FIGMA', 'CHROME', 'SLACK'];

  // Initialize form state
  useEffect(() => {
    if (mode === 'edit' && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'MEDIUM_P2');
      setEnergyLevel(task.energyLevel || 'MEDIUM_FOCUS');
      setEstimatedMinutes(task.estimatedMinutes || 30);
      setBufferMinutes(task.bufferMinutes ?? 15);
      setSelectedTools(task.requiredTools || []);
      setSelectedPrereqIds(task.prerequisites || []);

      if (task.scheduledStart) {
        const d = new Date(task.scheduledStart);
        setScheduledDate(toLocalDateInput(d));
        setScheduledTime(toLocalTimeInput(d));
      } else {
        setScheduledDate('');
        setScheduledTime('09:00');
      }

      if (task.deadline) {
        const d = new Date(task.deadline);
        setDeadlineDate(toLocalDateInput(d));
      } else {
        setDeadlineDate('');
      }
    } else {
      // Create mode defaults (in local browser time)
      const now = new Date();
      setTitle('');
      setDescription('');
      setPriority('MEDIUM_P2');
      setEnergyLevel('MEDIUM_FOCUS');
      setEstimatedMinutes(30);
      setBufferMinutes(15);
      setScheduledDate(toLocalDateInput(now));
      setScheduledTime('10:00');
      setDeadlineDate('');
      setSelectedTools([]);
      setSelectedPrereqIds([]);
    }
    setErrorMessage(null);
    setShowDeleteConfirm(false);
  }, [mode, task, isOpen]);

  if (!isOpen) return null;

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const handleAddCustomTool = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customToolInput.trim().toUpperCase();
    if (clean && !selectedTools.includes(clean)) {
      setSelectedTools((prev) => [...prev, clean]);
      setCustomToolInput('');
    }
  };

  const togglePrereq = (id: string) => {
    setSelectedPrereqIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Calculate start and end ISO dates accurately using local date components
      let startIso: string | null = null;
      let endIso: string | null = null;
      if (scheduledDate) {
        const [year, month, day] = scheduledDate.split('-').map(Number);
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const start = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
        startIso = start.toISOString();
        const end = new Date(start.getTime() + estimatedMinutes * 60 * 1000);
        endIso = end.toISOString();
      }

      let deadlineIso: string | null = null;
      if (deadlineDate) {
        const [year, month, day] = deadlineDate.split('-').map(Number);
        const d = new Date(year, month - 1, day, 23, 59, 59, 999);
        deadlineIso = d.toISOString();
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        energyLevel,
        requiredTools: selectedTools,
        scheduledStart: startIso,
        scheduledEnd: endIso,
        estimatedMinutes,
        bufferMinutes,
        deadline: deadlineIso,
        prerequisiteTaskIds: selectedPrereqIds,
      };

      if (mode === 'create') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.details?.[0]?.message || 'Failed to create task.');
        }
      } else if (mode === 'edit' && task) {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to update task.');
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete task.');
      }
      if (onDeleted) onDeleted(task.id);
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Other tasks available to be selected as prerequisites (cannot be itself)
  const candidatePrereqs = allTasks.filter((t) => t.id !== task?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden overflow-x-hidden">
        {/* Sticky Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              {mode === 'create' ? <Plus className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{mode === 'create' ? 'Create New Task' : 'Edit Task & Dependencies'}</span>
                {mode === 'edit' && task && (
                  <span className="text-[11px] font-mono font-normal text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-full">
                    v{task.version}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'create'
                  ? 'Define cognitive requirements, scheduling windows, and prerequisite dependencies'
                  : `Task ID: ${task?.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body with Clean Spacing and No Horizontal Overflow */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto overflow-x-hidden space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Operation Failed</p>
                <p className="opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Section 1: Title & Notes */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Required</span>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deploy backend microservice to production"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Implementation notes, acceptance criteria, or quick capture context..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all shadow-inner leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Priority & Energy Mode with Interactive Explanatory Tooltips */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Priority Tier with Tooltip */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Priority Tier</span>
                  </label>
                  <Tooltip
                    title="Priority Tier"
                    content={
                      <div className="space-y-1">
                        <p><strong>P0 Urgent:</strong> Critical blocker that shifts lower-priority tasks forward.</p>
                        <p><strong>P1 High:</strong> Core milestone item with strict schedule defense.</p>
                        <p><strong>P2 Medium:</strong> Standard planned backlog task.</p>
                        <p><strong>P3 Low:</strong> Nice-to-have or when spare time permits.</p>
                      </div>
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'URGENT_P0', label: 'P0 Urgent', active: 'border-rose-600 bg-rose-950/70 text-rose-200 font-bold shadow-md shadow-rose-900/30' },
                    { id: 'HIGH_P1', label: 'P1 High', active: 'border-amber-600 bg-amber-950/70 text-amber-200 font-bold shadow-md shadow-amber-900/30' },
                    { id: 'MEDIUM_P2', label: 'P2 Medium', active: 'border-indigo-600 bg-indigo-950/70 text-indigo-200 font-bold shadow-md shadow-indigo-900/30' },
                    { id: 'LOW_P3', label: 'P3 Low', active: 'border-slate-600 bg-slate-800 text-slate-200 font-bold shadow-md' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as Priority)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-mono border transition-all cursor-pointer text-center ${
                        priority === p.id
                          ? p.active
                          : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Energy Mode with Tooltip */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Context Energy Mode</span>
                  </label>
                  <Tooltip
                    title="What is Context Energy Mode?"
                    content={
                      <div className="space-y-1.5">
                        <p>Matches tasks to your current mental energy battery:</p>
                        <p>• <strong>Deep Work:</strong> 100% uninterrupted focus for system architecture, heavy coding, and complex debugging.</p>
                        <p>• <strong>High Focus:</strong> Creative problem-solving, feature development, or design work.</p>
                        <p>• <strong>Medium Focus:</strong> Routine engineering, code reviews, and meetings.</p>
                        <p>• <strong>Low Energy:</strong> Light admin, documentation, answering messages, or backlog triaging.</p>
                      </div>
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'LOW_ENERGY', label: 'Low Energy', icon: Zap },
                    { id: 'MEDIUM_FOCUS', label: 'Medium Focus', icon: Clock },
                    { id: 'HIGH_FOCUS', label: 'High Focus', icon: Zap },
                    { id: 'DEEP_WORK', label: 'Deep Work', icon: Cpu },
                  ].map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEnergyLevel(e.id as EnergyLevel)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-mono border transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        energyLevel === e.id
                          ? 'border-cyan-500 bg-cyan-950/70 text-cyan-200 font-bold shadow-md shadow-cyan-950/40'
                          : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span>{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration & Recovery Buffer with Tooltips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Estimated Duration</span>
                  </label>
                  <Tooltip
                    title="Predictive Estimation"
                    content="Expected execution time in minutes. Chronos tracks actual stopwatch time to calculate historical accuracy and flag unrealistic estimates."
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={720}
                    step={5}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 pointer-events-none">
                    mins
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Recovery Buffer</span>
                  </label>
                  <Tooltip
                    title="Mandatory Recovery Buffer"
                    content="Automated gap inserted immediately after this task. Prevents mental fatigue and protects subsequent schedule slots if tasks overrun."
                  />
                </div>
                <select
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>0 min (Back-to-back)</option>
                  <option value={10}>10 min buffer</option>
                  <option value={15}>15 min buffer (Standard)</option>
                  <option value={20}>20 min buffer (Deep Work Recovery)</option>
                  <option value={30}>30 min buffer (Major Milestone)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Schedule Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Scheduled Start Date &amp; Time</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Local Time</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="col-span-3 px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="col-span-2 px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Strict Deadline (Optional)</span>
                </label>
                <Tooltip
                  title="Strict Deadline"
                  content="Hard cutoff date. The BullMQ engine alerts you if prerequisites or timeline drift threaten to breach this deadline."
                />
              </div>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 4: Required Tools */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                <span>Required Tools / Environment</span>
              </label>
              <span className="text-[11px] text-slate-400">Context Tagging</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {commonTools.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    selectedTools.includes(tool)
                      ? 'bg-purple-950/90 text-purple-200 border-purple-600 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom tool tag (press Enter)..."
                value={customToolInput}
                onChange={(e) => setCustomToolInput(e.target.value)}
                onKeyDown={handleAddCustomTool}
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTool}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-mono cursor-pointer transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Section 5: DAG Prerequisites Chains with Tooltip */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>DAG Prerequisites (Dependency Chains)</span>
              </label>
              <Tooltip
                title="What are DAG Prerequisites?"
                content={
                  <div>
                    <p>Directed Acyclic Graph algorithm ensures tasks execute in valid dependency order.</p>
                    <p className="mt-1">This task remains strictly <strong>Locked in Blocked</strong> lane until all checked tasks are marked Done.</p>
                  </div>
                }
              />
            </div>
            {candidatePrereqs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No other tasks in backlog to depend on.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800/90">
                {candidatePrereqs.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrereqIds.includes(t.id)}
                      onChange={() => togglePrereq(t.id)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-mono text-[10px] text-slate-400">[{t.priority}]</span>
                    <span className="text-slate-200 truncate flex-1 font-medium">{t.title}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        t.status === 'COMPLETED'
                          ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-800'
                          : 'text-amber-300 bg-amber-950/80 border border-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Sticky Footer Actions with Breathing Space */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          {mode === 'edit' && task ? (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300 font-semibold">Delete task?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
