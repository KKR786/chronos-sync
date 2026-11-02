/**
 * @license Apache-2.0
 * Domain Entity: Task
 * Pure Domain Layer - zero framework or external database dependencies
 */

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'COMPLETED' | 'ARCHIVED';
export type Priority = 'URGENT_P0' | 'HIGH_P1' | 'MEDIUM_P2' | 'LOW_P3';
export type EnergyLevel = 'LOW_ENERGY' | 'MEDIUM_FOCUS' | 'HIGH_FOCUS' | 'DEEP_WORK';

export interface TaskProps {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  energyLevel: EnergyLevel;
  requiredTools: string[];
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimatedMinutes: number;
  actualMinutes: number;
  bufferMinutes: number;
  deadline?: Date | null;
  isBlocked: boolean;
  blockedReason?: string | null;
  recurringRuleId?: string | null;
  version: number;
  clientUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Task {
  private props: TaskProps;

  private constructor(props: TaskProps) {
    this.props = props;
  }

  public static create(
    props: Omit<TaskProps, 'version' | 'createdAt' | 'updatedAt' | 'actualMinutes' | 'isBlocked'> & {
      version?: number;
      createdAt?: Date;
      updatedAt?: Date;
      actualMinutes?: number;
      isBlocked?: boolean;
    }
  ): Task {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Task title cannot be empty.');
    }
    if (props.estimatedMinutes < 0) {
      throw new Error('Estimated minutes cannot be negative.');
    }

    const now = new Date();
    return new Task({
      ...props,
      version: props.version ?? 1,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
      actualMinutes: props.actualMinutes ?? 0,
      isBlocked: props.isBlocked ?? false,
      bufferMinutes: props.bufferMinutes ?? 15,
      requiredTools: props.requiredTools ?? [],
    });
  }

  public static reconstitute(props: TaskProps): Task {
    return new Task(props);
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get userId(): string { return this.props.userId; }
  public get title(): string { return this.props.title; }
  public get description(): string | undefined { return this.props.description; }
  public get status(): TaskStatus { return this.props.status; }
  public get priority(): Priority { return this.props.priority; }
  public get energyLevel(): EnergyLevel { return this.props.energyLevel; }
  public get requiredTools(): string[] { return [...this.props.requiredTools]; }
  public get scheduledStart(): Date | null | undefined { return this.props.scheduledStart; }
  public get scheduledEnd(): Date | null | undefined { return this.props.scheduledEnd; }
  public get estimatedMinutes(): number { return this.props.estimatedMinutes; }
  public get actualMinutes(): number { return this.props.actualMinutes; }
  public get bufferMinutes(): number { return this.props.bufferMinutes; }
  public get deadline(): Date | null | undefined { return this.props.deadline; }
  public get isBlocked(): boolean { return this.props.isBlocked; }
  public get blockedReason(): string | null | undefined { return this.props.blockedReason; }
  public get recurringRuleId(): string | null | undefined { return this.props.recurringRuleId; }
  public get version(): number { return this.props.version; }
  public get clientUpdatedAt(): Date | null | undefined { return this.props.clientUpdatedAt; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  // Domain Behaviors
  public markBlocked(reason: string): void {
    this.props.isBlocked = true;
    this.props.blockedReason = reason;
    if (this.props.status !== 'COMPLETED') {
      this.props.status = 'BLOCKED';
    }
    this.touch();
  }

  public unblock(): void {
    this.props.isBlocked = false;
    this.props.blockedReason = null;
    if (this.props.status === 'BLOCKED') {
      this.props.status = 'TODO';
    }
    this.touch();
  }

  public complete(): void {
    this.props.status = 'COMPLETED';
    this.props.isBlocked = false;
    this.props.blockedReason = null;
    this.touch();
  }

  public reschedule(start: Date, end: Date, bufferMinutes?: number): void {
    this.props.scheduledStart = start;
    this.props.scheduledEnd = end;
    if (bufferMinutes !== undefined) {
      this.props.bufferMinutes = bufferMinutes;
    }
    this.touch();
  }

  public logWorkTime(minutes: number): void {
    if (minutes > 0) {
      this.props.actualMinutes += minutes;
      this.touch();
    }
  }

  public updateStatus(status: TaskStatus): void {
    if (this.props.isBlocked && (status === 'IN_PROGRESS' || status === 'COMPLETED')) {
      throw new Error(`Cannot transition blocked task to ${status}. Resolve prerequisite dependencies first.`);
    }
    this.props.status = status;
    this.touch();
  }

  public updateDetails(updates: Partial<Omit<TaskProps, 'id' | 'userId' | 'createdAt' | 'version'>>): void {
    if (updates.title !== undefined) {
      if (!updates.title.trim()) throw new Error('Task title cannot be empty.');
      this.props.title = updates.title.trim();
    }
    if (updates.description !== undefined) this.props.description = updates.description ?? undefined;
    if (updates.priority !== undefined) this.props.priority = updates.priority;
    if (updates.energyLevel !== undefined) this.props.energyLevel = updates.energyLevel;
    if (updates.requiredTools !== undefined) this.props.requiredTools = updates.requiredTools;
    if (updates.scheduledStart !== undefined) this.props.scheduledStart = updates.scheduledStart;
    if (updates.scheduledEnd !== undefined) this.props.scheduledEnd = updates.scheduledEnd;
    if (updates.estimatedMinutes !== undefined) {
      if (updates.estimatedMinutes < 0) throw new Error('Estimated minutes cannot be negative.');
      this.props.estimatedMinutes = updates.estimatedMinutes;
    }
    if (updates.bufferMinutes !== undefined) this.props.bufferMinutes = updates.bufferMinutes;
    if (updates.deadline !== undefined) this.props.deadline = updates.deadline;
    if (updates.status !== undefined) {
      this.updateStatus(updates.status);
    }
    this.incrementVersion();
    this.touch();
  }

  public incrementVersion(): void {
    this.props.version += 1;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  public toJSON(): TaskProps {
    return { ...this.props };
  }
}
