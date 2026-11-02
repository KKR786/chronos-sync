/**
 * @license Apache-2.0
 * Domain Entity: TaskDependency
 * Represents a directed edge (predecessor -> successor) in the DAG.
 */

export interface TaskDependencyProps {
  id: string;
  predecessorId: string; // The prerequisite task that MUST finish first
  successorId: string;   // The task that is blocked until predecessor finishes
  createdAt: Date;
}

export class TaskDependency {
  private props: TaskDependencyProps;

  private constructor(props: TaskDependencyProps) {
    this.props = props;
  }

  public static create(predecessorId: string, successorId: string, id?: string): TaskDependency {
    if (!predecessorId || !successorId) {
      throw new Error('Predecessor and Successor task IDs are mandatory.');
    }
    if (predecessorId === successorId) {
      throw new Error('A task cannot depend on itself (immediate self-loop cycle).');
    }

    return new TaskDependency({
      id: id ?? crypto.randomUUID(),
      predecessorId,
      successorId,
      createdAt: new Date(),
    });
  }

  public static reconstitute(props: TaskDependencyProps): TaskDependency {
    return new TaskDependency(props);
  }

  public get id(): string { return this.props.id; }
  public get predecessorId(): string { return this.props.predecessorId; }
  public get successorId(): string { return this.props.successorId; }
  public get createdAt(): Date { return this.props.createdAt; }

  public toJSON(): TaskDependencyProps {
    return { ...this.props };
  }
}
