import type { Task, TaskLifecycle, TaskSession } from "../types";

export interface TaskSessionReportRecord {
  sessionId: number;
  taskId: number;
  origin: TaskSession["origin"];
  date: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  segmentCount: number;
}

export interface TaskReportSnapshot {
  taskId: number;
  taskName: string;
  lifecycleStatus: TaskLifecycle["status"];
  archivedAt: string | null;
  totalTrackedSeconds: number;
  sessionCount: number;
  lastTrackedAt: string | null;
  sessions: TaskSessionReportRecord[];
}

const defaultTaskLifecycle = (): TaskLifecycle => ({
  status: "active",
  archivedAt: null,
});

export const getTaskLifecycle = (task: Task): TaskLifecycle => ({
  status: task.lifecycle?.status ?? "active",
  archivedAt: task.lifecycle?.archivedAt ?? null,
});

export const normalizeTask = (task: Task): Task => ({
  ...task,
  lifecycle: getTaskLifecycle(task),
});

export const createActiveTaskLifecycle = (): TaskLifecycle =>
  defaultTaskLifecycle();

export const isTaskTrackable = (task: Task): boolean =>
  getTaskLifecycle(task).status === "active";

export const calculateTaskSessionDuration = (session: TaskSession): number =>
  session.segments.reduce((sum, segment) => sum + segment.durationSeconds, 0);

export const createTaskReportSnapshot = (
  task: Task,
  sessions: TaskSession[],
): TaskReportSnapshot => {
  const normalizedTask = normalizeTask(task);
  const lifecycle = getTaskLifecycle(normalizedTask);
  const taskSessions = sessions
    .filter((session) => session.taskId === task.id)
    .map((session) => ({
      sessionId: session.id,
      taskId: session.taskId,
      origin: session.origin,
      date: session.date,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: calculateTaskSessionDuration(session),
      segmentCount: session.segments.length,
    }));
  const latestTrackedSession = [...taskSessions]
    .reverse()
    .find((session) => session.endedAt !== null);

  return {
    taskId: normalizedTask.id,
    taskName: normalizedTask.name,
    lifecycleStatus: lifecycle.status,
    archivedAt: lifecycle.archivedAt,
    totalTrackedSeconds: taskSessions.reduce(
      (sum, session) => sum + session.durationSeconds,
      0,
    ),
    sessionCount: taskSessions.length,
    lastTrackedAt:
      latestTrackedSession?.endedAt ?? taskSessions.at(-1)?.startedAt ?? null,
    sessions: taskSessions,
  };
};

export const createTaskReportSnapshots = (
  tasks: Task[],
  sessions: TaskSession[],
): TaskReportSnapshot[] =>
  [...tasks]
    .sort((left, right) => left.position - right.position)
    .map((task) => createTaskReportSnapshot(task, sessions));
