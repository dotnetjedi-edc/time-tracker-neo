export type ViewMode = "grid" | "week";

export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: number;
  name: string;
  comment: string | null;
  totalTimeSeconds: number;
  position: number;
  tagIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  date: string;
  createdAt: string;
}

export interface ActiveTimer {
  taskId: number;
  startTime: string;
  updatedAt: string;
}

export interface TaskDraft {
  name: string;
  comment: string;
  tagIds: number[];
}

export interface WeeklyTaskSummary {
  taskId: number;
  taskName: string;
  tagIds: number[];
  byDay: Record<string, number>;
  totalSeconds: number;
}
