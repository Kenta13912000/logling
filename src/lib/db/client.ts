import "server-only";

import { Pool } from "@neondatabase/serverless";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";
import type { Db } from "./types";

let db: Db | undefined;

/**
 * The Neon database (ADR-0006). Created on first use so that builds without
 * DATABASE_URL (CI, preview deployments) still work. The WebSocket Pool
 * supports the transactions the repository uses.
 */
export function getDb(): Db {
  if (db === undefined) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = new Pool({ connectionString });
    // Lets Vercel close idle connections before an instance suspends.
    attachDatabasePool(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}
