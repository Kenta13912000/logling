CREATE TABLE "companion_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"enabled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diary_comments" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diary_comments_user_id_date_pk" PRIMARY KEY("user_id","date"),
	CONSTRAINT "diary_comments_body_check" CHECK (char_length("diary_comments"."body") <= 200)
);
--> statement-breakpoint
ALTER TABLE "companion_settings" ADD CONSTRAINT "companion_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_comments" ADD CONSTRAINT "diary_comments_user_id_date_diary_entries_user_id_date_fk" FOREIGN KEY ("user_id","date") REFERENCES "public"."diary_entries"("user_id","date") ON DELETE cascade ON UPDATE no action;