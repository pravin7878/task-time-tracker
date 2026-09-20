# Task & Time Tracking App - Requirements Specification

## 1. Overview
The Task & Time Tracking App is a full-stack web application designed for individual productivity. It allows users to manage tasks, track time spent on tasks using a server-authoritative real-time timer, and view daily productivity summaries.

---

## 2. User Roles & Isolation
- Single-user productivity application (no organizations, workspaces, teams, subscriptions, or multi-tenancy).
- Every user only has access to their own account, tasks, and time tracking sessions.
- Data isolation is strictly enforced at the API and database query levels using authenticated user credentials derived from the verified JWT (`req.user.id`).
- All requests attempting to view, update, delete, or track time on another user's task return `404 Not Found`, preventing ID enumeration and resource existence leakage.

---

## 3. Core Functional Requirements

### 3.1 Authentication
- **Sign Up**: Register with name, unique email, and password. Passwords must be hashed using `bcrypt` (salt rounds $\ge 10$) before persistence.
- **Log In**: Authenticate using email and password. Upon successful validation, issue a signed JWT.
- **Token Storage**: JWT is transmitted and managed by the browser in a secure **HTTP-only cookie** (`httpOnly: true`, `path: '/'`, `sameSite: 'lax'` in local dev, `sameSite: 'none'` and `secure: true` in production).
  - Client-side JavaScript cannot directly read the token, reducing the risk of token exfiltration through XSS.
  - Application code does not store or persist the JWT in `localStorage`, `sessionStorage`, React state, or URL parameters.
- **Log Out**: Clear the HTTP-only session cookie via `POST /api/auth/logout`.
- **Session Check**: `GET /api/auth/me` verifies the active session via the cookie and returns the user profile (excluding password hash).
- **Route Protection**: All task, timer, summary, and AI suggestion endpoints require valid JWT authentication.

### 3.2 Task Management
- **Natural Language Creation**: Support creating tasks with natural language input (e.g. *"follow up with designer"*).
- **CRUD Operations**:
  - **Create (`POST /api/tasks`)**: Add a task with a title (1–200 characters), optional description (max 2000 characters), and default status (`pending`).
  - **Read All (`GET /api/tasks`)**: Fetch all tasks belonging strictly to the authenticated user, sorted newest first (`createdAt: -1`), with optional `?status=` filtering.
  - **Read Single (`GET /api/tasks/:id`)**: Retrieve a single task by ID. Returns `404 Not Found` if the task does not exist or belongs to another user.
  - **Update (`PATCH /api/tasks/:id`)**: Edit title, description, or status. Accepts only whitelisted fields (`title`, `description`, `status`). Client modification of `userId` or arbitrary fields is strictly prohibited.
  - **Delete (`DELETE /api/tasks/:id`)**: Remove a task. If the task has an active timer currently running (`endedAt: null`), deletion is blocked with `409 Conflict` and message `"Cannot delete a task while its timer is running."`.
- **Task Statuses**:
  - `pending`
  - `in_progress`
  - `completed`

### 3.3 Real-Time Time Tracking
- **Session-Based Architecture**: Each tracking session is recorded as an individual `TimeLog` document in MongoDB.
- **Start Timer (`POST /api/tasks/:taskId/timer/start`)**:
  - Starts tracking time for a specific user-owned task.
  - Sets `startedAt` to current server time; `endedAt` remains `null`.
  - **At Most One Active Timer Rule**: A user may have at most one active running timer across the entire application (zero running timers when inactive). If an active timer already exists, rejects with `409 Conflict` (`"Another timer is already running. Stop it before starting a new timer."`).
  - Protected against race conditions by a MongoDB partial unique index (`{ userId: 1 }, { unique: true, partialFilterExpression: { endedAt: null } }`).
- **Stop Timer (`POST /api/tasks/:taskId/timer/stop`)**:
  - Stops the running timer for the task.
  - Sets `endedAt` to current server time.
  - Calculates `duration` in integer **seconds** (`Math.floor((endedAt - startedAt) / 1000)`).
  - Stopping a timer records duration and clears the active session; it never changes the task status to `completed`.
- **Completed Task Protection**:
  - Tasks in `completed` status cannot start a timer. Users must reopen the task before recording time.
- **Source of Truth**:
  - Server timestamps (`startedAt`, `endedAt`) are authoritative.
  - The client timer display calculates elapsed time dynamically (`Date.now() - new Date(startedAt).getTime()`).
  - Client-elapsed counters are never trusted or persisted directly to the database.
- **Persistence Across Refresh**:
  - `GET /api/timer/active` retrieves the active session so the UI immediately recovers the live timer upon page refresh, device switch, or navigation.
- **Time Log History (`GET /api/time-logs`)**:
  - View all historical time logs belonging to the user, ordered newest first (`startedAt: -1`).
- **Task Time Logs & Total Time (`GET /api/tasks/:taskId/time-logs`)**:
  - Total tracked time per task is derived dynamically via aggregation: `SUM(duration)` across completed sessions (`endedAt != null`).
  - `Task.totalTime` does not exist as a stored property, preventing data drift and denormalization anomalies.

### 3.4 Daily Summary
- **Endpoint**: `GET /api/summary/today?timezone=<IANA timezone>`
- **Required Parameter**: `timezone` is required and must be a valid IANA timezone identifier (e.g. `Asia/Kolkata`, `America/New_York`, `Europe/London`, `UTC`). Missing or invalid timezones return `400 Bad Request`.
- **Metrics Calculated**:
  - `date`: Local calendar day string (`YYYY-MM-DD`).
  - `timezone`: Validated IANA timezone string.
  - `totalTrackedTime`: Total tracked seconds for today (sum of session overlaps).
  - `tasksWorkedOn`: Array of tasks worked on during the day with `{ taskId, title, timeSpentSeconds }`, sorted descending by time spent.
  - `completedTasks`: Array of completed tasks for the user.
  - `inProgressTasks`: Array of in-progress tasks for the user.
  - `pendingTasks`: Array of pending tasks for the user.
- **Dynamic Aggregation & Normalization**:
  - Computed on-the-fly directly from `TimeLog` and `Task` records.
  - Cross-midnight sessions (e.g. 23:30 to 00:30) are partitioned accurately across local day boundaries without double-counting.
  - If a timer is currently active, its elapsed seconds today are calculated dynamically and included in `totalTrackedTime` and `tasksWorkedOn`. The stored `TimeLog` is not mutated.

---

## 4. Optional & Bonus Features

### 4.1 Implemented Optional Feature: AI Task Enhancement (Milestone 10)
- **Endpoint**: `POST /api/ai/task-suggestion`
- **Model**: Google Gemini 3.6 Flash via the official `@google/genai` SDK.
- **Key Isolation**: `GEMINI_API_KEY` is backend-only. Never exposed to frontend code or client bundles.
- **Dynamic Configuration**: Resolves model identifier dynamically from `process.env.GEMINI_MODEL` (fallback: `gemini-3.6-flash`).
- **Suggestion Only (Zero Side Effects)**:
  - Transforms raw natural language input (1–1000 characters) into an improved title and structured description.
  - Does NOT automatically create tasks.
  - Does NOT modify task statuses.
  - Does NOT start or stop timers.
- **User Control**: Frontend provides an "Improve with Gemini" workflow inside `TaskFormModal` with an "Accept Suggestion" / "Ignore" preview card. The user must explicitly click "Create Task" to persist the task.
- **Graceful Failure**: AI service failure or absence of an API key returns a clean HTTP 503 and non-blocking warning. Manual task creation is never blocked.

### 4.2 Post-MVP Bonus Features (Not Implemented / Scope Excluded)
- Visual productivity charts (time distribution charts).
- Weekly/monthly summary reports.
- Browser push notifications / reminder alerts.

---

## 5. Non-Functional Requirements
- **Security**:
  - Helmet headers (`crossOriginResourcePolicy: { policy: 'cross-origin' }`).
  - Strict CORS with credentials allowing only authorized frontend origins (e.g. deployed Vercel domain, local development ports).
  - Sanitized inputs and explicit runtime validation without heavy schema dependencies (no Zod).
  - Strict data isolation based on verified JWT `req.user.id`.
  - Zero secrets or credentials exposed to client bundles.
- **Type Safety**: End-to-end TypeScript with strict compiler settings across both backend and frontend.
- **Architecture**: Pure functional controllers, services, and error factories on the backend.
- **Performance & Responsiveness**:
  - MongoDB compound indexes supporting user-scoped queries and partial unique index enforcing single active timer.
  - Responsive Tailwind CSS interface supporting mobile, tablet, and desktop viewports.
  - TanStack Query cache invalidation keeping UI synchronized with zero N+1 queries.
