---
title: "Android-Style Manual Time Picker"
slug: "android-style-manual-time-picker"
created: "2026-03-31"
status: "ready-for-dev"
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Tailwind CSS",
    "Vercel API routes",
    "Vitest",
    "Testing Library",
    "Playwright",
    "lucide-react",
  ]
files_to_modify:
  [
    "src/components/TaskSessionsModal.tsx",
    "src/lib/time.ts",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "App.tsx owns session-modal orchestration and passes create/update callbacks down",
    "TaskSessionsModal keeps draft state local and submits normalized ISO timestamps",
    "French UI copy with English identifiers",
    "Tailwind utility classes reuse the existing ink, mist, coral, mint, and gold palette",
    "Time math belongs in src/lib/time.ts instead of inline JSX event logic",
  ]
test_patterns:
  [
    "Integration tests interact through French accessible labels",
    "Behavioral coverage should focus on create/edit flows rather than implementation details",
    "E2E selectors should remain compatible with current task-card labels and modal labels",
  ]
---

# Tech-Spec: Android-Style Manual Time Picker

**Created:** 2026-03-31

## Overview

### Problem Statement

The current manual time entry flow relies on native `datetime-local` inputs inside `TaskSessionsModal`, which makes minute selection slow and uncomfortable, especially on mobile. The user wants a faster interaction closer to Android's clock picker, where hour selection is one tap and dragging can refine hours or minutes quickly.

### Solution

Replace the time-entry portion of the manual session form with a custom dial-based 24-hour picker while keeping date selection, validation, and session persistence behavior unchanged. The new control must work on mobile and desktop through standard web pointer interactions and still submit the same canonical ISO `startTime` and `endTime` values to the existing create/edit session flows.

### Scope

**In Scope:**

- Replace browser-scroll-based time picking with a custom hour/minute dial UI.
- Preserve manual session create and edit flows in `TaskSessionsModal`.
- Keep date selection available alongside the new time picker.
- Support click/tap selection and press-drag adjustment on the dial.
- Keep current validation for `endTime > startTime`.
- Add regression coverage for the new create/edit interaction.

**Out of Scope:**

- Changing the session API contract or store architecture.
- Introducing a third-party design system or heavy picker dependency.
- Redesigning task history, session persistence, or reporting logic.
- Adding Android-native or platform-specific APIs.

## Context for Development

### Codebase Patterns

- `TaskSessionsModal.tsx` currently owns manual-entry UI state and converts local input values into ISO strings before calling `onCreate` or `onUpdate`.
- `App.tsx` owns modal opening, selected task, and callback wiring; the modal remains presentational and local-state-driven.
- `useTimeTrackerStore.ts` already persists manual sessions correctly through the API layer and recomputes task totals from sessions.
- French UI labels and accessible names are part of the effective test contract.
- Time formatting and normalization helpers live in `src/lib/time.ts` and should absorb any new reusable conversion logic.

### Files to Reference

| File                                            | Purpose                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/TaskSessionsModal.tsx`          | Current manual-entry and session-history modal.                                   |
| `src/App.tsx`                                   | Modal orchestration and callback wiring for create/update/delete session actions. |
| `src/lib/time.ts`                               | Existing time formatting and date normalization helpers.                          |
| `src/store/useTimeTrackerStore.ts`              | Existing `addManualSession` and `updateSession` persistence behavior.             |
| `src/test/integration/app.integration.test.tsx` | UI-level regression tests for task-card actions and session flows.                |
| `e2e/time-tracker.spec.ts`                      | End-to-end coverage for real user workflows.                                      |

### Technical Decisions

- Keep the data contract unchanged: the modal still emits ISO `startTime` and `endTime` values.
- Replace only the time-picker UX, not the date-selection capability.
- Use standard Pointer Events so the same control works on touch and desktop.
- Support 24-hour hour selection first, then minute selection, with exact-minute output.
- Show visual 5-minute landmarks for speed, but never force 5-minute rounding.
- Keep transient picker state inside the modal component tree, not in Zustand.
- Prefer a focused in-repo component over adding a third-party picker dependency.

## Implementation Plan

### Tasks

- [ ] Task 1: Split manual time editing into date and time parts
  - File: `src/components/TaskSessionsModal.tsx`
  - Action: Replace direct `datetime-local` entry with local draft state that keeps dates editable while delegating time selection to the new picker.
  - Notes: The save path must still normalize into the same ISO timestamps used today.

- [ ] Task 2: Build the dial-based time picker
  - File: `src/components/TaskSessionsModal.tsx`
  - File: `src/lib/time.ts`
  - Action: Add a reusable hour/minute dial that supports click/tap and drag updates for 24-hour selection.
  - Notes: Keep minute output exact and move non-trivial math into helpers.

- [ ] Task 3: Wire create and edit flows through the new picker
  - File: `src/components/TaskSessionsModal.tsx`
  - Action: Prefill the picker from current session values, preserve edit mode, and keep the existing save/cancel transitions intact.
  - Notes: Invalid ranges must still disable save and show the current validation message.

- [ ] Task 4: Add regression coverage
  - File: `src/test/integration/app.integration.test.tsx`
  - File: `e2e/time-tracker.spec.ts`
  - Action: Cover manual session creation and editing through the new picker on the user-facing flow.
  - Notes: Prefer visible behavior assertions and French accessible selectors.

### Acceptance Criteria

- [ ] AC 1: Given the user opens `Temps manuel`, when they set a start or end time, then the UI offers a dedicated clock-style picker instead of forcing minute scrolling.
- [ ] AC 2: Given the picker is in hour mode, when the user taps an hour, then the hour is selected in 24-hour format and the UI advances clearly toward minute selection.
- [ ] AC 3: Given the user holds pointer or touch contact on the dial and drags, when the active marker moves, then the selected hour or minute updates continuously until release.
- [ ] AC 4: Given the user selects minutes, when the value is committed, then the saved timestamp preserves exact minutes rather than snapping to 5-minute increments.
- [ ] AC 5: Given the user edits an existing session, when the picker opens, then it is prefilled from the current session timestamps and saving still updates history and totals through the existing flow.
- [ ] AC 6: Given the user chooses dates and times together, when the session is saved, then date selection remains available and the final payload still uses canonical ISO `startTime` and `endTime` values.
- [ ] AC 7: Given `endTime` is not strictly after `startTime`, when the user attempts to save, then save remains blocked and the current validation message is shown.

## Additional Context

### Dependencies

- No new dependency is required by default.
- Existing React, Tailwind, and lucide-react are sufficient for the first implementation.
- The current API/store contract for sessions should remain untouched.

### Testing Strategy

- Add integration coverage for opening the manual-entry flow and saving a session through the new picker.
- Add edit-flow coverage to ensure prefilled values and update behavior still work.
- Add focused helper tests if dial-angle or time-part conversion logic becomes non-trivial.
- Preserve existing modal labels and task-card action labels to avoid collateral test churn.
