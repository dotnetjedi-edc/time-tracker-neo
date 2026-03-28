import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapTagRow,
} from "./lib/index.js";

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      const { rows } = await query.fetchAll("tags", "created_at DESC");
      return sendSuccess(res, rows.map(mapTagRow));
    }

    if (req.method === "POST") {
      const validated = validateBody(req.body, {
        name: { type: "string", required: true, minLength: 1 },
        color: { type: "string", required: true, minLength: 1 },
      });

      if (!validated) {
        return sendValidationError(res, [
          { field: "body", message: "Invalid request body" },
        ]);
      }

      const tagId = await query.insert("tags", {
        name: validated.name,
        color: validated.color,
      });

      const tag = await query.fetchById("tags", tagId);
      if (!tag) {
        return sendError(res, 500, "Failed to create tag");
      }

      return sendSuccess(res, mapTagRow(tag), 201);
    }
  },
  { allowedMethods: ["GET", "POST"] },
);
