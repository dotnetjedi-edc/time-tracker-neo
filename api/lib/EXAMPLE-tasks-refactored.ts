/**
 * EXAMPLE: Refactored API route using shared helpers
 *
 * This shows how to update existing routes to use the new shared helpers.
 * Compare with api/tasks.ts to see the original implementation.
 *
 * Key improvements:
 * - Automatic request validation and auth handling
 * - User-scoped database queries (no manual user_id passing)
 * - Schema-based input validation
 * - Reduced code duplication
 * - Better error handling
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendSuccess,
  sendError,
  mapTaskRow,
} from "./lib.js";

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      // Fetch all tasks for user
      const { rows } = await query.fetchAll("tasks", "position ASC");
      return sendSuccess(res, rows.map(mapTaskRow));
    }

    if (req.method === "POST") {
      // Validate input
      const validated = validateBody(req.body, {
        name: {
          type: "string",
          required: true,
          minLength: 1,
          maxLength: 255,
        },
        comment: {
          type: "string",
          required: false,
        },
        tag_ids: {
          type: "string[]",
          required: false,
        },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      // Get max position
      const maxPos = await query.count("tasks");

      // Insert new task
      const taskId = await query.insert("tasks", {
        name: validated.name,
        comment: validated.comment ?? null,
        tag_ids: JSON.stringify(validated.tag_ids ?? []),
        total_time_seconds: 0,
        position: maxPos,
        lifecycle_status: "active",
      });

      // Return created task
      const task = await query.fetchById("tasks", taskId);
      if (!task) {
        return sendError(res, 500, "Failed to create task");
      }

      return sendSuccess(res, mapTaskRow(task), 201);
    }

    return sendError(res, 405, "Method not allowed");
  },
  {
    allowedMethods: ["GET", "POST"],
    requiresAuth: true,
  },
);
