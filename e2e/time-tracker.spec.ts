import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("creates a tag and a task, runs the timer and exposes weekly totals", async ({
  page,
}) => {
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

  const sessionClientCard = page.getByTestId("task-card-1");

  await sessionClientCard.click({ position: { x: 80, y: 72 }, force: true });
  await page.waitForTimeout(2100);
  await sessionClientCard.click({ position: { x: 80, y: 72 }, force: true });

  await expect(page.getByText("00:00:02")).toBeVisible();

  await page.getByRole("button", { name: /vue calendrier/i }).click();
  await expect(
    page.getByRole("heading", { name: /temps passé par tâche et par jour/i }),
  ).toBeVisible();
  await expect(page.getByText("Session client")).toBeVisible();
});

test("reload keeps an active timer running until the user stops it manually", async ({
  page,
}) => {
  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  const taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Focus");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await page
    .getByRole("button", { name: /basculer le chrono pour focus/i })
    .click({ force: true });
  await page.waitForTimeout(1200);
  await page.reload();

  await expect(
    page.getByRole("button", { name: /arrêter le chrono actif/i }),
  ).toBeVisible();
  await expect(page.getByRole("banner").getByText("Focus")).toBeVisible();

  const focusCard = page.getByTestId("task-card-1");
  await expect(focusCard.getByText(/^actif$/i)).toBeVisible();

  await page.getByRole("button", { name: /arrêter le chrono actif/i }).click();

  await expect(page.getByText(/^chrono actif$/i)).toHaveCount(0);
  await expect(focusCard.getByText(/^prêt$/i)).toBeVisible();
  await expect(focusCard.getByText(/00:00:0[1-9]/i)).toBeVisible();
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

  await expect(
    sessionsDialog.getByText(/1 session enregistrée/i),
  ).toBeVisible();
  await expect(
    sessionsDialog.getByText(/ajout manuel de temps/i),
  ).toBeVisible();
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

  const firstCardBox = await firstCard.boundingBox();
  const secondCardBox = await secondCard.boundingBox();

  if (!firstCardBox || !secondCardBox) {
    throw new Error("Unable to locate task cards for drag and drop test.");
  }

  await page.mouse.move(
    secondCardBox.x + secondCardBox.width / 2,
    secondCardBox.y + secondCardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    firstCardBox.x + firstCardBox.width / 2,
    firstCardBox.y + firstCardBox.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();

  await expect(
    page.locator('[data-testid^="task-card-"] h3').first(),
  ).toHaveText("Beta");
  await expect(
    page.locator('[data-testid^="task-card-"] h3').nth(1),
  ).toHaveText("Alpha");
});

test("does not start a timer when dragging an inactive task card", async ({
  page,
}) => {
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

  const firstCardBox = await firstCard.boundingBox();
  const secondCardBox = await secondCard.boundingBox();

  if (!firstCardBox || !secondCardBox) {
    throw new Error("Unable to locate task cards for drag-no-toggle test.");
  }

  // Drag Alpha (first card) down to Beta's position — no timer should start
  await page.mouse.move(
    firstCardBox.x + firstCardBox.width / 2,
    firstCardBox.y + firstCardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    secondCardBox.x + secondCardBox.width / 2,
    secondCardBox.y + secondCardBox.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();

  // No active timer banner should appear in the header
  await expect(page.getByText(/^chrono actif$/i)).toHaveCount(0);

  // Neither card should show an active badge
  await expect(
    firstCard.getByRole("button", { name: /basculer le chrono pour alpha/i }),
  ).toContainText(/prêt/i);
  await expect(
    secondCard.getByRole("button", { name: /basculer le chrono pour beta/i }),
  ).toContainText(/prêt/i);
});

test("keeps the active timer running when the active card is reordered", async ({
  page,
}) => {
  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  let taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Alpha");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog.getByLabel("Nom de la tâche").fill("Beta");
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  const alphaCard = page.getByTestId("task-card-1");
  const betaCard = page.getByTestId("task-card-2");

  await alphaCard.click({ position: { x: 80, y: 72 }, force: true });
  await page.waitForTimeout(1100);

  const alphaCardBox = await alphaCard.boundingBox();
  const betaCardBox = await betaCard.boundingBox();

  if (!alphaCardBox || !betaCardBox) {
    throw new Error("Unable to locate task cards for active drag test.");
  }

  await page.mouse.move(
    alphaCardBox.x + alphaCardBox.width / 2,
    alphaCardBox.y + alphaCardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    betaCardBox.x + betaCardBox.width / 2,
    betaCardBox.y + betaCardBox.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();

  await expect(
    page.locator('[data-testid^="task-card-"] h3').first(),
  ).toHaveText("Beta");
  await expect(
    page.locator('[data-testid^="task-card-"] h3').nth(1),
  ).toHaveText("Alpha");
  await expect(page.getByRole("banner").getByText("Alpha")).toBeVisible();
  await expect(
    alphaCard.getByRole("button", { name: /basculer le chrono pour alpha/i }),
  ).toContainText(/actif/i);
  await expect(
    betaCard.getByRole("button", { name: /basculer le chrono pour beta/i }),
  ).toContainText(/prêt/i);
});

test.describe("compact header on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps header controls usable and still leaves task content in view", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /gérer les tags/i }).click();
    const tagsDialog = page.getByRole("dialog", { name: /gestion des tags/i });
    await tagsDialog.getByLabel("Nom du nouveau tag").fill("Client");
    await tagsDialog.getByRole("button", { name: /ajouter/i }).click();
    await tagsDialog.getByRole("button", { name: /^fermer$/i }).click();

    await page.getByRole("button", { name: /nouvelle tâche/i }).click();
    const taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
    await taskDialog.getByLabel("Nom de la tâche").fill("Session mobile");
    await taskDialog
      .getByLabel("Commentaire de la tâche")
      .fill("Validation du header compact");
    await taskDialog.getByRole("button", { name: /^client$/i }).click();
    await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

    await page
      .getByRole("button", { name: /basculer le chrono pour session mobile/i })
      .click({ force: true });

    await expect(
      page.getByRole("button", { name: /arrêter le chrono actif/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /vue calendrier/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /gérer les tags/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /réinitialiser les filtres/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^client$/i })).toBeVisible();

    await page.getByRole("button", { name: /^client$/i }).click();
    await expect(page.getByTestId("task-card-1")).toBeVisible();
    await expect(page.getByTestId("task-card-1")).toBeInViewport();
    await expect(
      page.getByTestId("task-card-1").getByText("Session mobile"),
    ).toBeVisible();
  });
});

test("keeps task cards compact and operable on a phone-sized viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("button", { name: /gérer les tags/i }).click();
  const tagsDialog = page.getByRole("dialog", { name: /gestion des tags/i });
  await tagsDialog.getByLabel("Nom du nouveau tag").fill("Client");
  await tagsDialog.getByRole("button", { name: /ajouter/i }).click();
  await tagsDialog.getByLabel("Nom du nouveau tag").fill("Mobile");
  await tagsDialog.getByRole("button", { name: /ajouter/i }).click();
  await tagsDialog.getByRole("button", { name: /^fermer$/i }).click();

  await page.getByRole("button", { name: /nouvelle tâche/i }).click();
  const taskDialog = page.getByRole("dialog", { name: /nouvelle tâche/i });
  await taskDialog
    .getByLabel("Nom de la tâche")
    .fill("Préparation atelier client mobile");
  await taskDialog
    .getByLabel("Commentaire de la tâche")
    .fill("Synthèse, validation et partage des décisions importantes");
  await taskDialog.getByRole("button", { name: /^client$/i }).click();
  await taskDialog.getByRole("button", { name: /^mobile$/i }).click();
  await taskDialog.getByRole("button", { name: /créer la tâche/i }).click();

  const taskCard = page.getByTestId("task-card-1");
  await expect(taskCard).toBeVisible();
  await expect(
    taskCard.getByRole("button", { name: /temps manuel/i }),
  ).toBeVisible();
  await expect(
    taskCard.getByRole("button", { name: /historique/i }),
  ).toBeVisible();

  await expect(
    taskCard.getByText(/préparation atelier client mobile/i),
  ).toBeVisible();
  await expect(
    taskCard.getByText(
      /synthèse, validation et partage des décisions importantes/i,
    ),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);

  await taskCard
    .getByRole("button", {
      name: /basculer le chrono pour préparation atelier client mobile/i,
    })
    .click({ force: true });
  await page.waitForTimeout(1100);

  await expect(taskCard.getByText(/^actif$/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /arrêter le chrono actif/i }),
  ).toBeVisible();
});
