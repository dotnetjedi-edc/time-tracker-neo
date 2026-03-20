import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveTimer,
  Tag,
  Task,
  TaskDraft,
  TimeEntry,
  ViewMode,
} from "../types";
import { differenceInSeconds, shiftWeek, todayKey } from "../lib/time";

interface TimeTrackerState {
  tasks: Task[];
  tags: Tag[];
  timeEntries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  selectedTagIds: number[];
  currentView: ViewMode;
  reportAnchor: string;
  addTask: (draft: TaskDraft) => void;
  updateTask: (taskId: number, draft: TaskDraft) => void;
  deleteTask: (taskId: number) => void;
  reorderTasks: (activeTaskId: number, overTaskId: number) => void;
  startTimer: (taskId: number, startedAt?: string) => void;
  stopTimer: (stoppedAt?: string) => void;
  toggleTimer: (taskId: number) => void;
  addTag: (name: string, color: string) => void;
  updateTag: (tagId: number, patch: Pick<Tag, "name" | "color">) => void;
  deleteTag: (tagId: number) => void;
  toggleTaskTag: (taskId: number, tagId: number) => void;
  setSelectedTagIds: (tagIds: number[]) => void;
  setCurrentView: (view: ViewMode) => void;
  moveReportWeek: (direction: -1 | 1) => void;
  resetFilters: () => void;
  finalizeRecoveredTimer: () => void;
}

interface TimeTrackerDataState {
  tasks: Task[];
  tags: Tag[];
  timeEntries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  selectedTagIds: number[];
  currentView: ViewMode;
  reportAnchor: string;
}

const createTaskId = (tasks: Task[]): number =>
  tasks.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1;

const createTagId = (tags: Tag[]): number =>
  tags.reduce((maxId, tag) => Math.max(maxId, tag.id), 0) + 1;

const createTimeEntryId = (entries: TimeEntry[]): number =>
  entries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1;

const normalizeTaskDraft = (draft: TaskDraft): TaskDraft => ({
  ...draft,
  name: draft.name.trim(),
  comment: draft.comment.trim(),
  tagIds: [...new Set(draft.tagIds)],
});

export const timeTrackerStorageKey = "time-tracker-storage";

export const createInitialTimeTrackerData = (): TimeTrackerDataState => ({
  tasks: [],
  tags: [],
  timeEntries: [],
  activeTimer: null,
  selectedTagIds: [],
  currentView: "grid",
  reportAnchor: todayKey(),
});

export const useTimeTrackerStore = create<TimeTrackerState>()(
  persist(
    (set, get) => ({
      ...createInitialTimeTrackerData(),
      addTask: (draft) => {
        const normalized = normalizeTaskDraft(draft);
        if (!normalized.name) {
          return;
        }

        set((state) => {
          const now = new Date().toISOString();
          const nextTask: Task = {
            id: createTaskId(state.tasks),
            name: normalized.name,
            comment: normalized.comment || null,
            totalTimeSeconds: 0,
            position: state.tasks.length,
            tagIds: normalized.tagIds,
            createdAt: now,
            updatedAt: now,
          };

          return { tasks: [...state.tasks, nextTask] };
        });
      },
      updateTask: (taskId, draft) => {
        const normalized = normalizeTaskDraft(draft);
        if (!normalized.name) {
          return;
        }

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  name: normalized.name,
                  comment: normalized.comment || null,
                  tagIds: normalized.tagIds,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        }));
      },
      deleteTask: (taskId) => {
        if (get().activeTimer?.taskId === taskId) {
          get().stopTimer();
        }

        set((state) => ({
          tasks: state.tasks
            .filter((task) => task.id !== taskId)
            .map((task, index) => ({ ...task, position: index })),
          timeEntries: state.timeEntries.filter(
            (entry) => entry.taskId !== taskId,
          ),
        }));
      },
      reorderTasks: (activeTaskId, overTaskId) => {
        if (activeTaskId === overTaskId) {
          return;
        }

        set((state) => {
          const ordered = [...state.tasks].sort(
            (left, right) => left.position - right.position,
          );
          const activeIndex = ordered.findIndex(
            (task) => task.id === activeTaskId,
          );
          const overIndex = ordered.findIndex((task) => task.id === overTaskId);
          if (activeIndex < 0 || overIndex < 0) {
            return state;
          }

          const [moved] = ordered.splice(activeIndex, 1);
          ordered.splice(overIndex, 0, moved);

          return {
            tasks: ordered.map((task, index) => ({
              ...task,
              position: index,
              updatedAt: new Date().toISOString(),
            })),
          };
        });
      },
      startTimer: (taskId, startedAt = new Date().toISOString()) => {
        const current = get().activeTimer;
        if (current?.taskId === taskId) {
          return;
        }
        if (current) {
          get().stopTimer(startedAt);
        }

        set({
          activeTimer: {
            taskId,
            startTime: startedAt,
            updatedAt: startedAt,
          },
        });
      },
      stopTimer: (stoppedAt = new Date().toISOString()) => {
        const activeTimer = get().activeTimer;
        if (!activeTimer) {
          return;
        }

        set((state) => {
          const durationSeconds = differenceInSeconds(
            activeTimer.startTime,
            stoppedAt,
          );
          if (durationSeconds === 0) {
            return { activeTimer: null };
          }

          return {
            activeTimer: null,
            tasks: state.tasks.map((task) =>
              task.id === activeTimer.taskId
                ? {
                    ...task,
                    totalTimeSeconds: task.totalTimeSeconds + durationSeconds,
                    updatedAt: stoppedAt,
                  }
                : task,
            ),
            timeEntries: [
              ...state.timeEntries,
              {
                id: createTimeEntryId(state.timeEntries),
                taskId: activeTimer.taskId,
                startTime: activeTimer.startTime,
                endTime: stoppedAt,
                durationSeconds,
                date: todayKey(),
                createdAt: stoppedAt,
              },
            ],
          };
        });
      },
      toggleTimer: (taskId) => {
        const current = get().activeTimer;
        if (current?.taskId === taskId) {
          get().stopTimer();
          return;
        }

        get().startTimer(taskId);
      },
      addTag: (name, color) => {
        const trimmed = name.trim();
        if (!trimmed) {
          return;
        }

        set((state) => {
          if (
            state.tags.some(
              (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
            )
          ) {
            return state;
          }

          return {
            tags: [
              ...state.tags,
              {
                id: createTagId(state.tags),
                name: trimmed,
                color,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
      },
      updateTag: (tagId, patch) => {
        const trimmed = patch.name.trim();
        if (!trimmed) {
          return;
        }

        set((state) => ({
          tags: state.tags.map((tag) =>
            tag.id === tagId
              ? {
                  ...tag,
                  name: trimmed,
                  color: patch.color,
                }
              : tag,
          ),
        }));
      },
      deleteTag: (tagId) => {
        set((state) => ({
          tags: state.tags.filter((tag) => tag.id !== tagId),
          tasks: state.tasks.map((task) => ({
            ...task,
            tagIds: task.tagIds.filter(
              (currentTagId) => currentTagId !== tagId,
            ),
          })),
          selectedTagIds: state.selectedTagIds.filter(
            (currentTagId) => currentTagId !== tagId,
          ),
        }));
      },
      toggleTaskTag: (taskId, tagId) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) {
              return task;
            }

            const hasTag = task.tagIds.includes(tagId);
            return {
              ...task,
              tagIds: hasTag
                ? task.tagIds.filter((currentTagId) => currentTagId !== tagId)
                : [...task.tagIds, tagId],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds }),
      setCurrentView: (view) => set({ currentView: view }),
      moveReportWeek: (direction) =>
        set((state) => ({
          reportAnchor: shiftWeek(state.reportAnchor, direction),
        })),
      resetFilters: () => set({ selectedTagIds: [] }),
      finalizeRecoveredTimer: () => {
        if (get().activeTimer) {
          get().stopTimer(new Date().toISOString());
        }
      },
    }),
    {
      name: timeTrackerStorageKey,
      version: 1,
      onRehydrateStorage: () => (state) => {
        state?.finalizeRecoveredTimer();
      },
    },
  ),
);

export const resetTimeTrackerStore = (): void => {
  useTimeTrackerStore.setState(createInitialTimeTrackerData());
  window.localStorage.removeItem(timeTrackerStorageKey);
};
