---
title: "Vercel API Routes with Turso Connection"
story_id: "5.1"
story_key: "5-1-vercel-api-routes-with-turso-connection"
created: "2026-03-21"
status: "review"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 5: Backend Persistence & Multi-Device Sync"
tech_stack:
  [
    "TypeScript",
    "Vercel Serverless Functions",
    "Clerk.dev",
    "Turso libSQL",
    "dotenv",
    "Vitest",
  ]
files_to_modify:
  [
    "api/lib/auth.ts",
    "api/lib/db.ts",
    "api/lib/schema.sql",
    "vercel.json",
    ".env.local.example",
    "package.json",
  ]
code_patterns:
  [
    "API handlers use VercelRequest and VercelResponse with per-method branching inside a default export",
    "Authentication is centralized behind api/lib/auth.ts and database access behind api/lib/db.ts",
    "Secrets stay server-side and are provided through environment variables instead of client bundling",
  ]
test_patterns:
  [
    "Backend readiness should be validated with local environment-backed smoke checks rather than browser-only testing",
    "Unauthorized request behavior should be covered explicitly for every protected route family",
  ]
---

## Story 5.1: Vercel API Routes with Turso Connection

Status: review

## Story

As a developer,
I want Vercel serverless API routes connected to Turso,
so that the frontend can read and write persistent data through a secure backend boundary.

## Acceptance Criteria

1. Given the app is deployed on Vercel, when an authenticated API request arrives, then the route validates the Clerk session and connects to Turso using server-side credentials only.
2. Given the dev environment, when a developer runs the app locally, then the backend reads a local or dev Turso configuration from environment variables without hardcoding secrets.
3. Given any protected route is called without a valid Clerk bearer token, when the request is processed, then the route returns 401 Unauthorized consistently.
4. Given the schema and environment contract for the backend, when a new developer or deployment target is configured, then the required variables and setup expectations are documented clearly.

## Tasks / Subtasks

- [x] Task 1: Harden the shared backend boundary for auth and database access (AC: 1, 3)
  - [x] Confirm `api/lib/auth.ts` rejects missing, malformed, and invalid bearer tokens consistently.
  - [x] Confirm `api/lib/db.ts` fails fast on missing database configuration and does not expose server-only secrets to the client.
  - [x] Keep all route families dependent on the shared helpers rather than duplicating auth or connection logic.

- [x] Task 2: Normalize the database schema and deployment contract (AC: 1, 2, 4)
  - [x] Ensure `api/lib/schema.sql` reflects the session-oriented model already used by the frontend domain.
  - [x] Confirm `vercel.json` routes API traffic correctly alongside the SPA frontend.
  - [x] Add or refresh `.env.local.example` so local setup documents Clerk and Turso variables explicitly.

- [x] Task 3: Add backend readiness validation for protected route access (AC: 2, 3)
  - [x] Add a lightweight validation path or documented smoke-check flow for local route startup.
  - [x] Cover unauthorized behavior for representative endpoints so the shared auth boundary cannot regress silently.

## Dev Notes

### Story Foundation

- This story establishes the secure backend access layer for the rest of Epic 5.
- It should be completed before deeper CRUD and frontend migration work proceeds.
- The architecture artifact already assumes Clerk-authenticated Vercel routes backed by Turso.

### Existing Code Reality

- `api/lib/auth.ts`, `api/lib/db.ts`, and `api/lib/schema.sql` already exist, so this story starts from a scaffold rather than a blank slate.
- The repository already contains `vercel.json`, a `db:setup` script entry, and API folders for tasks, tags, sessions, and active timer routes.
- The current frontend store is still local-first, which means this story should focus on the server boundary and environment contract rather than the client migration itself.

### Guardrails

- Do not leak `CLERK_SECRET_KEY` or `TURSO_AUTH_TOKEN` into any `VITE_` variable or browser bundle.
- Do not introduce privileged database access directly from React components.
- Keep route conventions aligned with existing `/api/*.ts` handlers instead of redesigning the backend structure.

### Testing Standards Summary

- Validate that protected routes return 401 when the authorization header is missing or invalid.
- Validate that backend startup fails clearly when required server-side environment variables are absent.
- Prefer deterministic local validation against a local libSQL or SQLite-compatible target instead of relying on hosted Turso for routine checks.
