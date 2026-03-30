import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimeTrackerApiClient } from "../../lib/api";
import type { ActiveTimer, Tag, Task, TaskSession } from "../../types";
import App from "../../App";
import { TaskCard } from "../../components/TaskCard";
import {
  migratePersistedState,
  useTimeTrackerStore,
} from "../../store/useTimeTrackerStore";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toNumericId(value: string): number {
  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

let mockWorkspace: {
  tasks: Task[];
  tags: Tag[];
  sessions: TaskSession[];
  activeTimer: ActiveTimer | null;
} = {
  tasks: [],
  tags: [],
  sessions: [],
  activeTimer: null,
};

function resetMockWorkspace(): void {
  mockWorkspace = {
    tasks: [],
    tags: [],
    sessions: [],
    activeTimer: null,
  };
}

function syncMockWorkspaceFromStore(): void {
  const state = useTimeTrackerStore.getState();
  mockWorkspace = {
    tasks: clone(state.tasks),
    tags: clone(state.tags),
    sessions: clone(state.sessions),
    activeTimer: clone(state.activeTimer),
  };
}

function createMockApiClient(): TimeTrackerApiClient {
  let nextTaskId =
    Math.max(0, ...mockWorkspace.tasks.map((task) => toNumericId(task.id))) + 1;
  let nextTagId =
    Math.max(0, ...mockWorkspace.tags.map((tag) => toNumericId(tag.id))) + 1;
  let nextSessionId =
    Math.max(
      0,
      ...mockWorkspace.sessions.map((session) => toNumericId(session.id)),
    ) + 1;

  return {
    tasks: {
      list: async () => clone(mockWorkspace.tasks),
      create: async (draft) => {
        const now = new Date().toISOString();
        const task: Task = {
          id: String(nextTaskId++),
          name: draft.name,
          comment: draft.comment || null,
          totalTimeSeconds: 0,
          position: mockWorkspace.tasks.length,
          tagIds: clone(draft.tagIds),
          lifecycle: {
            status: "active",
            archivedAt: null,
          },
          createdAt: now,
          updatedAt: now,
        };
        mockWorkspace.tasks = [...mockWorkspace.tasks, task];
        return clone(task);
      },
      update: async (id, patch) => {
        const existing = mockWorkspace.tasks.find((task) => task.id === id);
        if (!existing) {
          throw new Error("Task not found");
        }

        const task: Task = {
          ...existing,
          name: patch.name ?? existing.name,
          comment:
            patch.comment === undefined ? existing.comment : patch.comment,
          totalTimeSeconds: patch.totalTimeSeconds ?? existing.totalTimeSeconds,
          position: patch.position ?? existing.position,
          tagIds: patch.tagIds ?? existing.tagIds,
          lifecycle: {
            status:
              patch.lifecycleStatus ?? existing.lifecycle?.status ?? "active",
            archivedAt:
              patch.archivedAt === undefined
                ? (existing.lifecycle?.archivedAt ?? null)
                : patch.archivedAt,
          },
          updatedAt: new Date().toISOString(),
        };
        mockWorkspace.tasks = mockWorkspace.tasks.map((candidate) =>
          candidate.id === id ? task : candidate,
        );
        return clone(task);
      },
      delete: async (id) => {
        mockWorkspace.tasks = mockWorkspace.tasks.filter(
          (task) => task.id !== id,
        );
        mockWorkspace.sessions = mockWorkspace.sessions.filter(
          (session) => session.taskId !== id,
        );
        if (mockWorkspace.activeTimer?.taskId === id) {
          mockWorkspace.activeTimer = null;
        }
      },
    },
    tags: {
      list: async () => clone(mockWorkspace.tags),
      create: async (input) => {
        const tag: Tag = {
          id: String(nextTagId++),
          name: input.name,
          color: input.color,
          createdAt: new Date().toISOString(),
        };
        mockWorkspace.tags = [...mockWorkspace.tags, tag];
        return clone(tag);
      },
      update: async (id, input) => {
        const existing = mockWorkspace.tags.find((tag) => tag.id === id);
        if (!existing) {
          throw new Error("Tag not found");
        }

        const tag: Tag = {
          ...existing,
          name: input.name,
          color: input.color,
        };
        mockWorkspace.tags = mockWorkspace.tags.map((candidate) =>
          candidate.id === id ? tag : candidate,
        );
        return clone(tag);
      },
      delete: async (id) => {
        mockWorkspace.tags = mockWorkspace.tags.filter((tag) => tag.id !== id);
        mockWorkspace.tasks = mockWorkspace.tasks.map((task) => ({
          ...task,
          tagIds: task.tagIds.filter((tagId) => tagId !== id),
        }));
      },
    },
    sessions: {
      list: async (taskId) =>
        clone(
          taskId
            ? mockWorkspace.sessions.filter(
                (session) => session.taskId === taskId,
              )
            : mockWorkspace.sessions,
        ),
      create: async (input) => {
        const timestamp = input.endedAt ?? input.startedAt;
        const session: TaskSession = {
          id: String(nextSessionId++),
          taskId: input.taskId,
          origin: input.origin,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          date: input.date,
          segments: clone(input.segments),
          auditEvents: clone(input.auditEvents),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        mockWorkspace.sessions = [...mockWorkspace.sessions, session];
        return clone(session);
      },
      update: async (id, input) => {
        const existing = mockWorkspace.sessions.find(
          (session) => session.id === id,
        );
        if (!existing) {
          throw new Error("Session not found");
        }

        const session: TaskSession = {
          ...existing,
          startedAt: input.startedAt ?? existing.startedAt,
          endedAt:
            input.endedAt === undefined ? existing.endedAt : input.endedAt,
          date: input.date ?? existing.date,
          segments: input.segments ?? existing.segments,
          auditEvents: input.auditEvents ?? existing.auditEvents,
          updatedAt: input.endedAt ?? existing.updatedAt,
        };
        mockWorkspace.sessions = mockWorkspace.sessions.map((candidate) =>
          candidate.id === id ? session : candidate,
        );
        return clone(session);
      },
      delete: async (id) => {
        mockWorkspace.sessions = mockWorkspace.sessions.filter(
          (session) => session.id !== id,
        );
        if (mockWorkspace.activeTimer?.sessionId === id) {
          mockWorkspace.activeTimer = null;
        }
      },
    },
    activeTimer: {
      get: async () => clone(mockWorkspace.activeTimer),
      set: async (input) => {
        mockWorkspace.activeTimer = {
          taskId: input.taskId,
          sessionId: input.sessionId,
          segmentStartTime: input.segmentStartTime,
          updatedAt: input.segmentStartTime,
        };
        return clone(mockWorkspace.activeTimer);
      },
      delete: async () => {
        mockWorkspace.activeTimer = null;
      },
    },
  };
}

vi.mock("@clerk/clerk-react", () => ({
  ClerkLoaded: ({ children }: { children: ReactNode }) => children,
  ClerkLoading: () => null,
  SignIn: () => null,
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: () => null,
  useAuth: () => ({
    isLoaded: true,
    userId: "test-user",
    getToken: async () => "test-token",
  }),
}));

vi.mock("../../lib/api", () => ({
  createTimeTrackerApiClient: () => createMockApiClient(),
}));

async function renderApp(): Promise<void> {
  render(<App />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("Time Tracker integration", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetMockWorkspace();
  });

  it("creates tags and tasks, runs a timer, then exposes the result in the weekly view", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole("button", { name: /gérer les tags/i }));
    await user.type(screen.getByLabelText(/nom du nouveau tag/i), "Client");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));
    await user.click(screen.getByRole("button", { name: /^fermer$/i }));

    await user.click(screen.getByRole("button", { name: /nouvelle tâche/i }));
    const taskDialog = screen.getByRole("dialog", { name: /nouvelle tâche/i });
    await user.type(
      within(taskDialog).getByLabelText(/nom de la tâche/i),
      "Session client",
    );
    await user.type(
      within(taskDialog).getByLabelText(/commentaire de la tâche/i),
      "Revue hebdo",
    );
    await user.click(
      within(taskDialog).getByRole("button", { name: /^client$/i }),
    );
    await user.click(
      within(taskDialog).getByRole("button", { name: /créer la tâche/i }),
    );

    expect(await screen.findAllByText("Session client")).not.toHaveLength(0);

    await user.click(
      screen.getByRole("button", {
        name: /basculer le chrono pour session client/i,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    });
    await user.click(
      screen.getByRole("button", {
        name: /basculer le chrono pour session client/i,
      }),
    );

    expect(screen.getAllByText("00:00:01").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /vue calendrier/i }));

    expect(
      screen.getByRole("heading", {
        name: /temps passé par tâche et par jour/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Session client").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/client/i).length).toBeGreaterThan(0);
  }, 15000);

  it("filters the task grid by selected tags", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole("button", { name: /gérer les tags/i }));
    await user.type(screen.getByLabelText(/nom du nouveau tag/i), "Client");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));
    await user.type(screen.getByLabelText(/nom du nouveau tag/i), "Admin");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));
    await user.click(screen.getByRole("button", { name: /^fermer$/i }));

    await user.click(screen.getByRole("button", { name: /nouvelle tâche/i }));
    let taskDialog = screen.getByRole("dialog", { name: /nouvelle tâche/i });
    await user.type(
      within(taskDialog).getByLabelText(/nom de la tâche/i),
      "Mission client",
    );
    await user.click(
      within(taskDialog).getByRole("button", { name: /^client$/i }),
    );
    await user.click(
      within(taskDialog).getByRole("button", { name: /créer la tâche/i }),
    );
    expect(await screen.findAllByText("Mission client")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /nouvelle tâche/i }));
    taskDialog = screen.getByRole("dialog", { name: /nouvelle tâche/i });
    await user.type(
      within(taskDialog).getByLabelText(/nom de la tâche/i),
      "Administration",
    );
    await user.click(
      within(taskDialog).getByRole("button", { name: /^admin$/i }),
    );
    await user.click(
      within(taskDialog).getByRole("button", { name: /créer la tâche/i }),
    );
    expect(await screen.findAllByText("Administration")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /^client$/i }));

    expect(screen.getAllByText("Mission client").length).toBeGreaterThan(0);
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  }, 10000);

  it("keeps header actions visible while the compact header shows an active timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: "1",
            name: "Session client",
            comment: "Reprise après refresh",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: [],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
        ],
        tags: [
          {
            id: "1",
            name: "Client",
            color: "blue",
            createdAt: "2026-03-20T08:00:00.000Z",
          },
        ],
        timeEntries: [],
        activeTimer: {
          taskId: "1",
          startTime: "2026-03-20T09:30:00.000Z",
          updatedAt: "2026-03-20T09:30:00.000Z",
        },
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );
    syncMockWorkspaceFromStore();

    await renderApp();

    expect(screen.getByText(/^chrono actif$/i)).toBeInTheDocument();
    expect(
      within(screen.getByRole("banner")).getByText(/session client/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /vue calendrier/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /gérer les tags/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /réinitialiser les filtres/i }),
    ).toBeVisible();
    expect(screen.getByText(/^filtres$/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /arrêter le chrono actif/i }),
    ).toBeVisible();

    vi.useRealTimers();
  }, 10000);

  it("shows a recovered active timer globally and lets the user stop it manually", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: "1",
            name: "Session client",
            comment: "Reprise après refresh",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: [],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
        ],
        tags: [],
        timeEntries: [],
        activeTimer: {
          taskId: "1",
          startTime: "2026-03-20T09:30:00.000Z",
          updatedAt: "2026-03-20T09:30:00.000Z",
        },
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );
    syncMockWorkspaceFromStore();

    await renderApp();

    expect(screen.getByText(/^chrono actif$/i)).toBeInTheDocument();
    expect(screen.getAllByText("Session client").length).toBeGreaterThan(0);
    expect(screen.getAllByText("00:30:00").length).toBeGreaterThan(0);
    expect(screen.getByText(/actif depuis/i)).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: /arrêter le chrono actif/i }).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/^chrono actif$/i)).not.toBeInTheDocument();
    expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
    expect(useTimeTrackerStore.getState().tasks[0]?.totalTimeSeconds).toBe(
      1800,
    );
    expect(screen.getAllByText("00:30:00").length).toBeGreaterThan(0);

    vi.useRealTimers();
  }, 10000);

  it("renders compact mobile-ready task cards without hiding core actions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: "1",
            name: "Préparation atelier client mobile prioritaire",
            comment:
              "Synthèse, validation, ajustements et partage des décisions",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: ["1", "2"],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
        ],
        tags: [
          {
            id: "1",
            name: "Client",
            color: "blue",
            createdAt: "2026-03-20T08:00:00.000Z",
          },
          {
            id: "2",
            name: "Mobile",
            color: "green",
            createdAt: "2026-03-20T08:05:00.000Z",
          },
        ],
        timeEntries: [],
        activeTimer: {
          taskId: "1",
          startTime: "2026-03-20T09:30:00.000Z",
          updatedAt: "2026-03-20T09:30:00.000Z",
        },
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );
    syncMockWorkspaceFromStore();

    await renderApp();

    const taskCard = screen.getByTestId("task-card-1");

    expect(taskCard.className).toContain("sm:min-h-[220px]");
    expect(taskCard.className).toContain("px-3");
    expect(
      within(taskCard).getAllByText(
        /préparation atelier client mobile prioritaire/i,
      )[0],
    ).toBeInTheDocument();
    expect(
      within(taskCard).getByText(/synthèse, validation, ajustements/i),
    ).toBeVisible();
    expect(within(taskCard).getByText(/^client$/i)).toBeVisible();
    expect(within(taskCard).getByText(/^mobile$/i)).toBeVisible();
    expect(
      within(taskCard).getByRole("button", {
        name: /réorganiser préparation atelier client mobile prioritaire/i,
      }),
    ).toBeVisible();
    expect(
      within(taskCard).getAllByRole("button", {
        name: /modifier préparation atelier client mobile prioritaire/i,
      })[0],
    ).toBeInTheDocument();
    expect(
      within(taskCard).getByRole("button", {
        name: /basculer le chrono pour préparation atelier client mobile prioritaire/i,
      }),
    ).toBeVisible();
    expect(
      within(taskCard).getByRole("button", { name: /temps manuel/i }),
    ).toBeVisible();
    expect(
      within(taskCard).getByRole("button", { name: /historique/i }),
    ).toBeVisible();

    vi.useRealTimers();
  }, 10000);

  it("keeps secondary task actions operable while the main card surface stays interactive", async () => {
    const user = userEvent.setup();

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: "1",
            name: "Préparation atelier",
            comment: "Coordination client",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: [],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
        ],
        tags: [],
        timeEntries: [],
        activeTimer: null,
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );
    syncMockWorkspaceFromStore();

    await renderApp();

    const taskCard = screen.getByTestId("task-card-1");

    await user.click(
      within(taskCard).getByRole("button", { name: /temps manuel/i }),
    );
    expect(
      screen.getByRole("dialog", {
        name: /temps et historique pour préparation atelier/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^fermer$/i }));

    await user.click(
      within(taskCard).getAllByRole("button", {
        name: /modifier préparation atelier/i,
      })[0],
    );
    expect(
      screen.getByRole("dialog", { name: /modifier la tâche/i }),
    ).toBeInTheDocument();
  }, 10000);

  it("starts, switches, and stops timers from task-card toggle button clicks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: "1",
            name: "Alpha",
            comment: "Première tâche",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: [],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
          {
            id: "2",
            name: "Beta",
            comment: "Deuxième tâche",
            totalTimeSeconds: 0,
            position: 1,
            tagIds: [],
            createdAt: "2026-03-20T09:05:00.000Z",
            updatedAt: "2026-03-20T09:05:00.000Z",
          },
        ],
        tags: [],
        timeEntries: [],
        activeTimer: null,
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );
    syncMockWorkspaceFromStore();

    await renderApp();

    const alphaCard = screen.getByTestId("task-card-1");
    const betaCard = screen.getByTestId("task-card-2");

    await act(async () => {
      fireEvent.click(
        within(alphaCard).getByRole("button", {
          name: /basculer le chrono pour alpha/i,
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(within(alphaCard).getAllByText(/^actif$/i).length).toBeGreaterThan(0);
    expect(useTimeTrackerStore.getState().activeTimer?.taskId).toBe("1");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      fireEvent.click(
        within(betaCard).getByRole("button", {
          name: /basculer le chrono pour beta/i,
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(within(betaCard).getAllByText(/^actif$/i).length).toBeGreaterThan(0);
    expect(within(alphaCard).getAllByText(/^prêt$/i).length).toBeGreaterThan(0);
    expect(useTimeTrackerStore.getState().activeTimer?.taskId).toBe("2");
    expect(useTimeTrackerStore.getState().tasks[0]?.totalTimeSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      fireEvent.click(
        within(betaCard).getByRole("button", {
          name: /basculer le chrono pour beta/i,
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
    expect(within(betaCard).getAllByText(/^prêt$/i).length).toBeGreaterThan(0);
    expect(useTimeTrackerStore.getState().tasks[1]?.totalTimeSeconds).toBe(1);

    vi.useRealTimers();
  }, 10000);

  it("ignores toggle button clicks while drag lifecycle locking is active", () => {
    const onToggleTimer = vi.fn();

    render(
      <TaskCard
        task={{
          id: "1",
          name: "Alpha",
          comment: "Tâche active",
          totalTimeSeconds: 0,
          position: 0,
          tagIds: [],
          createdAt: "2026-03-20T09:00:00.000Z",
          updatedAt: "2026-03-20T09:00:00.000Z",
        }}
        taskTags={[]}
        isActive
        isTimerToggleLocked
        liveSeconds={10}
        onToggleTimer={onToggleTimer}
        onEdit={vi.fn()}
        onOpenManualTime={vi.fn()}
        onOpenHistory={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /basculer le chrono pour alpha/i }),
    );

    expect(onToggleTimer).not.toHaveBeenCalled();
    expect(screen.getAllByText(/^actif$/i).length).toBeGreaterThan(0);
  }, 10000);
});
