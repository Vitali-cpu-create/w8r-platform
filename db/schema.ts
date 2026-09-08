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

export const creditProjects = sqliteTable("credit_projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  latestVersion: integer("latest_version").notNull().default(1),
  briefJson: text("brief_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, t => [
  index("idx_credit_projects_user_updated").on(t.userId, t.updatedAt),
]);

export const creditProjectVersions = sqliteTable("credit_project_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  fingerprint: text("fingerprint").notNull(),
  engineVersion: text("engine_version").notNull(),
  blueprintJson: text("blueprint_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [
  uniqueIndex("idx_credit_versions_project_number").on(t.projectId, t.versionNumber),
  index("idx_credit_versions_project_created").on(t.projectId, t.createdAt),
]);

export const creditEvidence = sqliteTable("credit_evidence", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionId: text("version_id").notNull(),
  label: text("label").notNull(),
  claim: text("claim").notNull(),
  source: text("source").notNull(),
  owner: text("owner").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [
  index("idx_credit_evidence_project_version").on(t.projectId, t.versionId),
  index("idx_credit_evidence_label_status").on(t.label, t.status),
]);

export const creditBuildRuns = sqliteTable("credit_build_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionId: text("version_id").notNull(),
  engineVersion: text("engine_version").notNull(),
  providerMode: text("provider_mode").notNull().default("deterministic-rules"),
  status: text("status").notNull(),
  summaryJson: text("summary_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [
  index("idx_credit_build_runs_project_created").on(t.projectId, t.createdAt),
]);

export const creditGraphNodes = sqliteTable("credit_graph_nodes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionId: text("version_id").notNull(),
  nodeKey: text("node_key").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
}, t => [
  uniqueIndex("idx_credit_graph_nodes_version_key").on(t.versionId, t.nodeKey),
  index("idx_credit_graph_nodes_project").on(t.projectId),
]);

export const creditGraphEdges = sqliteTable("credit_graph_edges", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionId: text("version_id").notNull(),
  edgeKey: text("edge_key").notNull(),
  fromNode: text("from_node").notNull(),
  toNode: text("to_node").notNull(),
  relationship: text("relationship").notNull(),
}, t => [
  uniqueIndex("idx_credit_graph_edges_version_key").on(t.versionId, t.edgeKey),
  index("idx_credit_graph_edges_project").on(t.projectId),
]);

export const creditPilotInvites = sqliteTable("credit_pilot_invites", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").notNull(),
  label: text("label").notNull(),
  cohort: text("cohort").notNull(),
  status: text("status").notNull().default("active"),
  maxUses: integer("max_uses").notNull().default(1),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
}, t => [
  uniqueIndex("idx_credit_pilot_invites_code_hash").on(t.codeHash),
  index("idx_credit_pilot_invites_status_expires").on(t.status, t.expiresAt),
]);

export const creditPilotSessions = sqliteTable("credit_pilot_sessions", {
  id: text("id").primaryKey(),
  inviteId: text("invite_id").notNull(),
  userId: text("user_id").notNull(),
  participantAlias: text("participant_alias").notNull(),
  role: text("role").notNull(),
  ventureStage: text("venture_stage").notNull(),
  status: text("status").notNull().default("active"),
  consentVersion: text("consent_version").notNull(),
  consentedAt: integer("consented_at").notNull(),
  startedAt: integer("started_at").notNull(),
  completedAt: integer("completed_at"),
  projectId: text("project_id"),
  lastStep: text("last_step").notNull().default("onboarding"),
  assistanceCount: integer("assistance_count").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, t => [
  index("idx_credit_pilot_sessions_user_updated").on(t.userId, t.updatedAt),
  index("idx_credit_pilot_sessions_invite_status").on(t.inviteId, t.status),
]);

export const creditPilotEvents = sqliteTable("credit_pilot_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  step: text("step").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
}, t => [
  index("idx_credit_pilot_events_session_created").on(t.sessionId, t.createdAt),
  index("idx_credit_pilot_events_type_created").on(t.eventType, t.createdAt),
]);

export const creditPilotFeedback = sqliteTable("credit_pilot_feedback", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  decisionImproved: text("decision_improved").notNull(),
  decisionDescription: text("decision_description").notNull(),
  timeSavedMinutes: integer("time_saved_minutes").notNull(),
  riskExposed: text("risk_exposed").notNull(),
  usefulnessScore: integer("usefulness_score").notNull(),
  clarityScore: integer("clarity_score").notNull(),
  quoteConsent: integer("quote_consent").notNull().default(0),
  quoteText: text("quote_text"),
  accessibilityIssue: text("accessibility_issue"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, t => [
  uniqueIndex("idx_credit_pilot_feedback_session").on(t.sessionId),
]);

export const creditPilotIssues = sqliteTable("credit_pilot_issues", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at").notNull(),
  resolvedAt: integer("resolved_at"),
}, t => [
  index("idx_credit_pilot_issues_status_created").on(t.status, t.createdAt),
  index("idx_credit_pilot_issues_session_created").on(t.sessionId, t.createdAt),
]);
