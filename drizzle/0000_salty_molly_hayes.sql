CREATE TYPE "public"."reservation_event_type" AS ENUM('created', 'updated', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('active', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."resource_category" AS ENUM('room', 'equipment', 'vehicle', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TABLE "reservation_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reservation_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"reservation_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event_type" "reservation_event_type" NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_end_after_start" CHECK ("reservations"."ends_at" > "reservations"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "resource_category" NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"location" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_capacity_positive" CHECK ("resources"."capacity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservation_events_reservation_idx" ON "reservation_events" USING btree ("reservation_id","created_at");--> statement-breakpoint
CREATE INDEX "reservations_user_starts_idx" ON "reservations" USING btree ("user_id","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reservations_starts_idx" ON "reservations" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_name_unique" ON "resources" USING btree (lower("name"));