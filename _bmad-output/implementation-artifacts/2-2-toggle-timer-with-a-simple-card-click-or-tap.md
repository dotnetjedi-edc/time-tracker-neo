---
title: "Toggle Timer With a Simple Card Click or Tap"
story_id: "2.2"
story_key: "2-2-toggle-timer-with-a-simple-card-click-or-tap"
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
    "src/components/TaskCard.tsx",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
files_for_reference:
  [
    "src/App.tsx",
    "src/types.ts",
    "src/store/useTimeTrackerStore.ts",
    "src/components/TaskGrid.tsx",
    "src/test/setup.ts",
    "_bmad-output/project-context.md",
    "_bmad-output/planning-artifacts/epics.md",
    "_bmad-output/implementation-artifacts/2-1-drag-tasks-from-the-card-surface.md",
    "package.json",
  ]
code_patterns:
  [
    "Task cards are presentational — they receive handlers from App.tsx via TaskGrid and never read the store directly",
    "Timer toggle flow: article onClick -> handleCardClick -> onToggleTimer(task.id) -> App.tsx toggleTimer -> useTimeTrackerStore.toggleTimer -> startTimer or stopTimer",
    "handleCardClick guards: returns early if target is a [data-card-control] child, or if isDragging/isTimerToggleLocked/isDragInteractionActive",
    "handleToggleTimer wraps onToggleTimer with suppressClickRef guard to prevent toggles after pointer movement > 6px",
    "mergedPointerDown on <article> calls handlePointerDown first then dnd-kit's listeners.onPointerDown — both fire for every pointerdown on the card surface",
    "Secondary controls (edit, manual time, history) use data-card-control='secondary' attribute AND stopPropagation on onClick, onPointerDown, and onTouchStart — this prevents both timer toggle and drag initiation",
    "The grip icon is a visual-only <div data-card-control='drag-handle' aria-hidden='true'> — not interactive, but data-card-control causes handleCardClick to ignore clicks on it",
    "The inner <button aria-label='Basculer le chrono pour ...'> does NOT have stopPropagation — clicks on it bubble to the <article> onClick handler which calls handleCardClick",
    "TaskGrid passes isTimerToggleLocked={lockedToggleTaskId === task.id} and isDragInteractionActive to cards during drag lifecycle",
    "French accessibility labels (Basculer le chrono, Modifier, Temps manuel, Historique) are part of the UI test contract",
    "data-testid={task-card-${task.id}} on the <article> element is a test contract — preserve it",
  ]
test_patterns:
  [
    "Unit tests: Vitest + jsdom — pure helpers and store logic in src/lib and src/store",
    "Integration tests: Vitest + Testing Library + user-event in src/test/integration/ — accessible roles/names over implementation details",
    "E2E tests: Playwright against local Vite server at 127.0.0.1:4173 — full user flows",
    "Test cleanup: resetTimeTrackerStore() + Testing Library cleanup in src/test/setup.ts",
    "Existing integration test 'starts, switches, and stops timers from simple task-card clicks' already covers click-to-toggle for start, switch, and stop via fireEvent.click on task cards",
    "Existing integration test 'ignores card clicks while drag lifecycle locking is active' covers the lock guard",
    "Existing E2E test 'creates a tag and a task...' already validates card-surface click-to-toggle via position-based click",
    "This story should ADD dedicated E2E coverage that explicitly names click-to-toggle behavior and validates all three AC scenarios end-to-end",
  ]
---

## Story 2.2: Toggle Timer With a Simple Card Click or Tap

Status: draft

## Story

As a time-tracking user,
I want to start or stop timing with a simple click or tap on a task card,
so that I can control timing quickly without aiming for a small control.

## Acceptance Criteria

### AC1: Start timer from card click

**Given** a task has no active timer
**When** the user performs a simple click or tap on the task card
**Then** the timer starts for that task
**And** the task immediately reflects its active state

### AC2: Stop timer from card click

**Given** a task is currently active
**When** the user performs a simple click or tap on the same task card
**Then** the timer stops
**And** the tracked time is added to the task using the existing session model

### AC3: Switch timer between tasks from card click

**Given** another task is already active
**When** the user performs a simple click or tap on a different task card
**Then** the existing active timer is finalized correctly
**And** the newly selected task becomes the only active timer

## Functional Requirements Covered

- **FR4**: The system must allow a user to start or stop a task timer with a single click or tap on the task card.
- **FR10**: The system must preserve direct access to existing task secondary actions such as edit, manual time entry, and history while improving card touch interactions.

## Current Implementation Analysis — Click-to-Toggle Already Works

**This is the critical insight for this story.** After Story 2-1 moved the dnd-kit `listeners` and `attributes` onto the `<article>` element, the click-to-toggle mechanism was already fully operational. The implementation gap is **test coverage and explicit verification**, not new feature code.

### How Click-to-Toggle Works Today (TaskCard.tsx)

The complete click-to-toggle flow is already wired:

1. **`<article onClick={handleCardClick}>`** — The `<article>` root element has an `onClick` handler.
2. **`handleCardClick`** checks three guard conditions before toggling:
   - `target.closest("[data-card-control]")` returns early if the click is on a secondary control or the grip icon
   - `isDragging || isTimerToggleLocked || isDragInteractionActive` returns early if a drag is in progress
   - If all guards pass → calls `onToggleTimer(task.id)`
3. **`onToggleTimer` is actually `handleToggleTimer`** in the `TaskCard` wrapper, which adds one more guard:
   - `suppressClickRef.current` returns early if the pointer moved > 6px (preventing toggle after drag motion)
   - Otherwise → calls the real `onToggleTimer` prop
4. **`onToggleTimer` prop** flows from `App.tsx → TaskGrid → TaskCard`:
   - `App.tsx`: `onToggleTimer={(taskId) => void toggleTimer(taskId)}`
   - This calls `useTimeTrackerStore.toggleTimer(taskId)` which handles start, stop, and switch semantics

### Why the Inner Button Doesn't Interfere

The `<button aria-label="Basculer le chrono pour ${task.name}">` inside the card:
- Does **NOT** have its own `onClick` handler — it is purely visual
- Does **NOT** call `stopPropagation` — clicks on it bubble up to the `<article>`
- Does **NOT** have `data-card-control` — so `handleCardClick` does not skip it
- Is `disabled` during drag (`isDragging && !isOverlay`)

Result: clicking this button triggers the same `handleCardClick` path as clicking any other non-control area of the card. This is correct behavior.

### Why Secondary Controls Don't Toggle the Timer

The edit, manual time, and history buttons all have:
- `data-card-control="secondary"` — causes `handleCardClick` to return early via `target.closest("[data-card-control]")`
- `onClick={(event) => { event.stopPropagation(); ... }}` — prevents click event from reaching `<article>`
- `onPointerDown={(event) => event.stopPropagation()}` — prevents dnd-kit sensor from capturing
- `onTouchStart={(event) => event.stopPropagation()}` — prevents touch-based drag initiation

The grip `<div data-card-control="drag-handle" aria-hidden="true">` has `data-card-control` which causes `handleCardClick` to return early, but no `stopPropagation` since it's non-interactive.

### Existing Test Coverage

**Integration tests** (`src/test/integration/app.integration.test.tsx`):
- `"starts, switches, and stops timers from simple task-card clicks"` — Uses `fireEvent.click(alphaCard)` and `fireEvent.click(betaCard)` on the `<article>` elements. Covers all three ACs: start inactive timer, switch to another task, stop active timer. Asserts `Actif`/`Prêt` badge state and `activeTimer.taskId` store state. **This already validates AC1, AC2, AC3.**
- `"ignores card clicks while drag lifecycle locking is active"` — Renders `TaskCard` with `isTimerToggleLocked={true}` and verifies `onToggleTimer` is not called. **Validates the drag-lock guard.**
- `"keeps secondary task actions operable while the main card surface stays interactive"` — Clicks manual time and edit buttons and verifies modals open without timer toggle.

**E2E tests** (`e2e/time-tracker.spec.ts`):
- `"creates a tag and a task, runs the timer..."` — Uses `sessionClientCard.click({ position: { x: 80, y: 72 }, force: true })` to start and stop the timer. This effectively validates card-surface click-to-toggle, but the test name doesn't clearly communicate it, and it mixes concerns (tag creation, weekly view).
- `"reload keeps an active timer running..."` — Uses `page.getByRole("button", { name: /basculer le chrono pour focus/i }).click({ force: true })` to start the timer via the inner button label. This also exercises click-to-toggle but targets the inner button specifically.

### Gaps Identified

1. **No dedicated E2E test** that explicitly and solely validates click-to-toggle behavior (start, stop, switch) through card-surface clicks. The existing E2E tests cover it incidentally but not as their primary assertion.
2. **No E2E coverage for timer switch** — clicking a different card to switch the active timer is covered in integration tests but not in E2E.
3. **Cursor feedback** — The card surface does not show a `cursor-pointer` when hoverable, which would provide visual feedback that the card is clickable. The `hover:-translate-y-1` transform hints at interactivity but a cursor change would be more explicit.
4. **Active card click feedback** — No transient visual feedback (e.g., press state) when the user clicks the card surface to toggle. The `animate-pulseGlow` class provides ongoing active state indication, but there's no momentary click acknowledgment.

## Tasks / Subtasks

### Task 1: Add cursor feedback on hoverable card surface (AC: 1, 2, 3)

- [ ] **1a.** In `src/components/TaskCard.tsx`, add `cursor-pointer` to the `<article>` element's class list for non-dragging, non-overlay states. The card already has `hover:-translate-y-1` for inactive cards, so adding `cursor-pointer` is consistent with the existing hover affordance.
  - Add it to the base class string (not conditional on `isActive`), so both active and inactive cards show pointer cursor.
  - The overlay already has `cursor-grabbing` — do not add `cursor-pointer` to overlay cards.
  - During drag (`isDragging && !isOverlay`), the card is hidden (`opacity-0`) so cursor doesn't matter.

### Task 2: Add dedicated E2E test for click-to-toggle behavior (AC: 1, 2, 3)

- [ ] **2a.** Add a new Playwright test in `e2e/time-tracker.spec.ts` named `"starts and stops a timer by clicking the task card surface"` that validates:
  - Create two tasks (Alpha, Beta)
  - Click Alpha card surface → Alpha shows `Actif`, header shows active timer banner with "Alpha"
  - Wait ~1 second for timer to accumulate
  - Click Alpha card surface again → Alpha shows `Prêt`, timer stopped, elapsed time visible (e.g., `00:00:01`)
  - Click Beta card surface → Beta shows `Actif`, Alpha stays `Prêt`
  - Click Alpha card surface → Alpha shows `Actif`, Beta shows `Prêt` (switch)
  - Click Alpha card surface → Alpha shows `Prêt`, both timers stopped

- [ ] **2b.** Use card-surface clicks via `page.getByTestId("task-card-N").click({ position: { x: 100, y: 100 }, force: true })` to specifically target the card body area, not the inner button aria-label. This proves cards are full-surface clickable.

- [ ] **2c.** Assert timer state through visible UI elements:
  - `Actif`/`Prêt` badge text within the card
  - Active timer banner presence in the header (`/^chrono actif$/i` text and task name)
  - Elapsed time display (e.g., `00:00:01` or similar pattern)

### Task 3: Verify existing integration test coverage is sufficient (AC: 1, 2, 3)

- [ ] **3a.** Run the existing integration test `"starts, switches, and stops timers from simple task-card clicks"` and confirm it passes. This test already validates all three ACs at the integration level. **No new integration test code is needed** — the coverage is already comprehensive.

- [ ] **3b.** Run the existing integration test `"ignores card clicks while drag lifecycle locking is active"` and confirm it passes. This validates the drag-lock guard for Story 2.3 compatibility.

- [ ] **3c.** Run `"keeps secondary task actions operable while the main card surface stays interactive"` and confirm secondary controls work independently.

### Task 4: Run full test suite and validate (AC: 1, 2, 3)

- [ ] **4a.** Run `npm run test:unit` — expect all store and helper tests to pass (no changes to store logic).
- [ ] **4b.** Run `npm run test:integration` — expect all integration tests including existing click-to-toggle coverage to pass.
- [ ] **4c.** Run `npm run test:e2e` — expect the new E2E test and all existing E2E tests to pass.
- [ ] **4d.** Run `npm run build` — confirm no TypeScript or build errors.

## Dev Notes

### Story Foundation

- This story is **Epic 2, Story 2.2** from `_bmad-output/planning-artifacts/epics.md`.
- It follows **Story 2.1** (Drag Tasks From the Card Surface), which is **DONE**. Story 2.1 moved the dnd-kit sortable activator from the grip button to the `<article>` element, making the entire card surface draggable.
- **Critical finding:** The click-to-toggle timer behavior already works in the current codebase. Story 2.1's implementation included `handleCardClick` on the `<article>` that calls `onToggleTimer(task.id)` when appropriate guards pass. This means Story 2.2's scope is primarily **verification, test gap closure, and minor UX refinement** — not new feature implementation.
- Stories 2.3 (prevent accidental toggles during reordering) and 2.4 (regression coverage) build on top of this.

### Existing Code Reality (After Story 2-1)

#### `src/components/TaskCard.tsx` (~337 lines)

The file contains three exports:
1. **`TaskCardSurface`** (internal) — Presentational card layout. Root element is `<article>` which serves as sortable node ref AND click-to-toggle target.
2. **`TaskCard`** (public) — Calls `useSortable({ id: task.id })`, creates pointer tracking refs, produces merged handlers, passes everything to `TaskCardSurface`.
3. **`TaskCardOverlay`** (public) — Used in `DragOverlay` (no sortable listeners, `isOverlay={true}`).

**`TaskCardSurface` — `<article>` element props (as they exist today):**
```
<article
  ref={setNodeRef}
  {...sortableAttributes}        // from dnd-kit (role, tabIndex, etc.)
  {...sortableListeners}         // from dnd-kit (onKeyDown only — onPointerDown excluded, see below)
  role="group"                   // overrides dnd-kit's default role="button"
  aria-roledescription="draggable"  // overrides dnd-kit's default
  data-testid={`task-card-${task.id}`}
  onClick={handleCardClick}      // ← THIS IS THE CLICK-TO-TOGGLE ENTRY POINT
  onPointerCancel={onPointerCancel}
  onPointerDown={onPointerDown}  // ← merged handler: handlePointerDown + dnd-kit's onPointerDown
  onPointerMove={onPointerMove}
  onPointerUp={onPointerUp}
>
```

**Click-to-toggle guard chain (complete):**

| Guard | Location | Condition | Effect |
|---|---|---|---|
| Secondary control check | `handleCardClick` | `target.closest("[data-card-control]")` | Skips toggle for grip, edit, manual time, history |
| Drag state check | `handleCardClick` | `isDragging \|\| isTimerToggleLocked \|\| isDragInteractionActive` | Skips toggle during any drag lifecycle phase |
| Pointer movement check | `handleToggleTimer` | `suppressClickRef.current === true` | Skips toggle if pointer moved > 6px (drag motion detected) |

**`TaskCard` — Merged handler strategy (established in Story 2.1):**
```typescript
const mergedPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
  handlePointerDown(event);  // tracks pointer start position for click suppression
  const dndHandler = listeners?.onPointerDown;
  if (typeof dndHandler === "function") {
    dndHandler(event);  // passes event to dnd-kit's PointerSensor
  }
};
```
This merged handler is passed to `TaskCardSurface` as `onPointerDown` and placed on the `<article>`. The remaining dnd-kit `listeners` (minus `onPointerDown`) are spread via `sortableListeners`.

**Interactive regions in the card:**

| Region | Element | Click Behavior | stopPropagation? | data-card-control? |
|---|---|---|---|---|
| Grip icon | `<div>` (visual-only, `aria-hidden="true"`) | Click ignored (data-card-control guard) | No | `"drag-handle"` |
| Edit button | `<button>` | Opens edit modal | Yes (onClick, onPointerDown, onTouchStart) | `"secondary"` |
| Timer body | `<button aria-label="Basculer le chrono...">` | Click bubbles to `<article>` → toggle | No | No |
| Manual time | `<button>` | Opens manual time modal | Yes (onClick, onPointerDown, onTouchStart) | `"secondary"` |
| History | `<button>` | Opens history modal | Yes (onClick, onPointerDown, onTouchStart) | `"secondary"` |
| Card surface | `<article>` | `handleCardClick` → `onToggleTimer` | N/A (root) | N/A |

#### `src/components/TaskGrid.tsx` (~365 lines)

**Toggle lock mechanism (protects against toggle during drag):**
- `handleDragStart` sets `lockedToggleTaskId = activeId` (the dragged task)
- `handleDragCancel` and `handleDragEnd` schedule unlock via `setTimeout(() => setLockedToggleTaskId(null), 0)`
- Each `TaskCard` receives `isTimerToggleLocked={lockedToggleTaskId === task.id}`
- Additionally, `isDragInteractionActive` is set to `true` when any drag is in progress (any card) — provides a global drag guard

#### `src/store/useTimeTrackerStore.ts` — `toggleTimer` action

```typescript
toggleTimer: async (taskId) => {
  const current = get().activeTimer;
  if (current?.taskId === taskId) {
    await get().stopTimer();  // same task → stop
    return;
  }
  await get().startTimer(taskId);  // different task → stop current (inside startTimer) then start new
},
```

This already handles all three ACs:
- **AC1**: No active timer → `startTimer(taskId)`
- **AC2**: Same task active → `stopTimer()`
- **AC3**: Different task active → `startTimer(taskId)` which internally calls `stopTimer()` first

#### `src/App.tsx` — Wiring

```typescript
const toggleTimer = useTimeTrackerStore((state) => state.toggleTimer);
// ...
<TaskGrid
  // ...
  onToggleTimer={(taskId) => void toggleTimer(taskId)}
  // ...
/>
```

### Guardrails — What NOT To Do

1. **Do NOT modify store logic** — `toggleTimer`, `startTimer`, `stopTimer` are correct and complete. No changes needed.
2. **Do NOT modify `TaskGrid.tsx`** — The drag-lock mechanism is correct. No changes needed.
3. **Do NOT add a separate onClick handler to the inner `<button aria-label="Basculer le chrono...">` button** — Clicks on it already bubble to the `<article>` and trigger `handleCardClick`. Adding a handler would cause a double toggle.
4. **Do NOT add `stopPropagation` to the inner timer button** — This would BREAK click-to-toggle from the timer body area.
5. **Do NOT add `data-card-control` to the inner timer button** — This would make `handleCardClick` skip it, which is the opposite of what we want.
6. **Do NOT change the `handleCardClick` guard logic** — It correctly handles all edge cases.
7. **Do NOT change `data-testid` attributes** — They are a test contract.
8. **Do NOT change French accessibility labels** — `Basculer le chrono pour`, `Modifier`, `Temps manuel`, `Historique` are tested.
9. **Do NOT add new npm dependencies** — Everything needed is already installed.
10. **Do NOT create new files** — The cursor change fits in existing TaskCard.tsx; tests go in existing test files.
11. **Do NOT modify the `mergedPointerDown` handler or `suppressClickRef` logic** — These are the foundation of Story 2.3 (prevent accidental toggles during reordering).

### Testing Standards Summary

| Layer | What to test | Where | Status |
|---|---|---|---|
| E2E (Playwright) | Dedicated click-to-toggle: start, stop, switch timers from card surface | `e2e/time-tracker.spec.ts` — add 1 new test | **NEW** |
| Integration | Start, switch, stop via card clicks; drag-lock guard; secondary control independence | `src/test/integration/app.integration.test.tsx` — existing tests | **ALREADY COVERED** |
| Unit | Store timer toggle semantics | `src/store/useTimeTrackerStore.test.ts` — existing tests | **ALREADY COVERED** |

**Running tests:**
- Unit: `npx vitest run src/lib src/store`
- Integration: `npx vitest run src/test/integration`
- E2E: `npx playwright test`
- All: `npm run test:all`

### Code Patterns To Follow (from project-context.md)

- Keep persisted business logic in the Zustand store; components handle presentation and temporary UI state only.
- Preserve narrow Zustand slice subscriptions in React components.
- Preserve French UI copy — all user-facing text is in French.
- Keep domain types centralized in `src/types.ts`.
- Prefer early returns and guard clauses.
- Do not use `any` or unsafe casts.
- Prefer focused changes — no unrelated rewrites or stylistic churn.
- When changing interaction behavior, update tests in the same change.

### Implementation Sequence (Recommended)

1. Add `cursor-pointer` to the `<article>` class list in `TaskCard.tsx` (non-overlay, non-dragging).
2. Run `npm run test:integration` to confirm existing integration tests still pass.
3. Add the new E2E test for click-to-toggle.
4. Run `npm run test:e2e` to confirm the new test and all existing E2E tests pass.
5. Run `npm run test:all` for final validation.
6. Run `npm run build` to confirm no TypeScript or build errors.

### Scope Summary

This is a **small, verification-focused story**. The main implementation work was done as part of Story 2.1. Story 2.2 adds:
- 1 CSS class (`cursor-pointer`) for UX feedback
- 1 new E2E test for explicit click-to-toggle validation
- Verification that existing integration coverage is sufficient

Estimated file changes: ~2 lines in `TaskCard.tsx`, ~50 lines in `e2e/time-tracker.spec.ts`.

### References

| Resource | Path |
|---|---|
| Epic definition | `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.2) |
| Project rules | `_bmad-output/project-context.md` |
| Predecessor story | `_bmad-output/implementation-artifacts/2-1-drag-tasks-from-the-card-surface.md` |
| Card interaction code | `src/components/TaskCard.tsx` |
| DnD context + toggle lock | `src/components/TaskGrid.tsx` |
| Store timer logic | `src/store/useTimeTrackerStore.ts` → `toggleTimer`, `startTimer`, `stopTimer` |
| E2E tests | `e2e/time-tracker.spec.ts` |
| Integration tests | `src/test/integration/app.integration.test.tsx` |
| App wiring | `src/App.tsx` → `onToggleTimer` prop |
