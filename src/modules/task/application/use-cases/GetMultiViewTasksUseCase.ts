/**
 * @license Apache-2.0
 * Use Case: GetMultiViewTasksUseCase
 * Serves optimized projections for Kanban pipelines, Timeline/Gantt schedules,
 * and Time-Blocked calendar views.
 */

import { Task, TaskProps, TaskStatus } from '../../domain/entities/Task.ts';
import { ITaskRepository, TaskFilterOptions } from '../../domain/repositories/ITaskRepository.ts';
import { ITaskDependencyRepository } from '../../domain/repositories/ITaskDependencyRepository.ts';
import { TaskDependencyProps } from '../../domain/entities/TaskDependency.ts';

export interface MultiViewTasksDTO {
  kanban: {
    todo: TaskProps[];
    inProgress: TaskProps[];
    blocked: Array<TaskProps & { prerequisiteTitles: string[] }>;
    inReview: TaskProps[];
    completed: TaskProps[];
  };
  timeline: Array<
    TaskProps & {
      prerequisites: string[];
      dependents: string[];
      bufferBlockStart: string | null;
      bufferBlockEnd: string | null;
    }
  >;
  timeBlocked: Array<{
    date: string; // YYYY-MM-DD
    slots: Array<{
      hour: number;
      task?: TaskProps;
      isBufferZone?: boolean;
    }>;
  }>;
  dagMetrics: {
    totalNodes: number;
    totalEdges: number;
    blockedCount: number;
    edges: TaskDependencyProps[];
  };
}

export class GetMultiViewTasksUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly dependencyRepo: ITaskDependencyRepository
  ) {}

  public async execute(filter: TaskFilterOptions): Promise<MultiViewTasksDTO> {
    const tasks = await this.taskRepo.findByUserId(filter);
    const edges = await this.dependencyRepo.findAllByUserId(filter.userId);

    const taskMap = new Map<string, Task>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
    }

    // 1. Kanban Pipeline
    const todo: TaskProps[] = [];
    const inProgress: TaskProps[] = [];
    const blocked: Array<TaskProps & { prerequisiteTitles: string[] }> = [];
    const inReview: TaskProps[] = [];
    const completed: TaskProps[] = [];

    for (const task of tasks) {
      const json = task.toJSON();
      if (task.isBlocked || task.status === 'BLOCKED') {
        const prereqEdges = edges.filter((e) => e.successorId === task.id);
        const prereqTitles = prereqEdges
          .map((e) => taskMap.get(e.predecessorId)?.title)
          .filter(Boolean) as string[];

        blocked.push({
          ...json,
          prerequisiteTitles: prereqTitles.length > 0 ? prereqTitles : [task.blockedReason || 'Prerequisite unfulfilled'],
        });
      } else if (task.status === 'TODO') {
        todo.push(json);
      } else if (task.status === 'IN_PROGRESS') {
        inProgress.push(json);
      } else if (task.status === 'IN_REVIEW') {
        inReview.push(json);
      } else if (task.status === 'COMPLETED') {
        completed.push(json);
      }
    }

    // 2. Timeline / Gantt Projection
    const timeline = tasks
      .filter((t) => t.scheduledStart != null)
      .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime())
      .map((t) => {
        const json = t.toJSON();
        const prereqs = edges.filter((e) => e.successorId === t.id).map((e) => e.predecessorId);
        const dependents = edges.filter((e) => e.predecessorId === t.id).map((e) => e.successorId);

        let bufferBlockStart: string | null = null;
        let bufferBlockEnd: string | null = null;
        if (t.scheduledEnd && t.bufferMinutes > 0) {
          bufferBlockStart = new Date(t.scheduledEnd).toISOString();
          bufferBlockEnd = new Date(new Date(t.scheduledEnd).getTime() + t.bufferMinutes * 60 * 1000).toISOString();
        }

        return {
          ...json,
          prerequisites: prereqs,
          dependents,
          bufferBlockStart,
          bufferBlockEnd,
        };
      });

    // 3. Time-Blocked Projection
    const datesMap = new Map<string, Array<{ hour: number; task?: TaskProps; isBufferZone?: boolean }>>();
    for (const t of tasks) {
      if (!t.scheduledStart) continue;
      const start = new Date(t.scheduledStart);
      const dateKey = start.toISOString().split('T')[0];
      const hour = start.getHours();

      const existingSlots = datesMap.get(dateKey) ?? [];
      existingSlots.push({ hour, task: t.toJSON() });
      datesMap.set(dateKey, existingSlots);
    }

    const timeBlocked = Array.from(datesMap.entries()).map(([date, slots]) => ({
      date,
      slots: slots.sort((a, b) => a.hour - b.hour),
    }));

    return {
      kanban: {
        todo,
        inProgress,
        blocked,
        inReview,
        completed,
      },
      timeline,
      timeBlocked,
      dagMetrics: {
        totalNodes: tasks.length,
        totalEdges: edges.length,
        blockedCount: blocked.length,
        edges: edges.map((e) => e.toJSON()),
      },
    };
  }
}
