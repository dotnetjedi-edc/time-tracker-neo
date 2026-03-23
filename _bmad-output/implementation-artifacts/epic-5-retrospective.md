---
title: "Epic 5 Retrospective: Backend Persistence & Multi-Device Sync"
epic_id: "5"
epic_name: "Backend Persistence & Multi-Device Sync"
status: "complete"
completed_date: "2026-03-23"
stories_count: 6
stories_completed: 6
code_review_result: "PASS WITH NOTES"
retrospective_version: "1.0"
---

# Epic 5 Retrospective: Backend Persistence & Multi-Device Sync

**Epic Objective:** Replace client-side localStorage persistence with a remote Turso database, enabling data durability across device restarts and browser clears, multi-device access, and a foundation for multi-user support via Clerk.dev authentication.

**Status:** ✅ **COMPLETE** — All 6 stories delivered. Code review passed with notes (no critical fixes required).

---

## 1. Epic Review Summary

### Scope & Accomplishments

Epic 5 was the most architecturally significant epic in the project to date. It transformed time-tracker3 from a local-first single-browser application into a cloud-backed, multi-device, authenticated platform. The scope encompassed:

| Layer              | Change                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Database**       | Turso libSQL database with 4 tables (tasks, tags, sessions, active_timers) + indexes                                 |
| **API**            | 7 Vercel Serverless API routes with shared middleware (`createRequestHandler`), query helpers, and schema validation |
| **Authentication** | Clerk.dev integration (frontend `<ClerkProvider>` + backend JWT validation)                                          |
| **Frontend Store** | Zustand store rewritten from `persist` middleware to async API calls via `TimeTrackerApiClient`                      |
| **CI/CD**          | GitHub Actions pipeline with TypeScript build, unit tests, integration tests, and Vercel deployment                  |
| **Tooling**        | Database initialization script (`npm run db:setup`), integration test script                                         |

### Story Completion

| Story | Title                                             | Status  | Notes                                                    |
| ----- | ------------------------------------------------- | ------- | -------------------------------------------------------- |
| 5-1   | Vercel API Routes with Turso Connection           | ✅ Done | Foundation: db.ts, auth.ts, vercel.json                  |
| 5-2   | Tasks and Tags API Endpoints                      | ✅ Done | Full CRUD for tasks and tags                             |
| 5-3   | Sessions and Active Timer API Endpoints           | ✅ Done | Sessions CRUD + active timer get/set/delete              |
| 5-4   | Frontend Store Migration to API Layer             | ✅ Done | 20+ store actions migrated to API calls                  |
| 5-5   | GitHub Actions CI/CD with Turso and Clerk Secrets | ✅ Done | 4-job pipeline: type-check → unit → integration → deploy |
| 5-6   | Database Initialization Script                    | ✅ Done | Idempotent schema setup via `tsx scripts/setup-db.ts`    |

### Scope Assessment

The epic delivered **on scope**. No stories were cut or deferred. The implementation went beyond the original spec in one positive way: the API helpers library (`api/lib/`) introduced standardized patterns (request handler middleware, query helpers, validation helpers) that reduced per-route code by 36–60%. This was a valuable investment that will pay dividends in maintenance and future endpoint development.

---

## 2. What Went Well

### 2.1 Clean Architectural Layering

The separation of concerns across the stack was executed well:

- **API routes** handle HTTP concerns and auth validation only
- **Shared helpers** (`request-handler.ts`, `query-helper.ts`, `validation-helper.ts`) encapsulate cross-cutting patterns
- **Frontend `api.ts`** provides a typed HTTP client with automatic Clerk token injection
- **Zustand store** maintains the same action signatures — only internals changed

This layering means future API changes are isolated from store logic and vice versa.

### 2.2 API Helper Standardization

The `createRequestHandler` pattern eliminated boilerplate across all 7 routes:

- Automatic OPTIONS/CORS handling
- Consistent auth validation
- Method allowlist enforcement
- Standardized error responses

**Code quality measurable impact:** Average 48% code reduction per route. This is a pattern worth retaining for any future API work.

### 2.3 Incremental Story Sequencing

The story ordering (infrastructure → endpoints → frontend → CI/CD → tooling) was well-designed. Each story built cleanly on the previous one without requiring rework. Story 5-4 (frontend migration) confirmed that the store was already fully integrated — validating that the API surface designed in 5-1 through 5-3 matched frontend expectations.

### 2.4 Build Stability Throughout

TypeScript compilation remained green throughout all implementation phases:

- Zero build regressions across all 5 tracked build checkpoints
- Build times stayed consistent (~2.3–2.4s)
- Type safety caught integration issues early

### 2.5 Comprehensive Documentation

The team produced high-quality documentation alongside the implementation:

- `FRONTEND_API_MIGRATION.md` — Architecture overview, testing guide, troubleshooting
- `EPIC_5_SUMMARY.md` — Progress tracking and code quality metrics
- `api/lib/README.md` — Helper library documentation with examples
- `COMPLETION_CHECKLIST.md` — Delivery verification

---

## 3. What Could Be Improved

### 3.1 CORS Configuration (Code Review Finding #1)

The `vercel.json` configuration uses `Access-Control-Allow-Credentials: true` alongside `Access-Control-Allow-Origin: *`. This is an invalid combination per the CORS specification — browsers will reject credentialed requests with a wildcard origin.

**Impact:** Currently masked because Vercel's hosting serves the SPA and API from the same origin in production. Would break immediately if the frontend were served from a different domain.

**Root Cause:** The CORS headers were configured defensively ("allow everything") rather than scoped to the actual deployment origin.

### 3.2 E2E Test Coverage Gap (Code Review Finding #2)

The existing Playwright E2E tests are broken by the Clerk authentication gate. Tests cannot proceed past the sign-in screen because the test harness has no mechanism to authenticate with Clerk.

**Impact:** E2E regression coverage for core user flows (timer, tasks, sessions) is currently **non-functional**. This is the most significant quality regression from Epic 5.

**Root Cause:** The epic spec did not include a story for updating E2E test infrastructure to handle authenticated flows. The auth gate was introduced without a corresponding test adaptation strategy.

### 3.3 CI Job Scope (Code Review Finding #3)

The `unit-tests` CI job injects `CLERK_SECRET_KEY`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` as environment variables, even though unit tests should not require backend secrets. This violates the principle of least privilege and obscures what each CI job actually depends on.

**Impact:** Low immediate risk, but creates confusion about test boundaries and unnecessarily exposes secrets to jobs that don't need them.

### 3.4 Input Validation Gaps (Code Review Finding #4)

API endpoints do not enforce `maxLength` constraints on text input fields (task names, comments, tag names). The schema validation validates presence and type but not size.

**Impact:** A client could submit arbitrarily large payloads that get stored in the database. Low risk at current single-user scale, but a hygiene gap for a production API.

### 3.5 Timer State Atomicity (Code Review Finding #5)

The `startTimer` store action does not abort if the preceding `stopTimer` call fails. This means a user could end up with orphaned session data if the stop request fails but the start request succeeds.

**Impact:** Could produce inconsistent data (duplicate active timers, lost sessions) under network instability. Low frequency but high confusion when it occurs.

### 3.6 Race Condition on Task Reordering (Code Review Finding #6)

Rapid calls to `setTaskOrder` can produce out-of-order API requests, resulting in incorrect final task positions persisted to the database.

**Impact:** Users who quickly reorder multiple tasks may see positions revert or jumble on the next page load. Mitigated by the fact that the UI reflects optimistic state, but the persisted order may diverge.

---

## 4. Action Items

| #   | Action                                                                                                                                                                                                     | Priority | Owner | Target      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- | ----------- |
| 1   | **Fix CORS configuration** — Replace wildcard origin with explicit deployment URL in `vercel.json`. Remove `Access-Control-Allow-Credentials` if not needed, or scope origin to the Vercel app domain.     | High     | Dev   | Next sprint |
| 2   | **Restore E2E test coverage** — Implement a Clerk test authentication strategy (test user with API key bypass, or Clerk testing tokens) so Playwright can authenticate and run flows.                      | High     | Dev   | Next sprint |
| 3   | **Trim CI unit-test secrets** — Remove `CLERK_SECRET_KEY`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` from the `unit-tests` job in `ci.yml`. Only keep `VITE_CLERK_PUBLISHABLE_KEY` if needed for build. | Low      | Dev   | Next sprint |
| 4   | **Add maxLength validation** — Add string length limits to `validation-helper.ts` schemas for task name (200), comment (2000), tag name (50), tag color (20).                                              | Medium   | Dev   | Next sprint |
| 5   | **Make startTimer atomic** — Wrap stop-then-start in a try/catch that aborts the start if stop fails, or use a single API transaction endpoint.                                                            | Medium   | Dev   | Backlog     |
| 6   | **Debounce setTaskOrder** — Add a debounce or queue mechanism to `setTaskOrder` so only the final reorder state is persisted after rapid changes.                                                          | Low      | Dev   | Backlog     |

---

## 5. Technical Debt Logged

| Item       | Description                                                                                        | Severity | Source        |
| ---------- | -------------------------------------------------------------------------------------------------- | -------- | ------------- |
| **TD-5.1** | CORS wildcard + credentials conflict in `vercel.json`                                              | Medium   | Code review   |
| **TD-5.2** | E2E tests non-functional behind Clerk auth gate                                                    | High     | Code review   |
| **TD-5.3** | Unnecessary backend secrets in unit-test CI job                                                    | Low      | Code review   |
| **TD-5.4** | No maxLength validation on API text inputs                                                         | Medium   | Code review   |
| **TD-5.5** | Non-atomic startTimer (doesn't rollback on stopTimer failure)                                      | Medium   | Code review   |
| **TD-5.6** | Race condition on rapid setTaskOrder calls                                                         | Low      | Code review   |
| **TD-5.7** | `project-context.md` references localStorage-first architecture — now outdated after API migration | Low      | Retrospective |
| **TD-5.8** | No API-level integration tests in CI (only manual `test-api-integration.ts` script exists)         | Medium   | Retrospective |

---

## 6. Patterns to Retain

### From Epic 5

- **`createRequestHandler` middleware pattern** — Standardize all future API routes through this factory
- **Typed API client** (`src/lib/api.ts`) with automatic auth token injection — Keep this abstraction stable
- **Story sequencing: infrastructure → endpoints → frontend → CI/CD** — This bottom-up ordering prevented rework
- **Schema-driven validation** (`validation-helper.ts`) — Extend for new endpoints rather than ad-hoc validation

### Carried Forward from Epic 3

- **Derived props at App.tsx entry point** — Still valid, now with API-loaded data
- **Accessibility-first testing** — French accessible names as test anchors
- **Inline Tailwind responsive classes** — Maintainable at current scale

---

## 7. Next Epic Preparation

### Recommendation: Epic 2 — Natural Card Interaction and Reordering

Epic 2 (4 stories in backlog) is the natural next candidate. It focuses on drag-and-drop card interactions and timer toggle via click/tap — a user-facing UX improvement that builds on the now-stable backend.

**Pre-requisites before starting Epic 2:**

1. **Fix E2E tests first (Action Item #2)** — Epic 2 stories 2-3 and 2-4 specifically require regression coverage for drag-vs-click behavior. The E2E infrastructure must be functional before starting.
2. **Fix CORS configuration (Action Item #1)** — Clean up the security finding before adding more frontend interaction complexity.
3. **Update `project-context.md`** — The file still references localStorage-first architecture. Update to reflect the API-backed reality so future implementation work follows correct patterns.

**Risks for Epic 2:**

- `TaskCard` component is shared with Epic 3's compact layout — drag interaction changes must preserve compact card behavior
- The `setTaskOrder` race condition (TD-5.6) directly impacts Epic 2's drag-reorder feature — consider debounce fix as part of Epic 2 scope
- E2E test dependency is a hard blocker — without Clerk-authenticated Playwright flows, acceptance criteria for stories 2-3 and 2-4 cannot be verified

**Alternative:** If E2E test restoration is complex, consider a focused tech-debt sprint addressing Action Items 1–4 before starting Epic 2.

---

## Key Metrics

### Code Changes Summary (Epic 5 Total)

| Metric                       | Value              |
| ---------------------------- | ------------------ |
| New API routes               | 7                  |
| New shared helpers           | 6 files (api/lib/) |
| Store actions migrated       | 20+                |
| Average route code reduction | 48% (via helpers)  |
| Build regressions            | 0                  |
| TypeScript compilation time  | ~2.3–2.4s (stable) |

### Architecture Transformation

| Dimension      | Before Epic 5                  | After Epic 5                |
| -------------- | ------------------------------ | --------------------------- |
| Persistence    | localStorage (Zustand persist) | Turso libSQL via Vercel API |
| Authentication | None                           | Clerk.dev (JWT)             |
| Data scope     | Single browser                 | Multi-device, per-user      |
| API layer      | None                           | 7 serverless routes         |
| CI/CD          | None                           | GitHub Actions (4 jobs)     |
| Deploy         | Manual                         | Automatic (push to main)    |

---

_Retrospective facilitated by Bob (Scrum Master) on 2026-03-23._
_Epic 5 code review completed with PASS WITH NOTES status — no critical fixes required._
