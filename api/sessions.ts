import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapSessionRow,
} from "./lib/index.js";

const isSessionOrigin = (value: unknown): value is "timer" | "manual" =>
  value === "timer" || value === "manual";

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      const taskId = Array.isArray(req.query.taskId)
        ? req.query.taskId[0]
        : (req.query.taskId as string | undefined);

      if (taskId) {
        // Verify task exists
        const task = await query.fetchById("tasks", taskId);
        if (!task) {
          return sendError(res, 404, "Task not found");
        }

        const { rows } = await query.fetch(
          "sessions",
          "task_id = ?",
          [taskId],
          "started_at DESC",
        );
        return sendSuccess(res, rows.map(mapSessionRow));
      }

      const { rows } = await query.fetchAll(
        "sessions",
        "started_at DESC, created_at DESC",
      );
      return sendSuccess(res, rows.map(mapSessionRow));
    }

    if (req.method === "POST") {
      const validated = validateBody(req.body, {
        task_id: { type: "string", required: true },
        origin: {
          type: "string",
          required: true,
          validate: isSessionOrigin,
        },
        started_at: { type: "string", required: true },
        ended_at: { type: "string", required: false },
        date: { type: "string", required: true },
        segments: { type: "array", required: false },
        audit_events: { type: "array", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      // Verify task exists
      const task = await query.fetchById("tasks", validated.task_id as string);
      if (!task) {
        return sendError(res, 404, "Task not found");
      }

      if (
        typeof validated.ended_at === "string" &&
        validated.ended_at < validated.started_at
      ) {
        return sendValidationError(res, [
          {
            field: "ended_at",
            message: "ended_at must be greater than or equal to started_at",
          },
        ]);
      }

      const sessionId = await query.insert("sessions", {
        task_id: validated.task_id,
        origin: validated.origin,
        started_at: validated.started_at,
        ended_at: validated.ended_at ?? null,
        date: validated.date,
        segments: JSON.stringify(validated.segments ?? []),
        audit_events: JSON.stringify(validated.audit_events ?? []),
      });

      const session = await query.fetchById("sessions", sessionId);
      if (!session) {
        return sendError(res, 500, "Failed to create session");
      }

      return sendSuccess(res, mapSessionRow(session), 201);
    }
  },
  { allowedMethods: ["GET", "POST"] },
);
