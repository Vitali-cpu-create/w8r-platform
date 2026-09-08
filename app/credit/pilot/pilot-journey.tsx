"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PilotSession = {
  id: string;
  participantAlias: string;
  role: string;
  ventureStage: string;
  status: string;
  startedAt: number;
  completedAt: number | null;
  projectId: string | null;
  lastStep: string;
  assistanceCount: number;
  eventTypes: string[];
  feedback: null | {
    decisionImproved: string;
    decisionDescription: string;
    timeSavedMinutes: number;
    riskExposed: string;
    usefulnessScore: number;
    clarityScore: number;
  };
};

type Feedback = {
  decisionImproved: "yes" | "partly" | "no";
  decisionDescription: string;
  timeSavedMinutes: number;
  riskExposed: string;
  usefulnessScore: number;
  clarityScore: number;
  quoteConsent: boolean;
  quoteText: string;
  accessibilityIssue: string;
};

const initialFeedback: Feedback = {
  decisionImproved: "yes",
  decisionDescription: "",
  timeSavedMinutes: 30,
  riskExposed: "",
  usefulnessScore: 4,
  clarityScore: 4,
  quoteConsent: false,
  quoteText: "",
  accessibilityIssue: "",
};

const journey = [
  { id: "brief", number: "01", title: "Frame a real idea", detail: "Use a genuine venture, but remove confidential or personally identifying information.", requires: ["pilot_started"] },
  { id: "dossier", number: "02", title: "Compile the dossier", detail: "Generate the governed blueprint and read the single-slide investment summary.", requires: ["dossier_compiled", "dossier_reviewed"] },
  { id: "evidence", number: "03", title: "Inspect the evidence", detail: "Check how facts, assumptions, targets and dependencies have been labelled.", requires: ["evidence_reviewed"] },
  { id: "investor", number: "04", title: "Take the investor challenge", detail: "Read all five challenge passes and identify the objection that changes your plan.", requires: ["investor_reviewed"] },
  { id: "runway", number: "05", title: "Confirm the runway", detail: "Review the MVP, NOT NOW boundary, acceptance tests and next proof.", requires: ["roadmap_reviewed"] },
  { id: "revision", number: "06", title: "Save one revision", detail: "Change one material input and compile again to prove the earlier version remains intact.", requires: ["revision_saved"] },
  { id: "exports", number: "07", title: "Take your work with you", detail: "Download both the Markdown dossier and structured JSON blueprint.", requires: ["markdown_exported", "json_exported"] },
  { id: "feedback", number: "08", title: "Name the outcome", detail: "Tell us what decision improved, how much time was saved and which risk became visible.", requires: ["pilot_completed"] },
];

async function postPilot(body: Record<string, unknown>) {
  const response = await fetch("/api/credit/pilot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { error?: string; session?: PilotSession | null };
  if (!response.ok) throw new Error(result.error ?? "The pilot action could not be completed.");
  return result;
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <fieldset className="pilot-rating"><legend>{label}</legend><div>{[1, 2, 3, 4, 5].map(score => <label key={score}><input type="radio" name={label} value={score} checked={value === score} onChange={() => onChange(score)} /><span>{score}</span></label>)}</div><small>1 = low · 5 = excellent</small></fieldset>;
}

export default function PilotJourney({ viewer, initialCode = "", initialSessionId = null }: { viewer: { authenticated: boolean; displayName: string; signInPath: string }; initialCode?: string; initialSessionId?: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [role, setRole] = useState("founder");
  const [ventureStage, setVentureStage] = useState("idea");
  const [consent, setConsent] = useState({ research: false, prototype: false, safeData: false });
  const [session, setSession] = useState<PilotSession | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Your progress will appear here after onboarding.");
  const [issue, setIssue] = useState({ category: "usability", severity: "low", description: "" });
  const [issueSent, setIssueSent] = useState(false);

  const refresh = useCallback(async (sessionId?: string) => {
    if (!viewer.authenticated) return;
    try {
      const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
      const response = await fetch(`/api/credit/pilot${query}`);
      const result = await response.json() as { error?: string; session?: PilotSession | null };
      if (!response.ok) throw new Error(result.error ?? "Pilot progress is unavailable.");
      if (result.session) {
        setSession(result.session);
        setMessage(result.session.status === "completed" ? "Pilot complete. Thank you for creating decision-grade evidence." : "Private pilot progress restored.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pilot progress is unavailable.");
    }
  }, [viewer.authenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(initialSessionId ?? undefined); }, 0);
    return () => window.clearTimeout(timer);
  }, [initialSessionId, refresh]);

  const completedEvents = useMemo(() => new Set(session?.eventTypes ?? []), [session]);
  const completedSteps = journey.filter(step => step.requires.every(event => completedEvents.has(event))).length;
  const progress = Math.round(completedSteps / journey.length * 100);

  const startPilot = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("Opening your pseudonymous pilot record…");
    try {
      const result = await postPilot({ action: "start", code, role, ventureStage, consent });
      if (!result.session) throw new Error("The pilot session could not be opened.");
      setSession(result.session);
      window.history.replaceState({}, "", `/credit/pilot?session=${encodeURIComponent(result.session.id)}`);
      setMessage("Pilot started. The clock measures the complete proof journey, not reading speed alone.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The pilot could not start.");
    } finally {
      setBusy(false);
    }
  };

  const askForHelp = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await postPilot({ action: "event", sessionId: session.id, eventType: "assistance_requested", step: session.lastStep, metadata: {} });
      await refresh(session.id);
      setMessage("Assistance request recorded. This helps us measure whether the workflow is genuinely self-serve.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be recorded.");
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setMessage("Recording the outcome…");
    try {
      const result = await postPilot({ action: "feedback", sessionId: session.id, ...feedback });
      if (result.session) setSession(result.session);
      setMessage("Pilot complete. Your feedback is stored under your pseudonymous participant label.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Feedback could not be recorded.");
    } finally {
      setBusy(false);
    }
  };

  const reportIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setIssueSent(false);
    try {
      await postPilot({ action: "issue", sessionId: session.id, ...issue });
      setIssue({ category: "usability", severity: "low", description: "" });
      setIssueSent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The issue could not be recorded.");
    } finally {
      setBusy(false);
    }
  };

  if (!viewer.authenticated) return <main className="pilot-shell pilot-auth">
    <section><span className="pilot-kicker">PRIVATE FOUNDER PILOT</span><h1>Sign in to continue.</h1><p>Your pilot record is private and tied to your authenticated Site identity. No OpenAI API account or key is required.</p><a className="pilot-primary" href={viewer.signInPath} target="_top">Sign in with ChatGPT →</a></section>
  </main>;

  return <main className="pilot-shell">
    <a className="skip-link" href="#pilot-main">Skip to pilot journey</a>
    <header className="pilot-topbar"><Link href="/credit" className="pilot-wordmark"><b>W8R</b><span>C.R.E.D.I.T<br />FOUNDER PILOT</span></Link><div><span>Signed in privately</span><b>{viewer.displayName}</b></div></header>

    <section className="pilot-masthead" id="pilot-main">
      <div><span className="pilot-kicker">0–30 DAY PROOF LOOP · RELEASE 0.3.1</span><h1>Can the Foundry improve a real decision in <em>ten minutes?</em></h1><p>This is a product test, not a pitch. Complete one genuine dossier and tell us what changed, what time it saved and which risk it exposed.</p></div>
      <aside><strong>{session ? `${progress}%` : "10"}</strong><span>{session ? "journey complete" : "minutes targeted"}</span><small>{session?.participantAlias ?? "Pseudonymous by design"}</small></aside>
    </section>

    <div className="pilot-status" role="status"><i aria-hidden="true">◆</i><span>{message}</span>{session && <button disabled={busy} onClick={() => void refresh(session.id)}>Refresh progress</button>}</div>

    {!session ? <section className="pilot-onboarding">
      <form onSubmit={startPilot}>
        <div className="pilot-section-head"><span>01 · CONTROLLED ONBOARDING</span><h2>Open your pilot record.</h2><p>The invitation code proves eligibility. Your account identifier isolates the session but is never returned in the evidence dashboard.</p></div>
        <div className="pilot-form-grid">
          <label><span>Invitation code</span><input required minLength={6} maxLength={40} autoComplete="off" value={code} onChange={event => setCode(event.target.value)} placeholder="CRD-XXXXXX-XXXXXX" /></label>
          <label><span>Your closest role</span><select value={role} onChange={event => setRole(event.target.value)}><option value="founder">Founder</option><option value="operator">Operator</option><option value="advisor">Advisor</option><option value="builder">Builder</option><option value="other">Other</option></select></label>
          <label><span>Venture stage</span><select value={ventureStage} onChange={event => setVentureStage(event.target.value)}><option value="idea">Idea</option><option value="validation">Validation</option><option value="pre-revenue">Pre-revenue</option><option value="revenue">Revenue</option><option value="scale">Scaling</option></select></label>
        </div>
        <fieldset className="pilot-consent"><legend>Required acknowledgements</legend>
          <label><input aria-label="Consent to private pilot measurement" type="checkbox" checked={consent.research} onChange={event => setConsent(current => ({ ...current, research: event.target.checked }))} /><span><b>I consent to private pilot measurement.</b><small>Completion events, duration, assistance requests, ratings and the feedback I submit will be recorded.</small></span></label>
          <label><input aria-label="Acknowledge prototype status" type="checkbox" checked={consent.prototype} onChange={event => setConsent(current => ({ ...current, prototype: event.target.checked }))} /><span><b>I understand this is a prototype.</b><small>It does not move funds, verify identities, issue legal receipts or activate regulated services.</small></span></label>
          <label><input aria-label="Agree to use safe test information" type="checkbox" checked={consent.safeData} onChange={event => setConsent(current => ({ ...current, safeData: event.target.checked }))} /><span><b>I will use safe test information.</b><small>No private keys, payment details, identity documents, customer lists or commercially sensitive records.</small></span></label>
        </fieldset>
        <button className="pilot-primary" disabled={busy}>{busy ? "Opening pilot…" : "Begin the ten-minute proof →"}</button>
      </form>
      <aside className="pilot-boundary"><span>WHAT WE MEASURE</span><h2>Evidence, not surveillance.</h2><dl><div><dt>Recorded</dt><dd>Progress events, duration, assistance, ratings and deliberate feedback.</dd></div><div><dt>Excluded</dt><dd>Email from results, keystrokes, payment data, identity documents and hidden behavioural scoring.</dd></div><div><dt>Purpose</dt><dd>Decide whether the brief-to-dossier loop earns the 31–60 day build.</dd></div></dl></aside>
    </section> : <>
      <section className="pilot-progress-panel">
        <div className="pilot-section-head"><span>THE STANDARD TEST JOURNEY</span><h2>One sequence. Comparable evidence.</h2><p>Foundry actions are recorded automatically. Return here after reviewing the dossier to complete the outcome report.</p></div>
        <div className="pilot-progress-bar" aria-label={`${progress}% pilot journey complete`}><i style={{ width: `${progress}%` }} /></div>
        <div className="pilot-steps">{journey.map(step => {
          const complete = step.requires.every(event => completedEvents.has(event));
          return <article key={step.id} className={complete ? "complete" : ""}><i>{complete ? "✓" : step.number}</i><div><h3>{step.title}</h3><p>{step.detail}</p></div><span>{complete ? "Recorded" : "Open"}</span></article>;
        })}</div>
        <div className="pilot-action-row"><Link className="pilot-primary" href={`/credit?pilotSession=${encodeURIComponent(session.id)}`}>{completedEvents.has("dossier_compiled") ? "Return to the Foundry →" : "Open the Foundry →"}</Link><button className="pilot-secondary" disabled={busy} onClick={askForHelp}>I need assistance</button></div>
      </section>

      <section className="pilot-outcome-grid">
        <form className="pilot-feedback" onSubmit={submitFeedback}>
          <div className="pilot-section-head"><span>OUTCOME REPORT</span><h2>Name what changed.</h2><p>Completion is evidence only when you can identify a better decision, time saved and a newly visible risk.</p></div>
          <label><span>Did the dossier improve a real decision?</span><select value={feedback.decisionImproved} onChange={event => setFeedback(current => ({ ...current, decisionImproved: event.target.value as Feedback["decisionImproved"] }))}><option value="yes">Yes</option><option value="partly">Partly</option><option value="no">No</option></select></label>
          <label><span>Which decision changed or became clearer?</span><textarea required minLength={10} maxLength={1000} rows={4} value={feedback.decisionDescription} onChange={event => setFeedback(current => ({ ...current, decisionDescription: event.target.value }))} /></label>
          <label><span>Estimated minutes saved</span><input required type="number" min={0} max={10000} value={feedback.timeSavedMinutes} onChange={event => setFeedback(current => ({ ...current, timeSavedMinutes: Number(event.target.value) }))} /></label>
          <label><span>Which risk, dependency or false assumption became visible?</span><textarea required minLength={5} maxLength={1000} rows={4} value={feedback.riskExposed} onChange={event => setFeedback(current => ({ ...current, riskExposed: event.target.value }))} /></label>
          <div className="pilot-ratings"><Rating label="Dossier usefulness" value={feedback.usefulnessScore} onChange={value => setFeedback(current => ({ ...current, usefulnessScore: value }))} /><Rating label="Workflow clarity" value={feedback.clarityScore} onChange={value => setFeedback(current => ({ ...current, clarityScore: value }))} /></div>
          <label><span>Accessibility problem encountered <small>(optional)</small></span><textarea maxLength={1000} rows={3} value={feedback.accessibilityIssue} onChange={event => setFeedback(current => ({ ...current, accessibilityIssue: event.target.value }))} /></label>
          <label className="pilot-inline-check"><input type="checkbox" checked={feedback.quoteConsent} onChange={event => setFeedback(current => ({ ...current, quoteConsent: event.target.checked }))} /><span>You may use the following quotation in the private investor evidence pack.</span></label>
          {feedback.quoteConsent && <label><span>Approved quotation</span><textarea required minLength={5} maxLength={600} rows={3} value={feedback.quoteText} onChange={event => setFeedback(current => ({ ...current, quoteText: event.target.value }))} /></label>}
          <button className="pilot-primary" disabled={busy || session.status === "completed"}>{session.status === "completed" ? "Outcome recorded ✓" : busy ? "Saving outcome…" : "Complete the pilot →"}</button>
        </form>

        <aside className="pilot-support">
          <div className="pilot-section-head"><span>PRODUCT SUPPORT</span><h2>Report friction when it happens.</h2><p>A blocking problem is valuable evidence. Reports remain attached to your pseudonymous session.</p></div>
          <form onSubmit={reportIssue}>
            <label><span>Category</span><select value={issue.category} onChange={event => setIssue(current => ({ ...current, category: event.target.value }))}><option value="usability">Usability</option><option value="clarity">Clarity</option><option value="accessibility">Accessibility</option><option value="technical">Technical</option><option value="privacy">Privacy</option><option value="other">Other</option></select></label>
            <label><span>Severity</span><select value={issue.severity} onChange={event => setIssue(current => ({ ...current, severity: event.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="blocking">Blocking</option></select></label>
            <label><span>What happened?</span><textarea required minLength={10} maxLength={2000} rows={5} value={issue.description} onChange={event => setIssue(current => ({ ...current, description: event.target.value }))} /></label>
            <button className="pilot-secondary" disabled={busy}>Record issue</button>{issueSent && <p className="pilot-success" role="status">Issue recorded for operator review.</p>}
          </form>
          <div className="pilot-integrity"><span>INTEGRITY BOUNDARY</span><p>Do not submit passwords, payment information, identity documents, customer data or private keys. Pilot evidence supports a product decision; it is not legal, tax, financial or investment advice.</p></div>
        </aside>
      </section>
    </>}

    <footer className="pilot-footer"><span>Private evidence pilot · No external AI provider</span><Link href="/credit/ops">Operator evidence room →</Link></footer>
  </main>;
}
