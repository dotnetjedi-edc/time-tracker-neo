import { createClerkClient } from "@clerk/backend";
import type { VercelRequest } from "@vercel/node";

const BEARER_PREFIX = /^Bearer\s+(.+)$/i;

export interface AuthenticationResult {
  userId: string | null;
  hasBearerToken: boolean;
  reason: string | null;
  message: string | null;
}

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

const bypassAuthForE2E = process.env.E2E_BYPASS_AUTH === "true";
const bypassUserId = process.env.E2E_BYPASS_USER_ID ?? "e2e-user";

const toWebRequest = (req: VercelRequest): Request => {
  const protocolHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
  const protocol =
    typeof protocolHeader === "string" && protocolHeader.length > 0
      ? protocolHeader
      : "http";
  const host =
    typeof hostHeader === "string" && hostHeader.length > 0
      ? hostHeader
      : "localhost";
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  return new Request(url, {
    method: req.method ?? "GET",
    headers,
  });
};

const getAuthorizationHeader = (req: VercelRequest): string | null => {
  const header = req.headers.authorization;

  if (Array.isArray(header)) {
    return header[0] ?? null;
  }

  return typeof header === "string" ? header : null;
};

const getClerkClient = () => {
  if (clerkClient) {
    return clerkClient;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY environment variable is required for protected API routes.",
    );
  }

  clerkClient = createClerkClient({
    secretKey,
    ...(publishableKey ? { publishableKey } : {}),
  });
  return clerkClient;
};

export const getBearerToken = (req: VercelRequest): string | null => {
  const authHeader = getAuthorizationHeader(req);
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(BEARER_PREFIX);
  if (!match) {
    return null;
  }

  const token = match[1]?.trim();
  return token ? token : null;
};

export async function authenticateApiRequest(
  req: VercelRequest,
): Promise<AuthenticationResult> {
  if (bypassAuthForE2E) {
    return {
      userId: bypassUserId,
      hasBearerToken: getBearerToken(req) !== null,
      reason: null,
      message: null,
    };
  }

  const hasBearerToken = getBearerToken(req) !== null;

  try {
    const requestState = await getClerkClient().authenticateRequest(
      toWebRequest(req),
      {
        acceptsToken: "session_token",
      },
    );

    if (!requestState.isAuthenticated) {
      return {
        userId: null,
        hasBearerToken,
        reason: requestState.reason,
        message: requestState.message,
      };
    }

    return {
      userId: requestState.toAuth().userId ?? null,
      hasBearerToken,
      reason: null,
      message: null,
    };
  } catch (error) {
    return {
      userId: null,
      hasBearerToken,
      reason: "unexpected-error",
      message: error instanceof Error ? error.message : "Unknown auth error",
    };
  }
}

export async function getAuthenticatedUserId(
  req: VercelRequest,
): Promise<string | null> {
  if (bypassAuthForE2E) {
    return bypassUserId;
  }

  const result = await authenticateApiRequest(req);
  return result.userId;
}
