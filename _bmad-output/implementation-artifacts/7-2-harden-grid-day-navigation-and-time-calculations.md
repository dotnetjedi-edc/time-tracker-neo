# Story 7.2: Harden Grid Day Navigation and Time Calculations

Status: review

## Story

As a time-tracking user,
I want the grid day-navigation and time-calculation code to handle timezone edge cases, avoid dead code, and follow DRY principles,
so that day/week totals are always accurate regardless of browser timezone and the codebase remains maintainable.

## Context

This story addresses 9 findings from the adversarial code review of story 7-1 (week/day navigation feature). All changes are in files already touched by 7-1 and do not alter user-visible behavior — they harden correctness, remove dead code, reduce duplication, and improve prop naming consistency.

## Acceptance Criteria

1. **Given** a user in any timezone (e.g., UTC-12 through UTC+14), **when** `toDateKey("2026-03-20")` is called, **then** it always returns `"2026-03-20"` — never the adjacent day.

2. **Given** the `summarizeDay` and `summarizeWeek` functions, **when** reviewed side-by-side, **then** the task/tag filtering logic exists in exactly one shared helper — not duplicated.

3. **Given** the `src/lib/time.ts` exports, **when** scanning for usage of `getWeekStartFromDay` and `isToday`, **then** neither export exists unless it has at least one call site. Dead exports and dead imports in `App.tsx` are removed.

4. **Given** a running active timer, **when** `activeTimerContributionSeconds` is computed in grid mode, **then** the code validates `activeTimer.segmentStartTime` is truthy before constructing a `Date` from it, preventing runtime exceptions on corrupt state.

5. **Given** the `Header` component interface, **when** inspecting prop names, **then** `weeklyTotal` and `weekDateRange` are renamed to view-neutral names (`periodTotal` and `periodLabel`) that accurately describe their content in both grid and week modes.

6. **Given** the `isSameDay` utility, **when** both arguments are already `YYYY-MM-DD` strings, **then** it compares them directly as strings without redundant `toLocalDate` → `Date` → format round-trips.

7. **Given** the `handleMovePeriod` callback in `App.tsx`, **when** `reportAnchor` is somehow an empty string or malformed, **then** the function early-returns without corrupting store state.

8. **Given** all changes above, **when** the existing test suite (`vitest` unit + integration, Playwright E2E) is run, **then** all tests pass with no regressions.

## Tasks / Subtasks

- [x] Task 1: Fix timezone inconsistency in `toLocalDate` (AC: 1)
  - [x] 1.1 In `src/lib/time.ts`, revert `toLocalDate` for date-only strings back to local-midnight constructor: `new Date(year, month - 1, day)`. The UTC change from 7-1 breaks `toDateKey`, `startOfWeek`, and every downstream consumer that uses local getters (`getFullYear`, `getMonth`, `getDate`). The original local-midnight approach guarantees `toDateKey("2026-03-20")` always returns `"2026-03-20"` regardless of timezone — because local-midnight never crosses a day boundary when read back with local getters.
  - [x] 1.2 Remove the misleading "UTC-based" comment added in 7-1.
  - [x] 1.3 Add a unit test in `src/lib/time.test.ts`: `toDateKey("2026-03-20")` → `"2026-03-20"`. This is a regression guard.
  - [x] 1.4 Verify `shiftDay`, `formatDayDisplay`, `isSameDay` all produce correct results after the revert. The local-midnight behavior is what the rest of the codebase (toDateKey, startOfWeek, weekDays, addDays) already assumes.

- [x] Task 2: Extract shared task-filtering helper to eliminate DRY violation (AC: 2)
  - [x] 2.1 In `src/lib/weekly.ts`, extract a `filterVisibleTasks(tasks, selectedTagIds, tags)` function that returns the filtered `visibleTasks` array and `taskMap`. Exact logic: filter tasks whose tagIds are all in the valid tag set, then filter by selectedTagIds (if non-empty, every selectedTagId must be in task.tagIds).
  - [x] 2.2 Refactor `summarizeWeek` to call `filterVisibleTasks` instead of inline filtering.
  - [x] 2.3 Refactor `summarizeDay` to call `filterVisibleTasks` instead of inline filtering.
  - [x] 2.4 Run existing `time.test.ts` weekly summary test to verify no regression.

- [x] Task 3: Remove dead exports and dead imports (AC: 3)
  - [x] 3.1 Remove the `getWeekStartFromDay` export from `src/lib/time.ts` — it has zero call sites. The comment says "Used when switching from grid (day) to calendar (week) view" but no such switch logic was implemented.
  - [x] 3.2 Remove the `isToday` export from `src/lib/time.ts` — it also has zero call sites. `isCurrentDay` in App.tsx uses `isSameDay(reportAnchor, todayKey())` directly.
  - [x] 3.3 In `src/App.tsx`, remove these 3 dead imports: `getWeekStartFromDay`, `isToday`, `shiftWeek`. These are confirmed unused in the file body. **DO NOT remove** `addDays` (used in weekEnd calc L326), `formatWeekRange` (used in displayText L376), or `startOfWeek` (used in isCurrentWeek L309 and weekStart L326).
  - [x] 3.4 Verify no TypeScript errors after removal: `npx tsc --noEmit`.

- [x] Task 4: Add guard for `activeTimer.segmentStartTime` (AC: 4)
  - [x] 4.1 In the `activeTimerContributionSeconds` useMemo in `App.tsx`, add a guard after the `!activeTimer` check: `if (!activeTimer.segmentStartTime) return 0;`. This prevents `new Date(undefined)` producing `NaN` timestamps if persisted state is corrupt.

- [x] Task 5: Rename Header props for view-neutral semantics (AC: 5)
  - [x] 5.1 In `src/components/Header.tsx`, rename the `HeaderProps` interface: `weeklyTotal` → `periodTotal`, `weekDateRange` → `periodLabel`.
  - [x] 5.2 Update the destructured props in the `Header` function signature.
  - [x] 5.3 Update JSX references: `{weekDateRange}` → `{periodLabel}`, `{weeklyTotal}` → `{periodTotal}`.
  - [x] 5.4 In `src/App.tsx`, update the `<Header>` JSX to pass `periodTotal={totalDisplay}` and `periodLabel={displayText}` instead of the old prop names.
  - [x] 5.5 **CRITICAL**: Search for any other files that render `<Header>` or reference these prop names (integration tests, E2E tests). Update all call sites.

- [x] Task 6: Optimize `isSameDay` to skip unnecessary Date conversion (AC: 6)
  - [x] 6.1 In `src/lib/time.ts`, update `isSameDay`: if both arguments are strings matching the `dateOnlyPattern` regex, compare them directly as strings. Only fall through to `toDateKey` conversion for Date objects or ISO datetime strings.
  - [x] 6.2 This avoids 2× `toLocalDate` → `new Date()` → `getFullYear/getMonth/getDate` → format for what is already a formatted string.

- [x] Task 7: Add guard for malformed `reportAnchor` in `handleMovePeriod` (AC: 7)
  - [x] 7.1 In the `handleMovePeriod` callback in `App.tsx`, add an early return if `reportAnchor` doesn't match `dateOnlyPattern` (`/^\d{4}-\d{2}-\d{2}$/`). This prevents corrupted store state from propagating.
  - [x] 7.2 Alternatively, import `dateOnlyPattern` or replicate the regex inline. Keep it minimal — a single `if (!reportAnchor || !/^\d{4}-\d{2}-\d{2}$/.test(reportAnchor)) return;` guard is sufficient.

- [x] Task 8: Verify all tests pass (AC: 8)
  - [x] 8.1 Run `npm run test:unit` — all existing time.test.ts and store tests must pass.
  - [x] 8.2 Run `npm run test:integration` — app integration tests must pass.
  - [x] 8.3 Confirm no TypeScript errors: `npx tsc --noEmit`.

## Dev Notes

### Timezone Bug Deep-Dive (Item 1)

The root cause: story 7-1 changed `toLocalDate` for date-only strings from `new Date(year, month-1, day)` (local midnight) to `new Date(Date.UTC(year, month-1, day))` (UTC midnight). But ALL downstream consumers use **local** date methods:

```typescript
// toDateKey uses local getters:
const year = date.getFullYear(); // ← local, not getUTCFullYear()
const month = date.getMonth() + 1; // ← local, not getUTCMonth()
const day = date.getDate(); // ← local, not getUTCDate()

// startOfWeek uses local constructor:
new Date(date.getFullYear(), date.getMonth(), date.getDate());
```

When `toLocalDate("2026-03-20")` returns UTC midnight (Mar 20 00:00 UTC), a browser in UTC-5 sees it as Mar 19 19:00 local → `getDate()` returns 19, not 20. **This is a day-shift bug.**

The correct fix is to revert to local midnight. All existing code assumes local getters — changing only `toLocalDate` to UTC without updating every consumer creates inconsistency.

### DRY Refactor Pattern (Item 6)

The shared helper signature:

```typescript
function filterVisibleTasks(
  tasks: Task[],
  selectedTagIds: string[],
  tags: Tag[],
): { visibleTasks: Task[]; taskMap: Map<string, Task> };
```

Keep it in `weekly.ts` (not exported outside the module) since both consumers are in the same file.

### Prop Rename Impact (Item 5)

The Header component is rendered in exactly ONE place: `App.tsx`. The `weeklyTotal` and `weekDateRange` prop names are NOT referenced in any test file — tests interact through accessible labels and rendered text, not prop names. This is a safe internal rename.

### Files That Must NOT Be Changed

- `src/store/useTimeTrackerStore.ts` — no store shape changes
- `src/components/WeeklyView.tsx` — not involved in these fixes
- `src/types.ts` — no type changes needed
- `e2e/time-tracker.spec.ts` — E2E tests interact through accessible labels, not prop names

### Project Structure Notes

- All changes are in files already modified by story 7-1: `src/lib/time.ts`, `src/lib/weekly.ts`, `src/App.tsx`, `src/components/Header.tsx`
- Test additions go in `src/lib/time.test.ts` (co-located test file, existing pattern)
- French UI labels are NOT affected — only internal prop names and function signatures change
- Existing Tailwind tokens and color palette are NOT affected

### References

- [Source: src/lib/time.ts] — toLocalDate, toDateKey, startOfWeek, isSameDay, isToday, getWeekStartFromDay
- [Source: src/lib/weekly.ts] — summarizeWeek, summarizeDay filtering duplication
- [Source: src/App.tsx] — handleMovePeriod, activeTimerContributionSeconds, displayText, Header props
- [Source: src/components/Header.tsx] — HeaderProps interface, weeklyTotal, weekDateRange props
- [Source: _bmad-output/project-context.md#Language-Specific Rules] — "Prefer small pure helper functions in src/lib"
- [Source: _bmad-output/project-context.md#Framework-Specific Rules] — "Reuse existing helper flows... instead of duplicating business rules"
- [Source: _bmad-output/project-context.md#Code Quality] — "Prefer updating existing helper modules... over creating near-duplicate logic"
- [Source: _bmad-output/implementation-artifacts/7-1-week-navigation-and-timer-weekly-total.md] — Parent story, review status

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Reverted `toLocalDate` from UTC to local-midnight constructor. Removed misleading UTC comment. Added regression test `toDateKey("2026-03-20") → "2026-03-20"`.
- Task 2: Extracted `filterVisibleTasks()` helper in `weekly.ts`, refactored both `summarizeWeek` and `summarizeDay` to use it.
- Task 3: Removed dead exports `getWeekStartFromDay` and `isToday` from `time.ts`. Removed dead imports `getWeekStartFromDay`, `isToday`, `shiftWeek` from `App.tsx`.
- Task 4: Added `if (!activeTimer.segmentStartTime) return 0` guard in `activeTimerContributionSeconds` useMemo.
- Task 5: Renamed Header props `weeklyTotal→periodTotal`, `weekDateRange→periodLabel` in interface, function signature, JSX, and the single call site in `App.tsx`.
- Task 6: Optimized `isSameDay` to compare YYYY-MM-DD strings directly when both args match `dateOnlyPattern`.
- Task 7: Added early-return guard in `handleMovePeriod` for malformed `reportAnchor`.
- Task 8: All unit tests (29/29), integration tests (9/9 + 1 skipped), and `tsc --noEmit` pass.

### File List

- src/lib/time.ts (modified)
- src/lib/weekly.ts (modified)
- src/App.tsx (modified)
- src/components/Header.tsx (modified)
- src/lib/time.test.ts (modified)

### Change Log

- 2026-03-31: Implemented all 8 tasks for story 7-2 — timezone fix, DRY refactor, dead code removal, defensive guards, prop rename, isSameDay optimization.
