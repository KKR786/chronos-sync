/**
 * @license Apache-2.0
 * Chronos Modular Monolith Server
 * Clean Architecture Express.js + Vite Middleware Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Domain & Application Modules
import { InMemoryTaskRepository } from './src/modules/task/infrastructure/repositories/InMemoryTaskRepository.ts';
import { InMemoryDependencyRepository } from './src/modules/task/infrastructure/repositories/InMemoryDependencyRepository.ts';
import { ValidateTaskDAGUseCase } from './src/modules/task/application/use-cases/ValidateTaskDAGUseCase.ts';
import { GetMultiViewTasksUseCase } from './src/modules/task/application/use-cases/GetMultiViewTasksUseCase.ts';
import { BatchOfflineSyncUseCase } from './src/modules/task/application/use-cases/BatchOfflineSyncUseCase.ts';
import { Task } from './src/modules/task/domain/entities/Task.ts';

// Scheduler & AI Modules
import { AutoRescheduleWorker } from './src/modules/scheduler/infrastructure/workers/AutoRescheduleWorker.ts';
import { SchedulerQueueProducer } from './src/modules/scheduler/infrastructure/queues/BullMQSchedulerQueue.ts';
import { NaturalLanguageTaskParser } from './src/modules/scheduler/infrastructure/adapters/NaturalLanguageTaskParser.ts';
import { PredictiveDurationAuditor } from './src/modules/scheduler/domain/services/PredictiveDurationAuditor.ts';
import { FlexibleRecurringEngine } from './src/modules/scheduler/domain/services/FlexibleRecurringEngine.ts';
import { ExternalCalendarSyncGateway } from './src/modules/scheduler/infrastructure/adapters/ExternalCalendarSyncGateway.ts';

// Validation Schemas
import {
  RegisterUserSchema,
  LoginUserSchema,
  SupabaseTokenVerifySchema,
} from './src/modules/auth/presentation/validators/auth.validator.ts';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  QuickCaptureSchema,
  UpdateTaskStatusSchema,
  CreateDependencyEdgeSchema,
  RemoveDependencyEdgeSchema,
  OfflineBatchSyncSchema,
} from './src/modules/task/presentation/validators/task.validator.ts';
import {
  AutoRescheduleTriggerSchema,
  NaturalLanguageParseSchema,
  CreateRecurringRuleSchema,
} from './src/modules/scheduler/presentation/validators/scheduler.validator.ts';
import {
  StartPomodoroSchema,
  LogPomodoroEventSchema,
  TimeAuditLogSchema,
} from './src/modules/focus/presentation/validators/focus.validator.ts';

// Seed & Architectural Blueprint
import { SEED_TASKS, SEED_DEPENDENCIES, INITIAL_USER_ID } from './src/server/seedData.ts';
import { ARCHITECTURAL_DIRECTORY_LAYOUT } from './src/modules/shared/domain/ArchitecturalManifest.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrapServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json());

  // --------------------------------------------------------------------------
  // Dependency Injection Composition Root
  // --------------------------------------------------------------------------
  const taskRepo = new InMemoryTaskRepository(SEED_TASKS);
  const dependencyRepo = new InMemoryDependencyRepository(SEED_DEPENDENCIES);
  const validateDAGUseCase = new ValidateTaskDAGUseCase(taskRepo, dependencyRepo);
  const multiViewUseCase = new GetMultiViewTasksUseCase(taskRepo, dependencyRepo);
  const batchOfflineSyncUseCase = new BatchOfflineSyncUseCase(taskRepo);
  const queueProducer = new SchedulerQueueProducer();
  const autoRescheduleWorker = new AutoRescheduleWorker(taskRepo, dependencyRepo);

  // In-memory Users Store
  const users = new Map<string, any>([
    [
      'romman.abit@gmail.com',
      {
        id: INITIAL_USER_ID,
        email: 'romman.abit@gmail.com',
        fullName: 'Romman Abit (Principal Architect)',
        timezone: 'America/New_York',
        role: 'LEAD_ENGINEER',
        bufferPreferenceInt: 15,
        token: 'jwt_mock_arch_token_001',
      },
    ],
  ]);

  // Pomodoro & Focus Store
  const pomodoroSessions = new Map<string, any>();
  const timeAuditLogs: any[] = [];
  const recurringRules: any[] = [];

  // --------------------------------------------------------------------------
  // Auth Middleware
  // --------------------------------------------------------------------------
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Default to demo user if no header, for convenient exploratory API calls
      (req as any).user = { id: INITIAL_USER_ID, email: 'romman.abit@gmail.com' };
      return next();
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    for (const u of users.values()) {
      if (u.token === token) {
        (req as any).user = u;
        return next();
      }
    }
    // Fallback user context
    (req as any).user = { id: INITIAL_USER_ID, email: 'romman.abit@gmail.com' };
    next();
  };

  // --------------------------------------------------------------------------
  // Authentication Routes
  // --------------------------------------------------------------------------
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const parsed = RegisterUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }
    const { email, fullName, timezone, bufferPreferenceInt } = parsed.data;
    if (users.has(email)) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      email,
      fullName,
      timezone,
      bufferPreferenceInt,
      token: `jwt_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    users.set(email, newUser);

    return res.status(201).json({
      message: 'User registered successfully under Clean Architecture Auth Module.',
      user: newUser,
      token: newUser.token,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const parsed = LoginUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }
    const { email } = parsed.data;
    let user = users.get(email);

    if (!user) {
      // Auto-provision demo account if email doesn't exist yet for smooth testing
      user = {
        id: `usr_${Date.now()}`,
        email,
        fullName: email.split('@')[0].toUpperCase(),
        timezone: 'UTC',
        bufferPreferenceInt: 15,
        token: `jwt_${crypto.randomUUID()}`,
      };
      users.set(email, user);
    }

    return res.json({
      message: 'Authenticated successfully.',
      user,
      token: user.token,
    });
  });

  app.post('/api/auth/supabase-verify', (req: Request, res: Response) => {
    const parsed = SupabaseTokenVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }
    const { supabaseToken, email, fullName } = parsed.data;

    // Simulate Supabase JWT verification hook
    const resolvedEmail = email || 'supabase.operator@chronos.io';
    let user = users.get(resolvedEmail);
    if (!user) {
      user = {
        id: `usr_supa_${Date.now()}`,
        email: resolvedEmail,
        fullName: fullName || 'Supabase Authenticated Engineer',
        supabaseUid: `sub_${supabaseToken.slice(0, 16)}`,
        timezone: 'UTC',
        bufferPreferenceInt: 15,
        token: `jwt_${crypto.randomUUID()}`,
      };
      users.set(resolvedEmail, user);
    }

    return res.json({
      verified: true,
      provider: 'Supabase JWT Hook',
      user,
      token: user.token,
    });
  });

  app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
    return res.json({ user: (req as any).user });
  });

  // --------------------------------------------------------------------------
  // Task Module Endpoints (CRUD, DAG, Quick Capture, Views, Offline Sync)
  // --------------------------------------------------------------------------
  app.get('/api/tasks/views/multi', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const views = await multiViewUseCase.execute({ userId });
    return res.json(views);
  });

  app.get('/api/tasks', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { status, priority, energyLevel } = req.query;
    const tasks = await taskRepo.findByUserId({
      userId,
      status: status as any,
      priority: priority as any,
      energyLevel: energyLevel as any,
    });
    return res.json(tasks.map((t) => t.toJSON()));
  });

  app.post('/api/tasks', authenticate, async (req: Request, res: Response) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const data = parsed.data;

    const task = Task.create({
      id: crypto.randomUUID(),
      userId,
      title: data.title,
      description: data.description,
      status: 'TODO',
      priority: data.priority,
      energyLevel: data.energyLevel,
      requiredTools: data.requiredTools,
      scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
      scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
      estimatedMinutes: data.estimatedMinutes,
      bufferMinutes: data.bufferMinutes,
      deadline: data.deadline ? new Date(data.deadline) : null,
    });

    await taskRepo.save(task);

    // If prerequisiteTaskIds provided, link them with DAG validation
    if (data.prerequisiteTaskIds && data.prerequisiteTaskIds.length > 0) {
      for (const prereqId of data.prerequisiteTaskIds) {
        await validateDAGUseCase.execute({
          userId,
          predecessorId: prereqId,
          successorId: task.id,
        });
      }
    }

    return res.status(201).json({
      message: 'Task created.',
      task: task.toJSON(),
    });
  });

  // Omnipresent Quick Capture Endpoint (Lightweight, < 2 sec response target)
  app.post('/api/tasks/quick-capture', authenticate, async (req: Request, res: Response) => {
    const startMs = Date.now();
    const parsed = QuickCaptureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const { rawText, defaultPriority, defaultEnergy, timezoneOffset, clientNow } = parsed.data;

    // Use fast NLP parsing with user timezone offset awareness
    const nlp = NaturalLanguageTaskParser.parse(rawText, 'UTC', timezoneOffset, clientNow);

    const task = Task.create({
      id: crypto.randomUUID(),
      userId,
      title: nlp.extractedTitle,
      description: `Quick captured via Omnipresent bar: "${rawText}"`,
      status: 'TODO',
      priority: defaultPriority || nlp.priority,
      energyLevel: defaultEnergy || nlp.energyLevel,
      requiredTools: nlp.requiredTools,
      scheduledStart: nlp.scheduledStart,
      scheduledEnd: nlp.scheduledEnd,
      estimatedMinutes: nlp.estimatedMinutes,
      bufferMinutes: 15,
    });

    await taskRepo.save(task);

    const latencyMs = Date.now() - startMs;
    return res.status(201).json({
      message: 'Quick capture processed.',
      latencyMs,
      task: task.toJSON(),
      nlpMetadata: {
        confidence: nlp.confidenceScore,
        rawText,
      },
    });
  });

  // Task Status Update with DAG Dependent Unblocking
  app.patch('/api/tasks/:id/status', authenticate, async (req: Request, res: Response) => {
    const parsed = UpdateTaskStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const taskId = req.params.id;
    const task = await taskRepo.findById(taskId);

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    try {
      task.updateStatus(parsed.data.status);
      if (parsed.data.actualMinutes) {
        task.logWorkTime(parsed.data.actualMinutes);
      }
      await taskRepo.save(task);

      // If completed, trigger DAG cascade check to unblock waiting dependents!
      let unblockedTasks: Task[] = [];
      if (parsed.data.status === 'COMPLETED') {
        unblockedTasks = await validateDAGUseCase.evaluateDependentsOnCompletion(taskId, userId);
      }

      return res.json({
        message: 'Status updated.',
        task: task.toJSON(),
        unblockedDependentTasks: unblockedTasks.map((t) => t.toJSON()),
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  // Full Task Update (Title, description, priority, energy, schedule, duration, tools, prerequisites)
  app.put('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const taskId = req.params.id;
    const task = await taskRepo.findById(taskId);

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    const data = parsed.data;

    try {
      task.updateDetails({
        title: data.title,
        description: data.description ?? undefined,
        priority: data.priority,
        energyLevel: data.energyLevel,
        requiredTools: data.requiredTools,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : data.scheduledStart === null ? null : undefined,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : data.scheduledEnd === null ? null : undefined,
        estimatedMinutes: data.estimatedMinutes,
        bufferMinutes: data.bufferMinutes,
        deadline: data.deadline ? new Date(data.deadline) : data.deadline === null ? null : undefined,
      });

      // If prerequisiteTaskIds provided, update DAG prerequisite links
      if (data.prerequisiteTaskIds !== undefined) {
        // Remove existing prerequisites
        const existingPrereqs = await dependencyRepo.findDirectPrerequisites(taskId);
        for (const edge of existingPrereqs) {
          if (!data.prerequisiteTaskIds.includes(edge.predecessorId)) {
            await dependencyRepo.removeEdge(edge.predecessorId, taskId);
          }
        }

        // Add new prerequisites with DAG cycle validation
        for (const prereqId of data.prerequisiteTaskIds) {
          const alreadyLinked = existingPrereqs.some((e) => e.predecessorId === prereqId);
          if (!alreadyLinked) {
            const linkRes = await validateDAGUseCase.execute({
              userId,
              predecessorId: prereqId,
              successorId: taskId,
            });
            if (linkRes.isFailure) {
              return res.status(422).json({
                error: 'DAG Dependency Validation Failed',
                message: linkRes.getError().message,
              });
            }
          }
        }

        // Re-evaluate blocking state
        const updatedPrereqs = await dependencyRepo.findDirectPrerequisites(taskId);
        if (updatedPrereqs.length === 0) {
          task.unblock();
        } else {
          const prereqTasks = await taskRepo.findByIds(updatedPrereqs.map((e) => e.predecessorId));
          const hasIncomplete = prereqTasks.some((p) => p.status !== 'COMPLETED');
          if (hasIncomplete) {
            task.markBlocked('Blocked by incomplete prerequisite');
          } else {
            task.unblock();
          }
        }
      }

      await taskRepo.save(task);

      return res.json({
        message: 'Task updated successfully.',
        task: task.toJSON(),
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  // Delete Task Endpoint
  app.delete('/api/tasks/:id', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const taskId = req.params.id;
    const task = await taskRepo.findById(taskId);

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Clean up all dependency edges involving this task
    await dependencyRepo.deleteByTaskId(taskId);
    await taskRepo.delete(taskId);

    // Unblock any dependents whose remaining prerequisites are all done
    const remainingTasks = await taskRepo.findByUserId({ userId });
    for (const t of remainingTasks) {
      if (t.isBlocked) {
        const prereqs = await dependencyRepo.findDirectPrerequisites(t.id);
        if (prereqs.length === 0) {
          t.unblock();
          await taskRepo.save(t);
        } else {
          const prereqTasks = await taskRepo.findByIds(prereqs.map((p) => p.predecessorId));
          if (!prereqTasks.some((p) => p.status !== 'COMPLETED')) {
            t.unblock();
            await taskRepo.save(t);
          }
        }
      }
    }

    return res.json({
      message: 'Task deleted successfully.',
      deletedTaskId: taskId,
    });
  });

  // DAG Dependency Edge Addition with Cycle Detection Check
  app.post('/api/tasks/dependencies', authenticate, async (req: Request, res: Response) => {
    const parsed = CreateDependencyEdgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const result = await validateDAGUseCase.execute({
      userId,
      predecessorId: parsed.data.predecessorId,
      successorId: parsed.data.successorId,
    });

    if (result.isFailure) {
      return res.status(422).json({
        error: 'DAG Dependency Validation Failed',
        message: result.getError().message,
      });
    }

    return res.status(201).json(result.getValue());
  });

  app.delete('/api/tasks/dependencies', authenticate, async (req: Request, res: Response) => {
    const parsed = RemoveDependencyEdgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const { predecessorId, successorId } = parsed.data;
    const removed = await dependencyRepo.removeEdge(predecessorId, successorId);

    // Recheck successor blocking state
    const successor = await taskRepo.findById(successorId);
    if (successor) {
      const remainingPrereqs = await dependencyRepo.findDirectPrerequisites(successorId);
      if (remainingPrereqs.length === 0 && successor.isBlocked) {
        successor.unblock();
        await taskRepo.save(successor);
      }
    }

    return res.json({ removed, predecessorId, successorId });
  });

  // Offline-First Batch Sync Endpoint with Optimistic Concurrency & LWW
  app.post('/api/tasks/offline-batch-sync', authenticate, async (req: Request, res: Response) => {
    const parsed = OfflineBatchSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const result = await batchOfflineSyncUseCase.execute(userId, parsed.data);

    if (result.isFailure) {
      return res.status(500).json({ error: result.getError().message });
    }

    return res.json(result.getValue());
  });

  // --------------------------------------------------------------------------
  // Intelligent Scheduler Endpoints (Auto-Rescheduling, BullMQ, NLP, Cron)
  // --------------------------------------------------------------------------
  app.post('/api/scheduler/auto-reschedule', authenticate, async (req: Request, res: Response) => {
    const parsed = AutoRescheduleTriggerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const userId = (req as any).user.id;
    const payload = {
      ...parsed.data,
      userId,
      timelineDate: parsed.data.timelineDate || new Date().toISOString(),
    };

    // Dispatch job to BullMQ queue
    const { jobId } = await queueProducer.dispatchAutoRescheduleJob(payload);

    // Process job with concurrency worker
    const jobResult = await autoRescheduleWorker.processJob({
      id: jobId,
      data: payload,
      updateProgress: async () => {},
    } as any);

    return res.json({
      jobId,
      queue: 'chronos-scheduler-queue',
      result: jobResult,
    });
  });

  app.post('/api/scheduler/parse-nlp', authenticate, (req: Request, res: Response) => {
    const parsed = NaturalLanguageParseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const parsedResult = NaturalLanguageTaskParser.parse(
      parsed.data.query,
      parsed.data.timezone,
      parsed.data.timezoneOffset,
      parsed.data.clientNow
    );
    return res.json(parsedResult);
  });

  app.get('/api/scheduler/predictive-audit', authenticate, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const tasks = await taskRepo.findByUserId({ userId });

    const taskAudits = tasks.map((t) => {
      const audit = PredictiveDurationAuditor.auditTask(t.title, t.estimatedMinutes, userId);
      return {
        taskId: t.id,
        title: t.title,
        estimatedMinutes: t.estimatedMinutes,
        audit,
      };
    });

    return res.json({
      audits: taskAudits,
      historicalMetrics: PredictiveDurationAuditor.getMetrics(),
    });
  });

  app.post('/api/scheduler/recurring-rules', authenticate, (req: Request, res: Response) => {
    const parsed = CreateRecurringRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const pattern = parsed.data.complexPattern || parsed.data.cronExpression || 'BUSINESS_DAYS:10';
    const nextOccurrence = FlexibleRecurringEngine.computeNextOccurrence(pattern);

    const ruleRecord = {
      id: crypto.randomUUID(),
      userId: (req as any).user.id,
      ...parsed.data,
      pattern,
      nextOccurrence,
      createdAt: new Date().toISOString(),
    };
    recurringRules.push(ruleRecord);

    return res.status(201).json(ruleRecord);
  });

  app.get('/api/scheduler/calendar-sync', authenticate, async (_req: Request, res: Response) => {
    const events = await ExternalCalendarSyncGateway.pullExternalEvents();
    return res.json({ events });
  });

  // --------------------------------------------------------------------------
  // Focus Module Endpoints (Pomodoro Chamber & Time Audit Stopwatch)
  // --------------------------------------------------------------------------
  app.post('/api/focus/pomodoro/start', authenticate, (req: Request, res: Response) => {
    const parsed = StartPomodoroSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const session = {
      id: crypto.randomUUID(),
      userId: (req as any).user.id,
      taskId: parsed.data.taskId,
      phase: parsed.data.phase,
      targetDurationMin: parsed.data.targetDurationMin,
      elapsedSeconds: 0,
      completed: false,
      interruptionsCount: 0,
      startedAt: new Date().toISOString(),
    };
    pomodoroSessions.set(session.id, session);

    return res.status(201).json(session);
  });

  app.post('/api/focus/pomodoro/log-event', authenticate, (req: Request, res: Response) => {
    const parsed = LogPomodoroEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const session = pomodoroSessions.get(parsed.data.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Pomodoro session not found.' });
    }

    session.elapsedSeconds = parsed.data.elapsedSeconds;
    if (parsed.data.event === 'INTERRUPTION') {
      session.interruptionsCount += 1;
    } else if (parsed.data.event === 'COMPLETED') {
      session.completed = true;
      session.endedAt = new Date().toISOString();
    }

    return res.json(session);
  });

  app.post('/api/focus/time-audit', authenticate, async (req: Request, res: Response) => {
    const parsed = TimeAuditLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.issues });
    }

    const logEntry = {
      id: crypto.randomUUID(),
      userId: (req as any).user.id,
      ...parsed.data,
      loggedAt: new Date().toISOString(),
    };
    timeAuditLogs.push(logEntry);

    // Update actual minutes on the task
    const task = await taskRepo.findById(parsed.data.taskId);
    if (task) {
      const minutesSpent = Math.round(parsed.data.durationSeconds / 60);
      task.logWorkTime(minutesSpent);
      await taskRepo.save(task);

      // Record in predictive auditor
      PredictiveDurationAuditor.recordMetric({
        userId: (req as any).user.id,
        category: 'ARCHITECTURE',
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes,
      });
    }

    return res.status(201).json(logEntry);
  });

  // --------------------------------------------------------------------------
  // Architectural Blueprint Inspection Endpoint
  // --------------------------------------------------------------------------
  app.get('/api/architecture/overview', (_req: Request, res: Response) => {
    return res.json({
      architecture: 'Clean Architecture / Decoupled Modular Monolith',
      framework: 'Express.js + TypeScript + Prisma ORM + BullMQ',
      directoryLayout: ARCHITECTURAL_DIRECTORY_LAYOUT,
      corePrinciples: [
        'Single Responsibility: Isolated Domain Modules (Auth, Task, Scheduler, Focus)',
        'Dependency Inversion: High-level business use cases depend on abstract ports (ITaskRepository, ITaskDependencyRepository)',
        'Directed Acyclic Graph (DAG): Kahn Algorithm & DFS 3-color cycle detection to prevent scheduling deadlocks',
        'Intelligent Auto-Rescheduling: BullMQ worker with Upstash Redis dynamic buffer calculation',
        'Optimistic Concurrency: Version-based locking with LWW conflict resolution for offline-first sync',
      ],
    });
  });

  // --------------------------------------------------------------------------
  // Frontend Integration (Vite Middleware in Dev / Static in Prod)
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Chronos Server] Clean Architecture Modular Monolith running on port ${PORT}`);
  });
}

bootstrapServer().catch((err) => {
  console.error('[Chronos Server Fatal Error]:', err);
});
