/**
 * @license Apache-2.0
 * Frontend Type Definitions matching Backend Domain Entities
 */

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'COMPLETED' | 'ARCHIVED';
export type Priority = 'URGENT_P0' | 'HIGH_P1' | 'MEDIUM_P2' | 'LOW_P3';
export type EnergyLevel = 'LOW_ENERGY' | 'MEDIUM_FOCUS' | 'HIGH_FOCUS' | 'DEEP_WORK';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
  role?: string;
  token: string;
  bufferPreferenceInt: number;
}

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  energyLevel: EnergyLevel;
  requiredTools: string[];
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  estimatedMinutes: number;
  actualMinutes: number;
  bufferMinutes: number;
  deadline?: string | null;
  isBlocked: boolean;
  blockedReason?: string | null;
  recurringRuleId?: string | null;
  version: number;
  clientUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  prerequisiteTitles?: string[];
  prerequisites?: string[];
  dependents?: string[];
  bufferBlockStart?: string | null;
  bufferBlockEnd?: string | null;
}

export interface MultiViewData {
  kanban: {
    todo: TaskItem[];
    inProgress: TaskItem[];
    blocked: TaskItem[];
    inReview: TaskItem[];
    completed: TaskItem[];
  };
  timeline: TaskItem[];
  timeBlocked: Array<{
    date: string;
    slots: Array<{
      hour: number;
      task?: TaskItem;
      isBufferZone?: boolean;
    }>;
  }>;
  dagMetrics: {
    totalNodes: number;
    totalEdges: number;
    blockedCount: number;
    edges: Array<{
      id: string;
      predecessorId: string;
      successorId: string;
      createdAt: string;
    }>;
  };
}

export interface HistoricalMetric {
  id: string;
  userId: string;
  category: string;
  estimatedMinutes: number;
  actualMinutes: number;
  variancePercentage: number;
  loggedAt: string;
}

export interface PredictiveAuditItem {
  taskId: string;
  title: string;
  estimatedMinutes: number;
  audit: {
    isUnrealistic: boolean;
    confidence: number;
    category: string;
    allocatedMinutes: number;
    historicalAverageMinutes: number;
    historicalSampleCount: number;
    recommendedDurationMinutes: number;
    varianceRiskPercentage: number;
    advisoryMessage: string;
  };
}

export interface ExternalEvent {
  id: string;
  provider: 'GOOGLE_CALENDAR' | 'MICROSOFT_OUTLOOK';
  title: string;
  description?: string;
  start: string;
  end: string;
  etag: string;
  attendeesCount?: number;
  syncStatus: string;
}
