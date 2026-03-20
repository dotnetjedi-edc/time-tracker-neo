---
title: "Reduce Header Vertical Footprint"
story_id: "3.1"
story_key: "3-1-reduce-header-vertical-footprint"
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
    "src/App.tsx",
    "src/test/integration/app.integration.test.tsx",
    "e2e/time-tracker.spec.ts",
  ]
code_patterns:
  [
    "Presentational components receive derived props from App.tsx rather than reading the store directly",
    "Header layout is expressed through Tailwind utility classes with responsive breakpoints inline",
    "French UI copy with English identifiers and component names",
    "Active timer summary is derived in App.tsx and passed into the Header as a presentational prop",
  ]
test_patterns:
  [
    "Integration tests render App and assert French accessible names",
    "Playwright scenarios clear localStorage before each run and interact through roles, labels, and test ids",
    "Responsive verification should prefer visibility and in-viewport assertions over brittle pixel-perfect checks",
  ]
---

## Story 3.1: Reduce Header Vertical Footprint

Status: done

## Story

As a time-tracking user,
I want the application header to take much less vertical space,
so that I can see more tasks and working context without scrolling.

## Acceptance Criteria

1. Given the main workspace is displayed, when the header is rendered, then its overall height is meaningfully reduced compared with the current design, and the page exposes more usable vertical space for task content.
2. Given the header contains branding, title, and descriptive content, when the compact layout is applied, then the visual hierarchy remains clear, and long-form descriptive copy is shortened or condensed to fit the compact layout.
3. Given the user views the application on mobile, tablet, or desktop, when the compact header layout is displayed, then the reduced-height design remains readable, and it does not create overlapping or truncated controls.

## Tasks / Subtasks

- [x] Task 1: Reduce the header footprint in the existing component (AC: 1, 2, 3)
  - [x] Tighten header container padding, spacing, and responsive layout in `src/components/Header.tsx`.
  - [x] Condense branding and descriptive copy into a shorter, denser control-bar presentation.
  - [x] Keep title hierarchy readable while reducing visual dominance and vertical depth.

- [x] Task 2: Preserve active timer density in the compact treatment (AC: 1, 3)
  - [x] Keep the active timer banner visible when present, but shorten typography and spacing so it fits the compact header direction.
  - [x] Maintain readable elapsed time and stop affordance without re-expanding the header.

- [x] Task 3: Extend regression coverage for compact header rendering (AC: 1, 2, 3)
  - [x] Add integration coverage in `src/test/integration/app.integration.test.tsx` for the compact header copy and visible controls.
  - [x] Add mobile-oriented end-to-end coverage in `e2e/time-tracker.spec.ts` to verify the compact header still leaves task content reachable on a phone-sized viewport.

## Dev Notes

### Story Foundation

- This story maps directly to Epic 3 Story 3.1 in `_bmad-output/planning-artifacts/epics.md`.
- The implemented compact header intentionally reduces padding, title prominence, and descriptive copy height rather than changing navigation structure.
- Existing recovered-timer work on the branch introduced a global active timer banner; this story keeps that banner while preventing it from undoing the header compaction goal.

### Existing Code Reality

- `src/components/Header.tsx` previously used a larger hero-style presentation with generous padding, a tall title block, and longer descriptive copy that consumed too much vertical space.
- `src/App.tsx` already owned derived timer state and passes presentational props into `Header`, so compaction should remain in the component layer with only minimal upstream wiring.
- The current styling system is Tailwind-first. Responsive density changes should stay inline unless repeated rules become noisy.

### Guardrails

- Do not remove the primary grid-week switch, tag management, filter reset, tag chips, or active timer stop path.
- Do not introduce store or timer-domain changes solely for header presentation.
- Preserve French UI copy, existing typography families, and the current visual language.

### Testing Standards Summary

- Integration tests should assert visible French labels and high-value controls instead of internal implementation details.
- Mobile verification should prove the compact header still leaves task content visible without relying on brittle exact-height snapshots.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Fixed one JSX closing-tag mistake in `src/components/Header.tsx` during validation.
- Verified the final implementation with `npm run test:integration -- src/test/integration/app.integration.test.tsx` and `npm run build`.

### Completion Notes List

- Implemented a denser header shell with shorter copy and reduced spacing.
- Preserved a compact active timer banner inside the same header surface.
- Added regression coverage for the compact header in integration and mobile E2E flows.

### File List

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/3-1-reduce-header-vertical-footprint.md`
- `src/components/Header.tsx`
- `src/App.tsx`
- `src/test/integration/app.integration.test.tsx`
- `e2e/time-tracker.spec.ts`

### Change Log

- 2026-03-20: Story created after implementation to document completed Epic 3 header compaction work.
