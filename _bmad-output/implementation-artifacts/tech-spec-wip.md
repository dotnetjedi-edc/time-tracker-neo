---
title: "Manual Time Entry and Session History"
slug: "manual-time-entry-and-session-history"
created: "2026-03-20"
status: "in-progress"
stepsCompleted: [1]
tech_stack: []
files_to_modify: []
code_patterns: []
test_patterns: []
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

- State management is centralized in a persisted Zustand store in `src/store/useTimeTrackerStore.ts`.
- Time reporting currently depends on `timeEntries` with `durationSeconds` and `date` aggregation.
- Task cards expose only start/stop interactions today, while task editing is handled in `TaskModal`.
- Weekly reporting reads plain entry durations and does not currently understand session lifecycle metadata.

### Files to Reference

| File                                    | Purpose                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `src/types.ts`                          | Core task, timer, and time-entry data shapes.                     |
| `src/store/useTimeTrackerStore.ts`      | Persisted domain state and timer lifecycle actions.               |
| `src/components/TaskCard.tsx`           | Task-level timer control UI.                                      |
| `src/components/TaskModal.tsx`          | Existing task edit modal that may host or launch session actions. |
| `src/components/WeeklyView.tsx`         | Reporting UI fed by aggregated time entries.                      |
| `src/lib/weekly.ts`                     | Aggregation logic built on `timeEntries`.                         |
| `src/store/useTimeTrackerStore.test.ts` | Store-level behavioral tests.                                     |
| `src/lib/time.test.ts`                  | Time utility tests and expected duration behavior.                |

### Technical Decisions

- Keep local persistence with Zustand `persist`; no backend model changes are required.
- Evolve the current flat entry model into a session-oriented model without breaking weekly totals.
- Represent a logical session separately from its time segments and its audit trail so reporting can still consume normalized durations.
- Preserve existing task total calculations by deriving task totals from session segments or synchronized entry records.
- Add explicit metadata to distinguish timer-generated changes from manual additions and manual edits.
- The merge rule is narrow: only an immediate deactivate/reactivate on the same task can continue the same logical session. Any switch to another task creates a new session when returning.
- Include a persistence migration path from the current `timeEntries`-only store shape to the new session-oriented state so existing local data is preserved.
- The model should distinguish three layers explicitly: `session` for the logical work unit, `segment` for contiguous timed intervals, and `audit event` for lifecycle and manual-change traceability.

## Implementation Plan

### Tasks

1. Redesign the domain model in `src/types.ts` to introduce logical sessions, session segments or events, and audit metadata for manual changes while keeping enough normalized data for weekly summaries.
2. Refactor `src/store/useTimeTrackerStore.ts` to manage same-task reactivation merging, cross-task session splitting, manual duration entry, detailed session edits, and synchronized task totals.
3. Add a storage migration that upgrades persisted `timeEntries` data into the new session structure without losing task totals or historical durations.
4. Update reporting helpers such as `src/lib/weekly.ts` and dependent components so weekly totals remain accurate with the new session model, including sessions whose manual edits move them across date boundaries.
5. Extend task interactions in `src/components/TaskCard.tsx` and surrounding container logic to expose manual time entry in addition to timer toggling.
6. Add or extend UI flows, likely starting from `src/components/TaskModal.tsx` and a new dedicated history surface, to create/edit sessions and inspect task history.
7. Add or update unit and integration tests covering timer toggling, same-task reactivation merge, task-switch split behavior, manual session creation, manual edits, migration behavior, and report aggregation.

### Acceptance Criteria

- Given a task with no active timer, when the user adds manual time directly, then the task total and weekly summaries include the new duration and the history marks it as a manual addition.
- Given a task with a stopped session, when the user reactivates the same task without starting another task in between, then the new active period is attached to the same logical session and the history records a reactivation event.
- Given a task with a stopped session, when the user starts a different task and later returns to the original task, then the return creates a new logical session rather than merging with the earlier one.
- Given an existing session, when the user edits its manual or clock-based timing details, then the resulting duration is recalculated correctly and the history records that a manual modification occurred.
- Given persisted local data from the previous `timeEntries` model, when the application rehydrates after the feature ships, then existing tracked time is preserved and exposed through the new session model without data loss.
- Given an existing session, when the user edits it so that its effective date moves to another day, then the weekly report removes the duration from the original day and adds it to the new day correctly.
- Given the dedicated history view for a task, when the user opens it, then they can see distinct sessions in chronological order with activation, stop, reactivation, and manual-edit traces.
- Given existing weekly reports, when sessions are added or edited through the new model, then totals by task, day, and week remain correct.

## Additional Context

### Dependencies

- Existing React, TypeScript, Zustand, and date/time helper utilities are sufficient unless a dedicated date input helper is later justified.

### Testing Strategy

- Extend store tests to validate the new session lifecycle rules and persistence-safe state transitions.
- Add component or integration tests for manual entry and history access flows.
- Preserve and expand aggregation tests to ensure weekly totals stay correct after model changes.
- Add migration tests to verify that legacy persisted data is upgraded deterministically.
- Add edge-case tests for editing a session across day or week boundaries.

### Notes

- The current project context file is still mostly unpopulated, so this spec includes the codebase assumptions needed by a fresh implementation agent.
- The dedicated history view can be implemented as a new modal, panel, or route, but the spec expects a distinct surface rather than inline-only card history.
- The dedicated history view should minimally support: opening from a task context, listing logical sessions in reverse chronological order, expanding one session to see its segments and audit events, and launching create/edit actions from that surface.
