import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("creates a tag and a task, runs the timer and exposes weekly totals", async ({ page }) => {
  await page.getByRole("button", { name: /gérer les tags/i }).click();
  const tagsDialog = page.getByRole("dialog", { name: /gestion des tags/i });
  await tagsDialog.getByLabel("Nom du nouveau tag").fill("Client");
  await tagsDialog.getByRole("button", { name: /ajouter/i }).click();
  await tagsDialog.getByRole("button", { name: /^fermer$/i }).click();

  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  const taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Session client");
  await taskDialog.getByLabel("Commentaire de la tâche").fill("Point projet");
  await taskDialog.getByRole("button", { name: /^client$/i }).click();
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await expect(page.getByText("Session client")).toBeVisible();

  await page
    .getByRole("button", { name: /basculer le chrono pour session client/i })
    .click({ force: true });
  await page.waitForTimeout(2100);
  await page
    .getByRole("button", { name: /basculer le chrono pour session client/i })
    .click({ force: true });

  await expect(page.getByText("00:00:02")).toBeVisible();

  await page.getByRole("button", { name: /vue calendrier/i }).click();
  await expect(page.getByRole("heading", { name: /temps passé par tâche et par jour/i })).toBeVisible();
  await expect(page.getByText("Session client")).toBeVisible();
});

test("reload stops an active timer and persists the accumulated time", async ({ page }) => {
  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  const taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Focus");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await page.getByRole("button", { name: /basculer le chrono pour focus/i }).click({ force: true });
  await page.waitForTimeout(1200);
  await page.reload();

  await expect(page.getByText("Focus")).toBeVisible();
  await expect(page.getByText("00:00:01")).toBeVisible();
  await expect(page.getByText("Prêt")).toBeVisible();
});

test("allows manual time entry and exposes task history", async ({ page }) => {
  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  let taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Production");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Lecture");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await page
    .getByRole("button", { name: /basculer le chrono pour production/i })
    .click({ force: true });

  const lectureCard = page.getByTestId("task-card-2");
  await lectureCard.getByRole("button", { name: /temps manuel/i }).click();

  const sessionsDialog = page.getByRole("dialog", {
    name: /temps et historique pour lecture/i,
  });
  await sessionsDialog.getByLabel("Début de session").fill("2026-03-19T09:00");
  await sessionsDialog.getByLabel("Fin de session").fill("2026-03-19T10:30");
  await sessionsDialog
    .getByRole("button", { name: /ajouter la session/i })
    .click();

  await expect(sessionsDialog.getByText(/1 session enregistrée/i)).toBeVisible();
  await expect(sessionsDialog.getByText(/ajout manuel de temps/i)).toBeVisible();
  await sessionsDialog.getByRole("button", { name: /fermer/i }).click();

  await expect(page.getByText("01:30:00")).toBeVisible();

  await page.getByRole("button", { name: /vue calendrier/i }).click();
  await expect(page.getByText("Lecture")).toBeVisible();
  await expect(page.getByText("1h 30m").first()).toBeVisible();
});

test("reorders task cards with drag and drop", async ({ page }) => {
  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  let taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Alpha");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Beta");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  const firstCard = page.getByTestId("task-card-1");
  const secondCard = page.getByTestId("task-card-2");
  const secondHandle = secondCard.getByRole("button", {
    name: /réorganiser beta/i,
  });

  const firstCardBox = await firstCard.boundingBox();
  const secondHandleBox = await secondHandle.boundingBox();

  if (!firstCardBox || !secondHandleBox) {
    throw new Error("Unable to locate task cards for drag and drop test.");
  }

  await page.mouse.move(
    secondHandleBox.x + secondHandleBox.width / 2,
    secondHandleBox.y + secondHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    firstCardBox.x + firstCardBox.width / 2,
    firstCardBox.y + firstCardBox.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();

  await expect(page.locator('[data-testid^="task-card-"] h3').first()).toHaveText("Beta");
  await expect(page.locator('[data-testid^="task-card-"] h3').nth(1)).toHaveText("Alpha");
});