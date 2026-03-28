import type { InValue } from "@libsql/client";
import { getDb } from "./db.js";

export interface QueryResult<T> {
  rows: T[];
  count?: number;
  rowsAffected?: number;
}

export class UserQueryHelper {
  constructor(private userId: string) {}

  async execute<T = Record<string, unknown>>(
    query: string,
    params: InValue[] = [],
  ): Promise<QueryResult<T>> {
    const db = getDb();
    try {
      const result = await db.execute(query, params);
      return {
        rows: (result.rows as T[]) || [],
        count: result.rows?.length,
        rowsAffected: result.rowsAffected,
      };
    } catch (err) {
      console.error("Query execution error:", err, { query, params });
      throw err;
    }
  }

  async fetchAll<T = Record<string, unknown>>(
    table: string,
    orderBy?: string,
  ): Promise<QueryResult<T>> {
    let query = `SELECT * FROM ${table} WHERE user_id = ?`;
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    return this.execute<T>(query, [this.userId]);
  }

  async fetchById<T = Record<string, unknown>>(
    table: string,
    id: string,
  ): Promise<T | null> {
    const query = `SELECT * FROM ${table} WHERE id = ? AND user_id = ?`;
    const result = await this.execute<T>(query, [id, this.userId]);
    return result.rows[0] ?? null;
  }

  async fetchByIds<T = Record<string, unknown>>(
    table: string,
    ids: string[],
  ): Promise<QueryResult<T>> {
    if (ids.length === 0) {
      return { rows: [], count: 0 };
    }
    const placeholders = ids.map(() => "?").join(",");
    const query = `SELECT * FROM ${table} WHERE id IN (${placeholders}) AND user_id = ?`;
    return this.execute<T>(query, [...ids, this.userId]);
  }

  async fetch<T = Record<string, unknown>>(
    table: string,
    where: string,
    params: InValue[] = [],
    orderBy?: string,
  ): Promise<QueryResult<T>> {
    let query = `SELECT * FROM ${table} WHERE user_id = ? AND ${where}`;
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    return this.execute<T>(query, [this.userId, ...params]);
  }

  async insert(table: string, data: Record<string, unknown>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const columns = [
      "id",
      "user_id",
      ...Object.keys(data),
      "created_at",
      "updated_at",
    ];
    const values = [
      id,
      this.userId,
      ...Object.values(data),
      now,
      now,
    ] as InValue[];
    const placeholders = columns.map(() => "?").join(",");

    const query = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`;
    await this.execute(query, values);

    return id;
  }

  async updateById(
    table: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updates = Object.keys(data).map((key) => `${key} = ?`);
    const values = [...Object.values(data), now, id, this.userId] as InValue[];

    const query = `UPDATE ${table} SET ${updates.join(", ")}, updated_at = ? WHERE id = ? AND user_id = ?`;
    const result = await this.execute(query, values);

    return (result.rowsAffected ?? 0) > 0;
  }

  async deleteById(table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = ? AND user_id = ?`;
    const result = await this.execute(query, [id, this.userId]);
    return (result.rowsAffected ?? 0) > 0;
  }

  async count(table: string, where = ""): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table} WHERE user_id = ?`;
    const params: InValue[] = [this.userId];

    if (where) {
      query += ` AND ${where}`;
    }

    const result = await this.execute<{ count: number }>(query, params);
    const count = result.rows[0]?.count;

    if (typeof count === "number") {
      return count;
    }

    if (typeof count === "bigint") {
      return Number(count);
    }

    if (typeof count === "string") {
      const parsed = Number(count);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}

export const createUserQueryHelper = (userId: string): UserQueryHelper => {
  return new UserQueryHelper(userId);
};