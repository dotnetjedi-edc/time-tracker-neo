import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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

  it("keeps a single active timer and records entries when switching tasks", () => {
    const store = useTimeTrackerStore.getState();
    store.addTask({ name: "Client", comment: "", tagIds: [] });
    store.addTask({ name: "Admin", comment: "", tagIds: [] });

    const [clientTask, adminTask] = useTimeTrackerStore.getState().tasks;

    store.startTimer(clientTask!.id, "2026-03-20T09:00:00.000Z");
    store.startTimer(adminTask!.id, "2026-03-20T09:30:00.000Z");

    let state = useTimeTrackerStore.getState();
    expect(state.activeTimer?.taskId).toBe(adminTask!.id);
    expect(state.timeEntries).toHaveLength(1);
    expect(state.timeEntries[0]?.durationSeconds).toBe(1800);
    expect(state.tasks.find((task) => task.id === clientTask!.id)?.totalTimeSeconds).toBe(1800);

    store.stopTimer("2026-03-20T10:00:00.000Z");

    state = useTimeTrackerStore.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.timeEntries).toHaveLength(2);
    expect(state.tasks.find((task) => task.id === adminTask!.id)?.totalTimeSeconds).toBe(1800);
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