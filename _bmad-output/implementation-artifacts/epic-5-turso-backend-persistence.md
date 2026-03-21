# Epic 5: Backend Persistence & Multi-Device Sync

**Status:** planned  
**Priority:** P0 — Critical path for production use  
**Target:** Vercel (frontend + API routes) + Turso (libSQL database)

## Overview

Replace client-side localStorage persistence with a remote Turso database, enabling:

- Data survives PC restarts and browser clears
- Multi-device access (same user from multiple machines)
- Foundation for weekly time reports and timesheets
- Multi-user support via Clerk.dev authentication

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Auth      | Clerk.dev (multi-user, session management)  |
| API       | Vercel Serverless Functions (`/api` folder) |
| Database  | Turso (libSQL/SQLite, free tier)            |
| Client    | Existing React 19 + Zustand store (adapted) |
| Local dev | Turso local emulation via env vars          |

## Database Schema

```sql
-- Users are identified by Clerk userId (no users table needed)

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  comment TEXT DEFAULT '',
  total_time_seconds INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  tag_ids TEXT DEFAULT '[]',   -- JSON array serialized
  lifecycle_status TEXT DEFAULT 'active',
  lifecycle_archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  date TEXT NOT NULL,
  segments TEXT DEFAULT '[]',       -- JSON serialized SessionSegment[]
  audit_events TEXT DEFAULT '[]',   -- JSON serialized SessionAuditEvent[]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE active_timers (
  user_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  segment_start_time TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_task ON sessions(task_id);
```

---

## Story 5.1 — Vercel API Routes with Turso Connection

**As a** developer  
**I want** Vercel serverless API routes connected to Turso  
**So that** the frontend can read/write data from a persistent remote database

### Acceptance Criteria

**Given** the app is deployed on Vercel  
**When** an authenticated API request arrives  
**Then** the API route validates the Clerk session and connects to Turso

**Given** the dev environment  
**When** a developer runs `npm run dev`  
**Then** the app uses the Turso dev database (configured via `.env.local`)

**Given** the app is deployed  
**When** any API route is called without a valid Clerk session token  
**Then** it returns `401 Unauthorized`

### Implementation Notes

- Install: `@libsql/client`, `@clerk/backend`
- Create `/api/` folder with shared `db.ts` (Turso client) and `auth.ts` (Clerk validation)
- Create `vercel.json` to configure API routes
- `.env.local.example` with all required vars documented
- Schema migration runs via setup script, not automatically (to avoid accidental prod migration)

### Files to Create/Modify

- `api/lib/db.ts` — Turso client singleton
- `api/lib/auth.ts` — Clerk token validation helper
- `api/lib/schema.sql` — Database schema
- `vercel.json` — Route rewrites
- `.env.local.example` — Environment variable template
- `package.json` — Add `@libsql/client`, `@clerk/backend`, `@clerk/clerk-react`

---

## Story 5.2 — Tasks and Tags API Endpoints

**As a** user  
**I want** my tasks and tags stored in the database  
**So that** my data persists across device restarts and is accessible from any device

### Acceptance Criteria

**Given** I am authenticated  
**When** I call `GET /api/tasks`  
**Then** I receive all my tasks sorted by `position`

**Given** I am authenticated  
**When** I call `POST /api/tasks` with a valid task payload  
**Then** a new task is created and returned with a generated `id`

**Given** I am authenticated  
**When** I call `PUT /api/tasks/:id` with updates  
**Then** the task is updated and `updatedAt` is refreshed

**Given** I am authenticated  
**When** I call `DELETE /api/tasks/:id`  
**Then** the task and all its sessions are deleted

**Given** I call `GET /api/tasks` with no Clerk token  
**Then** I receive `401 Unauthorized`

Same pattern applies to `/api/tags`.

### Files to Create

- `api/tasks.ts` — List + Create tasks
- `api/tasks/[id].ts` — Update + Delete single task
- `api/tags.ts` — List + Create tags
- `api/tags/[id].ts` — Update + Delete single tag

---

## Story 5.3 — Sessions and Active Timer API Endpoints

**As a** user  
**I want** my timer sessions stored remotely  
**So that** my time tracking data is preserved even if I switch devices mid-session

### Acceptance Criteria

**Given** I am authenticated and start a timer  
**When** the app calls `PUT /api/active-timer`  
**Then** the active timer state is persisted to Turso under my `userId`

**Given** I reload the app on a different device  
**When** the app calls `GET /api/active-timer`  
**Then** it receives the running timer state and can resume the elapsed calculation

**Given** I stop a timer  
**When** the app calls `POST /api/sessions` with the completed session  
**Then** the session is saved and `DELETE /api/active-timer` clears the running state

**Given** I call `GET /api/sessions?taskId=xxx`  
**Then** I receive all sessions for that task, newest first

### Files to Create

- `api/sessions.ts` — List + Create sessions
- `api/sessions/[id].ts` — Update + Delete single session
- `api/active-timer.ts` — Get + Set + Delete active timer

---

## Story 5.4 — Frontend Store Migration to API Layer

**As a** user  
**I want** the app to transparently use the remote API  
**So that** I don't need to do anything different — it just works

### Acceptance Criteria

**Given** I am signed in with Clerk  
**When** the app loads  
**Then** it fetches tasks, tags, sessions, and active timer from the API (not localStorage)

**Given** I add or modify a task  
**When** the store action is called  
**Then** the change is sent to the API and reflected in the UI on success

**Given** the API call fails  
**When** the user performs an action  
**Then** the UI shows a non-blocking error indicator (toast or inline) without crashing

**Given** I am not signed in  
**When** I open the app  
**Then** I see the Clerk sign-in screen before accessing any data

### Implementation Notes

- Replace Zustand `persist` with async API calls
- Create `src/lib/api.ts` — typed fetch wrapper with Clerk token injection
- Keep same store action signatures — only internals change
- Remove `resilientBrowserStorage` and `createJSONStorage` from store
- Wrap app in `<ClerkProvider>` in `main.tsx`
- Gate app content behind `<SignedIn>` / `<SignedOut>` Clerk components

### Files to Modify

- `src/main.tsx` — Add Clerk provider
- `src/store/useTimeTrackerStore.ts` — Replace persist with API calls
- `src/lib/api.ts` — New typed fetch client
- `src/components/App.tsx` or `src/App.tsx` — Add auth gate

---

## Story 5.5 — GitHub Actions CI/CD with Turso and Clerk Secrets

**As a** developer  
**I want** every push to `main` to automatically deploy to production  
**So that** I never need manual deployment steps

### Acceptance Criteria

**Given** I push to `main`  
**When** all CI jobs pass  
**Then** the app is automatically deployed to Vercel production with correct env vars

**Given** I push to `develop`  
**When** all CI jobs pass  
**Then** the app is deployed to Vercel staging (preview URL)

**Given** I open a PR  
**When** CI runs  
**Then** a preview deployment is created and the URL is commented on the PR

**Given** the CI pipeline runs  
**When** the build step executes  
**Then** `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_TURSO_DATABASE_URL` env vars are available for the build

### Required GitHub Secrets

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
VITE_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

### Files to Modify

- `.github/workflows/ci.yml` — Add Turso + Clerk secrets injection, fix PR preview deployment

---

## Story 5.6 — Database Initialization Script

**As a** developer  
**I want** a one-command setup script for the database schema  
**So that** I can initialize a fresh Turso database without manual SQL

### Acceptance Criteria

**Given** a fresh Turso database with URL and token in `.env.local`  
**When** I run `npm run db:setup`  
**Then** all tables are created and the schema is ready for use

**Given** the schema already exists  
**When** I run `npm run db:setup`  
**Then** it completes without error (uses `CREATE TABLE IF NOT EXISTS`)

### Files to Create

- `scripts/setup-db.ts` — Reads schema SQL and executes via libsql client
- `package.json` — Add `"db:setup": "tsx scripts/setup-db.ts"` script
