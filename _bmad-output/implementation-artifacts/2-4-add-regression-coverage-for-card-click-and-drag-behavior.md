---
title: "Add Regression Coverage for Card Click and Drag Behavior"
story_id: "2.4"
story_key: "2-4-add-regression-coverage-for-card-click-and-drag-behavior"
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
files_to_modify: ["e2e/time-tracker.spec.ts"]
code_patterns:
  [
    "Playwright tests use data-testid selectors (task-card-{id}) and French aria labels",
    "Drag simulation uses page.mouse.move/down/up with steps to trigger dnd-kit sensors",
    "Integration tests exercise click-to-toggle via fireEvent.click on card containers",
    "Timer state assertions check store state and visible UI (Actif/Prêt text, active banner)",
  ]
test_patterns:
  [
    "Acceptance tests should verify visible outcomes, not internal implementation details",
    "Drag tests simulate mouse gesture with sufficient movement steps to cross the dnd-kit distance threshold",
    "Timer state is observable via the active banner in the header and the Actif/Prêt badge on each card",
  ]
---

## Story 2.4: Add Regression Coverage for Card Click and Drag Behavior

Status: review

## Story

As a product team,
I want automated regression coverage for task card gesture behavior,
so that future interaction changes do not break timing or reordering.

## Acceptance Criteria

1. Given automated test coverage for task card interactions, when the test suite runs, then it verifies that a simple click or tap starts an inactive timer, and it verifies that a simple click or tap stops an active timer.
2. Given automated test coverage for reordering behavior, when the test suite runs, then it verifies that dragging a task changes the order, and it verifies that no timer toggle occurs during the drag flow.
3. Given automated test coverage for active-task drag behavior, when the test suite runs, then it verifies that an already-running timer continues during and after reorder, and it verifies that secondary task actions still work independently.

## Tasks / Subtasks

- [x] Task 1: Audit existing test coverage against Story 2.4 ACs (AC: 1, 2, 3)
  - [x] Map each AC bullet to an existing test or identify gaps.
  - [x] Document which tests satisfy which AC points.

- [x] Task 2: Fill the "no timer toggle during drag" E2E gap (AC: 2)
  - [x] Add a Playwright test: drag an inactive task card and verify no timer starts.
  - [x] This test acts as an explicit regression guard for the drag-vs-click contract.

## Dev Notes

### Coverage Inventory

At the time of writing, the following tests already satisfy the Story 2.4 ACs:

**AC 1 – click starts and stops timer:**

- Integration: `"starts, switches, and stops timers from simple task-card clicks"` in `app.integration.test.tsx`
  - Clicks Alpha card → verifies Actif badge + store.activeTimer.taskId === 1
  - Clicks Beta card → verifies Alpha is Prêt, Beta is Actif, totalTimeSeconds accumulates
  - Clicks Beta again → verifies timer stops, store.activeTimer is null

**AC 2 – drag changes order AND no timer toggle during drag:**

- Playwright: `"reorders task cards with drag and drop"` — verifies that Beta appears first after dragging
- Gap test to add: `"does not start a timer when dragging an inactive task card"` — drags Alpha, verifies no timer started
- Secondary coverage: `"ignores card clicks while drag lifecycle locking is active"` (integration, unit-level) — prop-level contract that `isTimerToggleLocked` suppresses click-to-toggle

**AC 3 – active timer survives reorder, secondary actions work:**

- Playwright: `"keeps the active timer running when the active card is reordered"` — starts Alpha timer, drags to Beta position, verifies timer still Actif on Alpha
- Integration: `"keeps secondary task actions operable while the main card surface stays interactive"` — verifies Temps Manuel and Modifier dialogs open independently of card drag/toggle

### Gap Analysis

The only coverage gap before this story closes is:

> "it verifies that no timer toggle occurs during the drag flow"

Currently addressed only at the prop-level unit test (`isTimerToggleLocked` suppresses toggle). A real E2E drag test that checks the timer was **not started** (i.e., the complete gesture produced no active timer) provides stronger regression protection.

### Implementation Approach

Add a single Playwright test to `e2e/time-tracker.spec.ts`:

```
test("does not start a timer when dragging an inactive task card", ...)
  - create Alpha and Beta tasks (no active timer)
  - drag Alpha card to Beta position using page.mouse
  - verify no active timer banner in the header
  - verify Alpha card shows "Prêt" (not "Actif")
  - (order change is incidental; the timer assertion is the focus)
```

No source code changes are required. This story is purely a test coverage story.

### Dev Agent Record

**Debug Log:**

- Step 1 (Artifact): Story 2.4 spec created from epics.md AC list and existing test audit.
- Step 2 (Gap test): One new Playwright test added for the "no timer toggle during drag" case.
- Step 3 (Validation): Full test suite (`npm run test:all`) passed with the new test green.
- Step 4 (BMAD sync): Story status updated to `review`.

**Completion Notes:**

- No source code changes were required — all ACs were satisfied by existing tests (Stories 2.1–2.3) plus one new Playwright test.
- The new test `"does not start a timer when dragging an inactive task card"` provides explicit regression protection for the drag-vs-click contract at the E2E level.

**Files Changed:**

- `e2e/time-tracker.spec.ts` — 1 new test added
- `_bmad-output/implementation-artifacts/2-4-add-regression-coverage-for-card-click-and-drag-behavior.md` — story artifact (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to `review`

**Change Log:**

- `e2e/time-tracker.spec.ts`: Added `"does not start a timer when dragging an inactive task card"` test after the existing `"reorders task cards with drag and drop"` test.
