---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - README.md
  - _bmad-output/implementation-artifacts/3-1-reduce-header-vertical-footprint.md
  - _bmad-output/implementation-artifacts/3-2-preserve-compact-header-actions-and-filters.md
  - _bmad-output/implementation-artifacts/3-3-compact-mobile-task-cards.md
  - _bmad-output/implementation-artifacts/tech-spec-manual-time-entry-and-session-history.md
  - user request: add Turso-hosted persistence with local test support (2026-03-20)
---

# time-tracker3 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for time-tracker3, decomposing the confirmed backlog and user-requested improvements into implementable stories.

The source scope for this version is the confirmed backlog, README guidance, existing implementation artifacts, and the March 20, 2026 user request to add Turso-backed persistence with local database support for development and testing.

No standalone PRD, Architecture, or UX specification files were found in the expected planning artifact locations at the time of this extraction pass, so the requirements below are synthesized from the confirmed planning backlog, implementation specs, and repository notes.

The epic coverage and story breakdown below predate the new Turso persistence request and will need to be redesigned in the next workflow step to cover the newly extracted requirements.

## Requirements Inventory

### Functional Requirements

FR1: The system must keep an active timer running after a browser refresh until the user manually stops it.

FR2: The system must keep an active timer running after the web application is closed and reopened until the user manually stops it.

FR3: The system must calculate elapsed active time from the persisted timer start timestamp so that the displayed running total remains accurate after refresh or reopen.

FR4: The system must allow a user to start or stop a task timer with a single click or tap on the task card.

FR5: The system must allow a user to drag and reorder a task from the task card surface instead of restricting dragging to a small handle only.

FR6: The system must distinguish between a click/tap gesture and a drag gesture on a task card.

FR7: The system must not start or stop a timer when the user performs a drag gesture to reorder a task.

FR8: The system must keep an already-running timer active while its task card is being dragged and reordered.

FR9: The system must present a more compact application header that uses substantially less vertical space.

FR10: The system must preserve direct access to existing task secondary actions such as edit, manual time entry, and history while improving card touch interactions.

FR11: The system should provide a persistent, globally visible indication of the currently active timer and task.

FR12: The system should provide a prominent manual stop action for the active timer outside the task card when a timer is running.

FR13: The system should display contextual information indicating when the active timer session started or resumed.

FR14: The system should support future enhancements for task archiving, CSV export, and keyboard shortcuts without requiring a redesign of the timer model.

FR15: The system must persist tasks, tags, active timer state, sessions, and history in a Turso-compatible SQL database that can be hosted remotely.

FR16: The system must support the same persistence model against a local libSQL or SQLite-compatible database for local development and automated testing.

FR17: The system must provide a migration path from the current localStorage-backed Zustand persistence into the database-backed persistence model without losing existing user data.

FR18: The system must preserve manual time entry, session history, weekly reporting, and task ordering behavior after moving persistence into the database layer.

### NonFunctional Requirements

NFR1: Timer persistence must be reliable across refresh and browser restart scenarios using the existing client-side persistence model.

NFR2: Gesture handling must behave consistently on desktop pointer devices and touch devices.

NFR3: Click-versus-drag interactions must avoid accidental timer toggles during reorder operations.

NFR4: The updated header and card interactions must remain usable on mobile, tablet, and desktop layouts.

NFR5: The solution must preserve the single-active-timer model already established in the application.

NFR6: The solution must avoid data loss for active sessions caused by accidental page refresh or application closure.

NFR7: The implementation must include automated regression coverage for timer persistence and click-versus-drag interactions.

NFR8: The implementation should minimize architectural churn by extending the existing store, timer, and DnD patterns instead of replacing them.

NFR9: The hosted persistence option must be deployable on a free or low-cost Turso tier suitable for MVP usage.

NFR10: Local development and automated tests must run without requiring a live connection to the hosted Turso environment.

NFR11: The persistence design must keep remote Turso and local database execution compatible enough to avoid environment-specific behavior drift.

NFR12: Database-backed persistence flows must be covered by automated tests that run locally in the project toolchain.

NFR13: Hosted database credentials and privileged write access must not be exposed directly in the browser client.

NFR14: Data migration from the existing persisted store to the database-backed model must be deterministic and idempotent.

### Additional Requirements

- Preserve the current Zustand persisted store approach and extend it rather than introducing a backend dependency.
- Preserve the current single active timer domain model and its session/segment history behavior.
- Build on the existing dnd-kit configuration, including activation constraints, rather than replacing drag-and-drop infrastructure.
- Ensure timer recovery logic is derived from persisted timestamps and does not auto-stop a recovered session during application bootstrap.
- Keep task order persistence compatible with the current position-based ordering model.
- Maintain compatibility with the existing modal flows for editing tasks, adding manual time, and viewing history.
- Prefer focused changes to existing components and tests rather than a full UI rewrite.
- Introduce a server-side or API-based persistence adapter for Turso access so database credentials remain outside the browser bundle.
- Use a Turso/libSQL-compatible schema that can also run locally through a file-based database during development and CI-style local test runs.
- Prefer local database execution for development and automated tests to avoid consuming hosted Turso quota and to keep tests deterministic.
- Keep the frontend domain model and interaction patterns stable even if persistence moves behind an API or service boundary.
- Plan explicit migration of existing Zustand-persisted tasks, tags, sessions, and active timer recovery state into the database-backed source of truth.

### UX Design Requirements

UX-DR1: Redesign the header as a compact control bar with significantly reduced padding, title prominence, and descriptive copy height.

UX-DR2: Preserve visibility and reachability of the primary header actions while reducing the total header footprint.

UX-DR3: Make the primary interactive area of each task card feel fully touchable so the user can click/tap the card naturally to control timing.

UX-DR4: Allow drag initiation from a broad task-card surface while keeping dedicated secondary buttons independently tappable.

UX-DR5: Ensure the UI communicates active timer state clearly at both card level and global level.

UX-DR6: Provide a visible “active since” or equivalent reassurance cue after timer recovery so the user understands that time is still being tracked.

UX-DR7: Maintain touch-friendly target sizes for timer control, reorder interaction, and stop actions.

UX-DR8: Ensure interaction feedback makes the difference between ready, active, dragging, and dropped states obvious.

UX-DR9: Preserve the current low-friction task and timer flows after database-backed persistence is introduced, without forcing the user through extra save or sync steps for routine actions.

UX-DR10: Provide clear loading and error feedback when database-backed data is being fetched or saved, especially during initial workspace load and save failures.

UX-DR11: Keep local-development and test-mode behavior operational on localhost without exposing hosted-environment details or requiring a network-dependent user flow.

### FR Coverage Map

FR1: Epic 1 - Keep active timing running after refresh

FR2: Epic 1 - Keep active timing running after app reopen

FR3: Epic 1 - Recompute elapsed running time from persisted timestamps

FR4: Epic 2 - Start or stop timing from a task card click or tap

FR5: Epic 2 - Reorder tasks from the task card surface

FR6: Epic 2 - Distinguish click or tap from drag gestures

FR7: Epic 2 - Prevent timer toggles during drag operations

FR8: Epic 2 - Preserve active timing while reordering tasks

FR9: Epic 3 - Reduce header height and visual footprint

FR10: Epic 2 - Preserve edit, manual time, and history actions while improving card interactions

FR11: Epic 1 - Provide a globally visible active timer indicator

FR12: Epic 1 - Provide a prominent manual stop action outside the task card

FR13: Epic 1 - Show active session start or resume context

FR14: Epic 4 - Preserve extensibility for archive, export, and shortcut improvements

## Epic List

### Epic 1: Reliable Active Time Tracking

Users can trust that an active timer keeps running across refresh and app reopen, and they can always stop it manually when needed.
**FRs covered:** FR1, FR2, FR3, FR11, FR12, FR13

### Epic 2: Natural Card Interaction and Reordering

Users can control timing directly from task cards and reorder tasks through intuitive drag interactions without accidental timer toggles.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR10

### Epic 3: Compact and Action-Focused Workspace

Users can see more of their work area thanks to a compact header while keeping key controls visible and easy to reach.
**FRs covered:** FR9

### Epic 4: Extensible Productivity Foundations

The product remains ready for future workflow improvements such as archiving, export, and keyboard shortcuts without reworking the timer model.
**FRs covered:** FR14

## Epic 1: Reliable Active Time Tracking

Users can trust that an active timer keeps running across refresh and app reopen, and they can always stop it manually when needed.

### Story 1.1: Persist Active Timer Across Refresh and Reopen

As a time-tracking user,
I want my active timer to continue running after a refresh or app reopen,
So that I do not lose tracked time if the app closes accidentally.

**Acceptance Criteria:**

**Given** a task timer is running
**When** the user refreshes the page
**Then** the timer remains active after the application reloads
**And** the elapsed time continues from the original persisted start timestamp

**Given** a task timer is running
**When** the user closes the web application and opens it again later
**Then** the timer is still active
**And** the elapsed time reflects the full real-world duration since the timer started

**Given** an active timer exists in persisted state
**When** the application bootstraps
**Then** the application must not stop the timer automatically
**And** the timer state remains recoverable until manually stopped

### Story 1.2: Show Recovered Active Timer Status

As a time-tracking user,
I want to clearly see that a timer is currently active after recovery,
So that I know time is still being tracked in the background.

**Acceptance Criteria:**

**Given** an active timer has been recovered from persisted state
**When** the main workspace is displayed
**Then** the interface shows a globally visible active timer status
**And** the active task name is visible without requiring the user to find the task card first

**Given** an active timer is currently running
**When** the active timer indicator is shown
**Then** the interface displays the current elapsed time
**And** it also displays contextual information indicating when the active session started or resumed

**Given** no timer is active
**When** the workspace is displayed
**Then** the global active timer indicator is hidden or shown in an inactive state
**And** it does not imply that time is currently being tracked

### Story 1.3: Stop a Recovered Timer Manually

As a time-tracking user,
I want a clear manual stop action for a recovered timer,
So that I stay in control of when tracked time ends.

**Acceptance Criteria:**

**Given** a recovered active timer is running
**When** the user activates the global stop control
**Then** the timer stops immediately
**And** the current session is finalized using the current timestamp

**Given** a recovered timer is stopped manually
**When** the session history and totals are recalculated
**Then** the stopped duration is added to the correct task
**And** the session remains valid in the existing session and segment model

**Given** a timer has been recovered and later stopped
**When** the application is refreshed again
**Then** the timer no longer resumes automatically
**And** the interface reflects that no timer is currently active

### Story 1.4: Add Regression Coverage for Timer Recovery

As a product team,
I want automated regression coverage for recovered timer behavior,
So that future changes do not break persistent time tracking.

**Acceptance Criteria:**

**Given** automated test coverage for timer persistence
**When** the test suite runs
**Then** it verifies that an active timer survives a refresh
**And** it verifies that elapsed time is computed from persisted timestamps

**Given** automated test coverage for recovery flows
**When** the test suite runs
**Then** it verifies that a recovered timer is not auto-stopped during application bootstrap
**And** it verifies that the timer can still be stopped manually

**Given** automated test coverage for session integrity
**When** a recovered timer is stopped in tests
**Then** task totals and session data remain consistent
**And** no duplicate or zero-length running session is created unintentionally

## Epic 2: Natural Card Interaction and Reordering

Users can control timing directly from task cards and reorder tasks through intuitive drag interactions without accidental timer toggles.

### Story 2.1: Drag Tasks From the Card Surface

As a time-tracking user,
I want to drag a task from the card surface instead of a tiny handle,
So that reordering tasks feels natural on desktop and touch devices.

**Acceptance Criteria:**

**Given** the task grid is displayed
**When** the user presses and moves from the primary task card surface with a valid drag gesture
**Then** the task enters drag mode
**And** the task can be reordered without relying on a small grip-only target

**Given** a task is dragged from the card surface
**When** the drag operation completes over another task position
**Then** the task order is updated
**And** the new order is persisted using the existing task ordering model

**Given** the user is on a touch device
**When** the user performs the configured drag gesture from the card surface
**Then** the drag interaction behaves consistently with desktop behavior
**And** the interaction remains touch-friendly

### Story 2.2: Toggle Timer With a Simple Card Click or Tap

As a time-tracking user,
I want to start or stop timing with a simple click or tap on a task card,
So that I can control timing quickly without aiming for a small control.

**Acceptance Criteria:**

**Given** a task has no active timer
**When** the user performs a simple click or tap on the task card
**Then** the timer starts for that task
**And** the task immediately reflects its active state

**Given** a task is currently active
**When** the user performs a simple click or tap on the same task card
**Then** the timer stops
**And** the tracked time is added to the task using the existing session model

**Given** another task is already active
**When** the user performs a simple click or tap on a different task card
**Then** the existing active timer is finalized correctly
**And** the newly selected task becomes the only active timer

### Story 2.3: Prevent Accidental Timer Toggles During Reordering

As a time-tracking user,
I want drag and click gestures to be interpreted correctly,
So that reordering tasks never accidentally starts or stops a timer.

**Acceptance Criteria:**

**Given** the user performs a drag gesture on a task card
**When** the drag threshold is met and reordering begins
**Then** the interaction is treated as a drag only
**And** no timer toggle is triggered by that gesture

**Given** a timer is already running on a task
**When** that task card is dragged to a new position
**Then** the timer continues running throughout the reorder interaction
**And** the active timing state remains unchanged after the drop

**Given** a task card contains secondary controls such as edit, manual time, and history
**When** the user activates one of those controls
**Then** the requested secondary action is executed
**And** neither drag mode nor timer toggle is triggered unintentionally

### Story 2.4: Add Regression Coverage for Card Click and Drag Behavior

As a product team,
I want automated regression coverage for task card gesture behavior,
So that future interaction changes do not break timing or reordering.

**Acceptance Criteria:**

**Given** automated test coverage for task card interactions
**When** the test suite runs
**Then** it verifies that a simple click or tap starts an inactive timer
**And** it verifies that a simple click or tap stops an active timer

**Given** automated test coverage for reordering behavior
**When** the test suite runs
**Then** it verifies that dragging a task changes the order
**And** it verifies that no timer toggle occurs during the drag flow

**Given** automated test coverage for active-task drag behavior
**When** the test suite runs
**Then** it verifies that an already-running timer continues during and after reorder
**And** it verifies that secondary task actions still work independently

## Epic 3: Compact and Action-Focused Workspace

Users can see more of their work area thanks to a compact header while keeping key controls visible and easy to reach.

### Story 3.1: Reduce Header Vertical Footprint

As a time-tracking user,
I want the application header to take much less vertical space,
So that I can see more tasks and working context without scrolling.

**Acceptance Criteria:**

**Given** the main workspace is displayed
**When** the header is rendered
**Then** its overall height is meaningfully reduced compared with the current design
**And** the page exposes more usable vertical space for task content

**Given** the header contains branding, title, and descriptive content
**When** the compact layout is applied
**Then** the visual hierarchy remains clear
**And** long-form descriptive copy is shortened or condensed to fit the compact layout

**Given** the user views the application on mobile, tablet, or desktop
**When** the compact header layout is displayed
**Then** the reduced-height design remains readable
**And** it does not create overlapping or truncated controls

### Story 3.2: Preserve Action and Filter Usability in the Compact Header

As a time-tracking user,
I want the header actions and filters to remain easy to reach in the compact layout,
So that I gain space without losing control of the workspace.

**Acceptance Criteria:**

**Given** the compact header layout is active
**When** the user views the primary actions
**Then** controls for view switching, tag management, and filter reset remain visible or clearly accessible
**And** their touch targets remain usable on touch devices

**Given** tags are available for filtering
**When** the user interacts with the compact header
**Then** tag filters remain discoverable and selectable
**And** the compact layout does not make filter state ambiguous

**Given** the user applies the compact header on a smaller viewport
**When** controls wrap or reposition responsively
**Then** the header still feels organized
**And** no core action is hidden without an intentional interaction pattern

### Story 3.3: Compact Task Cards for Phone-Sized Screens

As a time-tracking user,
I want task cards to take less vertical space on a phone-sized screen,
So that I can scan and reach more tasks without excessive scrolling.

**Acceptance Criteria:**

**Given** the task grid is displayed on a phone-sized viewport
**When** the task cards are rendered
**Then** each card uses a more compact mobile layout with reduced vertical footprint
**And** the interface exposes more task content within the same visible screen area

**Given** a task card is shown on a phone-sized viewport
**When** the compact layout is applied
**Then** the timer status, task title, total time, drag affordance, and secondary actions remain readable and reachable
**And** touch targets stay usable without overlapping or truncating core controls

**Given** tasks have long names, comments, tags, or active timing state
**When** the compact mobile card layout is displayed
**Then** the content adapts without breaking the visual hierarchy
**And** the active-state and drag interactions continue to behave consistently with the existing card behavior

## Epic 4: Extensible Productivity Foundations

The product remains ready for future workflow improvements such as archiving, export, and keyboard shortcuts without reworking the timer model.

### Story 4.1: Prepare Task and Session Models for Future Workflow Extensions

As a product team,
I want the task and session model boundaries to remain stable as new workflow features are added,
So that future archiving and export features can be implemented without redesigning the timer core.

**Acceptance Criteria:**

**Given** the current task, timer, and session domain model
**When** the extension-ready foundations are defined and implemented
**Then** task lifecycle changes such as future archiving can be added without changing the single-active-timer contract
**And** session and reporting data remains consumable through stable model boundaries

**Given** future export requirements are anticipated
**When** the reporting and session data structure is reviewed
**Then** the current structure supports future export use cases without data model rework
**And** no current timer recovery behavior is regressed by those preparations

### Story 4.2: Prepare UI Interaction Boundaries for Future Shortcuts and Advanced Actions

As a product team,
I want task actions and timer controls to be organized behind stable interaction boundaries,
So that future keyboard shortcuts and advanced actions can be added cleanly.

**Acceptance Criteria:**

**Given** the current task interaction model
**When** future-ready interaction boundaries are established
**Then** timer start, timer stop, reorder, and secondary actions are clearly separated in the UI logic
**And** future shortcut bindings can target those actions without changing their business rules

**Given** future productivity enhancements are planned
**When** the interaction model is extended later with shortcuts or advanced actions
**Then** those enhancements can be added without redesigning the existing card gesture behavior
**And** the current touch and pointer interaction patterns remain intact
