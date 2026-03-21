import { createClerkClient } from "@clerk/backend";
import type { VercelRequest } from "@vercel/node";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Validates the Bearer token from the Authorization header and returns the
 * authenticated Clerk userId. Returns null if the token is missing or invalid.
 */
export async function getAuthenticatedUserId(
  req: VercelRequest,
): Promise<string | null> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    const payload = await clerkClient.verifyToken(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
