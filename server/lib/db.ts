import "dotenv/config";
import { createClient } from "@libsql/client";

const LOCAL_DATABASE_PREFIXES = [
  "file:",
  ":memory:",
  "http://127.0.0.1",
  "http://localhost",
];

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

let dbClient: ReturnType<typeof createClient> | null = null;

const isLocalDatabaseUrl = (url: string): boolean =>
  LOCAL_DATABASE_PREFIXES.some((prefix) => url.startsWith(prefix));

export const readDatabaseConfig = (): DatabaseConfig => {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable is required.");
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken && !isLocalDatabaseUrl(url)) {
    throw new Error(
      "TURSO_AUTH_TOKEN environment variable is required for remote Turso databases.",
    );
  }

  return {
    url,
    authToken: authToken || undefined,
  };
};

export const getDb = () => {
  if (dbClient) {
    return dbClient;
  }

  dbClient = createClient(readDatabaseConfig());
  return dbClient;
};