export { getBearerToken, getAuthenticatedUserId } from "./auth.js";

export { getDb, readDatabaseConfig, type DatabaseConfig } from "./db.js";

export {
  isRecord,
  parseStringArray,
  parseNullableString,
  parseRequiredString,
  parseOptionalNumber,
  sendMethodNotAllowed,
  sendOptions,
} from "./http.js";

export {
  createRequestHandler,
  getQueryParams,
  type RequestHandler,
  type HandlerOptions,
  type QueryParamsSpec,
} from "./request-handler.js";

export {
  createUserQueryHelper,
  UserQueryHelper,
  type QueryResult,
} from "./query-helper.js";

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

export {
  mapTaskRow,
  mapTagRow,
  mapSessionRow,
  mapActiveTimerRow,
} from "./models.js";