# Task & Time Tracking App - System Architecture

## 1. High-Level Architecture Overview

The system is structured as a decoupled full-stack TypeScript application:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                        │
│   React + Vite + TypeScript + Tailwind CSS + React Router   │
│   TanStack Query (Server State) + React Hook Form           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (Credentials included)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Render)                        │
│          Node.js + Express + TypeScript + tsx               │
│                                                             │
│   Routes ──► Middleware ──► Controllers ──► Services ──► DB │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM / Driver
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database (MongoDB Atlas)                    │
│             Users, Tasks, TimeLogs Collections              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Layered Architecture (Functional Approach)

The backend uniformly adopts a pure **functional programming approach** for application-layer code (controllers, services, middleware, validators, and utilities) instead of class-based singletons or instantiated service objects:

```
Routes (Router binding)
  ↓
Middleware functions (requireAuth, errorHandler)
  ↓
Controller functions (register, login, logout, me)
  ↓
Service functions (register, login, getCurrentUser)
  ↓
Model operations (Mongoose schemas & models)
  ↓
MongoDB Atlas
```

1. **Routes (`/src/routes`)**:
   - Define URL patterns and bind HTTP verbs directly to functional controllers.
   - Attach route-level middleware functions (e.g., `requireAuth`).
2. **Middleware (`/src/middleware`)**:
   - `auth.middleware.ts`: Pure function parsing HTTP-only cookies, validating JWT, attaching `req.user`.
   - `error.middleware.ts`: Centralized error catching function mapping domain errors to standard JSON responses.
3. **Controllers (`/src/controllers`)**:
   - Exported pure async functions responsible strictly for HTTP concerns (parsing request bodies, running runtime validators, invoking services, setting HTTP-only cookies, returning standard JSON envelopes).
4. **Services (`/src/services`)**:
   - Exported pure async functions containing domain business logic (database operations, bcrypt hashing, JWT issuance, domain error throwing).
   - Stateless and independently testable without instantiating class objects.
5. **Models (`/src/models`)**:
   - Standard Mongoose schemas and models (`new Schema(...)`, `model(...)`) with indexing, validation, and strict types.
6. **Validators (`/src/validators`)**:
   - Pure runtime validation functions (no Zod) validating HTTP payloads.
7. **Custom Errors (`/src/utils/errors.ts`)**:
   - Pure functional error factories (`createAppError`, `createBadRequestError`, `createUnauthorizedError`, `createForbiddenError`, `createNotFoundError`, `createConflictError`) with an `isAppError` TypeScript type guard. Eliminates all class declarations while preserving stack traces and typed status codes.

---

## 3. Database Schema Design

### 3.1 User Model
```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  email: string;        // unique, lowercased, indexed
  passwordHash: string; // bcrypt hash, never returned in responses
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Task Model
```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface ITask {
  _id: ObjectId;
  userId: ObjectId;     // ref: User, indexed
  title: string;        // trimmed, 1-200 chars
  description?: string; // trimmed, max 2000 chars
  status: TaskStatus;   // default: 'pending', indexed compound (userId + status)
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 TimeLog Model
```typescript
interface ITimeLog {
  _id: ObjectId;
  userId: ObjectId;        // ref: User, indexed
  taskId: ObjectId;        // ref: Task, indexed
  startedAt: Date;         // server-generated timestamp
  endedAt: Date | null;    // null indicates an active running timer
  duration: number | null; // integer duration in SECONDS (null while active)
  createdAt: Date;
  updatedAt: Date;
}
```

#### TimeLog Indexing Strategy
1. **Unique Active Timer Partial Index**:
   - `TimeLogSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { endedAt: null }, name: 'unique_active_timer_per_user' })`
   - Guarantees at the database level that a user can have at most **one** running timer (`endedAt: null`) across the entire collection.
2. **User History Index**:
   - `TimeLogSchema.index({ userId: 1, startedAt: -1 }, { name: 'idx_timelog_user_history' })`
   - Optimizes `GET /api/time-logs` for fast reverse chronological sorting.
3. **Task Session Index**:
   - `TimeLogSchema.index({ userId: 1, taskId: 1, startedAt: -1 }, { name: 'idx_timelog_user_task_history' })`
   - Optimizes `GET /api/tasks/:taskId/time-logs` and task total time aggregations.
4. **Active Timer Lookup Index**:
   - `TimeLogSchema.index({ userId: 1, endedAt: 1 }, { name: 'idx_timelog_user_active' })`
   - Accelerates checking for active timers during start operations and page reloads.

---

## 4. Key Architectural Patterns

### 4.1 Timer Lifecycle & Server Timestamp Source of Truth
- **Start Timer (`POST /api/tasks/:taskId/timer/start`)**:
  - Validates `taskId` and verifies that the task belongs strictly to `req.user.id`.
  - Checks if an active timer (`endedAt: null`) already exists for the user.
  - Generates `startedAt = new Date()` from the **backend server clock**.
  - Sets `endedAt = null` and `duration = null`.
  - Prohibits client-supplied timestamps or durations (returns `400 Bad Request`).
- **Active Timer Recovery (`GET /api/timer/active`)**:
  - Queries `TimeLog.findOne({ userId: req.user.id, endedAt: null })`.
  - Returns the running `TimeLog` or `{ activeTimer: null }`.
  - Frontend uses `startedAt` to compute live visual elapsed time (`Date.now() - new Date(startedAt).getTime()`). Backend does not store visual ticks.
- **Stop Timer (`POST /api/tasks/:taskId/timer/stop`)**:
  - Finds the active timer matching `{ userId: req.user.id, taskId, endedAt: null }`.
  - Returns `404 Not Found` if no timer is running for this task and user.
  - Generates `endedAt = new Date()` from the backend server clock.
  - Authoritatively calculates:
    `duration = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))`
  - Saves the record and returns the completed `TimeLog`.

### 4.2 Single Active Timer Concurrency Protection
The system enforces the single-active-timer constraint via a **dual-layer defense**:
1. **Application Pre-Flight Check**:
   - The functional service performs an initial `TimeLog.findOne({ userId, endedAt: null })`.
   - If an active timer exists, it immediately rejects with `409 Conflict` (`"Another timer is already running. Stop it before starting a new timer."`).
2. **Database-Level Partial Unique Index**:
   - In concurrent race conditions where two start requests pass the application check simultaneously, MongoDB enforces uniqueness via the partial unique index:
     `{ userId: 1 }, { unique: true, partialFilterExpression: { endedAt: null } }`.
   - The service intercepts duplicate key error code `11000` on the active timer index and translates it into a clean `409 Conflict` response instead of exposing internal database errors.

### 4.3 Total Time Per Task
- Total tracked time for a task is **derived dynamically** by summing `duration` across completed sessions:
  `SUM(duration)` where `{ userId: req.user.id, taskId, endedAt: { $ne: null } }`.
- **No Stored `Task.totalTime`**: The `Task` document intentionally does not store a cumulative total time field. This prevents race conditions, synchronization drift, and denormalization anomalies.
- **Active Session Policy**: The currently running active timer is excluded from the persisted completed duration total until it is stopped.

### 4.4 Resource Ownership & Strict Data Isolation
- **Authoritative Identity**: The authenticated user ID originates strictly from the verified JWT payload attached to `req.user.id` by the `requireAuth` middleware.
- **Client Input Disallowed**: The API never accepts a client-provided `userId` for creating, querying, modifying, or deleting resources.
- **Strict Query Scoping**:
  - `Task.find({ userId: req.user.id })` (scoped task listing)
  - `Task.findOne({ _id: taskId, userId: req.user.id })` (scoped single-task retrieval)
  - `Task.findOneAndUpdate({ _id: taskId, userId: req.user.id }, ...)` (scoped update)
  - `Task.deleteOne({ _id: taskId, userId: req.user.id })` (scoped deletion)
  - `TimeLog.find({ userId: req.user.id })` (scoped time logs)
  - `TimeLog.findOne({ userId: req.user.id, taskId, endedAt: null })` (scoped active timer)
- **Safe 404 Responses**: Attempting to query, update, delete, or track time on another user's task yields `404 Not Found`, preventing ID enumeration and resource existence leaking.
- **Active Timer Deletion Protection**: Before a task is deleted, the service queries `TimeLog.findOne({ taskId, userId: req.user.id, endedAt: null })`. If an active timer is running, the deletion is rejected with `409 Conflict` and message `"Cannot delete a task while its timer is running."`.

### 4.5 Timezone-Aware Daily Summary
- The daily summary endpoint accepts an optional `date` (YYYY-MM-DD) and client `timezone` (e.g. `Asia/Kolkata`, `UTC`).
- The backend computes the UTC range corresponding to the user's local day boundaries (`[startOfDay, endOfDay]`).
- Time logs overlapping the day are aggregated using MongoDB `$match` and `$group` pipelines to calculate total duration and unique tasks worked on.

---

## 5. Security Architecture
- **JWT in HTTP-only Cookies**: Prevents XSS token exfiltration.
- **CORS Configuration**: Restricts origin to the frontend host, enforces `credentials: true`.
- **Helmet**: Injects secure HTTP headers (HSTS, CSP, X-Frame-Options).
- **Password Security**: Passwords hashed using bcrypt with salt rounds >= 10.
- **Data Protection**: Sensitive properties (`passwordHash`) explicitly omitted using Mongoose `select: false` or controller mapping.
