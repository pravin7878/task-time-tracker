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

## 4. Time Tracking (`/api/tasks/:taskId/timer`, `/api/timer`, `/api/time-logs`)

### `POST /api/tasks/:taskId/timer/start`
- **Description**: Start real-time time tracking for a specific task.
- **Auth**: Required (JWT cookie)
- **URL Parameters**:
  - `taskId`: Valid 24-character hexadecimal MongoDB ObjectId.
- **Request Body**: Empty `{}`. (Client must **not** provide `userId`, `startedAt`, `endedAt`, or `duration`; supplying prohibited server-controlled fields returns `400 Bad Request`).
- **Responses**:
  - `201 Created`: Active `TimeLog` created with `endedAt: null` and `duration: null`.
  ```json
  {
    "success": true,
    "data": {
      "timeLog": {
        "id": "6643def12345678901234567",
        "userId": "6643abc12345678901234567",
        "taskId": "6643bba12345678901234567",
        "startedAt": "2026-09-18T12:00:00.000Z",
        "endedAt": null,
        "duration": null,
        "createdAt": "2026-09-18T12:00:00.000Z",
        "updatedAt": "2026-09-18T12:00:00.000Z"
      }
    }
  }
  ```
  - `400 Bad Request`: Invalid `taskId` format or client attempting to supply server-controlled fields.
  - `401 Unauthorized`: Unauthenticated request.
  - `404 Not Found`: Task does not exist or belongs to another user.
  - `409 Conflict`: User already has an active timer running.
  ```json
  {
    "success": false,
    "message": "Another timer is already running. Stop it before starting a new timer."
  }
  ```

### `POST /api/tasks/:taskId/timer/stop`
- **Description**: Stop the currently active timer for the specified task.
- **Auth**: Required (JWT cookie)
- **URL Parameters**:
  - `taskId`: Valid 24-character hexadecimal MongoDB ObjectId.
- **Request Body**: Empty `{}`.
- **Responses**:
  - `200 OK`: Completed `TimeLog` with server-calculated `endedAt` and integer `duration` (in seconds).
  ```json
  {
    "success": true,
    "data": {
      "timeLog": {
        "id": "6643def12345678901234567",
        "userId": "6643abc12345678901234567",
        "taskId": "6643bba12345678901234567",
        "startedAt": "2026-09-18T12:00:00.000Z",
        "endedAt": "2026-09-18T12:25:30.450Z",
        "duration": 1530,
        "createdAt": "2026-09-18T12:00:00.000Z",
        "updatedAt": "2026-09-18T12:25:30.450Z"
      }
    }
  }
  ```
  - `400 Bad Request`: Invalid `taskId` format.
  - `401 Unauthorized`: Unauthenticated request.
  - `404 Not Found`: No active timer found for this task and user (or task does not belong to user).
  ```json
  {
    "success": false,
    "message": "No active timer found for this task."
  }
  ```

### `GET /api/timer/active`
- **Description**: Retrieve the authenticated user's currently running active timer (`endedAt: null`). Allows the frontend to reconstruct timer state after page refresh, browser restart, or tab navigation.
- **Auth**: Required (JWT cookie)
- **Responses**:
  - `200 OK` (Timer active):
  ```json
  {
    "success": true,
    "data": {
      "activeTimer": {
        "id": "6643def12345678901234567",
        "userId": "6643abc12345678901234567",
        "taskId": "6643bba12345678901234567",
        "startedAt": "2026-09-18T12:00:00.000Z",
        "endedAt": null,
        "duration": null,
        "createdAt": "2026-09-18T12:00:00.000Z",
        "updatedAt": "2026-09-18T12:00:00.000Z"
      }
    }
  }
  ```
  - `200 OK` (No timer active):
  ```json
  {
    "success": true,
    "data": {
      "activeTimer": null
    }
  }
  ```
  - `401 Unauthorized`: Unauthenticated request.

### `GET /api/time-logs`
- **Description**: Retrieve chronological session history for all tasks belonging strictly to the authenticated user, ordered newest first (`startedAt: -1`).
- **Auth**: Required (JWT cookie)
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "timeLogs": [
        {
          "id": "6643def12345678901234567",
          "userId": "6643abc12345678901234567",
          "taskId": "6643bba12345678901234567",
          "startedAt": "2026-09-18T12:00:00.000Z",
          "endedAt": "2026-09-18T12:25:30.000Z",
          "duration": 1530,
          "createdAt": "2026-09-18T12:00:00.000Z",
          "updatedAt": "2026-09-18T12:25:30.000Z"
        }
      ]
    }
  }
  ```
  - `401 Unauthorized`: Unauthenticated request.

### `GET /api/tasks/:taskId/time-logs`
- **Description**: Retrieve session logs and computed total tracked time strictly for a specific task owned by the authenticated user.
- **Auth**: Required (JWT cookie)
- **URL Parameters**:
  - `taskId`: Valid 24-character hexadecimal MongoDB ObjectId.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "taskId": "6643bba12345678901234567",
      "totalTrackedSeconds": 3600,
      "timeLogs": [
        {
          "id": "6643def12345678901234567",
          "userId": "6643abc12345678901234567",
          "taskId": "6643bba12345678901234567",
          "startedAt": "2026-09-18T12:00:00.000Z",
          "endedAt": "2026-09-18T12:30:00.000Z",
          "duration": 1800,
          "createdAt": "2026-09-18T12:00:00.000Z",
          "updatedAt": "2026-09-18T12:30:00.000Z"
        },
        {
          "id": "6643def98765432109876543",
          "userId": "6643abc12345678901234567",
          "taskId": "6643bba12345678901234567",
          "startedAt": "2026-09-18T11:00:00.000Z",
          "endedAt": "2026-09-18T11:30:00.000Z",
          "duration": 1800,
          "createdAt": "2026-09-18T11:00:00.000Z",
          "updatedAt": "2026-09-18T11:30:00.000Z"
        }
      ]
    }
  }
  ```
  - `400 Bad Request`: Invalid `taskId` format.
  - `401 Unauthorized`: Unauthenticated request.
  - `404 Not Found`: Task does not exist or belongs to another user.

### Total Time Per Task Semantics:
- **Calculation**: Dynamically derived as `SUM(duration)` across all completed sessions (`endedAt: { $ne: null }`) belonging to `userId` and `taskId`.
- **Active Session Policy**: The currently running active session is excluded from the persisted completed duration total until it is officially stopped.
- **Data Integrity**: Total time is never stored as a mutable or redundant `Task.totalTime` property on the `Task` document, guaranteeing complete normalization and zero drift.

---

## 5. Daily Summary (`/api/summary`)

### `GET /api/summary/today`
- **Description**: Returns an authoritative, timezone-aware productivity summary for the authenticated user's current calendar day.
- **Auth**: Required (JWT cookie)
- **Query Parameters**:
  - `timezone` (string, **required**): A valid IANA timezone identifier representing the client's local timezone (e.g., `Asia/Kolkata`, `America/New_York`, `Europe/London`, `Australia/Sydney`, `UTC`).
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "date": "2026-09-18",
      "timezone": "Asia/Kolkata",
      "totalTrackedTime": 7200,
      "tasksWorkedOn": [
        {
          "taskId": "6643abc12345678901234567",
          "title": "Follow up with UI Designer",
          "timeSpentSeconds": 3600
        },
        {
          "taskId": "6643def98765432109876543",
          "title": "Implement Daily Summary API",
          "timeSpentSeconds": 3600
        }
      ],
      "completedTasks": [
        {
          "id": "6643abc12345678901234567",
          "title": "Follow up with UI Designer",
          "description": "Send Slack message regarding wireframe delivery",
          "status": "completed",
          "createdAt": "2026-09-18T10:00:00.000Z",
          "updatedAt": "2026-09-18T11:00:00.000Z"
        }
      ],
      "inProgressTasks": [
        {
          "id": "6643def98765432109876543",
          "title": "Implement Daily Summary API",
          "description": "Build timezone-aware endpoint",
          "status": "in_progress",
          "createdAt": "2026-09-18T11:00:00.000Z",
          "updatedAt": "2026-09-18T11:30:00.000Z"
        }
      ],
      "pendingTasks": []
    }
  }
  ```
  - `400 Bad Request` (Missing parameter):
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": {
      "timezone": "Timezone parameter is required"
    }
  }
  ```
  - `400 Bad Request` (Invalid timezone identifier):
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": {
      "timezone": "Invalid timezone parameter. Must be a valid IANA timezone identifier (e.g., 'Asia/Kolkata', 'America/New_York')."
    }
  }
  ```
  - `401 Unauthorized`: Unauthenticated request.

### Core Calculation & Timezone Semantics:
- **Server UTC Authoritative**: All timestamps in MongoDB (`startedAt`, `endedAt`, `createdAt`) are stored as UTC instants (`Date` objects).
- **Timezone Boundary Determination**: The client's `timezone` parameter determines the start of the local calendar day (00:00:00.000 local) and the start of the next local day (00:00:00.000 of tomorrow local). These boundaries are converted to UTC instants: `[startOfDay, startOfNextDay)`.
- **Session Overlap & Cross-Midnight Splitting**: Tracked time is calculated purely based on the overlap between each session and the local day boundaries:
  $$\text{overlapStart} = \max(\text{sessionStart}, \text{startOfDay})$$
  $$\text{overlapEnd} = \min(\text{sessionEnd}, \text{startOfNextDay})$$
  $$\text{duration} = \max\left(0, \left\lfloor\frac{\text{overlapEnd} - \text{overlapStart}}{1000}\right\rfloor\right)$$
  Sessions crossing midnight (e.g., 23:30 to 00:30) are partitioned without double-counting (30 minutes credited to Day 1, 30 minutes credited to Day 2).
- **Active Timer Handling**: If a timer is currently running (`endedAt: null`), its temporary end is assumed to be the current instant (`new Date()`). Its elapsed seconds today are included in `totalTrackedTime` and its task is included in `tasksWorkedOn`. The persisted `TimeLog` in MongoDB is **never** modified for summary generation.
- **Strict Data Isolation**: All task lists and session logs are strictly filtered by `userId: req.user.id`.

---

## 6. AI Task Suggestions (`/api/ai`)

### `POST /api/ai/task-suggestion`
- **Description**: Accepts a user's natural language task input and uses Google Gemini 3.6 Flash (`@google/genai`) to generate an improved task title and structured description. Suggestion only: does NOT create or modify tasks in MongoDB.
- **Auth**: Required (JWT cookie; Bearer authorization header also accepted for programmatic testing)
- **Headers**:
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "input": "Need to prepare monthly sales report and send it to manager"
}
```
- **Validation Rules**:
  - Request body must be a JSON object.
  - `input` is required and must be a string.
  - Whitespace is trimmed; empty input is rejected with HTTP 400.
  - Maximum input length is 1000 characters; longer input rejected with HTTP 400.
  - No `userId` is accepted from the body.
- **Responses**:
  - `200 OK`:
```json
{
  "success": true,
  "data": {
    "title": "Prepare Monthly Sales Report",
    "description": "Prepare the monthly sales report and send it to the manager."
  }
}
```
  - `400 Bad Request` (Missing or invalid input):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "input": "Task input cannot be empty"
  }
}
```
  - `401 Unauthorized`: Missing or invalid authentication token.
```json
{
  "success": false,
  "message": "Authentication required"
}
```
  - `503 Service Unavailable`: Gemini provider failure, unconfigured API key, or malformed AI output.
```json
{
  "success": false,
  "message": "AI suggestion service is temporarily unavailable"
}
```

### Core Architecture & Security Principles:
- **Backend-Only Security**: `GEMINI_API_KEY` is maintained strictly on the backend and is never exposed to the frontend or sent over the wire.
- **Dynamic Model Configuration**: Reads from `process.env.GEMINI_MODEL` (default: `gemini-3.6-flash`), never hard-coded.
- **Suggestion Only (Zero Side Effects)**: Gemini suggestions never automatically create tasks, update statuses, start/stop timers, or persist records into MongoDB.
- **Structured JSON Output**: Utilizes `@google/genai` JSON schema enforcement (`responseSchema`), with application-level parsing, type verification, and length bounds sanitization.
