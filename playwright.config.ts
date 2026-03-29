import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.PLAYWRIGHT_E2E_PORT ?? "3100");
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    env: {
      ...process.env,
      PORT: String(e2ePort),
      E2E_BYPASS_AUTH: "true",
      E2E_BYPASS_USER_ID: "e2e-user",
      VITE_E2E_BYPASS_AUTH: "true",
      VITE_E2E_BYPASS_USER_ID: "e2e-user",
    },
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
