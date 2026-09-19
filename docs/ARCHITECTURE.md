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
- **Endpoint**: `GET /api/summary/today?timezone=[IANA_TIMEZONE]`
- **Timezone Boundary Calculation**:
  - The client provides a validated IANA timezone identifier (e.g. `Asia/Kolkata`, `America/New_York`, `Europe/London`).
  - Using Luxon, the service resolves the user's current local calendar date (`YYYY-MM-DD`) and computes the exact UTC instants corresponding to the start of that local day (00:00:00.000) and the start of the next local day (00:00:00.000 of tomorrow): `[startOfDay, startOfNextDay)`.
  - Native IANA timezone evaluation natively handles daylight saving transitions (23-hour or 25-hour days) and historical offset changes.
- **TimeLog Overlap Calculation & Cross-Midnight Splitting**:
  - The service queries TimeLogs where `startedAt < startOfNextDay` and (`endedAt > startOfDay` or `endedAt == null`), scoped strictly to `userId: req.user.id`.
  - For each session:
    $$\text{overlapStart} = \max(\text{startedAt}, \text{startOfDay})$$
    $$\text{overlapEnd} = \min(\text{endedAt} \mathrel{?} \text{endedAt} : \text{now}, \text{startOfNextDay})$$
    $$\text{duration} = \max\left(0, \left\lfloor\frac{\text{overlapEnd} - \text{overlapStart}}{1000}\right\rfloor\right)$$
  - This guarantees sessions crossing midnight are partitioned accurately without duplicate time or omitted time.
- **Active Session Inclusion**:
  - If a user currently has an active timer (`endedAt == null`), its elapsed portion today is calculated up to the current instant (`now`) and included in both `totalTrackedTime` and `tasksWorkedOn`.
  - The persisted `TimeLog` document in MongoDB is **never** mutated to calculate the summary (`endedAt` remains `null`, `duration` remains `null`).
- **Data Normalization & Authoritative Timestamps**:
  - The `Task` model intentionally does not maintain a cumulative `totalTime` field. All daily and task totals are derived on demand from `TimeLog` session intervals, guaranteeing complete consistency and zero denormalization anomalies.
  - The client's timezone is used exclusively to establish the local calendar day window; the timestamps stored in MongoDB remain server-authoritative UTC instants.

---

## 5. Security Architecture
- **JWT in HTTP-only Cookies**: Prevents XSS token exfiltration.
- **CORS Configuration**: Restricts origin to the frontend host, enforces `credentials: true`.
- **Helmet**: Injects secure HTTP headers (HSTS, CSP, X-Frame-Options).
- **Password Security**: Passwords hashed using bcrypt with salt rounds >= 10.
- **Data Protection**: Sensitive properties (`passwordHash`) explicitly omitted using Mongoose `select: false` or controller mapping.

---

## 6. Frontend Architecture & Authentication Flow

### 6.1 Authentication Architecture
The frontend authentication system relies strictly on HTTP-only cookie session management:

```
Login / Register Form (React Hook Form)
      ↓
Backend Auth API (POST /api/auth/login or /register)
      ↓
Browser receives HTTP-only JWT cookie (withCredentials: true)
      ↓
GET /api/auth/me (Verification & User Profile)
      ↓
TanStack Query cache (queryKey: ['auth', 'me'])
      ↓
ProtectedRoute & PublicRoute Guards
      ↓
Authenticated Application (/app)
```

### 6.2 Key Architectural Principles
1. **Zero Client Token Storage**:
   - The frontend never reads, decodes, or stores the JWT in `localStorage`, `sessionStorage`, cookies, React state, or URL parameters.
   - Completely eliminates vulnerabilities related to XSS token theft.
2. **Server as Single Source of Truth**:
   - The authoritative session state is determined exclusively by `GET /api/auth/me`.
   - On page refresh or browser reopening, TanStack Query queries `/api/auth/me`. If the HTTP-only cookie is present and valid, the user seamlessly remains authenticated without state drift.
3. **Route Protection Semantics**:
   - `ProtectedRoute`: While session verification is loading, renders `LoadingSpinner`. If unauthenticated, redirects to `/login` preserving intended destination. If authenticated, renders protected content.
   - `PublicRoute`: If authenticated, redirects to `/app`. Prevents logged-in users from unnecessarily seeing `/login` or `/register`.
4. **Form Management & Error Handling**:
   - Implemented with React Hook Form, typed data models, accessible labels, and field-level validation.
   - Extracts server-side validation error messages and field mappings cleanly without exposing raw Axios error objects.

### 6.3 Application Shell & Navigation Architecture (Milestone 6B)

The authenticated application shell provides the foundational chrome for all post-login screens (Dashboard, Tasks, Time Logs). It separates navigation, identity representation, and page chrome from domain views.

```
<ProtectedRoute>
  └── <AppLayout>
        ├── <Sidebar />          (Desktop fixed navigation: 256px)
        ├── <MobileNav />        (Accessible slide-out drawer + backdrop)
        └── <MainArea>
              ├── <Header />     (Sticky top bar with page title, hamburger & user greeting)
              └── <MainContent>
                    └── <Outlet /> (DashboardPage | TasksPage | TimeLogsPage)
```

#### 1. Nested Route Hierarchy & ProtectedRoute Relationship
- `ProtectedRoute` acts as the root authentication guard:
  - If unauthenticated, redirects to `/login` with location state preserved.
  - If authenticated, renders the child `<Outlet />`.
- Nested inside `ProtectedRoute` is `<Route element={<AppLayout />}>`:
  - Enforces that all child routes (`/app`, `/app/tasks`, `/app/time-logs`) are guarded by authentication before `AppLayout` renders.
  - Pages do not need to duplicate authentication checks, user fetching, or navigation shells.
  - Page transitions occur inside `<Outlet />` without re-mounting the `Sidebar` or `Header`.

#### 2. Desktop Sidebar (`Sidebar.tsx`)
- **Branding**: Clean productivity-focused branding ("Task & Time Tracker") with an icon badge.
- **Semantic Navigation**: Built using `<nav aria-label="Main Navigation">` and React Router `NavLink`.
- **Active Navigation State**: Employs `NavLink` active classes with `end: true` for root `/app`, ensuring exact matching so `/app` does not remain highlighted when navigating to child paths like `/app/tasks`.
- **User Identity Section**: Directly displays the authenticated user's name and email derived exclusively from `useAuth().user` (populated by `GET /api/auth/me`). No duplicate data stores or localStorage variables.
- **Sign Out**: Clean logout action invoking `logoutMutation.mutate()` from `useAuth()`, clearing server cookies via `POST /api/auth/logout`, resetting TanStack Query cache, and smoothly redirecting to `/login`.

#### 3. Top Header (`Header.tsx`)
- Sticky top header (`sticky top-0 z-30`) with subtle backdrop blur.
- Dynamic page context title computed from the current pathname (`Dashboard`, `Tasks`, `Time Logs`).
- Accessible hamburger menu toggle (`aria-label="Open mobile navigation"`, `aria-expanded={isMobileMenuOpen}`) displayed on mobile viewports (`md:hidden`).
- User profile greeting and status indicator.

#### 4. Responsive Mobile Navigation (`MobileNav.tsx`)
- Pure React local state (`isMobileMenuOpen`) managed in `AppLayout` — no Redux or global state store needed.
- Fixed overlay backdrop (`fixed inset-0 bg-slate-900/40 z-40`) closing on backdrop click or Escape key.
- Accessible slide-out drawer (`fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-xl`) with explicit close button (`aria-label="Close navigation drawer"`).
- Automatically closes drawer whenever a navigation link is clicked.
- Complete keyboard accessibility with visible focus rings.

#### 5. Clean Route-Level Views
- `/app` -> `DashboardPage`: Welcome banner, authenticated user name, quick navigation cards to Tasks and Time Logs, and activity placeholder.
- `/app/tasks` -> `TasksPage`: Route-level container for Milestone 7 Task Management integration.
- `/app/time-logs` -> `TimeLogsPage`: Route-level shell for Milestone 8 Time Tracking history integration.
- Zero fake or mocked task/timer/summary data; strict preservation of backend API integrity.

### 6.4 Frontend Task Management Architecture (Milestone 7)

The Task Management UI at `/app/tasks` is built on a unidirectional data flow powered by TanStack Query, typed REST service modules, and accessible component dialogs.

```
TasksPage (Component UI)
  │
  ├── Reads State: useTasks(filter) ──► TanStack Query Cache (['tasks', ...])
  │                                           │
  │                                     queryFn: getTasks(status)
  │                                           │
  │                                           ▼
  ├── Mutations: useCreateTask() ────► task.service.ts
  │              useUpdateTask()              │
  │              useDeleteTask()              ▼
  │                                    apiClient (Axios)
  │                                           │
  │                                           ▼
  └── React Hook Form Modals          Backend Task REST API
      (TaskFormModal, DeleteModal)   (/api/tasks, /api/tasks/:id)
```

#### 1. Server State & Cache Invalidation Strategy
- **Query Keys**:
  - `['tasks']`: Root query key matching all tasks.
  - `['tasks', { status }]`: Scoped query for active filter tabs (`pending`, `in_progress`, `completed`).
  - `['tasks', taskId]`: Single task query key for task details.
- **Cache Invalidation**:
  - `createTask`: Automatically invalidates `['tasks']`, causing the active filter view to refresh immediately with the newly inserted task.
  - `updateTask`: Invalidates `['tasks']` and `['tasks', id]`, updating status badges and card content without a full page reload.
  - `deleteTask`: Invalidates `['tasks']`, instantly removing the deleted task from the list.
- **Single Source of Truth**:
  - The frontend maintains zero separate manual arrays or Redux task slices. TanStack Query acts as the authoritative reactive state container.

#### 2. Strict Backend Ownership & Data Isolation
- **No Client User ID**: All task requests omit client-supplied `userId`.
- The backend derives identity exclusively from the verified JWT in the HTTP-only cookie (`req.user.id`).
- When switching accounts or logging out, `queryClient.clear()` ensures that cached tasks are purged and never cross-pollute user sessions.

#### 3. Error Handling & 409 Conflict Protection
- **Active Timer Delete Safeguard**:
  - When `DELETE /api/tasks/:id` returns `409 Conflict`, `DeleteTaskModal` extracts the backend error message (`"Cannot delete a task while its timer is running."`) via `extractApiError()` and displays it in a dedicated warning alert within the modal dialog.
  - The UI does not attempt to bypass this constraint or kill the timer silently.
- **Validation Errors**:
  - Form validation is enforced client-side via React Hook Form (1–200 characters for title, max 2000 for description).
  - Server-side runtime validation errors (e.g. invalid status or invalid ID) are caught and displayed in user-facing error banners.

#### 4. Dual Presentation Modes (List & Grid Views)
- **Default List View (`TaskListItem.tsx`)**:
  - Full-width horizontal row presentation optimized for dense task scanning and status tracking.
  - Left-aligned title, description, and creation metadata; right-aligned status badge, status selector, and edit/delete actions.
  - Fully responsive, collapsing into clean stacked items on mobile screens.
- **Grid View (`TaskCard.tsx`)**:
  - 3-column card grid presentation for card-based visual overview.
- **Persistent View Preference**:
  - User preference toggled via header buttons and persisted locally in `localStorage` (`task_view_mode: 'list' | 'grid'`).

---

### 6.5 Time Tracking Architecture (Milestone 8)

The frontend time tracking architecture bridges the authoritative backend Time Tracking REST API (`POST /api/tasks/:id/timer/start`, `POST /api/tasks/:id/timer/stop`, `GET /api/timer/active`, `GET /api/time-logs`, `GET /api/tasks/:id/time-logs`) with modern reactive UI components:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Tasks Page / Header                           │
│  [Header Active Timer]          [TaskCard / TaskListItem Controls]    │
│            │                                  │                        │
│            ▼                                  ▼                        │
│   useActiveTimer()                    useStartTimer() / useStopTimer() │
└────────────┬──────────────────────────────────┬────────────────────────┘
             │                                  │
             │ TanStack Query Cache             ▼
             │ (['timer', 'active'])    timeTracking.service.ts
             │                                  │
             ▼                                  ▼
      GET /api/timer/active             POST /tasks/:id/timer/start
                                        POST /tasks/:id/timer/stop
                                        PATCH /tasks/:id (auto-progress)
```

#### 1. Invariants & Product Separation
- **Task Status vs Timer State**:
  - Task status (`pending`, `in_progress`, `completed`) and timer running state (`active`, `stopped`) are independent concepts.
  - The manual task status `<select>` dropdown remains on all cards and list rows, allowing users to transition between states at any time without triggering or requiring a timer.
- **Single Automatic Transition**:
  - Only one automatic transition exists: when starting a timer on a `pending` task, the task is automatically transitioned to `in_progress` via `PATCH /api/tasks/:taskId`.
  - If a task is already `in_progress`, starting the timer starts the session while keeping the status as `in_progress`.
- **Stop Timer Invariant**:
  - Stopping an active timer **never** transitions a task to `completed`. The status remains as-is (`in_progress`).
- **Completed Task Protection**:
  - Tasks in `completed` status cannot start a timer. The timer start button is replaced by a badge reading `"Reopen to track time"`. Users must explicitly reopen the task before recording time.

#### 2. Server as Single Source of Truth
- **Zero Local Storage State**: No timer running state, timestamps, or counters are persisted in `localStorage` or `sessionStorage`.
- **Active Timer Recovery**:
  - `useActiveTimer()` queries `GET /api/timer/active` on page load, mount, or window focus.
  - If a user refreshes or changes devices, the running session is immediately recovered.
- **Live Counter Component (`LiveTimer.tsx`)**:
  - Derives elapsed seconds purely from `Date.now() - new Date(startedAt).getTime()`.
  - Driven by a 1-second `setInterval` with complete lifecycle cleanup to prevent memory leaks.

#### 3. Single Active Timer & 409 Conflict Protection
- The backend permits only 1 running timer per user enforced by a MongoDB partial unique index (`{ userId: 1 }, { unique: true, partialFilterExpression: { endedAt: null } }`).
- Starting a second timer triggers `HTTP 409 Conflict`.
- `TasksPage` intercepts 409 conflicts and surfaces an actionable, dismissible error banner without affecting the running session.

#### 4. Status Update Failure Graceful Degradation
- In `useStartTimer({ taskId, currentStatus })`:
  1. `POST /api/tasks/:id/timer/start` executes first and must succeed.
  2. If `currentStatus === 'pending'`, `PATCH /api/tasks/:id` with `{ status: 'in_progress' }` is executed.
  3. If the PATCH fails (network drop or temporary glitch), the running timer is **NOT** stopped. It remains running, all queries are refreshed, and a recoverable warning notification is surfaced alerting the user that the timer started and the task status can be updated manually.

#### 5. Chronological Time Logs & Zero N+1 Queries (`TimeLogsPage.tsx`)
- Displays all recorded sessions sorted newest-first (`startedAt` descending).
- Resolves task titles by cross-referencing `taskId` against the cached `useTasks('all')` query map, eliminating N+1 network requests.
- Renders responsive desktop table and mobile card list views.






