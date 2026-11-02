/**
 * @license Apache-2.0
 * Infrastructure: In-Memory Task Dependency Repository
 */

import { TaskDependency, TaskDependencyProps } from '../../domain/entities/TaskDependency.ts';
import { ITaskDependencyRepository } from '../../domain/repositories/ITaskDependencyRepository.ts';

export class InMemoryDependencyRepository implements ITaskDependencyRepository {
  private edges = new Map<string, TaskDependencyProps>();

  constructor(initialEdges?: TaskDependencyProps[]) {
    if (initialEdges) {
      for (const edge of initialEdges) {
        this.edges.set(edge.id, { ...edge });
      }
    }
  }

  public async findAllByUserId(_userId: string): Promise<TaskDependency[]> {
    // In memory, return all registered edges
    return Array.from(this.edges.values()).map((p) => TaskDependency.reconstitute(p));
  }

  public async findDirectPrerequisites(taskId: string): Promise<TaskDependency[]> {
    const list: TaskDependency[] = [];
    for (const edge of this.edges.values()) {
      if (edge.successorId === taskId) {
        list.push(TaskDependency.reconstitute(edge));
      }
    }
    return list;
  }

  public async findDirectDependents(taskId: string): Promise<TaskDependency[]> {
    const list: TaskDependency[] = [];
    for (const edge of this.edges.values()) {
      if (edge.predecessorId === taskId) {
        list.push(TaskDependency.reconstitute(edge));
      }
    }
    return list;
  }

  public async createEdge(dependency: TaskDependency): Promise<void> {
    this.edges.set(dependency.id, dependency.toJSON());
  }

  public async removeEdge(predecessorId: string, successorId: string): Promise<boolean> {
    for (const [id, edge] of this.edges.entries()) {
      if (edge.predecessorId === predecessorId && edge.successorId === successorId) {
        return this.edges.delete(id);
      }
    }
    return false;
  }

  public async deleteByTaskId(taskId: string): Promise<void> {
    for (const [id, edge] of this.edges.entries()) {
      if (edge.predecessorId === taskId || edge.successorId === taskId) {
        this.edges.delete(id);
      }
    }
  }

  public getAllRaw(): TaskDependencyProps[] {
    return Array.from(this.edges.values());
  }
}
