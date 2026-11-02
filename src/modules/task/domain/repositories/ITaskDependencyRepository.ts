/**
 * @license Apache-2.0
 * Port: Task Dependency Repository Interface
 */

import { TaskDependency } from '../entities/TaskDependency.ts';

export interface ITaskDependencyRepository {
  findAllByUserId(userId: string): Promise<TaskDependency[]>;
  findDirectPrerequisites(taskId: string): Promise<TaskDependency[]>;
  findDirectDependents(taskId: string): Promise<TaskDependency[]>;
  createEdge(dependency: TaskDependency): Promise<void>;
  removeEdge(predecessorId: string, successorId: string): Promise<boolean>;
  deleteByTaskId(taskId: string): Promise<void>;
}
