import { create } from "zustand";
import type {
  ActiveTimer,
  SessionAuditEvent,
  SessionAuditEventType,
  SessionDraft,
  SessionSegment,
  Tag,
  Task,
  TaskDraft,
  TaskSession,
  ViewMode,
} from "../types";
import type { TimeTrackerApiClient } from "../lib/api";
import {
  createActiveTaskLifecycle,
  isTaskTrackable,
  normalizeTask,
  calculateTaskSessionDuration,
} from "../lib/taskModels";
import {
  differenceInSeconds,
  shiftWeek,
  toDateKey,
  todayKey,
} from "../lib/time";

interface TimeTrackerState {
  tasks: Task[];
  tags: Tag[];
  sessions: TaskSession[];
  activeTimer: ActiveTimer | null;
  selectedTagIds: string[];
  currentView: ViewMode;
  reportAnchor: string;
  resumeCandidateSessionId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  lastError: string | null;
  initialize: (apiClient: TimeTrackerApiClient) => Promise<void>;
  reloadWorkspace: () => Promise<void>;
  clearWorkspace: () => void;
  dismissError: () => void;
  addTask: (draft: TaskDraft) => Promise<void>;
  updateTask: (taskId: string, draft: TaskDraft) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setTaskOrder: (taskIds: string[]) => Promise<void>;
  reorderTasks: (activeTaskId: string, overTaskId: string) => Promise<void>;
  startTimer: (taskId: string, startedAt?: string) => Promise<void>;
  stopTimer: (stoppedAt?: string) => Promise<void>;
  toggleTimer: (taskId: string) => Promise<void>;
  addManualSession: (taskId: string, draft: SessionDraft) => Promise<void>;
  updateSession: (sessionId: string, draft: SessionDraft) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addTag: (name: string, color: string) => Promise<void>;
  updateTag: (
    tagId: string,
    patch: Pick<Tag, "name" | "color">,
  ) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  toggleTaskTag: (taskId: string, tagId: string) => Promise<void>;
  setSelectedTagIds: (tagIds: string[]) => void;
  setCurrentView: (view: ViewMode) => void;
  moveReportWeek: (direction: -1 | 1) => void;
  resetFilters: () => void;
}

interface LegacyTimeEntry {
  id: string | number;
  taskId: string | number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  date: string;
  createdAt: string;
}

interface LegacyActiveTimer {
  taskId: string | number;
  startTime: string;
  updatedAt: string;
}

interface LegacyPersistedTask extends Omit<Task, "id" | "tagIds"> {
  id: string | number;
  tagIds: Array<string | number>;
}

interface LegacyPersistedTag extends Omit<Tag, "id"> {
  id: string | number;
}

export interface LegacyPersistedState {
  tasks: LegacyPersistedTask[];
  tags: LegacyPersistedTag[];
  timeEntries: LegacyTimeEntry[];
  activeTimer: LegacyActiveTimer | null;
  selectedTagIds: Array<string | number>;
  currentView: ViewMode;
  reportAnchor: string;
}

let currentApiClient: TimeTrackerApiClient | null = null;

export const createInitialTimeTrackerData = () => ({
  tasks: [] as Task[],
  tags: [] as Tag[],
  sessions: [] as TaskSession[],
  activeTimer: null as ActiveTimer | null,
  selectedTagIds: [] as string[],
  currentView: "grid" as ViewMode,
  reportAnchor: todayKey(),
  resumeCandidateSessionId: null as string | null,
  isLoading: false,
  isInitialized: false,
  lastError: null as string | null,
});

const normalizeTaskDraft = (draft: TaskDraft): TaskDraft => ({
  ...draft,
  name: draft.name.trim(),
  comment: draft.comment.trim(),
  tagIds: [...new Set(draft.tagIds)],
});

const normalizeSessionDraft = (draft: SessionDraft): SessionDraft => ({
  startTime: draft.startTime,
  endTime: draft.endTime,
});

const toStringId = (value: string | number): string => String(value);

export const migratePersistedState = (
  legacyState: LegacyPersistedState,
): ReturnType<typeof createInitialTimeTrackerData> => {
  const tasks = legacyState.tasks.map((task) =>
    normalizeTask({
      ...task,
      id: toStringId(task.id),
      tagIds: task.tagIds.map(toStringId),
    }),
  );

  const tags = legacyState.tags.map((tag) => ({
    ...tag,
    id: toStringId(tag.id),
  }));

  const migratedSessions: TaskSession[] = legacyState.timeEntries.map(
    (entry) => ({
      id: toStringId(entry.id),
      taskId: toStringId(entry.taskId),
      origin: "manual",
      startedAt: entry.startTime,
      endedAt: entry.endTime,
      date: entry.date,
      segments: [
        {
          id: 1,
          startTime: entry.startTime,
          endTime: entry.endTime,
          durationSeconds: entry.durationSeconds,
        },
      ],
      auditEvents: [
        {
          id: 1,
          type: "migrated",
          at: entry.createdAt,
          description: "Migrated from legacy persisted time entry.",
        },
      ],
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
    }),
  );

  const nextSessionId = migratedSessions.length + 1;
  const activeTimer = legacyState.activeTimer
    ? {
        taskId: toStringId(legacyState.activeTimer.taskId),
        sessionId: String(nextSessionId),
        segmentStartTime: legacyState.activeTimer.startTime,
        updatedAt: legacyState.activeTimer.updatedAt,
      }
    : null;

  const activeSession = legacyState.activeTimer
    ? ({
        id: String(nextSessionId),
        taskId: toStringId(legacyState.activeTimer.taskId),
        origin: "timer",
        startedAt: legacyState.activeTimer.startTime,
        endedAt: null,
        date: toDateKey(legacyState.activeTimer.startTime),
        segments: [],
        auditEvents: [
          {
            id: 1,
            type: "migrated",
            at: legacyState.activeTimer.updatedAt,
            description: "Recovered active timer from legacy persisted state.",
          },
        ],
        createdAt: legacyState.activeTimer.updatedAt,
        updatedAt: legacyState.activeTimer.updatedAt,
      } satisfies TaskSession)
    : null;

  const sessions = activeSession
    ? [...migratedSessions, activeSession]
    : migratedSessions;

  return {
    tasks: syncTaskTotals(tasks, sessions),
    tags,
    sessions,
    activeTimer,
    selectedTagIds: legacyState.selectedTagIds.map(toStringId),
    currentView: legacyState.currentView,
    reportAnchor: legacyState.reportAnchor,
    resumeCandidateSessionId: null,
    isLoading: false,
    isInitialized: false,
    lastError: null,
  };
};

const applyTaskOrder = (tasks: Task[], orderedTaskIds: string[]): Task[] => {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const orderedTasks = orderedTaskIds
    .map((taskId) => taskById.get(taskId))
    .filter((task): task is Task => task !== undefined);

  if (orderedTasks.length !== tasks.length) {
    return tasks;
  }

  return orderedTasks.map((task, index) => ({
    ...task,
    position: index,
    updatedAt: new Date().toISOString(),
  }));
};

const createAuditEvent = (
  id: number,
  type: SessionAuditEventType,
  at: string,
  description: string,
): SessionAuditEvent => ({
  id,
  type,
  at,
  description,
});

const createSegmentId = (sessions: TaskSession[]): number =>
  sessions.reduce(
    (maxId, session) =>
      Math.max(maxId, ...session.segments.map((segment) => segment.id)),
    0,
  ) + 1;

const createAuditEventId = (sessions: TaskSession[]): number =>
  sessions.reduce(
    (maxId, session) =>
      Math.max(maxId, ...session.auditEvents.map((event) => event.id)),
    0,
  ) + 1;

const createSessionSegment = (
  id: number,
  startTime: string,
  endTime: string,
): SessionSegment => ({
  id,
  startTime,
  endTime,
  durationSeconds: differenceInSeconds(startTime, endTime),
});

const syncTaskTotals = (tasks: Task[], sessions: TaskSession[]): Task[] => {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    totals.set(
      session.taskId,
      (totals.get(session.taskId) ?? 0) + calculateTaskSessionDuration(session),
    );
  }

  return tasks.map((task) => ({
    ...task,
    totalTimeSeconds: totals.get(task.id) ?? 0,
  }));
};

const deriveRecoveredActiveTimer = (
  sessions: TaskSession[],
): ActiveTimer | null => {
  const openSessions = sessions.filter((session) => session.endedAt === null);
  if (openSessions.length === 0) {
    return null;
  }

  const session = openSessions
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (!session) {
    return null;
  }

  const latestResumeEvent = session.auditEvents
    .slice()
    .reverse()
    .find((event) => event.type === "resumed" || event.type === "started");

  return {
    taskId: session.taskId,
    sessionId: session.id,
    segmentStartTime: latestResumeEvent?.at ?? session.startedAt,
    updatedAt: latestResumeEvent?.at ?? session.updatedAt,
  };
};

const resolveErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const requireApiClient = (): TimeTrackerApiClient => {
  if (!currentApiClient) {
    throw new Error("API client not configured");
  }

  return currentApiClient;
};

export const useTimeTrackerStore = create<TimeTrackerState>()((set, get) => ({
  ...createInitialTimeTrackerData(),
  initialize: async (apiClient) => {
    currentApiClient = apiClient;
    await get().reloadWorkspace();
  },
  reloadWorkspace: async () => {
    const apiClient = requireApiClient();
    set({ isLoading: true, lastError: null });

    try {
      const [tasks, tags, sessions, activeTimer] = await Promise.all([
        apiClient.tasks.list(),
        apiClient.tags.list(),
        apiClient.sessions.list(),
        apiClient.activeTimer.get(),
      ]);
      const recoveredActiveTimer =
        activeTimer ?? deriveRecoveredActiveTimer(sessions);

      set((state) => ({
        tasks: syncTaskTotals(tasks.map(normalizeTask), sessions),
        tags,
        sessions,
        activeTimer: recoveredActiveTimer,
        selectedTagIds: state.selectedTagIds.filter((tagId) =>
          tags.some((tag) => tag.id === tagId),
        ),
        currentView: state.currentView,
        reportAnchor: state.reportAnchor,
        resumeCandidateSessionId: null,
        isLoading: false,
        isInitialized: true,
        lastError: null,
      }));
    } catch (error) {
      set({
        isLoading: false,
        isInitialized: false,
        lastError: resolveErrorMessage(
          error,
          "Impossible de charger les données distantes.",
        ),
      });
    }
  },
  clearWorkspace: () => {
    currentApiClient = null;
    set(createInitialTimeTrackerData());
  },
  dismissError: () => set({ lastError: null }),
  addTask: async (draft) => {
    const apiClient = requireApiClient();
    const normalized = normalizeTaskDraft(draft);
    if (!normalized.name) {
      return;
    }

    try {
      const createdTask = await apiClient.tasks.create(normalized);
      set((state) => ({ tasks: [...state.tasks, createdTask] }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(error, "Impossible de créer la tâche."),
      });
    }
  },
  updateTask: async (taskId, draft) => {
    const apiClient = requireApiClient();
    const normalized = normalizeTaskDraft(draft);
    if (!normalized.name) {
      return;
    }

    try {
      const updatedTask = await apiClient.tasks.update(taskId, {
        name: normalized.name,
        comment: normalized.comment || null,
        tagIds: normalized.tagIds,
      });

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task,
        ),
      }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de modifier la tâche.",
        ),
      });
    }
  },
  deleteTask: async (taskId) => {
    const apiClient = requireApiClient();

    try {
      const activeTimer = get().activeTimer;
      if (activeTimer?.taskId === taskId) {
        await apiClient.activeTimer.delete();
      }

      await apiClient.tasks.delete(taskId);

      set((state) => {
        const sessions = state.sessions.filter(
          (session) => session.taskId !== taskId,
        );
        return {
          tasks: syncTaskTotals(
            state.tasks
              .filter((task) => task.id !== taskId)
              .map((task, index) => ({ ...task, position: index })),
            sessions,
          ),
          sessions,
          activeTimer:
            state.activeTimer?.taskId === taskId ? null : state.activeTimer,
          resumeCandidateSessionId:
            state.resumeCandidateSessionId &&
            sessions.some(
              (session) => session.id === state.resumeCandidateSessionId,
            )
              ? state.resumeCandidateSessionId
              : null,
        };
      });
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de supprimer la tâche.",
        ),
      });
    }
  },
  setTaskOrder: async (taskIds) => {
    const apiClient = requireApiClient();
    const currentTasks = [...get().tasks].sort(
      (left, right) => left.position - right.position,
    );
    const reorderedTasks = applyTaskOrder(currentTasks, taskIds);
    const currentPositions = new Map(
      currentTasks.map((task) => [task.id, task.position]),
    );
    const changedTasks = reorderedTasks.filter(
      (task) => currentPositions.get(task.id) !== task.position,
    );

    if (changedTasks.length === 0) {
      return;
    }

    try {
      const updatedTasks = await Promise.all(
        changedTasks.map((task) =>
          apiClient.tasks.update(task.id, { position: task.position }),
        ),
      );
      const taskById = new Map(updatedTasks.map((task) => [task.id, task]));
      set((state) => ({
        tasks: reorderedTasks.map((task) => taskById.get(task.id) ?? task),
      }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de réorganiser les tâches.",
        ),
      });
    }
  },
  reorderTasks: async (activeTaskId, overTaskId) => {
    if (activeTaskId === overTaskId) {
      return;
    }

    const ordered = [...get().tasks].sort(
      (left, right) => left.position - right.position,
    );
    const activeIndex = ordered.findIndex((task) => task.id === activeTaskId);
    const overIndex = ordered.findIndex((task) => task.id === overTaskId);
    if (activeIndex < 0 || overIndex < 0) {
      return;
    }

    const [moved] = ordered.splice(activeIndex, 1);
    ordered.splice(overIndex, 0, moved);
    await get().setTaskOrder(ordered.map((task) => task.id));
  },
  startTimer: async (taskId, startedAt = new Date().toISOString()) => {
    const apiClient = requireApiClient();
    const targetTask = get().tasks.find((task) => task.id === taskId);
    if (!targetTask || !isTaskTrackable(targetTask)) {
      return;
    }

    const current = get().activeTimer;
    if (current?.taskId === taskId) {
      return;
    }
    if (current) {
      await get().stopTimer(startedAt);
    }

    const state = get();
    const resumableSession =
      state.resumeCandidateSessionId === null
        ? undefined
        : state.sessions.find(
            (session) =>
              session.id === state.resumeCandidateSessionId &&
              session.taskId === taskId,
          );

    try {
      const nextAuditEventId = createAuditEventId(state.sessions);
      const session = resumableSession
        ? await apiClient.sessions.update(resumableSession.id, {
            endedAt: null,
            auditEvents: [
              ...resumableSession.auditEvents,
              createAuditEvent(
                nextAuditEventId,
                "resumed",
                startedAt,
                "Session relancée immédiatement sur la même tâche.",
              ),
            ],
          })
        : await apiClient.sessions.create({
            taskId,
            origin: "timer",
            startedAt,
            endedAt: null,
            date: toDateKey(startedAt),
            segments: [],
            auditEvents: [
              createAuditEvent(
                nextAuditEventId,
                "started",
                startedAt,
                "Chrono démarré.",
              ),
            ],
          });

      const activeTimer = await apiClient.activeTimer.set({
        taskId,
        sessionId: session.id,
        segmentStartTime: startedAt,
      });

      set((currentState) => ({
        sessions: resumableSession
          ? currentState.sessions.map((candidate) =>
              candidate.id === session.id ? session : candidate,
            )
          : [...currentState.sessions, session],
        activeTimer,
        resumeCandidateSessionId: null,
      }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de démarrer le chrono.",
        ),
      });
    }
  },
  stopTimer: async (stoppedAt = new Date().toISOString()) => {
    const apiClient = requireApiClient();
    const activeTimer = get().activeTimer;
    if (!activeTimer) {
      return;
    }

    const state = get();
    const session = state.sessions.find(
      (candidate) => candidate.id === activeTimer.sessionId,
    );

    try {
      if (!session) {
        await apiClient.activeTimer.delete();
        set({ activeTimer: null, resumeCandidateSessionId: null });
        return;
      }

      const durationSeconds = differenceInSeconds(
        activeTimer.segmentStartTime,
        stoppedAt,
      );
      if (durationSeconds === 0) {
        await apiClient.activeTimer.delete();

        if (session.origin === "timer" && session.segments.length === 0) {
          await apiClient.sessions.delete(session.id);
        }

        set((currentState) => ({
          activeTimer: null,
          resumeCandidateSessionId: null,
          sessions:
            session.origin === "timer" && session.segments.length === 0
              ? currentState.sessions.filter(
                  (candidate) => candidate.id !== session.id,
                )
              : currentState.sessions,
        }));
        return;
      }

      const nextSegmentId = createSegmentId(state.sessions);
      const nextAuditEventId = createAuditEventId(state.sessions);
      const savedSession = await apiClient.sessions.update(session.id, {
        endedAt: stoppedAt,
        segments: [
          ...session.segments,
          createSessionSegment(
            nextSegmentId,
            activeTimer.segmentStartTime,
            stoppedAt,
          ),
        ],
        auditEvents: [
          ...session.auditEvents,
          createAuditEvent(
            nextAuditEventId,
            "stopped",
            stoppedAt,
            "Chrono arrêté.",
          ),
        ],
      });

      await apiClient.activeTimer.delete();

      set((currentState) => {
        const sessions = currentState.sessions.map((candidate) =>
          candidate.id === savedSession.id ? savedSession : candidate,
        );

        return {
          sessions,
          activeTimer: null,
          tasks: syncTaskTotals(
            currentState.tasks.map((task) =>
              task.id === activeTimer.taskId
                ? { ...task, updatedAt: stoppedAt }
                : task,
            ),
            sessions,
          ),
          resumeCandidateSessionId: savedSession.id,
        };
      });
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible d’arrêter le chrono.",
        ),
      });
    }
  },
  toggleTimer: async (taskId) => {
    const current = get().activeTimer;
    if (current?.taskId === taskId) {
      await get().stopTimer();
      return;
    }

    await get().startTimer(taskId);
  },
  addManualSession: async (taskId, draft) => {
    const apiClient = requireApiClient();
    const normalized = normalizeSessionDraft(draft);
    if (differenceInSeconds(normalized.startTime, normalized.endTime) === 0) {
      return;
    }

    try {
      const nextSegmentId = createSegmentId(get().sessions);
      const nextAuditEventId = createAuditEventId(get().sessions);
      const session = await apiClient.sessions.create({
        taskId,
        origin: "manual",
        startedAt: normalized.startTime,
        endedAt: normalized.endTime,
        date: toDateKey(normalized.startTime),
        segments: [
          createSessionSegment(
            nextSegmentId,
            normalized.startTime,
            normalized.endTime,
          ),
        ],
        auditEvents: [
          createAuditEvent(
            nextAuditEventId,
            "manual-added",
            normalized.endTime,
            "Ajout manuel de temps.",
          ),
        ],
      });

      set((state) => {
        const sessions = [...state.sessions, session];
        return {
          sessions,
          tasks: syncTaskTotals(
            state.tasks.map((task) =>
              task.id === taskId
                ? { ...task, updatedAt: normalized.endTime }
                : task,
            ),
            sessions,
          ),
          resumeCandidateSessionId: null,
        };
      });
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible d’ajouter la session.",
        ),
      });
    }
  },
  updateSession: async (sessionId, draft) => {
    const apiClient = requireApiClient();
    const normalized = normalizeSessionDraft(draft);
    if (
      differenceInSeconds(normalized.startTime, normalized.endTime) === 0 ||
      get().activeTimer?.sessionId === sessionId
    ) {
      return;
    }

    const session = get().sessions.find(
      (candidate) => candidate.id === sessionId,
    );
    if (!session) {
      return;
    }

    try {
      const nextSegmentId = createSegmentId(get().sessions);
      const nextAuditEventId = createAuditEventId(get().sessions);
      const savedSession = await apiClient.sessions.update(sessionId, {
        startedAt: normalized.startTime,
        endedAt: normalized.endTime,
        date: toDateKey(normalized.startTime),
        segments: [
          createSessionSegment(
            nextSegmentId,
            normalized.startTime,
            normalized.endTime,
          ),
        ],
        auditEvents: [
          ...session.auditEvents,
          createAuditEvent(
            nextAuditEventId,
            "manually-edited",
            normalized.endTime,
            "Session modifiée manuellement.",
          ),
        ],
      });

      set((state) => {
        const sessions = state.sessions.map((candidate) =>
          candidate.id === sessionId ? savedSession : candidate,
        );
        return {
          sessions,
          tasks: syncTaskTotals(state.tasks, sessions),
          resumeCandidateSessionId: null,
        };
      });
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de modifier la session.",
        ),
      });
    }
  },
  deleteSession: async (sessionId) => {
    const apiClient = requireApiClient();

    try {
      if (get().activeTimer?.sessionId === sessionId) {
        await apiClient.activeTimer.delete();
      }

      await apiClient.sessions.delete(sessionId);

      set((state) => {
        const sessions = state.sessions.filter(
          (session) => session.id !== sessionId,
        );
        return {
          sessions,
          activeTimer:
            state.activeTimer?.sessionId === sessionId
              ? null
              : state.activeTimer,
          tasks: syncTaskTotals(state.tasks, sessions),
          resumeCandidateSessionId:
            state.resumeCandidateSessionId === sessionId
              ? null
              : state.resumeCandidateSessionId,
        };
      });
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de supprimer la session.",
        ),
      });
    }
  },
  addTag: async (name, color) => {
    const apiClient = requireApiClient();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    if (
      get().tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      return;
    }

    try {
      const tag = await apiClient.tags.create({ name: trimmed, color });
      set((state) => ({ tags: [...state.tags, tag] }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(error, "Impossible de créer le tag."),
      });
    }
  },
  updateTag: async (tagId, patch) => {
    const apiClient = requireApiClient();
    const trimmed = patch.name.trim();
    if (!trimmed) {
      return;
    }

    try {
      const updatedTag = await apiClient.tags.update(tagId, {
        name: trimmed,
        color: patch.color,
      });
      set((state) => ({
        tags: state.tags.map((tag) => (tag.id === tagId ? updatedTag : tag)),
      }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(error, "Impossible de modifier le tag."),
      });
    }
  },
  deleteTag: async (tagId) => {
    const apiClient = requireApiClient();

    try {
      await apiClient.tags.delete(tagId);
      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== tagId),
        tasks: state.tasks.map((task) => ({
          ...task,
          tagIds: task.tagIds.filter((currentTagId) => currentTagId !== tagId),
        })),
        selectedTagIds: state.selectedTagIds.filter(
          (currentTagId) => currentTagId !== tagId,
        ),
      }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de supprimer le tag.",
        ),
      });
    }
  },
  toggleTaskTag: async (taskId, tagId) => {
    const apiClient = requireApiClient();
    const task = get().tasks.find((candidate) => candidate.id === taskId);
    if (!task) {
      return;
    }

    const nextTagIds = task.tagIds.includes(tagId)
      ? task.tagIds.filter((currentTagId) => currentTagId !== tagId)
      : [...task.tagIds, tagId];

    try {
      const updatedTask = await apiClient.tasks.update(taskId, {
        tagIds: nextTagIds,
      });
      set((state) => ({
        tasks: state.tasks.map((candidate) =>
          candidate.id === taskId ? updatedTask : candidate,
        ),
        resumeCandidateSessionId: null,
      }));
    } catch (error) {
      set({
        lastError: resolveErrorMessage(
          error,
          "Impossible de mettre à jour les tags de la tâche.",
        ),
      });
    }
  },
  setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds }),
  setCurrentView: (view) => set({ currentView: view }),
  moveReportWeek: (direction) =>
    set((state) => ({
      reportAnchor: shiftWeek(state.reportAnchor, direction),
    })),
  resetFilters: () => set({ selectedTagIds: [] }),
}));

export const setTimeTrackerApiClientForTesting = (
  apiClient: TimeTrackerApiClient | null,
): void => {
  currentApiClient = apiClient;
};

export const resetTimeTrackerStore = (): void => {
  currentApiClient = null;
  useTimeTrackerStore.setState(createInitialTimeTrackerData());
};
