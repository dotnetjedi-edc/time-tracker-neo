import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db";
import { getAuthenticatedUserId } from "../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const taskId = req.query.id as string;
  if (!taskId) {
    return res.status(400).json({ error: "Task ID required" });
  }

  // Verify ownership
  const taskResult = await db.execute(
    "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
    [taskId, userId],
  );

  if (taskResult.rows.length === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (req.method === "PUT") {
    // Update task
    const {
      name,
      comment,
      total_time_seconds,
      position,
      tag_ids,
      lifecycle_status,
      archived_at,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (comment !== undefined) {
      updates.push("comment = ?");
      values.push(comment);
    }
    if (total_time_seconds !== undefined) {
      updates.push("total_time_seconds = ?");
      values.push(total_time_seconds);
    }
    if (position !== undefined) {
      updates.push("position = ?");
      values.push(position);
    }
    if (tag_ids !== undefined) {
      updates.push("tag_ids = ?");
      values.push(JSON.stringify(tag_ids));
    }
    if (lifecycle_status !== undefined) {
      updates.push("lifecycle_status = ?");
      values.push(lifecycle_status);
    }
    if (archived_at !== undefined) {
      updates.push("archived_at = ?");
      values.push(archived_at);
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(taskId);

    if (updates.length > 1) {
      await db.execute(
        `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
    }

    const updated = await db.execute("SELECT * FROM tasks WHERE id = ?", [
      taskId,
    ]);
    const row = updated.rows[0] as any;

    return res.status(200).json({
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

  if (req.method === "DELETE") {
    // Delete task and all its sessions
    await db.execute("DELETE FROM sessions WHERE task_id = ?", [taskId]);
    await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);

    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
