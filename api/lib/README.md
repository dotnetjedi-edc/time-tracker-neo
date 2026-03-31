# API Library Documentation

The `api/lib` module provides a comprehensive set of utilities for building Vercel serverless functions with authentication, database operations, validation, and standardized response handling.

## Quick Start

### Basic Request Handler

```typescript
import { createRequestHandler, sendSuccess, validateBody } from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    if (req.method === "GET") {
      const tasks = await db.execute(
        "SELECT * FROM tasks WHERE user_id = ? ORDER BY position ASC",
        [userId],
      );
      return sendSuccess(res, tasks.rows.map(mapTaskRow));
    }
  },
  { allowedMethods: ["GET", "POST"] },
);
```

### With Query Helper

```typescript
import {
  createRequestHandler,
  createUserQueryHelper,
  sendSuccess,
} from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      const { rows: tasks } = await query.fetchAll("tasks", "position ASC");
      return sendSuccess(res, tasks.map(mapTaskRow));
    }
  },
  { allowedMethods: ["GET", "POST"] },
);
```

### With Validation

```typescript
import {
  createRequestHandler,
  validateBody,
  sendValidationError,
  sendSuccess,
  createUserQueryHelper,
} from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    if (req.method === "POST") {
      const validated = validateBody(req.body, {
        name: { type: "string", required: true, minLength: 1 },
        comment: { type: "string", required: false },
        tag_ids: { type: "string[]", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const query = createUserQueryHelper(userId);
      const id = await query.insert("tasks", {
        name: validated.name,
        comment: validated.comment ?? null,
        tag_ids: JSON.stringify(validated.tag_ids ?? []),
        total_time_seconds: 0,
        position: 0,
        lifecycle_status: "active",
      });

      const task = await query.fetchById("tasks", id);
      return sendSuccess(res, mapTaskRow(task), 201);
    }
  },
  { allowedMethods: ["POST"] },
);
```

## Modules

### Authentication (`auth.ts`)

```typescript
// Extract bearer token from request
const token = getBearerToken(req);

// Get authenticated user ID (returns null if not authenticated)
const userId = await getAuthenticatedUserId(req);
```

### Database (`db.ts`)

```typescript
// Get database client (singleton pattern)
const db = getDb();

// Execute a query
const result = await db.execute(
  "SELECT * FROM tasks WHERE user_id = ? ORDER BY position ASC",
  [userId],
);
```

### HTTP Utilities (`http.ts`)

```typescript
// Type guard for objects
if (isRecord(value)) {
  // value is Record<string, unknown>
}

// Parse string input
const name = parseRequiredString(req.body.name); // string | null
const comment = parseNullableString(req.body.comment); // string | null | undefined
const count = parseOptionalNumber(req.body.count); // number | undefined
const tags = parseStringArray(req.body.tags); // string[] | null

// Send standard responses
sendOptions(res, ["GET", "POST"]);
sendMethodNotAllowed(res, ["GET", "POST"]);
```

### Request Handler (`request-handler.ts`)

Wraps handlers with automatic:

- CORS OPTIONS support
- HTTP method validation
- Authentication middleware
- Error handling

```typescript
export default createRequestHandler(
  async (req, res, userId) => {
    // userId is guaranteed to be string (if auth required)
    // OPTIONS method is already handled
    // HTTP method is already validated
  },
  {
    allowedMethods: ["GET", "POST", "DELETE"],
    includeOptions: true, // Automatically handle OPTIONS
    requiresAuth: true, // Require valid authentication
  },
);
```

### Query Helper (`query-helper.ts`)

User-scoped database operations with automatic user_id filtering:

```typescript
const query = createUserQueryHelper(userId);

// Fetch operations
const { rows: allTasks } = await query.fetchAll("tasks", "position ASC");
const task = await query.fetchById("tasks", taskId);
const { rows: tasks } = await query.fetchByIds("tasks", taskIds);
const { rows: activeTasks } = await query.fetch(
  "tasks",
  "lifecycle_status = ?",
  ["active"],
  "position ASC"
);

// CRUD operations
const taskId = await query.insert("tasks", { name, comment, ... });
const updated = await query.updateById("tasks", taskId, { name: "New Name" });
const deleted = await query.deleteById("tasks", taskId);

// Other operations
const count = await query.count("tasks");
const activeCount = await query.count("tasks", "lifecycle_status = 'active'");
```

### Validation (`validation-helper.ts`)

Schema-based request validation:

```typescript
const validated = validateBody(req.body, {
  name: {
    type: "string",
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  priority: {
    type: "number",
    required: false,
    validate: (val) => val >= 0 && val <= 10,
  },
  status: {
    type: "string",
    required: true,
    enum: ["active", "archived"],
  },
  tags: {
    type: "string[]",
    required: false,
  },
});

if (!validated) {
  return sendValidationError(res, errors);
}

// Standardized responses
sendSuccess(res, data, 200);
sendError(res, 400, "Bad Request");
sendSuccess(res, createdItem, 201);

// Pagination
const { page = 1, limit = 10 } = req.query;
const { offset, limit: pageLimit } = getPaginationParams({ page, limit });
const total = await query.count("tasks");
const response = buildPaginatedResponse(rows, total, page, pageLimit);
```

### Model Mappers (`models.ts`)

Convert database rows to domain models:

```typescript
const task = mapTaskRow(row);
const tag = mapTagRow(row);
const session = mapSessionRow(row);
const timer = mapActiveTimerRow(row);
```

## Common Patterns

### Paginated List Endpoint

```typescript
import {
  createRequestHandler,
  createUserQueryHelper,
  getQueryParams,
  getPaginationParams,
  buildPaginatedResponse,
  mapTaskRow,
  sendSuccess,
} from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    if (req.method === "GET") {
      const params = getQueryParams(req, { page: "number", limit: "number" });
      const { offset, limit } = getPaginationParams(params as any);

      const query = createUserQueryHelper(userId);
      const { rows } = await query.fetchAll("tasks", "position ASC");
      const total = await query.count("tasks");

      const paginatedRows = rows.slice(offset, offset + limit);
      const response = buildPaginatedResponse(
        paginatedRows.map(mapTaskRow),
        total,
        params?.page as number,
        limit,
      );

      return sendSuccess(res, response);
    }
  },
  { allowedMethods: ["GET"] },
);
```

### Update with Validation

```typescript
import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapTaskRow,
} from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    const { id } = req.query;

    if (req.method === "PATCH") {
      const validated = validateBody(req.body, {
        name: { type: "string", required: false, minLength: 1 },
        comment: { type: "string", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request" },
        ]);
      }

      const query = createUserQueryHelper(userId);
      const updated = await query.updateById("tasks", id as string, validated);

      if (!updated) {
        return sendError(res, 404, "Task not found");
      }

      const task = await query.fetchById("tasks", id as string);
      return sendSuccess(res, mapTaskRow(task));
    }
  },
  { allowedMethods: ["PATCH"] },
);
```

## Best Practices

1. **Always use `createRequestHandler`** for new endpoints - it handles auth, methods, and CORS
2. **Use `createUserQueryHelper`** for database operations - automates user_id filtering
3. **Validate input** using `validateBody` - schema-based validation prevents errors
4. **Use standardized responses** - `sendSuccess`, `sendError`, `sendValidationError`
5. **Map database rows** - always use map functions to convert database rows to domain models
6. **Handle errors gracefully** - the request handler catches exceptions and sends 500

## Backward Compatibility

Old-style routes using direct db and http utilities still work. New routes should prefer:

- `createRequestHandler` over manual auth/method handling
- `createUserQueryHelper` over raw execute() calls
- `validateBody` over manual parsing
- `sendSuccess` / `sendError` over manual res.json() calls
