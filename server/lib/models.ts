type DatabaseRow = Record<string, unknown>;

const parseJsonArray = <T>(value: unknown): T[] => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const mapTaskRow = (row: DatabaseRow) => ({
  id: String(row.id),
  user_id: String(row.user_id),
  name: String(row.name),
  comment: row.comment === null ? null : String(row.comment ?? ""),
  total_time_seconds: toNumber(row.total_time_seconds),
  position: toNumber(row.position),
  tag_ids: parseJsonArray<string>(row.tag_ids),
  lifecycle_status: String(row.lifecycle_status ?? "active"),
  archived_at: row.archived_at === null ? null : String(row.archived_at ?? ""),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const mapTagRow = (row: DatabaseRow) => ({
  id: String(row.id),
  user_id: String(row.user_id),
  name: String(row.name),
  color: String(row.color),
  created_at: String(row.created_at),
});

export const mapSessionRow = (row: DatabaseRow) => ({
  id: String(row.id),
  user_id: String(row.user_id),
  task_id: String(row.task_id),
  origin: String(row.origin),
  started_at: String(row.started_at),
  ended_at: row.ended_at === null ? null : String(row.ended_at ?? ""),
  date: String(row.date),
  segments: parseJsonArray(row.segments),
  audit_events: parseJsonArray(row.audit_events),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const mapActiveTimerRow = (row: DatabaseRow) => ({
  task_id: String(row.task_id),
  session_id: String(row.session_id),
  segment_start_time: String(row.segment_start_time),
  updated_at: String(row.updated_at),
});