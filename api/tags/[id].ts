import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapTagRow,
} from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    const tagId = Array.isArray(req.query.id)
      ? req.query.id[0]
      : (req.query.id as string | undefined);

    if (!tagId) {
      return sendError(res, 400, "Tag ID required");
    }

    const query = createUserQueryHelper(userId);
    const tag = await query.fetchById("tags", tagId);

    if (!tag) {
      return sendError(res, 404, "Tag not found");
    }

    if (req.method === "PUT") {
      const validated = validateBody(req.body, {
        name: { type: "string", required: false, minLength: 1 },
        color: { type: "string", required: false, minLength: 1 },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const updates: Record<string, unknown> = {};
      if (validated.name !== undefined) updates.name = validated.name;
      if (validated.color !== undefined) updates.color = validated.color;

      if (Object.keys(updates).length === 0) {
        return sendError(res, 400, "No fields to update");
      }

      await query.updateById("tags", tagId, updates);
      const updated = await query.fetchById("tags", tagId);
      return sendSuccess(res, mapTagRow(updated));
    }

    if (req.method === "DELETE") {
      await query.deleteById("tags", tagId);
      return res.status(204).end();
    }
  },
  { allowedMethods: ["PUT", "DELETE"] },
);
  }

  if (req.method === "DELETE") {
    const tasksWithTag = await db.execute(
      "SELECT id, tag_ids FROM tasks WHERE user_id = ?",
      [userId],
    );

    for (const task of tasksWithTag.rows) {
      const tagIds = (() => {
        try {
          const parsed = JSON.parse(
            String((task as Record<string, unknown>).tag_ids ?? "[]"),
          );
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();
      const filtered = tagIds.filter((id: string) => id !== tagId);
      await db.execute(
        "UPDATE tasks SET tag_ids = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        [
          JSON.stringify(filtered),
          new Date().toISOString(),
          (task as Record<string, unknown>).id,
          userId,
        ],
      );
    }

    await db.execute("DELETE FROM tags WHERE id = ? AND user_id = ?", [
      tagId,
      userId,
    ]);

    return res.status(204).end();
  }

  return sendMethodNotAllowed(res, ["PUT", "DELETE", "OPTIONS"]);
}
