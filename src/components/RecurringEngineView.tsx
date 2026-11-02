/**
 * @license Apache-2.0
 * Flexible Recurring Engine Component
 * Configures human-readable recurring rules extending standard CRON:
 * - Ordinal Weekdays ("Every 3rd Tuesday")
 * - Business Day Offsets ("Every 10 business days", skipping weekends)
 * - Standard 5-Field CRON expressions
 */

import React, { useState } from 'react';
import { RefreshCw, Calendar, Clock, Plus, CheckCircle2, Sparkles } from 'lucide-react';

export const RecurringEngineView: React.FC = () => {
  const [ruleType, setRuleType] = useState<'ORDINAL' | 'BUSINESS_DAYS' | 'CRON'>('ORDINAL');
  const [ordinalNumber, setOrdinalNumber] = useState<number>(3);
  const [weekdayName, setWeekdayName] = useState<string>('TUESDAY');
  const [businessDays, setBusinessDays] = useState<number>(10);
  const [cronExpr, setCronExpr] = useState<string>('0 9 * * 1-5');
  const [templateTitle, setTemplateTitle] = useState<string>('Bi-Weekly Architecture Sync');
  const [rules, setRules] = useState<any[]>([
    {
      id: 'rule_01',
      title: 'Monthly Database Re-indexing',
      pattern: 'ORDINAL:3:TUESDAY',
      description: 'Every 3rd Tuesday of the month',
      nextRun: 'Next 3rd Tuesday at 09:00 AM',
      isBusinessDay: true,
    },
    {
      id: 'rule_02',
      title: 'Sprint Retrospective & BullMQ Audit',
      pattern: 'BUSINESS_DAYS:10',
      description: 'Every 10 business days (skips weekends)',
      nextRun: '+10 business days from today at 09:00 AM',
      isBusinessDay: true,
    },
  ]);

  const [createdNotice, setCreatedNotice] = useState<string | null>(null);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedNotice(null);

    let pattern = '';
    if (ruleType === 'ORDINAL') {
      pattern = `ORDINAL:${ordinalNumber}:${weekdayName}`;
    } else if (ruleType === 'BUSINESS_DAYS') {
      pattern = `BUSINESS_DAYS:${businessDays}`;
    } else {
      pattern = cronExpr;
    }

    try {
      const res = await fetch('/api/scheduler/recurring-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: ruleType === 'CRON' ? 'CUSTOM_CRON' : ruleType === 'ORDINAL' ? 'ORDINAL_DAY' : 'BUSINESS_DAYS',
          complexPattern: pattern,
          templateTitle,
          templateEstimatedMinutes: 45,
          priority: 'HIGH_P1',
        }),
      });

      const data = await res.json();
      setRules((prev) => [
        {
          id: data.id,
          title: templateTitle,
          pattern: data.pattern,
          description: data.nextOccurrence?.ruleDescription,
          nextRun: data.nextOccurrence?.humanSummary,
          isBusinessDay: data.nextOccurrence?.isBusinessDayOnly,
        },
        ...prev,
      ]);

      setCreatedNotice(`Engine rule generated! Calculated next run: ${data.nextOccurrence?.humanSummary}`);
      setTemplateTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Flexible Recurring Engines (Beyond CRON)
          </h2>
          <p className="text-xs text-slate-400">
            Native support for complex scheduling heuristics: Ordinal days ("3rd Tuesday"), business-day arithmetic, and standard POSIX CRON.
          </p>
        </div>
      </div>

      {/* Rule Creator */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Define Complex Recurrence Schedule
        </h3>

        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Task Template Title
            </label>
            <input
              type="text"
              required
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="e.g. End-of-Month Infrastructure Audit"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Rule Type Selector */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 max-w-md">
            <button
              type="button"
              onClick={() => setRuleType('ORDINAL')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                ruleType === 'ORDINAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ordinal Day (e.g. 3rd Tuesday)
            </button>
            <button
              type="button"
              onClick={() => setRuleType('BUSINESS_DAYS')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                ruleType === 'BUSINESS_DAYS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Business Days Interval
            </button>
            <button
              type="button"
              onClick={() => setRuleType('CRON')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                ruleType === 'CRON' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard CRON
            </button>
          </div>

          {/* Contextual Rule Inputs */}
          {ruleType === 'ORDINAL' && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Occurrence In Month</label>
                <select
                  value={ordinalNumber}
                  onChange={(e) => setOrdinalNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  <option value={1}>1st occurrence</option>
                  <option value={2}>2nd occurrence</option>
                  <option value={3}>3rd occurrence</option>
                  <option value={4}>4th occurrence</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Weekday</label>
                <select
                  value={weekdayName}
                  onChange={(e) => setWeekdayName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  <option value="MONDAY">Monday</option>
                  <option value="TUESDAY">Tuesday</option>
                  <option value="WEDNESDAY">Wednesday</option>
                  <option value="THURSDAY">Thursday</option>
                  <option value="FRIDAY">Friday</option>
                </select>
              </div>
            </div>
          )}

          {ruleType === 'BUSINESS_DAYS' && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs text-slate-400 mb-1">
                Interval in Business Days (Automatically jumps across Saturdays &amp; Sundays)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={businessDays}
                onChange={(e) => setBusinessDays(Number(e.target.value))}
                className="w-full max-w-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
              />
            </div>
          )}

          {ruleType === 'CRON' && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs text-slate-400 mb-1">
                POSIX CRON Expression (minute hour day-of-month month day-of-week)
              </label>
              <input
                type="text"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="w-full max-w-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300"
              />
            </div>
          )}

          {createdNotice && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{createdNotice}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!templateTitle.trim()}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Compute Next Execution &amp; Register Rule</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Rules List */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Registered Recurring Task Rules
          </span>
          <span className="text-[11px] font-mono text-slate-400">Total Rules: {rules.length}</span>
        </div>

        {rules.map((rule) => (
          <div key={rule.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
            <div>
              <h4 className="text-xs font-bold text-slate-200">{rule.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
              <div className="text-[11px] font-mono text-indigo-400 mt-1">Pattern: {rule.pattern}</div>
            </div>
            <div className="sm:text-right font-mono text-xs">
              <div className="text-[10px] text-slate-500 uppercase">Next Scheduled Run</div>
              <div className="text-emerald-400 font-semibold">{rule.nextRun}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
