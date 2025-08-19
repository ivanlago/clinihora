ALTER TABLE "doctors" ALTER COLUMN "available_days" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "doctors" ALTER COLUMN "available_days" DROP NOT NULL;