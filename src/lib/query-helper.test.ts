import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();

vi.mock("../../server/lib/db.js", () => ({
  getDb: () => ({
    execute: executeMock,
  }),
}));

import { UserQueryHelper } from "../../server/lib/query-helper.js";

describe("UserQueryHelper", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("uses rowsAffected for updates and deletes", async () => {
    const query = new UserQueryHelper("user-1");

    executeMock.mockResolvedValueOnce({ rows: [], rowsAffected: 1 });
    executeMock.mockResolvedValueOnce({ rows: [], rowsAffected: 0 });

    await expect(
      query.updateById("tasks", "task-1", { name: "Updated" }),
    ).resolves.toBe(true);
    await expect(query.deleteById("tasks", "task-1")).resolves.toBe(false);

    expect(executeMock).toHaveBeenNthCalledWith(
      1,
      "UPDATE tasks SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      ["Updated", expect.any(String), "task-1", "user-1"],
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      ["task-1", "user-1"],
    );
  });

  it("parses COUNT results returned as strings", async () => {
    const query = new UserQueryHelper("user-1");

    executeMock.mockResolvedValueOnce({
      rows: [{ count: "3" }],
      rowsAffected: 0,
    });

    await expect(query.count("tasks")).resolves.toBe(3);
  });
});
