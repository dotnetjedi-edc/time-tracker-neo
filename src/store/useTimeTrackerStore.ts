import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveTimer,
  SessionAuditEvent,
  SessionAuditEventType,
  SessionDraft,
  SessionSegment,
  Tag,
  Task,
  TaskSession,
  TaskDraft,
  ViewMode,
} from "../types";
import { differenceInSeconds, shiftWeek, toDateKey, todayKey } from "../lib/time";

interface TimeTrackerState {
  tasks: Task[];
  tags: Tag[];
  sessions: TaskSession[];
  activeTimer: ActiveTimer | null;
  selectedTagIds: number[];
  currentView: ViewMode;
  reportAnchor: string;
  resumeCandidateSessionId: number | null;
  addTask: (draft: TaskDraft) => void;
  updateTask: (taskId: number, draft: TaskDraft) => void;
  deleteTask: (taskId: number) => void;
  reorderTasks: (activeTaskId: number, overTaskId: number) => void;
  startTimer: (taskId: number, startedAt?: string) => void;
  stopTimer: (stoppedAt?: string) => void;
  toggleTimer: (taskId: number) => void;
  addManualSession: (taskId: number, draft: SessionDraft) => void;
  updateSession: (sessionId: number, draft: SessionDraft) => void;
  deleteSession: (sessionId: number) => void;
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
  sessions: TaskSession[];
  activeTimer: ActiveTimer | null;
  selectedTagIds: number[];
  currentView: ViewMode;
  reportAnchor: string;
  resumeCandidateSessionId: number | null;
}

interface LegacyTimeEntry {
  id: number;
  taskId: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  date: string;
  createdAt: string;
}

interface LegacyActiveTimer {
  taskId: number;
  startTime: string;
  updatedAt: string;
}

interface LegacyPersistedState {
  tasks?: Task[];
  tags?: Tag[];
  timeEntries?: LegacyTimeEntry[];
  activeTimer?: LegacyActiveTimer | null;
  selectedTagIds?: number[];
  currentView?: ViewMode;
  reportAnchor?: string;
}

const createTaskId = (tasks: Task[]): number =>
  tasks.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1;

const createTagId = (tags: Tag[]): number =>
  tags.reduce((maxId, tag) => Math.max(maxId, tag.id), 0) + 1;

const createSessionId = (sessions: TaskSession[]): number =>
  sessions.reduce((maxId, session) => Math.max(maxId, session.id), 0) + 1;

const createSegmentId = (sessions: TaskSession[]): number =>
  sessions.reduce(
    (maxId, session) =>
      Math.max(
        maxId,
        ...session.segments.map((segment) => segment.id),
      ),
    0,
  ) + 1;

const createAuditEventId = (sessions: TaskSession[]): number =>
  sessions.reduce(
    (maxId, session) =>
      Math.max(
        maxId,
        ...session.auditEvents.map((event) => event.id),
      ),
    0,
  ) + 1;

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

const calculateSessionDuration = (session: TaskSession): number =>
  session.segments.reduce((sum, segment) => sum + segment.durationSeconds, 0);

const syncTaskTotals = (tasks: Task[], sessions: TaskSession[]): Task[] => {
  const totals = new Map<number, number>();
  for (const session of sessions) {
    totals.set(
      session.taskId,
      (totals.get(session.taskId) ?? 0) + calculateSessionDuration(session),
    );
  }

  return tasks.map((task) => ({
    ...task,
    totalTimeSeconds: totals.get(task.id) ?? 0,
  }));
};

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

const createManualSession = (
  sessions: TaskSession[],
  taskId: number,
  draft: SessionDraft,
): TaskSession => {
  const sessionId = createSessionId(sessions);
  const segmentId = createSegmentId(sessions);
  const auditEventId = createAuditEventId(sessions);
  const normalized = normalizeSessionDraft(draft);

  return {
    id: sessionId,
    taskId,
    origin: "manual",
    startedAt: normalized.startTime,
    endedAt: normalized.endTime,
    date: toDateKey(normalized.startTime),
    segments: [
      createSessionSegment(segmentId, normalized.startTime, normalized.endTime),
    ],
    auditEvents: [
      createAuditEvent(
        auditEventId,
        "manual-added",
        normalized.endTime,
        "Ajout manuel de temps.",
      ),
    ],
    createdAt: normalized.endTime,
    updatedAt: normalized.endTime,
  };
};

const toTaskSessionsFromLegacyEntries = (
  entries: LegacyTimeEntry[],
): TaskSession[] => {
  let nextAuditEventId = 1;

  return entries.map((entry, index) => ({
    id: index + 1,
    taskId: entry.taskId,
    origin: "timer",
    startedAt: entry.startTime,
    endedAt: entry.endTime,
    date: entry.date,
    segments: [
      {
        id: index + 1,
        startTime: entry.startTime,
        endTime: entry.endTime,
        durationSeconds: entry.durationSeconds,
      },
    ],
    auditEvents: [
      createAuditEvent(
        nextAuditEventId++,
        "migrated",
        entry.createdAt,
        "Session migrée depuis une ancienne entrée de temps.",
      ),
    ],
    createdAt: entry.createdAt,
    updatedAt: entry.endTime,
  }));
};

export const migratePersistedState = (
  persistedState: unknown,
): TimeTrackerDataState => {
  const state = (persistedState ?? {}) as
    | (LegacyPersistedState & Partial<TimeTrackerDataState>)
    | undefined;

  if (state?.sessions) {
    return {
      tasks: syncTaskTotals(state.tasks ?? [], state.sessions),
      tags: state.tags ?? [],
      sessions: state.sessions,
      activeTimer: state.activeTimer ?? null,
      selectedTagIds: state.selectedTagIds ?? [],
      currentView: state.currentView ?? "grid",
      reportAnchor: state.reportAnchor ?? todayKey(),
      resumeCandidateSessionId: null,
    };
  }

  const sessions = toTaskSessionsFromLegacyEntries(state?.timeEntries ?? []);
  const activeTimer = state?.activeTimer
    ? {
        taskId: state.activeTimer.taskId,
        sessionId: createSessionId(sessions),
        segmentStartTime: state.activeTimer.startTime,
        updatedAt: state.activeTimer.updatedAt,
      }
    : null;

  const migratedSessions = activeTimer
    ? [
        ...sessions,
        {
          id: activeTimer.sessionId,
          taskId: activeTimer.taskId,
          origin: "timer",
          startedAt: activeTimer.segmentStartTime,
          endedAt: null,
          date: toDateKey(activeTimer.segmentStartTime),
          segments: [],
          auditEvents: [
            createAuditEvent(
              createAuditEventId(sessions),
              "migrated",
              activeTimer.updatedAt,
              "Timer actif migré et en attente de finalisation.",
            ),
          ],
          createdAt: activeTimer.segmentStartTime,
          updatedAt: activeTimer.updatedAt,
        },
      ]
    : sessions;

  return {
    tasks: syncTaskTotals(state?.tasks ?? [], migratedSessions),
    tags: state?.tags ?? [],
    sessions: migratedSessions,
    activeTimer,
    selectedTagIds: state?.selectedTagIds ?? [],
    currentView: state?.currentView ?? "grid",
    reportAnchor: state?.reportAnchor ?? todayKey(),
    resumeCandidateSessionId: null,
  };
};

export const timeTrackerStorageKey = "time-tracker-storage";

export const createInitialTimeTrackerData = (): TimeTrackerDataState => ({
  tasks: [],
  tags: [],
  sessions: [],
  activeTimer: null,
  selectedTagIds: [],
  currentView: "grid",
  reportAnchor: todayKey(),
  resumeCandidateSessionId: null,
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
          sessions: state.sessions.filter(
            (session) => session.taskId !== taskId,
          ),
          resumeCandidateSessionId:
            state.resumeCandidateSessionId !== null &&
            state.sessions.some(
              (session) =>
                session.id === state.resumeCandidateSessionId &&
                session.taskId === taskId,
            )
              ? null
              : state.resumeCandidateSessionId,
        }));

        set((state) => ({ tasks: syncTaskTotals(state.tasks, state.sessions) }));
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

        set((state) => {
          const resumableSession =
            state.resumeCandidateSessionId !== null
              ? state.sessions.find(
                  (session) =>
                    session.id === state.resumeCandidateSessionId &&
                    session.taskId === taskId,
                )
              : undefined;

          const nextAuditEventId = createAuditEventId(state.sessions);
          let sessions = state.sessions;
          let sessionId: number;

          if (resumableSession) {
            sessionId = resumableSession.id;
            sessions = state.sessions.map((session) =>
              session.id === resumableSession.id
                ? {
                    ...session,
                    endedAt: null,
                    updatedAt: startedAt,
                    auditEvents: [
                      ...session.auditEvents,
                      createAuditEvent(
                        nextAuditEventId,
                        "resumed",
                        startedAt,
                        "Session relancée immédiatement sur la même tâche.",
                      ),
                    ],
                  }
                : session,
            );
          } else {
            sessionId = createSessionId(state.sessions);
            sessions = [
              ...state.sessions,
              {
                id: sessionId,
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
                createdAt: startedAt,
                updatedAt: startedAt,
              },
            ];
          }

          return {
            sessions,
            activeTimer: {
              taskId,
              sessionId,
              segmentStartTime: startedAt,
              updatedAt: startedAt,
            },
            resumeCandidateSessionId: null,
          };
        });
      },
      stopTimer: (stoppedAt = new Date().toISOString()) => {
        const activeTimer = get().activeTimer;
        if (!activeTimer) {
          return;
        }

        set((state) => {
          const durationSeconds = differenceInSeconds(
            activeTimer.segmentStartTime,
            stoppedAt,
          );
          if (durationSeconds === 0) {
            return {
              activeTimer: null,
              resumeCandidateSessionId: null,
              sessions: state.sessions.filter(
                (session) =>
                  !(
                    session.id === activeTimer.sessionId &&
                    session.segments.length === 0 &&
                    session.origin === "timer"
                  ),
              ),
            };
          }

          const nextSegmentId = createSegmentId(state.sessions);
          const nextAuditEventId = createAuditEventId(state.sessions);
          const sessions = state.sessions.map((session) => {
            if (session.id !== activeTimer.sessionId) {
              return session;
            }

            return {
              ...session,
              endedAt: stoppedAt,
              updatedAt: stoppedAt,
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
            };
          });

          return {
            activeTimer: null,
            sessions,
            tasks: syncTaskTotals(
              state.tasks.map((task) =>
                task.id === activeTimer.taskId
                  ? { ...task, updatedAt: stoppedAt }
                  : task,
              ),
              sessions,
            ),
            resumeCandidateSessionId: activeTimer.sessionId,
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
      addManualSession: (taskId, draft) => {
        const normalized = normalizeSessionDraft(draft);
        if (
          differenceInSeconds(normalized.startTime, normalized.endTime) === 0
        ) {
          return;
        }

        set((state) => {
          const nextSession = createManualSession(state.sessions, taskId, normalized);
          const sessions = [...state.sessions, nextSession];

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
      },
      updateSession: (sessionId, draft) => {
        const normalized = normalizeSessionDraft(draft);
        if (
          differenceInSeconds(normalized.startTime, normalized.endTime) === 0 ||
          get().activeTimer?.sessionId === sessionId
        ) {
          return;
        }

        set((state) => {
          const nextSegmentId = createSegmentId(state.sessions);
          const nextAuditEventId = createAuditEventId(state.sessions);
          const sessions = state.sessions.map((session) => {
            if (session.id !== sessionId) {
              return session;
            }

            return {
              ...session,
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
              updatedAt: normalized.endTime,
              auditEvents: [
                ...session.auditEvents,
                createAuditEvent(
                  nextAuditEventId,
                  "manually-edited",
                  normalized.endTime,
                  "Session modifiée manuellement.",
                ),
              ],
            };
          });

          return {
            sessions,
            tasks: syncTaskTotals(state.tasks, sessions),
            resumeCandidateSessionId: null,
          };
        });
      },
      deleteSession: (sessionId) => {
        if (get().activeTimer?.sessionId === sessionId) {
          set({ activeTimer: null });
        }

        set((state) => {
          const sessions = state.sessions.filter((session) => session.id !== sessionId);
          return {
            sessions,
            tasks: syncTaskTotals(state.tasks, sessions),
            resumeCandidateSessionId:
              state.resumeCandidateSessionId === sessionId
                ? null
                : state.resumeCandidateSessionId,
          };
        });
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
          resumeCandidateSessionId: null,
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
      version: 2,
      migrate: (persistedState) => migratePersistedState(persistedState),
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
