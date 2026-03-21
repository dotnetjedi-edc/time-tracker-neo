import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./lib/db";
import { getAuthenticatedUserId } from "./lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // Get active timer for user (if exists)
    const result = await db.execute(
      "SELECT * FROM active_timers WHERE user_id = ?",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(200).json(null);
    }

    const row = result.rows[0] as any;
    return res.status(200).json({
      task_id: row.task_id,
      session_id: row.session_id,
      segment_start_time: row.segment_start_time,
      updated_at: row.updated_at,
    });
  }

  if (req.method === "PUT") {
    // Create or update active timer
    const { task_id, session_id, segment_start_time } = req.body;

    if (!task_id || !session_id || !segment_start_time) {
      return res.status(400).json({
        error:
          "Missing required fields: task_id, session_id, segment_start_time",
      });
    }

    const now = new Date().toISOString();

    // Delete existing timer for this user, then insert new one
    await db.execute("DELETE FROM active_timers WHERE user_id = ?", [userId]);
    await db.execute(
      `INSERT INTO active_timers (user_id, task_id, session_id, segment_start_time, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, task_id, session_id, segment_start_time, now],
    );

    return res.status(200).json({
      task_id,
      session_id,
      segment_start_time,
      updated_at: now,
    });
  }

  if (req.method === "DELETE") {
    // Delete active timer
    await db.execute("DELETE FROM active_timers WHERE user_id = ?", [userId]);
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
