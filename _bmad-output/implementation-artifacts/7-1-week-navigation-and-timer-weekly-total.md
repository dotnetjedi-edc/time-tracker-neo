---
title: "Week Navigation and Timer Weekly Total"
story_id: "7.1"
story_key: "7-1-week-navigation-and-timer-weekly-total"
created: "2026-03-30"
status: "review"
epic: "Epic 7: Week Navigation and Weekly Total in Timer"
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Tailwind CSS",
    "Zustand",
    "Vitest",
    "Playwright",
    "lucide-react",
  ]
files_to_modify:
  [
    "src/components/WeeklyView.tsx",
    "src/components/Header.tsx",
    "src/App.tsx",
    "src/store/useTimeTrackerStore.ts",
    "src/lib/weekly.ts",
  ]
files_may_touch:
  [
    "src/types.ts",
    "src/lib/time.ts",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Presentational components receive derived props from App.tsx rather than reading the store directly",
    "Header layout is expressed through Tailwind utility classes with responsive breakpoints inline",
    "French UI copy with English identifiers and component names",
    "Active timer summary is derived in App.tsx and passed into the Header as a presentational prop",
    "Week navigation uses reportAnchor in the Zustand store with moveReportWeek action",
    "Week day computation uses weekDays(anchorDate) from src/lib/time.ts",
    "Session filtering by week uses session.date field compared against weekDays set",
    "React components subscribe to narrow Zustand slices — never broad whole-store subscriptions",
    "Color tokens: ink, mist, coral, mint, gold — reuse existing palette",
  ]
test_patterns:
  [
    "Integration tests render App and assert French accessible names",
    "Playwright scenarios clear localStorage before each run and interact through roles, labels, and test ids",
    "Unit tests for pure helpers in src/lib, integration tests for React/store wiring, E2E for user flows",
    "Use formatHoursMinutes for summary display, formatClock for running timer display",
  ]
---

## Story 7.1: Week Navigation and Timer Weekly Total

Status: review

## Story

As a time-tracking user,
I want the week navigation buttons to actually change the displayed week on both the weekly view and the timer page, and I want the Header timer area to show the total time for the currently selected week,
so that I can review past and future weeks and understand my weekly time investment at a glance.

## Acceptance Criteria

1. **Given** the weekly view is displayed, **when** the user clicks "Semaine précédente" (←), **then** the view shifts to show the previous week's data (dates, sessions, totals all update), **and** clicking "Semaine suivante" (→) shifts forward.

2. **Given** the grid view (timer page) is displayed, **when** the user navigates weeks using navigation controls, **then** the `reportAnchor` updates and the Header reflects the selected week's total time (not just the active timer).

3. **Given** the user is on the grid view, **when** week navigation controls are visible, **then** previous/next week buttons are available in the Header area alongside the existing controls.

4. **Given** the Header timer area, **when** a week other than the current week is selected, **then** the weekly total is displayed using `formatHoursMinutes` and the week date range (e.g. "24 mars – 30 mars") is shown so the user knows which week is active.

5. **Given** the grid view with a non-current week selected, **when** sessions exist for that week, **then** the displayed weekly total includes only sessions whose `date` field falls within the 7 days of that week.

6. **Given** an active timer is running, **when** the user navigates to a different week, **then** the active timer display (HH:MM:SS live clock) remains visible and functioning, **and** the weekly total shown is for the selected week (which may or may not include the active timer's contribution).

7. **Given** the user navigates away from the current week, **when** the current week has an active timer, **then** the weekly total for the selected week does NOT include live active-timer seconds (only completed sessions), **but** if the selected week IS the current week, the total DOES include the live active-timer contribution.

## Tasks / Subtasks

- [x] Task 1: Make week navigation functional on WeeklyView (AC: 1)
  - [x] 1.1 Verify `onMoveWeek` prop is correctly wired from App.tsx to WeeklyView — it calls `moveReportWeek` which calls `shiftWeek`. DEBUG: If buttons don't work, check that `moveReportWeek` store action is actually being called and `reportAnchor` is changing.
  - [x] 1.2 Confirm that `summarizeWeek` properly re-filters sessions when `anchorDate` changes — this should work automatically since WeeklyView uses the passed `anchorDate` prop.
  - [x] 1.3 If week navigation is already wired but appears broken, investigate potential issues: the `reportAnchor` state may not be persisted, or the WeeklyView may not be re-rendering on anchor changes.

- [x] Task 2: Add week navigation controls to the Header / grid view (AC: 2, 3)
  - [x] 2.1 Add `onMoveWeek` callback prop and `reportAnchor` prop to the `Header` component interface.
  - [x] 2.2 Render prev/next week buttons in the Header — position them near the existing controls row, using the same button styling as WeeklyView navigation.
  - [x] 2.3 Wire `onMoveWeek` in App.tsx to pass `moveReportWeek` to Header, same as WeeklyView.
  - [x] 2.4 Ensure buttons are visible in both `grid` and `week` views.

- [x] Task 3: Display weekly total time in the Header (AC: 4, 5, 6, 7)
  - [x] 3.1 Compute `weeklyTotalSeconds` in App.tsx using `summarizeWeek()` from `src/lib/weekly.ts` — pass `reportAnchor`, `sessions`, `tasks`, `selectedTagIds`, `tags`.
  - [x] 3.2 For the current week: add live active-timer elapsed seconds to the weekly total so the user sees real-time accumulation.
  - [x] 3.3 For non-current weeks: display only completed session totals (no live timer contribution).
  - [x] 3.4 Format the total using `formatHoursMinutes()` (e.g. "12h 34m") — NOT `formatClock` which is for running timer display.
  - [x] 3.5 Display the week date range in the Header: format as "dd MMM – dd MMM" (e.g. "24 mars – 30 mars") using `weekDays(reportAnchor)` to get Monday and Sunday.
  - [x] 3.6 Pass `weeklyTotalFormatted` and `weekDateRange` as props to Header.
  - [x] 3.7 Render the weekly total and date range inside the Header — position it visually distinct from the active timer display area so both are clear.

- [x] Task 4: Preserve active timer display alongside weekly total (AC: 6)
  - [x] 4.1 Ensure the active timer HH:MM:SS clock continues updating every second via the existing `now` interval in App.tsx.
  - [x] 4.2 The active timer section and the weekly total section must coexist in the Header without replacing each other.
  - [x] 4.3 When no timer is active, the timer area still shows "--:--:--" as today; the weekly total is always visible.

- [x] Task 5: Test coverage
  - [x] 5.1 Unit test for `summarizeWeek` — verify it filters correctly when anchorDate changes to a different week.
  - [x] 5.2 Unit test for `formatWeekRange` — verify French formatting of week date range.
  - [x] 5.3 E2E test (optional) — navigate weeks and verify the weekly total updates in the header.

## Dev Notes

### Critical Architecture Insights

- **Store action already exists:** `moveReportWeek` in the Zustand store calls `shiftWeek(state.reportAnchor, direction)` which adds/subtracts 7 days. The action is already wired to WeeklyView via `onMoveWeek` prop in App.tsx. **Investigate why it appears non-functional before rewriting.**

- **`reportAnchor` is the single source of truth** for which week is selected. It defaults to `todayKey()`. Both WeeklyView and the new Header weekly total must derive from this same state.

- **`summarizeWeek()` already does all the heavy lifting.** It filters sessions by week days, computes per-day and total seconds. Reuse it in App.tsx for the Header's weekly total computation — do NOT duplicate filtering logic.

- **Active timer live seconds:** The existing `liveTotals` memo in App.tsx adds live timer seconds per-task. For the weekly total, compute the active timer's live contribution separately and add it only when the selected week is the current week.

- **Current week detection:** Compare `startOfWeek(reportAnchor)` with `startOfWeek(todayKey())` — if equal, the selected week is the current week and live timer seconds should be included.

### Existing Patterns to Follow

- **Props-down pattern:** App.tsx computes derived values and passes them to presentational components. The Header does NOT read from the store directly. Compute weekly total in App.tsx and pass it as a prop to Header.

- **Button styling:** Reuse the exact same button classes from WeeklyView's navigation buttons: `rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/30`. On mobile, consider using icon-only or compact variants.

- **French labels:** All user-facing text must be in French. Use "Semaine précédente" / "Semaine suivante" for navigation labels (already in WeeklyView). Use French date formatting for week range.

- **Narrow store subscriptions:** In App.tsx, `reportAnchor` is already subscribed via `useTimeTrackerStore((state) => state.reportAnchor)`. No new store subscriptions needed.

### Key Files and Their Roles

| File                                                                 | Role                                                                | Changes Needed                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [src/store/useTimeTrackerStore.ts](src/store/useTimeTrackerStore.ts) | Zustand store with `moveReportWeek` action + `reportAnchor` state   | **Likely no changes** — action already works. Verify only.                                                        |
| [src/App.tsx](src/App.tsx)                                           | Orchestrator — computes derived values, passes props                | Add `weeklyTotal` computation via `summarizeWeek()`, pass to Header, pass `onMoveWeek` + `reportAnchor` to Header |
| [src/components/Header.tsx](src/components/Header.tsx)               | Presentational — timer display, controls, filters                   | Add week navigation buttons, add weekly total display with date range                                             |
| [src/components/WeeklyView.tsx](src/components/WeeklyView.tsx)       | Weekly report table                                                 | **Likely no changes** — already receives `onMoveWeek` and `anchorDate`. Verify it works.                          |
| [src/lib/weekly.ts](src/lib/weekly.ts)                               | `summarizeWeek()` pure helper                                       | **No changes** — already computes week totals correctly                                                           |
| [src/lib/time.ts](src/lib/time.ts)                                   | Date utilities: `weekDays`, `shiftWeek`, `startOfWeek`, `toDateKey` | May need a `formatWeekRange()` helper for "24 mars – 30 mars" display                                             |

### Potential Pitfalls — AVOID THESE

1. **Do NOT duplicate `summarizeWeek` logic** — call the existing function.
2. **Do NOT replace the active timer display** with the weekly total — they coexist.
3. **Do NOT add live timer seconds to non-current week totals** — only current week gets live contribution.
4. **Do NOT introduce new store state for weekly total** — it's derived data, compute in App.tsx with `useMemo`.
5. **Do NOT change the existing `moveReportWeek` action** — it already works correctly (shifts by ±7 days).
6. **Do NOT break existing E2E tests** — they depend on French labels like "Arrêter le chrono actif", "Vue calendrier", etc.
7. **Do NOT add broad store subscriptions** — Header remains presentational, receiving props.

### Week Date Range Formatting

Use `Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })` to format the Monday and Sunday of the selected week. Example output: "24 mars – 30 mars".

```typescript
// Example helper (add to src/lib/time.ts)
const weekRangeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export const formatWeekRange = (anchor: string): string => {
  const days = weekDays(anchor);
  const monday = days[0];
  const sunday = days[6];
  return `${weekRangeFormatter.format(monday)} – ${weekRangeFormatter.format(sunday)}`;
};
```

### Project Structure Notes

- Alignment with unified project structure: all changes stay within `src/components`, `src/lib`, and `src/App.tsx` — no new files needed except possibly a small helper.
- No backend/API changes needed — week navigation is purely frontend state (`reportAnchor` in Zustand).
- No new dependencies required.

### References

- [Source: src/store/useTimeTrackerStore.ts — `moveReportWeek` action at line ~1002]
- [Source: src/lib/time.ts — `shiftWeek()`, `weekDays()`, `startOfWeek()` helpers]
- [Source: src/lib/weekly.ts — `summarizeWeek()` computes full weekly totals]
- [Source: src/components/WeeklyView.tsx — existing prev/next buttons calling `onMoveWeek`]
- [Source: src/components/Header.tsx — current timer display area with active timer summary]
- [Source: src/App.tsx — orchestration: derives `activeTimerSummary`, passes props to Header and WeeklyView]
- [Source: _bmad-output/project-context.md — UI labels in French, color tokens: ink/mist/coral/mint/gold]

### Git Intelligence

Recent commits show:

- `ad13733` — stabilize integration tests after mobile UX redesign
- `6cdcc77` — Fix mobile UX feedback and optimistic timer updates
- `63f52da` — replace whole-card click with dedicated toggle button on task cards

Pattern: focused changes to existing components, integration test updates alongside UI changes, French labels maintained.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Task 1: WeeklyView navigation was already correctly wired. `moveReportWeek` store action shifts `reportAnchor` by ±7 days, WeeklyView re-renders with new `anchorDate` prop. No changes needed.
- Task 2: Added `onMoveWeek` and `weeklyTotal`/`weekDateRange` props to Header. Rendered ChevronLeft/ChevronRight icon buttons with a central week info panel ("Semaine" label, date range, weekly total). Wired from App.tsx via `moveReportWeek`.
- Task 3: Computed `weeklyTotalSeconds` in App.tsx using existing `summarizeWeek()`. Added `isCurrentWeek` detection via `startOfWeek` comparison. Live active-timer seconds are included only for the current week. `formatHoursMinutes` used for display. Added `formatWeekRange` helper to `src/lib/time.ts` using French Intl.DateTimeFormat.
- Task 4: Active timer display (HH:MM:SS clock, task name, context, stop button) is preserved alongside the new weekly total panel. They occupy separate areas of the Header grid.
- Task 5: Added 2 unit tests: `formatWeekRange` French formatting, and `summarizeWeek` anchor-shift exclusion of out-of-week sessions. All 35/36 tests pass (1 pre-existing failure unrelated to this story).
- Pre-existing test failure: "creates tags and tasks, runs a timer, then exposes the result in the weekly view" — confirmed failing on `git stash` (before changes), not a regression.

### File List

- src/lib/time.ts — added `formatWeekRange` helper
- src/lib/time.test.ts — added 2 unit tests for `formatWeekRange` and `summarizeWeek` week filtering
- src/components/Header.tsx — added week nav buttons (ChevronLeft/Right), weekly total and date range display, new props
- src/App.tsx — compute `weeklyTotalSeconds` with `summarizeWeek`, `isCurrentWeek` detection for live timer contribution, pass new props to Header
- \_bmad-output/implementation-artifacts/sprint-status.yaml — status updates
