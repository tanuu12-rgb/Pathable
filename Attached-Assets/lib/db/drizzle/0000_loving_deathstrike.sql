CREATE TABLE "obstacles" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_name" text NOT NULL,
	"zone" text NOT NULL,
	"issue_type" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"severity" text,
	"lat" real,
	"lng" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sos_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_name" text NOT NULL,
	"zone" text NOT NULL,
	"disability_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "safe_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"building" text NOT NULL,
	"floor" integer NOT NULL,
	"room_number" text NOT NULL,
	"equipment" text[] DEFAULT '{}' NOT NULL,
	"opening_hours" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"current_occupancy" integer DEFAULT 0 NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"lat" real,
	"lng" real
);
--> statement-breakpoint
CREATE TABLE "first_aid_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"building" text NOT NULL,
	"location" text NOT NULL,
	"stocked" text[] DEFAULT '{}' NOT NULL,
	"last_inspection" date NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"lat" real,
	"lng" real
);
--> statement-breakpoint
CREATE TABLE "safe_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"approved" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"created_by" text NOT NULL,
	"alert_type" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earned_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gamification_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"reports_submitted" integer DEFAULT 0 NOT NULL,
	"reports_confirmed" integer DEFAULT 0 NOT NULL,
	"routes_completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gamification_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "wellbeing_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mood" text NOT NULL,
	"checkin_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
