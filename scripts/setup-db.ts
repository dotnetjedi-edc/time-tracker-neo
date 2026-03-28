import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";
import { readDatabaseConfig } from "../server/lib/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  let db;
  try {
    db = createClient(readDatabaseConfig());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  const schemaPath = resolve(__dirname, "../api/lib/schema.sql");
  let schema: string;

  try {
    schema = readFileSync(schemaPath, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Error: unable to read schema file at ${schemaPath}: ${message}`,
    );
    process.exit(1);
  }

  console.log("Executing database schema...");

  try {
    await db.executeMultiple(schema);

    const sessionColumns = await db.execute("PRAGMA table_info(sessions)");
    const hasUpdatedAt = sessionColumns.rows.some(
      (row) => row.name === "updated_at",
    );

    if (!hasUpdatedAt) {
      await db.execute(
        "ALTER TABLE sessions ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
      );
    }

    console.log(`Database schema initialized successfully.`);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }

  db.close();
}

main().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
