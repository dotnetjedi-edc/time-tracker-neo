---
title: "GitHub Actions CI/CD with Turso and Clerk Secrets"
story_id: "5.5"
story_key: "5-5-github-actions-cicd-with-turso-and-clerk-secrets"
created: "2026-03-21"
status: "review"
stepsCompleted: [1, 2, 3, 4]
epic: "Epic 5: Backend Persistence & Multi-Device Sync"
tech_stack:
  [
    "GitHub Actions",
    "Vercel",
    "Clerk.dev",
    "Turso libSQL",
    "Vite",
    "Playwright",
  ]
files_to_modify: [".github/workflows/ci.yml", "README.md", "vercel.json"]
code_patterns:
  [
    "CI is centralized in a single GitHub Actions workflow with separate jobs for type-check, unit tests, e2e, and deploy",
    "Branch-based deployment strategy distinguishes main production, develop staging, and pull request previews",
    "Build-time and runtime secrets must stay scoped to the steps that need them",
  ]
test_patterns:
  [
    "Pipeline validation should confirm secrets injection, branch routing, and preview behavior rather than only lint-style correctness",
    "Deployment workflow changes should preserve existing quality gates before any deploy step runs",
  ]
---

## Story 5.5: GitHub Actions CI/CD with Turso and Clerk Secrets

Status: review

## Story

As a developer,
I want GitHub Actions to deploy the app with the right Turso and Clerk configuration,
so that production, staging, and preview environments are repeatable and do not require manual deployment steps.

## Acceptance Criteria

1. Given I push to `main`, when CI succeeds, then the app deploys to Vercel production with the correct environment contract.
2. Given I push to `develop`, when CI succeeds, then the app deploys to the intended staging or preview target.
3. Given I open a pull request, when CI runs, then a preview deployment is produced and surfaced back to the PR flow.
4. Given the build step runs, when frontend and backend configuration are needed, then the workflow injects the required Clerk and Turso variables safely.
5. Given quality gates fail, when the workflow reaches deployment stages, then deployment does not proceed.

## Tasks / Subtasks

- [x] Task 1: Harden secret injection and environment separation in CI (AC: 1, 2, 4, 5)
  - [x] Update `.github/workflows/ci.yml` so required build-time and deploy-time secrets are present only where needed.
  - [x] Ensure both Clerk and Turso variables are available to the build or deploy steps that actually require them.
  - [x] Preserve the existing gate sequence so deploy depends on successful verification jobs.

- [x] Task 2: Verify branch and PR deployment behavior (AC: 1, 2, 3)
  - [x] Confirm `main`, `develop`, and `pull_request` paths produce the intended Vercel target.
  - [x] Ensure preview deployment feedback is useful and not misleading if Vercel already comments separately.
  - [x] Avoid duplicate or contradictory PR comments about deployment state.

- [x] Task 3: Document CI environment expectations for maintainers (AC: 4)
  - [x] Refresh README or deployment notes with the required GitHub secrets and branch expectations.
  - [x] Clarify which variables are frontend-safe publishable values and which must remain server-only.

## Dev Notes

### Story Foundation

- This story closes the operational loop for Epic 5 after backend and frontend persistence changes exist.
- The workflow should support the chosen branch strategy already documented in the architecture and brainstorming artifacts.
- Reliable deployment matters because Epic 5 introduces environment-sensitive auth and database configuration.

### Existing Code Reality

- `.github/workflows/ci.yml` already exists and covers type-check, unit tests, E2E, and Vercel deployment.
- The current workflow already injects `VITE_CLERK_PUBLISHABLE_KEY` during build, but Epic 5 requires a fuller environment contract review.
- `main`, `develop`, and pull request flows are already represented in the workflow, so this story should refine rather than replace the pipeline.

### Guardrails

- Do not expose server-only secrets in build logs, PR comments, or client-bundled environment variables.
- Do not bypass existing test gates for the sake of faster deployment.
- Do not introduce branch behavior that conflicts with the architecture decision of `develop` for staging and `main` for production.

### Testing Standards Summary

- Validate workflow logic for each trigger path and confirm the right environment variables are bound where needed.
- Validate that failed verification jobs block deployment.
- Validate that preview communication on pull requests is accurate and not duplicated unnecessarily.
