import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    console.error("Error: TURSO_DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const schemaPath = resolve(__dirname, "../api/lib/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  console.log("Executing database schema...");

  try {
    // Drop existing tables to allow schema updates
    await db.execute("DROP TABLE IF EXISTS active_timers");
    await db.execute("DROP TABLE IF EXISTS sessions");
    await db.execute("DROP TABLE IF EXISTS tasks");
    await db.execute("DROP TABLE IF EXISTS tags");

    // Execute the entire schema at once (handles comments and formatting better)
    const result = await db.executeMultiple(schema);
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
