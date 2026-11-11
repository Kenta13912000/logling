import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "./schema";
import type { Db } from "./types";

export type TestDb = {
  db: Db;
  /** Adds a signed-in person (a Better Auth user row). */
  addUser: (id: string) => Promise<void>;
  close: () => Promise<void>;
};

/**
 * A fresh in-memory PostgreSQL (PGlite) with the same SQL migrations as
 * production applied. For tests only.
 */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });

  return {
    db,
    addUser: async (id) => {
      await db
        .insert(schema.user)
        .values({ id, name: id, email: `${id}@example.com` });
    },
    close: () => client.close(),
  };
}
