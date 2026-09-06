import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, demoWorkspaces } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const STATE_KEYS = new Set([
  "migrationProgress",
  "identityStage",
  "quoteAsset",
  "quoteProvider",
  "paymentStatus",
  "receiptStatus",
  "escrowStatus",
  "disputeStatus",
  "reconciliationStatus",
  "noQrMode",
]);

function safeState(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.some(([key]) => !STATE_KEYS.has(key))) return null;
  const json = JSON.stringify(value);
  if (json.length > 16_000) return null;
  return Object.fromEntries(entries);
}

async function identity() {
  const user = await getChatGPTUser();
  return user?.userId ?? "local-investor-demo";
}

function workspaceId(userId: string) {
  return `demo:${userId}`;
}

export async function GET() {
  const userId = await identity();
  try {
    const rows = await getDb().select().from(demoWorkspaces).where(eq(demoWorkspaces.userId, userId)).limit(1);
    return Response.json({ state: rows[0] ? JSON.parse(rows[0].stateJson) : null, persistence: "d1" });
  } catch {
    return Response.json({ state: null, persistence: "local" });
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 20_000) return Response.json({ error: "Payload too large" }, { status: 413 });

  let body: { state?: unknown; action?: unknown };
  try {
    body = JSON.parse(raw) as { state?: unknown; action?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const state = safeState(body.state);
  const action = typeof body.action === "string" && /^[a-z0-9._-]{1,64}$/i.test(body.action) ? body.action : null;
  if (!state || !action) return Response.json({ error: "Invalid demonstration state" }, { status: 422 });

  const userId = await identity();
  const id = workspaceId(userId);
  const now = Date.now();
  try {
    const db = getDb();
    await db.batch([
      db.insert(demoWorkspaces).values({ id, userId, stateJson: JSON.stringify(state), updatedAt: now }).onConflictDoUpdate({ target: demoWorkspaces.userId, set: { stateJson: JSON.stringify(state), updatedAt: now } }),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), workspaceId: id, action, payloadJson: JSON.stringify({ changedKeys: Object.keys(state) }), createdAt: now }),
    ]);
    return Response.json({ ok: true, persistence: "d1" });
  } catch {
    return Response.json({ ok: true, persistence: "local" }, { status: 202 });
  }
}

export async function DELETE() {
  const userId = await identity();
  try {
    await getDb().delete(demoWorkspaces).where(eq(demoWorkspaces.userId, userId));
    return Response.json({ ok: true, persistence: "d1" });
  } catch {
    return Response.json({ ok: true, persistence: "local" }, { status: 202 });
  }
}
