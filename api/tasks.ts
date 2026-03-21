import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./lib/db";
import { getAuthenticatedUserId } from "./lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // List all tasks for user, sorted by position
    const tasks = await db.execute(
      "SELECT * FROM tasks WHERE user_id = ? ORDER BY position ASC",
      [userId],
    );

    const formattedTasks = tasks.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      comment: row.comment,
      total_time_seconds: row.total_time_seconds,
      position: row.position,
      tag_ids: JSON.parse(row.tag_ids || "[]"),
      lifecycle_status: row.lifecycle_status,
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.status(200).json(formattedTasks);
  }

  if (req.method === "POST") {
    // Create new task
    const { name, comment, tag_ids } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Missing or invalid name" });
    }

    // Get max position for user
    const maxPosResult = await db.execute(
      "SELECT MAX(position) as max_pos FROM tasks WHERE user_id = ?",
      [userId],
    );
    const maxPosition = (maxPosResult.rows[0]?.max_pos as number) || 0;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO tasks (id, user_id, name, comment, total_time_seconds, position, tag_ids, lifecycle_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, 'active', ?, ?)`,
      [
        id,
        userId,
        name,
        comment || null,
        maxPosition + 1,
        JSON.stringify(tag_ids || []),
        now,
        now,
      ],
    );

    const newTask = await db.execute("SELECT * FROM tasks WHERE id = ?", [id]);
    const row = newTask.rows[0] as any;

    return res.status(201).json({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      comment: row.comment,
      total_time_seconds: row.total_time_seconds,
      position: row.position,
      tag_ids: JSON.parse(row.tag_ids || "[]"),
      lifecycle_status: row.lifecycle_status,
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
