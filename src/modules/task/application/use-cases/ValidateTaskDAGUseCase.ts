/**
 * @license Apache-2.0
 * Use Case: ValidateTaskDAGUseCase
 * Validates dependency chains via Directed Acyclic Graph (DAG) cycle detection algorithms,
 * prevents circular deadlocks, and evaluates/updates blocking state.
 *
 * Implements: Clean Architecture Use Case / Business Logic
 */

import { Result } from '../../../shared/domain/Result.ts';
import { Task } from '../../domain/entities/Task.ts';
import { TaskDependency } from '../../domain/entities/TaskDependency.ts';
import { ITaskRepository } from '../../domain/repositories/ITaskRepository.ts';
import { ITaskDependencyRepository } from '../../domain/repositories/ITaskDependencyRepository.ts';

export interface ValidateAndAddDependencyDTO {
  userId: string;
  predecessorId: string; // The prerequisite task that MUST finish first
  successorId: string;   // The task that depends on predecessor
}

export interface DAGValidationResultDTO {
  isValid: boolean;
  cycleDetected: boolean;
  cyclePath?: string[];
  topologicalOrder: string[]; // Task IDs in executable order
  predecessorTask: {
    id: string;
    title: string;
    status: string;
  };
  successorTask: {
    id: string;
    title: string;
    isBlocked: boolean;
    blockedReason?: string | null;
  };
  totalDependenciesCount: number;
}

export class ValidateTaskDAGUseCase {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly dependencyRepo: ITaskDependencyRepository
  ) {}

  public async execute(
    dto: ValidateAndAddDependencyDTO
  ): Promise<Result<DAGValidationResultDTO, Error>> {
    try {
      const { userId, predecessorId, successorId } = dto;

      // 1. Basic self-loop prevention
      if (predecessorId === successorId) {
        return Result.fail(
          new Error('Invalid dependency: A task cannot depend on itself (immediate circular reference).')
        );
      }

      // 2. Verify existence and ownership
      const [predecessor, successor] = await Promise.all([
        this.taskRepo.findById(predecessorId),
        this.taskRepo.findById(successorId),
      ]);

      if (!predecessor || predecessor.userId !== userId) {
        return Result.fail(new Error(`Predecessor task ${predecessorId} not found or unauthorized.`));
      }
      if (!successor || successor.userId !== userId) {
        return Result.fail(new Error(`Successor task ${successorId} not found or unauthorized.`));
      }

      // 3. Load all existing dependency edges for this user to construct the graph
      const existingEdges = await this.dependencyRepo.findAllByUserId(userId);

      // Check if exact edge already exists
      const duplicateEdge = existingEdges.find(
        (e) => e.predecessorId === predecessorId && e.successorId === successorId
      );
      if (duplicateEdge) {
        return Result.fail(new Error('This dependency relationship already exists in the graph.'));
      }

      // 4. Construct adjacency list including the proposed candidate edge
      // Graph representation: Adjacency list mapping node -> list of outgoing nodes (predecessors -> successors)
      const adjacencyList = new Map<string, string[]>();
      const allNodeIds = new Set<string>();

      // Add all existing edges
      for (const edge of existingEdges) {
        allNodeIds.add(edge.predecessorId);
        allNodeIds.add(edge.successorId);
        const list = adjacencyList.get(edge.predecessorId) ?? [];
        list.push(edge.successorId);
        adjacencyList.set(edge.predecessorId, list);
      }

      // Add candidate edge: predecessor -> successor
      allNodeIds.add(predecessorId);
      allNodeIds.add(successorId);
      const candidateList = adjacencyList.get(predecessorId) ?? [];
      candidateList.push(successorId);
      adjacencyList.set(predecessorId, candidateList);

      // 5. Execute Cycle Detection (Kahn's Algorithm & DFS with cycle path extraction)
      const cycleCheck = this.detectCycleAndExtractPath(adjacencyList, allNodeIds, predecessorId);
      if (cycleCheck.hasCycle) {
        return Result.fail(
          new Error(
            `Circular dependency detected! Adding edge [${predecessor.title}] -> [${successor.title}] creates a deadlock loop: ${cycleCheck.cyclePath?.join(' ➔ ')}`
          )
        );
      }

      // 6. Compute Topological Ordering (Kahn's Algorithm)
      const topologicalOrder = this.computeTopologicalSort(adjacencyList, allNodeIds);

      // 7. Persist the new validated edge
      const newDependency = TaskDependency.create(predecessorId, successorId);
      await this.dependencyRepo.createEdge(newDependency);

      // 8. Re-evaluate blocking condition for the successor task
      // If predecessor is not completed, successor MUST be marked as BLOCKED
      const isPredecessorComplete = predecessor.status === 'COMPLETED';
      if (!isPredecessorComplete) {
        successor.markBlocked(`Prerequisite "${predecessor.title}" must be completed first.`);
        await this.taskRepo.save(successor);
      }

      return Result.ok({
        isValid: true,
        cycleDetected: false,
        topologicalOrder,
        predecessorTask: {
          id: predecessor.id,
          title: predecessor.title,
          status: predecessor.status,
        },
        successorTask: {
          id: successor.id,
          title: successor.title,
          isBlocked: successor.isBlocked,
          blockedReason: successor.blockedReason,
        },
        totalDependenciesCount: existingEdges.length + 1,
      });
    } catch (err) {
      return Result.fail(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Evaluates if any task's blocking state should be lifted when a prerequisite completes
   */
  public async evaluateDependentsOnCompletion(
    completedTaskId: string,
    userId: string
  ): Promise<Task[]> {
    const directDependentEdges = await this.dependencyRepo.findDirectDependents(completedTaskId);
    const unblockedTasks: Task[] = [];

    for (const edge of directDependentEdges) {
      const dependent = await this.taskRepo.findById(edge.successorId);
      if (!dependent || dependent.userId !== userId) continue;

      // Check all prerequisite edges for this dependent
      const prereqEdges = await this.dependencyRepo.findDirectPrerequisites(dependent.id);
      const prereqTasks = await this.taskRepo.findByIds(prereqEdges.map((e) => e.predecessorId));

      const hasUnfinishedPrereqs = prereqTasks.some((p) => p.status !== 'COMPLETED');
      if (!hasUnfinishedPrereqs && dependent.isBlocked) {
        dependent.unblock();
        await this.taskRepo.save(dependent);
        unblockedTasks.push(dependent);
      }
    }

    return unblockedTasks;
  }

  /**
   * Cycle Detection using 3-color DFS traversal
   * White (0) = Unvisited, Gray (1) = Visiting in current recursion stack, Black (2) = Finished
   */
  private detectCycleAndExtractPath(
    adjacency: Map<string, string[]>,
    nodeIds: Set<string>,
    startNode: string
  ): { hasCycle: boolean; cyclePath?: string[] } {
    const state = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    const parent = new Map<string, string>();
    let cycleNodes: string[] = [];

    const dfs = (curr: string, path: string[]): boolean => {
      state.set(curr, 1);
      path.push(curr);

      const neighbors = adjacency.get(curr) ?? [];
      for (const next of neighbors) {
        if (state.get(next) === 1) {
          // Cycle detected!
          const cycleStartIdx = path.indexOf(next);
          cycleNodes = [...path.slice(cycleStartIdx), next];
          return true;
        }
        if (!state.has(next) || state.get(next) === 0) {
          parent.set(next, curr);
          if (dfs(next, path)) return true;
        }
      }

      path.pop();
      state.set(curr, 2);
      return false;
    };

    // Check starting from candidate startNode first, then all remaining
    if (dfs(startNode, [])) {
      return { hasCycle: true, cyclePath: cycleNodes };
    }

    for (const node of nodeIds) {
      if (!state.has(node) || state.get(node) === 0) {
        if (dfs(node, [])) {
          return { hasCycle: true, cyclePath: cycleNodes };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Computes a valid topological ordering using Kahn's algorithm
   */
  private computeTopologicalSort(
    adjacency: Map<string, string[]>,
    nodeIds: Set<string>
  ): string[] {
    const inDegree = new Map<string, number>();
    for (const node of nodeIds) {
      inDegree.set(node, 0);
    }

    for (const [, neighbors] of adjacency.entries()) {
      for (const dest of neighbors) {
        inDegree.set(dest, (inDegree.get(dest) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(node);
      }
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const neighbors = adjacency.get(u) ?? [];
      for (const v of neighbors) {
        const nextDeg = (inDegree.get(v) ?? 1) - 1;
        inDegree.set(v, nextDeg);
        if (nextDeg === 0) {
          queue.push(v);
        }
      }
    }

    return order;
  }
}
