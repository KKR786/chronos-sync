/**
 * @license Apache-2.0
 * Zod Schemas for Focus & Time Audit Endpoints
 */

import { z } from 'zod';

export const StartPomodoroSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required.'),
  targetDurationMin: z.number().int().min(5).max(120).default(25),
  phase: z.enum(['FOCUS_WORK', 'SHORT_BREAK', 'LONG_BREAK']).default('FOCUS_WORK'),
});

export const LogPomodoroEventSchema = z.object({
  sessionId: z.string().min(1),
  event: z.enum(['PAUSED', 'RESUMED', 'COMPLETED', 'INTERRUPTION', 'CANCELLED']),
  elapsedSeconds: z.number().int().min(0),
});

export const TimeAuditLogSchema = z.object({
  taskId: z.string().min(1),
  startedAt: z.string().datetime(),
  stoppedAt: z.string().datetime(),
  durationSeconds: z.number().int().min(1),
  deviceType: z.string().default('web-desktop'),
  notes: z.string().optional(),
});

export type StartPomodoroInput = z.infer<typeof StartPomodoroSchema>;
export type LogPomodoroEventInput = z.infer<typeof LogPomodoroEventSchema>;
export type TimeAuditLogInput = z.infer<typeof TimeAuditLogSchema>;
