/**
 * @license Apache-2.0
 * Port: Task Repository Interface
 */

import { Task, TaskStatus, EnergyLevel, Priority } from '../entities/Task.ts';

export interface TaskFilterOptions {
  userId: string;
  status?: TaskStatus;
  priority?: Priority;
  energyLevel?: EnergyLevel;
  requiredTool?: string;
  startDate?: Date;
  endDate?: Date;
  isBlocked?: boolean;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByIds(ids: string[]): Promise<Task[]>;
  findByUserId(options: TaskFilterOptions): Promise<Task[]>;
  save(task: Task): Promise<void>;
  saveMany(tasks: Task[]): Promise<void>;
  updateVersioned(task: Task, expectedVersion: number): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
