---
title: "Prevent Accidental Timer Toggles During Reordering"
story_id: "2.3"
story_key: "2-3-prevent-accidental-timer-toggles-during-reordering"
created: "2026-03-21"
status: "review"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 2: Natural Card Interaction and Reordering"
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Tailwind CSS",
    "Zustand persist",
    "@dnd-kit/core",
    "@dnd-kit/sortable",
    "Vitest",
    "Playwright",
  ]
files_to_modify:
  [
    "src/components/TaskCard.tsx",
    "src/components/TaskGrid.tsx",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Task cards stay presentational while App.tsx and the store own timer state",
    "Drag behavior is orchestrated in TaskGrid via dnd-kit sensors and sortable ordering",
    "TaskCard currently combines whole-card click-to-toggle with pointer and touch drag listeners",
    "French accessible labels and task-card data-testid hooks remain part of the UI contract",
  ]
test_patterns:
  [
    "Integration tests should assert visible active-state outcomes and preserve modal independence through real user events",
    "Playwright scenarios should validate drag flows from the card surface without depending on internal implementation details",
    "Story 2.2 already covers click-to-toggle; this story should harden drag-only behavior and active-timer continuity during reorder",
  ]
---

## Story 2.3: Prevent Accidental Timer Toggles During Reordering

Status: review

## Story

As a time-tracking user,
I want drag and click gestures to be interpreted correctly,
so that reordering tasks never accidentally starts or stops a timer.

## Acceptance Criteria

1. Given the user performs a drag gesture on a task card, when the drag threshold is met and reordering begins, then the interaction is treated as a drag only, and no timer toggle is triggered by that gesture.
2. Given a timer is already running on a task, when that task card is dragged to a new position, then the timer continues running throughout the reorder interaction, and the active timing state remains unchanged after the drop.
3. Given a task card contains secondary controls such as edit, manual time, and history, when the user activates one of those controls, then the requested secondary action is executed, and neither drag mode nor timer toggle is triggered unintentionally.

## Tasks / Subtasks

- [x] Task 1: Make drag activation cancel any pending click-to-toggle interpretation (AC: 1)
  - [x] Ensure TaskCard stops treating the gesture as a click as soon as the drag threshold is crossed or a sortable drag starts.
  - [x] Prevent timer toggles from firing on drag end, drop, or any synthetic click that follows a reorder gesture.

- [x] Task 2: Preserve active timer state while the active task is reordered (AC: 2)
  - [x] Verify that dragging the active card does not stop, restart, or switch the timer.
  - [x] Keep reorder persistence working through the existing `onReorder -> setTaskOrder` path.

- [x] Task 3: Keep secondary controls isolated from drag and toggle side effects (AC: 3)
  - [x] Preserve independent edit, manual time, and history actions while the main card surface supports click and drag interactions.
  - [x] Avoid accidental drag start or timer toggle when those secondary controls are activated.

- [x] Task 4: Add regression coverage for drag-vs-click gesture correctness (AC: 1, 2, 3)
  - [x] Add integration coverage proving a drag gesture does not toggle a timer and that an active timer survives reordering.
  - [x] Add or update Playwright coverage for dragging cards while verifying timer state remains stable.

## Dev Notes

### Story Foundation

- This story maps directly to Epic 2 Story 2.3 in `_bmad-output/planning-artifacts/epics.md`.
- Story 2.1 broadened drag initiation to the card surface, and Story 2.2 added whole-card click-to-toggle with lightweight movement suppression. Story 2.3 is the hardening pass that guarantees drag wins over click.
- The store already owns active timer state and must remain the only source of truth for whether a timer starts, stops, or switches.

### Existing Code Reality

- `src/components/TaskCard.tsx` currently tracks pointer/touch start coordinates locally and suppresses the card click after movement of at least 8 pixels.
- `src/components/TaskGrid.tsx` already uses dnd-kit sensors with an 8-pixel pointer activation distance and 150ms touch delay with 8-pixel tolerance.
- The current implementation does not explicitly communicate drag lifecycle state from `TaskGrid` back to `TaskCard`, so click suppression depends on local movement tracking alone.

### Architecture And Implementation Guardrails

- Keep timer business logic in the store. Do not create drag-specific timer state in the component tree.
- Align click suppression with the actual dnd-kit drag lifecycle so the same gesture cannot become both a drag and a click.
- Preserve French labels, `task-card-*` test ids, and existing modal flows.
- Do not regress Story 2.1 reorder persistence or Story 2.2 click-to-toggle behavior.
- Do not add dependencies.

### Specific Developer Guidance

- Prefer a single explicit signal for “a drag is happening or just happened” rather than inferring it only from local pointer deltas.
- Keep the guard close to the card click boundary so delayed or synthetic clicks after drag completion are ignored deterministically.
- Preserve active timer continuity by ensuring reorder handlers never call timer toggling paths.

### Regression Risks To Prevent

- Dragging an inactive card must not start its timer.
- Dragging an active card must not stop or restart its timer.
- Secondary controls must not toggle the timer and must not initiate reorder accidentally.
- Reorder completion must still persist the new task order.

### Testing Standards Summary

- Integration tests should exercise the card surface with realistic pointer flows and assert task state before and after reorder.
- Playwright should verify end-to-end that dragging an active card preserves both order changes and visible active timer state.
- Existing store tests already cover timer state transitions; this story focuses on UI interaction correctness.

### References

- Epic requirements: `_bmad-output/planning-artifacts/epics.md`.
- Current card interaction implementation: `src/components/TaskCard.tsx`.
- Current drag orchestration: `src/components/TaskGrid.tsx`.
- Timer state orchestration: `src/store/useTimeTrackerStore.ts`.
- Existing interaction coverage: `src/test/integration/app.integration.test.tsx` and `e2e/time-tracker.spec.ts`.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Added an explicit drag-lifecycle lock in `TaskGrid` so the dragged card ignores timer-toggle clicks during and immediately after reorder.
- Hardened `TaskCard` click suppression by checking movement at both pointer/touch move time and pointer/touch end time.
- Removed `data-testid` from the drag overlay copy so browser tests and automation do not see duplicate task-card identities during drag.
- Validated with `npm run test:all` and `npm run build`.

### Completion Notes List

- Dragging a card now explicitly locks timer toggling for that card until the reorder gesture has fully settled.
- Reordering an already active card now preserves the active timer state and visible active indicator after drop.
- Secondary controls remain independent, and whole-card click-to-toggle from Story 2.2 still works outside drag-locked moments.
- Regression coverage now includes active-card reorder continuity in Playwright and drag-lock click suppression in integration.

### File List

- `_bmad-output/implementation-artifacts/2-3-prevent-accidental-timer-toggles-during-reordering.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/TaskCard.tsx`
- `src/components/TaskGrid.tsx`
- `src/test/integration/app.integration.test.tsx`
- `e2e/time-tracker.spec.ts`

### Change Log

- 2026-03-21: Story created from Epic 2 backlog with guardrails for drag-vs-click correctness during task reordering.
- 2026-03-21: Implemented Story 2.3 with explicit drag-lifecycle toggle locking, overlay test-id cleanup, and active-reorder regression coverage.
