/**
 * API Library - Shared helpers and utilities
 *
 * This module provides a comprehensive set of utilities for building Vercel serverless functions:
 * - Authentication (Clerk token verification, user ID extraction)
 * - HTTP utilities (response helpers, input parsing, CORS support)
 * - Database management (Turso/libSQL client pooling)
 * - Query helpers (user-scoped database operations)
 * - Validation (schema-based request validation)
 * - Request handlers (middleware-style request handling with auth)
 * - Model mapping (database row to domain model conversion)
 */

// Auth module
export { getBearerToken, getAuthenticatedUserId } from "./auth.js";

// Database module
export { getDb, readDatabaseConfig, type DatabaseConfig } from "./db.js";

// HTTP utilities
export {
  isRecord,
  parseStringArray,
  parseNullableString,
  parseRequiredString,
  parseOptionalNumber,
  sendMethodNotAllowed,
  sendOptions,
} from "./http.js";

// Request handler (newer, more flexible approach)
export {
  createRequestHandler,
  getQueryParams,
  type RequestHandler,
  type HandlerOptions,
  type QueryParamsSpec,
} from "./request-handler.js";

// Query helper (user-scoped database operations)
export {
  createUserQueryHelper,
  UserQueryHelper,
  type QueryResult,
} from "./query-helper.js";

// Validation helpers
export {
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  getPaginationParams,
  buildPaginatedResponse,
  type ValidationSchema,
  type ValidationError,
  type PaginationParams,
  type PaginatedResponse,
} from "./validation-helper.js";

// Model mappers
export {
  mapTaskRow,
  mapTagRow,
  mapSessionRow,
  mapActiveTimerRow,
} from "./models.js";
