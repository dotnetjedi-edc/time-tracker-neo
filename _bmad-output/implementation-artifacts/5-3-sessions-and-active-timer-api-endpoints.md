---
title: "Sessions and Active Timer API Endpoints"
story_id: "5.3"
story_key: "5-3-sessions-and-active-timer-api-endpoints"
created: "2026-03-21"
status: "review"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 5: Backend Persistence & Multi-Device Sync"
tech_stack:
  [
    "TypeScript",
    "Vercel Serverless Functions",
    "Turso libSQL",
    "Clerk.dev",
    "Vitest",
  ]
files_to_modify:
  [
    "api/sessions.ts",
    "api/sessions/[id].ts",
    "api/active-timer.ts",
    "api/lib/schema.sql",
    "src/lib/api.ts",
  ]
code_patterns:
  [
    "The time domain uses a single active timer plus session, segment, and audit-event history",
    "Complex nested session data is stored as JSON text in SQL and parsed at the route boundary",
    "Routes should preserve the single-active-timer invariant per authenticated user",
  ]
test_patterns:
  [
    "Session endpoint tests should assert JSON serialization fidelity and newest-first ordering",
    "Active timer tests should assert upsert semantics and single-row replacement per user",
  ]
---

## Story 5.3: Sessions and Active Timer API Endpoints

Status: review

## Story

As a user,
I want timer sessions and the current active timer persisted remotely,
so that tracked time survives device switches, reloads, and browser resets.

## Acceptance Criteria

1. Given I am authenticated and start a timer, when the app persists active timing state, then the active timer record is stored remotely for my user only.
2. Given I load the app from another device or after a refresh, when the client requests the active timer state, then it can recover the running timer from the persisted timestamps.
3. Given I create, update, list, or delete sessions, when the API handles those requests, then the stored session, segment, and audit-event data round-trips without structural loss.
4. Given I stop a timer and finalize its session, when the stop flow completes, then the session persists and the active timer record is cleared.
5. Given a session or active timer request targets missing or foreign task data, when the route validates ownership, then the operation fails safely.

## Tasks / Subtasks

- [x] Task 1: Complete session collection and item endpoints (AC: 3, 5)
  - [x] Harden `api/sessions.ts` for validation, task ownership, and consistent default ordering.
  - [x] Complete `api/sessions/[id].ts` for update and delete behavior with user scoping.
  - [x] Keep JSON serialization of `segments` and `audit_events` stable across all CRUD paths.

- [x] Task 2: Complete the active timer persistence boundary (AC: 1, 2, 4, 5)
  - [x] Ensure `api/active-timer.ts` enforces a single active timer row per user.
  - [x] Validate that `task_id` and `session_id` refer to user-owned records before persisting.
  - [x] Make the delete path idempotent so stopping a timer twice does not corrupt state.

- [x] Task 3: Add regression coverage for time-domain edge cases (AC: 1, 2, 3, 4, 5)
  - [x] Cover active timer replacement, missing-row reads, and repeated delete behavior.
  - [x] Cover session filtering by task id and newest-first ordering.
  - [x] Cover malformed JSON-shaped payloads or missing required fields for session creation and updates.

## Dev Notes

### Story Foundation

- This story carries the core timer persistence behavior of Epic 5.
- It must preserve the single-active-timer contract already established in the frontend store and prior epics.
- Remote persistence should not erase the distinction between logical sessions, timed segments, and audit history introduced earlier in the product roadmap.

### Existing Code Reality

- `api/sessions.ts` and `api/active-timer.ts` already exist with initial CRUD scaffolding.
- The frontend typed API client already expects `segments`, `audit_events`, and active-timer timestamp fields in structured JSON form.
- The current local store still owns the authoritative timer logic, so backend validation should be additive and defensive rather than assuming the client is always correct.

### Guardrails

- Do not collapse session history into a flat duration-only record.
- Do not allow more than one active timer record per user.
- Do not accept session writes for tasks the authenticated user does not own.

### Testing Standards Summary

- Validate session CRUD and active-timer CRUD separately as well as in one end-to-end stop-flow sequence.
- Validate JSON round-tripping for nested session structures.
- Validate idempotent cleanup behavior and unauthorized access rejection.
