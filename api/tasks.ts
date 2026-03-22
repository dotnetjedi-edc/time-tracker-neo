import {
  createRequestHandler,
  createUserQueryHelper,
  validateBody,
  sendValidationError,
  sendError,
  sendSuccess,
  mapTaskRow,
} from "./lib";

const hasOnlyOwnedTags = async (
  query: ReturnType<typeof createUserQueryHelper>,
  tagIds: string[],
): Promise<boolean> => {
  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length === 0) {
    return true;
  }

  const { rows } = await query.fetchByIds("tags", uniqueTagIds);
  return rows.length === uniqueTagIds.length;
};

export default createRequestHandler(
  async (req, res, userId) => {
    const query = createUserQueryHelper(userId);

    if (req.method === "GET") {
      const { rows } = await query.fetchAll("tasks", "position ASC");
      return sendSuccess(res, rows.map(mapTaskRow));
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

      const tagIds = (validated.tag_ids as string[] | undefined) ?? [];
      if (!(await hasOnlyOwnedTags(query, tagIds))) {
        return sendValidationError(res, [
          {
            field: "tag_ids",
            message: "One or more tags do not belong to the authenticated user",
          },
        ]);
      }

      const maxPos = await query.count("tasks");
      const taskId = await query.insert("tasks", {
        name: validated.name,
        comment: validated.comment ?? null,
        tag_ids: JSON.stringify(tagIds),
        total_time_seconds: 0,
        position: maxPos,
        lifecycle_status: "active",
      });

      const task = await query.fetchById("tasks", taskId);
      if (!task) {
        return sendError(res, 500, "Failed to create task");
      }

      return sendSuccess(res, mapTaskRow(task), 201);
    }
  },
  { allowedMethods: ["GET", "POST"] },
);
