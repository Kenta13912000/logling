import { defineConfig } from "drizzle-kit";

// Only generates SQL from the schema; it never connects to a database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
