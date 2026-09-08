"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { pilotResultsMarkdown, type PilotEvidence, type PilotSessionRecord } from "@/lib/credit/pilot";

type Invite = { id: string; label: string; cohort: string; status: string; maxUses: number; useCount: number; expiresAt: number; createdAt: number };
type Issue = { id: string; session_id: string; category: string; severity: string; description: string; status: string; created_at: number; resolved_at: number | null };
type Dashboard = {
  evidence: PilotEvidence;
  sessions: PilotSessionRecord[];
  invites: Invite[];
  issues: Issue[];
  consentedQuotes: { participantAlias: string; quote: string }[];
  accessibilityNotes: { participantAlias: string; note: string }[];
  generatedAt: number;
  methodology: string;
};

function download(name: string, content: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function adminPost(body: Record<string, unknown>) {
  const response = await fetch("/api/credit/pilot/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { error?: string; invitation?: { id: string; code: string; label: string; cohort: string; maxUses: number; expiresAt: number } };
  if (!response.ok) throw new Error(result.error ?? "The operator action failed.");
  return result;
}

function EvidenceMetric({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return <article className={accent ? "ops-metric accent" : "ops-metric"}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export default function PilotOperations({ viewer }: { viewer: { authenticated: boolean; displayName: string; signInPath: string } }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading the evidence ledger…");
  const [inviteForm, setInviteForm] = useState({ label: "Foundry design partner", cohort: "September 2026", maxUses: 1, expiresInDays: 14 });
  const [newInvitation, setNewInvitation] = useState<{ code: string; url: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!viewer.authenticated) return;
    try {
      const response = await fetch("/api/credit/pilot/admin");
      const result = await response.json() as Dashboard & { error?: string };
      if (response.status === 403) {
        setAccessDenied(true);
        throw new Error(result.error ?? "Operator access is required.");
      }
      if (!response.ok) throw new Error(result.error ?? "The evidence room is unavailable.");
      setDashboard(result);
      setMessage(result.evidence.exitReady ? "All Day-30 evidence gates have passed." : "The proof loop remains open. Build evidence before expanding scope.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The evidence room is unavailable.");
    }
  }, [viewer.authenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("Creating a single-purpose invitation…");
    try {
      const result = await adminPost({ action: "create_invite", ...inviteForm });
      if (!result.invitation) throw new Error("The invitation was not returned.");
      const url = `${window.location.origin}/credit/pilot?code=${encodeURIComponent(result.invitation.code)}`;
      setNewInvitation({ code: result.invitation.code, url });
      setMessage("Invitation created. The code is shown once; copy it before leaving this page.");
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const closeInvite = async (inviteId: string) => {
    setBusy(true);
    try {
      await adminPost({ action: "close_invite", inviteId });
      await loadDashboard();
      setMessage("Invitation closed. Existing evidence remains intact.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be closed.");
    } finally {
      setBusy(false);
    }
  };

  const resolveIssue = async (issueId: string) => {
    setBusy(true);
    try {
      await adminPost({ action: "resolve_issue", issueId });
      await loadDashboard();
      setMessage("Issue marked resolved; the original report remains in the ledger.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The issue could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const copyInvitation = async () => {
    if (!newInvitation) return;
    await navigator.clipboard.writeText(newInvitation.url);
    setMessage("Private pilot link copied.");
  };

  const exportMemo = () => {
    if (!dashboard) return;
    download("credit-project-foundry-pilot-evidence.md", pilotResultsMarkdown(dashboard.evidence, dashboard.sessions, new Date(), {
      issues: dashboard.issues.map(issue => ({ severity: issue.severity, category: issue.category, description: issue.description, status: issue.status })),
      quotes: dashboard.consentedQuotes,
      accessibilityNotes: dashboard.accessibilityNotes,
    }), "text/markdown");
  };

  const exportJson = () => {
    if (!dashboard) return;
    download("credit-project-foundry-pilot-evidence.json", JSON.stringify({ ...dashboard, boundary: "Foundry proof loop only; W8R and OfPay regulated capabilities remain simulated." }, null, 2), "application/json");
  };

  if (!viewer.authenticated) return <main className="pilot-shell pilot-auth"><section><span className="pilot-kicker">OPERATOR EVIDENCE ROOM</span><h1>Sign in to continue.</h1><p>This route contains private pilot operations and pseudonymous result data.</p><a className="pilot-primary" href={viewer.signInPath} target="_top">Sign in with ChatGPT →</a></section></main>;
  if (accessDenied) return <main className="pilot-shell pilot-auth"><section><span className="pilot-kicker">RESTRICTED</span><h1>Operator access required.</h1><p>{message}</p><Link className="pilot-secondary" href="/credit/pilot">Return to the founder pilot</Link></section></main>;

  const evidence = dashboard?.evidence;
  const openIssues = dashboard?.issues.filter(issue => issue.status === "open") ?? [];

  return <main className="pilot-shell ops-shell">
    <a className="skip-link" href="#ops-main">Skip to pilot evidence</a>
    <header className="pilot-topbar"><Link href="/credit" className="pilot-wordmark"><b>W8R</b><span>C.R.E.D.I.T<br />EVIDENCE ROOM</span></Link><div><span>Private operator</span><b>{viewer.displayName}</b></div></header>

    <section className="ops-masthead" id="ops-main"><div><span className="pilot-kicker">DAY-30 INVESTMENT DECISION</span><h1>{evidence?.exitReady ? "Evidence supports the next horizon." : "Do not expand before the proof clears."}</h1><p>Every metric below is derived from private participant events and deliberate feedback—not invented traction, hidden scoring or presentation copy.</p></div><aside className={evidence?.exitReady ? "ready" : "open"}><i>{evidence?.exitReady ? "✓" : "Ω"}</i><span>{evidence?.exitReady ? "ADVANCE" : "PROOF OPEN"}</span><small>{evidence?.exitReady ? "31–60 day horizon earned" : "0–30 day criteria in progress"}</small></aside></section>

    <div className="pilot-status" role="status"><i aria-hidden="true">◆</i><span>{message}</span><button disabled={busy} onClick={() => void loadDashboard()}>Refresh evidence</button></div>

    <section className="ops-metrics">
      <EvidenceMetric label="Started" value={evidence?.started ?? "—"} note={`${evidence?.invitedCapacity ?? 0} invited places`} />
      <EvidenceMetric label="Completed" value={evidence?.completed ?? "—"} note={`${evidence?.completionRate ?? 0}% of starters`} accent />
      <EvidenceMetric label="Median journey" value={evidence?.medianMinutes === null || evidence?.medianMinutes === undefined ? "—" : `${evidence.medianMinutes}m`} note="Target ≤ 10 minutes" />
      <EvidenceMetric label="Unassisted" value={evidence?.unassistedCompleted ?? "—"} note="Target ≥ 3 complete" />
      <EvidenceMetric label="Useful dossiers" value={evidence?.usefulDossiers ?? "—"} note="Rated 4 or 5 out of 5" />
      <EvidenceMetric label="Open issues" value={openIssues.length} note="Blocking evidence stays visible" />
    </section>

    <section className="ops-grid">
      <article className="ops-panel">
        <div className="pilot-section-head"><span>EXIT GATES</span><h2>What must be true.</h2><p>All five gates pass before the roadmap advances.</p></div>
        <div className="ops-gates">{(evidence?.gates ?? []).map(gate => <div key={gate.id} className={gate.passed ? "passed" : "open"}><i>{gate.passed ? "✓" : "○"}</i><span><b>{gate.label}</b><small>{gate.current}</small></span><strong>{gate.passed ? "PASS" : "OPEN"}</strong></div>)}</div>
      </article>

      <article className="ops-panel ops-invite-panel">
        <div className="pilot-section-head"><span>DESIGN-PARTNER ACCESS</span><h2>Create a bounded invitation.</h2><p>Codes are hashed at rest, expire automatically and can be closed without deleting evidence. Site viewing access must still be granted separately.</p></div>
        <form onSubmit={createInvite}>
          <label><span>Invitation label</span><input required minLength={3} maxLength={120} value={inviteForm.label} onChange={event => setInviteForm(current => ({ ...current, label: event.target.value }))} /></label>
          <label><span>Cohort</span><input required minLength={2} maxLength={80} value={inviteForm.cohort} onChange={event => setInviteForm(current => ({ ...current, cohort: event.target.value }))} /></label>
          <div><label><span>Maximum uses</span><input type="number" min={1} max={20} value={inviteForm.maxUses} onChange={event => setInviteForm(current => ({ ...current, maxUses: Number(event.target.value) }))} /></label><label><span>Expires in days</span><input type="number" min={1} max={60} value={inviteForm.expiresInDays} onChange={event => setInviteForm(current => ({ ...current, expiresInDays: Number(event.target.value) }))} /></label></div>
          <button className="pilot-primary" disabled={busy}>Create private invitation</button>
        </form>
        {newInvitation && <div className="ops-new-invite"><span>SHOWN ONCE</span><strong>{newInvitation.code}</strong><p>{newInvitation.url}</p><button className="pilot-secondary" onClick={copyInvitation}>Copy pilot link</button></div>}
      </article>
    </section>

    <section className="ops-grid">
      <article className="ops-panel">
        <div className="pilot-section-head"><span>CONSENTED FOUNDER VOICE</span><h2>What participants actually said.</h2></div>
        <div className="ops-quotes">{dashboard?.consentedQuotes.length ? dashboard.consentedQuotes.map(item => <blockquote key={`${item.participantAlias}:${item.quote}`}><p>“{item.quote}”</p><cite>{item.participantAlias}</cite></blockquote>) : <p className="ops-empty">No participant quotations approved yet.</p>}</div>
      </article>
      <article className="ops-panel">
        <div className="pilot-section-head"><span>ACCESSIBILITY SIGNALS</span><h2>Barriers belong in the decision.</h2></div>
        <div className="ops-list">{dashboard?.accessibilityNotes.length ? dashboard.accessibilityNotes.map(item => <div key={`${item.participantAlias}:${item.note}`}><span><b>{item.participantAlias}</b><small>{item.note}</small></span></div>) : <p className="ops-empty">No accessibility notes recorded.</p>}</div>
      </article>
    </section>

    <section className="ops-panel ops-table-panel">
      <div className="pilot-section-head"><span>PSEUDONYMOUS COHORT</span><h2>One row per proof journey.</h2><p>Account identifiers and email addresses never appear in this view or its exports.</p></div>
      <div className="ops-table-wrap"><table><thead><tr><th>Participant</th><th>Stage</th><th>Status</th><th>Progress</th><th>Minutes</th><th>Assistance</th><th>Usefulness</th><th>Outcome</th></tr></thead><tbody>{dashboard?.sessions.length ? dashboard.sessions.map(session => {
        const minutes = session.completedAt ? Math.max(0, Math.round((session.completedAt - session.startedAt) / 60_000)) : null;
        return <tr key={session.id}><td><b>{session.participantAlias}</b><small>{session.role}</small></td><td>{session.ventureStage}</td><td><span className={`ops-status ${session.status}`}>{session.status}</span></td><td>{new Set(session.eventTypes).size} events</td><td>{minutes ?? "—"}</td><td>{session.assistanceCount}</td><td>{session.usefulnessScore ?? "—"}</td><td>{session.decisionImproved ?? "—"}</td></tr>;
      }) : <tr><td colSpan={8} className="ops-empty">No pilot has started yet. Create the first invitation to begin the evidence loop.</td></tr>}</tbody></table></div>
    </section>

    <section className="ops-grid">
      <article className="ops-panel">
        <div className="pilot-section-head"><span>INVITATION REGISTER</span><h2>Access without ambiguity.</h2></div>
        <div className="ops-list">{dashboard?.invites.length ? dashboard.invites.map(invite => <div key={invite.id}><span><b>{invite.label}</b><small>{invite.cohort} · {invite.useCount}/{invite.maxUses} used · expires {new Date(invite.expiresAt).toLocaleDateString("en-AU")}</small></span><button disabled={busy || invite.status !== "active"} onClick={() => void closeInvite(invite.id)}>{invite.status === "active" ? "Close" : "Closed"}</button></div>) : <p className="ops-empty">No invitations created.</p>}</div>
      </article>
      <article className="ops-panel">
        <div className="pilot-section-head"><span>ISSUE LEDGER</span><h2>Friction stays visible.</h2></div>
        <div className="ops-list">{dashboard?.issues.length ? dashboard.issues.map(issue => <div key={issue.id}><span><b>{issue.severity.toUpperCase()} · {issue.category}</b><small>{issue.description}</small></span><button disabled={busy || issue.status !== "open"} onClick={() => void resolveIssue(issue.id)}>{issue.status === "open" ? "Resolve" : "Resolved"}</button></div>) : <p className="ops-empty">No pilot issues recorded.</p>}</div>
      </article>
    </section>

    <section className="ops-export">
      <div><span className="pilot-kicker">INVESTOR DILIGENCE PACK</span><h2>Export what happened—not what we hoped would happen.</h2><p>The evidence memo includes the decision verdict, exit gates, pseudonymous sessions and explicit W8R/OfPay simulation boundary.</p></div><div><button className="pilot-secondary" disabled={!dashboard} onClick={exportJson}>Evidence JSON</button><button className="pilot-primary" disabled={!dashboard} onClick={exportMemo}>Investor memo .md</button></div>
    </section>

    <footer className="pilot-footer"><span>Release 0.3.1 · Private pilot evidence</span><Link href="/credit/pilot">Open founder pilot →</Link></footer>
  </main>;
}
