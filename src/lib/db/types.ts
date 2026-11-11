import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema";

/**
 * Any Drizzle database with logling's schema: PGlite in tests, Neon in
 * production. Repository functions take this so both can be passed in.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
