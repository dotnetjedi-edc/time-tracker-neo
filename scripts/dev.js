#!/usr/bin/env node

/**
 * Development server launcher
 * Starts the Vercel dev server which handles both API routes and frontend
 */

import { spawn } from "child_process";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

const isWindows = process.platform === "win32";
const port = process.env.PORT ?? "3000";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

// Start Vercel dev (handles both API routes and frontend via devCommand)
const vercelProcess = spawn(
  isWindows ? "npx.cmd" : "npx",
  ["vercel", "dev", "--listen", `127.0.0.1:${port}`],
  {
    stdio: "inherit",
    shell: isWindows,
    env: process.env,
  },
);

// Handle termination
process.on("SIGINT", () => {
  console.log("\nShutting down development server...");
  vercelProcess.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  vercelProcess.kill();
  process.exit(0);
});

// Handle process errors
vercelProcess.on("error", (err) => {
  console.error("Vercel dev error:", err);
  process.exit(1);
});
