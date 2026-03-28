import { getDb } from "../lib/db";
import { createRequestHandler } from "../lib/request-handler";

const isE2EBypassEnabled = process.env.E2E_BYPASS_AUTH === "true";
const e2eUserId = process.env.E2E_BYPASS_USER_ID ?? "e2e-user";

export default createRequestHandler(
  async (_req, res) => {
    if (!isE2EBypassEnabled) {
      return res.status(404).json({ error: "Not found" });
    }

    const db = getDb();

    await db.execute("DELETE FROM active_timers WHERE user_id = ?", [
      e2eUserId,
    ]);
    await db.execute("DELETE FROM sessions WHERE user_id = ?", [e2eUserId]);
    await db.execute("DELETE FROM tasks WHERE user_id = ?", [e2eUserId]);
    await db.execute("DELETE FROM tags WHERE user_id = ?", [e2eUserId]);

    return res.status(204).end();
  },
  {
    allowedMethods: ["POST"],
    requiresAuth: false,
  },
);
