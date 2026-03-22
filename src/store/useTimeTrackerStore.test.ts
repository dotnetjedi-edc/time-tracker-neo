import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimeTrackerApiClient } from "../lib/api";
import type { ActiveTimer, Tag, Task, TaskSession } from "../types";
import {
  migratePersistedState,
  resetTimeTrackerStore,
  setTimeTrackerApiClientForTesting,
  useTimeTrackerStore,
} from "./useTimeTrackerStore";

const clone = <T>(value: T): T => structuredClone(value);

const toNumericId = (value: string): number => {
  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const createTestApiClient = (seed?: {
  tasks?: Task[];
  tags?: Tag[];
  sessions?: TaskSession[];
  activeTimer?: ActiveTimer | null;
}): TimeTrackerApiClient => {
  let tasks = clone(seed?.tasks ?? []);
  let tags = clone(seed?.tags ?? []);
  let sessions = clone(seed?.sessions ?? []);
  let activeTimer = clone(seed?.activeTimer ?? null);
  let nextTaskId =
    Math.max(0, ...tasks.map((task) => toNumericId(task.id))) + 1;
  let nextTagId = Math.max(0, ...tags.map((tag) => toNumericId(tag.id))) + 1;
  let nextSessionId =
    Math.max(0, ...sessions.map((session) => toNumericId(session.id))) + 1;

  return {
    tasks: {
      list: async () => clone(tasks),
      create: async (draft) => {
        const now = new Date().toISOString();
        const task: Task = {
          id: String(nextTaskId++),
          name: draft.name,
          comment: draft.comment || null,
          totalTimeSeconds: 0,
          position: tasks.length,
          tagIds: clone(draft.tagIds),
          lifecycle: {
            status: "active",
            archivedAt: null,
          },
          createdAt: now,
          updatedAt: now,
        };
        tasks = [...tasks, task];
        return clone(task);
      },
      update: async (id, patch) => {
        const existing = tasks.find((task) => task.id === id);
        if (!existing) {
          throw new Error("Task not found");
        }

        const nextTask: Task = {
          ...existing,
          name: patch.name ?? existing.name,
          comment:
            patch.comment === undefined ? existing.comment : patch.comment,
          totalTimeSeconds: patch.totalTimeSeconds ?? existing.totalTimeSeconds,
          position: patch.position ?? existing.position,
          tagIds: patch.tagIds ?? existing.tagIds,
          lifecycle: {
            status:
              patch.lifecycleStatus ?? existing.lifecycle?.status ?? "active",
            archivedAt:
              patch.archivedAt === undefined
                ? (existing.lifecycle?.archivedAt ?? null)
                : patch.archivedAt,
          },
          updatedAt: new Date().toISOString(),
        };

        tasks = tasks.map((task) => (task.id === id ? nextTask : task));
        return clone(nextTask);
      },
      delete: async (id) => {
        tasks = tasks.filter((task) => task.id !== id);
        sessions = sessions.filter((session) => session.taskId !== id);
        if (activeTimer?.taskId === id) {
          activeTimer = null;
        }
      },
    },
    tags: {
      list: async () => clone(tags),
      create: async (input) => {
        const tag: Tag = {
          id: String(nextTagId++),
          name: input.name,
          color: input.color,
          createdAt: new Date().toISOString(),
        };
        tags = [...tags, tag];
        return clone(tag);
      },
      update: async (id, input) => {
        const existing = tags.find((tag) => tag.id === id);
        if (!existing) {
          throw new Error("Tag not found");
        }

        const nextTag: Tag = {
          ...existing,
          name: input.name,
          color: input.color,
        };
        tags = tags.map((tag) => (tag.id === id ? nextTag : tag));
        return clone(nextTag);
      },
      delete: async (id) => {
        tags = tags.filter((tag) => tag.id !== id);
        tasks = tasks.map((task) => ({
          ...task,
          tagIds: task.tagIds.filter((tagId) => tagId !== id),
        }));
      },
    },
    sessions: {
      list: async (taskId) =>
        clone(
          taskId
            ? sessions.filter((session) => session.taskId === taskId)
            : sessions,
        ),
      create: async (input) => {
        const timestamp = input.endedAt ?? input.startedAt;
        const session: TaskSession = {
          id: String(nextSessionId++),
          taskId: input.taskId,
          origin: input.origin,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          date: input.date,
          segments: clone(input.segments),
          auditEvents: clone(input.auditEvents),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        sessions = [...sessions, session];
        return clone(session);
      },
      update: async (id, input) => {
        const existing = sessions.find((session) => session.id === id);
        if (!existing) {
          throw new Error("Session not found");
        }

        const timestamp = input.endedAt ?? existing.updatedAt;
        const nextSession: TaskSession = {
          ...existing,
          startedAt: input.startedAt ?? existing.startedAt,
          endedAt:
            input.endedAt === undefined ? existing.endedAt : input.endedAt,
          date: input.date ?? existing.date,
          segments: input.segments ?? existing.segments,
          auditEvents: input.auditEvents ?? existing.auditEvents,
          updatedAt: timestamp,
        };
        sessions = sessions.map((session) =>
          session.id === id ? nextSession : session,
        );
        return clone(nextSession);
      },
      delete: async (id) => {
        sessions = sessions.filter((session) => session.id !== id);
        if (activeTimer?.sessionId === id) {
          activeTimer = null;
        }
      },
    },
    activeTimer: {
      get: async () => clone(activeTimer),
      set: async (input) => {
        activeTimer = {
          taskId: input.taskId,
          sessionId: input.sessionId,
          segmentStartTime: input.segmentStartTime,
          updatedAt: input.segmentStartTime,
        };
        return clone(activeTimer);
      },
      delete: async () => {
        activeTimer = null;
      },
    },
  };
};

describe("useTimeTrackerStore", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetTimeTrackerStore();
    setTimeTrackerApiClientForTesting(createTestApiClient());
  });

  it("creates, updates and deletes tasks", async () => {
    const store = useTimeTrackerStore.getState();

    await store.addTask({ name: "Focus", comment: "Deep work", tagIds: [] });
    let state = useTimeTrackerStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0]?.name).toBe("Focus");

    await store.updateTask(state.tasks[0]!.id, {
      name: "Focus bloc",
      comment: "Session matin",
      tagIds: [],
    });

    state = useTimeTrackerStore.getState();
    expect(state.tasks[0]?.name).toBe("Focus bloc");
    expect(state.tasks[0]?.comment).toBe("Session matin");

    await store.deleteTask(state.tasks[0]!.id);
    expect(useTimeTrackerStore.getState().tasks).toHaveLength(0);
  });

  it("keeps a single active timer and creates separate sessions when switching tasks", async () => {
    const store = useTimeTrackerStore.getState();
    await store.addTask({ name: "Client", comment: "", tagIds: [] });
    await store.addTask({ name: "Admin", comment: "", tagIds: [] });

    const [clientTask, adminTask] = useTimeTrackerStore.getState().tasks;

    await store.startTimer(clientTask!.id, "2026-03-20T09:00:00.000Z");
    await store.startTimer(adminTask!.id, "2026-03-20T09:30:00.000Z");

    let state = useTimeTrackerStore.getState();
    expect(state.activeTimer?.taskId).toBe(adminTask!.id);
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0]?.segments[0]?.durationSeconds).toBe(1800);
    expect(
      state.tasks.find((task) => task.id === clientTask!.id)?.totalTimeSeconds,
    ).toBe(1800);

    await store.stopTimer("2026-03-20T10:00:00.000Z");

    state = useTimeTrackerStore.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.sessions).toHaveLength(2);
    expect(
      state.tasks.find((task) => task.id === adminTask!.id)?.totalTimeSeconds,
    ).toBe(1800);
  });

  it("merges an immediate stop and restart on the same task into a single session", async () => {
    const store = useTimeTrackerStore.getState();
    await store.addTask({ name: "Focus", comment: "", tagIds: [] });

    const task = useTimeTrackerStore.getState().tasks[0]!;

    await store.startTimer(task.id, "2026-03-20T09:00:00.000Z");
    await store.stopTimer("2026-03-20T09:15:00.000Z");
    await store.startTimer(task.id, "2026-03-20T09:16:00.000Z");
    await store.stopTimer("2026-03-20T09:30:00.000Z");

    const state = useTimeTrackerStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.segments).toHaveLength(2);
    expect(state.tasks[0]?.totalTimeSeconds).toBe(1740);
  });

  it("allows manual time on any task while another timer is active", async () => {
    const store = useTimeTrackerStore.getState();
    await store.addTask({ name: "Client", comment: "", tagIds: [] });
    await store.addTask({ name: "Lecture", comment: "", tagIds: [] });

    const [clientTask, readingTask] = useTimeTrackerStore.getState().tasks;

    await store.startTimer(clientTask!.id, "2026-03-20T09:00:00.000Z");
    await store.addManualSession(readingTask!.id, {
      startTime: "2026-03-19T10:00:00.000Z",
      endTime: "2026-03-19T11:30:00.000Z",
    });

    const state = useTimeTrackerStore.getState();
    expect(state.activeTimer?.taskId).toBe(clientTask!.id);
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[1]?.origin).toBe("manual");
    expect(
      state.tasks.find((task) => task.id === readingTask!.id)?.totalTimeSeconds,
    ).toBe(5400);
  });

  it("removes sessions when deleting a task", async () => {
    const store = useTimeTrackerStore.getState();
    await store.addTask({ name: "Archive", comment: "", tagIds: [] });
    const task = useTimeTrackerStore.getState().tasks[0]!;

    await store.addManualSession(task.id, {
      startTime: "2026-03-20T08:00:00.000Z",
      endTime: "2026-03-20T09:00:00.000Z",
    });

    expect(useTimeTrackerStore.getState().sessions).toHaveLength(1);
    await store.deleteTask(task.id);

    const state = useTimeTrackerStore.getState();
    expect(state.tasks).toHaveLength(0);
    expect(state.sessions).toHaveLength(0);
  });

  it("migrates legacy timeEntries and keeps a recovered timer active", () => {
    const migrated = migratePersistedState({
      tasks: [
        {
          id: "1",
          name: "Focus",
          comment: null,
          totalTimeSeconds: 3600,
          position: 0,
          tagIds: [],
          createdAt: "2026-03-20T08:00:00.000Z",
          updatedAt: "2026-03-20T08:00:00.000Z",
        },
      ],
      tags: [],
      timeEntries: [
        {
          id: "1",
          taskId: "1",
          startTime: "2026-03-20T08:00:00.000Z",
          endTime: "2026-03-20T09:00:00.000Z",
          durationSeconds: 3600,
          date: "2026-03-20",
          createdAt: "2026-03-20T09:00:00.000Z",
        },
      ],
      activeTimer: {
        taskId: "1",
        startTime: "2026-03-20T09:30:00.000Z",
        updatedAt: "2026-03-20T09:30:00.000Z",
      },
      selectedTagIds: [],
      currentView: "grid",
      reportAnchor: "2026-03-20",
    });

    useTimeTrackerStore.setState(migrated);

    const state = useTimeTrackerStore.getState();
    expect(migrated.sessions.length).toBe(2);
    expect(state.tasks[0]?.totalTimeSeconds).toBe(3600);
    expect(state.tasks[0]?.lifecycle).toEqual({
      status: "active",
      archivedAt: null,
    });
    expect(state.activeTimer).toEqual({
      taskId: "1",
      sessionId: "2",
      segmentStartTime: "2026-03-20T09:30:00.000Z",
      updatedAt: "2026-03-20T09:30:00.000Z",
    });
    expect(state.sessions[1]?.endedAt).toBeNull();
    expect(state.sessions[1]?.segments).toHaveLength(0);
  });

  it("stops a recovered timer manually without creating duplicate or zero-length sessions", async () => {
    const migrated = migratePersistedState({
      tasks: [
        {
          id: "1",
          name: "Focus",
          comment: null,
          totalTimeSeconds: 3600,
          position: 0,
          tagIds: [],
          createdAt: "2026-03-20T08:00:00.000Z",
          updatedAt: "2026-03-20T08:00:00.000Z",
        },
      ],
      tags: [],
      timeEntries: [
        {
          id: "1",
          taskId: "1",
          startTime: "2026-03-20T08:00:00.000Z",
          endTime: "2026-03-20T09:00:00.000Z",
          durationSeconds: 3600,
          date: "2026-03-20",
          createdAt: "2026-03-20T09:00:00.000Z",
        },
      ],
      activeTimer: {
        taskId: "1",
        startTime: "2026-03-20T09:30:00.000Z",
        updatedAt: "2026-03-20T09:30:00.000Z",
      },
      selectedTagIds: [],
      currentView: "grid",
      reportAnchor: "2026-03-20",
    });

    useTimeTrackerStore.setState(migrated);
    setTimeTrackerApiClientForTesting(
      createTestApiClient({
        tasks: migrated.tasks,
        tags: migrated.tags,
        sessions: migrated.sessions,
        activeTimer: migrated.activeTimer,
      }),
    );

    await useTimeTrackerStore.getState().stopTimer("2026-03-20T10:00:00.000Z");

    const state = useTimeTrackerStore.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[1]?.endedAt).toBe("2026-03-20T10:00:00.000Z");
    expect(state.sessions[1]?.segments).toHaveLength(1);
    expect(state.sessions[1]?.segments[0]?.durationSeconds).toBe(1800);
    expect(state.tasks[0]?.totalTimeSeconds).toBe(5400);
    expect(
      state.sessions.some(
        (session) => session.endedAt === null && session.segments.length === 0,
      ),
    ).toBe(false);
  });

  it("does not start a timer for an archived task", async () => {
    useTimeTrackerStore.setState({
      ...useTimeTrackerStore.getState(),
      tasks: [
        {
          id: "1",
          name: "Archive",
          comment: null,
          totalTimeSeconds: 0,
          position: 0,
          tagIds: [],
          lifecycle: {
            status: "archived",
            archivedAt: "2026-03-21T10:00:00.000Z",
          },
          createdAt: "2026-03-21T09:00:00.000Z",
          updatedAt: "2026-03-21T10:00:00.000Z",
        },
      ],
    });

    await useTimeTrackerStore
      .getState()
      .startTimer("1", "2026-03-21T10:15:00.000Z");

    const state = useTimeTrackerStore.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.sessions).toHaveLength(0);
  });

  it("reorders tasks and cleans relations when deleting a tag", async () => {
    const store = useTimeTrackerStore.getState();
    await store.addTag("Client", "#ff885b");
    await store.addTag("Admin", "#6ed6b5");

    const [clientTag, adminTag] = useTimeTrackerStore.getState().tags;
    await store.addTask({
      name: "Tâche A",
      comment: "",
      tagIds: [clientTag!.id],
    });
    await store.addTask({
      name: "Tâche B",
      comment: "",
      tagIds: [clientTag!.id, adminTag!.id],
    });

    let state = useTimeTrackerStore.getState();
    const [taskA, taskB] = state.tasks;
    await store.reorderTasks(taskB!.id, taskA!.id);
    store.setSelectedTagIds([adminTag!.id]);
    await store.deleteTag(adminTag!.id);

    state = useTimeTrackerStore.getState();
    expect(state.tasks[0]?.name).toBe("Tâche B");
    expect(state.tasks[0]?.position).toBe(0);
    expect(state.tasks[0]?.tagIds).toEqual([clientTag!.id]);
    expect(state.selectedTagIds).toEqual([]);
  });
});
