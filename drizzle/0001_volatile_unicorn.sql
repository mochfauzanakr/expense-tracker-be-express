ALTER TABLE "categories" ALTER COLUMN "icon" SET DEFAULT 'dollar-sign';--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "icon" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_id" DROP NOT NULL;