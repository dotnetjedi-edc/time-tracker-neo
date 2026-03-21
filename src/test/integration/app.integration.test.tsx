import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { TaskCard } from "../../components/TaskCard";
import {
  migratePersistedState,
  useTimeTrackerStore,
} from "../../store/useTimeTrackerStore";

describe("Time Tracker integration", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("creates tags and tasks, runs a timer, then exposes the result in the weekly view", async () => {
    const user = userEvent.setup();
    render(<App />);

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

    expect(screen.getByText("Session client")).toBeInTheDocument();

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

    expect(screen.getByText("00:00:01")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /vue calendrier/i }));

    expect(
      screen.getByRole("heading", {
        name: /temps passé par tâche et par jour/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Session client")).toBeInTheDocument();
    expect(screen.getAllByText(/client/i).length).toBeGreaterThan(0);
  }, 15000);

  it("filters the task grid by selected tags", async () => {
    const user = userEvent.setup();
    render(<App />);

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

    await user.click(screen.getByRole("button", { name: /^client$/i }));

    expect(screen.getByText("Mission client")).toBeInTheDocument();
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  }, 10000);

  it("keeps header actions visible while the compact header shows an active timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: 1,
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
            id: 1,
            name: "Client",
            color: "blue",
            createdAt: "2026-03-20T08:00:00.000Z",
          },
        ],
        timeEntries: [],
        activeTimer: {
          taskId: 1,
          startTime: "2026-03-20T09:30:00.000Z",
          updatedAt: "2026-03-20T09:30:00.000Z",
        },
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );

    render(<App />);

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
            id: 1,
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
          taskId: 1,
          startTime: "2026-03-20T09:30:00.000Z",
          updatedAt: "2026-03-20T09:30:00.000Z",
        },
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );

    render(<App />);

    expect(screen.getByText(/^chrono actif$/i)).toBeInTheDocument();
    expect(screen.getAllByText("Session client").length).toBeGreaterThan(0);
    expect(screen.getAllByText("00:30:00").length).toBeGreaterThan(0);
    expect(screen.getByText(/actif depuis/i)).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /arrêter le chrono actif/i }).click();
    });

    expect(screen.queryByText(/^chrono actif$/i)).not.toBeInTheDocument();
    expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
    expect(useTimeTrackerStore.getState().tasks[0]?.totalTimeSeconds).toBe(
      1800,
    );
    expect(screen.getByText("00:30:00")).toBeInTheDocument();

    vi.useRealTimers();
  }, 10000);

  it("renders compact mobile-ready task cards without hiding core actions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: 1,
            name: "Préparation atelier client mobile prioritaire",
            comment:
              "Synthèse, validation, ajustements et partage des décisions",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: [1, 2],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
        ],
        tags: [
          {
            id: 1,
            name: "Client",
            color: "blue",
            createdAt: "2026-03-20T08:00:00.000Z",
          },
          {
            id: 2,
            name: "Mobile",
            color: "green",
            createdAt: "2026-03-20T08:05:00.000Z",
          },
        ],
        timeEntries: [],
        activeTimer: {
          taskId: 1,
          startTime: "2026-03-20T09:30:00.000Z",
          updatedAt: "2026-03-20T09:30:00.000Z",
        },
        selectedTagIds: [],
        currentView: "grid",
        reportAnchor: "2026-03-20",
      }),
    );

    render(<App />);

    const taskCard = screen.getByTestId("task-card-1");

    expect(taskCard.className).toContain("min-h-[176px]");
    expect(taskCard.className).toContain("p-3.5");
    expect(
      within(taskCard).getByText(
        /préparation atelier client mobile prioritaire/i,
      ),
    ).toBeVisible();
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
      within(taskCard).getByRole("button", {
        name: /modifier préparation atelier client mobile prioritaire/i,
      }),
    ).toBeVisible();
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
            id: 1,
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

    render(<App />);

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
      within(taskCard).getByRole("button", {
        name: /modifier préparation atelier/i,
      }),
    );
    expect(
      screen.getByRole("dialog", { name: /modifier la tâche/i }),
    ).toBeInTheDocument();
  }, 10000);

  it("starts, switches, and stops timers from simple task-card clicks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00.000Z"));

    useTimeTrackerStore.setState(
      migratePersistedState({
        tasks: [
          {
            id: 1,
            name: "Alpha",
            comment: "Première tâche",
            totalTimeSeconds: 0,
            position: 0,
            tagIds: [],
            createdAt: "2026-03-20T09:00:00.000Z",
            updatedAt: "2026-03-20T09:00:00.000Z",
          },
          {
            id: 2,
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

    render(<App />);

    const alphaCard = screen.getByTestId("task-card-1");
    const betaCard = screen.getByTestId("task-card-2");

    fireEvent.click(alphaCard);
    expect(within(alphaCard).getByText(/^actif$/i)).toBeVisible();
    expect(useTimeTrackerStore.getState().activeTimer?.taskId).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    fireEvent.click(betaCard);
    expect(within(betaCard).getByText(/^actif$/i)).toBeVisible();
    expect(within(alphaCard).getByText(/^prêt$/i)).toBeVisible();
    expect(useTimeTrackerStore.getState().activeTimer?.taskId).toBe(2);
    expect(useTimeTrackerStore.getState().tasks[0]?.totalTimeSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(betaCard);
    expect(useTimeTrackerStore.getState().activeTimer).toBeNull();
    expect(within(betaCard).getByText(/^prêt$/i)).toBeVisible();
    expect(useTimeTrackerStore.getState().tasks[1]?.totalTimeSeconds).toBe(1);

    vi.useRealTimers();
  }, 10000);

  it("ignores card clicks while drag lifecycle locking is active", () => {
    const onToggleTimer = vi.fn();

    render(
      <TaskCard
        task={{
          id: 1,
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

    fireEvent.click(screen.getByTestId("task-card-1"));

    expect(onToggleTimer).not.toHaveBeenCalled();
    expect(screen.getByText(/^actif$/i)).toBeVisible();
  }, 10000);
});
