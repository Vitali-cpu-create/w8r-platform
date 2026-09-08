import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { getRawDb } from "@/db";
import { calculatePilotEvidence, type PilotSessionRecord } from "@/lib/credit/pilot";

type JoinedSessionRow = {
  id: string;
  participant_alias: string;
  role: string;
  venture_stage: string;
  status: string;
  started_at: number;
  completed_at: number | null;
  project_id: string | null;
  last_step: string;
  assistance_count: number;
  decision_improved: "yes" | "partly" | "no" | null;
  decision_description: string | null;
  time_saved_minutes: number | null;
  risk_exposed: string | null;
  usefulness_score: number | null;
  clarity_score: number | null;
  quote_consent: number | null;
  quote_text: string | null;
  accessibility_issue: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function csv(value: string | undefined): string[] {
  return (value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

function isOperator(user: ChatGPTUser): boolean {
  const ids = csv(env.CREDIT_OPERATOR_USER_IDS);
  const emails = csv(env.CREDIT_OPERATOR_EMAILS).map(email => email.toLowerCase());
  return ids.includes(user.userId) || emails.includes(user.email.toLowerCase());
}

async function operator() {
  const user = await getChatGPTUser();
  if (!user) return { error: jsonError("Sign in is required.", 401), user: null };
  if (!isOperator(user)) return { error: jsonError("This evidence room is restricted to the pilot operator.", 403), user: null };
  return { error: null, user };
}

function safeText(value: unknown, maximum: number, minimum = 0): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length >= minimum && result.length <= maximum ? result : null;
}

function safeInteger(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null;
}

function safeId(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,120}$/.test(value) ? value : null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function invitationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const value = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `CRD-${value.slice(0, 6)}-${value.slice(6)}`;
}

export async function GET() {
  const access = await operator();
  if (access.error) return access.error;

  try {
    const db = getRawDb();
    const [sessionResult, eventResult, inviteResult, issueResult] = await Promise.all([
      db.prepare(`SELECT s.id, s.participant_alias, s.role, s.venture_stage, s.status, s.started_at, s.completed_at,
        s.project_id, s.last_step, s.assistance_count, f.decision_improved, f.decision_description, f.time_saved_minutes,
        f.risk_exposed, f.usefulness_score, f.clarity_score, f.quote_consent, f.quote_text, f.accessibility_issue
        FROM credit_pilot_sessions s LEFT JOIN credit_pilot_feedback f ON f.session_id = s.id
        ORDER BY s.started_at DESC LIMIT 100`).all<JoinedSessionRow>(),
      db.prepare("SELECT session_id, event_type FROM credit_pilot_events ORDER BY created_at DESC LIMIT 1000").all<{ session_id: string; event_type: string }>(),
      db.prepare(`SELECT id, label, cohort, status, max_uses, use_count, expires_at, created_at
        FROM credit_pilot_invites ORDER BY created_at DESC LIMIT 100`).all<{
          id: string; label: string; cohort: string; status: string; max_uses: number; use_count: number; expires_at: number; created_at: number;
        }>(),
      db.prepare(`SELECT id, session_id, category, severity, description, status, created_at, resolved_at
        FROM credit_pilot_issues ORDER BY created_at DESC LIMIT 100`).all<{
          id: string; session_id: string; category: string; severity: string; description: string; status: string; created_at: number; resolved_at: number | null;
        }>(),
    ]);

    const eventMap = new Map<string, string[]>();
    for (const event of eventResult.results ?? []) eventMap.set(event.session_id, [...(eventMap.get(event.session_id) ?? []), event.event_type]);
    const sessionRows = sessionResult.results ?? [];
    const sessions: PilotSessionRecord[] = sessionRows.map(row => ({
      id: row.id,
      participantAlias: row.participant_alias,
      role: row.role,
      ventureStage: row.venture_stage,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      projectId: row.project_id,
      lastStep: row.last_step,
      assistanceCount: row.assistance_count,
      eventTypes: [...new Set(eventMap.get(row.id) ?? [])],
      decisionImproved: row.decision_improved,
      decisionDescription: row.decision_description,
      timeSavedMinutes: row.time_saved_minutes,
      riskExposed: row.risk_exposed,
      usefulnessScore: row.usefulness_score,
      clarityScore: row.clarity_score,
    }));
    const invites = inviteResult.results ?? [];
    const invitedCapacity = invites.reduce((total, invite) => total + invite.max_uses, 0);
    const evidence = calculatePilotEvidence(sessions, invitedCapacity);
    const consentedQuotes = sessionRows
      .filter(row => row.quote_consent === 1 && row.quote_text)
      .map(row => ({ participantAlias: row.participant_alias, quote: row.quote_text }));
    const accessibilityNotes = sessionRows
      .filter(row => row.accessibility_issue)
      .map(row => ({ participantAlias: row.participant_alias, note: row.accessibility_issue }));

    return Response.json({
      evidence,
      sessions,
      invites: invites.map(invite => ({
        id: invite.id,
        label: invite.label,
        cohort: invite.cohort,
        status: invite.status,
        maxUses: invite.max_uses,
        useCount: invite.use_count,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      })),
      issues: issueResult.results ?? [],
      consentedQuotes,
      accessibilityNotes,
      generatedAt: Date.now(),
      methodology: "Pseudonymous, event-backed private pilot evidence. No participant email is returned.",
    });
  } catch {
    return jsonError("Pilot evidence is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  const access = await operator();
  if (access.error || !access.user) return access.error ?? jsonError("Access denied.", 403);
  const raw = await request.text();
  if (raw.length > 10_000) return jsonError("Payload too large.", 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  try {
    const db = getRawDb();
    const now = Date.now();
    if (body.action === "create_invite") {
      const label = safeText(body.label, 120, 3);
      const cohort = safeText(body.cohort, 80, 2);
      const maxUses = safeInteger(body.maxUses, 1, 20);
      const expiresInDays = safeInteger(body.expiresInDays, 1, 60);
      if (!label || !cohort || maxUses === null || expiresInDays === null) return jsonError("Complete every invitation field.", 422);
      const code = invitationCode();
      const codeHash = await sha256(code);
      const inviteId = `invite-${crypto.randomUUID()}`;
      const expiresAt = now + expiresInDays * 86_400_000;
      await db.batch([
        db.prepare(`INSERT INTO credit_pilot_invites
          (id, code_hash, label, cohort, status, max_uses, use_count, expires_at, created_by, created_at)
          VALUES (?, ?, ?, ?, 'active', ?, 0, ?, ?, ?)`)
          .bind(inviteId, codeHash, label, cohort, maxUses, expiresAt, access.user.userId, now),
        db.prepare(`INSERT INTO audit_events (id, workspace_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), `credit-pilot:${access.user.userId}`, "credit.pilot.invite.created", JSON.stringify({ inviteId, cohort, maxUses, expiresAt }), now),
      ]);
      return Response.json({ ok: true, invitation: { id: inviteId, code, label, cohort, maxUses, expiresAt } });
    }

    if (body.action === "close_invite") {
      const inviteId = safeId(body.inviteId);
      if (!inviteId) return jsonError("Invalid invitation.", 422);
      await db.prepare("UPDATE credit_pilot_invites SET status = 'closed' WHERE id = ? AND status = 'active'").bind(inviteId).run();
      return Response.json({ ok: true });
    }

    if (body.action === "resolve_issue") {
      const issueId = safeId(body.issueId);
      if (!issueId) return jsonError("Invalid issue.", 422);
      await db.prepare("UPDATE credit_pilot_issues SET status = 'resolved', resolved_at = ? WHERE id = ? AND status = 'open'").bind(now, issueId).run();
      return Response.json({ ok: true });
    }

    return jsonError("Unsupported operator action.", 422);
  } catch {
    return jsonError("The pilot operator action could not be completed.", 503);
  }
}
