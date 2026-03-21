---
project_name: "time-tracker3"
user_name: "Eric"
date: "2026-03-21"
sections_completed:
  [
    "technology_stack",
    "language_rules",
    "framework_rules",
    "testing_rules",
    "quality_rules",
    "workflow_rules",
    "anti_patterns",
  ]
rule_count: 70
status: "complete"
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Frontend runtime: React 19.1.0 with React DOM 19.1.0.
- Build toolchain: Vite 6.3.5 for local development and production builds.
- Language setup: TypeScript 5.8.3 in strict mode, using `jsx: react-jsx`, `noEmit: true`, and Node-style module resolution.
- State layer: Zustand 5.0.5 with `persist`; application state is local-first and stored in browser `localStorage`.
- Styling system: Tailwind CSS 3.4.17 with project-defined tokens and utility extensions; agents should reuse the existing color tokens (`ink`, `mist`, `coral`, `mint`, `gold`) instead of introducing ad hoc palette values.
- Interaction libraries: `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, and `@dnd-kit/utilities` 3.2.2 power task-card drag-and-drop behavior.
- Icons: `lucide-react` 0.511.0.
- Unit/integration testing: Vitest 3.1.2 with Testing Library, `@testing-library/user-event`, and jsdom.
- E2E testing: Playwright 1.58.2 running Chromium against the local Vite server at `127.0.0.1:4173`.
- Repository script contract: preserve the existing `package.json` scripts (`dev`, `build`, `test`, `test:unit`, `test:integration`, `test:e2e`, `test:all`) because tooling and workflow expectations depend on those entry points.

## Critical Implementation Rules

### Language-Specific Rules

- Treat TypeScript strictness as part of the project contract. Do not work around the type system with `any`, unsafe casts, or silent type widening unless there is a demonstrated necessity.
- Keep the existing module style: ES modules, named exports for reusable helpers, and type imports where appropriate.
- Preserve the current naming split: PascalCase for React component files and component symbols, camelCase for helpers, store actions, and utility functions.
- Keep domain types centralized in `src/types.ts`; extend existing domain models instead of creating duplicate local shapes in components.
- Prefer small pure helper functions in `src/lib` for date, duration, and reporting logic. UI components should consume derived values rather than reimplementing business calculations inline.
- Time values are stored and exchanged as ISO strings. Derived day keys are computed separately; do not replace this with locale-formatted strings in state.
- Treat zero-duration sessions as invalid input. Existing store logic intentionally ignores zero-length manual sessions and removes zero-length recovered timer sessions.
- Preserve the distinction between persisted domain state and transient UI state: persisted data belongs in the Zustand store, while modal state and view-local editing state stay inside React components.
- When changing persisted state shapes, update migration behavior instead of assuming a clean storage reset. The store already supports legacy migration and versioned persistence.
- Prefer early returns for invalid input and guard clauses, matching the current store and helper style.

### Framework-Specific Rules

- Keep persisted business logic in the Zustand store and keep React components focused on presentation, view orchestration, and temporary UI state.
- The app assumes a single active timer at a time. Any change to timer behavior must preserve the current stop-before-start flow when switching tasks.
- Treat session history as the source of truth for task totals. Task `totalTimeSeconds` values are synchronized from sessions rather than edited independently.
- Preserve the current recovery model for active timers: persisted timers can be migrated and resumed, and recovered zero-length sessions must not survive after stop/cleanup paths.
- React components currently subscribe to narrow Zustand slices. Keep that pattern; do not replace it with broad whole-store subscriptions that would increase unnecessary re-renders.
- Keep derived data in render-time calculations or focused helpers (`useMemo`, pure helpers) rather than duplicating it into extra component state.
- Maintain the current local-first boundary: no backend assumptions, no server APIs, and no async persistence layer unless the feature explicitly introduces that architecture.
- Reuse existing helper flows for weekly summaries, tag filtering, and timer duration math instead of duplicating business rules inside components.
- Preserve accessibility semantics because UI tests depend on them: dialog labels, button names, and task-card `data-testid` attributes are part of the effective interface contract.
- Preserve the current interaction model for drag-and-drop task ordering. Reordering updates task positions through store actions; do not introduce parallel ordering state that can drift from persisted state.

### Testing Rules

- Keep the current testing split intact: pure business logic in unit tests, React/store wiring in integration tests, and full user flows in Playwright E2E tests.
- Preserve the existing test entry points and assumptions in `package.json`; do not rename or silently repurpose test scripts.
- Test cleanup currently depends on `resetTimeTrackerStore()` plus Testing Library cleanup in `src/test/setup.ts`. If store persistence behavior changes, keep this reset path reliable.
- E2E tests assume a local-first browser app with `localStorage` cleared before each scenario. Do not introduce hidden startup state that survives this reset without updating tests and test setup.
- Playwright coverage depends on accessible French UI labels such as dialog names, button names, and input labels. Changing user-facing labels is a test-impacting change, not a cosmetic-only change.
- `data-testid` hooks on task cards are part of the test contract for reorder and viewport assertions; preserve them unless tests are updated in the same change.
- When changing timer logic, add or update tests for recovery, stop/start transitions, zero-length protection, and cross-task switching behavior.
- When changing weekly summary or date behavior, cover the day-assignment rule that sessions crossing midnight stay attached to the start day.
- Prefer explicit state-based assertions over implementation-detail assertions. Existing tests validate visible behavior, store outcomes, and persisted-session effects rather than internal component mechanics.
- New features should extend the existing three-layer testing strategy instead of adding only one high-level E2E path or only isolated unit coverage.

### Code Quality & Style Rules

- Follow the existing folder split: `src/components` for UI, `src/lib` for pure business helpers, `src/store` for persisted state, and `src/test` or co-located `*.test.ts` files for test coverage.
- Keep components and utilities small and single-purpose. If logic is reusable or business-oriented, extract it out of JSX into helpers or store actions.
- Preserve the current style of concise inline comments only where needed; do not add explanatory noise comments for obvious code.
- Keep user-facing copy in French to stay consistent with the existing UI and test suite expectations.
- Reuse the existing visual system before introducing new styles: current typography, color tokens, rounded surfaces, and spacing patterns should remain consistent across additions.
- Prefer updating existing helper modules and store actions over creating near-duplicate logic in new files.
- Maintain current naming conventions for tests: descriptive `it(...)` blocks focused on behavior, with concrete scenario language.
- Avoid introducing hidden coupling between UI components and storage internals. Components should call store actions rather than directly managing persistence behavior.
- When adding new selectors or hooks into the store, keep them narrowly scoped to avoid broad reactivity and accidental render churn.
- Keep formatting and structure close to the surrounding file. Avoid unrelated rewrites, broad reformatting, or stylistic churn in touched files.

### Development Workflow Rules

- Treat the repository as a brownfield codebase with an existing local-first product contract. Changes should extend current behavior rather than silently redefining core assumptions.
- Preserve the current package-script workflow as the default execution contract for development, build, and test tasks.
- Assume active work may already exist in the tree; avoid unrelated rewrites or opportunistic refactors when implementing a focused change.
- When a change affects persisted state shape, timer lifecycle, accessibility labels, or test selectors, update the relevant tests in the same change rather than leaving the suite inconsistent.
- Keep artifacts under `_bmad-output` aligned with the actual implementation state when the task explicitly targets BMAD workflows or project documentation.
- Do not assume backend or deployment infrastructure exists beyond what is present in the repository. New architectural layers should be introduced explicitly, not implied by implementation shortcuts.
- Changes to user-visible copy, especially action labels and dialog names, should be treated as workflow-significant because they affect acceptance behavior and automated coverage.
- Favor additive, reviewable patches over broad rewrites. This repository already has stable patterns, and smaller diffs are easier to validate against the existing test matrix.
- If a feature introduces a new business rule, document it through tests and the relevant helper/store layer instead of relying on component-only behavior.
- Before considering a change complete, validate consistency across store logic, helper calculations, UI labels, and tests, because those layers are tightly coupled in this project.

### Critical Don't-Miss Rules

- Preserve the single-active-timer invariant. Any flow that starts a timer must safely stop or reconcile the previously active one first.
- Treat session history as authoritative. Do not patch task totals directly without going through the session-derived synchronization logic.
- Do not break persisted-state migration. If store shape changes, update the versioned migration path instead of assuming fresh storage.
- Keep timestamps as ISO strings in state and persistence. Locale-formatted display strings belong at the presentation edge only.
- Preserve French accessibility labels and task-card `data-testid` attributes unless tests are updated in the same change.
- Recovered zero-length sessions are cleanup artifacts, not valid history. They must remain excluded after stop/recovery flows.
- Keep business calculations centralized in the store or `src/lib` helpers. Avoid duplicating timer, session, or weekly-summary rules inside components.
- Do not introduce backend, API, or multi-user assumptions into this app unless the architecture is explicitly expanded.
- When changing task ordering, timer lifecycle, or manual time entry, verify store logic, component behavior, persisted state, and automated tests together.
- Prefer the existing local-first, deterministic model over clever abstractions that obscure persistence, recovery, or test behavior.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new non-obvious patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when the technology stack or project conventions change.
- Review it periodically for stale or now-obvious rules.
- Remove guidance that no longer adds unique value for agents.

Last Updated: 2026-03-21
