import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id).notNull(),
  name: text("name").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});
