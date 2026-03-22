import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapTaskRow,
  getDb,
} from "../lib";

const isLifecycleStatus = (value: unknown): value is "active" | "archived" =>
  value === "active" || value === "archived";

export default createRequestHandler(
  async (req, res, userId) => {
    const taskId = Array.isArray(req.query.id)
      ? req.query.id[0]
      : (req.query.id as string | undefined);

    if (!taskId) {
      return sendError(res, 400, "Task ID required");
    }

    const query = createUserQueryHelper(userId);
    const task = await query.fetchById("tasks", taskId);

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    if (req.method === "PUT") {
      const validated = validateBody(req.body, {
        name: { type: "string", required: false, minLength: 1 },
        comment: { type: "string", required: false },
        total_time_seconds: {
          type: "number",
          required: false,
          validate: (v) => v >= 0,
        },
        position: {
          type: "number",
          required: false,
          validate: (v) => v >= 0,
        },
        tag_ids: { type: "string[]", required: false },
        lifecycle_status: {
          type: "string",
          required: false,
          enum: ["active", "archived"],
        },
        archived_at: { type: "string", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const updates: Record<string, unknown> = {};
      if (validated.name !== undefined) updates.name = validated.name;
      if (validated.comment !== undefined) updates.comment = validated.comment;
      if (validated.total_time_seconds !== undefined)
        updates.total_time_seconds = validated.total_time_seconds;
      if (validated.position !== undefined) updates.position = validated.position;
      if (validated.tag_ids !== undefined)
        updates.tag_ids = JSON.stringify(validated.tag_ids);
      if (validated.lifecycle_status !== undefined)
        updates.lifecycle_status = validated.lifecycle_status;
      if (validated.archived_at !== undefined)
        updates.archived_at = validated.archived_at;

      if (Object.keys(updates).length === 0) {
        return sendError(res, 400, "No fields to update");
      }

      await query.updateById("tasks", taskId, updates);
      const updated = await query.fetchById("tasks", taskId);
      return sendSuccess(res, mapTaskRow(updated));
    }

    if (req.method === "DELETE") {
      const db = getDb();
      // Clean up active timer if exists
      await db.execute(
        "DELETE FROM active_timers WHERE user_id = ? AND task_id = ?",
        [userId, taskId],
      );
      // Delete task
      await query.deleteById("tasks", taskId);
      return res.status(204).end();
    }
  },
  { allowedMethods: ["PUT", "DELETE"] },
);
  }

  return sendMethodNotAllowed(res, ["PUT", "DELETE", "OPTIONS"]);
}
