# Task & Time Tracking App

A professional full-stack productivity web application that allows users to manage tasks, track time spent on tasks using an authoritative real-time timer, and view daily productivity summaries.

---

## Tech Stack

### Frontend
- **Framework**: React 18 (`^18.3.1`) with TypeScript (`^5.7.3`) and Vite (`^6.0.7`)
- **Styling**: Tailwind CSS (`^3.4.17`)
- **Routing**: React Router DOM v6 (`^6.28.1`)
- **State & Data Fetching**: TanStack Query (React Query v5, `^5.64.1`)
- **Forms**: React Hook Form (`^7.54.2`)
- **HTTP Client**: Axios (`^1.7.9`, configured with `withCredentials: true`)
- **Icons**: React Icons (`^5.4.0`)
- **AI Integration (Optional)**: "Improve with Gemini" natural language task enhancement flow

### Backend
- **Runtime & Framework**: Node.js (engines: `>=18.0.0 <=22.x`) & Express (`^4.21.2`) with TypeScript (`^5.9.3`)
- **Database & ODM**: MongoDB Atlas & Mongoose (`^8.9.5`)
- **Authentication**: JSON Web Tokens (`jsonwebtoken ^9.0.2`) stored in secure HTTP-only cookies & bcrypt (`^5.1.1`)
- **Timezone Management**: Luxon (`^3.7.2`) for IANA timezone computations
- **AI Engine (Optional)**: Google Gemini 3.6 Flash via official `@google/genai` SDK (`^2.23.0`)
- **Security**: Helmet (`^8.0.0`), CORS (`^2.8.5`), cookie-parser (`^1.4.7`)
- **Dev Runner & Tests**: tsx (`^4.19.2`)

### Deployment Architecture
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas

---

## Key Architectural Principles

1. **Server Authoritative Time**: Server timestamps (`startedAt`, `endedAt`) determine exact duration in integer seconds. The client display calculates elapsed time dynamically from server timestamps and is not the source of truth.
2. **At Most One Active Timer**: A user is restricted to at most one active running timer at any given time across all tasks (zero running timers when inactive), enforced by a MongoDB partial unique index (`endedAt: null`).
3. **Data Isolation**: All resources (tasks, time logs, summaries) are strictly isolated and queried by the authenticated user's ID (`req.user.id`).
4. **Secure Cookie Auth**: JWT tokens are transmitted exclusively through HTTP-only cookies. HTTP-only cookies prevent client-side JavaScript from directly reading the JWT, reducing the risk of token exfiltration through XSS.
5. **Dynamic Aggregation (No `Task.totalTime`)**: Total time spent per task and daily summary metrics are derived dynamically from completed `TimeLog` records, preventing data drift and denormalization anomalies.
6. **Optional AI Assistance**: Gemini AI suggestions (`POST /api/ai/task-suggestion`) are strictly optional and suggestion-only. The AI never creates tasks automatically, never alters task status, and never starts timers.

---

## Project Structure

```
task-time-tracker/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/           # Database (db.ts) and environment (env.ts)
│   │   ├── controllers/      # Functional request handlers (auth, task, timer, summary, ai)
│   │   ├── middleware/       # Auth (requireAuth) & centralized error handling
│   │   ├── models/           # Mongoose schemas (User, Task, TimeLog)
│   │   ├── routes/           # API routes (auth, task, timer, timeLog, summary, ai)
│   │   ├── services/         # Business logic layer (functional services)
│   │   ├── types/            # TypeScript interfaces & domain types
│   │   ├── utils/            # JWT, bcrypt, functional error factories
│   │   ├── validators/       # Explicit runtime validation functions (no Zod)
│   │   ├── app.ts            # Express application bootstrap (CORS, Helmet, cookies)
│   │   ├── server.ts         # HTTP server entrypoint
│   │   ├── test_auth.ts      # Automated auth test suite
│   │   ├── test_tasks.ts     # Automated task CRUD test suite
│   │   ├── test_timer.ts     # Automated time tracking test suite
│   │   ├── test_summary.ts   # Automated daily summary test suite
│   │   └── test_ai.ts        # Automated AI suggestion test suite
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                 # React + Vite + TypeScript Client
│   ├── src/
│   │   ├── components/       # UI components (tasks, timer, layout, common)
│   │   ├── hooks/            # Custom hooks (useAuth, useTasks, useTimeTracking, useDailySummary, useTaskSuggestion)
│   │   ├── layouts/          # Responsive AppLayout (desktop sidebar, mobile drawer, header)
│   │   ├── lib/              # Centralized Axios client (apiClient withCredentials: true)
│   │   ├── pages/            # LoginPage, RegisterPage, DashboardPage, TasksPage, TimeLogsPage
│   │   ├── routes/           # ProtectedRoute and PublicRoute guards
│   │   ├── services/         # Typed API client services
│   │   ├── types/            # Shared TypeScript domain types
│   │   ├── utils/            # Date, time, and duration formatting helpers
│   │   ├── App.tsx           # Application root router & QueryClientProvider
│   │   ├── main.tsx          # React DOM entrypoint
│   │   └── index.css         # Tailwind directives & design system styles
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/                     # Comprehensive project documentation
│   ├── REQUIREMENTS.md       # Requirements specification
│   ├── ARCHITECTURE.md       # Full system architecture & schema design
│   ├── API.md                # REST API endpoint contracts & examples
│   ├── DEVELOPMENT_PLAN.md   # Final milestone execution history
│   └── AI_DEVELOPMENT_LOG.md # Historical AI-assisted development record
├── .gitignore
├── package.json              # Monorepo development scripts
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js (v18.x to v22.x)
- npm (v9+ or v10+)
- MongoDB Atlas cluster connection string or local MongoDB instance

### Installation

1. **Clone repository**:
   ```bash
   git clone https://github.com/pravin7878/task-time-tracker.git
   cd task-time-tracker
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**:
   - Backend:
     ```bash
     cp backend/.env.example backend/.env
     ```
     Configure:
     ```ini
     PORT=8080
     NODE_ENV=development
     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/task_time_tracker
     JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
     JWT_EXPIRES_IN=7d
     FRONTEND_URL=http://localhost:5173
     GEMINI_API_KEY=your_gemini_api_key_here  # Optional
     GEMINI_MODEL=gemini-3.6-flash
     ```
   - Frontend:
     ```bash
     cp frontend/.env.example frontend/.env
     ```
     Configure `VITE_API_URL`:
     ```ini
     VITE_API_URL=http://localhost:8080/api
     ```

4. **Run Development Servers**:
   - Backend:
     ```bash
     npm run dev:backend
     ```
   - Frontend:
     ```bash
     npm run dev:frontend
     ```

5. **Run Backend Test Suites**:
   ```bash
   npm run test:auth --prefix backend
   npm run test:tasks --prefix backend
   npm run test:timer --prefix backend
   npm run test:summary --prefix backend
   npm run test:ai --prefix backend
   ```

---

## Live Deployment & Demo Access

- **Frontend Application**: https://task-time-tracker-psi.vercel.app
- **Backend API**: https://task-time-tracker-ft9a.onrender.com
- **Health Check Endpoint**: https://task-time-tracker-ft9a.onrender.com/api/health

### Demo Account (Recommended)

Reviewers and evaluators can log in immediately using the pre-configured demo account:

- **Email**: `demo@gmail.com`
- **Password**: `123456`

> Email verification is not currently required, so reviewers can use this demo account to access the deployed application directly.

*(Evaluators can also register an independent account via the Sign Up page at `/register` if preferred.)*

---

## Documentation

For detailed specifications, architectural diagrams, and API contracts, refer to the `/docs` directory:
- [Requirements Specification](docs/REQUIREMENTS.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [REST API Specification](docs/API.md)
- [Development Plan & History](docs/DEVELOPMENT_PLAN.md)
- [AI Assisted Development Log](docs/AI_DEVELOPMENT_LOG.md)
