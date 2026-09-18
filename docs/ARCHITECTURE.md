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

## 2. Backend Layered Architecture

The backend strictly separates concerns into clean layers:

1. **Routes (`/src/routes`)**:
   - Define URL patterns and bind HTTP verbs.
   - Attach route-level middleware (e.g., authentication, rate limiting).
2. **Middleware (`/src/middleware`)**:
   - `auth.middleware.ts`: Parses HTTP-only cookies, validates JWT, attaches `req.user`.
   - `error.middleware.ts`: Centralized error catching, converts domain errors to standardized JSON responses.
3. **Controllers (`/src/controllers`)**:
   - Thin request handlers.
   - Extract parameters, run runtime input validators, invoke services, and return standard JSON envelopes.
4. **Services (`/src/services`)**:
   - Core domain business logic.
   - Enforce single active timer constraint, compute durations, perform database aggregations, and enforce resource ownership.
5. **Models (`/src/models`)**:
   - Mongoose schemas with indexing, strict validation, and TypeScript types.
6. **Validators (`/src/validators`)**:
   - Explicit runtime validation functions (no Zod) to validate HTTP payloads.

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
  userId: ObjectId;     // ref: User, indexed
  taskId: ObjectId;     // ref: Task, indexed
  startedAt: Date;      // server timestamp
  endedAt: Date | null; // null indicates an active running timer
  duration: number | null; // duration in SECONDS
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. Key Architectural Patterns

### 4.1 Single Active Timer Enforcement
- An active timer is defined as a `TimeLog` where `userId == req.user.id` and `endedAt == null`.
- Before starting a timer:
  1. Service queries `TimeLog.findOne({ userId: req.user.id, endedAt: null })`.
  2. If found, rejects with `409 Conflict` (`"An active timer is already running for task: [title]"`).
  3. Otherwise, creates the new log with `startedAt = new Date()`.
- Stopping a timer sets `endedAt = new Date()` and calculates `duration = Math.floor((endedAt - startedAt) / 1000)`.

### 4.2 Resource Ownership & Isolation
- Queries never trust user IDs from the client body or URL.
- All CRUD queries must explicitly scope by user:
  ```typescript
  Task.findOne({ _id: taskId, userId: req.user.id });
  TimeLog.find({ userId: req.user.id });
  ```

### 4.3 Timezone-Aware Daily Summary
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
