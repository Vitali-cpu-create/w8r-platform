export const PILOT_CONSENT_VERSION = "credit-pilot-2026-09-v1";

export const PILOT_EVENT_TYPES = [
  "pilot_started",
  "brief_started",
  "dossier_compiled",
  "dossier_reviewed",
  "evidence_reviewed",
  "investor_reviewed",
  "roadmap_reviewed",
  "revision_saved",
  "json_exported",
  "markdown_exported",
  "assistance_requested",
  "progress_refreshed",
  "feedback_started",
  "pilot_completed",
] as const;

export type PilotEventType = typeof PILOT_EVENT_TYPES[number];
export type DecisionImproved = "yes" | "partly" | "no";

export type PilotSessionRecord = {
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
  decisionImproved?: DecisionImproved | null;
  decisionDescription?: string | null;
  timeSavedMinutes?: number | null;
  riskExposed?: string | null;
  usefulnessScore?: number | null;
  clarityScore?: number | null;
};

export type PilotEvidence = {
  invitedCapacity: number;
  started: number;
  completed: number;
  completionRate: number;
  medianMinutes: number | null;
  unassistedCompleted: number;
  decisionNamed: number;
  timeSavedNamed: number;
  riskNamed: number;
  bothExportsCompleted: number;
  usefulDossiers: number;
  exitReady: boolean;
  gates: { id: string; label: string; current: string; passed: boolean }[];
};

export type PilotMemoContext = {
  issues?: { severity: string; category: string; description: string; status: string }[];
  quotes?: { participantAlias: string; quote: string }[];
  accessibilityNotes?: { participantAlias: string; note: string }[];
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

export function calculatePilotEvidence(sessions: PilotSessionRecord[], invitedCapacity: number): PilotEvidence {
  const completed = sessions.filter(session => session.status === "completed" && session.completedAt);
  const completionRate = sessions.length ? Math.round(completed.length / sessions.length * 100) : 0;
  const medianMinutes = median(completed.map(session => Math.max(0, Math.round(((session.completedAt ?? session.startedAt) - session.startedAt) / 60_000))));
  const unassistedCompleted = completed.filter(session => session.assistanceCount === 0).length;
  const decisionNamed = completed.filter(session => session.decisionImproved !== "no" && Boolean(session.decisionDescription?.trim())).length;
  const timeSavedNamed = completed.filter(session => (session.timeSavedMinutes ?? 0) > 0).length;
  const riskNamed = completed.filter(session => Boolean(session.riskExposed?.trim())).length;
  const bothExportsCompleted = completed.filter(session => session.eventTypes.includes("json_exported") && session.eventTypes.includes("markdown_exported")).length;
  const usefulDossiers = completed.filter(session => (session.usefulnessScore ?? 0) >= 4).length;
  const fiveComplete = completed.length >= 5;
  const outcomeNamed = decisionNamed >= 5 && timeSavedNamed >= 5 && riskNamed >= 5;
  const independenceMet = unassistedCompleted >= 3;
  const timeMet = medianMinutes !== null && medianMinutes <= 10;
  const exportMet = bothExportsCompleted >= 5;

  return {
    invitedCapacity,
    started: sessions.length,
    completed: completed.length,
    completionRate,
    medianMinutes,
    unassistedCompleted,
    decisionNamed,
    timeSavedNamed,
    riskNamed,
    bothExportsCompleted,
    usefulDossiers,
    exitReady: fiveComplete && outcomeNamed && independenceMet && timeMet && exportMet,
    gates: [
      { id: "five-complete", label: "Five external founders complete", current: `${completed.length} / 5`, passed: fiveComplete },
      { id: "outcome-named", label: "Decision, time and risk named", current: `${Math.min(decisionNamed, timeSavedNamed, riskNamed)} / 5`, passed: outcomeNamed },
      { id: "unassisted", label: "At least three complete unassisted", current: `${unassistedCompleted} / 3`, passed: independenceMet },
      { id: "under-ten", label: "Median completion in ten minutes", current: medianMinutes === null ? "Awaiting data" : `${medianMinutes} min`, passed: timeMet },
      { id: "portable", label: "Both exports completed", current: `${bothExportsCompleted} / 5`, passed: exportMet },
    ],
  };
}

export function pilotResultsMarkdown(evidence: PilotEvidence, sessions: PilotSessionRecord[], generatedAt = new Date(), context: PilotMemoContext = {}): string {
  const verdict = evidence.exitReady ? "ADVANCE TO 31–60 DAY HORIZON" : "CONTINUE 0–30 DAY PROOF LOOP";
  return [
    "# C.R.E.D.I.T Project Foundry — Pilot Evidence Memo",
    "",
    `**Generated:** ${generatedAt.toISOString()}`,
    "",
    `**Decision:** ${verdict}`,
    "",
    "## Day-30 evidence",
    "",
    `- Invitation capacity: ${evidence.invitedCapacity}`,
    `- Started: ${evidence.started}`,
    `- Completed: ${evidence.completed}`,
    `- Completion rate: ${evidence.completionRate}%`,
    `- Median completion time: ${evidence.medianMinutes === null ? "Awaiting data" : `${evidence.medianMinutes} minutes`}`,
    `- Completed without assistance: ${evidence.unassistedCompleted}`,
    `- Decision, time saved and risk all named: ${Math.min(evidence.decisionNamed, evidence.timeSavedNamed, evidence.riskNamed)}`,
    `- Both portable exports completed: ${evidence.bothExportsCompleted}`,
    "",
    "## Exit gates",
    "",
    ...evidence.gates.map(gate => `- ${gate.passed ? "PASS" : "OPEN"} — ${gate.label}: ${gate.current}`),
    "",
    "## Pseudonymous session record",
    "",
    "| Participant | Status | Minutes | Assistance | Usefulness |",
    "| --- | --- | ---: | ---: | ---: |",
    ...sessions.map(session => `| ${session.participantAlias} | ${session.status} | ${session.completedAt ? Math.max(0, Math.round((session.completedAt - session.startedAt) / 60_000)) : "—"} | ${session.assistanceCount} | ${session.usefulnessScore ?? "—"} |`),
    "",
    "## Consented participant voice",
    "",
    ...(context.quotes?.length ? context.quotes.map(item => `- ${item.participantAlias}: “${item.quote}”`) : ["- No quotations have been approved for use."]),
    "",
    "## Product and accessibility issues",
    "",
    ...(context.issues?.length ? context.issues.map(item => `- ${item.status.toUpperCase()} · ${item.severity.toUpperCase()} · ${item.category}: ${item.description}`) : ["- No product issues recorded."]),
    ...(context.accessibilityNotes?.length ? context.accessibilityNotes.map(item => `- ACCESSIBILITY · ${item.participantAlias}: ${item.note}`) : ["- No accessibility notes recorded."]),
    "",
    "## Product and integrity boundary",
    "",
    "This pilot evaluates the provider-neutral brief-to-dossier proof loop. W8R marketplace transactions, OfPay settlement, identity checks, receipt credentials, custody, escrow and regulated services remain simulated or dependency-gated.",
    "",
    "No participant email, private key, identity document, payment credential or confidential customer dataset is included in this report.",
  ].join("\n");
}
