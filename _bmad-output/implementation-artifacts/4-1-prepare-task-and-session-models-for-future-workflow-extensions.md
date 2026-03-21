---
title: "Prepare Task and Session Models for Future Workflow Extensions"
story_id: "4.1"
story_key: "4-1-prepare-task-and-session-models-for-future-workflow-extensions"
created: "2026-03-21"
status: "review"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 4: Extensible Productivity Foundations"
tech_stack: ["TypeScript", "React 19", "Vite", "Zustand persist", "Vitest"]
files_to_modify:
  [
    "src/types.ts",
    "src/lib/taskModels.ts",
    "src/lib/taskModels.test.ts",
    "src/lib/weekly.ts",
    "src/store/useTimeTrackerStore.ts",
    "src/store/useTimeTrackerStore.test.ts",
  ]
code_patterns:
  [
    "Domain types remain centralized in src/types.ts and helpers in src/lib provide stable business-model boundaries",
    "The Zustand store remains the source of truth for task, session, and active-timer persistence",
    "Timer lifecycle rules preserve the single-active-timer invariant and recovered-session behavior",
  ]
test_patterns:
  [
    "Store tests validate persistence and timer invariants directly through useTimeTrackerStore",
    "Pure helper tests verify export-ready reporting snapshots without depending on UI rendering",
  ]
---

## Story 4.1: Prepare Task and Session Models for Future Workflow Extensions

Status: review

## Story

As a product team,
I want the task and session model boundaries to remain stable as new workflow features are added,
so that future archiving and export features can be implemented without redesigning the timer core.

## Acceptance Criteria

1. Given the current task, timer, and session domain model, when the extension-ready foundations are defined and implemented, then task lifecycle changes such as future archiving can be added without changing the single-active-timer contract, and session and reporting data remains consumable through stable model boundaries.
2. Given future export requirements are anticipated, when the reporting and session data structure is reviewed, then the current structure supports future export use cases without data model rework, and no current timer recovery behavior is regressed by those preparations.

## Tasks / Subtasks

- [x] Task 1: Introduce a stable task lifecycle boundary in the domain model (AC: 1)
  - [x] Add lifecycle metadata to the task model with a safe default for existing persisted data.
  - [x] Keep timer start behavior compatible with the single-active-timer invariant while refusing non-trackable lifecycle states.

- [x] Task 2: Introduce export-ready reporting boundaries for sessions and tasks (AC: 1, 2)
  - [x] Add pure helpers that expose normalized task lifecycle and reporting snapshots.
  - [x] Reuse the shared session-duration boundary in reporting code so future export flows do not need to rediscover core rules.

- [x] Task 3: Add regression coverage for lifecycle defaults, archived-task gating, and reporting snapshots (AC: 1, 2)
  - [x] Extend store tests to cover lifecycle migration defaults and archived-task timer blocking.
  - [x] Add pure helper tests for export-ready task reporting snapshots.

## Dev Notes

### Story Foundation

- This story maps directly to Epic 4 Story 4.1 in `_bmad-output/planning-artifacts/epics.md`.
- The implementation should prepare for future archiving and export work without adding any new end-user workflow in this story.
- The existing local-first architecture and recovered-timer behavior remain part of the product contract and must not regress.

### Existing Code Reality

- `src/store/useTimeTrackerStore.ts` currently contains the authoritative timer and session lifecycle logic.
- `src/lib/weekly.ts` computes reporting totals directly from task sessions, which makes it a good place to adopt a shared reporting boundary helper.
- Persisted tasks previously had no lifecycle metadata, so the story must normalize legacy state instead of assuming a storage reset.

### Guardrails

- Do not add archive UI, export UI, or backend persistence in this story.
- Do not break French UI copy, recovered-timer flows, or task total synchronization from sessions.
- Keep all changes additive and centered on model boundaries, not visual redesign.

### Testing Standards Summary

- Store coverage must prove that recovered timers still behave correctly after the lifecycle-preparation changes.
- Helper coverage must prove that export-ready reporting snapshots can be generated from existing tasks and sessions without mutating domain state.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Added lifecycle normalization for legacy tasks and kept recovered-timer migration behavior intact.
- Added export-ready reporting helpers for task/session snapshots and reused the shared session-duration helper in weekly reporting.
- Verified with focused unit and integration-safe validation commands.

### Completion Notes List

- Added a normalized task lifecycle boundary so future archive states can be introduced without rewriting timer actions.
- Added reporting snapshot helpers that expose stable task/session structures suitable for future export flows.
- Covered lifecycle defaults, archived-task timer blocking, and reporting snapshots with automated tests.

### File List

- `_bmad-output/implementation-artifacts/4-1-prepare-task-and-session-models-for-future-workflow-extensions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/types.ts`
- `src/lib/taskModels.ts`
- `src/lib/taskModels.test.ts`
- `src/lib/weekly.ts`
- `src/store/useTimeTrackerStore.ts`
- `src/store/useTimeTrackerStore.test.ts`

### Change Log

- 2026-03-21: Added lifecycle and reporting model boundaries to prepare for future archiving and export workflows.
