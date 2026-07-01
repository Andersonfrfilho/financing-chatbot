CREATE TYPE "public"."catalog_sync_status" AS ENUM('pending', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."product_availability" AS ENUM('in stock', 'out of stock', 'preorder', 'available for order', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('new', 'refurbished', 'used');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"external_id" varchar(255),
	"sync_status" "catalog_sync_status" DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"retailer_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price_in_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"image_url" varchar(500),
	"active" boolean DEFAULT true NOT NULL,
	"availability" "product_availability" DEFAULT 'in stock' NOT NULL,
	"condition" "product_condition" DEFAULT 'new' NOT NULL,
	"external_id" varchar(255),
	"sync_status" "catalog_sync_status" DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_retailer_id_unique" UNIQUE("retailer_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
