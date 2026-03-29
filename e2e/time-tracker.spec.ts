import { expect, test, type Page } from "@playwright/test";

type SeedTagInput = {
  id?: string;
  name: string;
  color: string;
  createdAt?: string;
};

type SeedTaskInput = {
  id?: string;
  name: string;
  comment?: string | null;
  totalTimeSeconds?: number;
  position?: number;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type SeedSessionInput = {
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
};

type SeedPayload = {
  tags?: SeedTagInput[];
  tasks?: SeedTaskInput[];
  sessions?: SeedSessionInput[];
  activeTimer?: {
    taskId: string;
    sessionId: string;
    segmentStartTime: string;
    updatedAt?: string;
  } | null;
};

const taskCard = (page: Page, taskName: string) =>
  page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: new RegExp(`^${taskName}$`, "i"),
      }),
    })
    .first();

const dragHandle = (page: Page, taskName: string) =>
  page.getByRole("button", { name: new RegExp(`^réorganiser ${taskName}$`, "i") });

const seedWorkspace = async (
  page: Page,
  request: Parameters<typeof test.beforeEach>[0]["request"],
  payload: SeedPayload,
) => {
  await request.post("/api/test/seed", { data: payload });
  await page.reload();
};

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/test/reset");
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("runs the timer and exposes weekly totals for a seeded task", async ({
  page,
  request,
}) => {
  await seedWorkspace(page, request, {
    tags: [{ id: "client-tag", name: "Client", color: "sand" }],
    tasks: [
      {
        id: "session-client-task",
        name: "Session client",
        comment: "Point projet",
        totalTimeSeconds: 0,
        position: 0,
        tagIds: ["client-tag"],
      },
    ],
  });

  const sessionClientCard = taskCard(page, "Session client");
  await expect(
    sessionClientCard.getByRole("heading", { name: /^session client$/i }),
  ).toBeVisible({ timeout: 10_000 });

  await sessionClientCard.click({ force: true });
  await page.waitForTimeout(2100);
  await sessionClientCard.click({ force: true });

  await expect(sessionClientCard.getByText(/00:00:0[2-9]/i).last()).toBeVisible();

  await page.getByRole("button", { name: /vue calendrier/i }).click();
  await expect(
    page.getByRole("heading", { name: /temps passé par tâche et par jour/i }),
  ).toBeVisible();
  await expect(page.getByText("Session client")).toBeVisible();
});

test("reload keeps an active timer running until the user stops it manually", async ({
  page,
  request,
}) => {
  await seedWorkspace(page, request, {
    tasks: [
      {
        id: "focus-task",
        name: "Focus",
        totalTimeSeconds: 600,
        position: 0,
        createdAt: "2026-03-28T08:00:00.000Z",
        updatedAt: "2026-03-28T08:10:00.000Z",
      },
      {
        id: "support-task",
        name: "Support",
        totalTimeSeconds: 1200,
        position: 1,
        createdAt: "2026-03-28T08:00:00.000Z",
        updatedAt: "2026-03-28T08:20:00.000Z",
      },
    ],
    sessions: [
      {
        id: "focus-session",
        taskId: "focus-task",
        origin: "timer",
        startedAt: "2026-03-29T18:57:00.000Z",
        endedAt: null,
        date: "2026-03-29",
        segments: [],
        auditEvents: [],
        createdAt: "2026-03-29T18:57:00.000Z",
        updatedAt: "2026-03-29T18:57:00.000Z",
      },
    ],
    activeTimer: {
      taskId: "focus-task",
      sessionId: "focus-session",
      segmentStartTime: "2026-03-29T18:57:00.000Z",
      updatedAt: "2026-03-29T18:57:00.000Z",
    },
  });

  await expect(page.getByRole("banner").getByText("Focus")).toBeVisible({
    timeout: 10_000,
  });
  await page.reload();

  await expect(page.getByRole("banner").getByText("Focus")).toBeVisible({
    timeout: 10_000,
  });

  const focusCard = taskCard(page, "Focus");
  await expect(focusCard.getByText(/^actif$/i).first()).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: /arrêter le chrono actif/i }).click();

  await expect(page.getByText(/^chrono actif$/i)).toHaveCount(0);
  await expect(focusCard.getByText(/^prêt$/i).first()).toBeVisible();
});

test("allows manual time entry and exposes task history", async ({ page, request }) => {
  await seedWorkspace(page, request, {
    tasks: [
      {
        id: "production-task",
        name: "Production",
        totalTimeSeconds: 2400,
        position: 0,
      },
      {
        id: "lecture-task",
        name: "Lecture",
        totalTimeSeconds: 0,
        position: 1,
      },
      {
        id: "review-task",
        name: "Review",
        totalTimeSeconds: 900,
        position: 2,
      },
    ],
  });

  await taskCard(page, "Production").click({ force: true });

  const lectureCard = taskCard(page, "Lecture");
  await lectureCard.getByRole("button", { name: /temps manuel/i }).click();

  const sessionsDialog = page.getByRole("dialog", {
    name: /temps et historique pour lecture/i,
  });
  await sessionsDialog.getByLabel("Début de session").fill("2026-03-28T09:00");
  await sessionsDialog.getByLabel("Fin de session").fill("2026-03-28T10:30");
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

  await expect(lectureCard.getByText("01:30:00").last()).toBeVisible();

  await page.getByRole("button", { name: /vue calendrier/i }).click();
  await expect(page.getByText("Lecture")).toBeVisible();
  await expect(page.getByText("1h 30m").first()).toBeVisible();
});

test("reorders task cards with drag and drop", async ({ page, request }) => {
  await seedWorkspace(page, request, {
    tasks: [
      { id: "alpha-task", name: "Alpha", totalTimeSeconds: 900, position: 0 },
      { id: "beta-task", name: "Beta", totalTimeSeconds: 300, position: 1 },
      { id: "gamma-task", name: "Gamma", totalTimeSeconds: 120, position: 2 },
    ],
  });

  const firstCard = taskCard(page, "Alpha");
  const secondCard = taskCard(page, "Beta");

  const secondCardHandleBox = await dragHandle(page, "Beta").boundingBox();
  const firstCardBox = await firstCard.boundingBox();

  if (!secondCardHandleBox || !firstCardBox) {
    throw new Error("Unable to locate task cards for drag and drop test.");
  }

  await page.mouse.move(
    secondCardHandleBox.x + secondCardHandleBox.width / 2,
    secondCardHandleBox.y + secondCardHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + 12, {
    steps: 20,
  });
  await page.mouse.up();

  await expect(
    page.locator("main article").nth(0).getByRole("heading", { level: 3 }).first(),
  ).toHaveText("Beta");
  await expect(
    page.locator("main article").nth(1).getByRole("heading", { level: 3 }).first(),
  ).toHaveText("Alpha");
});

test("does not start a timer when dragging an inactive task card", async ({
  page,
  request,
}) => {
  await seedWorkspace(page, request, {
    tasks: [
      { id: "alpha-task", name: "Alpha", totalTimeSeconds: 900, position: 0 },
      { id: "beta-task", name: "Beta", totalTimeSeconds: 300, position: 1 },
      { id: "gamma-task", name: "Gamma", totalTimeSeconds: 120, position: 2 },
    ],
  });

  const firstCard = taskCard(page, "Alpha");
  const secondCard = taskCard(page, "Beta");

  const firstCardHandleBox = await dragHandle(page, "Alpha").boundingBox();
  const secondCardBox = await secondCard.boundingBox();

  if (!firstCardHandleBox || !secondCardBox) {
    throw new Error("Unable to locate task cards for drag-no-toggle test.");
  }

  // Drag Alpha (first card) down to Beta's position — no timer should start
  await page.mouse.move(
    firstCardHandleBox.x + firstCardHandleBox.width / 2,
    firstCardHandleBox.y + firstCardHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    secondCardBox.x + secondCardBox.width / 2,
    secondCardBox.y + 12,
    { steps: 20 },
  );
  await page.mouse.up();

  // No active timer banner should appear in the header
  await expect(page.getByText(/^chrono actif$/i)).toHaveCount(0);

  // Neither card should show an active badge
  await expect(firstCard.getByText(/^prêt$/i).first()).toBeVisible();
  await expect(secondCard.getByText(/^prêt$/i).first()).toBeVisible();
});

test("keeps the active timer running when the active card is reordered", async ({
  page,
  request,
}) => {
  await seedWorkspace(page, request, {
    tasks: [
      { id: "alpha-task", name: "Alpha", totalTimeSeconds: 900, position: 0 },
      { id: "beta-task", name: "Beta", totalTimeSeconds: 300, position: 1 },
      { id: "gamma-task", name: "Gamma", totalTimeSeconds: 120, position: 2 },
    ],
  });

  const alphaCard = taskCard(page, "Alpha");
  const betaCard = taskCard(page, "Beta");

  await alphaCard.click({ force: true });
  await page.waitForTimeout(1100);

  const alphaCardHandleBox = await dragHandle(page, "Alpha").boundingBox();
  const betaCardBox = await betaCard.boundingBox();

  if (!alphaCardHandleBox || !betaCardBox) {
    throw new Error("Unable to locate task cards for active drag test.");
  }

  await page.mouse.move(
    alphaCardHandleBox.x + alphaCardHandleBox.width / 2,
    alphaCardHandleBox.y + alphaCardHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    betaCardBox.x + betaCardBox.width / 2,
    betaCardBox.y + 12,
    { steps: 20 },
  );
  await page.mouse.up();

  await expect(
    page.locator("main article").nth(0).getByRole("heading", { level: 3 }).first(),
  ).toHaveText("Beta");
  await expect(
    page.locator("main article").nth(1).getByRole("heading", { level: 3 }).first(),
  ).toHaveText("Alpha");
  await expect(page.getByRole("banner").getByText("Alpha")).toBeVisible();
  await expect(alphaCard.getByText(/^actif$/i).first()).toBeVisible();
  await expect(betaCard.getByText(/^prêt$/i).first()).toBeVisible();
});

test.describe("compact header on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps header controls usable and still leaves task content in view", async ({
    page,
    request,
  }) => {
    await seedWorkspace(page, request, {
      tags: [{ id: "client-tag", name: "Client", color: "sand" }],
      tasks: [
        {
          id: "session-mobile-task",
          name: "Session mobile",
          comment: "Validation du header compact",
          position: 0,
          tagIds: ["client-tag"],
        },
      ],
    });

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
    const sessionMobileCard = taskCard(page, "Session mobile");
    await expect(sessionMobileCard).toBeVisible();
    await expect(sessionMobileCard).toBeInViewport();
    await expect(
      sessionMobileCard.getByRole("heading", { name: /^session mobile$/i }),
    ).toBeVisible();
  });
});

test("keeps task cards compact and operable on a phone-sized viewport", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedWorkspace(page, request, {
    tags: [
      { id: "client-tag", name: "Client", color: "sand" },
      { id: "mobile-tag", name: "Mobile", color: "mint" },
    ],
    tasks: [
      {
        id: "mobile-prep-task",
        name: "Préparation atelier client mobile",
        comment: "Synthèse, validation et partage des décisions importantes",
        position: 0,
        tagIds: ["client-tag", "mobile-tag"],
      },
    ],
  });

  const mobileTaskCard = taskCard(page, "Préparation atelier client mobile");
  await expect(mobileTaskCard).toBeVisible();
  await expect(
    mobileTaskCard.getByRole("button", {
      name: /basculer le chrono pour préparation atelier client mobile/i,
    }),
  ).toBeVisible();
  await expect(
    mobileTaskCard.getByRole("button", {
      name: /modifier préparation atelier client mobile/i,
    }),
  ).toBeVisible();

  await expect(
    mobileTaskCard.getByRole("heading", {
      name: /préparation atelier client mobile/i,
    }),
  ).toBeVisible();
  await expect(mobileTaskCard.getByText(/mobile, client/i)).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);

  await mobileTaskCard
    .getByRole("button", {
      name: /basculer le chrono pour préparation atelier client mobile/i,
    })
    .click({ force: true });
  await page.waitForTimeout(1100);

  await expect(
    page.getByRole("banner").getByText(/préparation atelier client mobile/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /arrêter le chrono actif/i }),
  ).toBeVisible();
});
