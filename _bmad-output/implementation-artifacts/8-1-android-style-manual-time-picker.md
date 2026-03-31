---
title: "Android-Style Manual Time Picker"
story_id: "8.1"
story_key: "8-1-android-style-manual-time-picker"
created: "2026-03-31"
status: "ready-for-dev"
epic: "Epic 8: Faster Manual Time Entry"
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Tailwind CSS",
    "Zustand",
    "Vercel API routes",
    "Vitest",
    "Testing Library",
    "Playwright",
    "lucide-react",
  ]
files_to_modify:
  [
    "src/components/TaskSessionsModal.tsx",
    "src/App.tsx",
    "src/lib/time.ts",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
files_may_touch:
  [
    "src/types.ts",
    "src/components/TaskCard.tsx",
    "src/store/useTimeTrackerStore.ts",
    "src/lib/time.test.ts",
    "src/components/Header.tsx",
  ]
code_patterns:
  [
    "App.tsx owns modal orchestration and passes callbacks into presentational components",
    "TaskSessionsModal keeps draft state local and only submits normalized ISO timestamps to the store",
    "French UI copy with English identifiers and component names",
    "Tailwind utility classes reuse the existing ink, mist, coral, mint, and gold palette",
    "Business rules for time normalization stay in src/lib or store helpers instead of JSX event handlers",
    "Current manual entry flow uses local component state plus addManualSession/updateSession actions",
  ]
test_patterns:
  [
    "Integration tests render App and interact through French accessible labels",
    "Store and API contract should remain unchanged for manual session creation and editing",
    "Use pointer or mouse interactions in tests for drag-based time selection",
    "Playwright scenarios should validate both desktop click flow and touch-friendly drag behavior where practical",
  ]
---

## Story 8.1: Android-Style Manual Time Picker

Status: ready-for-dev

## Story

As a time-tracking user,
I want manual time entry to use a fast 24-hour clock picker inspired by Android instead of minute scrolling,
so that I can enter or edit session times quickly on mobile and desktop.

## Acceptance Criteria

1. **Given** the user opens manual time entry for a task, **when** the start or end time field is focused, **then** the UI opens a dedicated time picker optimized for quick selection instead of relying only on the browser's native minute scrolling control.

2. **Given** the picker is in hour mode, **when** the user taps or clicks an hour on the dial, **then** the selected hour is applied in 24-hour format, **and** the picker advances clearly toward minute selection without requiring a long scroll interaction.

3. **Given** the user keeps pointer or finger contact on the dial and drags, **when** they move across hour or minute positions, **then** the highlighted value updates continuously and the final release commits the hovered value.

4. **Given** the picker is in minute mode, **when** the user selects a minute, **then** the resulting timestamp preserves exact minutes, not only 5-minute buckets, while still presenting obvious visual anchors for rapid selection.

5. **Given** the user is editing an existing session, **when** the picker opens, **then** it is prefilled from the session's current start and end timestamps and saving still updates the session through the existing edit flow.

6. **Given** the manual time flow currently supports both date and time, **when** this enhancement ships, **then** date selection remains available and clear, **and** the new picker only replaces the time-entry portion rather than removing the ability to choose the correct day.

7. **Given** the user interacts on desktop with a mouse or on mobile with touch, **when** they use the picker, **then** the interaction model remains usable in both environments and does not depend on Android-only platform APIs.

8. **Given** the user completes manual entry or manual edit through the new picker, **when** the session is saved, **then** the existing API/store flow still persists the same canonical ISO `startTime` and `endTime` values and weekly totals/history stay correct.

9. **Given** invalid times such as an end time not strictly after the start time, **when** the user attempts to save, **then** the current validation rule is preserved and the UI still explains why the session cannot be submitted.

10. **Given** automated tests run after the change, **when** the manual entry flow is exercised, **then** coverage proves the new picker works for create and edit flows without regressing existing history access or session persistence.

## Tasks / Subtasks

- [ ] Task 1: Refactor manual entry state to support split date and time controls (AC: 1, 6, 8, 9)
  - [ ] 1.1 Keep `SessionDraft` submission semantics unchanged: the modal must still submit normalized ISO `startTime` and `endTime` values.
  - [ ] 1.2 Replace direct `datetime-local`-only editing in `TaskSessionsModal.tsx` with a UI model that separates date selection from time selection.
  - [ ] 1.3 Preserve the current invalid-range validation and error messaging when end time is not after start time.

- [ ] Task 2: Build a reusable dial-based 24-hour picker interaction (AC: 1, 2, 3, 4, 7)
  - [ ] 2.1 Create a focused time-picker surface that supports hour mode and minute mode with a clear active state.
  - [ ] 2.2 Implement pointer-driven selection using standard web Pointer Events so the same component works for mouse, touch, and pen.
  - [ ] 2.3 Support one-tap hour selection plus press-and-drag updates while contact remains active.
  - [ ] 2.4 Support exact-minute selection while keeping visible 5-minute landmarks for quick targeting.
  - [ ] 2.5 Ensure the component exposes accessible labels and keyboard-safe fallback behavior for users who do not drag.

- [ ] Task 3: Integrate the picker into manual create and edit flows (AC: 2, 5, 6, 8)
  - [ ] 3.1 Use the same picker for both start and end time selection instead of building two divergent implementations.
  - [ ] 3.2 Prefill picker state from the currently edited session or current draft values.
  - [ ] 3.3 Keep the existing create/edit/historical session transitions in `TaskSessionsModal` intact after save.

- [ ] Task 4: Preserve visual and interaction consistency with the current product (AC: 1, 6, 7)
  - [ ] 4.1 Reuse existing modal layout, Tailwind tokens, and rounded surface language rather than introducing a foreign design system.
  - [ ] 4.2 Make the picker usable inside the existing sessions modal on mobile without accidental page scroll or clipped content.
  - [ ] 4.3 Ensure the desktop version remains efficient with click and drag, not mobile-only gestures.

- [ ] Task 5: Add regression coverage for the new interaction model (AC: 3, 5, 8, 9, 10)
  - [ ] 5.1 Add integration tests that open the manual time flow from a task card, select times through the new picker, and save successfully.
  - [ ] 5.2 Add integration or unit tests for any new helper that converts dial selection into exact hour/minute values.
  - [ ] 5.3 Add coverage for editing an existing session through the picker.
  - [ ] 5.4 Add or update E2E coverage for the main happy path so the manual time workflow remains testable from the user surface.

## Dev Notes

### Critical Architecture Insights

- The current manual entry UI is entirely local to `src/components/TaskSessionsModal.tsx`. The backend and store already accept canonical `SessionDraft` timestamps, so this story should primarily change the input experience, not the persistence contract.
- `TaskSessionsModal` currently uses two native `datetime-local` inputs and converts them through `fromDateTimeLocalInputValue()` before calling `onCreate` or `onUpdate`. The safest implementation path is to keep the same submit contract while replacing only the time-entry UX.
- `App.tsx` owns modal orchestration and passes `onCreate`, `onUpdate`, and `onDelete` callbacks into `TaskSessionsModal`. Keep that ownership model; do not move session persistence logic into the picker component.
- `useTimeTrackerStore.ts` already validates zero-length sessions, persists manual sessions through the API client, and recalculates task totals from sessions. This story should not redesign those business rules.
- The app is now API-backed. Manual entry still ends as ISO timestamps sent through the existing session create/update endpoints, so no browser-only state shape should leak into store or API payloads.

### Existing Patterns to Follow

- Keep English identifiers and French user-facing labels.
- Keep modal-local editing state in the component tree. Do not put transient dial-selection state in Zustand.
- Put any reusable time math or formatting helpers in `src/lib/time.ts` instead of computing polar-angle logic directly inline throughout JSX.
- Keep presentational components narrow and avoid broad store subscriptions.
- Reuse the current visual language: large rounded surfaces, soft borders, strong typography, and the ink/mist/coral palette.

### Key Files and Their Roles

| File                                            | Role                                              | Expected Change                                                                                          |
| ----------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/components/TaskSessionsModal.tsx`          | Current manual-entry and history modal            | Primary implementation surface for the new date/time UI and picker state                                 |
| `src/App.tsx`                                   | Modal orchestration and store callback wiring     | Likely minimal or no change beyond any prop shaping needed for the picker flow                           |
| `src/lib/time.ts`                               | Date/time formatting and normalization helpers    | Add focused helper logic if needed for time-part conversion, display, or dial math                       |
| `src/store/useTimeTrackerStore.ts`              | Session create/update persistence and totals sync | Preserve existing API/store behavior; only touch if a small helper or validation adjustment is necessary |
| `src/test/integration/app.integration.test.tsx` | App-level UI and workflow regression tests        | Add manual-entry create/edit scenarios using the new control                                             |
| `e2e/time-tracker.spec.ts`                      | End-to-end user flow coverage                     | Extend manual-entry happy path coverage without breaking current French selectors                        |

### Interaction Model Expectations

- The picker should mirror the Android mental model, not the browser spinner model.
- Default first action: choose an hour quickly in 24-hour mode.
- After hour selection, the UI should make minute selection immediate and obvious.
- Pointer down plus movement should continuously preview and update the chosen value.
- Release should commit the selected value.
- Direct click/tap without drag must still work.
- A keyboard-accessible fallback is required even if the primary interaction is pointer-based.

### Potential Pitfalls - Avoid These

1. Do not introduce a heavyweight UI dependency such as a full design system just to get a clock picker. This repo currently uses focused React/Tailwind components, not MUI or similar.
2. Do not replace the full datetime capability with time-only input. Users still need to choose the correct day for manual sessions.
3. Do not push transient dial state into the global store.
4. Do not change the API contract for sessions unless a proven blocker appears; the current system already persists manual sessions correctly.
5. Do not break the current history view, edit flow, or active-session protections.
6. Do not rely on Android-native widgets or non-standard browser APIs that would fail on desktop web.
7. Do not silently round minutes to 5-minute increments if the user selected a more precise minute.
8. Do not change French accessible labels carelessly; tests depend on them.

### Testing Expectations

- Add integration coverage for opening the manual entry modal from the task card's `Temps manuel` button.
- Verify create flow with start and end times chosen via the new picker.
- Verify edit flow for an existing manual session and confirm the updated time appears in history.
- If helper functions are added for dial-angle conversion or time-part normalization, cover them with deterministic unit tests.
- Preserve existing validation behavior for invalid ranges.
- Prefer testing visible behavior and saved outcomes rather than implementation details of internal drag math.

### Project Structure Notes

- This story fits the existing structure and should stay inside `src/components`, `src/lib`, and test files.
- A small new component file is acceptable if it keeps `TaskSessionsModal.tsx` manageable, but it should remain in `src/components` and stay focused on the picker only.
- No backend route, schema, or auth changes are expected for this story.
- Keep the change additive and reviewable. This is a UX refinement on top of a working session model.

### References

- Source: `src/components/TaskSessionsModal.tsx` — current manual entry uses `datetime-local` inputs, local `draft` state, and create/edit transitions.
- Source: `src/App.tsx` — modal ownership and callbacks for `addManualSession`, `updateSession`, and `deleteSession`.
- Source: `src/store/useTimeTrackerStore.ts` — `addManualSession` and `updateSession` preserve canonical ISO timestamps and recompute task totals.
- Source: `src/test/integration/app.integration.test.tsx` — current UI tests already open the manual time flow through French labels.
- Source: `_bmad-output/implementation-artifacts/tech-spec-manual-time-entry-and-session-history.md` — manual entry/history domain context and guardrails.
- Source: `_bmad-output/project-context.md` — strict TypeScript, French UI copy, narrow store subscriptions, and no heavy architectural churn.
- Source: `package.json` — current dependency set does not include a time-picker UI library, so the default assumption should be a focused in-repo implementation.

### Git Intelligence

- Recent commits show a pattern of focused UX fixes with matching test updates rather than broad rewrites.
- Recent work hardened navigation and mobile interactions; keep the same discipline here by validating both desktop and touch behavior.
- The repository already contains explicit mobile UX fixes, so this story should treat mobile usability as a first-class requirement, not a desktop afterthought.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- None yet.

### Completion Notes List

- Story created from the 2026-03-31 user request for a faster Android-style manual time entry experience.
- Story intentionally preserves the current API/store contract and scopes the change to manual entry UX plus regression coverage.
- Sprint tracking was not updated because this story is not yet represented in `_bmad-output/planning-artifacts/epics.md` or `sprint-status.yaml`.

### File List

- \_bmad-output/implementation-artifacts/8-1-android-style-manual-time-picker.md
