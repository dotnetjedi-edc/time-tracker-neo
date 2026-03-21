export type ViewMode = "grid" | "week";

export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}

export type TaskLifecycleStatus = "active" | "archived";

export interface TaskLifecycle {
  status: TaskLifecycleStatus;
  archivedAt: string | null;
}

export interface Task {
  id: number;
  name: string;
  comment: string | null;
  totalTimeSeconds: number;
  position: number;
  tagIds: number[];
  lifecycle?: TaskLifecycle;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  sessionId: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  date: string;
  createdAt: string;
}

export interface ActiveTimer {
  taskId: number;
  sessionId: number;
  segmentStartTime: string;
  updatedAt: string;
}

export type SessionOrigin = "timer" | "manual";

export type SessionAuditEventType =
  | "started"
  | "stopped"
  | "resumed"
  | "manual-added"
  | "manually-edited"
  | "migrated";

export interface SessionSegment {
  id: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

export interface SessionAuditEvent {
  id: number;
  type: SessionAuditEventType;
  at: string;
  description: string;
}

export interface TaskSession {
  id: number;
  taskId: number;
  origin: SessionOrigin;
  startedAt: string;
  endedAt: string | null;
  date: string;
  segments: SessionSegment[];
  auditEvents: SessionAuditEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  name: string;
  comment: string;
  tagIds: number[];
}

export interface SessionDraft {
  startTime: string;
  endTime: string;
}

export interface WeeklyTaskSummary {
  taskId: number;
  taskName: string;
  tagIds: number[];
  byDay: Record<string, number>;
  totalSeconds: number;
}
