/**
 * @license Apache-2.0
 * Chronos Intelligent Task Scheduler & Workflow Engine
 * Clean Architecture Modular Monolith Frontend Application Root
 * Highly responsive, intuitive UI with clear visual cues and mobile-first navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserSession, TaskItem, MultiViewData, EnergyLevel } from './types/index.ts';
import { AuthScreen } from './components/AuthScreen.tsx';
import { KanbanView } from './components/KanbanView.tsx';
import { TimelineGanttView } from './components/TimelineGanttView.tsx';
import { TimeBlockedView } from './components/TimeBlockedView.tsx';
import { DAGStudioView } from './components/DAGStudioView.tsx';
import { AutoReschedulerView } from './components/AutoReschedulerView.tsx';
import { PredictiveAuditorView } from './components/PredictiveAuditorView.tsx';
import { FocusChamberView } from './components/FocusChamberView.tsx';
import { RecurringEngineView } from './components/RecurringEngineView.tsx';
import { ArchitectureExplorerView } from './components/ArchitectureExplorerView.tsx';
import { QuickCaptureModal } from './components/QuickCaptureModal.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { Tooltip } from './components/Tooltip.tsx';

import {
  Sparkles,
  Zap,
  Clock,
  Layers,
  Cpu,
  Calendar,
  LogOut,
  RefreshCw,
  Server,
  Code2,
  CheckCircle2,
  Wifi,
  WifiOff,
  GitBranch,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Menu,
  Plus,
} from 'lucide-react';

export type TabId =
  | 'KANBAN'
  | 'TIMELINE'
  | 'TIMEBLOCKED'
  | 'DAG_STUDIO'
  | 'AUTORESCHEDULE'
  | 'AUDIT'
  | 'FOCUS'
  | 'RECURRING'
  | 'ARCHITECTURE';

export default function App() {
  // Session State (First page is Login if null)
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('chronos_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Global Context Filter (Energy Modes: Low Energy, Medium Focus, High Focus, Deep Work)
  const [selectedEnergyFilter, setSelectedEnergyFilter] = useState<EnergyLevel | 'ALL'>('ALL');

  // Navigation View Tab
  const [activeTab, setActiveTab] = useState<TabId>('KANBAN');

  // Data State
  const [multiViewData, setMultiViewData] = useState<MultiViewData>({
    kanban: { todo: [], inProgress: [], blocked: [], inReview: [], completed: [] },
    timeline: [],
    timeBlocked: [],
    dagMetrics: { totalNodes: 0, totalEdges: 0, blockedCount: 0, edges: [] },
  });
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Capture Modal State
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Task Create & Edit Modal State
  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    task?: TaskItem | null;
  }>({
    isOpen: false,
    mode: 'create',
    task: null,
  });

  // Focus Chamber Selected Task
  const [focusSelectedTask, setFocusSelectedTask] = useState<TaskItem | null>(null);

  // Offline Simulation & Concurrency Sync State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlinePendingQueue, setOfflinePendingQueue] = useState<TaskItem[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Mobile energy menu toggle
  const [mobileEnergyOpen, setMobileEnergyOpen] = useState(false);

  // Persist session to localStorage
  const handleAuthenticated = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('chronos_session', JSON.stringify(userSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('chronos_session');
  };

  // Fetch Multi-View Projections from Backend
  const refreshTasks = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);

    try {
      const headers = { Authorization: `Bearer ${session.token}` };
      const [viewRes, tasksRes] = await Promise.all([
        fetch('/api/tasks/views/multi', { headers }),
        fetch('/api/tasks', { headers }),
      ]);

      if (viewRes.ok && tasksRes.ok) {
        const viewData = await viewRes.json();
        const taskData = await tasksRes.json();
        setMultiViewData(viewData);
        setAllTasks(taskData);
      }
    } catch (err) {
      console.error('[Chronos Frontend] Data refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      refreshTasks();
    }
  }, [session, refreshTasks]);

  // Global Keyboard Hotkey for Omnipresent Quick Capture (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickCaptureOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update Task Status with Automatic DAG Cascade Unblocking
  const handleUpdateStatus = async (taskId: string, newStatus: any) => {
    if (!session) return;

    if (isOfflineMode) {
      // In offline mode: mutate locally and enqueue for batch sync
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        const updatedTask = {
          ...task,
          status: newStatus,
          clientUpdatedAt: new Date().toISOString(),
        };
        setOfflinePendingQueue((prev) => [...prev.filter((t) => t.id !== taskId), updatedTask]);
        setSyncFeedback(`Task "${task.title}" updated in local offline cache (Pending Sync).`);
        setAllTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      }
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update status');
        return;
      }

      if (data.unblockedDependentTasks && data.unblockedDependentTasks.length > 0) {
        const unblockedTitles = data.unblockedDependentTasks.map((t: any) => t.title).join(', ');
        setSyncFeedback(`🎉 DAG Prerequisite Completed! Automatically unblocked: ${unblockedTitles}`);
      }

      refreshTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task with Automatic DAG edge cleanup and unblocking
  const handleDeleteTask = async (taskId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete task');
        return;
      }
      if (data.unblockedCount > 0) {
        setSyncFeedback(`Task deleted. Automatically unblocked ${data.unblockedCount} dependent task(s).`);
      } else {
        setSyncFeedback('Task deleted successfully.');
      }
      refreshTasks();
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  // Offline Batch Sync with Optimistic Concurrency & LWW
  const handleTriggerOfflineBatchSync = async () => {
    if (!session || offlinePendingQueue.length === 0) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/tasks/offline-batch-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          tasks: offlinePendingQueue,
          lastSyncTimestamp: new Date().toISOString(),
        }),
      });

      const report = await res.json();
      if (res.ok) {
        setOfflinePendingQueue([]);
        setSyncFeedback(
          `Sync Successful: ${report.appliedCount} tasks updated with optimistic lock version checks (${report.conflictsCount} conflict checks passed).`
        );
        refreshTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tasks based on global energy mode
  const filteredTasks = allTasks.filter((t) => {
    if (selectedEnergyFilter === 'ALL') return true;
    return t.energyLevel === selectedEnergyFilter;
  });

  const filteredKanban = {
    todo: multiViewData.kanban.todo.filter(
      (t) => selectedEnergyFilter === 'ALL' || t.energyLevel === selectedEnergyFilter
    ),
    inProgress: multiViewData.kanban.inProgress.filter(
      (t) => selectedEnergyFilter === 'ALL' || t.energyLevel === selectedEnergyFilter
    ),
    blocked: multiViewData.kanban.blocked.filter(
      (t) => selectedEnergyFilter === 'ALL' || t.energyLevel === selectedEnergyFilter
    ),
    inReview: multiViewData.kanban.inReview.filter(
      (t) => selectedEnergyFilter === 'ALL' || t.energyLevel === selectedEnergyFilter
    ),
    completed: multiViewData.kanban.completed.filter(
      (t) => selectedEnergyFilter === 'ALL' || t.energyLevel === selectedEnergyFilter
    ),
  };

  const navTabs: Array<{
    id: TabId;
    label: string;
    category: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
  }> = [
    { id: 'KANBAN', label: 'Kanban Board', category: 'Execution', icon: Layers, desc: 'Interactive status columns & DAG lock barriers' },
    { id: 'TIMELINE', label: 'Timeline & Buffers', category: 'Execution', icon: Clock, desc: 'Chronological schedule & dynamic recovery gaps' },
    { id: 'TIMEBLOCKED', label: 'Time-Blocked Grid', category: 'Execution', icon: Calendar, desc: 'Hourly calendar with Google & Outlook sync' },
    { id: 'DAG_STUDIO', label: 'DAG Dependency Studio', category: 'Automation & Logic', icon: GitBranch, desc: 'Directed graph, Kahn topological sort & cycle detector' },
    { id: 'AUTORESCHEDULE', label: 'BullMQ Rescheduler', category: 'Automation & Logic', icon: Server, desc: 'Simulate overruns & trigger dynamic buffer shifts' },
    { id: 'AUDIT', label: 'Predictive Auditor', category: 'Automation & Logic', icon: TrendingUp, desc: 'Historical completion metrics vs estimates' },
    { id: 'FOCUS', label: 'Focus & Pomodoro', category: 'Focus & Tools', icon: Cpu, desc: 'Hardware-calibrated 25/5m timer & audit stopwatch' },
    { id: 'RECURRING', label: 'Recurring Rules', category: 'Focus & Tools', icon: RefreshCw, desc: 'Complex intervals ("Every 3rd Tuesday", business days)' },
    { id: 'ARCHITECTURE', label: 'Clean Architecture', category: 'Focus & Tools', icon: Code2, desc: 'Directory layout, schema.prisma, and TypeScript domain code' },
  ];

  // FIRST PAGE AUTHENTICATION CHECK
  if (!session) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand & Engine Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  CHRONOS SYNC
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-700/80 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden md:block">
                Modular Monolith &bull; Express + Prisma + BullMQ
              </p>
            </div>
          </div>

          {/* Center: Global Energy Mode Filter (Desktop & Tablet) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono px-2 flex items-center gap-1.5 font-semibold">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Energy Mode:</span>
              <Tooltip
                position="bottom"
                title="Context-Based Energy Filtering"
                content="Filter your tasks based on your current cognitive battery: Deep Work (intense focus, no distractions), High Focus (creative coding), Medium Focus (meetings & routine tasks), Low Energy (light admin)."
              />
            </span>
            {(['ALL', 'LOW_ENERGY', 'MEDIUM_FOCUS', 'HIGH_FOCUS', 'DEEP_WORK'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedEnergyFilter(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                  selectedEnergyFilter === mode
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={
                  mode === 'ALL'
                    ? 'Show all tasks'
                    : mode === 'LOW_ENERGY'
                    ? 'Routine or light administrative tasks'
                    : mode === 'MEDIUM_FOCUS'
                    ? 'Standard focused tasks'
                    : mode === 'HIGH_FOCUS'
                    ? 'Complex engineering tasks'
                    : 'Deep uninterrupted focus tasks'
                }
              >
                {mode === 'ALL'
                  ? 'All'
                  : mode === 'LOW_ENERGY'
                  ? 'Low'
                  : mode === 'MEDIUM_FOCUS'
                  ? 'Medium'
                  : mode === 'HIGH_FOCUS'
                  ? 'High'
                  : 'Deep Work'}
              </button>
            ))}
          </div>

          {/* Right: Quick Capture, Offline Toggle, User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Mobile Energy Selector Button */}
            <div className="lg:hidden relative">
              <button
                type="button"
                onClick={() => setMobileEnergyOpen(!mobileEnergyOpen)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                title="Filter by Energy Level"
              >
                <Zap className="w-4 h-4 text-amber-400" />
              </button>
              {mobileEnergyOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="text-[10px] font-mono text-slate-400 uppercase px-2 py-1 mb-1 border-b border-slate-800">
                    Filter by Energy
                  </div>
                  {(['ALL', 'LOW_ENERGY', 'MEDIUM_FOCUS', 'HIGH_FOCUS', 'DEEP_WORK'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSelectedEnergyFilter(mode);
                        setMobileEnergyOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                        selectedEnergyFilter === mode ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dedicated New Task Button (Full Modal with fields) */}
            <button
              type="button"
              onClick={() => setTaskModalState({ isOpen: true, mode: 'create', task: null })}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-indigo-500/80 text-slate-100 text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Create a new task with full customization (DAG prerequisites, priority, buffers, energy level)"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden xs:inline sm:inline">New Task</span>
            </button>

            {/* Omnipresent Quick Capture Button */}
            <button
              type="button"
              onClick={() => setIsQuickCaptureOpen(true)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
              <span className="font-semibold">Quick Capture</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-indigo-800/80 text-[10px] font-mono text-indigo-100 ml-1">
                ⌘K
              </kbd>
            </button>

            {/* Offline Simulation Toggle */}
            <button
              type="button"
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isOfflineMode
                  ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle offline state simulation to test optimistic concurrency locking & conflict resolution"
            >
              {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Wifi className="w-3.5 h-3.5 shrink-0" />}
              <span className="hidden sm:inline">{isOfflineMode ? 'Offline Mode' : 'Online'}</span>
              {offlinePendingQueue.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {offlinePendingQueue.length}
                </span>
              )}
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
              <div className="text-right hidden xl:block">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                  {session.fullName}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                  {session.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sync / Prerequisite Notification Banner */}
      {syncFeedback && (
        <div className="bg-indigo-950/90 border-b border-indigo-700/80 px-4 py-2.5 text-xs text-indigo-200 shadow-lg animate-fadeIn">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium truncate">{syncFeedback}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {offlinePendingQueue.length > 0 && (
                <button
                  type="button"
                  onClick={handleTriggerOfflineBatchSync}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] cursor-pointer shadow-md"
                >
                  Sync {offlinePendingQueue.length} Changes (Version Check)
                </button>
              )}
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="text-indigo-300 hover:text-white font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Navigation Tabs Bar */}
      <nav className="bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-6 py-2 sticky top-[57px] z-30 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto">
          {/* Mobile View Selector Dropdown (< 640px) */}
          <div className="sm:hidden flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">View:</span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabId)}
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {navTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  [{tab.category}] {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop & Tablet Navigation Track (>= 640px) */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto smooth-scroll pb-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.desc}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Viewport Workspace Content */}
      <main className="flex-1 p-3 sm:p-6 w-full max-w-[1600px] mx-auto min-w-0">
        {activeTab === 'KANBAN' && (
          <KanbanView
            kanbanData={filteredKanban}
            onUpdateStatus={handleUpdateStatus}
            onSelectForFocus={(task) => {
              setFocusSelectedTask(task);
              setActiveTab('FOCUS');
            }}
            onCreateTask={() => setTaskModalState({ isOpen: true, mode: 'create', task: null })}
            onEditTask={(task) => setTaskModalState({ isOpen: true, mode: 'edit', task })}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'TIMELINE' && (
          <TimelineGanttView
            timelineTasks={multiViewData.timeline.filter(
              (t) => selectedEnergyFilter === 'ALL' || t.energyLevel === selectedEnergyFilter
            )}
            onSelectForFocus={(task) => {
              setFocusSelectedTask(task);
              setActiveTab('FOCUS');
            }}
            onEditTask={(task) => setTaskModalState({ isOpen: true, mode: 'edit', task })}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'TIMEBLOCKED' && (
          <TimeBlockedView
            tasks={filteredTasks}
            onSelectForFocus={(task) => {
              setFocusSelectedTask(task);
              setActiveTab('FOCUS');
            }}
          />
        )}

        {activeTab === 'DAG_STUDIO' && (
          <DAGStudioView
            tasks={allTasks}
            dagEdges={multiViewData.dagMetrics.edges}
            onRefresh={refreshTasks}
          />
        )}

        {activeTab === 'AUTORESCHEDULE' && (
          <AutoReschedulerView
            tasks={allTasks}
            onRescheduleComplete={refreshTasks}
          />
        )}

        {activeTab === 'AUDIT' && <PredictiveAuditorView />}

        {activeTab === 'FOCUS' && (
          <FocusChamberView
            tasks={allTasks}
            selectedTask={focusSelectedTask}
            onSessionComplete={refreshTasks}
          />
        )}

        {activeTab === 'RECURRING' && <RecurringEngineView />}

        {activeTab === 'ARCHITECTURE' && <ArchitectureExplorerView />}
      </main>

      {/* Omnipresent Quick Capture Modal (NLP Fast Capture) */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onTaskCreated={refreshTasks}
      />

      {/* Full Task Create / Edit Modal (CRUD & Prerequisite DAG Management) */}
      <TaskModal
        isOpen={taskModalState.isOpen}
        mode={taskModalState.mode}
        task={taskModalState.task}
        allTasks={allTasks}
        onClose={() => setTaskModalState((prev) => ({ ...prev, isOpen: false }))}
        onSaved={refreshTasks}
        onDeleted={handleDeleteTask}
      />
    </div>
  );
}
