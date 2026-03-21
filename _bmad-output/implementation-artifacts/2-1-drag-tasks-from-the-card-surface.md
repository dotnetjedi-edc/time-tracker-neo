---
title: "Drag Tasks From the Card Surface"
story_id: "2.1"
story_key: "2-1-drag-tasks-from-the-card-surface"
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
    "Task cards are presentational and receive handlers from App.tsx rather than reading the store directly",
    "Task ordering persistence already flows through TaskGrid onReorder -> App.tsx setTaskOrder -> useTimeTrackerStore.applyTaskOrder",
    "Current drag activation is configured in TaskGrid with PointerSensor distance 8 and TouchSensor delay 150 tolerance 8",
    "The current sortable activator is the grip button in TaskCard via dragHandleProps={{ ...attributes, ...listeners }}",
    "French accessibility labels and task-card data-testid values are part of the effective UI contract",
  ]
test_patterns:
  [
    "Integration tests use Testing Library and should prefer accessible roles/names over implementation details",
    "Playwright drag coverage currently targets the grip button and asserts visual order via task-card headings",
    "Store behavior for persisted task ordering already has unit coverage; this story should focus on interaction wiring and regression safety",
  ]
---

## Story 2.1: Drag Tasks From the Card Surface

Status: review

## Story

As a time-tracking user,
I want to drag a task from the card surface instead of a tiny handle,
so that reordering tasks feels natural on desktop and touch devices.

## Acceptance Criteria

1. Given the task grid is displayed, when the user presses and moves from the primary task card surface with a valid drag gesture, then the task enters drag mode, and the task can be reordered without relying on a small grip-only target.
2. Given a task is dragged from the card surface, when the drag operation completes over another task position, then the task order is updated, and the new order is persisted using the existing task ordering model.
3. Given the user is on a touch device, when the user performs the configured drag gesture from the card surface, then the drag interaction behaves consistently with desktop behavior, and the interaction remains touch-friendly.

## Tasks / Subtasks

- [x] Task 1: Move drag initiation from the grip-only control to the primary card surface (AC: 1, 3)
  - [x] Refactor `src/components/TaskCard.tsx` so the sortable activator covers the intended primary card surface instead of only the `Réorganiser ...` grip button.
  - [x] Preserve valid interactive semantics while widening drag initiation. Do not introduce invalid nested interactive controls or rely on a drag activator structure that conflicts with existing buttons.
  - [x] Keep the visible grip affordance only as a cue if it still adds value, but do not require it for successful drag start.

- [x] Task 2: Preserve existing reorder persistence and drag feedback (AC: 2)
  - [x] Keep `TaskGrid` reorder flow aligned with the existing `orderedTaskIds` preview and `onReorder(finalTaskIds)` persistence path.
  - [x] Preserve overlay sizing, active drag styling, and reset behavior on drag end/cancel.
  - [x] Ensure no changes bypass `setTaskOrder` or duplicate ordering logic outside the existing store path.

- [x] Task 3: Keep secondary controls independently operable while broadening drag initiation (AC: 1, 3)
  - [x] Preserve independent activation of `Modifier`, `Temps manuel`, and `Historique` controls.
  - [x] Preserve the current `Basculer le chrono ...` control behavior for simple clicks until Story 2.2 intentionally expands that interaction.
  - [x] Ensure touch and pointer drag activation still relies on the configured thresholds in `TaskGrid` rather than ad hoc gesture logic.

- [x] Task 4: Add regression coverage for surface-based drag initiation (AC: 1, 2, 3)
  - [x] Add or update integration coverage in `src/test/integration/app.integration.test.tsx` for the widened drag affordance and preserved secondary controls.
  - [x] Update Playwright coverage in `e2e/time-tracker.spec.ts` so drag-and-drop starts from the card surface instead of the small grip button.
  - [x] Cover at least one touch-oriented or phone-sized scenario proving the broader drag affordance remains usable without horizontal overflow or hidden controls.

## Dev Notes

### Story Foundation

- This story maps directly to Epic 2 Story 2.1 in `_bmad-output/planning-artifacts/epics.md`.
- The current product already persists task order correctly after drag-and-drop. The missing behavior is the interaction affordance: drag can only start from the small grip button in the upper-left of the card.
- This story is the first Epic 2 story. It should prepare, not prematurely complete, the later click-versus-drag refinement in Stories 2.2 through 2.4.

### Existing Code Reality

- `src/components/TaskCard.tsx` currently splits the card into three interactive regions:
  - A grip button labeled `Réorganiser ${task.name}` with `dragHandleProps` spread onto it.
  - A large primary button labeled `Basculer le chrono pour ${task.name}` that occupies most of the card body.
  - Secondary action buttons for edit, manual time, and history.
- `src/components/TaskGrid.tsx` already contains the full reorder pipeline:
  - Sensors are defined with `PointerSensor` distance `8` and `TouchSensor` delay `150` / tolerance `8`.
  - Drag preview ordering is held in local `orderedTaskIds` state.
  - Persistence happens only through `onReorder(finalTaskIds)` after a changed order is detected.
- `src/store/useTimeTrackerStore.ts` already contains the persisted ordering implementation in `setTaskOrder` via `applyTaskOrder(...)`. This story should reuse that path rather than introduce new ordering state or persistence behavior.

### Architecture And Implementation Guardrails

- Keep persisted business logic in the Zustand store and keep this story focused on component interaction wiring.
- Preserve French UI copy and the existing `data-testid={`task-card-${task.id}`}` contract.
- Preserve the current single active timer model. This story is not a timer-domain change.
- Do not introduce new dependencies. The existing `@dnd-kit/core` and `@dnd-kit/sortable` stack is sufficient.
- Do not replace the existing sensor configuration with custom pointer math unless a failing test proves the current configuration is insufficient.
- Do not implement hidden menus or remove existing controls to make room for drag behavior.

### Specific Developer Guidance

- The risky part of this story is the current structure in `TaskCardSurface`: the main visual surface is already a button used for timer toggling, and separate child buttons exist for edit/manual/history.
- Because Story 2.2 owns the broader click-to-toggle interaction, Story 2.1 should widen drag initiation without redefining the current click contract for the entire card.
- A safe direction is to broaden the sortable activator to a larger non-button surface or container region while explicitly keeping secondary buttons outside the activator path.
- If you keep a dedicated activator node, ensure it visually reads as the card surface rather than a tiny grip target.
- `dnd-kit` supports attaching sortable listeners to a broader source element or dedicated activator node; use that capability instead of adding parallel drag state.

### Regression Risks To Prevent

- Do not accidentally make simple clicks on secondary controls start a drag.
- Do not break the current Playwright and Testing Library assumptions around French accessible names.
- Do not regress reorder persistence by bypassing `TaskGrid` local preview state or `setTaskOrder`.
- Do not introduce nested button semantics that reduce accessibility or create browser-dependent pointer behavior.
- Do not change timer start/stop rules in the store as part of this story.

### Testing Standards Summary

- Prefer interaction tests that prove behavior through roles, labels, visible order, and `data-testid` hooks rather than implementation-specific class inspection.
- Keep unit coverage focused on existing store ordering behavior; this story mainly needs integration and E2E coverage for interaction wiring.
- Update the current drag E2E test to initiate drag from the card surface because it currently grabs the `Réorganiser beta` handle.
- Where touch behavior is validated, keep assertions focused on successful interaction and preserved controls rather than pixel-perfect motion details.

### References

- Epic requirements: `_bmad-output/planning-artifacts/epics.md`.
- Current drag handle implementation: `src/components/TaskCard.tsx` and `src/components/TaskGrid.tsx`.
- Persisted order path: `src/store/useTimeTrackerStore.ts`.
- Existing interaction coverage: `src/test/integration/app.integration.test.tsx` and `e2e/time-tracker.spec.ts`.
- Latest technical note: `dnd-kit` `useSortable` supports attaching listeners/attributes to a broader sortable activator node or handle, which is the preferred extension point for this story instead of custom drag infrastructure.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Created a failing Playwright regression by changing drag start from the dedicated grip to the card surface.
- Moved sortable listeners and attributes from the grip button to the main `Basculer le chrono ...` button while keeping the grip as a visual affordance only.
- Added integration coverage confirming `Temps manuel` and `Modifier` remain independently operable.
- Verified with `npm run test:all` and `npm run build`.

### Completion Notes List

- Drag-and-drop now starts from the main task-card surface instead of requiring the small grip handle.
- Reorder persistence still flows through the existing `TaskGrid` preview state and Zustand `setTaskOrder` path with no store logic changes.
- Secondary actions remain independently clickable while the main surface stays draggable.
- Regression coverage now includes card-surface drag in Playwright and secondary-action operability in integration tests.

### File List

- `_bmad-output/implementation-artifacts/2-1-drag-tasks-from-the-card-surface.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/TaskCard.tsx`
- `src/test/integration/app.integration.test.tsx`
- `e2e/time-tracker.spec.ts`

### Change Log

- 2026-03-21: Story created from Epic 2 backlog with repository-specific implementation guardrails and regression guidance.
- 2026-03-21: Implemented Story 2.1, widened drag initiation to the card surface, updated regression coverage, and marked the story ready for review.
