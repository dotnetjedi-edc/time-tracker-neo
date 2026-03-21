import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./lib/db";
import { getAuthenticatedUserId } from "./lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // List sessions, optionally filtered by taskId
    const taskId = req.query.taskId as string | undefined;

    let query = "SELECT * FROM sessions WHERE user_id = ?";
    let params: any[] = [userId];

    if (taskId) {
      query += " AND task_id = ?";
      params.push(taskId);
    }

    query += " ORDER BY created_at DESC";

    const result = await db.execute(query, params);

    const formattedSessions = result.rows.map((row: any) => ({
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
    }));

    return res.status(200).json(formattedSessions);
  }

  if (req.method === "POST") {
    // Create new session
    const {
      task_id,
      origin,
      started_at,
      ended_at,
      date,
      segments,
      audit_events,
    } = req.body;

    if (!task_id || !origin || !started_at || !date) {
      return res.status(400).json({
        error: "Missing required fields: task_id, origin, started_at, date",
      });
    }

    // Verify task belongs to user
    const taskCheck = await db.execute(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      [task_id, userId],
    );

    if (taskCheck.rows.length === 0) {
      return res.status(403).json({ error: "Task not found or access denied" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO sessions (id, user_id, task_id, origin, started_at, ended_at, date, segments, audit_events, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        task_id,
        origin,
        started_at,
        ended_at || null,
        date,
        JSON.stringify(segments || []),
        JSON.stringify(audit_events || []),
        now,
        now,
      ],
    );

    const newSession = await db.execute("SELECT * FROM sessions WHERE id = ?", [
      id,
    ]);
    const row = newSession.rows[0] as any;

    return res.status(201).json({
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

  return res.status(405).json({ error: "Method not allowed" });
}
