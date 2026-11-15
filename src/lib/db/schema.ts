import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
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

/**
 * ai-companion (ADR-0009): whether the person turned character comments
 * on. No row means off. Deleting the person deletes it.
 */
export const companionSettings = pgTable("companion_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull(),
  /** When comments were last turned on; entries written before get none. */
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * ai-companion: one character comment per diary entry. Deleting the entry
 * (or its character, or the person) deletes the comment.
 */
export const diaryComments = pgTable(
  "diary_comments",
  {
    userId: text("user_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    foreignKey({
      columns: [table.userId, table.date],
      foreignColumns: [diaryEntries.userId, diaryEntries.date],
    }).onDelete("cascade"),
    check("diary_comments_body_check", sql`char_length(${table.body}) <= 200`),
  ],
);

/**
 * ai-companion: comments each person asked for on each day (Japan time,
 * split at 4 AM), retries included. Deleting the person deletes them.
 */
export const companionDailyUsage = pgTable(
  "companion_daily_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
    check("companion_daily_usage_count_check", sql`${table.count} >= 0`),
  ],
);

/**
 * ai-companion: the whole app's spending on comments per month (Japan
 * time, "YYYY-MM"), in millionths of a dollar (ADR-0009).
 */
export const companionMonthlyCost = pgTable("companion_monthly_cost", {
  month: text("month").primaryKey(),
  microUsd: integer("micro_usd").notNull(),
});

/**
 * pwa-reminder (ADR-0007): one row per device that turned reminders on.
 * Turning them off deletes the row; deleting the person deletes them all.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    /** The push service address the browser gave; one per device. */
    endpoint: text("endpoint").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The device's keys for encrypting what is sent to it. */
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    /** Minutes after midnight in `timeZone`: 0 to 1410, every 30. */
    remindMinute: integer("remind_minute").notNull(),
    timeZone: text("time_zone").notNull(),
    /** The diary date (split at 4 AM) last reminded, at most once a day. */
    lastSentOn: date("last_sent_on", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "push_subscriptions_minute_check",
      sql`${table.remindMinute} >= 0 and ${table.remindMinute} <= 1410 and ${table.remindMinute} % 30 = 0`,
    ),
    index("push_subscriptions_user_id_idx").on(table.userId),
  ],
);
