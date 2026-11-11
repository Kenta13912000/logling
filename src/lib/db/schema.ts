import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

/*
 * logling's own tables. Each column maps one-to-one to SaveData
 * (Character / DiaryEntry) so cloud data reads back in the same shape as
 * the data in the browser.
 */

/** One character per person. Deleting the person deletes it. */
export const characters = pgTable(
  "characters",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    totalExp: integer("total_exp").notNull().default(0),
    /** Missing for characters named in diary-exp. */
    startDate: date("start_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [check("characters_total_exp_check", sql`${table.totalExp} >= 0`)],
);

/** One entry per person per diary date (split at 4 AM). */
export const diaryEntries = pgTable(
  "diary_entries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => characters.userId, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    writtenLater: boolean("written_later").notNull().default(false),
    bonus: integer("bonus"),
    bonusDays: integer("bonus_days"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    // The bonus and the streak that earned it always come together.
    check(
      "diary_entries_bonus_check",
      sql`(${table.bonus} is null and ${table.bonusDays} is null) or (${table.bonus} >= 1 and ${table.bonusDays} >= 1)`,
    ),
  ],
);
