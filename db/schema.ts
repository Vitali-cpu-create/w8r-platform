import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const merchants = sqliteTable("merchants", {
  id: text("id").primaryKey(), name: text("name").notNull(), slug: text("slug").notNull(),
  settlementMode: text("settlement_mode").notNull().default("aud"), createdAt: integer("created_at").notNull(),
}, t => [uniqueIndex("idx_merchants_slug").on(t.slug)]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), merchantId: text("merchant_id").notNull(), name: text("name").notNull(),
  kind: text("kind").notNull(), priceAud: real("price_aud").notNull(), inventory: integer("inventory"), status: text("status").notNull().default("draft"),
}, t => [index("idx_products_merchant_status").on(t.merchantId, t.status)]);

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(), merchantId: text("merchant_id").notNull(), email: text("email"), walletAddress: text("wallet_address"), createdAt: integer("created_at").notNull(),
}, t => [index("idx_customers_merchant_email").on(t.merchantId, t.email)]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), merchantId: text("merchant_id").notNull(), customerId: text("customer_id"), status: text("status").notNull(), totalAud: real("total_aud").notNull(), paymentAsset: text("payment_asset"), createdAt: integer("created_at").notNull(),
}, t => [index("idx_orders_merchant_created").on(t.merchantId, t.createdAt), index("idx_orders_customer").on(t.customerId)]);

export const paymentQuotes = sqliteTable("payment_quotes", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull(), asset: text("asset").notNull(), audAmount: real("aud_amount").notNull(), assetAmount: text("asset_amount").notNull(), expiresAt: integer("expires_at").notNull(), status: text("status").notNull().default("pending"), txHash: text("tx_hash"),
}, t => [index("idx_quotes_order_status").on(t.orderId, t.status), index("idx_quotes_expiry").on(t.expiresAt)]);

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(), organisation: text("organisation").notNull(), kind: text("kind").notNull(), status: text("status").notNull().default("submitted"), capabilities: text("capabilities").notNull(), createdAt: integer("created_at").notNull(),
}, t => [index("idx_integrations_status_kind").on(t.status, t.kind)]);

export const demoWorkspaces = sqliteTable("demo_workspaces", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  stateJson: text("state_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, t => [uniqueIndex("idx_demo_workspaces_user").on(t.userId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  action: text("action").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [index("idx_audit_events_workspace_created").on(t.workspaceId, t.createdAt)]);
