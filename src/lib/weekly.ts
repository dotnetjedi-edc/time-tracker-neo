import type { Tag, Task, TimeEntry, WeeklyTaskSummary } from "../types";
import { toDateKey, weekDays } from "./time";

export interface WeeklySummary {
  days: string[];
  tasks: WeeklyTaskSummary[];
  totalsByDay: Record<string, number>;
  totalSeconds: number;
}

export const summarizeWeek = (
  tasks: Task[],
  entries: TimeEntry[],
  anchorDate: string,
  selectedTagIds: number[],
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
  const taskSummaries = new Map<number, WeeklyTaskSummary>();

  for (const entry of entries) {
    if (!daySet.has(entry.date)) {
      continue;
    }

    const task = taskMap.get(entry.taskId);
    if (!task) {
      continue;
    }

    const summary = taskSummaries.get(task.id) ?? {
      taskId: task.id,
      taskName: task.name,
      tagIds: task.tagIds,
      byDay: Object.fromEntries(days.map((day) => [day, 0])),
      totalSeconds: 0,
    };

    summary.byDay[entry.date] += entry.durationSeconds;
    summary.totalSeconds += entry.durationSeconds;
    taskSummaries.set(task.id, summary);
    totalsByDay[entry.date] += entry.durationSeconds;
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
