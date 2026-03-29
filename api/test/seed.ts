import { randomUUID } from "crypto";
import { getDb } from "../../server/lib/db.js";
import { createRequestHandler } from "../../server/lib/request-handler.js";

const isE2EBypassEnabled = process.env.E2E_BYPASS_AUTH === "true";
const e2eUserId = process.env.E2E_BYPASS_USER_ID ?? "e2e-user";

interface SeedTagInput {
  id?: string;
  name: string;
  color: string;
  createdAt?: string;
}

interface SeedTaskInput {
  id?: string;
  name: string;
  comment?: string | null;
  totalTimeSeconds?: number;
  position?: number;
  tagIds?: string[];
  lifecycleStatus?: "active" | "archived";
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface SeedSessionInput {
  id?: string;
  taskId: string;
  origin?: "timer" | "manual";
  startedAt: string;
  endedAt?: string | null;
  date?: string;
  segments?: unknown[];
  auditEvents?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

interface SeedActiveTimerInput {
  taskId: string;
  sessionId: string;
  segmentStartTime: string;
  updatedAt?: string;
}

interface SeedBody {
  tags?: SeedTagInput[];
  tasks?: SeedTaskInput[];
  sessions?: SeedSessionInput[];
  activeTimer?: SeedActiveTimerInput | null;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toIsoNow = () => new Date().toISOString();

const toDateKey = (isoString: string) => isoString.slice(0, 10);

const parseSeedBody = (value: unknown): SeedBody | null => {
  if (!isObject(value)) {
    return null;
  }

  const tags = value.tags;
  const tasks = value.tasks;
  const sessions = value.sessions;
  const activeTimer = value.activeTimer;

  if (tags !== undefined && !Array.isArray(tags)) {
    return null;
  }

  if (tasks !== undefined && !Array.isArray(tasks)) {
    return null;
  }

  if (sessions !== undefined && !Array.isArray(sessions)) {
    return null;
  }

  if (activeTimer !== undefined && activeTimer !== null && !isObject(activeTimer)) {
    return null;
  }

  return {
    tags: tags as SeedTagInput[] | undefined,
    tasks: tasks as SeedTaskInput[] | undefined,
    sessions: sessions as SeedSessionInput[] | undefined,
    activeTimer: activeTimer as SeedActiveTimerInput | null | undefined,
  };
};

export default createRequestHandler(
  async (req, res) => {
    if (!isE2EBypassEnabled) {
      return res.status(404).json({ error: "Not found" });
    }

    const body = parseSeedBody(req.body);
    if (!body) {
      return res.status(400).json({ error: "Invalid seed payload" });
    }

    const db = getDb();
    const createdTagIds: string[] = [];
    const createdTaskIds: string[] = [];
    const createdSessionIds: string[] = [];

    for (const tag of body.tags ?? []) {
      const id = tag.id ?? randomUUID();
      const createdAt = tag.createdAt ?? toIsoNow();
      await db.execute(
        "INSERT INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)",
        [id, e2eUserId, tag.name, tag.color, createdAt],
      );
      createdTagIds.push(id);
    }

    for (const [index, task] of (body.tasks ?? []).entries()) {
      const id = task.id ?? randomUUID();
      const createdAt = task.createdAt ?? toIsoNow();
      const updatedAt = task.updatedAt ?? createdAt;
      await db.execute(
        `INSERT INTO tasks (
          id, user_id, name, comment, total_time_seconds, position,
          tag_ids, lifecycle_status, archived_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          e2eUserId,
          task.name,
          task.comment ?? null,
          task.totalTimeSeconds ?? 0,
          task.position ?? index,
          JSON.stringify(task.tagIds ?? []),
          task.lifecycleStatus ?? "active",
          task.archivedAt ?? null,
          createdAt,
          updatedAt,
        ],
      );
      createdTaskIds.push(id);
    }

    for (const session of body.sessions ?? []) {
      const id = session.id ?? randomUUID();
      const createdAt = session.createdAt ?? session.startedAt;
      const updatedAt = session.updatedAt ?? session.endedAt ?? session.startedAt;
      await db.execute(
        `INSERT INTO sessions (
          id, user_id, task_id, origin, started_at, ended_at, date,
          segments, audit_events, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          e2eUserId,
          session.taskId,
          session.origin ?? "manual",
          session.startedAt,
          session.endedAt ?? null,
          session.date ?? toDateKey(session.startedAt),
          JSON.stringify(session.segments ?? []),
          JSON.stringify(session.auditEvents ?? []),
          createdAt,
          updatedAt,
        ],
      );
      createdSessionIds.push(id);
    }

    if (body.activeTimer) {
      await db.execute(
        `INSERT OR REPLACE INTO active_timers (
          user_id, task_id, session_id, segment_start_time, updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          e2eUserId,
          body.activeTimer.taskId,
          body.activeTimer.sessionId,
          body.activeTimer.segmentStartTime,
          body.activeTimer.updatedAt ?? body.activeTimer.segmentStartTime,
        ],
      );
    }

    return res.status(201).json({
      userId: e2eUserId,
      createdTagIds,
      createdTaskIds,
      createdSessionIds,
      activeTimer: body.activeTimer ?? null,
    });
  },
  {
    allowedMethods: ["POST"],
    requiresAuth: false,
  },
);