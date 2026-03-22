import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapSessionRow,
} from "../lib";

export default createRequestHandler(
  async (req, res, userId) => {
    const sessionId = Array.isArray(req.query.id)
      ? req.query.id[0]
      : (req.query.id as string | undefined);

    if (!sessionId) {
      return sendError(res, 400, "Session ID required");
    }

    const query = createUserQueryHelper(userId);
    const session = await query.fetchById("sessions", sessionId);

    if (!session) {
      return sendError(res, 404, "Session not found");
    }

    if (req.method === "PUT") {
      const validated = validateBody(req.body, {
        started_at: { type: "string", required: false, minLength: 1 },
        ended_at: { type: "string", required: false },
        date: { type: "string", required: false, minLength: 1 },
        segments: { type: "object", required: false },
        audit_events: { type: "object", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const updates: Record<string, unknown> = {};
      if (validated.started_at !== undefined)
        updates.started_at = validated.started_at;
      if (validated.ended_at !== undefined) updates.ended_at = validated.ended_at;
      if (validated.date !== undefined) updates.date = validated.date;
      if (validated.segments !== undefined)
        updates.segments = JSON.stringify(validated.segments);
      if (validated.audit_events !== undefined)
        updates.audit_events = JSON.stringify(validated.audit_events);

      if (Object.keys(updates).length === 0) {
        return sendError(res, 400, "No fields to update");
      }

      await query.updateById("sessions", sessionId, updates);
      const updated = await query.fetchById("sessions", sessionId);
      return sendSuccess(res, mapSessionRow(updated));
    }

    if (req.method === "DELETE") {
      await query.deleteById("sessions", sessionId);
      return res.status(204).end();
    }
  },
  { allowedMethods: ["PUT", "DELETE"] },
);
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(sessionId, userId);

    await db.execute(
      `UPDATE sessions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      values,
    );

    const updated = await db.execute("SELECT * FROM sessions WHERE id = ?", [
      sessionId,
    ]);
    return res.status(200).json(mapSessionRow(updated.rows[0] as never));
  }

  if (req.method === "DELETE") {
    await db.execute(
      "DELETE FROM active_timers WHERE user_id = ? AND session_id = ?",
      [userId, sessionId],
    );
    await db.execute("DELETE FROM sessions WHERE id = ? AND user_id = ?", [
      sessionId,
      userId,
    ]);
    return res.status(204).end();
  }

  return sendMethodNotAllowed(res, ["PUT", "DELETE", "OPTIONS"]);
}
