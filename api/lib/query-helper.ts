import { getDb } from "./db";

export interface QueryResult<T> {
  rows: T[];
  count?: number;
}

/**
 * Helper for user-scoped database queries
 * Ensures all queries are automatically filtered by user_id
 */
export class UserQueryHelper {
  constructor(private userId: string) {}

  /**
   * Execute a query with automatic user ID parameter injection
   */
  async execute<T = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const db = getDb();
    try {
      const result = await db.execute(query, params);
      return {
        rows: (result.rows as T[]) || [],
        count: result.rows?.length,
      };
    } catch (err) {
      console.error("Query execution error:", err, { query, params });
      throw err;
    }
  }

  /**
   * Fetch all records for this user
   */
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

  /**
   * Fetch a single record by ID
   */
  async fetchById<T = Record<string, unknown>>(
    table: string,
    id: string,
  ): Promise<T | null> {
    const query = `SELECT * FROM ${table} WHERE id = ? AND user_id = ?`;
    const result = await this.execute<T>(query, [id, this.userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Fetch multiple records by IDs
   */
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

  /**
   * Fetch records with a WHERE condition
   */
  async fetch<T = Record<string, unknown>>(
    table: string,
    where: string,
    params: unknown[] = [],
    orderBy?: string,
  ): Promise<QueryResult<T>> {
    let query = `SELECT * FROM ${table} WHERE user_id = ? AND ${where}`;
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    return this.execute<T>(query, [this.userId, ...params]);
  }

  /**
   * Insert a record and return the new ID
   */
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
    const values = [id, this.userId, ...Object.values(data), now, now];
    const placeholders = columns.map(() => "?").join(",");

    const query = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`;
    await this.execute(query, values);

    return id;
  }

  /**
   * Update a record by ID
   */
  async updateById(
    table: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updates = Object.keys(data).map((key) => `${key} = ?`);
    const values = [...Object.values(data), now, id, this.userId];

    const query = `UPDATE ${table} SET ${updates.join(", ")}, updated_at = ? WHERE id = ? AND user_id = ?`;
    const result = await this.execute(query, values);

    return (result.count ?? 0) > 0;
  }

  /**
   * Delete a record by ID
   */
  async deleteById(table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = ? AND user_id = ?`;
    const result = await this.execute(query, [id, this.userId]);
    return (result.count ?? 0) > 0;
  }

  /**
   * Count records matching a condition
   */
  async count(table: string, where = ""): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table} WHERE user_id = ?`;
    const params: unknown[] = [this.userId];

    if (where) {
      query += ` AND ${where}`;
    }

    const result = await this.execute<{ count: number }>(query, params);
    return result.rows[0]?.count ?? 0;
  }
}

/**
 * Create a user query helper for a specific user
 */
export const createUserQueryHelper = (userId: string): UserQueryHelper => {
  return new UserQueryHelper(userId);
};
