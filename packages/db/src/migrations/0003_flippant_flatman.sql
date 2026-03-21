CREATE TABLE "rich_menu_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"line_account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rich_menus" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "rich_menus" ADD COLUMN "tab_index" integer;--> statement-breakpoint
ALTER TABLE "rich_menus" ADD COLUMN "line_alias_id" varchar(255);--> statement-breakpoint
ALTER TABLE "rich_menu_groups" ADD CONSTRAINT "rich_menu_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rich_menu_groups" ADD CONSTRAINT "rich_menu_groups_line_account_id_line_accounts_id_fk" FOREIGN KEY ("line_account_id") REFERENCES "public"."line_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rich_menus" ADD CONSTRAINT "rich_menus_group_id_rich_menu_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."rich_menu_groups"("id") ON DELETE set null ON UPDATE no action;