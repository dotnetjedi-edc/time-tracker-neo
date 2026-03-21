import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./lib/db";
import { getAuthenticatedUserId } from "./lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    // List all tags for user
    const tags = await db.execute(
      "SELECT * FROM tags WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );

    const formattedTags = tags.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
    }));

    return res.status(200).json(formattedTags);
  }

  if (req.method === "POST") {
    // Create new tag
    const { name, color } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Missing or invalid name" });
    }
    if (!color || typeof color !== "string") {
      return res.status(400).json({ error: "Missing or invalid color" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO tags (id, user_id, name, color, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, name, color, now],
    );

    const newTag = await db.execute("SELECT * FROM tags WHERE id = ?", [id]);
    const row = newTag.rows[0] as any;

    return res.status(201).json({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
