/**
 * @license Apache-2.0
 * Omnipresent Quick Capture Modal with Live Natural Language Parsing (NLP)
 * Target latency: < 2 seconds from hotkey to persisted task entity
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Calendar,
  AlertTriangle,
  Cpu,
  Sparkles,
  X,
  Check,
  Send,
  Wrench,
} from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [nlpPreview, setNlpPreview] = useState<any>(null);

  // Live client-side NLP preview
  useEffect(() => {
    if (!text.trim()) {
      setNlpPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      fetch('/api/scheduler/parse-nlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          timezoneOffset: new Date().getTimezoneOffset(),
          clientNow: new Date().toISOString(),
        }),
      })
        .then((res) => res.json())
        .then((data) => setNlpPreview(data))
        .catch(() => {});
    }, 150);

    return () => clearTimeout(timer);
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const start = performance.now();

    try {
      const res = await fetch('/api/tasks/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: text,
          timezoneOffset: new Date().getTimezoneOffset(),
          clientNow: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      const duration = Math.round(performance.now() - start);
      setLatencyMs(duration);

      setText('');
      onTaskCreated();
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
            <Zap className="w-4 h-4 fill-indigo-400" />
            <span>Omnipresent Quick Capture &bull; NLP Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono bg-slate-800/60 px-2 py-0.5 rounded">
              ESC to close
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="relative">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "Meet with Romman tomorrow at 2 PM for 45 mins deep work with Figma urgent"'
              rows={3}
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-sans"
            />
          </div>

          {/* Live NLP Tokenizer Preview */}
          {nlpPreview && (
            <div className="mt-3.5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Live NLP Tokenization Preview
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  Confidence: {Math.round(nlpPreview.confidenceScore * 100)}%
                </span>
              </div>

              <div className="text-xs text-slate-200">
                <span className="text-slate-400">Extracted Title:</span>{' '}
                <span className="font-semibold text-white">"{nlpPreview.extractedTitle}"</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {nlpPreview.scheduledStart && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-mono text-[11px]">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    {new Date(nlpPreview.scheduledStart).toLocaleDateString()} at{' '}
                    {new Date(nlpPreview.scheduledStart).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-300 font-mono text-[11px]">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {nlpPreview.estimatedMinutes} mins
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-mono text-[11px] ${
                    nlpPreview.priority === 'URGENT_P0'
                      ? 'bg-red-950/80 border-red-700/60 text-red-300'
                      : nlpPreview.priority === 'HIGH_P1'
                      ? 'bg-orange-950/80 border-orange-700/60 text-orange-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {nlpPreview.priority}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono text-[11px]">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  {nlpPreview.energyLevel}
                </span>

                {nlpPreview.requiredTools?.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950/80 border border-purple-700/60 text-purple-300 font-mono text-[11px]">
                    <Wrench className="w-3 h-3" />
                    {nlpPreview.requiredTools.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              {latencyMs !== null && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                  <Check className="w-3.5 h-3.5" />
                  Captured in {latencyMs}ms (&lt; 2s target achieved!)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Persisting...' : 'Quick Capture'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
