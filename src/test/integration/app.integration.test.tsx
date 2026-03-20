import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

describe("Time Tracker integration", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it(
    "creates tags and tasks, runs a timer, then exposes the result in the weekly view",
    async () => {
      const user = userEvent.setup();
    render(<App />);

      await user.click(screen.getByRole("button", { name: /gérer les tags/i }));
      await user.type(screen.getByLabelText(/nom du nouveau tag/i), "Client");
      await user.click(screen.getByRole("button", { name: /ajouter/i }));
      await user.click(screen.getByRole("button", { name: /^fermer$/i }));

      await user.click(screen.getByRole("button", { name: /nouvelle tâche/i }));
      const taskDialog = screen.getByRole("dialog", { name: /nouvelle tâche/i });
      await user.type(within(taskDialog).getByLabelText(/nom de la tâche/i), "Session client");
      await user.type(within(taskDialog).getByLabelText(/commentaire de la tâche/i), "Revue hebdo");
      await user.click(within(taskDialog).getByRole("button", { name: /^client$/i }));
      await user.click(within(taskDialog).getByRole("button", { name: /créer la tâche/i }));

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
    },
    15000,
  );

  it(
    "filters the task grid by selected tags",
    async () => {
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
      await user.type(within(taskDialog).getByLabelText(/nom de la tâche/i), "Mission client");
      await user.click(within(taskDialog).getByRole("button", { name: /^client$/i }));
      await user.click(within(taskDialog).getByRole("button", { name: /créer la tâche/i }));

      await user.click(screen.getByRole("button", { name: /nouvelle tâche/i }));
      taskDialog = screen.getByRole("dialog", { name: /nouvelle tâche/i });
      await user.type(within(taskDialog).getByLabelText(/nom de la tâche/i), "Administration");
      await user.click(within(taskDialog).getByRole("button", { name: /^admin$/i }));
      await user.click(within(taskDialog).getByRole("button", { name: /créer la tâche/i }));

      await user.click(screen.getByRole("button", { name: /^client$/i }));

      expect(screen.getByText("Mission client")).toBeInTheDocument();
      expect(screen.queryByText("Administration")).not.toBeInTheDocument();
    },
    10000,
  );
});