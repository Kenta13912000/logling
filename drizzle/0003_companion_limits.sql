CREATE TABLE "companion_daily_usage" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "companion_daily_usage_user_id_day_pk" PRIMARY KEY("user_id","day"),
	CONSTRAINT "companion_daily_usage_count_check" CHECK ("companion_daily_usage"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "companion_monthly_cost" (
	"month" text PRIMARY KEY NOT NULL,
	"micro_usd" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companion_daily_usage" ADD CONSTRAINT "companion_daily_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;