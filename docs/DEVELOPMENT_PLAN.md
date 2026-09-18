# Task & Time Tracking App - Development Plan

This document outlines the 12 sequential milestones for the project. Each milestone represents a discrete, verifiable unit of work.

---

## Milestone 1: Project Scaffolding & Foundation Setup (Current)
- **Objective**: Establish monorepo structure, backend and frontend configurations, TypeScript standards, documentation, and development tooling.
- **Key Deliverables**:
  - Root `.gitignore`, `README.md`, convenience scripts.
  - Complete documentation in `/docs`.
  - Backend project scaffolding (`Node.js`, `Express`, `TypeScript`, `tsconfig.json`, `.env.example`, health check).
  - Frontend project scaffolding (`Vite`, `React`, `TypeScript`, `Tailwind CSS`, `.env.example`).
  - Verification that both builds and TypeScript checks pass without errors.

## Milestone 2: Authentication API
- **Objective**: Implement secure user registration, login, logout, session verification, and JWT HTTP-only cookie handling.
- **Key Deliverables**:
  - `User` Mongoose model with bcrypt password hashing and uniqueness indexing.
  - Explicit input validation for auth requests (name, email format, password strength).
  - Auth service and controller (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`).
  - JWT generation and verification utilities with HTTP-only cookie management.
  - Authentication middleware (`requireAuth`) enforcing protected routes.

## Milestone 3: Task Management API
- **Objective**: Implement secure, user-isolated CRUD endpoints for task management.
- **Key Deliverables**:
  - `Task` Mongoose model with compound indexes (`userId`, `status`).
  - Validation functions for task title, description, and status transitions (`pending`, `in_progress`, `completed`).
  - Task service and controller (`GET /api/tasks`, `POST /api/tasks`, `GET /api/tasks/:id`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id`).
  - Deletion safeguard returning `409 Conflict` ("Cannot delete a task while its timer is running.") if an active timer exists for the task.

## Milestone 4: Time Tracking API
- **Objective**: Implement session-based time tracking with single-active timer enforcement.
- **Key Deliverables**:
  - `TimeLog` Mongoose model (`startedAt`, `endedAt`, integer `duration` in seconds).
  - Start timer endpoint (`POST /api/timer/start`) enforcing single-active timer constraint per user.
  - Stop timer endpoint (`POST /api/timer/stop`) computing exact server-side duration.
  - Active timer lookup endpoint (`GET /api/timer/active`) for refresh recovery.
  - Time log history endpoint (`GET /api/time-logs`).

## Milestone 5: Daily Summary API
- **Objective**: Implement dynamic, timezone-aware daily productivity aggregation.
- **Key Deliverables**:
  - Timezone-aware date parsing utility.
  - MongoDB aggregation pipeline computing total tracked seconds and tasks worked on for a given day.
  - Summary controller and route (`GET /api/summary/daily`).

## Milestone 6: Frontend Foundation & Design System
- **Objective**: Establish client-side application shell, routing, Tailwind design tokens, and shared API clients.
- **Key Deliverables**:
  - Tailwind CSS custom palette, typography, and responsive container setup.
  - Axios centralized API client configured with `withCredentials: true`.
  - TanStack Query client configuration with sensible caching defaults.
  - App shell layouts (`AuthLayout`, `DashboardLayout`) with responsive navigation.

## Milestone 7: Authentication UI & Integration
- **Objective**: Build login and register user interfaces with form validation and route guards.
- **Key Deliverables**:
  - React Hook Form integration with client-side validation messages.
  - `AuthContext` managing user profile and login/logout state via `/api/auth/me`.
  - Protected route guard redirecting unauthenticated users to `/login`.

## Milestone 8: Task Management UI & Integration
- **Objective**: Build task management interface with natural-language creation, filters, and status controls.
- **Key Deliverables**:
  - Task creation form accepting natural language input.
  - Task card components with status badges and quick status toggle.
  - Task edit modal and delete confirmation.
  - Loading skeletons, empty states, and mutation error handling via TanStack Query.

## Milestone 9: Time Tracking UI & Real-Time Timer
- **Objective**: Build live elapsed timer widget and time tracking controls.
- **Key Deliverables**:
  - Persistent real-time timer widget calculating elapsed time from server `startedAt`.
  - Start/Stop tracking triggers with optimistic UI feedback.
  - Active timer recovery on browser refresh via `/api/timer/active`.
  - Time log session history table with formatted durations.

## Milestone 10: Dashboard & Daily Summary View
- **Objective**: Build daily productivity overview displaying key performance metrics.
- **Key Deliverables**:
  - Daily productivity metric cards (total time, tasks worked, status breakdown).
  - Tasks worked on breakdown list.
  - Bonus visual productivity chart (time distribution).

## Milestone 11: Optional AI Task Enhancement
- **Objective**: Add optional AI assistance for natural language task refinement.
- **Key Deliverables**:
  - Backend proxy route (`/api/ai/enhance-task`) calling AI provider securely.
  - Frontend "Enhance with AI" button with review and edit preview dialog.
  - Graceful fallback to manual creation on error or absence of API key.

## Milestone 12: QA, Optimization, Deployment & Documentation
- **Objective**: Complete end-to-end verification, production builds, deployment, and final documentation.
- **Key Deliverables**:
  - End-to-end testing across authentication, tasks, timer, and summaries.
  - Deployment configuration for Vercel, Render, and MongoDB Atlas.
  - Updated `README.md` with live demo link, test credentials, and architecture summary.
