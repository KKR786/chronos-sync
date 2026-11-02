/**
 * @license Apache-2.0
 * Zod Schemas for Task Endpoints
 */

import { z } from 'zod';

export const TaskStatusEnum = z.enum([
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'IN_REVIEW',
  'COMPLETED',
  'ARCHIVED',
]);

export const PriorityEnum = z.enum([
  'URGENT_P0',
  'HIGH_P1',
  'MEDIUM_P2',
  'LOW_P3',
]);

export const EnergyLevelEnum = z.enum([
  'LOW_ENERGY',
  'MEDIUM_FOCUS',
  'HIGH_FOCUS',
  'DEEP_WORK',
]);

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required.').max(255),
  description: z.string().optional(),
  priority: PriorityEnum.default('MEDIUM_P2'),
  energyLevel: EnergyLevelEnum.default('MEDIUM_FOCUS'),
  requiredTools: z.array(z.string()).default([]),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  estimatedMinutes: z.number().int().min(5).max(1440).default(30),
  bufferMinutes: z.number().int().min(0).max(120).default(15),
  deadline: z.string().datetime().optional().nullable(),
  prerequisiteTaskIds: z.array(z.string().min(1)).optional().default([]),
});

export const QuickCaptureSchema = z.object({
  rawText: z.string().min(1, 'Quick capture text cannot be empty.').max(500),
  defaultPriority: PriorityEnum.optional(),
  defaultEnergy: EnergyLevelEnum.optional(),
  timezoneOffset: z.number().optional(),
  clientNow: z.string().optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusEnum,
  actualMinutes: z.number().int().min(0).optional(),
});

export const CreateDependencyEdgeSchema = z.object({
  predecessorId: z.string().min(1, 'Predecessor task ID is required.'),
  successorId: z.string().min(1, 'Successor task ID is required.'),
});

export const RemoveDependencyEdgeSchema = z.object({
  predecessorId: z.string().min(1),
  successorId: z.string().min(1),
});

export const OfflineSyncItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional().nullable(),
  status: TaskStatusEnum,
  priority: PriorityEnum,
  energyLevel: EnergyLevelEnum,
  requiredTools: z.array(z.string()).default([]),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  estimatedMinutes: z.number().int(),
  actualMinutes: z.number().int(),
  bufferMinutes: z.number().int(),
  version: z.number().int().min(1),
  clientUpdatedAt: z.string().datetime(),
});

export const OfflineBatchSyncSchema = z.object({
  tasks: z.array(OfflineSyncItemSchema),
  lastSyncTimestamp: z.string().datetime(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required.').max(255).optional(),
  description: z.string().optional().nullable(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  energyLevel: EnergyLevelEnum.optional(),
  requiredTools: z.array(z.string()).optional(),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  estimatedMinutes: z.number().int().min(5).max(1440).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  deadline: z.string().datetime().optional().nullable(),
  prerequisiteTaskIds: z.array(z.string().min(1)).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type QuickCaptureInput = z.infer<typeof QuickCaptureSchema>;
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
export type CreateDependencyEdgeInput = z.infer<typeof CreateDependencyEdgeSchema>;
export type OfflineBatchSyncInput = z.infer<typeof OfflineBatchSyncSchema>;
