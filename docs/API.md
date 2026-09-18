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
- **Description**: Retrieve all tasks belonging strictly to the authenticated user. Sorted newest first (`createdAt: -1`).
- **Query Params (optional)**:
  - `status`: Filter by status (`pending`, `in_progress`, `completed`).
- **Auth**: Required (JWT cookie)
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "6643abc12345678901234567",
        "title": "Follow up with UI Designer",
        "description": "Send Slack message regarding wireframe delivery",
        "status": "in_progress",
        "createdAt": "2026-09-18T10:00:00.000Z",
        "updatedAt": "2026-09-18T10:30:00.000Z"
      }
    ]
  }
}
```
  - `400 Bad Request`: Invalid status query parameter.
  - `401 Unauthorized`: Unauthenticated request.

### `POST /api/tasks`
- **Description**: Create a new task using standard or natural language input (e.g., *"follow up with designer"*).
- **Auth**: Required (JWT cookie)
- **Request Body**:
```json
{
  "title": "follow up with designer",
  "description": "Discuss wireframes for the timer module",
  "status": "pending"
}
```
- **Responses**:
  - `201 Created`:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "6643abc12345678901234567",
      "title": "follow up with designer",
      "description": "Discuss wireframes for the timer module",
      "status": "pending",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    }
  }
}
```
  - `400 Bad Request`: Title missing or empty, string length exceeded, or invalid status value.
  - `401 Unauthorized`: Authentication required.

### `GET /api/tasks/:id`
- **Description**: Retrieve a single task by ID. Strictly scoped to the authenticated user.
- **Auth**: Required (JWT cookie)
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "6643abc12345678901234567",
      "title": "follow up with designer",
      "description": "Discuss wireframes for the timer module",
      "status": "pending",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    }
  }
}
```
  - `400 Bad Request`: Invalid MongoDB ObjectId format.
  - `401 Unauthorized`: Authentication required.
  - `404 Not Found`: Task does not exist or belongs to another user (never exposes unauthorized existence).

### `PATCH /api/tasks/:id`
- **Description**: Update an existing task's title, description, or status. Only allowed fields (`title`, `description`, `status`) are accepted. Disallows changing `userId` or arbitrary fields.
- **Auth**: Required (JWT cookie)
- **Request Body** (at least one field required):
```json
{
  "title": "Follow up with UI Designer",
  "description": "Send Slack message regarding wireframe delivery",
  "status": "in_progress"
}
```
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "6643abc12345678901234567",
      "title": "Follow up with UI Designer",
      "description": "Send Slack message regarding wireframe delivery",
      "status": "in_progress",
      "createdAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T11:00:00.000Z"
    }
  }
}
```
  - `400 Bad Request`: Validation failure or unexpected fields.
  - `401 Unauthorized`: Authentication required.
  - `404 Not Found`: Task does not exist or belongs to another user.

### `DELETE /api/tasks/:id`
- **Description**: Delete a task. Prevents deletion if the task has an active timer session running (`endedAt: null`).
- **Auth**: Required (JWT cookie)
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```
  - `400 Bad Request`: Invalid MongoDB ObjectId format.
  - `401 Unauthorized`: Authentication required.
  - `404 Not Found`: Task does not exist or belongs to another user.
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
