# Chronos Sync

> **Intelligent Task Scheduler & Workflow Engine**  
> *Production-ready, Clean Architecture Modular Monolith built with TypeScript, Node.js, Express, Prisma ORM, BullMQ, React 19, and Tailwind CSS.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-black?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue-red?style=flat-square&logo=redis)](https://docs.bullmq.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green?style=flat-square)](LICENSE)

---

## 📌 Executive Summary

**Chronos Sync** is an enterprise-grade task orchestration platform engineered for developers, technical project leaders, and high-performance teams. Unlike standard todo applications, Chronos Sync models task execution as a **Directed Acyclic Graph (DAG)** with automated circular dependency prevention, dynamic overrun rescheduling with mandatory cognitive recovery buffers, and context-aware energy mode filtering.

Designed according to **Clean Architecture** and **SOLID principles**, the backend is structured as an isolated **Modular Monolith** with absolute type safety, compile-time Zod schema validation, optimistic locking for offline-first sync, and modular BullMQ worker pipelines.

---

## 🌟 Core Features

### 1. Smart Automation & AI
* **Natural Language Processing (NLP) Quick Capture**: High-speed tokenizer converting raw phrases (e.g., *"Deploy microservice tomorrow at 4pm for 60m !p0 #deepwork"*) into structured tasks complete with ISO dates, priority tiers, tags, and duration.
* **Auto-Rescheduling & Dynamic Buffers**: When high-priority (`P0`/`P1`) tasks run over their allocated timeframe, the BullMQ rescheduling engine recalculates downstream task start times while inserting 5–30 minute cognitive recovery buffers to eliminate burnout and schedule cascading.
* **Predictive Time Estimation & Audit**: Logs historical execution metrics and flags tasks with unrealistic allocations using planned vs. actual duration ratios and deviation percentage analytics.

### 2. Advanced Scheduling Controls
* **Directed Acyclic Graph (DAG) Dependency Engine**: Incorporates Kahn’s algorithm and three-color cycle detection (`WHITE`, `GRAY`, `BLACK`) to guarantee prerequisite chains remain non-circular. Tasks are locked in `Blocked` status until all antecedent dependencies are marked `Completed`.
* **Flexible Recurring Rule Engine**: Extends standard POSIX CRON to evaluate complex real-world cadence rules like *"Every 3rd Tuesday"* or *"Every 10 business days"*, skipping holidays and weekends.
* **Cross-Calendar Synchronization**: Clean abstraction and gateway adapters for two-way synchronization hooks with Google Calendar and Microsoft Outlook APIs.

### 3. Execution & Focus Tools
* **Context-Based Energy Filtering**: Filter workflow pipelines according to available cognitive energy levels:
  * 🧠 **Deep Work**: 100% uninterrupted focus, zero context switching (architecture, critical algorithms).
  * ⚡ **High Focus**: Creative engineering, design, and complex problem solving.
  * 🔋 **Medium Focus**: Routine features, code reviews, PR audits, and technical syncs.
  * 🌿 **Low Energy**: Lightweight administration, documentation, backlog grooming.
* **Pomodoro Focus Chamber**: Built-in 25-minute Pomodoro timer directly coupled with task entities, with active audio chimes, progress rings, and real-time telemetry logging.
* **Precision Time Tracking**: Integrated stopwatch recording start/pause/complete events with millisecond precision to feed the predictive estimation audit engine.

### 4. User Experience & Friction Reduction
* **Multi-View Visual Orchestration**:
  * 📋 **Kanban Pipeline**: Five-lane state machine (`To Do`, `In Progress`, `Blocked`, `In Review`, `Completed`) with optimistic locking indicators and column descriptions.
  * ⏱️ **Timeline & Buffers**: Gantt-style schedule displaying allocated working time blocks alongside color-coded cognitive buffers.
  * 📅 **Time-Blocked Day View**: Hourly schedule distribution (8:00 AM – 8:00 PM) with overlap warnings.
  * 🔗 **DAG Dependency Studio**: Interactive visual node-and-edge graph illustrating predecessor/successor relationships and cycle status.
* **Offline-First Optimistic Locking**: Every task entity maintains a monotonically increasing `version` counter and timestamp. Batch updates performed while offline are reconciled server-side with conflict-detection safety.
* **Omnipresent Quick Capture**: Accessible anywhere via <kbd>⌘ Cmd</kbd> + <kbd>K</kbd> (or <kbd>Ctrl</kbd> + <kbd>K</kbd>) for sub-second task creation.

---

## 🏛️ System Architecture

Chronos Sync enforces a strict decoupled **Modular Monolith** adhering to Robert C. Martin's Clean Architecture:

```
chronos-sync/
├── prisma/
│   └── schema.prisma                 # Relational PostgreSQL schema with compound indexes
├── src/
│   ├── modules/
│   │   ├── auth/                     # Supabase & JWT Auth Domain
│   │   │   ├── domain/               # Pure Entities & Repository Interfaces
│   │   │   ├── application/          # Use Cases (Register, Login, Supabase Verify)
│   │   │   ├── infrastructure/       # Prisma Repositories & JWT Adapters
│   │   │   └── presentation/         # Express Controllers & Zod Validators
│   │   │
│   │   ├── task/                     # Core Task & DAG Domain
│   │   │   ├── domain/               # Task Entity, DAG cycle detector
│   │   │   ├── application/          # Create, Update, DAG validation, NLP parser
│   │   │   ├── infrastructure/       # PrismaTaskRepository & in-memory stores
│   │   │   └── presentation/         # TaskController & task routes
│   │   │
│   │   └── scheduler/                # BullMQ, Rescheduling & Cron
│   │       ├── domain/               # Reschedule Engine & Dynamic Buffer logic
│   │       ├── application/          # AutoRescheduleUseCase, RecurringCronUseCase
│   │       ├── infrastructure/       # BullMQ queues, workers & Upstash Redis driver
│   │       └── presentation/         # Reschedule and Recurring controllers
│   │
│   ├── components/                   # React 19 UI Modules
│   │   ├── KanbanView.tsx            # 5-lane Kanban board with DAG locks
│   │   ├── TimelineView.tsx          # Gantt schedule & recovery buffers
│   │   ├── TimeBlockedView.tsx       # Hourly calendar view
│   │   ├── DagStudioView.tsx         # Node-link DAG graph visualizer
│   │   ├── FocusPomodoroView.tsx     # Live timer chamber & audio chimes
│   │   ├── PredictiveAuditView.tsx   # Planned vs actual duration analytics
│   │   ├── QuickCaptureModal.tsx     # Cmd+K NLP task creator
│   │   ├── TaskModal.tsx             # Comprehensive task editor & dependency picker
│   │   ├── Tooltip.tsx               # Viewport-safe portal tooltips
│   │   └── AuthScreen.tsx            # Login & Supabase JWT verification
│   │
│   ├── server/                       # Express Application & Router Bridge
│   ├── App.tsx                       # React root application & navigation
│   └── index.css                     # Tailwind CSS v4 styling
├── server.ts                         # Express HTTP Server & Vite middleware bridge
├── vite.config.ts                    # Vite build configuration
└── package.json                      # Project dependencies & scripts
```

### Architectural Principles:
1. **Dependency Rule**: Inner domain layers contain zero imports from outer layers (no database, no HTTP frameworks).
2. **Repository Pattern**: All database interactions pass through explicit TypeScript interfaces (`ITaskRepository`, `IUserRepository`), allowing mock testing and persistence swapping.
3. **Directed Acyclic Graph Validation**: Circular dependencies ($A \rightarrow B \rightarrow C \rightarrow A$) are intercepted at the application layer before reaching persistence.
4. **Resilient Background Processing**: BullMQ queues isolate CPU-intensive operations (schedule cascade recalculations, recurring task expansions) from the HTTP event loop.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | Concurrent rendering, hooks, responsive state management |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern CSS design tokens, dark-mode slate theme |
| **Icons & Animation** | [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/) | Scalable vector icons and layout transitions |
| **Backend Framework** | [Express.js 4](https://expressjs.com/) | RESTful API routing and JSON middleware |
| **Language & Typing** | [TypeScript 5](https://www.typescriptlang.org/) | Strict static type safety across client and server |
| **Validation** | [Zod](https://zod.dev/) | Runtime request payload validation |
| **Database ORM** | [Prisma ORM](https://www.prisma.io/) | Relational modeling, migrations, and PostgreSQL client |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | ACID transactions and relational foreign key constraints |
| **Queue & Cache** | [BullMQ](https://docs.bullmq.io/), [Redis](https://redis.io/) / [Upstash](https://upstash.com/) | Background workers, delay scheduling, and cron queues |
| **Tooling & Bundler** | [Vite 8](https://vite.dev/), [tsx](https://github.com/privatenumber/tsx) | Instant HMR development and fast TypeScript execution |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* *(Optional)* **Redis** and **PostgreSQL** instance or Docker (fallback in-memory store is enabled by default for standalone testing).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chronos-sync.git
   cd chronos-sync
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `PORT=3000` is configured).*

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:3000`.

5. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | Fetch all user tasks |
| `POST` | `/api/tasks` | Create a new task with DAG dependency validation |
| `PUT` | `/api/tasks/:id` | Update task details or change execution status |
| `DELETE` | `/api/tasks/:id` | Remove a task and cascade orphan dependencies |
| `POST` | `/api/tasks/quick-capture` | 2-second low-latency NLP parser endpoint |
| `GET` | `/api/tasks/views/multi` | Returns structured projections for Kanban, Timeline, Day-Block, and DAG views |
| `POST` | `/api/tasks/offline-batch-sync`| Optimistic locking reconciliation for offline updates |
| `POST` | `/api/reschedule/auto` | Trigger BullMQ dynamic buffer recalculation for overruns |
| `POST` | `/api/focus/session` | Record a completed Pomodoro session and update task duration |
| `GET` | `/api/audit/predictive` | Retrieve planned vs. actual duration estimation variance |
| `POST` | `/api/auth/login` | Authenticate user session |
| `POST` | `/api/auth/supabase-verify` | Validate Supabase JWT bearer token |

---

## 🐙 Recommended GitHub Repository Settings

To present this repository cleanly on GitHub, use the following configurations:

### 1. Repository "About" Description
```
Production-ready Intelligent Task Scheduler & Workflow Engine built with Clean Architecture, DAG dependency cycles prevention, BullMQ dynamic buffer auto-rescheduling, and React 19.
```

### 2. Website URL
Set the website field to your deployment link or preview URL.

### 3. Repository Topics (Tags)
Add these topics in the GitHub repo header to maximize discoverability:
```
task-scheduler, dag-workflow, clean-architecture, kanban, gantt-chart, bullmq, prisma-orm, expressjs, react19, typescript, tailwindcss, pomodoro-timer, time-blocking, modular-monolith
```

### 4. Branch Protection Rules (`main`)
* Go to **Settings** &rarr; **Branches** &rarr; **Add branch protection rule**:
  * **Branch name pattern**: `main`
  * Check: **Require a pull request before merging**
  * Check: **Require status checks to pass before merging** (`build`, `lint`)
  * Check: **Do not allow bypassing the above settings**

### 5. Recommended GitHub Actions Workflow
Create `.github/workflows/ci.yml`:
```yaml
name: CI Build & Typecheck

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## 📄 License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.
