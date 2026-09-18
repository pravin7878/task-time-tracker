# Task & Time Tracking App - Requirements Specification

## 1. Overview
The Task & Time Tracking App is a full-stack web application designed for individual productivity. It allows users to manage tasks, track time spent on tasks using a server-authoritative real-time timer, and view daily productivity summaries.

---

## 2. User Roles & Isolation
- Single-user productivity application (no organizations, workspaces, or multi-tenancy).
- Every user only has access to their own account, tasks, and time tracking sessions.
- Data isolation is strictly enforced at the API and database query levels using authenticated user credentials (`req.user.id`).

---

## 3. Core Functional Requirements

### 3.1 Authentication
- **Sign Up**: Register with name, unique email, and password. Passwords must be hashed using `bcrypt` before persistence.
- **Log In**: Authenticate using email and password. Upon successful validation, issue a signed JWT.
- **Token Storage**: JWT stored strictly in an **HTTP-only cookie** (`httpOnly: true`, `sameSite: 'lax'` / `'none'`, `secure` in production). LocalStorage must not be used for session tokens.
- **Log Out**: Clear the HTTP-only authentication cookie.
- **Session Check**: `GET /api/auth/me` to verify active session and return user profile (excluding password hash).
- **Route Protection**: All task, timer, and summary endpoints require valid JWT authentication.

### 3.2 Task Management
- **Natural Language Creation**: Support creating tasks with natural language input (e.g. *"follow up with designer"*).
- **CRUD Operations**:
  - **Create**: Add a task with a title, optional description, and default status (`pending`).
  - **Read**: Fetch all tasks belonging to the authenticated user; fetch single task by ID.
  - **Update**: Edit title, description, and status.
  - **Delete**: Remove a task. If the task has an active timer currently running, deletion is blocked with `409 Conflict` ("Cannot delete a task while its timer is running.").
- **Task Statuses**:
  - `pending`
  - `in_progress`
  - `completed`

### 3.3 Real-Time Time Tracking
- **Session-Based Architecture**: Each tracking session is recorded as an individual `TimeLog` entry.
- **Start Timer**:
  - Starts tracking time for a specific user-owned task.
  - Sets `startedAt` to current server time; `endedAt` remains `null`.
  - **Single Active Timer Rule**: A user may only have one active timer running across the entire system. If an active timer already exists, rejects with `409 Conflict`.
- **Stop Timer**:
  - Stops the running timer for the task.
  - Sets `endedAt` to current server time.
  - Calculates `duration` in integer **seconds** (`Math.floor((endedAt - startedAt) / 1000)`).
- **Source of Truth**:
  - Server timestamps (`startedAt`, `endedAt`) are authoritative.
  - Frontend timer display calculates elapsed time dynamically (`Date.now() - new Date(startedAt).getTime()`).
  - Frontend elapsed values are never trusted or saved directly to the database.
- **Persistence Across Refresh**:
  - `GET /api/timer/active` retrieves the active session so the UI immediately resumes displaying the live timer upon page reload.
- **Time Log History & Task Total Time**:
  - View all historical time logs.
  - Derive total time spent per task dynamically via aggregation.

### 3.4 Daily Summary
- **Metrics Calculated**:
  - Total time tracked on the specified day (sum of durations in seconds).
  - List and count of tasks worked on during the day.
  - Count of completed tasks.
  - Count of tasks in progress.
  - Count of pending tasks.
- **Dynamic Aggregation**: Computed directly from database records rather than relying on cached counters.
- **Timezone Awareness**: Accepts client date/timezone query parameters so summaries align with the user's local calendar day.

---

## 4. Optional & Bonus Features (Post-MVP)
1. **AI Task Enhancement**:
   - Optional backend route using an AI provider to transform natural language into a polished title and structured description.
   - Fully decoupled: Normal task creation operates without AI.
   - User reviews and approves suggestions before saving.
2. **Productivity Charts & Weekly Summaries**:
   - Visual charts showing daily/weekly time distribution across tasks.
3. **Reminders & Notifications**:
   - Browser notifications for active timers.

---

## 5. Non-Functional Requirements
- **Security**: Helmet headers, strict CORS with credentials, sanitized inputs, strict data ownership verification, no secrets exposed in client bundles.
- **Type Safety**: End-to-end TypeScript with strict compiler settings; explicit runtime input validation on the backend.
- **Design & Usability**: Responsive layout (mobile, tablet, desktop), accessible controls, loading/error/empty states, modern Tailwind CSS design.
