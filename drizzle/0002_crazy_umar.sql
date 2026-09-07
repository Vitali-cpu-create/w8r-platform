CREATE TABLE `credit_build_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_id` text NOT NULL,
	`engine_version` text NOT NULL,
	`provider_mode` text DEFAULT 'deterministic-rules' NOT NULL,
	`status` text NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_build_runs_project_created` ON `credit_build_runs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_id` text NOT NULL,
	`label` text NOT NULL,
	`claim` text NOT NULL,
	`source` text NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_evidence_project_version` ON `credit_evidence` (`project_id`,`version_id`);--> statement-breakpoint
CREATE INDEX `idx_credit_evidence_label_status` ON `credit_evidence` (`label`,`status`);--> statement-breakpoint
CREATE TABLE `credit_graph_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_id` text NOT NULL,
	`edge_key` text NOT NULL,
	`from_node` text NOT NULL,
	`to_node` text NOT NULL,
	`relationship` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_graph_edges_version_key` ON `credit_graph_edges` (`version_id`,`edge_key`);--> statement-breakpoint
CREATE INDEX `idx_credit_graph_edges_project` ON `credit_graph_edges` (`project_id`);--> statement-breakpoint
CREATE TABLE `credit_graph_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_id` text NOT NULL,
	`node_key` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_graph_nodes_version_key` ON `credit_graph_nodes` (`version_id`,`node_key`);--> statement-breakpoint
CREATE INDEX `idx_credit_graph_nodes_project` ON `credit_graph_nodes` (`project_id`);--> statement-breakpoint
CREATE TABLE `credit_project_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`engine_version` text NOT NULL,
	`blueprint_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_versions_project_number` ON `credit_project_versions` (`project_id`,`version_number`);--> statement-breakpoint
CREATE INDEX `idx_credit_versions_project_created` ON `credit_project_versions` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`latest_version` integer DEFAULT 1 NOT NULL,
	`brief_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_projects_user_updated` ON `credit_projects` (`user_id`,`updated_at`);