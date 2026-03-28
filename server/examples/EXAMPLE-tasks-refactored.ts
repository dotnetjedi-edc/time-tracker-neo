import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendSuccess,
  sendError,
  mapTaskRow,
} from "../lib/index.js";

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      const { rows: tasks } = await query.fetchAll("tasks", "position ASC");
      return sendSuccess(res, tasks.map(mapTaskRow));
    }

    if (req.method === "POST") {
      const validated = validateBody(req.body, {
        name: { type: "string", required: true, minLength: 1 },
        comment: { type: "string", required: false },
        tag_ids: { type: "string[]", required: false },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const id = await query.insert("tasks", {
        name: validated.name,
        comment: validated.comment ?? null,
        tag_ids: JSON.stringify(validated.tag_ids ?? []),
        total_time_seconds: 0,
        position: await query.count("tasks"),
        lifecycle_status: "active",
      });

      const task = await query.fetchById("tasks", id);
      if (!task) {
        return sendError(res, 500, "Failed to create task");
      }

      return sendSuccess(res, mapTaskRow(task), 201);
    }
  },
  { allowedMethods: ["GET", "POST"] },
);