#!/usr/bin/env node

import { spawn } from "child_process";

const isWindows = process.platform === "win32";
const port = process.env.PORT ?? "5173";

const command = isWindows ? "npx.cmd" : "npx";
const args = ["vite", "--host", "0.0.0.0", "--port", port, "--strictPort"];

const child = spawn(command, args, {
  stdio: "inherit",
  shell: isWindows,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to start Vite dev server:", error);
  process.exit(1);
});
