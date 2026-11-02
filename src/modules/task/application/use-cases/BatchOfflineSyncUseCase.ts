/**
 * @license Apache-2.0
 * Use Case: BatchOfflineSyncUseCase
 * Handles offline-first batch synchronization with optimistic locking (versioning)
 * and timestamp-based conflict resolution.
 */

import { Result } from '../../../shared/domain/Result.ts';
import { Task } from '../../domain/entities/Task.ts';
import { ITaskRepository } from '../../domain/repositories/ITaskRepository.ts';
import { OfflineBatchSyncInput, OfflineSyncItemSchema } from '../../presentation/validators/task.validator.ts';
import { z } from 'zod';

export type OfflineTaskDTO = z.infer<typeof OfflineSyncItemSchema>;

export interface SyncResolutionItem {
  taskId: string;
  status: 'APPLIED' | 'CONFLICT_CLIENT_WON' | 'CONFLICT_SERVER_WON' | 'CREATED';
  currentVersion: number;
  serverTask: Task;
  conflictDetails?: string;
}

export interface BatchSyncReport {
  syncedCount: number;
  conflictsCount: number;
  appliedCount: number;
  resolutions: SyncResolutionItem[];
  serverTimestamp: string;
}

export class BatchOfflineSyncUseCase {
  constructor(private readonly taskRepo: ITaskRepository) {}

  public async execute(
    userId: string,
    batch: OfflineBatchSyncInput
  ): Promise<Result<BatchSyncReport, Error>> {
    try {
      const resolutions: SyncResolutionItem[] = [];
      let appliedCount = 0;
      let conflictsCount = 0;

      for (const item of batch.tasks) {
        const existing = await this.taskRepo.findById(item.id);

        if (!existing) {
          // New task created while offline
          const newTask = Task.create({
            id: item.id,
            userId,
            title: item.title,
            description: item.description ?? undefined,
            status: item.status,
            priority: item.priority,
            energyLevel: item.energyLevel,
            requiredTools: item.requiredTools,
            scheduledStart: item.scheduledStart ? new Date(item.scheduledStart) : null,
            scheduledEnd: item.scheduledEnd ? new Date(item.scheduledEnd) : null,
            estimatedMinutes: item.estimatedMinutes,
            actualMinutes: item.actualMinutes,
            bufferMinutes: item.bufferMinutes,
            version: 1,
            clientUpdatedAt: new Date(item.clientUpdatedAt),
          });

          await this.taskRepo.save(newTask);
          resolutions.push({
            taskId: item.id,
            status: 'CREATED',
            currentVersion: 1,
            serverTask: newTask,
          });
          appliedCount++;
          continue;
        }

        // Verify ownership
        if (existing.userId !== userId) {
          continue;
        }

        // Check optimistic lock version
        if (existing.version === item.version) {
          // Clean non-conflicting update
          const updated = Task.reconstitute({
            ...existing.toJSON(),
            title: item.title,
            description: item.description ?? existing.description,
            status: item.status,
            priority: item.priority,
            energyLevel: item.energyLevel,
            requiredTools: item.requiredTools,
            scheduledStart: item.scheduledStart ? new Date(item.scheduledStart) : null,
            scheduledEnd: item.scheduledEnd ? new Date(item.scheduledEnd) : null,
            estimatedMinutes: item.estimatedMinutes,
            actualMinutes: item.actualMinutes,
            bufferMinutes: item.bufferMinutes,
            version: existing.version + 1,
            clientUpdatedAt: new Date(item.clientUpdatedAt),
            updatedAt: new Date(),
          });

          await this.taskRepo.save(updated);
          resolutions.push({
            taskId: item.id,
            status: 'APPLIED',
            currentVersion: updated.version,
            serverTask: updated,
          });
          appliedCount++;
        } else {
          // Concurrency conflict: Server version differs from client base version
          conflictsCount++;
          const clientTime = new Date(item.clientUpdatedAt).getTime();
          const serverTime = existing.updatedAt.getTime();

          if (clientTime > serverTime) {
            // Client write is newer -> Client wins
            const clientWins = Task.reconstitute({
              ...existing.toJSON(),
              title: item.title,
              status: item.status,
              priority: item.priority,
              energyLevel: item.energyLevel,
              version: existing.version + 1,
              clientUpdatedAt: new Date(item.clientUpdatedAt),
              updatedAt: new Date(),
            });

            await this.taskRepo.save(clientWins);
            resolutions.push({
              taskId: item.id,
              status: 'CONFLICT_CLIENT_WON',
              currentVersion: clientWins.version,
              serverTask: clientWins,
              conflictDetails: `Client version ${item.version} was behind server ${existing.version}, but client timestamp was newer. Client updates applied.`,
            });
            appliedCount++;
          } else {
            // Server write is newer -> Server state wins
            resolutions.push({
              taskId: item.id,
              status: 'CONFLICT_SERVER_WON',
              currentVersion: existing.version,
              serverTask: existing,
              conflictDetails: `Server had a newer update at ${existing.updatedAt.toISOString()}. Server version preserved.`,
            });
          }
        }
      }

      return Result.ok({
        syncedCount: batch.tasks.length,
        conflictsCount,
        appliedCount,
        resolutions,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      return Result.fail(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
