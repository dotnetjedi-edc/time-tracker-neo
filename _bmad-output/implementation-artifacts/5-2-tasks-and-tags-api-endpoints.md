---
title: "Tasks and Tags API Endpoints"
story_id: "5.2"
story_key: "5-2-tasks-and-tags-api-endpoints"
created: "2026-03-21"
status: "ready-for-dev"
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
    "api/tasks.ts",
    "api/tasks/[id].ts",
    "api/tags.ts",
    "api/tags/[id].ts",
    "api/lib/auth.ts",
    "api/lib/db.ts",
  ]
code_patterns:
  [
    "List and create handlers live at the collection route while update and delete live in the [id] route sibling",
    "Rows are translated from SQL-friendly shapes into API JSON payloads before returning to the client",
    "Every query must be scoped by Clerk userId to preserve multi-user isolation",
  ]
test_patterns:
  [
    "Endpoint coverage should include success, validation, ownership, and unauthorized paths",
    "Ordering and JSON field serialization should be asserted explicitly for tasks and tags",
  ]
---

## Story 5.2: Tasks and Tags API Endpoints

Status: ready-for-dev

## Story

As a user,
I want my tasks and tags stored in the database,
so that my workspace state persists across restarts and remains available on any signed-in device.

## Acceptance Criteria

1. Given I am authenticated, when I call GET `/api/tasks`, then I receive only my tasks sorted by `position`.
2. Given I am authenticated, when I create, update, or delete a task, then the database is updated and the response reflects the saved record.
3. Given I am authenticated, when I call the tag endpoints, then I can list, create, update, and delete only my own tags.
4. Given a request is missing authentication or targets another user's data, when the API handles it, then the request is rejected with the correct status code.
5. Given task records contain JSON-backed fields such as tag ids, when the API reads and writes them, then serialization remains stable and predictable.

## Tasks / Subtasks

- [ ] Task 1: Complete collection endpoints for tasks and tags (AC: 1, 3, 5)
  - [ ] Verify `api/tasks.ts` and `api/tags.ts` validate payloads before writing to the database.
  - [ ] Keep task ordering stable by preserving `position` semantics on create and list operations.
  - [ ] Normalize JSON-backed fields such as `tag_ids` on both read and write paths.

- [ ] Task 2: Complete item endpoints for tasks and tags (AC: 2, 3, 4)
  - [ ] Ensure `api/tasks/[id].ts` supports update and delete with ownership checks.
  - [ ] Ensure `api/tags/[id].ts` supports update and delete with ownership checks.
  - [ ] Define task-delete cascade behavior clearly so related sessions are removed or rejected consistently with the Epic 5 data model.

- [ ] Task 3: Add regression coverage for validation and data isolation (AC: 1, 2, 3, 4, 5)
  - [ ] Cover missing-name and malformed-payload cases for task and tag creation.
  - [ ] Cover cross-user access rejection on update and delete routes.
  - [ ] Cover task ordering and tag-id JSON round-tripping on list and update flows.

## Dev Notes

### Story Foundation

- This story operationalizes the first user-visible persistence slice of Epic 5.
- It must preserve the task and tag behavior already established in the current local-first app.
- The API contract should remain stable enough for Story 5.4 to adopt without redesigning store action signatures.

### Existing Code Reality

- `api/tasks.ts` and `api/tags.ts` already implement initial GET and POST scaffolds.
- The repository already contains matching `[id]` route folders for both tasks and tags, which should be finished or hardened instead of replaced.
- The frontend already has a typed API client in `src/lib/api.ts`, so backend response shapes should stay consistent with that contract.

### Guardrails

- Do not trust client-provided `user_id` values; derive user scope strictly from the authenticated token.
- Do not let task ordering drift because of inconsistent `position` updates.
- Do not break the current lifecycle-related task fields that were introduced for Epic 4 foundations.

### Testing Standards Summary

- Cover list, create, update, delete, unauthorized, and cross-user cases for both resource families.
- Validate that task deletion handles session relationships intentionally rather than leaving orphaned rows.
- Validate that JSON serialization of `tag_ids` remains compatible with the frontend's typed expectations.
