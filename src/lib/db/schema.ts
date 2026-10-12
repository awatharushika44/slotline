import { sql } from "drizzle-orm";
import {
bigint,
boolean,
check,
index,
integer,
jsonb,
pgEnum,
pgTable,
text,
timestamp,
uniqueIndex,
uuid,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) =>
timestamp(name, { withTimezone: true });

export const userRole = pgEnum("user_role", ["member", "admin"]);

export const resourceCategory = pgEnum("resource_category", [
"room",
"equipment",
"vehicle",
"other",
]);

export const reservationStatus = pgEnum("reservation_status", [
"active",
"cancelled",
]);

export const reservationEventType = pgEnum("reservation_event_type", [
"created",
"updated",
"cancelled",
]);

export const users = pgTable("users", {
id: uuid("id").primaryKey().defaultRandom(),
email: text("email").notNull().unique(),
name: text("name").notNull(),
passwordHash: text("password_hash").notNull(),
role: userRole("role").notNull().default("member"),
isActive: boolean("is_active").notNull().default(true),
createdAt: timestamptz("created_at").notNull().defaultNow(),
updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const resources = pgTable(
"resources",
{
id: uuid("id").primaryKey().defaultRandom(),
name: text("name").notNull(),
category: resourceCategory("category").notNull(),
capacity: integer("capacity").notNull().default(1),
location: text("location"),
description: text("description"),
isActive: boolean("is_active").notNull().default(true),
createdAt: timestamptz("created_at").notNull().defaultNow(),
updatedAt: timestamptz("updated_at").notNull().defaultNow(),
},
(t) => [
check("resources_capacity_positive", sql`${t.capacity} >= 1`),
uniqueIndex("resources_name_unique").on(sql`lower(${t.name})`),
],
);

export const reservations = pgTable(
"reservations",
{
id: uuid("id").primaryKey().defaultRandom(),
resourceId: uuid("resource_id")
.notNull()
.references(() => resources.id, { onDelete: "restrict" }),
userId: uuid("user_id")
.notNull()
.references(() => users.id, { onDelete: "restrict" }),
title: text("title").notNull(),
notes: text("notes"),
startsAt: timestamptz("starts_at").notNull(),
endsAt: timestamptz("ends_at").notNull(),
status: reservationStatus("status").notNull().default("active"),
createdAt: timestamptz("created_at").notNull().defaultNow(),
updatedAt: timestamptz("updated_at").notNull().defaultNow(),
},
(t) => [
check("reservations_end_after_start", sql`${t.endsAt} > ${t.startsAt}`),
index("reservations_user_starts_idx").on(t.userId, t.startsAt.desc()),
index("reservations_starts_idx").on(t.startsAt),
],
);

export const reservationEvents = pgTable(
"reservation_events",
{
id: bigint("id", { mode: "number" })
.primaryKey()
.generatedAlwaysAsIdentity(),
reservationId: uuid("reservation_id")
.notNull()
.references(() => reservations.id, { onDelete: "restrict" }),
actorId: uuid("actor_id")
.notNull()
.references(() => users.id, { onDelete: "restrict" }),
eventType: reservationEventType("event_type").notNull(),
details: jsonb("details"),
createdAt: timestamptz("created_at").notNull().defaultNow(),
},
(t) => [
index("reservation_events_reservation_idx").on(
t.reservationId,
t.createdAt,
),
],
);
