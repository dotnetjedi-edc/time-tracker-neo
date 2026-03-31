---
title: "Toggle Timer With a Simple Card Click or Tap"
story_id: "2.2"
story_key: "2-2-toggle-timer-with-a-simple-card-click-or-tap"
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
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Task cards remain presentational and receive onToggleTimer from App.tsx",
    "Timer switching logic already lives in useTimeTrackerStore.toggleTimer/startTimer/stopTimer",
    "TaskCard currently mixes a drag surface on the article with nested secondary buttons and a central toggle control",
    "French accessible labels and task-card data-testid hooks remain part of the UI contract",
  ]
test_patterns:
  [
    "Integration tests should assert visible active-state changes and modal independence through roles and labels",
    "Playwright scenarios should validate click behavior through task-card containers and visible timer state rather than implementation details",
    "Existing store tests already cover timer switching and single-active-timer behavior; this story should focus on UI interaction wiring",
  ]
---

## Story 2.2: Toggle Timer With a Simple Card Click or Tap

Status: review

## Story

As a time-tracking user,
I want to start or stop timing with a simple click or tap on a task card,
so that I can control timing quickly without aiming for a small control.

## Acceptance Criteria

1. Given a task has no active timer, when the user performs a simple click or tap on the task card, then the timer starts for that task, and the task immediately reflects its active state.
2. Given a task is currently active, when the user performs a simple click or tap on the same task card, then the timer stops, and the tracked time is added to the task using the existing session model.
3. Given another task is already active, when the user performs a simple click or tap on a different task card, then the existing active timer is finalized correctly, and the newly selected task becomes the only active timer.

## Tasks / Subtasks

- [x] Task 1: Make simple card clicks toggle the timer from the whole intended card surface (AC: 1, 2)
  - [x] Refactor `src/components/TaskCard.tsx` so a simple click or tap on the task-card surface toggles timing without requiring the central control target.
  - [x] Preserve the existing central visual control affordance if useful, but avoid duplicate toggle handling from nested click targets.
  - [x] Ensure the active-state badge and elapsed time continue to reflect the timer state immediately after the interaction.

- [x] Task 2: Preserve single-active-timer switching behavior through card clicks (AC: 3)
  - [x] Reuse the existing `onToggleTimer -> useTimeTrackerStore.toggleTimer` path instead of adding parallel timer state in the component.
  - [x] Verify that clicking another card cleanly finalizes the previous active timer and activates the new one.

- [x] Task 3: Keep non-toggle controls independent while broadening click-to-toggle behavior (AC: 1, 2, 3)
  - [x] Preserve independent activation of `Modifier`, `Temps manuel`, and `Historique` without unintentionally toggling a timer.
  - [x] Keep drag wiring compatible with the current card-surface reorder affordance rather than regressing Story 2.1.
  - [x] Avoid introducing double toggles from bubbling between nested interactive regions.

- [x] Task 4: Add regression coverage for card click-to-toggle behavior (AC: 1, 2, 3)
  - [x] Add integration coverage in `src/test/integration/app.integration.test.tsx` for starting, stopping, and switching timers via simple card clicks.
  - [x] Add or update Playwright coverage in `e2e/time-tracker.spec.ts` so the user flow validates clicking the card surface instead of only the labeled timer button.

## Dev Notes

### Story Foundation

- This story maps directly to Epic 2 Story 2.2 in `_bmad-output/planning-artifacts/epics.md`.
- Story 2.1 already broadened drag initiation to the card surface. Story 2.2 extends the same card interaction model so ordinary clicks/taps also control timing.
- The app already enforces the single-active-timer rule in the store. This story should expose that behavior through card-level interaction, not reimplement timer logic.

### Existing Code Reality

- `src/components/TaskCard.tsx` currently has:
  - article-level drag start wiring for pointer/touch,
  - a grip button that still serves as drag handle,
  - a central control labeled `Basculer le chrono pour ${task.name}`,
  - secondary buttons for edit, manual time, and history.
- `src/store/useTimeTrackerStore.ts` already guarantees the desired timer semantics:
  - clicking the active task again stops it,
  - clicking another task stops the current timer and starts the new one,
  - task totals and sessions are synchronized through the existing session model.

### Architecture And Implementation Guardrails

- Keep timer business logic in the store. Do not duplicate start/stop/switch rules in React state.
- Preserve French user-facing copy and existing task-card `data-testid` hooks.
- Avoid invalid interactive nesting or duplicated click handlers that would fire `onToggleTimer` twice.
- Preserve Story 2.1 drag behavior while implementing click-to-toggle. Do not regress reorder persistence or drag affordance.
- Do not introduce new dependencies.

### Specific Developer Guidance

- The safest direction is to centralize timer toggling at the card surface level while explicitly opt-outing secondary controls from bubbling into that action.
- If drag and click share the same surface, the component needs a lightweight suppression path so a drag gesture is not interpreted as a simple click when the pointer/touch has moved meaningfully.
- Match the existing drag threshold philosophy rather than inventing a different interaction model. Story 2.3 will harden drag-vs-click edge cases further, but Story 2.2 must not ship with obvious accidental double toggles.
- Keep accessible labels stable for current timer controls unless tests are updated in the same change.

### Regression Risks To Prevent

- Do not let clicks on `Modifier`, `Temps manuel`, or `Historique` toggle the timer.
- Do not break Story 2.1 card-surface dragging.
- Do not double-trigger toggles because both a child control and the card container handle the same click.
- Do not bypass the existing store path for switching active tasks.

### Testing Standards Summary

- Prefer integration tests that click real card containers and assert visible `Actif`/`Prêt` state plus timer outcomes.
- Use Playwright to confirm end-to-end click-to-start and click-to-stop behavior on actual task cards.
- Existing unit coverage in the store already covers timer switching semantics; UI coverage is the priority here.

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

- Added card-surface click handling in `TaskCard` while keeping timer state orchestration in the existing Zustand store.
- Added a lightweight click-suppression path based on pointer/touch movement so drag-like motion does not immediately become a simple card click.
- Updated secondary action buttons to stop click propagation cleanly while preserving their existing modal behavior.
- Validated with `npm run test:all` and `npm run build`.

### Completion Notes List

- Simple click or tap on a task card now starts and stops timing without requiring the central control target.
- Clicking a different task card now switches the active timer through the existing store logic.
- Secondary controls remain independent and Story 2.1 drag behavior remains intact.
- Regression coverage now validates card-surface click-to-toggle in integration and browser tests.

### File List

- `_bmad-output/implementation-artifacts/2-2-toggle-timer-with-a-simple-card-click-or-tap.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/TaskCard.tsx`
- `src/test/integration/app.integration.test.tsx`
- `e2e/time-tracker.spec.ts`

### Change Log

- 2026-03-21: Story created from Epic 2 backlog with guardrails for whole-card click-to-toggle behavior.
- 2026-03-21: Implemented Story 2.2 with whole-card click/tap timer toggling, preserved secondary controls, and validated the interaction suite.
