---
title: "Frontend Store Migration to API Layer"
story_id: "5.4"
story_key: "5-4-frontend-store-migration-to-api-layer"
created: "2026-03-21"
status: "ready-for-dev"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 5: Backend Persistence & Multi-Device Sync"
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Zustand",
    "Clerk.dev",
    "Vite",
    "Vitest",
    "Playwright",
  ]
files_to_modify:
  [
    "src/main.tsx",
    "src/App.tsx",
    "src/lib/api.ts",
    "src/store/useTimeTrackerStore.ts",
    "src/store/useTimeTrackerStore.test.ts",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "App composition currently derives view state in App.tsx and keeps presentational components thin",
    "The existing Zustand store exposes synchronous action names that should remain stable even if internals become async",
    "Frontend API access is centralized in src/lib/api.ts and authenticated with Clerk tokens",
  ]
test_patterns:
  [
    "Store tests call actions directly and should continue validating domain invariants after async migration",
    "E2E coverage should validate auth gate, initial load, and non-crashing failure handling from the user's perspective",
  ]
---

## Story 5.4: Frontend Store Migration to API Layer

Status: ready-for-dev

## Story

As a user,
I want the app to use the remote API transparently,
so that persistence and multi-device access work without changing my normal time-tracking workflow.

## Acceptance Criteria

1. Given I am signed in, when the app loads, then it fetches tasks, tags, sessions, and active timer state from the API instead of localStorage.
2. Given I add, edit, reorder, or time a task, when the corresponding store action runs, then the change persists through the API and the UI stays consistent.
3. Given an API call fails, when the user performs an action, then the UI reports the failure non-destructively and does not crash.
4. Given I am not signed in, when I open the app, then I am gated behind Clerk sign-in before workspace data is shown.
5. Given the existing timer and session model, when the store internals are migrated, then the single-active-timer and reporting invariants remain intact.

## Tasks / Subtasks

- [ ] Task 1: Introduce Clerk-backed app bootstrapping and auth gating (AC: 1, 4)
  - [ ] Wrap the app with Clerk provider wiring in `src/main.tsx`.
  - [ ] Gate the main experience behind signed-in and signed-out states in `src/App.tsx` or the root composition layer.
  - [ ] Ensure the initial load waits for authenticated API access before showing persisted workspace data.

- [ ] Task 2: Replace local persistence internals with API-backed store operations (AC: 1, 2, 5)
  - [ ] Refactor `src/store/useTimeTrackerStore.ts` away from `persist` middleware and browser storage as the source of truth.
  - [ ] Keep existing public action names as stable as possible while introducing async backend synchronization.
  - [ ] Preserve timer, session, ordering, and lifecycle invariants while moving writes behind API calls.

- [ ] Task 3: Harden API client and failure handling paths (AC: 2, 3)
  - [ ] Ensure `src/lib/api.ts` remains the single typed boundary for backend access.
  - [ ] Add clear error propagation and user-facing failure feedback for save or load errors.
  - [ ] Avoid partial UI corruption when one backend request fails during startup or mutation flows.

- [ ] Task 4: Expand regression coverage for the async store model (AC: 1, 2, 3, 4, 5)
  - [ ] Update store tests for async actions, recovery behavior, and failed request handling.
  - [ ] Add end-to-end coverage for sign-in gating and API-backed persistence flows.
  - [ ] Retire or rewrite tests that assume localStorage is still the canonical persistence layer.

## Dev Notes

### Story Foundation

- This is the pivotal integration story of Epic 5 because it changes the source of truth seen by end users.
- It depends on Stories 5.1 through 5.3 being functionally stable first.
- The story should preserve the application's low-friction timer UX instead of introducing explicit save or sync steps.

### Existing Code Reality

- `src/lib/api.ts` already exists and is wired around Clerk's `getToken` helper.
- `src/store/useTimeTrackerStore.ts` still uses Zustand `persist` and `resilientBrowserStorage`, so the local-first path is not yet removed.
- The repo already includes Clerk dependencies in `package.json`, which lowers setup risk but does not mean the UI bootstrap is finished.

### Guardrails

- Do not break the current task card interactions, recovered timer behavior, weekly reporting, or session history model while changing persistence internals.
- Do not expose a half-loaded workspace as if writes are guaranteed when auth or API initialization has not completed.
- Avoid a large component-tree rewrite; keep orchestration centered around the current App-plus-store architecture.

### Testing Standards Summary

- Verify authenticated initial load, mutation success, mutation failure, and signed-out gating.
- Verify that the store still enforces the single-active-timer rule after becoming async.
- Verify that legacy local-only assumptions in tests are updated intentionally rather than silently bypassed.
