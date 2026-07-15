CREATE TYPE "public"."appointment_type" AS ENUM('consultation', 'procedure');--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "procedure_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "type" "appointment_type" DEFAULT 'consultation' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE restrict ON UPDATE no action;