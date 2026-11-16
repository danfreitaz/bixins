import {
  pgTable,
  text,
  jsonb,
  integer,
  timestamp,
  uuid,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Game } from "@/game/types";
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull().unique(),
    state: jsonb("state").$type<Game>().notNull(),
    credits: integer("credits").notNull().default(600),
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [check("credits_nonnegative", sql`${t.credits} >= 0`)],
);
export const gameActions = pgTable(
  "game_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    key: uuid("idempotency_key").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("action_owner_key").on(t.ownerId, t.key)],
);
export const economyLedger = pgTable(
  "economy_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    reference: text("reference").notNull(),
    delta: integer("delta").notNull(),
    balance: integer("balance_after").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("ledger_owner_reference").on(t.ownerId, t.reference),
    check("ledger_balance_nonnegative", sql`${t.balance} >= 0`),
  ],
);
