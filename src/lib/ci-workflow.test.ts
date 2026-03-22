import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), ".github", "workflows", "ci.yml"),
  "utf8",
);

describe("CI workflow contract", () => {
  it("injects the Epic 5 backend and frontend environment variables", () => {
    expect(workflow).toContain(
      "CLERK_SECRET_KEY: ${{ secrets['CLERK_SECRET_KEY'] }}",
    );
    expect(workflow).toContain(
      "TURSO_DATABASE_URL: ${{ secrets['TURSO_DATABASE_URL'] }}",
    );
    expect(workflow).toContain(
      "TURSO_AUTH_TOKEN: ${{ secrets['TURSO_AUTH_TOKEN'] }}",
    );
    expect(workflow).toContain(
      "VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets['VITE_CLERK_PUBLISHABLE_KEY'] }}",
    );
  });
});
