/**
 * @license Apache-2.0
 * BullMQ Worker & Processor: AutoRescheduleWorker
 *
 * Implements requirement:
 * "The BullMQ worker and processor setup for handling the 'Auto-Rescheduling & Dynamic Buffers' job."
 *
 * Dynamically shifts lower-priority tasks forward when a higher-priority task runs over,
 * inserts mandatory contextual recovery buffers, and respects DAG dependency barriers.
 */

import { Worker, Job } from 'bullmq';
import { RedisConnectionFactory } from '../adapters/UpstashRedisConnection.ts';
import { SCHEDULER_QUEUE_NAME, AutoRescheduleJobPayload } from '../queues/BullMQSchedulerQueue.ts';
import { ITaskRepository } from '../../../task/domain/repositories/ITaskRepository.ts';
import { ITaskDependencyRepository } from '../../../task/domain/repositories/ITaskDependencyRepository.ts';
import { DynamicBufferCalculator } from '../../domain/services/DynamicBufferCalculator.ts';
import { Task } from '../../../task/domain/entities/Task.ts';
import { TaskDependency } from '../../../task/domain/entities/TaskDependency.ts';

export interface AutoRescheduleResult {
  success: boolean;
  triggerTaskId: string;
  rescheduledCount: number;
  totalBufferMinutesAdded: number;
  rescheduledTasks: Array<{
    id: string;
    title: string;
    previousStart?: string | null;
    newStart: string;
    newEnd: string;
    bufferMinutes: number;
    priority: string;
  }>;
  executionTimestamp: string;
}

export class AutoRescheduleWorker {
  private worker: Worker<AutoRescheduleJobPayload, AutoRescheduleResult> | null = null;

  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly dependencyRepo: ITaskDependencyRepository
  ) {
    this.initWorker();
  }

  private initWorker(): void {
    const redisConnection = RedisConnectionFactory.getClient();
    if (!redisConnection) {
      // Direct in-memory processor mode when external Redis is unconfigured
      return;
    }

    try {
      this.worker = new Worker<AutoRescheduleJobPayload, AutoRescheduleResult>(
        SCHEDULER_QUEUE_NAME,
        async (job: Job<AutoRescheduleJobPayload>) => {
          return await this.processJob(job);
        },
        {
          connection: redisConnection,
          concurrency: 5, // Process up to 5 concurrent user rescheduling requests
        }
      );

      this.worker.on('error', (err) => {
        console.warn('[AutoRescheduleWorker] Worker connection notice (in-memory processor active):', err.message);
      });

      this.worker.on('completed', (job) => {
        console.log(`[AutoRescheduleWorker] Job ${job.id} completed successfully for user ${job.data.userId}`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`[AutoRescheduleWorker] Job ${job?.id} failed: ${err.message}`);
      });
    } catch (err: any) {
      console.warn('[AutoRescheduleWorker] Background worker initialization notice:', err.message);
    }
  }

  /**
   * The Core Processor Logic
   */
  public async processJob(job: Job<AutoRescheduleJobPayload>): Promise<AutoRescheduleResult> {
    const payload = job.data;
    await job.updateProgress(10);

    const {
      userId,
      triggerTaskId,
      overrunMinutes,
      actualEndOrOverrunTime,
      mandatoryBufferMinutes,
    } = payload;

    // 1. Fetch trigger task
    const triggerTask = await this.taskRepo.findById(triggerTaskId);
    if (!triggerTask) {
      throw new Error(`Trigger task ${triggerTaskId} not found.`);
    }

    // 2. Fetch all active tasks for this user
    const userTasks = await this.taskRepo.findByUserId({
      userId,
      status: 'TODO',
    });

    const inProgressTasks = await this.taskRepo.findByUserId({
      userId,
      status: 'IN_PROGRESS',
    });

    const activeTasks = [...userTasks, ...inProgressTasks].filter((t) => t.id !== triggerTaskId);

    // 3. Filter for tasks scheduled after trigger task start
    const overrunTime = new Date(actualEndOrOverrunTime);
    const affectedTasks = activeTasks.filter((t) => {
      if (!t.scheduledStart) return false;
      return new Date(t.scheduledStart).getTime() >= (triggerTask.scheduledStart?.getTime() ?? 0);
    });

    // 4. Fetch dependency graph edges to enforce topological sequence
    const dependencies = await this.dependencyRepo.findAllByUserId(userId);

    await job.updateProgress(35);

    // 5. Dynamic Buffer & Timeline Shift Algorithm
    // Current rolling pointer starts at the trigger task's actual completion/overrun time + initial buffer
    const initialBuffer = DynamicBufferCalculator.calculateBufferMinutes({
      currentPriority: triggerTask.priority,
      currentEnergy: triggerTask.energyLevel,
      baseBufferMinutes: mandatoryBufferMinutes,
      isOverrunRecovery: true,
    });

    let rollingPointer = new Date(overrunTime.getTime() + initialBuffer * 60 * 1000);
    let totalBufferAdded = initialBuffer;

    const rescheduledResults: AutoRescheduleResult['rescheduledTasks'] = [];
    const tasksToSave: Task[] = [];

    // Sort affected tasks:
    // First by priority rank, but ensure DAG predecessors always precede their successors
    const priorityWeights: Record<string, number> = {
      URGENT_P0: 4,
      HIGH_P1: 3,
      MEDIUM_P2: 2,
      LOW_P3: 1,
    };

    const sortedTasks = [...affectedTasks].sort((a, b) => {
      // Check if a is a prerequisite of b
      const aIsPrereqOfB = dependencies.some((d: TaskDependency) => d.predecessorId === a.id && d.successorId === b.id);
      if (aIsPrereqOfB) return -1;
      const bIsPrereqOfA = dependencies.some((d: TaskDependency) => d.predecessorId === b.id && d.successorId === a.id);
      if (bIsPrereqOfA) return 1;

      // Otherwise sort by priority descending
      const pDiff = (priorityWeights[b.priority] || 1) - (priorityWeights[a.priority] || 1);
      if (pDiff !== 0) return pDiff;

      // Then by original scheduled start
      const aStart = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
      const bStart = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
      return aStart - bStart;
    });

    // 6. Allocate slots with dynamic buffers
    const taskEndTimes = new Map<string, Date>();
    taskEndTimes.set(triggerTaskId, overrunTime);

    for (let i = 0; i < sortedTasks.length; i++) {
      const current = sortedTasks[i];
      const nextTask = sortedTasks[i + 1];

      // Prerequisite check: Task cannot start until all its predecessors finish
      const prereqEdges = dependencies.filter((d: TaskDependency) => d.successorId === current.id);
      let earliestAllowedStart = rollingPointer;

      for (const edge of prereqEdges) {
        const prereqEnd = taskEndTimes.get(edge.predecessorId);
        if (prereqEnd && prereqEnd.getTime() > earliestAllowedStart.getTime()) {
          earliestAllowedStart = new Date(prereqEnd.getTime() + 10 * 60 * 1000); // 10 min prereq handover buffer
        }
      }

      const assignedStart = earliestAllowedStart;
      const durationMinutes = current.estimatedMinutes > 0 ? current.estimatedMinutes : 30;

      // Calculate contextual buffer for next task
      const dynamicBuffer = DynamicBufferCalculator.calculateBufferMinutes({
        currentPriority: current.priority,
        nextPriority: nextTask?.priority,
        currentEnergy: current.energyLevel,
        nextEnergy: nextTask?.energyLevel,
        baseBufferMinutes: current.bufferMinutes,
      });

      const slot = DynamicBufferCalculator.adjustSlot(assignedStart, durationMinutes, dynamicBuffer);

      const oldStart = current.scheduledStart ? new Date(current.scheduledStart).toISOString() : null;

      // Mutate domain entity
      current.reschedule(slot.scheduledStart, slot.scheduledEnd, dynamicBuffer);
      current.incrementVersion(); // Optimistic locking bump

      taskEndTimes.set(current.id, slot.scheduledEnd);
      rollingPointer = slot.bufferEnd;
      totalBufferAdded += dynamicBuffer;

      tasksToSave.push(current);

      rescheduledResults.push({
        id: current.id,
        title: current.title,
        previousStart: oldStart,
        newStart: slot.scheduledStart.toISOString(),
        newEnd: slot.scheduledEnd.toISOString(),
        bufferMinutes: dynamicBuffer,
        priority: current.priority,
      });
    }

    // Save all rescheduled tasks
    if (tasksToSave.length > 0) {
      await this.taskRepo.saveMany(tasksToSave);
    }

    await job.updateProgress(100);

    return {
      success: true,
      triggerTaskId,
      rescheduledCount: rescheduledResults.length,
      totalBufferMinutesAdded: totalBufferAdded,
      rescheduledTasks: rescheduledResults,
      executionTimestamp: new Date().toISOString(),
    };
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
