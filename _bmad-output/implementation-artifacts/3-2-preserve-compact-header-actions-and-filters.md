---
title: "Preserve Action and Filter Usability in the Compact Header"
story_id: "3.2"
story_key: "3-2-preserve-compact-header-actions-and-filters"
created: "2026-03-20"
status: "done"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 3: Compact and Action-Focused Workspace"
tech_stack:
  [
    "TypeScript",
    "React 19",
    "Vite",
    "Tailwind CSS",
    "Zustand persist",
    "Vitest",
    "Playwright",
    "lucide-react",
  ]
files_to_modify:
  [
    "src/components/Header.tsx",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Header actions are grouped in a wrapping flex row with responsive spacing",
    "Tag filters are rendered as discoverable chips beneath the primary header actions",
    "Testing relies on French accessible labels and stable text rather than CSS selectors when possible",
  ]
test_patterns:
  [
    "Integration tests verify action visibility and discoverability of filters",
    "Playwright mobile scenarios confirm controls remain visible while task content stays reachable",
  ]
---

## Story 3.2: Preserve Action and Filter Usability in the Compact Header

Status: done

## Story

As a time-tracking user,
I want the header actions and filters to remain easy to reach in the compact layout,
so that I gain space without losing control of the workspace.

## Acceptance Criteria

1. Given the compact header layout is active, when the user views the primary actions, then controls for view switching, tag management, and filter reset remain visible or clearly accessible, and their touch targets remain usable on touch devices.
2. Given tags are available for filtering, when the user interacts with the compact header, then tag filters remain discoverable and selectable, and the compact layout does not make filter state ambiguous.
3. Given the user applies the compact header on a smaller viewport, when controls wrap or reposition responsively, then the header still feels organized, and no core action is hidden without an intentional interaction pattern.

## Tasks / Subtasks

- [x] Task 1: Preserve primary action visibility inside the compact header (AC: 1, 3)
  - [x] Keep the view switch, tag management, and filter reset controls grouped and visible in `src/components/Header.tsx`.
  - [x] Retain usable padding and wrapping behavior for touch devices while reducing total header height.

- [x] Task 2: Keep tag filters discoverable in the denser layout (AC: 2, 3)
  - [x] Preserve a clear filter label and wrap-safe tag chip row in the compact header.
  - [x] Keep selected and unselected filter states visually distinct.

- [x] Task 3: Add focused regression coverage for action and filter usability (AC: 1, 2, 3)
  - [x] Add integration coverage for visible compact-header actions and the filter row.
  - [x] Add a mobile Playwright scenario that confirms the controls remain visible and task content is still reachable below the header.

## Dev Notes

### Story Foundation

- This story maps directly to Epic 3 Story 3.2 in `_bmad-output/planning-artifacts/epics.md`.
- The header compaction work is only acceptable if core controls stay visible and touch-friendly after wrapping.

### Existing Code Reality

- `src/components/Header.tsx` already renders the three primary actions and filter chips in separate rows, making it feasible to reduce density without hiding controls.
- The compact header implementation introduces a smaller title block and a denser active timer banner, so action visibility must be preserved under the tighter spacing.

### Guardrails

- Do not move actions into a hidden menu or behind an extra interaction.
- Do not remove the filter chips or make filter state harder to parse.
- Preserve responsive wrapping rather than forcing a single-line layout that would clip or overlap controls.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Validated action and filter visibility with targeted integration coverage.
- Added a mobile E2E scenario to confirm compact wrapping still leaves task content reachable.

### Completion Notes List

- Preserved all primary actions in the compact header.
- Kept the filter row explicitly labeled and discoverable.
- Added coverage that exercises compact-header usability on a phone-sized viewport.

### File List

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/3-2-preserve-compact-header-actions-and-filters.md`
- `src/components/Header.tsx`
- `src/test/integration/app.integration.test.tsx`
- `e2e/time-tracker.spec.ts`

### Change Log

- 2026-03-20: Story created after implementation to document completed Epic 3 action and filter preservation work.
