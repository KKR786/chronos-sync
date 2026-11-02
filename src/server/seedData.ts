/**
 * @license Apache-2.0
 * Initial High-Fidelity Seed Data for Demonstration
 */

import { TaskProps } from '../modules/task/domain/entities/Task.ts';
import { TaskDependencyProps } from '../modules/task/domain/entities/TaskDependency.ts';

const now = new Date();
const todayAt = (hours: number, minutes: number = 0) => {
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

export const INITIAL_USER_ID = 'usr_arch_001';

export const SEED_TASKS: TaskProps[] = [
  {
    id: 'tsk_001_schema',
    userId: INITIAL_USER_ID,
    title: 'PostgreSQL & Prisma Schema Migration',
    description: 'Design relational tables with compound indexes on status, priority, and version columns.',
    status: 'COMPLETED',
    priority: 'URGENT_P0',
    energyLevel: 'DEEP_WORK',
    requiredTools: ['TERMINAL', 'PRISMA'],
    scheduledStart: todayAt(8, 30),
    scheduledEnd: todayAt(9, 30),
    estimatedMinutes: 60,
    actualMinutes: 65,
    bufferMinutes: 20,
    deadline: todayAt(17, 0),
    isBlocked: false,
    version: 2,
    createdAt: new Date(Date.now() - 3600000 * 5),
    updatedAt: todayAt(9, 35),
  },
  {
    id: 'tsk_002_dag',
    userId: INITIAL_USER_ID,
    title: 'DAG Cycle Prevention & Topological Sort',
    description: 'Implement Kahn algorithm and 3-color DFS to eliminate circular dependency deadlocks.',
    status: 'IN_PROGRESS',
    priority: 'HIGH_P1',
    energyLevel: 'HIGH_FOCUS',
    requiredTools: ['VSCODE', 'JEST'],
    scheduledStart: todayAt(10, 0),
    scheduledEnd: todayAt(11, 15),
    estimatedMinutes: 75,
    actualMinutes: 40,
    bufferMinutes: 15,
    deadline: todayAt(18, 0),
    isBlocked: false,
    version: 1,
    createdAt: new Date(Date.now() - 3600000 * 4),
    updatedAt: todayAt(10, 0),
  },
  {
    id: 'tsk_003_reschedule',
    userId: INITIAL_USER_ID,
    title: 'BullMQ Auto-Reschedule Worker & Dynamic Buffers',
    description: 'Consume delayed queue jobs to recalculate timelines when upstream tasks run over.',
    status: 'BLOCKED',
    priority: 'HIGH_P1',
    energyLevel: 'DEEP_WORK',
    requiredTools: ['VSCODE', 'REDIS'],
    scheduledStart: todayAt(11, 30),
    scheduledEnd: todayAt(12, 30),
    estimatedMinutes: 60,
    actualMinutes: 0,
    bufferMinutes: 15,
    deadline: todayAt(19, 0),
    isBlocked: true,
    blockedReason: 'Blocked by prerequisite: "DAG Cycle Prevention & Topological Sort"',
    version: 1,
    createdAt: new Date(Date.now() - 3600000 * 3),
    updatedAt: todayAt(10, 5),
  },
  {
    id: 'tsk_004_quickcapture',
    userId: INITIAL_USER_ID,
    title: 'Omnipresent Quick Capture & NLP Tokenizer',
    description: 'Lightweight endpoint parsing natural language date/energy expressions in under 2 seconds.',
    status: 'TODO',
    priority: 'MEDIUM_P2',
    energyLevel: 'MEDIUM_FOCUS',
    requiredTools: ['VSCODE'],
    scheduledStart: todayAt(14, 0),
    scheduledEnd: todayAt(14, 45),
    estimatedMinutes: 45,
    actualMinutes: 0,
    bufferMinutes: 10,
    deadline: todayAt(20, 0),
    isBlocked: false,
    version: 1,
    createdAt: new Date(Date.now() - 3600000 * 2),
    updatedAt: new Date(Date.now() - 3600000 * 2),
  },
  {
    id: 'tsk_005_audit',
    userId: INITIAL_USER_ID,
    title: 'Predictive Duration Audit & Variance Flagging',
    description: 'Log completion metrics to flag underestimated tasks before scheduling collisions occur.',
    status: 'TODO',
    priority: 'LOW_P3',
    energyLevel: 'LOW_ENERGY',
    requiredTools: ['CHROME', 'NOTION'],
    scheduledStart: todayAt(15, 0),
    scheduledEnd: todayAt(15, 30),
    estimatedMinutes: 30,
    actualMinutes: 0,
    bufferMinutes: 10,
    deadline: todayAt(21, 0),
    isBlocked: false,
    version: 1,
    createdAt: new Date(Date.now() - 3600000 * 1),
    updatedAt: new Date(Date.now() - 3600000 * 1),
  },
];

export const SEED_DEPENDENCIES: TaskDependencyProps[] = [
  {
    id: 'dep_001',
    predecessorId: 'tsk_001_schema',
    successorId: 'tsk_002_dag',
    createdAt: new Date(Date.now() - 3600000 * 4),
  },
  {
    id: 'dep_002',
    predecessorId: 'tsk_002_dag',
    successorId: 'tsk_003_reschedule',
    createdAt: new Date(Date.now() - 3600000 * 3),
  },
];
