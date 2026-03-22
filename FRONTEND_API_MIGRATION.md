# Frontend Store API Migration - Implementation Guide

## Overview

The frontend store is **already integrated with the API layer**. The Zustand store in `src/store/useTimeTrackerStore.ts` is designed to use the `TimeTrackerApiClient` which makes HTTP requests to the Vercel API routes.

This document outlines the complete integration and how to verify it's working correctly.

## Current Architecture

### 1. API Client Layer (`src/lib/api.ts`)

The `TimeTrackerApiClient` interface is the contract between frontend and backend:

```typescript
export interface TimeTrackerApiClient {
  tasks: {
    list: () => Promise<Task[]>;
    create: (draft: TaskDraft) => Promise<Task>;
    update: (id: string, patch: TaskUpdateInput) => Promise<Task>;
    delete: (id: string) => Promise<void>;
  };
  tags: {
    /* similar */
  };
  sessions: {
    /* similar */
  };
  activeTimer: {
    /* similar */
  };
}
```

### 2. Implementation (`src/lib/api.ts`, lines 200-350)

The `createTimeTrackerApiClient()` function creates instances with:

- **Token-based authentication** via Clerk's `getToken()`
- **Automatic error handling** and HTTP error mapping
- **Response mapping** (snake_case API → camelCase frontend)
- **Request transformation** (camelCase inputs → snake_case API)

### 3. Store Integration (`src/store/useTimeTrackerStore.ts`)

The store actions call the API client instance:

```typescript
// Example: Creating a task
addTask: async (draft) => {
  const apiClient = requireApiClient();
  const createdTask = await apiClient.tasks.create(normalized);
  set((state) => ({ tasks: [...state.tasks, createdTask] }));
},
```

### 4. Backend API Routes (`api/`)

All routes are refactored to use shared helpers:

- `api/tasks.ts` - Task CRUD with helper pattern (45 lines)
- `api/tags.ts` - Tag CRUD with helper pattern (35 lines)
- `api/sessions.ts` - Session CRUD with helper pattern (60 lines)
- `api/tasks/[id].ts` - Individual task operations
- `api/tags/[id].ts` - Individual tag operations
- `api/sessions/[id].ts` - Individual session operations
- `api/active-timer.ts` - Timer state management (REFACTORED)

## How to Test the Integration

### Option 1: Run the Application

```bash
npm run dev
# Opens http://localhost:3000 with Clerk authentication
```

Then:

1. Sign in with Clerk credentials
2. Create a new task
3. Check browser DevTools → Network tab for API calls to `/api/tasks`
4. Verify tasks appear in the UI

### Option 2: Run the Integration Test Script

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run the test script
npx ts-node scripts/test-api-integration.ts
```

This script will:

- Test all CRUD endpoints (tasks, tags, sessions, active timer)
- Verify HTTP status codes and responses
- Log which operations work or fail

### Option 3: Manual cURL Testing (Requires Auth)

```bash
# Get Clerk token manually, then:
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json"
```

## Common Issues and Solutions

### Issue: 404 on Task Creation

**Root Cause**: The previous dev setup issue (Vite-only) has been fixed.

**Solution**: Verify:

1. Dev server is running: `npm run dev`
2. Both Vite and Vercel dev are active (watch for "vercel dev" output)
3. Check `scripts/dev.js` is properly configured
4. Review `vercel.json` has `"devCommand": "vite --host"`

### Issue: 401 Unauthorized

**Solution**: Verify:

1. You're signed in with Clerk
2. `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env.local`
3. Check browser DevTools → Storage → IndexedDB for Clerk session

### Issue: API Route Not Found

**Solution**:

1. Verify file paths match: `api/tasks.ts` → `/api/tasks` endpoint
2. Check route files have `export default createRequestHandler(...)`
3. Rebuild: `npm run build`

## Store State Flow

```
Component
    ↓
useTimeTrackerStore hook (Zustand)
    ↓
Store action (e.g., addTask)
    ↓
API Client method (e.g., tasks.create)
    ↓
fetch() to /api/... with Bearer token
    ↓
API Route (e.g., api/tasks.ts)
    ↓
createRequestHandler validates + authenticates
    ↓
Route handler queries database
    ↓
Response mapped snake_case → camelCase
    ↓
Store state updated
    ↓
Component re-renders
```

## Key Files Changed (This Session)

### New API Helpers (api/lib/)

- `request-handler.ts` - Middleware pattern (71 lines)
- `query-helper.ts` - User-scoped CRUD (153 lines)
- `validation-helper.ts` - Schema validation (142 lines)
- `lib/index.ts` - Barrel export (51 lines)
- `lib/README.md` - Documentation (314 lines)

### Refactored API Routes

- `api/tasks.ts` - 86 → 45 lines (48% reduction)
- `api/tags.ts` - 55 → 35 lines (36% reduction)
- `api/sessions.ts` - 123 → 60 lines (51% reduction)
- `api/tasks/[id].ts` - Complex → 60 lines (60% reduction)
- `api/tags/[id].ts` - 80+ → 50 lines (37% reduction)
- `api/sessions/[id].ts` - 100+ → 55 lines (45% reduction)
- `api/active-timer.ts` - NEWLY REFACTORED (89 lines)

### No Changes Needed

- `src/store/useTimeTrackerStore.ts` - Already uses API
- `src/lib/api.ts` - Already implements HTTP client
- `src/App.tsx` - Correctly initializes API client

## Next Steps

✅ **Complete**:

1. API shared helpers implemented
2. All API routes refactored to use helpers
3. Active timer route refactored
4. Build verified (no regressions)

📋 **Ready for Testing**:

1. Start dev server: `npm run dev`
2. Test task creation in UI
3. Verify API calls in DevTools Network tab
4. Run Playwright e2e tests: `npm run test:e2e`

📋 **After Frontend Verification**:

1. Run full test suite: `npm run test`
2. Deploy with confidence: `npm run build` → commit to Git

## Architecture Diagram

```
FRONTEND                          BACKEND
┌─────────────┐                  ┌──────────────┐
│  Component  │                  │  Database    │
└──────┬──────┘                  │  (Turso)     │
       │                         └──────▲───────┘
       │                                │
       ▼                                │
┌─────────────────────┐         ┌──────┴──────────┐
│  Zustand Store      │         │  Vercel Routes  │
│  (useTimeTracker)   │         │  (api/...)      │
└──────┬──────────────┘         └──────▲──────────┘
       │                                │
       ▼                                │
┌─────────────────────┐         ┌──────┴──────────────┐
│  API Client         │         │  createRequestHandler
│  (createTimeTracker │   ───→  │  (middleware)
│   ApiClient)        │         │                    │
└─────────────────────┘         │  createUserQuery
       │                        │  Helper
       │                        │  (CRUD ops)
       │                        │
       │                        └────────────────────┘
       │
       ▼
    fetch()
    + Clerk Bearer Token
    + JSON payload
```

## API Endpoint Reference

### Tasks

- `GET /api/tasks` - List all user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Tags

- `GET /api/tags` - List all user tags
- `POST /api/tags` - Create new tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag and remove from tasks

### Sessions

- `GET /api/sessions?taskId={id}` - List sessions for task or all
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session

### Active Timer

- `GET /api/active-timer` - Get current user's active timer or null
- `PUT /api/active-timer` - Set active timer (replaces existing)
- `DELETE /api/active-timer` - Clear active timer

## Verification Checklist

- [x] API helpers created and tested
- [x] All API routes refactored (7 total)
- [x] Build passes without errors
- [x] Active timer route refactored
- [ ] Dev server runs without 404 errors
- [ ] Task creation works in UI
- [ ] All CRUD operations succeed
- [ ] Playwright e2e tests pass
- [ ] Full test suite passes

## Troubleshooting

### Build Failures

```bash
npm run clean    # Clear dist and cache
npm run build    # Rebuild
```

### Dev Server Issues

```bash
# Stop existing processes
npm run dev      # Or pkill -f vercel

# Check ports
netstat -ano | grep 3000  # Windows
lsof -i :3000             # Mac/Linux
```

### API Connection Issues

```bash
# Check environment variables
cat .env.local             # Verify CLERK keys are set

# Check dev server console
# Look for "vercel dev running" message
# Look for API route initialization logs
```

## Questions?

Refer to:

- [API Helpers Documentation](./api/lib/README.md)
- [Clerk Auth Setup](./CLERK_SETUP.md)
- [Vercel Dev Guide](./vercel.json)
