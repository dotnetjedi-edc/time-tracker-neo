---
title: "Manual Time Entry and Session History"
slug: "manual-time-entry-and-session-history"
created: "2026-03-20"
status: "ready-for-dev"
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Zustand persist",
    "Tailwind CSS",
    "Vitest",
    "Playwright",
    "dnd-kit",
    "lucide-react",
  ]
files_to_modify:
  [
    "src/types.ts",
    "src/store/useTimeTrackerStore.ts",
    "src/App.tsx",
    "src/components/Header.tsx",
    "src/components/TaskCard.tsx",
    "src/components/TaskGrid.tsx",
    "src/components/TaskModal.tsx",
    "src/components/WeeklyView.tsx",
    "src/lib/time.ts",
    "src/lib/weekly.ts",
    "src/store/useTimeTrackerStore.test.ts",
    "src/lib/time.test.ts",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Centralized Zustand store with persist middleware",
    "Parent-level store selectors passed down as props",
    "Flat time entry aggregation for weekly reports",
    "French UI copy with English code identifiers",
    "Tailwind utility-first components with dedicated modal/view naming",
  ]
test_patterns:
  [
    "Vitest unit tests call store actions directly",
    "Store reset via resetTimeTrackerStore before each test",
    "Playwright clears localStorage before each scenario",
    "E2E selectors rely on French accessible labels",
  ]
---

# Tech-Spec: Manual Time Entry and Session History

**Created:** 2026-03-20

## Overview

### Problem Statement

The current time tracker only records time through a single active timer that produces flat time entries when stopped. Users cannot add time manually, cannot edit sessions in detail, and cannot inspect a usable history of activations, reactivations, stops, and manual corrections for a given task.

### Solution

Introduce a richer session model that supports both quick manual duration entry and detailed session editing. Add a dedicated session history view that shows lifecycle events and manual changes, while merging history only for immediate stop/reactivate cycles on the same task and splitting history into separate sessions when the user switches to another task before returning.

### Scope

**In Scope:**

- Add quick manual time entry for a task.
- Add detailed session creation and editing with start and end times.
- Preserve per-task session history in a dedicated view.
- Record lifecycle and manual-edit audit events for sessions.
- Merge contiguous same-task stop/reactivate cycles into one logical session.
- Split sessions when the user switches to a different task before returning.
- Update store, types, derived views, and tests to support the new model.

**Out of Scope:**

- Server synchronization.
- Multi-user support.
- Data export.

## Context for Development

### Codebase Patterns

- State management is centralized in a persisted Zustand store in `src/store/useTimeTrackerStore.ts`, with all actions defined inline and consumed through selectors in `App.tsx`.
- The current domain model uses a single `activeTimer` plus flat `timeEntries`; `Task.totalTimeSeconds` is denormalized and updated during timer stop/switch actions.
- `App.tsx` owns live timer calculations, modal state, and view switching, then passes derived props into presentational components instead of letting children read the store directly.
- Navigation is currently a binary `grid` or `week` toggle in `Header.tsx`, so a dedicated history surface will require either expanding `ViewMode` and header navigation or launching a dedicated modal/panel from task context.
- Weekly reporting in `src/lib/weekly.ts` aggregates only by `TimeEntry.date` and `durationSeconds`, which creates tight coupling between reporting correctness and the storage model.
- The codebase uses English identifiers with French UI text, Tailwind utility classes, modal/view/card naming conventions, and immutable state updates.
- Tests follow a direct-action pattern: store unit tests call Zustand actions and inspect state; Playwright tests validate flows through French aria labels with localStorage reset between runs.

### Files to Reference

| File                                    | Purpose                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `src/types.ts`                          | Core task, timer, and time-entry data shapes.                     |
| `src/store/useTimeTrackerStore.ts`      | Persisted domain state and timer lifecycle actions.               |
| `src/App.tsx`                           | Root composition, live total derivation, modal orchestration.     |
| `src/components/Header.tsx`             | Current view toggle that may need extension for history access.   |
| `src/components/TaskCard.tsx`           | Task-level timer control UI.                                      |
| `src/components/TaskGrid.tsx`           | Grid orchestration and add-task affordance around task cards.     |
| `src/components/TaskModal.tsx`          | Existing task edit modal that may host or launch session actions. |
| `src/components/WeeklyView.tsx`         | Reporting UI fed by aggregated time entries.                      |
| `src/lib/time.ts`                       | Shared date and duration helpers used by timers and reports.      |
| `src/lib/weekly.ts`                     | Aggregation logic built on `timeEntries`.                         |
| `src/store/useTimeTrackerStore.test.ts` | Store-level behavioral tests.                                     |
| `src/lib/time.test.ts`                  | Time utility tests and expected duration behavior.                |
| `e2e/time-tracker.spec.ts`              | End-to-end coverage for task creation, timer usage, reload flow.  |

### Technical Decisions

- Keep local persistence with Zustand `persist`; no backend model changes are required.
- Evolve the current flat entry model into a session-oriented model without breaking weekly totals.
- Represent a logical session separately from its time segments and its audit trail so reporting can still consume normalized durations.
- Preserve existing task total calculations by deriving task totals from session segments or synchronized entry records.
- Add explicit metadata to distinguish timer-generated changes from manual additions and manual edits.
- The merge rule is narrow: only an immediate deactivate/reactivate on the same task can continue the same logical session. Any switch to another task creates a new session when returning.
- Include a persistence migration path from the current `timeEntries`-only store shape to the new session-oriented state so existing local data is preserved.
- The model should distinguish three layers explicitly: `session` for the logical work unit, `segment` for contiguous timed intervals, and `audit event` for lifecycle and manual-change traceability.
- `activeTimer` should remain the representation of a currently running automatic segment only; manual entries must not create ambiguous active state.
- The first migration should preserve existing persisted data with deterministic 1:1 conversion from legacy `timeEntries` into sessions or segments before any optional merge repair logic.
- Weekly summaries should either aggregate normalized session-derived entries or another single source of truth, but the implementation must avoid double counting both legacy entries and new session structures.
- Editing a session can move its effective day or week, so report derivation must recompute from canonical timing data rather than incrementally patching old daily buckets.
- Deleting tasks must cascade cleanly across time entries, sessions, segments, and audit events just as tag deletion already cascades through related state.
- To reduce navigation churn in the first implementation, the dedicated history surface should default to a task-scoped modal or panel launched from task interactions rather than requiring a third global header view.
- The canonical source of truth should be session-oriented state; any flat entry structure retained during migration or compatibility should be derived from sessions rather than updated independently.
- Rehydration finalizes any recovered active timer exactly once by attaching it to a migrated timer session and closing that segment during startup recovery.
- Manual time entry is allowed on any task even when another task timer is active, and it is stored as a separate non-active session.
- Session merging only occurs when the user stops a task and immediately restarts that same task with no intervening action.
- Sessions that cross midnight remain a single logical session and are reported on the day of their start time.
- Migration removes legacy persisted `timeEntries` after conversion and keeps sessions as the only persisted time-tracking source of truth.

## Implementation Plan

### Tasks

- [ ] Task 1: Define the session-oriented domain model
  - File: `src/types.ts`
  - Action: Add explicit types for logical sessions, contiguous session segments, audit events, manual entry drafts, and any compatibility shape needed to link legacy or derived time entries back to sessions.
  - Notes: The model must preserve the current task and tag types, keep English identifiers, and make the merge rule expressible without overloading `ActiveTimer`.

- [ ] Task 2: Refactor persisted store state to use sessions as the canonical source of truth
  - File: `src/store/useTimeTrackerStore.ts`
  - Action: Introduce session-oriented state and actions for automatic timer lifecycle, manual duration entry, manual session editing, history retrieval, and deletion cascades.
  - Notes: `activeTimer` should represent only a currently running automatic segment; manual additions must not create an active timer state.

- [ ] Task 3: Implement legacy storage migration and recovery rules
  - File: `src/store/useTimeTrackerStore.ts`
  - Action: Add a persist version bump and migration function that upgrades legacy `timeEntries` state into the new session structure while preserving totals, dates, and existing history.
  - Notes: Rehydration must finalize a recovered active timer exactly once and must not create duplicate segments or duplicate report totals.

- [ ] Task 4: Rework reporting helpers to derive totals from canonical session data
  - File: `src/lib/weekly.ts`
  - File: `src/lib/time.ts`
  - File: `src/components/WeeklyView.tsx`
  - Action: Update weekly aggregation and any supporting time helpers so day and week totals are derived from session-backed data, including edits that move time across day boundaries.
  - Notes: The implementation must avoid double counting legacy entry data and new session data during and after migration.

- [ ] Task 5: Add task-level entry points for manual time and history access
  - File: `src/components/TaskCard.tsx`
  - File: `src/components/TaskGrid.tsx`
  - File: `src/App.tsx`
  - Action: Extend task interactions so each task can open manual entry and history flows in addition to the existing timer toggle.
  - Notes: Keep the first delivery task-scoped rather than adding a third global view in the header.

- [ ] Task 6: Build the manual entry and session history UI flows
  - File: `src/components/TaskModal.tsx`
  - File: `src/App.tsx`
  - Action: Extend the current modal flow or add dedicated task-scoped surfaces for creating manual time, editing sessions, listing history, and expanding a session to inspect its segments and audit events.
  - Notes: UI copy should remain in French, and the history surface must support reverse-chronological browsing plus launch points for create and edit actions.

- [ ] Task 7: Align navigation and state wiring with the new task-scoped surfaces
  - File: `src/App.tsx`
  - File: `src/components/Header.tsx`
  - Action: Keep the existing `grid/week` navigation intact unless a minimal header change is needed, and wire modal or panel state so history access does not introduce ambiguous navigation.
  - Notes: Prefer local orchestration in `App.tsx` consistent with the current pattern of modal ownership.

- [ ] Task 8: Expand automated coverage for migration, lifecycle, and reporting
  - File: `src/store/useTimeTrackerStore.test.ts`
  - File: `src/lib/time.test.ts`
  - File: `e2e/time-tracker.spec.ts`
  - Action: Add unit and end-to-end tests for same-task reactivation merge, cross-task split behavior, manual creation and edit flows, reload recovery, migration, deletion cascades, and weekly reporting correctness.
  - Notes: Continue using direct store action tests in Vitest and French accessible selectors in Playwright.

### Acceptance Criteria

- [ ] AC 1: Given a task with no active timer, when the user adds manual time directly, then the task total, the weekly report, and the task history all reflect the new duration and label it as a manual addition.
- [ ] AC 2: Given a task with a stopped session, when the user reactivates the same task without starting another task in between, then the resumed work is attached to the same logical session and the history records a reactivation event.
- [ ] AC 3: Given a task with a stopped session, when the user starts a different task and later returns to the original task, then the return creates a new logical session rather than merging with the earlier one.
- [ ] AC 4: Given an existing session, when the user edits its duration or timestamps manually, then the session totals are recalculated correctly and the history records a manual modification event.
- [ ] AC 5: Given a manual or edited session changes effective day, when the weekly report is recalculated, then time is removed from the original bucket and added to the new day and week buckets correctly.
- [ ] AC 6: Given persisted local data from the previous `timeEntries` model, when the application rehydrates after the feature ships, then legacy tracked time is migrated into the new session model without data loss or duplicate totals.
- [ ] AC 7: Given the application reloads while an automatic timer segment was active, when persisted state is rehydrated, then the recovered segment is finalized exactly once and remains attached to the correct logical session.
- [ ] AC 8: Given the user opens a task history surface, when they inspect a task, then they can browse sessions in reverse chronological order, expand a session, and see its segments plus activation, stop, reactivation, and manual-edit audit events.
- [ ] AC 9: Given a task is deleted, when related session history exists, then all linked sessions, segments, audit events, and reportable data for that task are removed consistently.
- [ ] AC 10: Given the chosen rule for manual entry while another timer is active, when the user attempts that action, then the UI and store enforce the same rule consistently.

## Additional Context

### Dependencies

- Existing React, TypeScript, Zustand persist, Tailwind CSS, Vitest, Playwright, dnd-kit, and lucide-react are already in use.
- Existing date/time helper utilities are sufficient unless a dedicated date-time input helper is later justified by the session editing UI.
- The feature depends on a persisted state migration path because existing local installations already store `timeEntries`, `tasks`, and `activeTimer` under the current storage key.

### Testing Strategy

- Extend store tests to validate the new session lifecycle rules and persistence-safe state transitions.
- Add component or integration tests for manual entry and history access flows.
- Preserve and expand aggregation tests to ensure weekly totals stay correct after model changes.
- Add migration tests to verify that legacy persisted data is upgraded deterministically.
- Add edge-case tests for editing a session across day or week boundaries.
- Add store and e2e tests for reload recovery after an active timer, deletion cascade behavior, and the chosen validation rule for manual entry while another timer is running.
- Manual verification should cover: creating a task, running and stopping a timer, immediately resuming the same task, switching to another task before returning, adding manual time on past dates, editing a session across a day boundary, reloading with an active timer, and deleting a task with history.

### Notes

- The current project context file is still mostly unpopulated, so this spec includes the codebase assumptions needed by a fresh implementation agent.
- The dedicated history view can be implemented as a new modal, panel, or route, but the spec expects a distinct surface rather than inline-only card history.
- The dedicated history view should minimally support: opening from a task context, listing logical sessions in reverse chronological order, expanding one session to see its segments and audit events, and launching create/edit actions from that surface.
- The preferred first delivery is a task-scoped history modal or side panel, because the current header only supports a binary grid/week toggle and expanding global navigation would increase scope.
- Highest-risk implementation areas are persisted-state migration, report correctness after edits that move time across dates, and avoiding double counting while old and new data shapes coexist during migration.
- A deliberate product choice is still required for manual entry while another timer is active; the spec currently requires that whichever rule is selected be enforced consistently across both store and UI.
