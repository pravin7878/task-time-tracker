# Task & Time Tracking App

A professional full-stack productivity web application that allows users to manage tasks, track time spent on tasks using an authoritative real-time timer, and view daily productivity summaries.

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v6)
- **State & Data Fetching**: TanStack Query (React Query v5)
- **Forms**: React Hook Form
- **HTTP Client**: Axios (configured with HTTP-only cookies)
- **Icons**: React Icons

### Backend
- **Runtime & Framework**: Node.js & Express with TypeScript
- **Database & ODM**: MongoDB Atlas & Mongoose
- **Authentication**: JSON Web Tokens (JWT) stored in secure HTTP-only cookies & bcrypt
- **Security**: Helmet, CORS (strict origin & credentials), cookie-parser
- **Dev Runner**: tsx (TypeScript Execute)

### Deployment Architecture
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas

---

## Key Architectural Principles

1. **Server Authoritative Time**: Server timestamps (`startedAt`, `endedAt`) determine exact duration in integer seconds. The client display calculates elapsed time dynamically from server timestamps and is not the source of truth.
2. **Single Active Timer**: A user is restricted to exactly one active running timer at any given time across all tasks.
3. **Data Isolation**: All resources (tasks, time logs, summaries) are strictly isolated and queried by the authenticated user's ID (`req.user.id`).
4. **Secure Cookie Auth**: JWT tokens are transmitted exclusively through HTTP-only cookies, eliminating the risk of XSS token leakage.

---

## Project Structure

```
task-time-tracker/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/           # Database and environment configurations
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth & error handling middleware
│   │   ├── models/           # Mongoose data models
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic layer
│   │   ├── types/            # TypeScript interfaces & domain types
│   │   ├── utils/            # Helper utilities
│   │   ├── validators/       # Explicit runtime validation functions
│   │   ├── app.ts            # Express application configuration
│   │   └── server.ts         # HTTP server entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                 # React + Vite + TypeScript Client
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Contexts (AuthContext)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # App and Auth layout shells
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # Axios API clients
│   │   ├── types/            # Shared frontend types
│   │   ├── utils/            # Date & duration formatting utilities
│   │   ├── App.tsx           # Application root router
│   │   ├── main.tsx          # React DOM entrypoint
│   │   └── index.css         # Tailwind styles & theme variables
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/                     # System documentation
│   ├── REQUIREMENTS.md       # Full requirements specification
│   ├── ARCHITECTURE.md       # Architecture & schema design
│   ├── API.md                # REST API documentation
│   ├── DEVELOPMENT_PLAN.md   # 12-milestone development plan
│   └── AI_DEVELOPMENT_LOG.md # Record of AI prompts and milestones
├── .gitignore
├── package.json              # Monorepo development scripts
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- MongoDB Atlas cluster or local MongoDB instance

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
     Fill in `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL`.
   - Frontend:
     ```bash
     cp frontend/.env.example frontend/.env
     ```
     Fill in `VITE_API_URL` (defaults to `http://localhost:5000/api`).

4. **Run Development Servers**:
   - Backend:
     ```bash
     npm run dev:backend
     ```
   - Frontend:
     ```bash
     npm run dev:frontend
     ```

---

## Live Deployment Links
- **Frontend App**: *[Pending Deployment in Milestone 12]*
- **Backend API**: *[Pending Deployment in Milestone 12]*
- **Test Credentials**: *[To be provided with deployment]*

---

## Documentation
For detailed system design and API contracts, refer to the `/docs` directory:
- [Requirements](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Development Plan](docs/DEVELOPMENT_PLAN.md)
- [AI Development Log](docs/AI_DEVELOPMENT_LOG.md)
