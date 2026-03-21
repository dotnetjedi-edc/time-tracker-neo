import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db";
import { getAuthenticatedUserId } from "../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sessionId = req.query.id as string;
  if (!sessionId) {
    return res.status(400).json({ error: "Session ID required" });
  }

  // Verify ownership
  const sessionResult = await db.execute(
    "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );

  if (sessionResult.rows.length === 0) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (req.method === "PUT") {
    // Update session
    const { started_at, ended_at, segments, audit_events } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (started_at !== undefined) {
      updates.push("started_at = ?");
      values.push(started_at);
    }
    if (ended_at !== undefined) {
      updates.push("ended_at = ?");
      values.push(ended_at);
    }
    if (segments !== undefined) {
      updates.push("segments = ?");
      values.push(JSON.stringify(segments));
    }
    if (audit_events !== undefined) {
      updates.push("audit_events = ?");
      values.push(JSON.stringify(audit_events));
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(sessionId);

    if (updates.length > 1) {
      await db.execute(
        `UPDATE sessions SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
    }

    const updated = await db.execute("SELECT * FROM sessions WHERE id = ?", [
      sessionId,
    ]);
    const row = updated.rows[0] as any;

    return res.status(200).json({
      id: row.id,
      user_id: row.user_id,
      task_id: row.task_id,
      origin: row.origin,
      started_at: row.started_at,
      ended_at: row.ended_at,
      date: row.date,
      segments: JSON.parse(row.segments || "[]"),
      audit_events: JSON.parse(row.audit_events || "[]"),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  if (req.method === "DELETE") {
    // Delete session
    await db.execute("DELETE FROM sessions WHERE id = ?", [sessionId]);
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
