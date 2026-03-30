---
title: "Mobile-First Redesign: List View + State History Navigation"
design_iteration: "1.0"
created: "2026-03-29"
designer: "Sally (UX Designer)"
status: "awaiting-validation"
target_platforms: ["mobile", "tablet", "desktop"]
---

# 🎨 Mobile-First Redesign Specification

## Executive Summary

**The Vision:** Transform your time-tracker from a dense 2-column card grid into a progressive-disclosure list interface on mobile, with seamless back-button state history.

**Impact:**

- Mobile viewport (320px): 8-10 visible tasks instead of 2-3
- Back button enables natural navigation (close modal → cancel edit → return to grid)
- One mental model across all views: state stack, not page routing

---

## 1. STATE HISTORY MENTAL MODEL

### Application State Stack

```
┌─────────────────────────────────────────────────────┐
│                    STATE STACK                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Entry 3 (Current): TaskSessionsModal Open         │
│  ├─ activeModal: "sessions"                        │
│  ├─ sessionTask: Task {id: "abc"}                  │
│  ├─ sessionView: "history"                         │
│  └─ [← BACK pops here]                             │
│                                                     │
│  Entry 2: TaskModal Open (Edit)                    │
│  ├─ activeModal: "task"                            │
│  ├─ editingTask: Task {id: "abc"}                  │
│  │  [← BACK pops here]                             │
│  │                                                  │
│  Entry 1 (Root): Grid View                         │
│  ├─ activeModal: null                              │
│  ├─ currentView: "grid"                            │
│  └─ [← BACK at root shows toast "Nothing to go back to"]
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Back Button Behavior

| Current State                                | User Presses Back | Result                                  |
| -------------------------------------------- | ----------------- | --------------------------------------- |
| Grid view                                    | Back              | Toast: "Vous êtes à l'écran principal"  |
| TaskModal (Edit) open                        | Back              | Close modal, return to grid             |
| TaskSessionsModal (nested in TaskModal) open | Back              | Close nested modal, return to TaskModal |
| TaskSessionsModal (standalone) open          | Back              | Close modal, return to grid             |
| Drag reordering active                       | Back              | Cancel drag, return to normal grid      |

---

## 2. MOBILE LIST VIEW DESIGN

### Desktop View (Current - No Change)

```
┌────────────────────────────────────┐
│ ╔════════════════════════════════╗ │
│ ║  HEADER                        ║ │
│ ║  Active Timer | View Toggle    ║ │
│ ║  Filters & Tags                ║ │
│ ╚════════════════════════════════╝ │
│                                    │
│ ╔════════════════════════════════╗ │╔════════════════════╗
│ ║ Task 1        ║ Task 2        ║ ║║ Task 3             ║
│ ║ Playing 1:45  ║ Ready         ║ ║║ Ready              ║
│ ║ [Drag Handle] ║ [Drag Handle] ║ ║║ [Drag Handle]      ║
│ ╚════════════════════════════════╝ ║╚════════════════════╝
│                                    │
│ ╔════════════════════════════════╗ │ [No change to card grid]
│ ║ Task 4        ║ Task 5        ║ │
│ ║ Ready         ║ Ready         ║ │
│ ║ [Drag Handle] ║ [Drag Handle] ║ │
│ ╚════════════════════════════════╝ │
│                                    │
└────────────────────────────────────┘
```

---

### Mobile List View (NEW - `<sm` breakpoint)

#### LAYER 1: Main List (Grid View)

```
┌──────────────────────────────────┐
│ HEADER (Compact)                 │  ← No change, stays compact
│ ☑ Active Timer                   │
│ Filters: [Tag buttons]           │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 📋 TASK LIST                     │  ← NEW: Single column
├──────────────────────────────────┤
│ ▤ Écriture              02:15    │  ← List item
│   Playing · 2 tags               │  ← Meta info
│ ⋯ [timer] [edit] [history]       │  ← Actions (icons only)
├──────────────────────────────────┤
│ ▤ Admin tasks           00:30    │
│   Ready · 1 tag                  │
│ ⊙ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ ▤ Reading              12:45     │
│   Ready · No tags                │
│ ⊙ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ ▤ Debugging             05:12    │
│   Playing · Research tag         │
│ ⋯ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ ▤ Design review         00:00    │
│   Ready · 3 tags                 │
│ ⊙ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ ▤ Client meeting        14:20    │
│   Playing · Client tag           │
│ ⋯ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ ▤ Documentation         03:00    │
│   Ready · Docs tag               │
│ ⊙ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ ▤ Code review           08:45    │
│   Ready · Code tag               │
│ ⊙ [timer] [edit] [history]       │
├──────────────────────────────────┤
│ + Add new task                   │  ← Add affordance
└──────────────────────────────────┘

(≈ 8-10 tasks visible without scrolling)
```

#### LAYER 2: Click → Task Details Modal

```
┌──────────────────────────────────┐
│ TASK DETAILS MODAL               │  ← State: TaskModal open
├──────────────────────────────────┤
│ × Fermer                         │  ← Top-right close
│                                  │
│ Écriture                         │  ← Title
│ Playing · 02:15 · 2 tags        │  ← Status + time + tags
│                                  │
│ [Tap to edit]                    │  ← Tap zone to edit
│ Comment: "Blog post..."          │
│                                  │
│ Tags: [Research] [Content]       │
│                                  │
│ ─────────────────────────────────│
│ [ Temps manuel ] [ Historique ]  │  ← Secondary views
│                                  │
│ [≈ 60-70% of screen height]      │  ← Scrollable area
│                                  │
│ ─────────────────────────────────│
│ [Edit] [Delete] [Cancel]         │  ← Actions
└──────────────────────────────────┘
```

#### LAYER 3: View Sessions/History Modal (Nested)

```
┌──────────────────────────────────┐
│ SESSIONS MODAL (Nested)          │
├──────────────────────────────────┤  ← State: SessionsModal open
│ × Fermer                         │     (on top of TaskModal)
│                                  │
│ Écriture - Sessions              │
│ [ Temps manuel ] [ Historique ]  │  ← Tabs
│                                  │
│ [≈ 70% of screen height]         │  ← Scrollable list
│ • 2026-03-29  2:00 pm - 3:15 pm │
│ • 2026-03-28  9:30 am - 11:00 am│
│ • 2026-03-27  1:45 pm - 5:00 pm │
│ • ...                            │
│                                  │
│ ─────────────────────────────────│
│ [Add Session] [Close]            │
└──────────────────────────────────┘
```

---

## 3. LIST ITEM ANATOMY (Mobile)

### Compact List Item Layout

```
Height: 64px (touch-friendly minimum)
Padding: 12px horizontal, 8px vertical

┌────────────────────────────────────────────┐
│ ▤ Écriture              02:15     [⋯] ► │
│   Playing · 2 tags     [icon] [edit] [+] │
└────────────────────────────────────────────┘

  ▤ = drag handle (touch-safe 32px)
  Task title = truncate after 1 line
  Status (Playing/Ready) + time = right-aligned
  [⋯] = menu (timer control)
  [icon] = visual status indicator
  [edit] = edit task
  [+] = add time session
```

### Typography Scaling (Mobile vs Desktop)

| Element      | Desktop                 | Mobile (`<sm`)     |
| ------------ | ----------------------- | ------------------ |
| Task Title   | `text-[1.15rem]` (18px) | `text-sm` (14px)   |
| Status Badge | `text-[10px]`           | `text-[10px]`      |
| Time Display | `text-[1.8rem]` (28px)  | `text-base` (16px) |
| Meta Info    | `text-xs`               | `text-[10px]`      |
| Action Icons | 32px touches            | 32px touches       |

---

## 4. HEADER CHANGES (Mobile Only)

### Desktop Header (Current)

```
[Header Status       ] [← View] [Tags] [Reset]
[Filter tags bar    ]
```

### Mobile Header (Compact + No Change)

```
☑ Active Timer
Filters: [tags] [tags]
```

✅ **No header changes** — Recent Epic 3 compaction is already optimized.

---

## 5. SCROLL & MODAL INTERACTION FIXES

### Fix 1: Remove Drag-Scroll-Lock When Modal Opens

**Current Behavior:**

```
User drags task → drag-scroll-lock applied
User opens modal (without stopping drag)
  → drag-scroll-lock PERSISTS
  → Modal content can't scroll
```

**New Behavior:**

```
User drags task → drag-scroll-lock applied
Modal opens event fires → drag-scroll-lock REMOVED
Modal content scrolls freely ✓
```

### Fix 2: Modal Scrollable Area Preserved

**Constraint on Mobile:**

```
Modal height: min(90vh, viewport - 20px)
Header/title: fixed, ~40px
Scrollable content: remaining space
Footer actions: fixed (but can be sticky if content is long)
```

---

## 6. INTERACTION FLOWS

### Flow A: Edit Task

```
┌─────────────────────────┐
│  Grid List View         │
│  [Task] [Task] [Task]   │
│         ↓ (tap task)    │
└─────────────────────────┘
         │
         ↓ (tap "Edit" button in modal)
┌─────────────────────────┐
│  Task Edit Modal        │
│  [Form fields]          │
│  [Save] [Cancel]        │
│         ↓               │
└─────────────────────────┘
         │
         ├─ Save → Close modal, return to Grid ✓
         ├─ Cancel → (same as Back) return to Grid ✓
         └─ Back button → Close modal, return to Grid ✓
```

### Flow B: View Sessions (Nested Modal)

```
┌─────────────────────────┐
│  Grid List View         │
│  [Task] [Task] [Task]   │
│         ↓ (tap task)    │
└─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Task Detail Modal      │  ← State Stack Entry 2
│  [Info] [TAB: History]  │
│         ↓ (tap History) │
└─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Sessions Modal         │  ← State Stack Entry 3
│  [Session list]         │     (Nested, overlay)
│         ↓               │
│  (Back) → Dismiss       │
└─────────────────────────┘
         │
         └─ Return to Task Detail Modal (Entry 2) ✓
            └─ (Back again) → Return to Grid (Entry 1) ✓
```

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: State History System (Amelia)

- [x] Design state stack structure
- [ ] Implement `useNavigationStack` hook in Zustand
- [ ] Wire up browser back button (`popstate` event)
- [ ] Add Escape key support
- **Timeline:** 90 min

### Phase 2: Scroll Lock Fixes (Amelia)

- [ ] Remove `drag-scroll-lock` when modal opens
- [ ] Test modal content scrolls independently
- [ ] Verify no scroll bleed-through to background
- **Timeline:** 45 min

### Phase 3: Mobile List Redesign (Amelia + Sally Review)

- [ ] Convert grid to list on `<sm` breakpoint
- [ ] Adjust typography (18px → 14px task titles)
- [ ] Reduce padding inside list items
- [ ] Verify touch targets remain 40px+
- [ ] Update TaskCard component to render as list item on mobile
- **Timeline:** 120 min

### Phase 4: Testing & Refinement

- [ ] E2E tests: back button flow across all modals
- [ ] Mobile responsive tests: list item scroll, overflow
- [ ] Touch ergonomics: verify 32px+ action targets
- [ ] Cross-browser: iOS Safari safe-area handling
- **Timeline:** 90 min

---

## 8. VISUAL MOCKUP: SIDE-BY-SIDE COMPARISON

### Before (Today)

```
MOBILE (320px)              DESKTOP (1440px)
───────────────────         ────────────────────────────────
│ HEADER    │               │ HEADER                      │
├───────────┤               ├───────────────────────────────┤
│ [Card]    │               │ [Card 1]      [Card 2]    │
│ [Card]    │               │ [Card 3]      [Card 4]    │
│           │               │ [Card 5]      [Card 6]    │
│ ↓ scroll  │               │ [Card 7]      [Card 8]    │
│           │               └───────────────────────────────┘
│ [Card]    │
│ [Card]    │
└───────────┘

∼ 2-3 tasks visible        ∼ 8 tasks visible (good!)
⚠️ Too tall, cramped       ✓ Good density
```

### After (New Design)

```
MOBILE (320px)              DESKTOP (1440px)
───────────────────         ────────────────────────────────
│ HEADER (compact)          │ HEADER                      │
├───────────────────         ├───────────────────────────────┤
│ ▤ Task 1    01:30         │ [Card 1]      [Card 2]    │
├───────────────────         │ [Card 3]      [Card 4]    │
│ ▤ Task 2    00:45         │ [Card 5]      [Card 6]    │
├───────────────────         │ [Card 7]      [Card 8]    │
│ ▤ Task 3    12:15         │ [Card 9]      [Card 10]   │
├───────────────────         └───────────────────────────────┘
│ ▤ Task 4    00:00
├───────────────────
│ ▤ Task 5    05:30
├───────────────────
│ ▤ Task 6    08:00
├───────────────────
│ ▤ Task 7    02:15
├───────────────────
│ ▤ Task 8    03:00         ✓ Same 2-col grid
├───────────────────         ✓ No change to desktop
│ + Add
└───────────────────

✓ 8-10 tasks visible        ✓ Unchanged (2-col grid)
✓ More content per scroll    ✓ Good density
✓ Better for mobile          ✓ Accidental
```

---

## 9. TAILWIND CLASSES REFERENCE

### List Item (Mobile)

```tsx
// Container
className =
  "flex items-center gap-3 px-3 py-2 rounded-lg border-b border-ink/8";

// Drag handle
className =
  "flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing";

// Task info zone
className = "flex-1 min-w-0";

// Title + status
className = "text-sm font-semibold text-ink truncate";

// Meta (status + tags)
className = "text-xs text-ink/60 mt-1";

// Timer display (right side)
className = "text-base font-mono font-semibold text-ink ml-auto";

// Action icons
className = "flex gap-1.5 flex-shrink-0";
```

### Modal on Mobile

```tsx
// Outer container
className =
  "fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm";

// Modal box
className = "w-full h-[90vh] max-w-2xl rounded-[2rem] bg-white flex flex-col";

// Header (fixed)
className = "flex-shrink-0 px-4 py-3 border-b border-ink/10";

// Content (scrollable)
className = "flex-1 overflow-y-auto px-4 py-4";

// Footer (sticky or fixed)
className = "flex-shrink-0 border-t border-ink/10 px-4 py-3";
```

---

## 10. ACCEPTANCE CRITERIA FOR DESIGN

- [ ] Mobile list displays 8-10 tasks without excessive scrolling
- [ ] Back button closes topmost modal and returns to previous state
- [ ] Scroll works smoothly in modals (no page scroll bleed-through)
- [ ] Typography scales appropriately (18px → 14px desktop → mobile)
- [ ] Touch targets remain ≥ 40px on all interactions
- [ ] Drag reordering still works on mobile (list items reorder smoothly)
- [ ] All three modals (Task, Sessions, Tags) function with new flow
- [ ] Desktop 2-col grid layout unchanged
- [ ] Tablet (md: breakpoint) preserves 2-col grid but with adjusted card heights

---

## 11. DESIGN DECISIONS LOG

### Decision 1: List vs. Stacked Cards

**Chosen:** Single-column list with compact row layout  
**Reasoning:** Maximum information density on 320px viewport. Lists allow easier scanning and don't require card visual hierarchy.  
**Trade-off:** Desktop view unaffected (still 2-col grid), so no regression.

### Decision 2: Back Button as State Stack (not routing)

**Chosen:** Zustand state history stack + browser `popstate` event  
**Reasoning:** Aligns with your existing modal-based architecture. No need for React Router.  
**Trade-off:** Requires new hook; increases Zustand code slightly. Worth it for clean mental model.

### Decision 3: Modal Height on Mobile

**Chosen:** Max 90vh (90% viewport height)  
**Reasoning:** Preserves scrollable area. User can still see header behind modal (context).  
**Trade-off:** Modal content may scroll, but that's acceptable (matches native mobile patterns).

### Decision 4: Typography Reduction (18px → 14px)

**Chosen:** Reduce task titles from 18px to 14px on mobile only  
**Reasoning:** Fits more content, reduces visual bulk without sacrificing readability.  
**Trade-off:** Users with vision issues may need to zoom. Acceptable trade-off given zoom is built-in.

---

## NEXT STEPS

**Eric, please review and validate:**

1. ✅ Does the list layout feel right? (8-10 visible tasks)
2. ✅ Back button flow makes sense? (modal → cancel → grid)
3. ✅ Typography scaling OK? (18px → 14px)
4. ✅ Scroll behavior clear? (modal scrolls, not page)

**Once approved, Amelia will implement all three phases.**

---

_Design by Sally | UX Designer | 2026-03-29_
