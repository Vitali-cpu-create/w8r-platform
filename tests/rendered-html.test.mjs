import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const environment = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const context = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the W8R investor demonstration", async () => {
  const app = await worker();
  const response = await app.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), environment, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>W8R — How can we serve you better\?<\/title>/i);
  assert.match(html, /Investor journey/);
  assert.match(html, /One transaction\. Every proof point\./);
  assert.match(html, /Interactive proof/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("the product surface includes the complete diligence journey", async () => {
  const source = await readFile(new URL("../app/w8r-platform.tsx", import.meta.url), "utf8");
  for (const capability of [
    "BTLR migration",
    "Merchant identity",
    "30-second quote",
    "Receipt vault",
    "Resale & escrow",
    "Reconciliation",
    "Protection centre",
    "Partners & resilience",
    "Investor proof",
    "accessible payment link",
  ]) assert.match(source, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(source, /No real funds/);
  assert.match(source, /licensed partners/i);
});

test("the demo API validates and isolates persisted state", async () => {
  const source = await readFile(new URL("../app/api/demo/route.ts", import.meta.url), "utf8");
  assert.match(source, /STATE_KEYS = new Set/);
  assert.match(source, /raw\.length > 20_000/);
  assert.match(source, /status: 413/);
  assert.match(source, /status: 422/);
  assert.match(source, /user\?\.userId \?\? "local-investor-demo"/);
  assert.match(source, /auditEvents/);
});

test("server-renders the provider-neutral C.R.E.D.I.T Foundry", async () => {
  const app = await worker();
  const response = await app.fetch(new Request("http://localhost/credit", { headers: { accept: "text/html" } }), environment, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /C\.R\.E\.D\.I\.T Project Foundry/);
  assert.match(html, /External AI not connected/);
  assert.match(html, /Turn conviction into an/);
  assert.match(html, /investable proof plan/);
  assert.match(html, /Phase Omega gate/);
});

test("the rules API compiles a stable, labelled blueprint without an AI provider", async () => {
  const { compileCreditProject } = await import("../lib/credit/compiler.ts");
  const brief = {
    ventureName: "Harbour Proof",
    oneLine: "A verified marketplace for repairable marine equipment.",
    customer: "Independent Australian boat owners and marine repairers.",
    problem: "Used parts lack condition evidence, ownership provenance and a dependable fulfilment path.",
    ambition: "Make repairable equipment easier to trust and keep in service.",
    revenueModel: "Transaction fee plus verified seller subscription.",
    targetPlatform: "Responsive marketplace with authorised seller imports.",
    jurisdiction: "Australia first.",
    riskProfile: "balanced",
  };
  const first = compileCreditProject(brief);
  const second = compileCreditProject(brief);
  assert.equal(first.meta.providerMode, "deterministic-rules");
  assert.equal(first.meta.fingerprint, second.meta.fingerprint);
  assert.deepEqual(first, second);
  assert.ok(first.evidence.every(item => item.label && item.owner && item.source));
  assert.ok(first.investorPasses.length === 5);
  assert.match(first.boundaries.notNow.join(" "), /Secret social scoring/i);
});

test("the rules API rejects malformed founder briefs", async () => {
  const route = await readFile(new URL("../app/api/credit/projects/route.ts", import.meta.url), "utf8");
  assert.match(route, /entries\.some\(\(\[key\]\) => !BRIEF_KEYS\.has\(key\)\)/);
  assert.match(route, /!String\(result\.ventureName/);
  assert.match(route, /!String\(result\.oneLine/);
  assert.match(route, /body\.action !== "compile"/);
  assert.match(route, /status: 422/);
});

test("Project 031 persistence is versioned and evidence-led", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/credit/projects/route.ts", import.meta.url), "utf8");
  for (const table of ["credit_projects", "credit_project_versions", "credit_evidence", "credit_build_runs", "credit_graph_nodes", "credit_graph_edges"]) {
    assert.match(schema, new RegExp(table));
  }
  assert.match(route, /credit\.blueprint\.compiled/);
  assert.match(route, /latestVersion \+ 1/);
  assert.match(route, /raw\.length > 64_000/);
  assert.match(route, /status: 413/);
  assert.match(route, /status: 422/);
});

test("server-renders the controlled founder pilot and operator evidence room", async () => {
  const app = await worker();
  for (const [path, expected] of [["/credit/pilot", /PRIVATE FOUNDER PILOT/], ["/credit/ops", /OPERATOR EVIDENCE ROOM/]]) {
    const response = await app.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), environment, context);
    assert.equal(response.status, 200);
    assert.match(await response.text(), expected);
  }
  const invited = await app.fetch(new Request("http://localhost/credit/pilot?code=CRD-ABCDEF-123456", { headers: { accept: "text/html" } }), environment, context);
  assert.equal(invited.status, 200);
  assert.match(await invited.text(), /CRD-ABCDEF-123456/);
  const foundryPilot = await app.fetch(new Request("http://localhost/credit?pilotSession=pilot-session-1", { headers: { accept: "text/html" } }), environment, context);
  assert.equal(foundryPilot.status, 200);
  assert.match(await foundryPilot.text(), /PILOT SESSION ACTIVE/);
});

test("pilot persistence is consented, bounded and pseudonymous", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/credit/pilot/route.ts", import.meta.url), "utf8");
  const admin = await readFile(new URL("../app/api/credit/pilot/admin/route.ts", import.meta.url), "utf8");
  for (const table of ["credit_pilot_invites", "credit_pilot_sessions", "credit_pilot_events", "credit_pilot_feedback", "credit_pilot_issues"]) {
    assert.match(schema, new RegExp(table));
  }
  assert.match(route, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(route, /consent\.research !== true/);
  assert.match(route, /raw\.length > 20_000/);
  assert.match(route, /Sign in is required for the pilot/);
  assert.match(admin, /CREDIT_OPERATOR_USER_IDS/);
  assert.match(admin, /participant_alias/);
  assert.doesNotMatch(admin, /SELECT[^\n]+email/i);
});

test("Day-30 gates advance only on complete event-backed evidence", async () => {
  const { calculatePilotEvidence } = await import("../lib/credit/pilot.ts");
  const sessions = Array.from({ length: 5 }, (_, index) => ({
    id: `session-${index}`,
    participantAlias: `Founder-${index}`,
    role: "founder",
    ventureStage: "validation",
    status: "completed",
    startedAt: 1_000_000 + index * 100,
    completedAt: 1_480_000 + index * 100,
    projectId: `project-${index}`,
    lastStep: "complete",
    assistanceCount: index < 3 ? 0 : 1,
    eventTypes: ["dossier_compiled", "evidence_reviewed", "investor_reviewed", "roadmap_reviewed", "revision_saved", "json_exported", "markdown_exported", "pilot_completed"],
    decisionImproved: "yes",
    decisionDescription: "The launch wedge became narrower and testable.",
    timeSavedMinutes: 90,
    riskExposed: "The partner dependency was previously hidden.",
    usefulnessScore: 5,
    clarityScore: 4,
  }));
  const passed = calculatePilotEvidence(sessions, 8);
  assert.equal(passed.exitReady, true);
  assert.equal(passed.medianMinutes, 8);
  assert.ok(passed.gates.every(gate => gate.passed));
  const missingExport = calculatePilotEvidence(sessions.map((session, index) => index === 0 ? { ...session, eventTypes: session.eventTypes.filter(event => event !== "json_exported") } : session), 8);
  assert.equal(missingExport.exitReady, false);
});
