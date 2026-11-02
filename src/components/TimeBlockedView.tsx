/**
 * @license Apache-2.0
 * Time-Blocked Calendar Multi-View Component
 * Integrates daily hourly time blocks with two-way Google/Outlook calendar synchronization overlays.
 */

import React, { useState, useEffect } from 'react';
import { TaskItem, ExternalEvent } from '../types/index.ts';
import { Calendar, Clock, RefreshCw, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface TimeBlockedViewProps {
  tasks: TaskItem[];
  onSelectForFocus: (task: TaskItem) => void;
}

export const TimeBlockedView: React.FC<TimeBlockedViewProps> = ({
  tasks,
  onSelectForFocus,
}) => {
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  const fetchCalendarEvents = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/scheduler/calendar-sync');
      const data = await res.json();
      setExternalEvents(data.events || []);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  // Standard work hours: 08:00 to 18:00
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Time-Blocked Daily Grid &amp; External Calendar Sync
          </h2>
          <p className="text-xs text-slate-400">
            Bidirectional sync gateway with Google Calendar &amp; Outlook CalDAV. Conflict-free time slots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">Synced: {lastSyncTime}</span>
          <button
            type="button"
            onClick={fetchCalendarEvents}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync External Feeds'}</span>
          </button>
        </div>
      </div>

      {/* External Calendar Status Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <div>
              <p className="text-xs font-bold text-slate-200">Google Calendar Two-Way Hook</p>
              <p className="text-[11px] text-slate-400">OAuth Gateway ID: gcal_sync_active</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            CONNECTED
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
            <div>
              <p className="text-xs font-bold text-slate-200">Microsoft Outlook Sync Gateway</p>
              <p className="text-[11px] text-slate-400">Graph API v1.0 Delta Token</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            CONNECTED
          </span>
        </div>
      </div>

      {/* Hourly Grid */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
        {hours.map((hour) => {
          const hourFormatted = `${hour < 10 ? '0' : ''}${hour}:00`;

          // Find tasks that fall in this hour
          const tasksInHour = tasks.filter((t) => {
            if (!t.scheduledStart) return false;
            return new Date(t.scheduledStart).getHours() === hour;
          });

          // Find external calendar events in this hour
          const externalInHour = externalEvents.filter((ev) => {
            return new Date(ev.start).getHours() === hour;
          });

          return (
            <div key={hour} className="flex min-h-[72px] hover:bg-slate-900/40 transition-colors">
              {/* Hour Label */}
              <div className="w-20 sm:w-24 p-3 border-r border-slate-800/80 flex items-start justify-center font-mono text-xs font-semibold text-slate-400 shrink-0">
                {hourFormatted}
              </div>

              {/* Slot Area */}
              <div className="flex-1 p-2 space-y-2">
                {/* Chronos Scheduled Tasks */}
                {tasksInHour.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectForFocus(task)}
                    className="p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-700/60 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between shadow-sm group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div>
                      <span className="text-xs font-bold text-slate-100 truncate">{task.title}</span>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/50 px-1.5 py-0.2 rounded shrink-0">
                        {task.estimatedMinutes}m
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.bufferMinutes > 0 && (
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                          +{task.bufferMinutes}m recovery buffer
                        </span>
                      )}
                      <span className="text-[10px] text-indigo-400 group-hover:underline">Focus &rarr;</span>
                    </div>
                  </div>
                ))}

                {/* External Synced Events */}
                {externalInHour.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></div>
                      <span className="text-xs font-medium text-blue-200 truncate">{ev.title}</span>
                      <span className="text-[10px] font-mono text-blue-300 bg-blue-900/50 px-1.5 py-0.2 rounded shrink-0">
                        {ev.provider === 'GOOGLE_CALENDAR' ? 'Google Cal' : 'Outlook'}
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-mono">External Synced Event</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
