import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const queryHelperMock = {
  fetchAll: vi.fn(),
  fetchById: vi.fn(),
  fetchByIds: vi.fn(),
  fetch: vi.fn(),
  insert: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(),
};

vi.mock("../../server/lib/index.js", async () => {
  const actual =
    await vi.importActual<typeof import("../../server/lib/index.js")>("../../server/lib/index.js");

  return {
    ...actual,
    createRequestHandler:
      (handler: (req: unknown, res: unknown, userId: string) => unknown) =>
      async (req: unknown, res: unknown) =>
        handler(req as never, res as never, "user-1"),
    createUserQueryHelper: () => queryHelperMock,
    getDb: () => ({
      execute: executeMock,
    }),
  };
});

import activeTimerHandler from "../../api/active-timer";
import tagsByIdHandler from "../../api/tags/[id]";
import tasksHandler from "../../api/tasks";

const createResponse = () => {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.end.mockReturnValue(response);

  return response;
};

describe("Epic 5 API routes", () => {
  beforeEach(() => {
    executeMock.mockReset();
    queryHelperMock.fetchAll.mockReset();
    queryHelperMock.fetchById.mockReset();
    queryHelperMock.fetchByIds.mockReset();
    queryHelperMock.fetch.mockReset();
    queryHelperMock.insert.mockReset();
    queryHelperMock.updateById.mockReset();
    queryHelperMock.deleteById.mockReset();
    queryHelperMock.count.mockReset();
  });

  it("rejects task creation when one tag is not owned by the authenticated user", async () => {
    const response = createResponse();

    queryHelperMock.fetchByIds.mockResolvedValue({
      rows: [{ id: "tag-1" }],
      count: 1,
      rowsAffected: 0,
    });

    await tasksHandler(
      {
        method: "POST",
        body: {
          name: "Client work",
          tag_ids: ["tag-1", "tag-2"],
        },
        query: {},
      } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "Validation failed",
      details: [
        {
          field: "tag_ids",
          message: "One or more tags do not belong to the authenticated user",
        },
      ],
    });
  });

  it("removes deleted tag ids from every task before deleting the tag", async () => {
    const response = createResponse();

    queryHelperMock.fetchById.mockResolvedValue({ id: "tag-1" });
    queryHelperMock.deleteById.mockResolvedValue(true);
    executeMock
      .mockResolvedValueOnce({
        rows: [
          { id: "task-1", tag_ids: '["tag-1","tag-2"]' },
          { id: "task-2", tag_ids: '["tag-2"]' },
        ],
        rowsAffected: 0,
      })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    await tagsByIdHandler(
      {
        method: "DELETE",
        query: { id: "tag-1" },
      } as never,
      response as never,
    );

    expect(executeMock).toHaveBeenNthCalledWith(
      1,
      "SELECT id, tag_ids FROM tasks WHERE user_id = ?",
      ["user-1"],
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      2,
      "UPDATE tasks SET tag_ids = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      ['["tag-2"]', expect.any(String), "task-1", "user-1"],
    );
    expect(queryHelperMock.deleteById).toHaveBeenCalledWith("tags", "tag-1");
    expect(response.status).toHaveBeenCalledWith(204);
  });

  it("rejects active timers bound to an already ended session", async () => {
    const response = createResponse();

    queryHelperMock.fetchById
      .mockResolvedValueOnce({ id: "task-1" })
      .mockResolvedValueOnce({
        id: "session-1",
        task_id: "task-1",
        started_at: "2026-03-20T09:00:00.000Z",
        ended_at: "2026-03-20T09:15:00.000Z",
      });

    await activeTimerHandler(
      {
        method: "PUT",
        body: {
          task_id: "task-1",
          session_id: "session-1",
          segment_start_time: "2026-03-20T09:10:00.000Z",
        },
        query: {},
      } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "Session already ended",
    });
  });
});
