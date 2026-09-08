CREATE TABLE `credit_pilot_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`step` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_events_session_created` ON `credit_pilot_events` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_events_type_created` ON `credit_pilot_events` (`event_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_pilot_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`decision_improved` text NOT NULL,
	`decision_description` text NOT NULL,
	`time_saved_minutes` integer NOT NULL,
	`risk_exposed` text NOT NULL,
	`usefulness_score` integer NOT NULL,
	`clarity_score` integer NOT NULL,
	`quote_consent` integer DEFAULT 0 NOT NULL,
	`quote_text` text,
	`accessibility_issue` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_pilot_feedback_session` ON `credit_pilot_feedback` (`session_id`);--> statement-breakpoint
CREATE TABLE `credit_pilot_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`label` text NOT NULL,
	`cohort` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_pilot_invites_code_hash` ON `credit_pilot_invites` (`code_hash`);--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_invites_status_expires` ON `credit_pilot_invites` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `credit_pilot_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_issues_status_created` ON `credit_pilot_issues` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_issues_session_created` ON `credit_pilot_issues` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_pilot_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_id` text NOT NULL,
	`user_id` text NOT NULL,
	`participant_alias` text NOT NULL,
	`role` text NOT NULL,
	`venture_stage` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`consent_version` text NOT NULL,
	`consented_at` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`project_id` text,
	`last_step` text DEFAULT 'onboarding' NOT NULL,
	`assistance_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_sessions_user_updated` ON `credit_pilot_sessions` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_credit_pilot_sessions_invite_status` ON `credit_pilot_sessions` (`invite_id`,`status`);