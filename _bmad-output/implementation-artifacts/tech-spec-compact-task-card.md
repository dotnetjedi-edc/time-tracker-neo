---
title: 'Compact Task Card — Reduce Vertical Footprint & Eliminate Duplicates'
type: 'feature'
created: '2026-03-31'
status: 'done'
baseline_commit: '32324aa45c943b3677ceaa033b9ac4a4fe8c9a17'
context:
  - "TaskCard used in TaskGrid with responsive grid: 1 col (mobile), 2 cols (sm), 3 cols (xl), 4 cols (2xl)"
  - "Drag-and-drop via dnd-kit uses card width for overlay sizing"
  - "Current desktop min-height: 220px with significant padding/spacing"
---

# Compact Task Card — Reduce Vertical Footprint & Eliminate Duplicates

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Desktop task cards consume too much vertical space (min-height 220px), limiting visible tasks and reducing grid efficiency. Content structure has DOM duplication (status badges, tags rendered twice via conditional branches), and action buttons ("Temps manuel", "Historique") are loosely scattered — no cohesive grouping.

**Approach:** Refactor TaskCard desktop layout to eliminate duplicate DOM nodes (merge conditional branches), reduce minimum height to ~160px via tighter spacing, consolidate action buttons into a single bottom footer zone, and streamline visual hierarchy to show more tasks without sacrificing clarity.

## Boundaries & Constraints

**Always:**
- Preserve drag-and-drop functionality (DND scales overlay by card width)
- Maintain touch/pointer event handling for mobile list view (no changes there)
- Keep all interaction states (active, dragging, disabled states)
- Accessibility: maintain semantic HTML and sufficient tap/click target sizes (min 44px for mobile, min 40px for desktop buttons)
- Desktop grid layout remains 2–4 columns per breakpoint (no grid changes)

**Ask First:**
- If button styling or icon sizing needs adjustment during implementation, confirm before proceeding
- If reducing height below 160px breaks visual hierarchy, halt and propose alternative

**Never:**
- Do not remove or hide action buttons — only reposition them
- Do not change responsive breakpoints (sm, xl, 2xl)
- Do not introduce new API calls or data transformations
- Do not modify tag filtering or status badge logic — only dedup DOM rendering

</frozen-after-approval>

## Code Map

- `src/components/TaskCard.tsx` -- Main task card component; contains desktop layout with duplicated status/tags; min-height 220px with generous spacing
- `src/components/TaskGrid.tsx` -- Parent grid container using grid-cols-2 sm:grid-cols-2 xl:grid-cols-3; DND uses card width for overlay
- `src/lib/tagStyles.ts` -- Tag color tone utility (no changes)
- `src/types.ts` -- Task/Tag types (no changes)

## Tasks & Acceptance

**Execution:**

- [ ] `src/components/TaskCard.tsx` -- Add `line-clamp-2` CSS class to task name `<h3>` element (line ~140) to enforce hard max-height boundary and prevent unwanted text wrapping that exceeds 160px target height. -- **Rationale:** Guarantees AC #1 compliance; without line-clamping, long task names (40+ chars) wrap to 2+ lines and expand card beyond 160px, defeating compaction goal

- [ ] `src/components/TaskCard.tsx` -- Audit and adjust icon sizes to scale proportionally with text. Current: task name 2.4rem (38px), but grip handle/status icons likely 12-14px. Either scale icons to 24-32px range (e.g., `size={20}` for grip, status badge icons), OR revert task name font back to 2rem to restore 1.5:1 icon-to-text ratio. ** Rationale:** Icon/text size mismatch (14px icons next to 38px text) introduces accessibility regression; icons become unrecognizable. Must restore visual proportionality.

- [ ] `src/components/TaskCard.tsx` -- Verify mobile button accessibility: current mobile buttons are `h-8 w-8` (32px), but spec requires min 44px for mobile targets. **Decision:** Is this in-scope to fix (upgrade to 44px), or pre-existing accessibility debt (defer to separate story)? Implement per decision, OR add comment documenting deferral if out-of-scope. -- **Rationale:** Spec boundary "min 44px for mobile, min 40px for desktop buttons" must be met or explicitly deferred with justification.

- [ ] `src/components/TaskCard.tsx` -- Fix indentation on line 125 (desktop version header: remove 2 extra spaces before `<div className="hidden sm:flex...">` to align with surrounding code style). -- **Rationale:** Code formatting consistency

- [ ] Manual visual inspection on desktop (sm breakpoint) -- Render card with task names of varying length (10 chars, 30 chars, 50+ chars) and verify height remains ≤~168px (160px min + small tolerance). Confirm line-clamp-2 truncates long names with ellipsis. Verify drag overlay renders at correct dimensions. -- **Rationale:** Validate AC #1 compliance and DND functionality

**Acceptance Criteria (Updated):**

- Given a desktop viewport at sm breakpoint (640px+) with 5+ tasks, when TaskCard renders with `line-clamp-2` on task name, then each card should measure approximately 160px height (range 155-165px acceptable), allowing ~35% more tasks visible without scrolling

- Given a task card with a long name (45+ characters), when rendered, then name is truncated to 2 lines maximum with trailing ellipsis, and total card height does not exceed 168px

- Given the same viewport, when viewing the card content structure, then status badge and tags should appear once (no DOM duplication from conditional branches)

- Given an active/ready task card, when viewing the footer, then "Temps manuel" and "Historique" buttons are grouped together at the bottom with consistent gap-2 spacing and aligned left

- Given a dragging interaction, when overlay renders, then it maintains correct width dimensions captured from the card (no DND regression) and height matches source card

- Given any task card in active/ready state, when interacting via touch or pointer, then all buttons remain clickable with min 40px height/width targets (desktop), and mobile buttons meet min 44px spec (or documented as deferred)

- Given icons (drag handle, status, badges) next to text (task name 2.4rem, clock 2.4rem), when rendered, then icon sizes are scaled proportionally (ratio ~1.5:1 text-to-icon) to remain semantically recognizable

## Design Notes

**Layout Structure (Desktop after refactor):**
```
┌─────────────────────────┐
│ Gradient Bar (top)      │
├─────────────────────────┤
│ Drag Handle │ [Prêt/Actif Status] ─ Edit Button │  ← Header row
├─────────────────────────┤
│ "Task Title"            │
│ ~optional comment~      │
│                         │
│ 01:23:45 (mono clock)   │  ← Time + tags section
│ [Tag1] [Tag2] [Tag3]    │
├─────────────────────────┤
│ [Temps manuel] [Historique] │  ← Footer actions (grouped)
└─────────────────────────┘
```

**Spacing Reductions:**
- Overall padding: `p-5` → `p-4` (4 px reduction per side)
- Internal gaps: `gap-4` → `gap-3` (4 px reduction)
- Button group gap: `gap-3` → `gap-2` (2 px tighter)
- Min-height: `220px` → `160px` (~27% reduction)
- Font scaling: title `2.7rem` → `2.4rem` (10% smaller)

**Why this works:**
- Dedup eliminates redundant DOM, improving parsing and render performance
- Tighter spacing maintains visual hierarchy while freeing vertical real estate
- Footer grouping clarifies intent (action zone) vs. display zone (top/middle)

## Verification

**Commands:**
- `npm run build` -- Expected: build succeeds with no errors
- `npm run dev` -- Expected: app starts, task grid renders with compact cards
- `npm test -- TaskCard` -- Expected: all TaskCard tests pass (interactions, accessibility, render states)

**Manual checks:**
- Desktop (sm): Open in browser, verify card height ~160px (use DevTools), count visible tasks before scrolling
- Drag interaction: Drag a card, verify overlay renders with correct width
- Button interactions: Click "Temps manuel", "Historique" — modals/callbacks trigger correctly
- Mobile (< 640px): Verify no changes (only desktop sm: classes affected)

## Spec Change Log

### Iteration 1 (2026-03-31 15:45)
- **Triggering finding:** AC #1 Height Guarantee violated — sans `line-clamp`, task name wrapping expands card to 180-220px, defeating intent
- **Amended:** Tasks & Acceptance section — added line-clamp-2 requirement to task name element
- **Known-bad state avoided:** Cards varying wildly in height (160-280px), inconsistent grid, defeating visual compaction goal
- **KEEP:** Spacing reductions (gap-4→gap-3, p-5→p-4) are sound; font size 2.4rem for clock is correct. Keep all button grouping logic.

### Iteration 1b (2026-03-31 15:45)
- **Triggering finding:** Icon/text size mismatch — 14px icons next to 38px text introduces accessibility regression, icons unrecognizable
- **Amended:** Design Notes section — clarified icon scaling requirement (scale icons to 24-32px range, OR revert name to 2rem)
- **Known-bad state avoided:** Semantic meaning of icons degraded, potential touch target below 40px, visual hierarchy breaks
- **KEEP:** Font size 2.4rem for title is intentional per compact design; just needs proportional icon adjustment



