/**
 * @license Apache-2.0
 * System Blueprint: Definitive Clean Architecture & Modular Monolith Directory Structure
 */

export const ARCHITECTURAL_DIRECTORY_LAYOUT = `
chronos-task-engine/
├── prisma/
│   └── schema.prisma                 # Optimized schema with compound indexes & foreign keys
├── src/
│   ├── modules/
│   │   ├── auth/                     # Supabase & JWT Auth Domain
│   │   │   ├── domain/               # Pure Entities & Repository Interfaces
│   │   │   │   ├── entities/User.ts
│   │   │   │   └── repositories/IUserRepository.ts
│   │   │   ├── application/          # Use Cases & DTOs
│   │   │   │   ├── use-cases/RegisterUserUseCase.ts
│   │   │   │   ├── use-cases/LoginUserUseCase.ts
│   │   │   │   └── use-cases/VerifySupabaseTokenUseCase.ts
│   │   │   ├── infrastructure/       # External drivers & security
│   │   │   │   ├── repositories/PrismaUserRepository.ts
│   │   │   │   ├── adapters/SupabaseAuthAdapter.ts
│   │   │   │   └── security/JwtService.ts
│   │   │   └── presentation/         # HTTP Controllers & Zod Schemas
│   │   │       ├── controllers/AuthController.ts
│   │   │       ├── routes/auth.routes.ts
│   │   │       └── validators/auth.validator.ts
│   │   │
│   │   ├── task/                     # Task CRUD, DAG Dependencies & Multi-Views
│   │   │   ├── domain/
│   │   │   │   ├── entities/Task.ts
│   │   │   │   ├── entities/TaskDependency.ts
│   │   │   │   ├── repositories/ITaskRepository.ts
│   │   │   │   └── repositories/ITaskDependencyRepository.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/ValidateTaskDAGUseCase.ts    # Kahn's + DFS Cycle Prevention
│   │   │   │   ├── use-cases/BatchOfflineSyncUseCase.ts   # Optimistic Locking & LWW Sync
│   │   │   │   ├── use-cases/GetMultiViewTasksUseCase.ts  # Kanban, Gantt & Grid projections
│   │   │   │   └── use-cases/QuickCaptureUseCase.ts       # 2-second quick dump
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/PrismaTaskRepository.ts
│   │   │   │   └── repositories/PrismaDependencyRepository.ts
│   │   │   └── presentation/
│   │   │       ├── controllers/TaskController.ts
│   │   │       ├── routes/task.routes.ts
│   │   │       └── validators/task.validator.ts
│   │   │
│   │   ├── scheduler/                # Cron, Dynamic Buffers, BullMQ & NLP
│   │   │   ├── domain/
│   │   │   │   ├── services/DynamicBufferCalculator.ts
│   │   │   │   ├── services/PredictiveDurationAuditor.ts
│   │   │   │   └── services/FlexibleRecurringEngine.ts
│   │   │   ├── application/
│   │   │   │   └── use-cases/AutoRescheduleWithBuffersUseCase.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── queues/BullMQSchedulerQueue.ts
│   │   │   │   ├── workers/AutoRescheduleWorker.ts        # BullMQ Concurrency Worker
│   │   │   │   ├── adapters/UpstashRedisConnection.ts
│   │   │   │   ├── adapters/NaturalLanguageTaskParser.ts
│   │   │   │   └── adapters/ExternalCalendarSyncGateway.ts
│   │   │   └── presentation/
│   │   │       ├── controllers/SchedulerController.ts
│   │   │       ├── routes/scheduler.routes.ts
│   │   │       └── validators/scheduler.validator.ts
│   │   │
│   │   ├── focus/                    # Pomodoro Chamber & Time Tracking Audit
│   │   │   ├── domain/
│   │   │   │   ├── entities/PomodoroSession.ts
│   │   │   │   └── entities/TimeAuditLog.ts
│   │   │   ├── application/
│   │   │   │   └── use-cases/ManageFocusSessionUseCase.ts
│   │   │   └── presentation/
│   │   │       ├── controllers/FocusController.ts
│   │   │       ├── routes/focus.routes.ts
│   │   │       └── validators/focus.validator.ts
│   │   │
│   │   └── shared/                   # Cross-cutting primitives
│   │       ├── domain/Result.ts
│   │       ├── infrastructure/prisma/client.ts
│   │       └── presentation/middleware/
│   │
│   ├── components/                   # React 19 Frontend Components
│   ├── App.tsx                       # Single Page App Root with Auth Gate
│   └── main.tsx
├── server.ts                         # Express.js Server & Vite Middleware Bridge
└── tsconfig.json
`;
