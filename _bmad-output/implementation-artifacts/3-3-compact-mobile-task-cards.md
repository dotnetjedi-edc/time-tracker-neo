---
title: "Compact Task Cards for Phone-Sized Screens"
story_id: "3.3"
story_key: "3-3-compact-mobile-task-cards"
created: "2026-03-20"
status: "ready-for-dev"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 3: Compact and Action-Focused Workspace"
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Tailwind CSS",
    "Zustand persist",
    "dnd-kit",
    "Vitest",
    "Playwright",
    "lucide-react",
  ]
files_to_modify:
  [
    "src/components/TaskCard.tsx",
    "src/components/TaskGrid.tsx",
    "src/App.tsx",
    "src/index.css",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Presentational components receive derived props from App.tsx rather than reading the store directly",
    "Task cards rely on Tailwind utility classes with responsive breakpoints embedded inline",
    "Drag and reorder behavior is implemented with dnd-kit PointerSensor and TouchSensor activation constraints",
    "French UI copy with English identifiers and component names",
    "Recent workspace changes already compacted the header and added a global active timer banner; this story must not regress that work",
  ]
test_patterns:
  [
    "Integration tests render App and assert French accessible names",
    "Playwright scenarios clear localStorage before each run and interact through aria labels and test ids",
    "Responsive verification should cover phone-sized viewports without introducing brittle pixel-perfect assertions",
  ]
---

# Story 3.3: Compact Task Cards for Phone-Sized Screens

Status: review

## Story

As a time-tracking user,
I want task cards to take less vertical space on a phone-sized screen,
so that I can scan and reach more tasks without excessive scrolling.

## Acceptance Criteria

1. Given the task grid is displayed on a phone-sized viewport, when the task cards are rendered, then each card uses a more compact mobile layout with reduced vertical footprint, and the interface exposes more task content within the same visible screen area.
2. Given a task card is shown on a phone-sized viewport, when the compact layout is applied, then the timer status, task title, total time, drag affordance, and secondary actions remain readable and reachable, and touch targets stay usable without overlapping or truncating core controls.
3. Given tasks have long names, comments, tags, or active timing state, when the compact mobile card layout is displayed, then the content adapts without breaking the visual hierarchy, and the active-state and drag interactions continue to behave consistently with the existing card behavior.

## Tasks / Subtasks

- [x] Task 1: Define the compact mobile card layout in the existing card component (AC: 1, 2, 3)
  - [x] Reduce mobile-only vertical footprint in `src/components/TaskCard.tsx` by tightening min height, padding, internal gaps, and headline/time sizing below the `sm` breakpoint.
  - [x] Preserve larger spacing and typography from `sm` upward unless the desktop/tablet layout clearly benefits from a shared adjustment.
  - [x] Keep the active card visual treatment, timer affordance, drag affordance, and action buttons visually distinct after the compact pass.

- [x] Task 2: Keep the mobile grid and add-card affordance consistent with the smaller cards (AC: 1, 2)
  - [x] Review `src/components/TaskGrid.tsx` so the grid gap and "+ Nouvelle tâche" tile scale coherently with the revised mobile card dimensions.
  - [x] Ensure the drag overlay width logic still matches the resized card surface on small viewports.

- [x] Task 3: Protect touch ergonomics and information hierarchy on dense content (AC: 2, 3)
  - [x] Verify that long task names, optional comments, tag chips, and active timer state wrap or truncate intentionally instead of pushing primary controls out of view.
  - [x] Preserve usable tap targets for reorder, edit, manual time, history, and timer toggle interactions even after tightening layout.
  - [x] Keep the full-card timer toggle and drag gesture separation intact; this story is presentation-focused and must not alter interaction semantics.

- [x] Task 4: Extend responsive regression coverage (AC: 1, 2, 3)
  - [x] Add an integration test in `src/test/integration/app.integration.test.tsx` that renders task cards with representative content and verifies compact mobile rendering does not hide essential actions.
  - [x] Add or update a Playwright scenario in `e2e/time-tracker.spec.ts` for a phone-sized viewport to confirm task cards remain operable, readable, and reorder-safe.
  - [x] Prefer stable assertions based on visibility, accessible names, and layout intent rather than exact pixel heights.

## Dev Notes

### Story Foundation

- This story extends Epic 3's compact-workspace objective from the header into the task grid for phone-sized screens.
- The user request is specific: cards currently feel too large on a phone and should become slightly smaller so more tasks are visible at once.
- Scope is intentionally UI-density focused. Do not introduce store, persistence, timer-domain, or reporting changes unless a genuine rendering defect makes them unavoidable.

### Existing Code Reality

- `src/components/TaskCard.tsx` currently hard-codes a tall mobile presentation with `min-h-[230px]`, `p-5`, `mt-4` or `mt-6` spacing, `text-2xl` task titles, and `text-4xl` timer totals. Those values explain the current oversized feel on phones.
- `src/components/TaskGrid.tsx` renders a single-column grid on narrow widths with `gap-5`, and the add-task tile mirrors the same `min-h-[230px]` footprint, so card compaction should include the add tile for visual consistency.
- `src/App.tsx` follows the project pattern of deriving view props centrally and passing them down. Keep that pattern; do not move responsive logic into the store.
- `src/index.css` defines shared typography families only. Prefer solving layout density through Tailwind classes in components first, and only add CSS if repeated mobile rules become too noisy.

### Guardrails

- Preserve touch-friendly targets. "More compact" must not collapse buttons below a reasonable finger target or create accidental taps.
- Preserve the drag-and-click separation already established in Epic 2 work. This story must not change `dnd-kit` sensor configuration or timer-toggle semantics unless a mobile bug is directly caused by card sizing.
- Preserve the current French UI copy and existing icons from `lucide-react`.
- Preserve the existing active-state styling and the recently added global active timer banner in the header. This story complements that work and must not re-expand the header or duplicate active-timer messaging.
- Avoid pixel-perfect viewport assumptions. The goal is a clearly denser phone layout, not a brittle one-off optimized for a single device width.

### Recent Work Intelligence

- The current branch already contains uncommitted header compaction and recovered-timer visibility changes in `src/App.tsx`, `src/components/Header.tsx`, and related tests. Treat those files as active work and avoid undoing or bypassing them.
- Existing tests were recently updated to preserve recovered timers instead of auto-stopping them. This story should not reintroduce assumptions that refresh or recovery returns cards to a static "Prêt" state.

### Project Structure Notes

- Keep changes focused in the existing component layer: `TaskCard`, `TaskGrid`, and tests.
- Avoid introducing a parallel "mobile card" component. Reuse the current component and refine its responsive classes.
- If class composition starts to get noisy, extract small local constants inside `TaskCard.tsx` before considering any new abstraction.

### Testing Standards Summary

- Unit and integration coverage in this repo is handled with Vitest and Testing Library.
- End-to-end coverage is handled with Playwright using French accessible labels and existing `data-testid` hooks such as `task-card-<id>`.
- Mobile-focused verification should include representative dense content: long task title, comment, multiple tags, active state, and visible secondary actions.

### References

- Source backlog: `_bmad-output/planning-artifacts/epics.md` - Epic 3 and Story 3.3
- Existing task card implementation: `src/components/TaskCard.tsx`
- Existing grid and add-card layout: `src/components/TaskGrid.tsx`
- Root composition and derived-prop pattern: `src/App.tsx`
- Shared typography baseline: `src/index.css`
- Integration test patterns: `src/test/integration/app.integration.test.tsx`
- E2E interaction patterns: `e2e/time-tracker.spec.ts`
- Repo testing conventions: `/memories/repo/testing-stack.md`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- `npm run build`
- `npm run test -- src/test/integration/app.integration.test.tsx`
- `npm run test:e2e -- --grep "keeps task cards compact and operable on a phone-sized viewport"`
- `npm run test:all`

### Completion Notes List

- Reduced mobile task-card density by tightening padding, spacing, title sizing, timer sizing, tag chips, and action button presentation while preserving the existing active-state treatment.
- Kept touch ergonomics intact by using explicit 40px icon targets for reorder and edit actions and maintaining full-card timer toggles plus secondary actions.
- Added mobile-specific handling for dense task content so long names and comments do not expand cards uncontrollably on narrow screens.
- Compacted the task grid gap and the "+ Nouvelle tâche" tile on mobile so the overall workspace scales consistently on phone-sized screens.
- Added integration coverage for compact mobile card rendering and Playwright coverage for phone-sized operability and overflow safety.
- Updated the stale reload Playwright scenario to align with the current recovered-active-timer behavior already present in the application.

### File List

- `_bmad-output/implementation-artifacts/3-3-compact-mobile-task-cards.md`
- `src/components/TaskCard.tsx`
- `src/components/TaskGrid.tsx`
- `src/test/integration/app.integration.test.tsx`
- `e2e/time-tracker.spec.ts`

## Change Log

- 2026-03-20: Implemented Story 3.3 compact mobile task cards, added responsive regression coverage, and aligned the reload E2E test with current recovered-timer behavior.
