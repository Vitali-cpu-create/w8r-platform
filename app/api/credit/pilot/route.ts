import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getRawDb } from "@/db";
import { PILOT_CONSENT_VERSION, PILOT_EVENT_TYPES, type PilotEventType } from "@/lib/credit/pilot";

const CLIENT_EVENTS = new Set<PilotEventType>(PILOT_EVENT_TYPES.filter(event => !["pilot_started", "pilot_completed"].includes(event)));
const ROLES = new Set(["founder", "operator", "advisor", "builder", "other"]);
const VENTURE_STAGES = new Set(["idea", "validation", "pre-revenue", "revenue", "scale"]);
const ISSUE_CATEGORIES = new Set(["usability", "clarity", "accessibility", "technical", "privacy", "other"]);
const ISSUE_SEVERITIES = new Set(["low", "medium", "high", "blocking"]);

type SessionRow = {
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
};

type FeedbackRow = {
  decision_improved: string;
  decision_description: string;
  time_saved_minutes: number;
  risk_exposed: string;
  usefulness_score: number;
  clarity_score: number;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function safeText(value: unknown, maximum: number, minimum = 0): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length >= minimum && result.length <= maximum ? result : null;
}

function safeId(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,120}$/.test(value) ? value : null;
}

function safeInteger(value: unknown, minimum: number, maximum: number): number | null {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function sessionPayload(session: SessionRow, eventTypes: string[], feedback: FeedbackRow | null) {
  return {
    id: session.id,
    participantAlias: session.participant_alias,
    role: session.role,
    ventureStage: session.venture_stage,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    projectId: session.project_id,
    lastStep: session.last_step,
    assistanceCount: session.assistance_count,
    eventTypes,
    feedback: feedback ? {
      decisionImproved: feedback.decision_improved,
      decisionDescription: feedback.decision_description,
      timeSavedMinutes: feedback.time_saved_minutes,
      riskExposed: feedback.risk_exposed,
      usefulnessScore: feedback.usefulness_score,
      clarityScore: feedback.clarity_score,
    } : null,
  };
}

async function ownedSession(db: D1Database, sessionId: string, userId: string): Promise<SessionRow | null> {
  return db.prepare(`SELECT id, participant_alias, role, venture_stage, status, started_at, completed_at,
    project_id, last_step, assistance_count FROM credit_pilot_sessions WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(sessionId, userId).first<SessionRow>();
}

async function readSession(db: D1Database, session: SessionRow) {
  const events = await db.prepare("SELECT event_type FROM credit_pilot_events WHERE session_id = ? ORDER BY created_at ASC LIMIT 250")
    .bind(session.id).all<{ event_type: string }>();
  const feedback = await db.prepare(`SELECT decision_improved, decision_description, time_saved_minutes, risk_exposed,
    usefulness_score, clarity_score FROM credit_pilot_feedback WHERE session_id = ? LIMIT 1`)
    .bind(session.id).first<FeedbackRow>();
  return sessionPayload(session, (events.results ?? []).map(event => event.event_type), feedback);
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required for the pilot.", 401);
  const requested = new URL(request.url).searchParams.get("sessionId");
  if (requested && !safeId(requested)) return jsonError("Invalid pilot session.", 422);

  try {
    const db = getRawDb();
    const session = requested
      ? await ownedSession(db, requested, user.userId)
      : await db.prepare(`SELECT id, participant_alias, role, venture_stage, status, started_at, completed_at,
          project_id, last_step, assistance_count FROM credit_pilot_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`)
        .bind(user.userId).first<SessionRow>();
    if (!session) return Response.json({ session: null, consentVersion: PILOT_CONSENT_VERSION });
    return Response.json({ session: await readSession(db, session), consentVersion: PILOT_CONSENT_VERSION });
  } catch {
    return jsonError("Pilot records are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required for the pilot.", 401);
  const raw = await request.text();
  if (raw.length > 20_000) return jsonError("Payload too large.", 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  try {
    const db = getRawDb();
    const now = Date.now();

    if (body.action === "start") {
      const code = safeText(body.code, 40, 6)?.toUpperCase().replace(/\s+/g, "");
      const role = safeText(body.role, 30, 2);
      const ventureStage = safeText(body.ventureStage, 30, 2);
      const consent = body.consent && typeof body.consent === "object" && !Array.isArray(body.consent)
        ? body.consent as Record<string, unknown>
        : null;
      if (!code || !/^[A-Z0-9-]+$/.test(code)) return jsonError("Enter a valid pilot invitation code.", 422);
      if (!role || !ROLES.has(role) || !ventureStage || !VENTURE_STAGES.has(ventureStage)) return jsonError("Choose a valid role and venture stage.", 422);
      if (!consent || consent.research !== true || consent.prototype !== true || consent.safeData !== true) return jsonError("All pilot acknowledgements are required.", 422);

      const codeHash = await sha256(code);
      const invite = await db.prepare(`SELECT id, status, max_uses, use_count, expires_at FROM credit_pilot_invites
        WHERE code_hash = ? LIMIT 1`).bind(codeHash).first<{ id: string; status: string; max_uses: number; use_count: number; expires_at: number }>();
      if (!invite || invite.status !== "active" || invite.expires_at < now) return jsonError("This invitation is invalid or has expired.", 404);

      const existing = await db.prepare(`SELECT id, participant_alias, role, venture_stage, status, started_at, completed_at,
        project_id, last_step, assistance_count FROM credit_pilot_sessions WHERE invite_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1`)
        .bind(invite.id, user.userId).first<SessionRow>();
      if (existing) return Response.json({ ok: true, session: await readSession(db, existing), resumed: true });
      if (invite.use_count >= invite.max_uses) return jsonError("This invitation has reached its participant limit.", 409);

      const sessionId = `pilot-${crypto.randomUUID()}`;
      const alias = `Founder-${(await sha256(`${user.userId}:${sessionId}`)).slice(0, 6).toUpperCase()}`;
      const claim = await db.prepare("UPDATE credit_pilot_invites SET use_count = use_count + 1 WHERE id = ? AND status = 'active' AND expires_at >= ? AND use_count < max_uses")
        .bind(invite.id, now).run();
      if (Number(claim.meta.changes ?? 0) !== 1) return jsonError("This invitation has reached its participant limit.", 409);
      try {
        await db.batch([
          db.prepare(`INSERT INTO credit_pilot_sessions
            (id, invite_id, user_id, participant_alias, role, venture_stage, status, consent_version, consented_at, started_at, completed_at, project_id, last_step, assistance_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NULL, NULL, 'brief', 0, ?)`)
            .bind(sessionId, invite.id, user.userId, alias, role, ventureStage, PILOT_CONSENT_VERSION, now, now, now),
          db.prepare(`INSERT INTO credit_pilot_events (id, session_id, user_id, event_type, step, metadata_json, created_at)
            VALUES (?, ?, ?, 'pilot_started', 'brief', '{}', ?)`)
            .bind(crypto.randomUUID(), sessionId, user.userId, now),
          db.prepare(`INSERT INTO audit_events (id, workspace_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`)
            .bind(crypto.randomUUID(), `credit-pilot:${user.userId}`, "credit.pilot.started", JSON.stringify({ sessionId, inviteId: invite.id, consentVersion: PILOT_CONSENT_VERSION }), now),
        ]);
      } catch (error) {
        await db.prepare("UPDATE credit_pilot_invites SET use_count = CASE WHEN use_count > 0 THEN use_count - 1 ELSE 0 END WHERE id = ?").bind(invite.id).run();
        throw error;
      }
      const session = await ownedSession(db, sessionId, user.userId);
      return Response.json({ ok: true, session: session ? await readSession(db, session) : null, resumed: false });
    }

    const sessionId = safeId(body.sessionId);
    if (!sessionId) return jsonError("A valid pilot session is required.", 422);
    const session = await ownedSession(db, sessionId, user.userId);
    if (!session) return jsonError("Pilot session not found.", 404);

    if (body.action === "event") {
      const eventType = safeText(body.eventType, 50, 3) as PilotEventType | null;
      const step = safeText(body.step, 50, 2);
      if (!eventType || !CLIENT_EVENTS.has(eventType) || !step) return jsonError("Invalid pilot event.", 422);
      const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {};
      const metadataKeys = new Set(["projectId", "version", "fingerprint", "view", "format"]);
      if (Object.keys(metadata).some(key => !metadataKeys.has(key))) return jsonError("Unsupported event metadata.", 422);
      const metadataJson = JSON.stringify(metadata);
      if (metadataJson.length > 2_000) return jsonError("Event metadata is too large.", 413);
      const projectId = eventType === "dossier_compiled" ? safeId(metadata.projectId) : session.project_id;
      const statements = [
        db.prepare(`INSERT INTO credit_pilot_events (id, session_id, user_id, event_type, step, metadata_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), sessionId, user.userId, eventType, step, metadataJson, now),
        db.prepare("UPDATE credit_pilot_sessions SET project_id = COALESCE(?, project_id), last_step = ?, updated_at = ? WHERE id = ? AND user_id = ?")
          .bind(projectId, step, now, sessionId, user.userId),
      ];
      if (eventType === "assistance_requested") {
        statements.push(db.prepare("UPDATE credit_pilot_sessions SET assistance_count = assistance_count + 1 WHERE id = ? AND user_id = ?").bind(sessionId, user.userId));
      }
      await db.batch(statements);
      return Response.json({ ok: true });
    }

    if (body.action === "feedback") {
      const decisionImproved = safeText(body.decisionImproved, 10, 2);
      const decisionDescription = safeText(body.decisionDescription, 1_000, 10);
      const timeSavedMinutes = safeInteger(body.timeSavedMinutes, 0, 10_000);
      const riskExposed = safeText(body.riskExposed, 1_000, 5);
      const usefulnessScore = safeInteger(body.usefulnessScore, 1, 5);
      const clarityScore = safeInteger(body.clarityScore, 1, 5);
      const quoteConsent = body.quoteConsent === true;
      const quoteText = quoteConsent ? safeText(body.quoteText, 600, 5) : null;
      const accessibilityIssue = body.accessibilityIssue ? safeText(body.accessibilityIssue, 1_000, 3) : null;
      if (!decisionImproved || !["yes", "partly", "no"].includes(decisionImproved) || !decisionDescription || timeSavedMinutes === null || !riskExposed || usefulnessScore === null || clarityScore === null) {
        return jsonError("Complete every required outcome field.", 422);
      }
      if (quoteConsent && !quoteText) return jsonError("Add the quotation you consent to share, or remove quotation consent.", 422);
      const feedbackId = `feedback-${sessionId}`;
      await db.batch([
        db.prepare(`INSERT INTO credit_pilot_feedback
          (id, session_id, user_id, decision_improved, decision_description, time_saved_minutes, risk_exposed, usefulness_score, clarity_score, quote_consent, quote_text, accessibility_issue, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET decision_improved = excluded.decision_improved, decision_description = excluded.decision_description,
          time_saved_minutes = excluded.time_saved_minutes, risk_exposed = excluded.risk_exposed, usefulness_score = excluded.usefulness_score,
          clarity_score = excluded.clarity_score, quote_consent = excluded.quote_consent, quote_text = excluded.quote_text,
          accessibility_issue = excluded.accessibility_issue, updated_at = excluded.updated_at`)
          .bind(feedbackId, sessionId, user.userId, decisionImproved, decisionDescription, timeSavedMinutes, riskExposed, usefulnessScore, clarityScore, quoteConsent ? 1 : 0, quoteText, accessibilityIssue, now, now),
        db.prepare("UPDATE credit_pilot_sessions SET status = 'completed', completed_at = COALESCE(completed_at, ?), last_step = 'complete', updated_at = ? WHERE id = ? AND user_id = ?")
          .bind(now, now, sessionId, user.userId),
        db.prepare(`INSERT INTO credit_pilot_events (id, session_id, user_id, event_type, step, metadata_json, created_at)
          VALUES (?, ?, ?, 'pilot_completed', 'complete', '{}', ?)`)
          .bind(crypto.randomUUID(), sessionId, user.userId, now),
        db.prepare(`INSERT INTO audit_events (id, workspace_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), `credit-pilot:${user.userId}`, "credit.pilot.completed", JSON.stringify({ sessionId }), now),
      ]);
      const completed = await ownedSession(db, sessionId, user.userId);
      return Response.json({ ok: true, session: completed ? await readSession(db, completed) : null });
    }

    if (body.action === "issue") {
      const category = safeText(body.category, 30, 3);
      const severity = safeText(body.severity, 20, 3);
      const description = safeText(body.description, 2_000, 10);
      if (!category || !ISSUE_CATEGORIES.has(category) || !severity || !ISSUE_SEVERITIES.has(severity) || !description) return jsonError("Complete the issue category, severity and description.", 422);
      await db.prepare(`INSERT INTO credit_pilot_issues (id, session_id, user_id, category, severity, description, status, created_at, resolved_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, NULL)`)
        .bind(`issue-${crypto.randomUUID()}`, sessionId, user.userId, category, severity, description, now).run();
      return Response.json({ ok: true });
    }

    return jsonError("Unsupported pilot action.", 422);
  } catch {
    return jsonError("The pilot ledger is temporarily unavailable.", 503);
  }
}
