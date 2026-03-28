import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapSessionRow,
  getDb,
} from "../lib.js";

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
        segments: { type: "array", required: false },
        audit_events: { type: "array", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const updates: Record<string, unknown> = {};
      if (validated.started_at !== undefined)
        updates.started_at = validated.started_at;
      if (validated.ended_at !== undefined)
        updates.ended_at = validated.ended_at;
      if (validated.date !== undefined) updates.date = validated.date;
      if (validated.segments !== undefined)
        updates.segments = JSON.stringify(validated.segments);
      if (validated.audit_events !== undefined)
        updates.audit_events = JSON.stringify(validated.audit_events);

      if (Object.keys(updates).length === 0) {
        return sendError(res, 400, "No fields to update");
      }

      const nextStartedAt =
        (validated.started_at as string | undefined) ??
        String(session.started_at);
      const nextEndedAt =
        validated.ended_at === undefined
          ? session.ended_at === null
            ? null
            : String(session.ended_at)
          : (validated.ended_at as string | null);

      if (typeof nextEndedAt === "string" && nextEndedAt < nextStartedAt) {
        return sendValidationError(res, [
          {
            field: "ended_at",
            message: "ended_at must be greater than or equal to started_at",
          },
        ]);
      }

      await query.updateById("sessions", sessionId, updates);
      const updated = await query.fetchById("sessions", sessionId);
      if (!updated) {
        return sendError(res, 500, "Failed to update session");
      }

      return sendSuccess(res, mapSessionRow(updated));
    }

    if (req.method === "DELETE") {
      const activeTimer = await query.fetch("active_timers", "session_id = ?", [
        sessionId,
      ]);
      if ((activeTimer.rows.length ?? 0) > 0) {
        await getDb().execute(
          "DELETE FROM active_timers WHERE user_id = ? AND session_id = ?",
          [userId, sessionId],
        );
      }

      await query.deleteById("sessions", sessionId);
      return res.status(204).end();
    }
  },
  { allowedMethods: ["PUT", "DELETE"] },
);
