/**
 * @license Apache-2.0
 * Infrastructure: In-Memory / Prisma-Compatible Task Repository
 * Follows ITaskRepository interface. Supports optimistic locking and multi-dimensional filtering.
 */

import { Task, TaskProps, TaskStatus, Priority, EnergyLevel } from '../../domain/entities/Task.ts';
import { ITaskRepository, TaskFilterOptions } from '../../domain/repositories/ITaskRepository.ts';

export class InMemoryTaskRepository implements ITaskRepository {
  private tasks = new Map<string, TaskProps>();

  constructor(initialData?: TaskProps[]) {
    if (initialData) {
      for (const item of initialData) {
        this.tasks.set(item.id, { ...item });
      }
    }
  }

  public async findById(id: string): Promise<Task | null> {
    const data = this.tasks.get(id);
    if (!data) return null;
    return Task.reconstitute({ ...data });
  }

  public async findByIds(ids: string[]): Promise<Task[]> {
    const result: Task[] = [];
    for (const id of ids) {
      const data = this.tasks.get(id);
      if (data) {
        result.push(Task.reconstitute({ ...data }));
      }
    }
    return result;
  }

  public async findByUserId(options: TaskFilterOptions): Promise<Task[]> {
    const matches: Task[] = [];
    for (const data of this.tasks.values()) {
      if (data.userId !== options.userId) continue;
      if (options.status && data.status !== options.status) continue;
      if (options.priority && data.priority !== options.priority) continue;
      if (options.energyLevel && data.energyLevel !== options.energyLevel) continue;
      if (options.isBlocked !== undefined && data.isBlocked !== options.isBlocked) continue;
      if (options.requiredTool && !data.requiredTools.includes(options.requiredTool)) continue;

      if (options.startDate && data.scheduledStart) {
        if (new Date(data.scheduledStart).getTime() < options.startDate.getTime()) continue;
      }
      if (options.endDate && data.scheduledEnd) {
        if (new Date(data.scheduledEnd).getTime() > options.endDate.getTime()) continue;
      }

      matches.push(Task.reconstitute({ ...data }));
    }
    return matches;
  }

  public async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task.toJSON());
  }

  public async saveMany(tasks: Task[]): Promise<void> {
    for (const t of tasks) {
      this.tasks.set(t.id, t.toJSON());
    }
  }

  public async updateVersioned(task: Task, expectedVersion: number): Promise<boolean> {
    const existing = this.tasks.get(task.id);
    if (!existing) return false;

    // Concurrency conflict check
    if (existing.version !== expectedVersion) {
      return false; // Optimistic lock failed!
    }

    const updatedProps = task.toJSON();
    updatedProps.version = expectedVersion + 1;
    this.tasks.set(task.id, updatedProps);
    return true;
  }

  public async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Diagnostic helper
  public getAllRaw(): TaskProps[] {
    return Array.from(this.tasks.values());
  }
}
