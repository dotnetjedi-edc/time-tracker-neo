---
title: "Database Initialization Script"
story_id: "5.6"
story_key: "5-6-database-initialization-script"
created: "2026-03-21"
status: "review"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 5: Backend Persistence & Multi-Device Sync"
tech_stack: ["TypeScript", "tsx", "dotenv", "Turso libSQL", "Node.js"]
files_to_modify:
  ["scripts/setup-db.ts", "api/lib/schema.sql", "package.json", "README.md"]
code_patterns:
  [
    "Operational scripts live under scripts/ and are invoked through package.json scripts",
    "Schema management is file-based through api/lib/schema.sql rather than embedded inline across many files",
    "Database bootstrap should be idempotent and safe to rerun in local and remote environments",
  ]
test_patterns:
  [
    "Operational validation should prove repeated execution succeeds without destructive side effects",
    "Setup script checks should validate clear failure messages for missing environment configuration",
  ]
---

## Story 5.6: Database Initialization Script

Status: review

## Story

As a developer,
I want a one-command database setup script,
so that a fresh local or hosted Turso database can be initialized without manual SQL steps.

## Acceptance Criteria

1. Given a fresh database with valid environment variables, when I run `npm run db:setup`, then the required tables and indexes are created successfully.
2. Given the schema already exists, when I run `npm run db:setup` again, then the script completes without error and does not duplicate objects.
3. Given environment variables are missing or invalid, when I run the script, then it fails with a clear actionable error.
4. Given another developer reads the project docs, when they need to initialize the database, then the required command and prerequisites are documented clearly.

## Tasks / Subtasks

- [x] Task 1: Finalize the setup script execution path (AC: 1, 2, 3)
  - [x] Ensure `scripts/setup-db.ts` reads `api/lib/schema.sql` and executes statements safely.
  - [x] Make repeated runs idempotent by relying on `IF NOT EXISTS` semantics in the schema.
  - [x] Emit clear failures for missing database URL, auth token, or schema load problems.

- [x] Task 2: Keep schema ownership centralized and maintainable (AC: 1, 2)
  - [x] Ensure `api/lib/schema.sql` is the single source of truth used by both API development and setup tooling.
  - [x] Keep schema changes aligned with the task, tag, session, and active-timer models used elsewhere in Epic 5.

- [x] Task 3: Document developer setup expectations (AC: 4)
  - [x] Confirm `package.json` exposes the setup command with the expected runtime.
  - [x] Add concise setup instructions to README or backend setup notes for local and hosted usage.

## Dev Notes

### Story Foundation

- This story supports the practical onboarding and repeatability of Epic 5.
- It should be safe for local development, CI-style local runs, and first-time hosted database setup.
- The story intentionally avoids automatic migration at application startup.

### Existing Code Reality

- `scripts/setup-db.ts` already exists and `package.json` already exposes `db:setup`.
- `api/lib/schema.sql` already exists, so this story is about hardening and documenting the bootstrap path rather than inventing it.
- The backend helper `api/lib/db.ts` already requires Turso environment variables at runtime, which the setup flow should mirror clearly.

### Guardrails

- Do not run schema creation automatically from request handlers or client startup paths.
- Do not make the setup script destructive for existing data.
- Keep the script deterministic and readable rather than introducing a heavyweight migration framework unless later required.

### Testing Standards Summary

- Verify the script works on a fresh schema, a pre-existing schema, and a missing-env configuration.
- Verify error messages are actionable enough for a developer to fix local setup quickly.
- Verify documentation matches the actual command and environment contract.
