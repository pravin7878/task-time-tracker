# Task & Time Tracking App - API Specification

All endpoints are prefixed with `/api`.
All responses follow a standard envelope format:

**Success Response:**
```json
{
  "success": true,
  "data": {}
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": {} // Optional validation error details
}
```

---

## 1. System Health
### `GET /api/health`
- **Description**: Verifies backend availability and uptime.
- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-17T18:00:00.000Z",
    "uptime": 12.34
  }
}
```

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
- **Description**: Register a new user account.
- **Auth**: Public
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```
- **Responses**:
  - `201 Created`: User created and JWT cookie set.
  - `400 Bad Request`: Validation error or email already in use.

### `POST /api/auth/login`
- **Description**: Log in with credentials and obtain an HTTP-only JWT cookie.
- **Auth**: Public
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```
- **Responses**:
  - `200 OK`: Authenticated, cookie set.
  - `401 Unauthorized`: Invalid email or password.

### `POST /api/auth/logout`
- **Description**: Log out by clearing the HTTP-only cookie.
- **Auth**: None / Authenticated
- **Responses**:
  - `200 OK`: Cookie cleared.

### `GET /api/auth/me`
- **Description**: Fetch profile of the currently logged-in user.
- **Auth**: Required (JWT cookie)
- **Responses**:
  - `200 OK`: Profile details (`_id`, `name`, `email`).
  - `401 Unauthorized`: Token missing or expired.

---

## 3. Tasks (`/api/tasks`)

### `GET /api/tasks`
- **Description**: Retrieve all tasks belonging to the current user.
- **Query Params (optional)**: `status` (`pending`, `in_progress`, `completed`).
- **Auth**: Required
- **Responses**:
  - `200 OK`: Array of task objects with calculated `totalTimeSpent` (seconds).

### `POST /api/tasks`
- **Description**: Create a new task.
- **Auth**: Required
- **Request Body**:
```json
{
  "title": "Follow up with designer",
  "description": "Discuss wireframes for the timer module",
  "status": "pending"
}
```
- **Responses**:
  - `201 Created`: Created task object.
  - `400 Bad Request`: Validation error.

### `GET /api/tasks/:id`
- **Description**: Retrieve a single task by ID.
- **Auth**: Required
- **Responses**:
  - `200 OK`: Task details.
  - `404 Not Found`: Task does not exist or belongs to another user.

### `PUT /api/tasks/:id`
- **Description**: Update an existing task.
- **Auth**: Required
- **Request Body**:
```json
{
  "title": "Follow up with UI Designer",
  "description": "Send Slack message regarding wireframe delivery",
  "status": "in_progress"
}
```
- **Responses**:
  - `200 OK`: Updated task.
  - `400 Bad Request`: Validation error.
  - `404 Not Found`: Task not found.

### `DELETE /api/tasks/:id`
- **Description**: Delete a task.
- **Auth**: Required
- **Responses**:
  - `200 OK`: Task deleted.
  - `404 Not Found`: Task not found.
  - `409 Conflict`: `"Cannot delete a task while its timer is running."`

---

## 4. Time Tracking (`/api/timer` & `/api/time-logs`)

### `POST /api/timer/start`
- **Description**: Start real-time tracking for a task.
- **Auth**: Required
- **Request Body**:
```json
{
  "taskId": "6643abc123..."
}
```
- **Responses**:
  - `201 Created`: Created active `TimeLog` (`endedAt: null`).
  - `404 Not Found`: Task does not exist or belongs to another user.
  - `409 Conflict`: User already has an active timer running.

### `POST /api/timer/stop`
- **Description**: Stop currently active tracking session.
- **Auth**: Required
- **Request Body**: (Optional `taskId` to confirm stopping specific task, or stops user's active timer).
- **Responses**:
  - `200 OK`: Completed `TimeLog` with calculated `duration` and `endedAt`.
  - `404 Not Found`: No active timer found for user.

### `GET /api/timer/active`
- **Description**: Retrieve current active timer session for page reload recovery.
- **Auth**: Required
- **Responses**:
  - `200 OK`: Active `TimeLog` or `null` if no timer is active.

### `GET /api/time-logs`
- **Description**: List historical time logs for the user.
- **Query Params (optional)**: `taskId`, `startDate`, `endDate`, `limit`, `page`.
- **Auth**: Required
- **Responses**:
  - `200 OK`: Array of time log items with task reference.

---

## 5. Daily Summary (`/api/summary/daily`)

### `GET /api/summary/daily`
- **Description**: Compute productivity summary for a given day.
- **Query Params (optional)**: `date` (YYYY-MM-DD), `tz` (timezone, e.g., `Asia/Kolkata` or `UTC`).
- **Auth**: Required
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "date": "2026-09-17",
    "totalTimeTrackedSeconds": 7200,
    "tasksWorkedOnCount": 3,
    "completedTasksCount": 2,
    "inProgressTasksCount": 2,
    "pendingTasksCount": 4,
    "tasksWorkedOn": [
      {
        "taskId": "6643abc123...",
        "title": "Follow up with UI Designer",
        "timeSpentSeconds": 3600
      }
    ]
  }
}
```

---

## 6. Optional AI Enhancement (`/api/ai/enhance-task`)

### `POST /api/ai/enhance-task`
- **Description**: Takes natural language task input and returns AI-suggested title and description.
- **Auth**: Required
- **Request Body**:
```json
{
  "rawInput": "follow up with designer"
}
```
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "suggestedTitle": "Follow up with UI Designer",
    "suggestedDescription": "Send a Slack message to confirm wireframe delivery status."
  }
}
```
  - `503 Service Unavailable`: AI service temporarily unavailable (fallback to manual entry).
