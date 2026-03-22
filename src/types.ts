export type ViewMode = "grid" | "week";

export interface Tag {
  id: string;
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
  id: string;
  name: string;
  comment: string | null;
  totalTimeSeconds: number;
  position: number;
  tagIds: string[];
  lifecycle?: TaskLifecycle;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  date: string;
  createdAt: string;
}

export interface ActiveTimer {
  taskId: string;
  sessionId: string;
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
  id: string;
  taskId: string;
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
  tagIds: string[];
}

export interface SessionDraft {
  startTime: string;
  endTime: string;
}

export interface WeeklyTaskSummary {
  taskId: string;
  taskName: string;
  tagIds: string[];
  byDay: Record<string, number>;
  totalSeconds: number;
}
