---
title: "Add Regression Coverage for Card Click and Drag Behavior"
story_id: "2.4"
story_key: "2-4-add-regression-coverage-for-card-click-and-drag-behavior"
created: "2026-03-23"
status: done
epic: "Epic 2: Natural Card Interaction and Reordering"
tech_stack:
  [
    "TypeScript 5.8",
    "React 19.1",
    "Vite 6.3",
    "Tailwind CSS 3.4",
    "Zustand 5.0",
    "@dnd-kit/core 6.3.1",
    "@dnd-kit/sortable 10.0.0",
    "@dnd-kit/utilities 3.2.2",
    "Vitest 3.1",
    "Playwright 1.58",
  ]
files_to_modify:
  [
    "src/test/integration/app.integration.test.tsx",
  ]
files_for_reference:
  [
    "src/components/TaskCard.tsx",
    "src/components/TaskGrid.tsx",
    "src/App.tsx",
    "src/types.ts",
    "src/store/useTimeTrackerStore.ts",
    "src/test/setup.ts",
    "e2e/time-tracker.spec.ts",
    "src/store/useTimeTrackerStore.test.ts",
    "_bmad-output/project-context.md",
    "_bmad-output/planning-artifacts/epics.md",
    "_bmad-output/implementation-artifacts/2-1-drag-tasks-from-the-card-surface.md",
    "_bmad-output/implementation-artifacts/2-2-toggle-timer-with-a-simple-card-click-or-tap.md",
    "_bmad-output/implementation-artifacts/2-3-prevent-accidental-timer-toggles-during-reordering.md",
    "package.json",
  ]
code_patterns:
  [
    "Task cards are presentational — they receive handlers from App.tsx via TaskGrid and never read the store directly",
    "handleCardClick in TaskCardSurface guards: (1) target.closest('[data-card-control]') returns early, (2) isDragging || isTimerToggleLocked || isDragInteractionActive returns early, then calls onToggleTimer(task.id)",
    "handleToggleTimer in TaskCard wraps onToggleTimer with suppressClickRef guard — returns early if pointer moved > 6px",
    "TaskGrid passes isTimerToggleLocked={lockedToggleTaskId === task.id} per-card and isDragInteractionActive={draggedTaskId !== null} globally to all cards",
    "Secondary controls use data-card-control='secondary' AND stopPropagation on onClick, onPointerDown, and onTouchStart",
    "The grip icon uses data-card-control='drag-handle' with aria-hidden='true' — visual only, no stopPropagation",
    "DragOverlay renders TaskCardOverlay with isOverlay={true} and data-testid deliberately omitted",
    "French accessibility labels are part of the UI test contract",
    "data-testid={task-card-${task.id}} on the <article> element is a test contract",
  ]
test_patterns:
  [
    "Integration tests: Vitest + Testing Library + user-event in src/test/integration/ — accessible roles/names over implementation details",
    "Existing integration test 'ignores card clicks while drag lifecycle locking is active' uses isolated TaskCard render with isTimerToggleLocked={true}",
    "Existing integration test 'starts, switches, and stops timers from simple task-card clicks' validates full App render with store wiring and fireEvent.click on task cards",
    "Existing integration test 'keeps secondary task actions operable...' tests manual-time and edit buttons but NOT history button, and does NOT assert timer state after clicks",
    "E2E tests are currently non-functional due to Clerk auth gating from Epic 5 — do NOT write new E2E tests",
    "Test cleanup: resetTimeTrackerStore() + Testing Library cleanup in src/test/setup.ts",
  ]
---

## Story 2.4: Add Regression Coverage for Card Click and Drag Behavior

Status: draft

## Story

As a product team,
I want automated regression coverage for task card gesture behavior,
so that future interaction changes do not break timing or reordering.

## Acceptance Criteria

### AC1: Click/tap toggle coverage

**Given** automated test coverage for task card interactions
**When** the test suite runs
**Then** it verifies that a simple click or tap starts an inactive timer
**And** it verifies that a simple click or tap stops an active timer

### AC2: Drag-no-toggle coverage

**Given** automated test coverage for reordering behavior
**When** the test suite runs
**Then** it verifies that dragging a task changes the order
**And** it verifies that no timer toggle occurs during the drag flow

### AC3: Active-timer drag + secondary action coverage

**Given** automated test coverage for active-task drag behavior
**When** the test suite runs
**Then** it verifies that an already-running timer continues during and after reorder
**And** it verifies that secondary task actions still work independently

## Functional Requirements Covered

- **NFR7**: The implementation must include automated regression coverage for timer persistence and click-versus-drag interactions.
- **FR4**: Start/stop timer from card click (verified through tests).
- **FR7**: No timer toggle during drag (verified through tests).
- **FR8**: Active timer survives reorder (verified through tests).
- **FR10**: Secondary actions remain operable (verified through tests).

---

## Exhaustive Existing Coverage Audit

This story is specifically about regression coverage. Before prescribing any new tests, every existing test was mapped against the behaviors from Stories 2-1, 2-2, and 2-3.

### Integration Tests (`src/test/integration/app.integration.test.tsx`)

| # | Test Name | ACs Covered | What It Validates |
|---|-----------|-------------|-------------------|
| 1 | `"starts, switches, and stops timers from simple task-card clicks"` | AC1 | Full App render. `fireEvent.click(alphaCard)` starts Alpha (`Actif`, `activeTimer.taskId === "1"`). Advance 2s. `fireEvent.click(betaCard)` switches (Alpha `Prêt`, Beta `Actif`). `fireEvent.click(betaCard)` stops (`activeTimer` null). Covers start, switch, and stop. |
| 2 | `"ignores card clicks while drag lifecycle locking is active"` | AC2 | Isolated `TaskCard` render with `isTimerToggleLocked={true}`. `fireEvent.click` on card → `onToggleTimer` NOT called. Validates the per-card toggle-lock guard. |
| 3 | `"keeps secondary task actions operable while the main card surface stays interactive"` | AC3 (partial) | Full App render. Clicks manual-time button → dialog opens. Clicks edit button → dialog opens. Validates secondary controls function independently. |
| 4 | `"creates tags and tasks, runs a timer..."` | AC1 (incidental) | Full flow. Exercises click-to-toggle via button label but mixes many concerns. |
| 5 | `"shows a recovered active timer globally and lets the user stop it manually"` | — | Timer recovery, not click/drag. |
| 6 | `"keeps header actions visible while the compact header shows an active timer"` | — | Header layout, not interaction guards. |
| 7 | `"renders compact mobile-ready task cards without hiding core actions"` | — | Card layout completeness, not gestures. |
| 8 | `"filters the task grid by selected tags"` | — | Tag filtering, not relevant. |

### E2E Tests (`e2e/time-tracker.spec.ts`)

| # | Test Name | ACs Covered | What It Validates |
|---|-----------|-------------|-------------------|
| 1 | `"reorders task cards with drag and drop"` | AC2 | Creates Alpha + Beta. Drags Beta to Alpha's position from card center. Asserts order swapped. |
| 2 | `"does not start a timer when dragging an inactive task card"` | AC2 | Creates Alpha + Beta. Drags Alpha from card center. Asserts no active timer banner, both cards `Prêt`. |
| 3 | `"keeps the active timer running when the active card is reordered"` | AC3 | Starts Alpha timer. Drags Alpha to Beta's position. Asserts Alpha still `Actif`, header banner present, order swapped. |
| 4 | `"creates a tag and a task, runs the timer..."` | AC1 (incidental) | Card-surface click via `position: { x: 80, y: 72 }` to start/stop. |
| 5 | `"keeps task cards compact and operable on a phone-sized viewport"` | — | Mobile card layout. |
| 6 | `"compact header on mobile"` | — | Mobile header. |

### Store Unit Tests (`src/store/useTimeTrackerStore.test.ts`)

| # | Test Name | ACs Covered | What It Validates |
|---|-----------|-------------|-------------------|
| 1 | `"keeps a single active timer and creates separate sessions when switching tasks"` | AC1 (store) | `startTimer` → `startTimer` different task → first stopped, second active. |
| 2-7 | Various store tests | — | CRUD, migration, archive guard, tag deletion. Not gesture-related. |

### Coverage Verdict

**AC1 (click/tap toggle):** FULLY COVERED by integration test #1. All three scenarios — start, switch, stop — with both UI assertions (`Actif`/`Prêt`) and store assertions (`activeTimer.taskId`, `totalTimeSeconds`).

**AC2 (drag-no-toggle):** COVERED at E2E level (tests #1 + #2) and integration level (`isTimerToggleLocked` guard). **One gap:** the `isDragInteractionActive` prop guard is not tested at integration level (see Gap 1 below).

**AC3 (active timer during drag + secondary actions):** MOSTLY COVERED by E2E test #3 and integration test #3. **Two gaps:** secondary actions test doesn't assert timer state was unaffected (Gap 2), and history button is not tested (Gap 3).

---

## Identified Regression Gaps

### Gap 1: `isDragInteractionActive` guard has no integration test

**Risk:** If someone removes the `isDragInteractionActive` check from `handleCardClick`, no integration test catches it. The existing test only covers `isTimerToggleLocked`.

**Context:** `TaskGrid` passes `isDragInteractionActive={draggedTaskId !== null}` to ALL cards while ANY drag is in progress. This prevents toggle on non-dragged cards if the pointer accidentally crosses them. It is a separate guard from `isTimerToggleLocked` (which only applies to the dragged card itself).

**Guard location:** `TaskCardSurface.handleCardClick`:
```typescript
if (isDragging || isTimerToggleLocked || isDragInteractionActive) {
  return;
}
```

**Fix:** Add an isolated `TaskCard` render test with `isDragInteractionActive={true}`, mirroring the pattern of the existing `isTimerToggleLocked` test.

### Gap 2: Secondary action clicks don't assert no accidental timer toggle

**Risk:** The test `"keeps secondary task actions operable..."` pre-seeds the store with `activeTimer: null` and clicks manual-time and edit buttons. It verifies dialogs open, but never asserts `activeTimer` remains `null`. If a regression removes `stopPropagation` or the `data-card-control` attribute from a secondary button, the click would propagate to `handleCardClick` → `onToggleTimer` → store `toggleTimer` would START a timer — and no test would notice.

**Fix:** Add `expect(useTimeTrackerStore.getState().activeTimer).toBeNull()` after each secondary button click in the existing test.

### Gap 3: History button not covered in secondary actions test

**Risk:** The `"keeps secondary task actions operable..."` test clicks manual-time and edit buttons, but never clicks the history button. The history button has the same isolation pattern (`data-card-control="secondary"` + `stopPropagation`), but missing test coverage means a regression specific to that button goes undetected.

**Fix:** Add a history button click to the existing test, verifying the dialog opens and timer state is unaffected.

---

## E2E Coverage Note

E2E tests in `e2e/time-tracker.spec.ts` provide browser-level regression coverage for drag-from-card-center reordering, drag-no-toggle, and active-timer-survives-drag.

**However, E2E tests currently fail** because Epic 5 introduced Clerk authentication gating. The `page.goto("/")` encounters the Clerk sign-in wall. Until this is resolved (e.g., Clerk test mode bypass, E2E auth fixture), E2E cannot serve as an active regression gate. This is tracked as Epic 5 technical debt.

**Impact on this story:** The integration tests are the only actively running regression coverage for click and drag guard behaviors. This makes filling the integration-level gaps more critical.

---

## Tasks / Subtasks

### Task 1: Add integration test for `isDragInteractionActive` guard (Gap 1, AC: 2)

- [ ] **1a.** In `src/test/integration/app.integration.test.tsx`, add a new test immediately after the existing `"ignores card clicks while drag lifecycle locking is active"` test.

- [ ] **1b.** Test name: `"ignores card clicks while a drag interaction is globally active"`

- [ ] **1c.** Implementation — isolated `TaskCard` render (same pattern as the existing `isTimerToggleLocked` test):
  ```typescript
  it("ignores card clicks while a drag interaction is globally active", () => {
    const onToggleTimer = vi.fn();

    render(
      <TaskCard
        task={{
          id: "1",
          name: "Alpha",
          comment: "Tâche prête",
          totalTimeSeconds: 0,
          position: 0,
          tagIds: [],
          lifecycle: { status: "active", archivedAt: null },
          createdAt: "2026-03-20T09:00:00.000Z",
          updatedAt: "2026-03-20T09:00:00.000Z",
        }}
        taskTags={[]}
        isActive={false}
        isTimerToggleLocked={false}
        isDragInteractionActive
        liveSeconds={0}
        onToggleTimer={onToggleTimer}
        onEdit={vi.fn()}
        onOpenManualTime={vi.fn()}
        onOpenHistory={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("task-card-1"));

    expect(onToggleTimer).not.toHaveBeenCalled();
  });
  ```

- [ ] **1d.** This tests the `isDragInteractionActive` branch in `handleCardClick`, complementing the existing `isTimerToggleLocked` test. Together they cover two of the three prop-based guard conditions. The third (`isDragging`) is internal dnd-kit state — covered at E2E level.

### Task 2: Strengthen secondary actions test with timer-state assertions and history button (Gap 2 + Gap 3, AC: 3)

- [ ] **2a.** In the existing test `"keeps secondary task actions operable while the main card surface stays interactive"`, after clicking "Temps manuel" and closing the dialog, add:
  ```typescript
  expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
  ```

- [ ] **2b.** After clicking "Modifier" and verifying the edit dialog, add:
  ```typescript
  expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
  ```

- [ ] **2c.** After the edit dialog assertion, close the dialog and add a history button click:
  ```typescript
  await user.click(screen.getByRole("button", { name: /^fermer$/i }));

  await user.click(
    within(taskCard).getByRole("button", { name: /historique/i }),
  );
  expect(
    screen.getByRole("dialog", {
      name: /temps et historique pour préparation atelier/i,
    }),
  ).toBeInTheDocument();
  expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
  ```

- [ ] **2d.** This fills Gap 2 (no timer-state assertion after secondary clicks) and Gap 3 (history button missing) in one change. The test now validates all three secondary controls AND proves none of them accidentally toggle the timer.

### Task 3: Run full test suite and validate (AC: 1, 2, 3)

- [ ] **3a.** Run `npm run test:integration` — expect all tests to pass including the new/modified tests.
- [ ] **3b.** Run `npm run test:unit` — expect all store and helper tests to pass (no store changes).
- [ ] **3c.** Do NOT run E2E tests — blocked by Clerk auth gating (Epic 5 debt).

---

## Previous Story Intelligence

### From Story 2-3 (Prevent Accidental Timer Toggles During Reordering)

Story 2-3 was a pure verification story — all guard mechanisms were already shipped with Stories 2-1 and 2-2. Key documentation:

- **Five guard layers** documented: (1) pointer-move suppression via `suppressClickRef`, (2) drag lifecycle flags from TaskGrid (`isTimerToggleLocked` + `isDragInteractionActive`), (3) click handler guards in `TaskCardSurface`, (4) secondary control isolation via `data-card-control` + `stopPropagation`, (5) DragOverlay identity isolation.
- The `isTimerToggleLocked` test pattern (isolated `TaskCard` render with a single prop) is the established model for guard-level regression tests.

### From Story 2-2 (Toggle Timer With a Simple Card Click or Tap)

- The inner `<button aria-label="Basculer le chrono pour ...">` does NOT have `stopPropagation` — clicks on it intentionally bubble to `handleCardClick`. This is by design.
- `cursor-pointer` was added to card surfaces for non-overlay, non-dragging states.
- Integration coverage for click-to-toggle (start, switch, stop) is comprehensive.

---

## Implementation Scope Summary

This story adds **one new integration test** and **strengthens one existing integration test**. No production code changes. No E2E changes (blocked by Clerk auth).

| Change | File | Type |
|--------|------|------|
| New test: `isDragInteractionActive` guard | `src/test/integration/app.integration.test.tsx` | New integration test |
| Timer-state assertions + history button | `src/test/integration/app.integration.test.tsx` | Modify existing test |

Estimated diff: ~30 lines of test code added/modified.

---

## Definition of Done

- [ ] New `"ignores card clicks while a drag interaction is globally active"` test passes
- [ ] Existing `"keeps secondary task actions operable..."` test passes with added assertions
- [ ] `npm run test:integration` — zero regressions
- [ ] `npm run test:unit` — zero regressions
- [ ] No production code changes
- [ ] Sprint status updated to `done`
