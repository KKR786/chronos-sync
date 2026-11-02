/**
 * @license Apache-2.0
 * Focus Chamber & Visual Audit Component
 * Integrated Pomodoro session state machine linked directly to Task domain entities,
 * with distraction/interruption telemetry and stopwatch duration tracking.
 */

import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types/index.ts';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Cpu,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface FocusChamberProps {
  tasks: TaskItem[];
  selectedTask?: TaskItem | null;
  onSessionComplete: () => void;
}

export const FocusChamberView: React.FC<FocusChamberProps> = ({
  tasks,
  selectedTask: initialSelectedTask,
  onSessionComplete,
}) => {
  const [activeTaskId, setActiveTaskId] = useState<string>(
    initialSelectedTask?.id || tasks[0]?.id || ''
  );
  const [phase, setPhase] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [interruptions, setInterruptions] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Stopwatch Mode state
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  // Timer Tick Effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      setIsRunning(false);
      handleFinishSession();
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining]);

  // Stopwatch Tick Effect
  useEffect(() => {
    let swInterval: any = null;
    if (isStopwatchRunning) {
      swInterval = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(swInterval);
  }, [isStopwatchRunning]);

  const handleStartTimer = async () => {
    if (!sessionId && activeTaskId) {
      try {
        const res = await fetch('/api/focus/pomodoro/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: activeTaskId,
            targetDurationMin: targetMinutes,
            phase: phase === 'FOCUS' ? 'FOCUS_WORK' : 'SHORT_BREAK',
          }),
        });
        const data = await res.json();
        setSessionId(data.id);
      } catch (err) {
        console.error(err);
      }
    }
    setIsRunning(true);
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleResetTimer = (minutes: number = 25) => {
    setIsRunning(false);
    setTargetMinutes(minutes);
    setSecondsRemaining(minutes * 60);
    setSessionId(null);
  };

  const handleLogInterruption = async () => {
    setInterruptions((prev) => prev + 1);
    if (sessionId) {
      try {
        await fetch('/api/focus/pomodoro/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            event: 'INTERRUPTION',
            elapsedSeconds: targetMinutes * 60 - secondsRemaining,
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFinishSession = async () => {
    if (sessionId) {
      try {
        await fetch('/api/focus/pomodoro/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            event: 'COMPLETED',
            elapsedSeconds: targetMinutes * 60 - secondsRemaining,
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }

    // Also log to time audit log
    if (activeTaskId) {
      try {
        await fetch('/api/focus/time-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: activeTaskId,
            startedAt: new Date(Date.now() - targetMinutes * 60 * 1000).toISOString(),
            stoppedAt: new Date().toISOString(),
            durationSeconds: targetMinutes * 60,
            deviceType: 'web-desktop',
            notes: `Pomodoro session completed with ${interruptions} logged interruptions.`,
          }),
        });
        onSessionComplete();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveStopwatchAudit = async () => {
    if (!activeTaskId || stopwatchSeconds < 5) return;
    setIsStopwatchRunning(false);

    try {
      await fetch('/api/focus/time-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: activeTaskId,
          startedAt: new Date(Date.now() - stopwatchSeconds * 1000).toISOString(),
          stoppedAt: new Date().toISOString(),
          durationSeconds: stopwatchSeconds,
          deviceType: 'web-desktop',
          notes: 'Precision stopwatch audit recorded.',
        }),
      });
      setStopwatchSeconds(0);
      onSessionComplete();
      alert(`Saved ${Math.round(stopwatchSeconds / 60)} minutes to task actual work time!`);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Focus Chamber &amp; Pomodoro Environment
          </h2>
          <p className="text-xs text-slate-400">
            Hardware-calibrated Pomodoro sessions directly attached to task entities. Distraction audit logs feed predictive models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-purple-400 bg-purple-950/70 border border-purple-800/80 px-2.5 py-1 rounded flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> Deep Work Mode
          </span>
        </div>
      </div>

      {/* Main Focus Control Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pomodoro Timer Visualizer */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Linked Task Selector */}
          <div className="w-full max-w-md mb-6">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Currently Anchored Task
            </label>
            <select
              value={activeTaskId}
              onChange={(e) => {
                setActiveTaskId(e.target.value);
                setSessionId(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.status}] {t.title} ({t.estimatedMinutes}m est.)
                </option>
              ))}
            </select>
          </div>

          {/* Phase Selector (25m Focus / 5m Break) */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-8">
            <button
              onClick={() => { setPhase('FOCUS'); handleResetTimer(25); }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                phase === 'FOCUS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              25m Focus Session
            </button>
            <button
              onClick={() => { setPhase('BREAK'); handleResetTimer(5); }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                phase === 'BREAK' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              5m Brain Recovery Break
            </button>
            <button
              onClick={() => { setPhase('FOCUS'); handleResetTimer(50); }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                targetMinutes === 50 ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              50m Ultradian Sprint
            </button>
          </div>

          {/* Big Digital Display */}
          <div className="relative my-4">
            <div className="text-6xl sm:text-8xl font-black font-mono tracking-tighter bg-gradient-to-b from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent select-none">
              {formatTimer(secondsRemaining)}
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mt-2">
              {isRunning ? 'CHAMBER ACTIVE • FOCUS LOCKED' : 'SESSION PAUSED • READY'}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-3 mt-8">
            {isRunning ? (
              <button
                type="button"
                onClick={handlePauseTimer}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause Session</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartTimer}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Focus Sprint</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleResetTimer(targetMinutes)}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleLogInterruption}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-800 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Log phone call or interruption"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Log Interruption ({interruptions})</span>
            </button>
          </div>
        </div>

        {/* Right: Precision Stopwatch & Visual Audit */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Visual Time Tracking Audit
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Track precise task duration with a millisecond stopwatch. When stopped, updates the task's actual minutes.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center mb-6">
              <div className="text-4xl font-mono font-bold text-slate-100">
                {formatTimer(stopwatchSeconds)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono uppercase mt-1 block">
                Elapsed Stopwatch Audit
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {isStopwatchRunning ? (
              <button
                type="button"
                onClick={() => setIsStopwatchRunning(false)}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Stopwatch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsStopwatchRunning(true)}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Precision Stopwatch</span>
              </button>
            )}

            {stopwatchSeconds > 0 && (
              <button
                type="button"
                onClick={handleSaveStopwatchAudit}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Commit Audit Duration to Task</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
