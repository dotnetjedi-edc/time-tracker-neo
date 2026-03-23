---
title: "Drag Tasks From the Card Surface"
story_id: "2.1"
story_key: "2-1-drag-tasks-from-the-card-surface"
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
    "src/components/TaskGrid.tsx",
    "e2e/time-tracker.spec.ts",
  ]
files_for_reference:
  [
    "src/App.tsx",
    "src/types.ts",
    "src/store/useTimeTrackerStore.ts",
    "src/test/setup.ts",
    "src/test/integration/app.integration.test.tsx",
    "_bmad-output/project-context.md",
    "_bmad-output/planning-artifacts/epics.md",
    "package.json",
  ]
code_patterns:
  [
    "Task cards are presentational — they receive handlers from App.tsx and never read the store directly",
    "Task ordering persistence flows: TaskGrid onReorder -> App.tsx setTaskOrder -> useTimeTrackerStore.setTaskOrder -> applyTaskOrder -> API",
    "Drag activation is configured in TaskGrid with PointerSensor distance:8 and TouchSensor delay:0 tolerance:5",
    "The current sortable activator is the grip button in TaskCard — dragHandleProps={{ ...attributes, ...listeners }} is spread on the grip button only",
    "French accessibility labels (Réorganiser, Basculer le chrono, Modifier, Temps manuel, Historique) are part of the UI test contract",
    "data-testid={task-card-${task.id}} on the <article> element is a test contract — preserve it",
    "Secondary controls use data-card-control attribute and stopPropagation on pointer/touch events to stay independently operable",
    "TaskCard already tracks pointer movement via pointerStartRef/suppressClickRef to suppress click events after drag motion — handlers are passed as props to TaskCardSurface",
  ]
test_patterns:
  [
    "Unit tests: Vitest + jsdom — pure helpers and store logic in src/lib and src/store",
    "Integration tests: Vitest + Testing Library + user-event in src/test/integration/ — accessible roles/names over implementation details",
    "E2E tests: Playwright against local Vite server at 127.0.0.1:4173 — full user flows including drag-and-drop",
    "Test cleanup: resetTimeTrackerStore() + Testing Library cleanup in src/test/setup.ts",
    "Store behavior for persisted task ordering already has coverage — this story focuses on interaction wiring and regression safety",
    "E2E drag tests currently target the grip button position (x+28 y+28 from card top-left); must be updated to target card surface",
  ]
---

## Story 2.1: Drag Tasks From the Card Surface

Status: draft

## Story

As a time-tracking user,
I want to drag a task from the card surface instead of a tiny handle,
so that reordering tasks feels natural on desktop and touch devices.

## Acceptance Criteria

### AC1: Drag initiation from the card surface

**Given** the task grid is displayed
**When** the user presses and moves from the primary task card surface with a valid drag gesture
**Then** the task enters drag mode
**And** the task can be reordered without relying on a small grip-only target

### AC2: Reorder persistence after surface drag

**Given** a task is dragged from the card surface
**When** the drag operation completes over another task position
**Then** the task order is updated
**And** the new order is persisted using the existing task ordering model

### AC3: Touch device consistency

**Given** the user is on a touch device
**When** the user performs the configured drag gesture from the card surface
**Then** the drag interaction behaves consistently with desktop behavior
**And** the interaction remains touch-friendly

## Functional Requirements Covered

- **FR5**: The system must allow a user to drag and reorder a task from the task card surface instead of restricting dragging to a small handle only.
- **FR6** (partial): The system must distinguish between a click/tap gesture and a drag gesture on a task card — this story provides the drag-from-surface foundation that Story 2.2 and 2.3 will build upon.

## Tasks / Subtasks

### Task 1: Move drag initiation from the grip-only control to the primary card surface (AC: 1, 3)

- [ ] **1a.** In `src/components/TaskCard.tsx`, move the sortable `listeners` and `attributes` from the grip `<button>` to the outer `<article>` element (the sortable node). The `<article>` already receives `setNodeRef` — it is the correct anchor for the sortable activator.
  - The `useSortable` hook in the `TaskCard` component returns `{ attributes, listeners, setNodeRef, transform, transition, isDragging }`.
  - Currently, `dragHandleProps={{ ...attributes, ...listeners }}` is passed to `TaskCardSurface` and spread on the grip `<button data-card-control="drag-handle">`.
  - Move: spread `attributes` and `listeners` onto the `<article>` element in `TaskCardSurface` instead.
  - **⚠️ CRITICAL — Handler merge required:** The `listeners` from dnd-kit contain `onPointerDown`. The `<article>` already has an `onPointerDown` handler for click-suppression tracking. In React, only one handler per event type is allowed on an element. The dev agent MUST create a merged handler that calls BOTH (first the custom tracking handler, then the dnd-kit listener). Do NOT simply spread `{...listeners}` alongside existing handlers — this will overwrite one or the other. Same logic applies if `listeners` contains other conflicting handlers (e.g., `onKeyDown`).
  - The pointer handlers in `TaskCard` (`handlePointerDown`, `handlePointerMove`, `handlePointerEnd`) already track pointer delta to suppress accidental clicks during movement — keep them; they complement the dnd-kit sensor activation.
  - **TypeScript type update:** The `dragHandleProps` prop in `TaskCardSurfaceProps` is currently typed as `ComponentPropsWithoutRef<"button">`. Since listeners will now be spread on an `<article>`, update to accept article-compatible props or split into separate `sortableAttributes` and `sortableListeners` props.

- [ ] **1b.** Decide whether to keep or remove the grip `<button>` visual affordance:
  - Keep the `<GripVertical>` icon as a **visual cue** only (non-interactive), so users still see the drag affordance. Convert it from a `<button>` to a `<div>` or `<span>` since it no longer needs to be an interactive activator.
  - Remove `aria-label="Réorganiser ${task.name}"` from the grip element since it is no longer a button. Instead, add `role="group"` and `aria-roledescription="draggable"` attributes on the `<article>` to signal drag capability accessibly.
  - **Accessibility spread order:** The explicit `role` and `aria-roledescription` attributes MUST be placed AFTER `{...attributes}` in the JSX to override dnd-kit's default values (which may set `role="button"` and `aria-roledescription="sortable"`).
  - Remove `tabIndex` and `dragHandleProps` from the grip element entirely.

- [ ] **1c.** Ensure the `<article>` element supports keyboard drag interaction:
  - When `attributes` are spread on the `<article>`, dnd-kit's `KeyboardSensor` will work from it. Verify that `tabIndex={0}` (provided by `attributes`) is compatible with the existing `<article>` element and does not conflict with child button focus.
  - Preserve the `isDragging && !isOverlay ? -1 : undefined` tabIndex logic for children to avoid focus trapping during drag.

### Task 2: Preserve existing reorder persistence and drag feedback (AC: 2)

- [ ] **2a.** Do NOT change `TaskGrid.tsx` reorder logic. Verify that:
  - `handleDragStart` / `handleDragOver` / `handleDragEnd` / `handleDragCancel` still work correctly when drag starts from the wider article surface.
  - `orderedTaskIds` preview state, overlay sizing, and `onReorder(finalTaskIds)` path remain unchanged.
  - The `lockedToggleTaskId` mechanism still correctly prevents timer toggles on the dragged task.
  - Auto-scroll during drag (the `autoScroll` requestAnimationFrame loop) still works.

- [ ] **2b.** Verify the `DragOverlay` rendering:
  - `TaskCardOverlay` (rendered in `DragOverlay`) uses `isOverlay={true}` and does not receive sortable listeners — this should remain unchanged.
  - The overlay width calculation from `event.active.rect.current.initial?.width` should still resolve correctly when the drag activator is the entire card.

### Task 3: Keep secondary controls independently operable (AC: 1, 3)

- [ ] **3a.** Secondary controls MUST remain click-operable without triggering drag:
  - The edit button (`Modifier ${task.name}`), manual time button (`Temps manuel`), and history button (`Historique`) all have `data-card-control="secondary"` and call `event.stopPropagation()` on both `onClick` and `onPointerDown`/`onTouchStart`.
  - Adding sortable `listeners` to the `<article>` means `onPointerDown` from dnd-kit will fire on the article. The existing `stopPropagation()` on secondary buttons should prevent the dnd-kit sensor from capturing those events. **Verify this works** — if not, secondary buttons may need `event.stopPropagation()` on the `onPointerDown` from dnd-kit's perspective. Note: dnd-kit PointerSensor has a `distance` activation constraint (8px) which provides natural protection, but `stopPropagation` is the primary safeguard.
  - The grip element (now visual-only) no longer needs `stopPropagation` since it is not interactive.

- [ ] **3b.** The timer toggle button (`Basculer le chrono pour ${task.name}`) currently occupies most of the card body. With listeners now on the `<article>`:
  - Clicks on this button still go through `handleCardClick` -> `onToggleTimer` flow (when no drag detected).
  - The existing `suppressClickRef` logic already prevents timer toggles when pointer movement exceeds 6px.
  - dnd-kit's PointerSensor distance:8 threshold means a gesture must travel 8px before being captured as drag. The 6px threshold in `suppressClickRef` provides an additional safety margin.
  - **Do NOT change timer toggle behavior** in this story. Story 2.2 will expand click-to-toggle to the full card surface.

### Task 4: Update E2E regression coverage for surface-based drag (AC: 1, 2, 3)

- [ ] **4a.** Update the existing Playwright drag test `"reorders task cards with drag and drop"` in `e2e/time-tracker.spec.ts`:
  - Currently starts drag from `x+28, y+28` of a card which targets the grip button area.
  - Change to start from a point clearly within the card surface body (e.g., center of card) to prove surface-level drag initiation works.
  - Keep the same assertions: verify visual order changes via `[data-testid^="task-card-"] h3` selectors.

- [ ] **4b.** Update the existing Playwright test `"does not start a timer when dragging an inactive task card"`:
  - Same change: start drag from card surface center instead of grip area.
  - Keep assertion that no timer starts (no `chrono actif` banner, both cards show `Pret`).

- [ ] **4c.** Update the existing Playwright test `"keeps the active timer running when the active card is reordered"`:
  - Same change: start drag from card surface center.
  - Keep assertions that order changes AND active timer remains active on the correct task.

- [ ] **4d.** Verify the mobile compact card test `"keeps task cards compact and operable on a phone-sized viewport"` (viewport 390x844) still passes without changes — touch targets and secondary actions should remain operable.

## Dev Notes

### Story Foundation

- This story is **Epic 2, Story 2.1** from `_bmad-output/planning-artifacts/epics.md`.
- It is the **first story in Epic 2** to move to development. Stories 2.2 (click-to-toggle), 2.3 (prevent accidental toggles during drag), and 2.4 (regression coverage) build on top of this foundation.
- The product already persists task order correctly after drag-and-drop via the API. The only missing behavior is the **interaction affordance**: drag can currently only start from the small grip button in the upper-left corner of the card.
- This story should **prepare but not prematurely complete** the later click-versus-drag refinement in Stories 2.2-2.4.

### Existing Code Reality

#### `src/components/TaskCard.tsx` (~310 lines)

The file contains three exports:
1. **`TaskCardSurface`** (internal) — The presentational card layout. Receives all props including `dragHandleProps`, pointer event handlers, and `setNodeRef`. The `<article>` is the root element and already serves as the sortable node ref.
2. **`TaskCard`** (public) — Calls `useSortable({ id: task.id })` and wires everything together. Passes `dragHandleProps={{ ...attributes, ...listeners }}` to TaskCardSurface, which spreads them on the grip button.
3. **`TaskCardOverlay`** (public) — Used in DragOverlay (no sortable listeners, `isOverlay={true}`).

**Current interactive regions in TaskCardSurface:**

| Region | Element | Behavior | Key Props |
|---|---|---|---|
| Grip handle | `<button data-card-control="drag-handle">` | Drag activator + keyboard | `{...dragHandleProps}` = `{...attributes, ...listeners}` |
| Edit button | `<button data-card-control="secondary">` | Opens edit modal | `onClick` + `stopPropagation` |
| Timer body | `<button aria-label="Basculer le chrono...">` | Visual only (no click handler directly) | `disabled` during drag |
| Manual time | `<button data-card-control="secondary">` | Opens manual time modal | `onClick` + `stopPropagation` |
| History | `<button data-card-control="secondary">` | Opens history modal | `onClick` + `stopPropagation` |
| Card surface | `<article>` | Click -> `handleCardClick` -> `onToggleTimer` | `onPointerDown/Move/Up/Cancel`, `onClick` |

**Click suppression mechanism already in TaskCard:**
- `pointerStartRef` records pointer coordinates on `pointerDown`.
- `handlePointerMove` sets `suppressClickRef = true` if delta > 6px.
- `handleToggleTimer` returns early if `suppressClickRef` is true.
- `handlePointerEnd` resets refs asynchronously via `setTimeout(..., 0)`.

#### `src/components/TaskGrid.tsx` (~365 lines)

This file owns the entire DnD context:
- **Sensors**: `PointerSensor` (distance: 8), `TouchSensor` (delay: 0, tolerance: 5), `KeyboardSensor`.
- **State**: `draggedTaskId`, `dragOverlayWidth`, `lockedToggleTaskId`, `orderedTaskIds`.
- **Toggle lock**: `scheduleToggleUnlock` sets `lockedToggleTaskId` during drag and clears it after drop (via `setTimeout(..., 0)`).
- **Auto-scroll**: Custom requestAnimationFrame loop tracking pointer position with edge-threshold scrolling during drag.
- **Drag overlay**: `<DragOverlay>` renders `TaskCardOverlay` with constrained width.
- **Persistence**: Only on `handleDragEnd` when order actually changed -> `onReorder(finalTaskIds)`.

**Sensor->Event flow when drag starts from grip button (current):**
1. PointerSensor captures `pointerdown` on grip button.
2. After 8px movement, sensor activates -> `handleDragStart` fires.
3. `lockedToggleTaskId` is set, `orderedTaskIds` snapshot taken.
4. Drag overlay appears.
5. On drop: `handleDragEnd` -> persist if changed -> reset state.

**After this story (drag from article surface):**
1. PointerSensor captures `pointerdown` on `<article>` (unless stopped by a child).
2. Same activation flow — no changes needed in TaskGrid.

#### `src/store/useTimeTrackerStore.ts` — Relevant actions

- `setTaskOrder(taskIds: string[])` — Calls `applyTaskOrder(currentTasks, taskIds)` to compute new positions, then persists changed tasks via `apiClient.tasks.update(...)`. **Do not modify this.**
- `reorderTasks(activeTaskId, overTaskId)` — Alternative action, not used by TaskGrid. **Ignore.**
- `toggleTimer(taskId)` — Starts/stops timer. **Do not touch.**

#### `e2e/time-tracker.spec.ts` — Existing drag E2E tests

Three drag-related tests exist (all desktop viewport):
1. **`"reorders task cards with drag and drop"`** (line ~113): Creates Alpha+Beta, drags Beta to Alpha position via grip coords (x+28, y+28).
2. **`"does not start a timer when dragging an inactive task card"`** (line ~151): Creates Alpha+Beta, drags Alpha via grip coord, asserts no timer started.
3. **`"keeps the active timer running when the active card is reordered"`** (line ~196): Creates Alpha+Beta, starts Alpha timer, drags Alpha via grip coord, asserts timer still active + order changed.

All three tests use `page.mouse.move/down/up` with 20 steps. Drag origin is consistently `cardBox.x + 28, cardBox.y + 28`.

### Guardrails — What NOT To Do

1. **Do NOT modify `TaskGrid.tsx` sensor configuration** — PointerSensor distance:8 and TouchSensor delay:0/tolerance:5 are correct for surface-level drag. Only change if a test proves otherwise.
2. **Do NOT change any store logic** — `setTaskOrder`, `toggleTimer`, `startTimer`, `stopTimer` must remain unchanged.
3. **Do NOT add new npm dependencies** — @dnd-kit stack is sufficient.
4. **Do NOT change the timer toggle click behavior** — That belongs to Story 2.2. The `handleCardClick` and `handleToggleTimer` logic must stay as-is.
5. **Do NOT remove the grip icon visual** — Users need a drag affordance cue. Keep the GripVertical icon visible but make it non-interactive.
6. **Do NOT change `data-testid` attributes** — They are a test contract.
7. **Do NOT change French accessibility labels on secondary buttons** — `Modifier`, `Temps manuel`, `Historique` labels are tested.
8. **Do NOT create new files** — All changes fit within existing files.
9. **Do NOT introduce `cursor: grab` on the entire article** — Only add grab cursor cues that do not conflict with the existing hover/active states. The `isOverlay` state already uses `cursor-grabbing`.
10. **Do NOT modify the `DragOverlay` or `TaskCardOverlay`** — They are not part of this story's scope.

### Testing Standards Summary

| Layer | What to test | Where |
|---|---|---|
| E2E (Playwright) | Surface drag reorders tasks; no timer toggle on drag; active timer preserved during drag | `e2e/time-tracker.spec.ts` — update 3 existing tests |
| E2E (Playwright) | Mobile test still passes (no breakage) | Existing test — verify, do not modify |
| Integration | Not expected to require changes — existing integration tests validate secondary control operability | `src/test/integration/app.integration.test.tsx` — run existing tests |
| Unit | Not expected to require changes — store ordering logic is already covered | `src/store/useTimeTrackerStore.test.ts` — run existing tests |

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

1. Modify `TaskCard.tsx` — move listeners from grip to article, convert grip to visual-only.
2. Run existing tests (`npm run test:all`) to detect regressions.
3. Update 3 E2E drag tests to initiate from card center.
4. Run all tests again to confirm green.
5. Manual check: verify secondary buttons still work in browser.

### Key Technical Detail — How dnd-kit Listeners Work on the Article

When `listeners` from `useSortable` are spread onto the `<article>`:
- dnd-kit attaches `onPointerDown` (and other handlers) on the article.
- If a child element calls `event.stopPropagation()` on `pointerdown`, the sensor never sees the event -> no drag activates from that child.
- Secondary buttons already call `onPointerDown={(e) => e.stopPropagation()}` -> they will remain independently operable.
- The timer toggle `<button>` inside the card does NOT call `stopPropagation` on `pointerdown` -> pointer events will bubble to the article -> dnd-kit sensor can capture them -> drag can start from the timer body area too.
- This is correct behavior: the full card body becomes draggable, and only explicitly protected buttons (secondary controls) remain non-draggable.

### References

| Resource | Path |
|---|---|
| Epic definition | `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.1) |
| Project rules | `_bmad-output/project-context.md` |
| Architecture | `_bmad-output/architecture.md` |
| Current drag handle | `src/components/TaskCard.tsx` |
| DnD context | `src/components/TaskGrid.tsx` |
| Store ordering | `src/store/useTimeTrackerStore.ts` -> `setTaskOrder` |
| E2E tests | `e2e/time-tracker.spec.ts` |
| Integration tests | `src/test/integration/app.integration.test.tsx` |
| Test setup | `src/test/setup.ts` |
| Domain types | `src/types.ts` |
| App composition | `src/App.tsx` |
