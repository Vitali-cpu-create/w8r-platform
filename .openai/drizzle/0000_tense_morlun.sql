CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`email` text,
	`wallet_address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customers_merchant_email` ON `customers` (`merchant_id`,`email`);--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`capabilities` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_integrations_status_kind` ON `integrations` (`status`,`kind`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`settlement_mode` text DEFAULT 'aud' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_merchants_slug` ON `merchants` (`slug`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`customer_id` text,
	`status` text NOT NULL,
	`total_aud` real NOT NULL,
	`payment_asset` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_orders_merchant_created` ON `orders` (`merchant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE TABLE `payment_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`asset` text NOT NULL,
	`aud_amount` real NOT NULL,
	`asset_amount` text NOT NULL,
	`expires_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tx_hash` text
);
--> statement-breakpoint
CREATE INDEX `idx_quotes_order_status` ON `payment_quotes` (`order_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_quotes_expiry` ON `payment_quotes` (`expires_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`price_aud` real NOT NULL,
	`inventory` integer,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_products_merchant_status` ON `products` (`merchant_id`,`status`);