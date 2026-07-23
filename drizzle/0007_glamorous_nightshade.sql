CREATE TABLE "procedures_to_doctors" (
	"procedure_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "procedures_to_doctors_procedure_id_doctor_id_pk" PRIMARY KEY("procedure_id","doctor_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_doctor_id_doctors_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "doctor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "procedures_to_doctors" ADD CONSTRAINT "procedures_to_doctors_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures_to_doctors" ADD CONSTRAINT "procedures_to_doctors_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures_to_doctors" ADD CONSTRAINT "procedures_to_doctors_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;