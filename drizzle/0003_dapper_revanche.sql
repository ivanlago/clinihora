CREATE TABLE "doctor_google_calendar_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"google_email" text NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "doctor_google_calendar_accounts_doctor_id_unique" UNIQUE("doctor_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_calendar_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_calendar_sync_status" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_calendar_sync_error" text;--> statement-breakpoint
ALTER TABLE "doctor_google_calendar_accounts" ADD CONSTRAINT "doctor_google_calendar_accounts_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;