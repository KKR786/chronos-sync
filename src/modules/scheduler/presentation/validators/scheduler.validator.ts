/**
 * @license Apache-2.0
 * Zod Schemas for Scheduler, NLP, Auto-Reschedule & Calendar Sync Endpoints
 */

import { z } from 'zod';

export const AutoRescheduleTriggerSchema = z.object({
  triggerTaskId: z.string().min(1, 'Trigger task ID is required.'),
  actualEndOrOverrunTime: z.string().datetime(),
  overrunMinutes: z.number().int().min(1).max(480),
  mandatoryBufferMinutes: z.number().int().min(5).max(60).default(15),
  timelineDate: z.string().optional(),
});

export const NaturalLanguageParseSchema = z.object({
  query: z.string().min(2, 'Query text too short to parse.'),
  timezone: z.string().default('UTC'),
  timezoneOffset: z.number().optional(),
  clientNow: z.string().optional(),
});

export const RecurringFrequencyEnum = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'CUSTOM_CRON',
  'ORDINAL_DAY',
  'BUSINESS_DAYS',
]);

export const CreateRecurringRuleSchema = z.object({
  frequency: RecurringFrequencyEnum,
  cronExpression: z.string().optional(),
  complexPattern: z.string().optional(), // e.g. "ORDINAL:3:TUESDAY" or "BUSINESS_DAYS:10"
  intervalDays: z.number().int().min(1).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  monthDay: z.number().int().min(1).max(31).optional(),
  templateTitle: z.string().min(1),
  templateEstimatedMinutes: z.number().int().default(30),
  priority: z.enum(['URGENT_P0', 'HIGH_P1', 'MEDIUM_P2', 'LOW_P3']).default('MEDIUM_P2'),
  energyLevel: z.enum(['LOW_ENERGY', 'MEDIUM_FOCUS', 'HIGH_FOCUS', 'DEEP_WORK']).default('MEDIUM_FOCUS'),
});

export const CalendarSyncWebhookSchema = z.object({
  provider: z.enum(['GOOGLE_CALENDAR', 'MICROSOFT_OUTLOOK', 'APPLE_ICAL']),
  externalEventId: z.string().min(1),
  summary: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  action: z.enum(['CREATED', 'UPDATED', 'DELETED']),
});

export type AutoRescheduleTriggerInput = z.infer<typeof AutoRescheduleTriggerSchema>;
export type NaturalLanguageParseInput = z.infer<typeof NaturalLanguageParseSchema>;
export type CreateRecurringRuleInput = z.infer<typeof CreateRecurringRuleSchema>;
export type CalendarSyncWebhookInput = z.infer<typeof CalendarSyncWebhookSchema>;
