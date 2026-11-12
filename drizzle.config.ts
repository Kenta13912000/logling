import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// `npm run db:migrate` reads DATABASE_URL from .env.local (the dev branch).
// To migrate production, set DATABASE_URL in the shell first: values already
// in the environment are not overwritten by the file.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// `npm run db:generate` only writes SQL from the schema and never connects.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
