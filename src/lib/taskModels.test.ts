import { describe, expect, it } from "vitest";
import {
  createTaskReportSnapshots,
  getTaskLifecycle,
  isTaskTrackable,
  normalizeTask,
} from "./taskModels";
import type { Task, TaskSession } from "../types";

describe("taskModels", () => {
  it("defaults legacy tasks to an active lifecycle boundary", () => {
    const legacyTask: Task = {
      id: "1",
      name: "Focus",
      comment: null,
      totalTimeSeconds: 0,
      position: 0,
      tagIds: [],
      createdAt: "2026-03-21T09:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    };

    expect(getTaskLifecycle(legacyTask)).toEqual({
      status: "active",
      archivedAt: null,
    });
    expect(isTaskTrackable(legacyTask)).toBe(true);
    expect(normalizeTask(legacyTask).lifecycle).toEqual({
      status: "active",
      archivedAt: null,
    });
  });

  it("creates export-ready reporting snapshots from tasks and sessions", () => {
    const tasks: Task[] = [
      {
        id: "2",
        name: "Admin",
        comment: null,
        totalTimeSeconds: 1800,
        position: 1,
        tagIds: [],
        createdAt: "2026-03-21T09:30:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
        lifecycle: {
          status: "archived",
          archivedAt: "2026-03-21T10:30:00.000Z",
        },
      },
      {
        id: "1",
        name: "Focus",
        comment: null,
        totalTimeSeconds: 5400,
        position: 0,
        tagIds: [],
        createdAt: "2026-03-21T09:00:00.000Z",
        updatedAt: "2026-03-21T11:00:00.000Z",
      },
    ];

    const sessions: TaskSession[] = [
      {
        id: "10",
        taskId: "1",
        origin: "timer",
        startedAt: "2026-03-21T09:00:00.000Z",
        endedAt: "2026-03-21T10:00:00.000Z",
        date: "2026-03-21",
        segments: [
          {
            id: 101,
            startTime: "2026-03-21T09:00:00.000Z",
            endTime: "2026-03-21T10:00:00.000Z",
            durationSeconds: 3600,
          },
        ],
        auditEvents: [],
        createdAt: "2026-03-21T09:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      },
      {
        id: "11",
        taskId: "1",
        origin: "manual",
        startedAt: "2026-03-21T10:15:00.000Z",
        endedAt: "2026-03-21T10:45:00.000Z",
        date: "2026-03-21",
        segments: [
          {
            id: 102,
            startTime: "2026-03-21T10:15:00.000Z",
            endTime: "2026-03-21T10:45:00.000Z",
            durationSeconds: 1800,
          },
        ],
        auditEvents: [],
        createdAt: "2026-03-21T10:45:00.000Z",
        updatedAt: "2026-03-21T10:45:00.000Z",
      },
    ];

    const snapshots = createTaskReportSnapshots(tasks, sessions);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toEqual({
      taskId: "1",
      taskName: "Focus",
      lifecycleStatus: "active",
      archivedAt: null,
      totalTrackedSeconds: 5400,
      sessionCount: 2,
      lastTrackedAt: "2026-03-21T10:45:00.000Z",
      sessions: [
        {
          sessionId: "10",
          taskId: "1",
          origin: "timer",
          date: "2026-03-21",
          startedAt: "2026-03-21T09:00:00.000Z",
          endedAt: "2026-03-21T10:00:00.000Z",
          durationSeconds: 3600,
          segmentCount: 1,
        },
        {
          sessionId: "11",
          taskId: "1",
          origin: "manual",
          date: "2026-03-21",
          startedAt: "2026-03-21T10:15:00.000Z",
          endedAt: "2026-03-21T10:45:00.000Z",
          durationSeconds: 1800,
          segmentCount: 1,
        },
      ],
    });
    expect(snapshots[1]?.lifecycleStatus).toBe("archived");
    expect(snapshots[1]?.archivedAt).toBe("2026-03-21T10:30:00.000Z");
    expect(snapshots[1]?.totalTrackedSeconds).toBe(0);
  });
});
