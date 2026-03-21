CREATE TABLE "calendar_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(50) DEFAULT 'google' NOT NULL,
	"calendar_id" varchar(500),
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_integrations_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "friends" ADD COLUMN "traffic_source_id" uuid;--> statement-breakpoint
ALTER TABLE "friends" ADD COLUMN "acquisition_source" varchar(50);--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "reminder_minutes_before" integer;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "google_calendar_event_id" varchar(500);--> statement-breakpoint
ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;