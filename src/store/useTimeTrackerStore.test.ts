import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  migratePersistedState,
  resetTimeTrackerStore,
  useTimeTrackerStore,
} from "./useTimeTrackerStore";

describe("useTimeTrackerStore", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetTimeTrackerStore();
  });

  it("creates, updates and deletes tasks", () => {
    const store = useTimeTrackerStore.getState();

    store.addTask({ name: "Focus", comment: "Deep work", tagIds: [] });
    let state = useTimeTrackerStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0]?.name).toBe("Focus");

    store.updateTask(state.tasks[0]!.id, {
      name: "Focus bloc",
      comment: "Session matin",
      tagIds: [],
    });

    state = useTimeTrackerStore.getState();
    expect(state.tasks[0]?.name).toBe("Focus bloc");
    expect(state.tasks[0]?.comment).toBe("Session matin");

    store.deleteTask(state.tasks[0]!.id);
    expect(useTimeTrackerStore.getState().tasks).toHaveLength(0);
  });

  it("keeps a single active timer and creates separate sessions when switching tasks", () => {
    const store = useTimeTrackerStore.getState();
    store.addTask({ name: "Client", comment: "", tagIds: [] });
    store.addTask({ name: "Admin", comment: "", tagIds: [] });

    const [clientTask, adminTask] = useTimeTrackerStore.getState().tasks;

    store.startTimer(clientTask!.id, "2026-03-20T09:00:00.000Z");
    store.startTimer(adminTask!.id, "2026-03-20T09:30:00.000Z");

    let state = useTimeTrackerStore.getState();
    expect(state.activeTimer?.taskId).toBe(adminTask!.id);
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0]?.segments[0]?.durationSeconds).toBe(1800);
    expect(state.tasks.find((task) => task.id === clientTask!.id)?.totalTimeSeconds).toBe(1800);

    store.stopTimer("2026-03-20T10:00:00.000Z");

    state = useTimeTrackerStore.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.sessions).toHaveLength(2);
    expect(state.tasks.find((task) => task.id === adminTask!.id)?.totalTimeSeconds).toBe(1800);
  });

  it("merges an immediate stop and restart on the same task into a single session", () => {
    const store = useTimeTrackerStore.getState();
    store.addTask({ name: "Focus", comment: "", tagIds: [] });

    const task = useTimeTrackerStore.getState().tasks[0]!;

    store.startTimer(task.id, "2026-03-20T09:00:00.000Z");
    store.stopTimer("2026-03-20T09:15:00.000Z");
    store.startTimer(task.id, "2026-03-20T09:16:00.000Z");
    store.stopTimer("2026-03-20T09:30:00.000Z");

    const state = useTimeTrackerStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.segments).toHaveLength(2);
    expect(state.tasks[0]?.totalTimeSeconds).toBe(1740);
  });

  it("allows manual time on any task while another timer is active", () => {
    const store = useTimeTrackerStore.getState();
    store.addTask({ name: "Client", comment: "", tagIds: [] });
    store.addTask({ name: "Lecture", comment: "", tagIds: [] });

    const [clientTask, readingTask] = useTimeTrackerStore.getState().tasks;

    store.startTimer(clientTask!.id, "2026-03-20T09:00:00.000Z");
    store.addManualSession(readingTask!.id, {
      startTime: "2026-03-19T10:00:00.000Z",
      endTime: "2026-03-19T11:30:00.000Z",
    });

    const state = useTimeTrackerStore.getState();
    expect(state.activeTimer?.taskId).toBe(clientTask!.id);
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[1]?.origin).toBe("manual");
    expect(state.tasks.find((task) => task.id === readingTask!.id)?.totalTimeSeconds).toBe(5400);
  });

  it("removes sessions when deleting a task", () => {
    const store = useTimeTrackerStore.getState();
    store.addTask({ name: "Archive", comment: "", tagIds: [] });
    const task = useTimeTrackerStore.getState().tasks[0]!;

    store.addManualSession(task.id, {
      startTime: "2026-03-20T08:00:00.000Z",
      endTime: "2026-03-20T09:00:00.000Z",
    });

    expect(useTimeTrackerStore.getState().sessions).toHaveLength(1);
    store.deleteTask(task.id);

    const state = useTimeTrackerStore.getState();
    expect(state.tasks).toHaveLength(0);
    expect(state.sessions).toHaveLength(0);
  });

  it("migrates legacy timeEntries and finalizes a recovered timer", () => {
    const migrated = migratePersistedState({
      tasks: [
        {
          id: 1,
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
          id: 1,
          taskId: 1,
          startTime: "2026-03-20T08:00:00.000Z",
          endTime: "2026-03-20T09:00:00.000Z",
          durationSeconds: 3600,
          date: "2026-03-20",
          createdAt: "2026-03-20T09:00:00.000Z",
        },
      ],
      activeTimer: {
        taskId: 1,
        startTime: "2026-03-20T09:30:00.000Z",
        updatedAt: "2026-03-20T09:30:00.000Z",
      },
      selectedTagIds: [],
      currentView: "grid",
      reportAnchor: "2026-03-20",
    });

    useTimeTrackerStore.setState(migrated);
    useTimeTrackerStore.getState().finalizeRecoveredTimer();

    const state = useTimeTrackerStore.getState();
    expect(migrated.sessions.length).toBe(2);
    expect(state.tasks[0]?.totalTimeSeconds).toBeGreaterThanOrEqual(3600);
    expect(state.activeTimer).toBeNull();
  });

  it("reorders tasks and cleans relations when deleting a tag", () => {
    const store = useTimeTrackerStore.getState();
    store.addTag("Client", "#ff885b");
    store.addTag("Admin", "#6ed6b5");

    const [clientTag, adminTag] = useTimeTrackerStore.getState().tags;
    store.addTask({ name: "Tâche A", comment: "", tagIds: [clientTag!.id] });
    store.addTask({ name: "Tâche B", comment: "", tagIds: [clientTag!.id, adminTag!.id] });

    let state = useTimeTrackerStore.getState();
    const [taskA, taskB] = state.tasks;
    store.reorderTasks(taskB!.id, taskA!.id);
    store.setSelectedTagIds([adminTag!.id]);
    store.deleteTag(adminTag!.id);

    state = useTimeTrackerStore.getState();
    expect(state.tasks[0]?.name).toBe("Tâche B");
    expect(state.tasks[0]?.position).toBe(0);
    expect(state.tasks[0]?.tagIds).toEqual([clientTag!.id]);
    expect(state.selectedTagIds).toEqual([]);
  });
});

