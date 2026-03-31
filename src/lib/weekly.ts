import type { Tag, Task, TaskSession, WeeklyTaskSummary } from "../types";
import { calculateTaskSessionDuration } from "./taskModels";
import { toDateKey, weekDays, isSameDay } from "./time";

export interface WeeklySummary {
  days: string[];
  tasks: WeeklyTaskSummary[];
  totalsByDay: Record<string, number>;
  totalSeconds: number;
}

export const summarizeWeek = (
  tasks: Task[],
  sessions: TaskSession[],
  anchorDate: string,
  selectedTagIds: string[],
  tags: Tag[],
): WeeklySummary => {
  const days = weekDays(anchorDate).map((date) => toDateKey(date));
  const daySet = new Set(days);
  const validTagIds = new Set(tags.map((tag) => tag.id));
  const visibleTasks = tasks
    .filter((task) => task.tagIds.every((tagId) => validTagIds.has(tagId)))
    .filter((task) => {
      if (selectedTagIds.length === 0) {
        return true;
      }

      return selectedTagIds.every((tagId) => task.tagIds.includes(tagId));
    });

  const taskMap = new Map(visibleTasks.map((task) => [task.id, task]));
  const totalsByDay = Object.fromEntries(days.map((day) => [day, 0]));
  const taskSummaries = new Map<string, WeeklyTaskSummary>();

  for (const session of sessions) {
    if (!daySet.has(session.date)) {
      continue;
    }

    const task = taskMap.get(session.taskId);
    if (!task) {
      continue;
    }

    const durationSeconds = calculateTaskSessionDuration(session);
    if (durationSeconds === 0) {
      continue;
    }

    const summary = taskSummaries.get(task.id) ?? {
      taskId: task.id,
      taskName: task.name,
      tagIds: task.tagIds,
      byDay: Object.fromEntries(days.map((day) => [day, 0])),
      totalSeconds: 0,
    };

    summary.byDay[session.date] += durationSeconds;
    summary.totalSeconds += durationSeconds;
    taskSummaries.set(task.id, summary);
    totalsByDay[session.date] += durationSeconds;
  }

  const totalSeconds = Object.values(totalsByDay).reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    days,
    tasks: visibleTasks
      .map((task) => taskSummaries.get(task.id))
      .filter((summary): summary is WeeklyTaskSummary => Boolean(summary)),
    totalsByDay,
    totalSeconds,
  };
};

/**
 * Summarize time data for a single day.
 * Used for grid view where we display one day at a time.
 */
export interface DaySummary {
  day: string;
  tasks: WeeklyTaskSummary[];
  totalSeconds: number;
}

export const summarizeDay = (
  tasks: Task[],
  sessions: TaskSession[],
  day: string,
  selectedTagIds: string[],
  tags: Tag[],
): DaySummary => {
  const validTagIds = new Set(tags.map((tag) => tag.id));
  const visibleTasks = tasks
    .filter((task) => task.tagIds.every((tagId) => validTagIds.has(tagId)))
    .filter((task) => {
      if (selectedTagIds.length === 0) {
        return true;
      }

      return selectedTagIds.every((tagId) => task.tagIds.includes(tagId));
    });

  const taskMap = new Map(visibleTasks.map((task) => [task.id, task]));
  const taskSummaries = new Map<string, WeeklyTaskSummary>();
  let totalSeconds = 0;

  for (const session of sessions) {
    // Only include sessions from this specific day
    if (!isSameDay(session.date, day)) {
      continue;
    }

    const task = taskMap.get(session.taskId);
    if (!task) {
      continue;
    }

    const durationSeconds = calculateTaskSessionDuration(session);
    if (durationSeconds === 0) {
      continue;
    }

    const summary = taskSummaries.get(task.id) ?? {
      taskId: task.id,
      taskName: task.name,
      tagIds: task.tagIds,
      byDay: { [day]: 0 },
      totalSeconds: 0,
    };

    summary.byDay[day] = (summary.byDay[day] ?? 0) + durationSeconds;
    summary.totalSeconds += durationSeconds;
    taskSummaries.set(task.id, summary);
    totalSeconds += durationSeconds;
  }

  return {
    day,
    tasks: visibleTasks
      .map((task) => taskSummaries.get(task.id))
      .filter((summary): summary is WeeklyTaskSummary => Boolean(summary)),
    totalSeconds,
  };
};
