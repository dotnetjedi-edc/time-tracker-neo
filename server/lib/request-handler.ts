import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateApiRequest } from "./auth.js";

export type RequestHandler = (
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
) => Promise<unknown> | unknown;

export interface HandlerOptions {
  allowedMethods: string[];
  includeOptions?: boolean;
  requiresAuth?: boolean;
}

export const createRequestHandler =
  (handler: RequestHandler, options: HandlerOptions) =>
  async (req: VercelRequest, res: VercelResponse) => {
    const {
      allowedMethods,
      includeOptions = true,
      requiresAuth = true,
    } = options;

    if (includeOptions && req.method === "OPTIONS") {
      res.setHeader("Allow", [...allowedMethods, "OPTIONS"].join(", "));
      return res.status(204).end();
    }

    if (!allowedMethods.includes(req.method ?? "")) {
      res.setHeader("Allow", [...allowedMethods, "OPTIONS"].join(", "));
      return res.status(405).json({ error: "Method not allowed" });
    }

    let userId: string | null = null;
    if (requiresAuth) {
      const authResult = await authenticateApiRequest(req);
      userId = authResult.userId;
      if (!userId) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("API authentication failed", {
            method: req.method,
            url: req.url,
            hasBearerToken: authResult.hasBearerToken,
            reason: authResult.reason,
            message: authResult.message,
          });

          return res.status(401).json({
            error: "Unauthorized",
            authReason: authResult.reason,
            authMessage: authResult.message,
            hasBearerToken: authResult.hasBearerToken,
          });
        }

        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    try {
      await handler(req, res, userId!);
    } catch (err) {
      console.error("Request handler error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };

export interface QueryParamsSpec {
  [key: string]: "string" | "string[]" | "number";
}

export const getQueryParams = <T extends QueryParamsSpec>(
  req: VercelRequest,
  spec: T,
): Partial<Record<keyof T, string | string[] | number>> | null => {
  const result: Record<string, string | string[] | number> = {};

  for (const [key, type] of Object.entries(spec)) {
    const value = req.query[key];

    if (type === "string") {
      result[key] = Array.isArray(value) ? value[0] || "" : (value as string);
    } else if (type === "string[]") {
      result[key] = Array.isArray(value) ? value : value ? [value] : [];
    } else if (type === "number") {
      const num = Array.isArray(value)
        ? Number(value[0])
        : Number(value || "NaN");
      if (!Number.isFinite(num)) {
        return null;
      }
      result[key] = num;
    }
  }

  return result as Partial<Record<keyof T, string | string[] | number>>;
};