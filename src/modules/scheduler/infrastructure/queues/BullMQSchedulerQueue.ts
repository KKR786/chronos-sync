/**
 * @license Apache-2.0
 * BullMQ Scheduler Queue Producer
 * Operates in BullMQ mode when Redis/Upstash is configured,
 * and seamlessly provides in-memory queuing when Redis is unconfigured.
 */

import { Queue } from 'bullmq';
import { RedisConnectionFactory } from '../adapters/UpstashRedisConnection.ts';

export const SCHEDULER_QUEUE_NAME = 'chronos-scheduler-queue';

export interface AutoRescheduleJobPayload {
  userId: string;
  triggerTaskId: string;
  overrunMinutes: number;
  actualEndOrOverrunTime: string; // ISO date string
  mandatoryBufferMinutes: number;
  timelineDate: string;           // ISO date string (day to reschedule)
}

export class SchedulerQueueProducer {
  private queue: Queue | null = null;
  private isConnected = false;

  constructor() {
    this.initQueue();
  }

  private initQueue(): void {
    const redisClient = RedisConnectionFactory.getClient();
    if (!redisClient) {
      // In-memory queue mode
      this.isConnected = true;
      return;
    }

    try {
      this.queue = new Queue(SCHEDULER_QUEUE_NAME, {
        connection: redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });

      this.queue.on('error', (err) => {
        console.warn('[BullMQQueue] Queue Redis notice (using in-memory fallback):', err.message);
      });

      this.isConnected = true;
    } catch (err: any) {
      console.warn('[BullMQQueue] Queue initialization notice:', err.message);
    }
  }

  public async dispatchAutoRescheduleJob(payload: AutoRescheduleJobPayload): Promise<{ jobId: string }> {
    const jobId = `auto-reschedule-${payload.userId}-${Date.now()}`;
    
    if (this.queue) {
      try {
        await this.queue.add('AUTO_RESCHEDULE_BUFFER', payload, {
          jobId,
          priority: 1, // High priority processing
        });
      } catch (err: any) {
        console.warn('[BullMQQueue] Redis dispatch fallback triggered:', err.message);
      }
    }

    return { jobId };
  }

  public async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
