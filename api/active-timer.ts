import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapActiveTimerRow,
  getDb,
} from "./lib/index.js";

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      const db = getDb();
      const result = await db.execute(
        "SELECT * FROM active_timers WHERE user_id = ?",
        [userId],
      );

      if (result.rows.length === 0) {
        return sendSuccess(res, null);
      }

      return sendSuccess(res, mapActiveTimerRow(result.rows[0] as never));
    }

    if (req.method === "PUT") {
      const validated = validateBody(req.body, {
        task_id: { type: "string", required: true, minLength: 1 },
        session_id: { type: "string", required: true, minLength: 1 },
        segment_start_time: { type: "string", required: true, minLength: 1 },
      });

      if (!validated) {
        return sendValidationError(res, [
          {
            field: "body",
            message:
              "Invalid request body: missing or invalid task_id, session_id, or segment_start_time",
          },
        ]);
      }

      // Verify task exists
      const task = await query.fetchById("tasks", validated.task_id as string);
      if (!task) {
        return sendError(res, 404, "Task not found");
      }

      // Verify session exists and belongs to task
      const session = await query.fetchById(
        "sessions",
        validated.session_id as string,
      );
      if (!session) {
        return sendError(res, 404, "Session not found");
      }

      if (String(session.task_id) !== validated.task_id) {
        return sendError(res, 400, "session_id must belong to task_id");
      }

      if (session.ended_at !== null) {
        return sendError(res, 400, "Session already ended");
      }

      if (String(session.started_at) > String(validated.segment_start_time)) {
        return sendError(
          res,
          400,
          "segment_start_time must be greater than or equal to session.started_at",
        );
      }

      const db = getDb();
      const now = new Date().toISOString();

      // Replace existing timer
      await db.execute("DELETE FROM active_timers WHERE user_id = ?", [userId]);
      await db.execute(
        `INSERT INTO active_timers (user_id, task_id, session_id, segment_start_time, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          validated.task_id as string,
          validated.session_id as string,
          validated.segment_start_time as string,
          now,
        ],
      );

      return sendSuccess(
        res,
        {
          task_id: validated.task_id,
          session_id: validated.session_id,
          segment_start_time: validated.segment_start_time,
          updated_at: now,
        },
        200,
      );
    }

    if (req.method === "DELETE") {
      const db = getDb();
      await db.execute("DELETE FROM active_timers WHERE user_id = ?", [userId]);
      return res.status(204).end();
    }
  },
  { allowedMethods: ["GET", "PUT", "DELETE"] },
);
