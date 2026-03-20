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