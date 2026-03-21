import { useAuth } from "@clerk/clerk-react";

/**
 * Typed API client for communicating with backend endpoints.
 * Automatically injects Clerk auth token and converts between camelCase (frontend) and snake_case (API).
 */

export interface ApiTask {
  id: string;
  user_id: string;
  name: string;
  comment: string | null;
  total_time_seconds: number;
  position: number;
  tag_ids: string[];
  lifecycle_status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ApiSegment {
  id: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

export interface ApiAuditEvent {
  id: string;
  type: string;
  at: string;
  description: string;
}

export interface ApiSession {
  id: string;
  user_id: string;
  task_id: string;
  origin: string;
  started_at: string;
  ended_at: string | null;
  date: string;
  segments: ApiSegment[];
  audit_events: ApiAuditEvent[];
  created_at: string;
  updated_at: string;
}

export interface ApiActiveTimer {
  task_id: string;
  session_id: string;
  segment_start_time: string;
  updated_at: string;
}

export function useApiClient() {
  const { getToken } = useAuth();

  const apiCall = async <T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T | null> => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const url = `/api${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (response.status === 204) {
        return null as any;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API ${method} ${endpoint}:`, error);
      throw error;
    }
  };

  return {
    tasks: {
      list: () => apiCall<ApiTask[]>("GET", "/tasks"),
      create: (data: Partial<ApiTask>) =>
        apiCall<ApiTask>("POST", "/tasks", data),
      update: (id: string, data: Partial<ApiTask>) =>
        apiCall<ApiTask>("PUT", `/tasks/${id}`, data),
      delete: (id: string) => apiCall("DELETE", `/tasks/${id}`),
    },
    tags: {
      list: () => apiCall<ApiTag[]>("GET", "/tags"),
      create: (data: Partial<ApiTag>) => apiCall<ApiTag>("POST", "/tags", data),
      update: (id: string, data: Partial<ApiTag>) =>
        apiCall<ApiTag>("PUT", `/tags/${id}`, data),
      delete: (id: string) => apiCall("DELETE", `/tags/${id}`),
    },
    sessions: {
      list: (taskId?: string) => {
        const qs = taskId ? `?taskId=${taskId}` : "";
        return apiCall<ApiSession[]>("GET", `/sessions${qs}`);
      },
      create: (data: Partial<ApiSession>) =>
        apiCall<ApiSession>("POST", "/sessions", data),
      update: (id: string, data: Partial<ApiSession>) =>
        apiCall<ApiSession>("PUT", `/sessions/${id}`, data),
      delete: (id: string) => apiCall("DELETE", `/sessions/${id}`),
    },
    activeTimer: {
      get: () => apiCall<ApiActiveTimer | null>("GET", "/active-timer"),
      set: (data: Partial<ApiActiveTimer>) =>
        apiCall<ApiActiveTimer>("PUT", "/active-timer", data),
      delete: () => apiCall("DELETE", "/active-timer"),
    },
  };
}
