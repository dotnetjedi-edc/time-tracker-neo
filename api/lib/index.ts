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
export { getBearerToken, getAuthenticatedUserId } from "./auth";

// Database module
export { getDb, readDatabaseConfig, type DatabaseConfig } from "./db";

// HTTP utilities
export {
  isRecord,
  parseStringArray,
  parseNullableString,
  parseRequiredString,
  parseOptionalNumber,
  sendMethodNotAllowed,
  sendOptions,
} from "./http";

// Request handler (newer, more flexible approach)
export {
  createRequestHandler,
  getQueryParams,
  type RequestHandler,
  type HandlerOptions,
  type QueryParamsSpec,
} from "./request-handler";

// Query helper (user-scoped database operations)
export {
  createUserQueryHelper,
  UserQueryHelper,
  type QueryResult,
} from "./query-helper";

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
} from "./validation-helper";

// Model mappers
export {
  mapTaskRow,
  mapTagRow,
  mapSessionRow,
  mapActiveTimerRow,
} from "./models";
