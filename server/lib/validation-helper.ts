import type { VercelResponse } from "@vercel/node";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationSchema {
  [key: string]: {
    type: "string" | "number" | "boolean" | "string[]" | "object" | "array";
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: unknown[];
    validate?: (value: unknown) => boolean;
  };
}

export const validateBody = (
  body: unknown,
  schema: ValidationSchema,
): Record<string, unknown> | null => {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const errors: ValidationError[] = [];
  const validated: Record<string, unknown> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = (body as Record<string, unknown>)[field];

    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push({ field, message: "Field is required" });
      continue;
    }

    if (!rules.required && (value === undefined || value === null)) {
      validated[field] = value;
      continue;
    }

    let isValid = false;
    switch (rules.type) {
      case "string":
        isValid = typeof value === "string";
        if (
          isValid &&
          rules.minLength &&
          typeof value === "string" &&
          value.length < rules.minLength
        ) {
          errors.push({
            field,
            message: `Must be at least ${rules.minLength} characters`,
          });
          isValid = false;
        }
        if (
          isValid &&
          rules.maxLength &&
          typeof value === "string" &&
          value.length > rules.maxLength
        ) {
          errors.push({
            field,
            message: `Must be at most ${rules.maxLength} characters`,
          });
          isValid = false;
        }
        if (isValid && rules.pattern && !rules.pattern.test(value as string)) {
          errors.push({
            field,
            message: "Invalid format",
          });
          isValid = false;
        }
        break;

      case "number":
        isValid = typeof value === "number" && Number.isFinite(value);
        break;

      case "boolean":
        isValid = typeof value === "boolean";
        break;

      case "string[]":
        isValid =
          Array.isArray(value) && value.every((v) => typeof v === "string");
        break;

      case "object":
        isValid =
          typeof value === "object" && value !== null && !Array.isArray(value);
        break;

      case "array":
        isValid = Array.isArray(value);
        break;
    }

    if (!isValid) {
      errors.push({
        field,
        message: `Invalid type, expected ${rules.type}`,
      });
      continue;
    }

    if (rules.validate && !rules.validate(value)) {
      errors.push({
        field,
        message: "Validation failed",
      });
      continue;
    }

    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field,
        message: `Must be one of: ${rules.enum.join(", ")}`,
      });
      continue;
    }

    validated[field] = value;
  }

  if (errors.length > 0) {
    console.debug("Validation errors:", errors);
    return null;
  }

  return validated;
};

export const sendValidationError = (
  res: VercelResponse,
  errors: ValidationError[],
) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(400).json({
    error: "Validation failed",
    details: errors,
  });
};

export const sendError = (
  res: VercelResponse,
  statusCode: number,
  message: string,
  details?: unknown,
) => {
  res.setHeader("Content-Type", "application/json");
  const payload: { error: string; details?: unknown } = {
    error: message,
  };

  if (details !== undefined) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};

export const sendSuccess = <T>(
  res: VercelResponse,
  data: T,
  statusCode = 200,
) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(statusCode).json(data);
};

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const getPaginationParams = (
  params?: PaginationParams,
): { offset: number; limit: number } => {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.min(100, Math.max(1, params?.limit ?? 10));
  const offset = (page - 1) * limit;

  return { offset, limit };
};

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};