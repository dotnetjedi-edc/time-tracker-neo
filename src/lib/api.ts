import type {
  ActiveTimer,
  SessionAuditEvent,
  SessionOrigin,
  SessionSegment,
  Tag,
  Task,
  TaskDraft,
  TaskLifecycleStatus,
  TaskSession,
} from "../types";
import { normalizeTask } from "./taskModels";

interface ApiTask {
  id: string;
  user_id: string;
  name: string;
  comment: string | null;
  total_time_seconds: number;
  position: number;
  tag_ids: string[];
  lifecycle_status: TaskLifecycleStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

interface ApiSession {
  id: string;
  user_id: string;
  task_id: string;
  origin: SessionOrigin;
  started_at: string;
  ended_at: string | null;
  date: string;
  segments: SessionSegment[];
  audit_events: SessionAuditEvent[];
  created_at: string;
  updated_at: string;
}

interface ApiActiveTimer {
  task_id: string;
  session_id: string;
  segment_start_time: string;
  updated_at: string;
}

export interface TaskUpdateInput {
  name?: string;
  comment?: string | null;
  totalTimeSeconds?: number;
  position?: number;
  tagIds?: string[];
  lifecycleStatus?: TaskLifecycleStatus;
  archivedAt?: string | null;
}

export interface TagCreateInput {
  name: string;
  color: string;
}

export interface SessionWriteInput {
  taskId: string;
  origin: SessionOrigin;
  startedAt: string;
  endedAt: string | null;
  date: string;
  segments: SessionSegment[];
  auditEvents: SessionAuditEvent[];
}

export interface SessionUpdateInput {
  startedAt?: string;
  endedAt?: string | null;
  date?: string;
  segments?: SessionSegment[];
  auditEvents?: SessionAuditEvent[];
}

export interface ActiveTimerWriteInput {
  taskId: string;
  sessionId: string;
  segmentStartTime: string;
}

export interface TimeTrackerApiClient {
  tasks: {
    list: () => Promise<Task[]>;
    create: (draft: TaskDraft) => Promise<Task>;
    update: (id: string, patch: TaskUpdateInput) => Promise<Task>;
    delete: (id: string) => Promise<void>;
  };
  tags: {
    list: () => Promise<Tag[]>;
    create: (input: TagCreateInput) => Promise<Tag>;
    update: (id: string, input: TagCreateInput) => Promise<Tag>;
    delete: (id: string) => Promise<void>;
  };
  sessions: {
    list: (taskId?: string) => Promise<TaskSession[]>;
    create: (input: SessionWriteInput) => Promise<TaskSession>;
    update: (id: string, input: SessionUpdateInput) => Promise<TaskSession>;
    delete: (id: string) => Promise<void>;
  };
  activeTimer: {
    get: () => Promise<ActiveTimer | null>;
    set: (input: ActiveTimerWriteInput) => Promise<ActiveTimer>;
    delete: () => Promise<void>;
  };
}

export type TokenGetter = () => Promise<string | null>;

const mapTask = (task: ApiTask): Task =>
  normalizeTask({
    id: task.id,
    name: task.name,
    comment: task.comment,
    totalTimeSeconds: task.total_time_seconds,
    position: task.position,
    tagIds: task.tag_ids,
    lifecycle: {
      status: task.lifecycle_status,
      archivedAt: task.archived_at,
    },
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  });

const mapTag = (tag: ApiTag): Tag => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  createdAt: tag.created_at,
});

const mapSession = (session: ApiSession): TaskSession => ({
  id: session.id,
  taskId: session.task_id,
  origin: session.origin,
  startedAt: session.started_at,
  endedAt: session.ended_at,
  date: session.date,
  segments: session.segments,
  auditEvents: session.audit_events,
  createdAt: session.created_at,
  updatedAt: session.updated_at,
});

const mapActiveTimer = (timer: ApiActiveTimer): ActiveTimer => ({
  taskId: timer.task_id,
  sessionId: timer.session_id,
  segmentStartTime: timer.segment_start_time,
  updatedAt: timer.updated_at,
});

const taskDraftToApi = (draft: TaskDraft) => ({
  name: draft.name,
  comment: draft.comment || null,
  tag_ids: draft.tagIds,
});

const taskPatchToApi = (patch: TaskUpdateInput) => ({
  name: patch.name,
  comment: patch.comment,
  total_time_seconds: patch.totalTimeSeconds,
  position: patch.position,
  tag_ids: patch.tagIds,
  lifecycle_status: patch.lifecycleStatus,
  archived_at: patch.archivedAt,
});

const sessionWriteToApi = (input: SessionWriteInput | SessionUpdateInput) => ({
  task_id: "taskId" in input ? input.taskId : undefined,
  origin: "origin" in input ? input.origin : undefined,
  started_at: input.startedAt,
  ended_at: input.endedAt,
  date: input.date,
  segments: input.segments,
  audit_events: input.auditEvents,
});

const activeTimerToApi = (input: ActiveTimerWriteInput) => ({
  task_id: input.taskId,
  session_id: input.sessionId,
  segment_start_time: input.segmentStartTime,
});

export const createTimeTrackerApiClient = (
  getToken: TokenGetter,
): TimeTrackerApiClient => {
  const apiCall = async <T>(
    method: string,
    endpoint: string,
    body?: unknown,
  ): Promise<T> => {
    const token = await getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`/api${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || `API Error: ${response.status}`);
    }

    return (await response.json()) as T;
  };

  return {
    tasks: {
      list: async () =>
        (await apiCall<ApiTask[]>("GET", "/tasks")).map(mapTask),
      create: async (draft) =>
        mapTask(
          await apiCall<ApiTask>("POST", "/tasks", taskDraftToApi(draft)),
        ),
      update: async (id, patch) =>
        mapTask(
          await apiCall<ApiTask>("PUT", `/tasks/${id}`, taskPatchToApi(patch)),
        ),
      delete: async (id) => {
        await apiCall<void>("DELETE", `/tasks/${id}`);
      },
    },
    tags: {
      list: async () => (await apiCall<ApiTag[]>("GET", "/tags")).map(mapTag),
      create: async (input) =>
        mapTag(await apiCall<ApiTag>("POST", "/tags", input)),
      update: async (id, input) =>
        mapTag(await apiCall<ApiTag>("PUT", `/tags/${id}`, input)),
      delete: async (id) => {
        await apiCall<void>("DELETE", `/tags/${id}`);
      },
    },
    sessions: {
      list: async (taskId) => {
        const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
        return (await apiCall<ApiSession[]>("GET", `/sessions${query}`)).map(
          mapSession,
        );
      },
      create: async (input) =>
        mapSession(
          await apiCall<ApiSession>(
            "POST",
            "/sessions",
            sessionWriteToApi(input),
          ),
        ),
      update: async (id, input) =>
        mapSession(
          await apiCall<ApiSession>(
            "PUT",
            `/sessions/${id}`,
            sessionWriteToApi(input),
          ),
        ),
      delete: async (id) => {
        await apiCall<void>("DELETE", `/sessions/${id}`);
      },
    },
    activeTimer: {
      get: async () => {
        const timer = await apiCall<ApiActiveTimer | null>(
          "GET",
          "/active-timer",
        );
        return timer ? mapActiveTimer(timer) : null;
      },
      set: async (input) =>
        mapActiveTimer(
          await apiCall<ApiActiveTimer>(
            "PUT",
            "/active-timer",
            activeTimerToApi(input),
          ),
        ),
      delete: async () => {
        await apiCall<void>("DELETE", "/active-timer");
      },
    },
  };
};
