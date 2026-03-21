import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../lib/db";
import { getAuthenticatedUserId } from "../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const tagId = req.query.id as string;
  if (!tagId) {
    return res.status(400).json({ error: "Tag ID required" });
  }

  // Verify ownership
  const tagResult = await db.execute(
    "SELECT * FROM tags WHERE id = ? AND user_id = ?",
    [tagId, userId],
  );

  if (tagResult.rows.length === 0) {
    return res.status(404).json({ error: "Tag not found" });
  }

  if (req.method === "PUT") {
    // Update tag
    const { name, color } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (color !== undefined) {
      updates.push("color = ?");
      values.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(tagId);

    await db.execute(
      `UPDATE tags SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await db.execute("SELECT * FROM tags WHERE id = ?", [
      tagId,
    ]);
    const row = updated.rows[0] as any;

    return res.status(200).json({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
    });
  }

  if (req.method === "DELETE") {
    // Delete tag (remove from tasks that reference it)
    // Get all tasks that have this tag
    const tasksWithTag = await db.execute(
      "SELECT id, tag_ids FROM tasks WHERE user_id = ?",
      [userId],
    );

    for (const task of tasksWithTag.rows) {
      const tagIds = JSON.parse((task as any).tag_ids || "[]");
      const filtered = tagIds.filter((id: string) => id !== tagId);
      await db.execute("UPDATE tasks SET tag_ids = ? WHERE id = ?", [
        JSON.stringify(filtered),
        (task as any).id,
      ]);
    }

    // Delete the tag
    await db.execute("DELETE FROM tags WHERE id = ?", [tagId]);

    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
