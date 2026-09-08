"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blueprintToMarkdown, compileCreditProject, DEFAULT_BRIEF } from "@/lib/credit/compiler";
import type { CreditBlueprint, DeliveryStatus, FounderBrief } from "@/lib/credit/types";

type View = "brief" | "dossier" | "architecture" | "evidence" | "investor" | "roadmap";
type Persistence = "loading" | "d1" | "local" | "error";
type ProjectSummary = { id: string; name: string; status: string; latestVersion: number; updatedAt: number };

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
    execute: (input: unknown) => unknown | Promise<unknown>;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

declare global {
  interface Document { modelContext?: ModelContext }
}

const views: { id: View; number: string; label: string; sub: string }[] = [
  { id: "brief", number: "01", label: "Founder brief", sub: "Frame the idea" },
  { id: "dossier", number: "02", label: "C.R.E.D.I.T", sub: "Decision dossier" },
  { id: "architecture", number: "03", label: "Architecture", sub: "Capability graph" },
  { id: "evidence", number: "04", label: "Evidence lab", sub: "Claims & provenance" },
  { id: "investor", number: "05", label: "Investor room", sub: "Bounce-back × 5" },
  { id: "roadmap", number: "06", label: "MVP runway", sub: "Tests & milestones" },
];

const statusClass: Record<DeliveryStatus, string> = {
  "PROTOTYPE": "prototype",
  "MVP NEXT": "mvp",
  "DEPENDENCY": "dependency",
  "EXPANSION": "expansion",
  "NOT NOW": "not-now",
  "LIVE": "live",
};

function download(name: string, content: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function fileBase(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "credit-project";
}

function Mark({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "teal" | "pink" | "muted" }) {
  return <span className={`credit-mark credit-mark-${tone}`}>{children}</span>;
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <article className="credit-metric"><span>{label}</span><strong>{value}</strong><div aria-hidden="true"><i style={{ width: `${value}%` }} /></div><small>{note}</small></article>;
}

function Field({ label, hint, wide = false, children }: { label: string; hint: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "credit-field credit-field-wide" : "credit-field"}><span><b>{label}</b><small>{hint}</small></span>{children}</label>;
}

function Status({ value }: { value: DeliveryStatus }) {
  return <span className={`credit-status credit-status-${statusClass[value]}`}>{value}</span>;
}

function validateToolBrief(input: unknown): FounderBrief {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("A structured founder brief is required.");
  const source = input as Record<string, unknown>;
  const limits: Record<string, number> = { ventureName: 120, oneLine: 500, customer: 800, problem: 1200, ambition: 1200, revenueModel: 800, targetPlatform: 500, jurisdiction: 240 };
  const allowed = new Set([...Object.keys(limits), "riskProfile"]);
  if (Object.keys(source).some(key => !allowed.has(key))) throw new Error("The founder brief contains an unsupported field.");
  for (const [key, limit] of Object.entries(limits)) {
    if (source[key] !== undefined && (typeof source[key] !== "string" || source[key].length > limit)) throw new Error(`${key} must be text no longer than ${limit} characters.`);
  }
  const required = ["ventureName", "oneLine", "customer", "problem"];
  for (const key of required) if (typeof source[key] !== "string" || !source[key].trim()) throw new Error(`${key} is required.`);
  const risk = source.riskProfile;
  if (risk !== undefined && !["conservative", "balanced", "frontier"].includes(String(risk))) throw new Error("riskProfile must be conservative, balanced or frontier.");
  return compileCreditProject(source as Partial<FounderBrief>).brief;
}

export default function CreditFoundry({ viewer, initialPilotSessionId = null }: { viewer: { displayName: string; authenticated: boolean }; initialPilotSessionId?: string | null }) {
  const [view, setView] = useState<View>("brief");
  const [brief, setBrief] = useState<FounderBrief>(DEFAULT_BRIEF);
  const [blueprint, setBlueprint] = useState<CreditBlueprint>(() => compileCreditProject(DEFAULT_BRIEF));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [persistence, setPersistence] = useState<Persistence>("loading");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(initialPilotSessionId ? "Pilot mode active · actions contribute to the Day-30 evidence gates" : "Provider-neutral blueprint ready");
  const pilotSessionId = initialPilotSessionId;

  const completion = useMemo(() => Math.round(Object.values(brief).filter(value => String(value).trim().length > 20).length / Object.keys(brief).length * 100), [brief]);
  const dependencies = blueprint.evidence.filter(item => item.label === "DEPENDENCY").length;

  const update = <K extends keyof FounderBrief>(key: K, value: FounderBrief[K]) => setBrief(current => ({ ...current, [key]: value }));

  const trackPilot = useCallback(async (eventType: string, step: string, metadata: Record<string, unknown> = {}) => {
    if (!pilotSessionId) return;
    try {
      await fetch("/api/credit/pilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "event", sessionId: pilotSessionId, eventType, step, metadata }),
      });
    } catch {
      // The core Foundry remains usable if optional pilot telemetry is unavailable.
    }
  }, [pilotSessionId]);

  const changeView = useCallback((next: View) => {
    setView(next);
    const eventByView: Partial<Record<View, string>> = {
      dossier: "dossier_reviewed",
      evidence: "evidence_reviewed",
      investor: "investor_reviewed",
      roadmap: "roadmap_reviewed",
    };
    const eventType = eventByView[next];
    if (eventType) void trackPilot(eventType, next, { view: next });
  }, [trackPilot]);

  const saveCompilation = useCallback(async (nextBrief: FounderBrief, currentProjectId: string | null = projectId) => {
    setBusy(true);
    setNotice("Compiling governed blueprint…");
    const immediate = compileCreditProject(nextBrief);
    setBlueprint(immediate);
    try {
      const response = await fetch("/api/credit/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "compile", brief: nextBrief, projectId: currentProjectId }),
      });
      const result = await response.json() as { error?: string; projectId?: string; version?: number; blueprint?: CreditBlueprint; persistence?: "d1" | "local" };
      if (!response.ok && response.status !== 202) throw new Error(result.error ?? "Compilation failed");
      if (result.blueprint) setBlueprint(result.blueprint);
      if (result.projectId) setProjectId(result.projectId);
      if (result.version) setVersion(result.version);
      setPersistence(result.persistence ?? "local");
      setNotice(result.persistence === "d1" ? `Version ${result.version} saved to the private evidence ledger` : "Blueprint compiled locally; database persistence is unavailable in this preview");
      if (result.persistence === "d1") {
        const refreshed = await fetch("/api/credit/projects").then(item => item.json()) as { projects?: ProjectSummary[] };
        setProjects(refreshed.projects ?? []);
      }
      await trackPilot("dossier_compiled", "dossier", {
        projectId: result.projectId,
        version: result.version,
        fingerprint: (result.blueprint ?? immediate).meta.fingerprint,
      });
      if ((result.version ?? 0) > 1) await trackPilot("revision_saved", "revision", { projectId: result.projectId, version: result.version });
      return { projectId: result.projectId, version: result.version, fingerprint: (result.blueprint ?? immediate).meta.fingerprint, persistence: result.persistence ?? "local" };
    } catch (error) {
      setPersistence("error");
      setNotice(error instanceof Error ? error.message : "Blueprint compiled, but could not be saved");
      return { projectId: currentProjectId, version, fingerprint: immediate.meta.fingerprint, persistence: "local" as const };
    } finally {
      setBusy(false);
    }
  }, [projectId, trackPilot, version]);

  useEffect(() => {
    fetch("/api/credit/projects").then(async response => {
      if (!response.ok) throw new Error("History unavailable");
      return response.json() as Promise<{ projects?: ProjectSummary[]; current?: { project: ProjectSummary; brief: FounderBrief; blueprint: CreditBlueprint } | null; persistence?: "d1" | "local" }>;
    }).then(result => {
      setProjects(result.projects ?? []);
      setPersistence(result.persistence ?? "local");
      if (result.current && !pilotSessionId) {
        setBrief(result.current.brief);
        setBlueprint(result.current.blueprint);
        setProjectId(result.current.project.id);
        setVersion(result.current.project.latestVersion);
        setNotice(`Restored ${result.current.project.name} · version ${result.current.project.latestVersion}`);
      }
    }).catch(() => setPersistence("local"));
  }, [pilotSessionId]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "compile_credit_project",
        title: "Compile C.R.E.D.I.T project",
        description: "Compile and save a provider-neutral C.R.E.D.I.T blueprint from a complete founder brief, updating the visible workspace.",
        inputSchema: {
          type: "object",
          properties: {
            ventureName: { type: "string", minLength: 1, maxLength: 120 },
            oneLine: { type: "string", minLength: 1, maxLength: 500 },
            customer: { type: "string", minLength: 1, maxLength: 800 },
            problem: { type: "string", minLength: 1, maxLength: 1200 },
            ambition: { type: "string", maxLength: 1200 },
            revenueModel: { type: "string", maxLength: 800 },
            targetPlatform: { type: "string", maxLength: 500 },
            jurisdiction: { type: "string", maxLength: 240 },
            riskProfile: { type: "string", enum: ["conservative", "balanced", "frontier"] },
          },
          required: ["ventureName", "oneLine", "customer", "problem"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async input => {
          const next = validateToolBrief(input);
          setBrief(next);
          changeView("dossier");
          const result = await saveCompilation(next, null);
          return { status: "compiled", ...result };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "read_credit_dossier",
        title: "Read current C.R.E.D.I.T dossier",
        description: "Read a concise summary of the currently visible blueprint without changing it.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({
          ventureName: blueprint.brief.ventureName,
          fingerprint: blueprint.meta.fingerprint,
          overallScore: blueprint.scorecard.overall,
          constitutionalVerdict: blueprint.constitution.verdict,
          wedge: blueprint.executive.wedge,
          dependencies: blueprint.evidence.filter(item => item.label === "DEPENDENCY").map(item => item.claim),
          nextProof: blueprint.executive.singleSlide.proofNext,
        }),
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [blueprint, changeView, saveCompilation]);

  const loadProject = async (id: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/credit/projects?projectId=${encodeURIComponent(id)}`);
      const result = await response.json() as { current?: { project: ProjectSummary; brief: FounderBrief; blueprint: CreditBlueprint } };
      if (!response.ok || !result.current) throw new Error("Project could not be restored");
      setBrief(result.current.brief);
      setBlueprint(result.current.blueprint);
      setProjectId(result.current.project.id);
      setVersion(result.current.project.latestVersion);
      setNotice(`Restored version ${result.current.project.latestVersion}`);
      setView("dossier");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Project could not be restored");
    } finally {
      setBusy(false);
    }
  };

  const newProject = () => {
    setBrief(DEFAULT_BRIEF);
    setBlueprint(compileCreditProject(DEFAULT_BRIEF));
    setProjectId(null);
    setVersion(0);
    setNotice("New unsaved project prepared");
    setView("brief");
  };

  const exportJson = () => {
    void trackPilot("json_exported", "exports", { format: "json" });
    download(`${fileBase(blueprint.brief.ventureName)}-blueprint.json`, JSON.stringify(blueprint, null, 2), "application/json");
  };
  const exportMarkdown = () => {
    void trackPilot("markdown_exported", "exports", { format: "markdown" });
    download(`${fileBase(blueprint.brief.ventureName)}-dossier.md`, blueprintToMarkdown(blueprint), "text/markdown");
  };

  return <main className="credit-shell">
    <a className="skip-link" href="#credit-workspace">Skip to Foundry workspace</a>
    <aside className="credit-rail">
      <Link className="credit-brand" href="/" aria-label="W8R investor demonstration"><b>W8R</b><span>C.R.E.D.I.T<br />PROJECT FOUNDRY</span></Link>
      <div className="credit-provider"><i aria-hidden="true">◆</i><span><b>RULES ENGINE ACTIVE</b><small>External AI not connected</small></span></div>
      <nav aria-label="C.R.E.D.I.T project sections">
        {views.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => changeView(item.id)} aria-current={view === item.id ? "page" : undefined}><i>{item.number}</i><span><b>{item.label}</b><small>{item.sub}</small></span></button>)}
      </nav>
      <div className="credit-rail-status"><span className={`credit-save credit-save-${persistence}`}>● {persistence === "loading" ? "Connecting" : persistence === "d1" ? "Private ledger saved" : persistence === "error" ? "Save needs attention" : "Local compilation"}</span><small>{projectId ? `Version ${version} · ${blueprint.meta.fingerprint}` : "Unsaved working copy"}</small></div>
    </aside>

    <section className="credit-workspace" id="credit-workspace">
      <header className="credit-topbar">
        <div><Mark tone="teal">PROJECT 031</Mark><span>Purpose → proof → product</span></div>
        <div className="credit-top-actions"><Link href="/credit/pilot">Founder pilot</Link><Link href="/credit/ops">Evidence room</Link><button onClick={exportMarkdown}>Export .md</button><button onClick={exportJson}>Export JSON</button><div><small>{viewer.authenticated ? "Private founder workspace" : "Local founder sandbox"}</small><b>{viewer.displayName}</b></div></div>
      </header>

      <div className="credit-notice" role="status"><i>✓</i><span>{notice}</span><b>{blueprint.meta.engine}</b></div>
      {pilotSessionId && <div className="credit-pilot-strip"><span><b>PILOT SESSION ACTIVE</b> Complete the standard journey, then return to record the outcome.</span><Link href={`/credit/pilot?session=${encodeURIComponent(pilotSessionId)}`}>Return to pilot →</Link></div>}

      {view === "brief" && <div className="credit-screen">
        <div className="credit-hero">
          <div><span className="credit-eyebrow">THE GOVERNED STARTING POINT</span><h1>Turn conviction into an <em>investable proof plan.</em></h1><p>The Foundry separates what you know, what you believe, what must be tested and what must wait. Its core output is stable, private and independent of any AI provider.</p></div>
          <div className="credit-hero-seal"><span>Ω</span><b>{blueprint.constitution.verdict}</b><small>Phase Omega gate</small></div>
        </div>
        <div className="credit-brief-layout">
          <form className="credit-form-panel" onSubmit={event => { event.preventDefault(); void saveCompilation(brief); }}>
            <div className="credit-panel-head"><div><span>FOUNDER INTAKE</span><h2>What are we building?</h2></div><strong>{completion}%<small>brief signal</small></strong></div>
            <div className="credit-form-grid">
              <Field label="Venture name" hint="The name investors and customers will remember"><input required maxLength={120} value={brief.ventureName} onChange={event => update("ventureName", event.target.value)} /></Field>
              <Field label="Risk posture" hint="How aggressively should scope be challenged?"><select value={brief.riskProfile} onChange={event => update("riskProfile", event.target.value as FounderBrief["riskProfile"])}><option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="frontier">Frontier</option></select></Field>
              <Field wide label="One-line promise" hint="What changes for the customer—and why should they care?"><textarea required maxLength={500} rows={2} value={brief.oneLine} onChange={event => update("oneLine", event.target.value)} /></Field>
              <Field wide label="First customer" hint="Name the narrowest group with the strongest pain"><textarea required maxLength={800} rows={2} value={brief.customer} onChange={event => update("customer", event.target.value)} /></Field>
              <Field wide label="Painful truth" hint="Describe the current problem, cost, delay or exposure"><textarea required maxLength={1200} rows={3} value={brief.problem} onChange={event => update("problem", event.target.value)} /></Field>
              <Field wide label="Long ambition" hint="The destination, not the first release"><textarea maxLength={1200} rows={2} value={brief.ambition} onChange={event => update("ambition", event.target.value)} /></Field>
              <Field label="Revenue logic" hint="Who pays, for what and how often?"><textarea maxLength={800} rows={3} value={brief.revenueModel} onChange={event => update("revenueModel", event.target.value)} /></Field>
              <Field label="Delivery surface" hint="Where the first useful outcome lives"><textarea maxLength={500} rows={3} value={brief.targetPlatform} onChange={event => update("targetPlatform", event.target.value)} /></Field>
              <Field wide label="First jurisdiction" hint="Where law, tax, privacy and consumer duties begin"><input maxLength={240} value={brief.jurisdiction} onChange={event => update("jurisdiction", event.target.value)} /></Field>
            </div>
            <div className="credit-form-actions"><button type="button" className="credit-secondary" onClick={newProject}>Reset example</button><button className="credit-primary" disabled={busy}>{busy ? "Compiling…" : projectId ? "Compile new version →" : "Compile governed blueprint →"}</button></div>
          </form>
          <aside className="credit-signal-panel">
            <div className="credit-panel-head"><div><span>LIVE READINESS SIGNAL</span><h2>Before the story hardens.</h2></div><Mark tone={blueprint.scorecard.overall > 75 ? "teal" : "gold"}>{blueprint.scorecard.overall}/100</Mark></div>
            <div className="credit-signal-ring" style={{ "--score": `${blueprint.scorecard.overall * 3.6}deg` } as React.CSSProperties}><div><strong>{blueprint.scorecard.overall}</strong><span>decision<br />readiness</span></div></div>
            <dl><div><dt>Constitution</dt><dd>{blueprint.constitution.verdict}</dd></div><div><dt>Evidence claims</dt><dd>{blueprint.evidence.length}</dd></div><div><dt>Open dependencies</dt><dd>{dependencies}</dd></div><div><dt>Selected capabilities</dt><dd>{blueprint.architecture.nodes.length}</dd></div></dl>
            <div className="credit-wedge"><span>INVESTABLE WEDGE</span><p>{blueprint.executive.wedge}</p></div>
            {projects.length > 0 && <div className="credit-history"><span>RECENT PRIVATE PROJECTS</span>{projects.slice(0, 4).map(project => <button key={project.id} onClick={() => void loadProject(project.id)}><span><b>{project.name}</b><small>{new Date(project.updatedAt).toLocaleDateString("en-AU")} · v{project.latestVersion}</small></span><i>→</i></button>)}</div>}
          </aside>
        </div>
      </div>}

      {view === "dossier" && <div className="credit-screen">
        <div className="credit-section-head"><div><span>C.R.E.D.I.T DECISION DOSSIER</span><h1>{blueprint.brief.ventureName}</h1><p>{blueprint.executive.thesis}</p></div><div><Mark>{blueprint.meta.fingerprint}</Mark><button className="credit-primary" onClick={() => changeView("brief")}>Revise brief</button></div></div>
        <article className="credit-single-slide"><header><span>THE SINGLE SLIDE</span><b>01 / CAPITAL CLARITY</b></header><div><section><small>PROBLEM</small><p>{blueprint.executive.singleSlide.problem}</p></section><section><small>SOLUTION</small><p>{blueprint.executive.singleSlide.solution}</p></section><section><small>FIRST CUSTOMER</small><p>{blueprint.executive.singleSlide.customer}</p></section><section><small>BUSINESS MODEL</small><p>{blueprint.executive.singleSlide.businessModel}</p></section><section className="accent"><small>NEXT PROOF</small><p>{blueprint.executive.singleSlide.proofNext}</p></section><section className="dark"><small>THE ASK</small><p>{blueprint.executive.singleSlide.ask}</p></section></div></article>
        <div className="credit-stage-grid">{blueprint.stages.map(stage => <article key={stage.letter}><header><i>{stage.letter}</i><div><b>{stage.name}</b><span>{stage.mandate}</span></div></header><h3>Decisions</h3>{stage.decisions.map(item => <p key={item}>✓ {item}</p>)}<h3>Questions still open</h3>{stage.openQuestions.map(item => <p className="question" key={item}>→ {item}</p>)}</article>)}</div>
        <div className="credit-boundaries"><article><span>VISION</span><h2>{blueprint.boundaries.vision}</h2></article><article><span>WEDGE</span><h2>{blueprint.boundaries.wedge}</h2></article><article><span>MVP</span>{blueprint.boundaries.mvp.map(item => <p key={item}>✓ {item}</p>)}</article><article><span>NOT NOW</span>{blueprint.boundaries.notNow.map(item => <p key={item}>× {item}</p>)}</article></div>
      </div>}

      {view === "architecture" && <div className="credit-screen">
        <div className="credit-section-head"><div><span>CAPABILITY ARCHITECTURE</span><h1>A build map with boundaries.</h1><p>The graph selects reusable modules from the brief. Status is explicit: a dependency is not a feature, a prototype is not live, and expansion is not the MVP.</p></div><Mark tone="teal">{blueprint.architecture.nodes.length} MODULES</Mark></div>
        <div className="credit-legend">{(["PROTOTYPE", "MVP NEXT", "DEPENDENCY", "EXPANSION", "NOT NOW"] as DeliveryStatus[]).map(item => <Status key={item} value={item} />)}</div>
        <div className="credit-architecture-layout"><article className="credit-graph">{blueprint.architecture.nodes.map((node, index) => <div className={`credit-node credit-node-${node.kind}`} key={node.id}><header><i>{String(index + 1).padStart(2, "0")}</i><Status value={node.status} /></header><h2>{node.label}</h2><p>{node.description}</p><small>{node.kind.toUpperCase()}</small></div>)}</article>
          <aside className="credit-adapters"><div className="credit-panel-head"><div><span>ADAPTER CONTRACT</span><h2>Authorised, observable, replaceable.</h2></div><Mark tone="pink">NO CLONING</Mark></div>{blueprint.adapters.map(adapter => <details key={adapter.id}><summary><span><b>{adapter.name}</b><small>{adapter.category}</small></span><Status value={adapter.status} /></summary><p><strong>Authorisation</strong>{adapter.authorisation}</p><p><strong>Data boundary</strong>{adapter.dataBoundary}</p><ul>{adapter.certification.map(item => <li key={item}>{item}</li>)}</ul></details>)}</aside>
        </div>
      </div>}

      {view === "evidence" && <div className="credit-screen">
        <div className="credit-section-head"><div><span>EVIDENCE LAB</span><h1>No claim without a label.</h1><p>The ledger prevents rhetoric from becoming “truth” by repetition. Founder intent is preserved; market, performance and regulatory claims remain owned tests or gates.</p></div><Mark>{blueprint.evidence.length} CLAIMS</Mark></div>
        <div className="credit-metrics"><Metric label="Clarity" value={blueprint.scorecard.clarity} note="Promise and customer definition" /><Metric label="Evidence" value={blueprint.scorecard.evidence} note="Ownership and provenance" /><Metric label="Economics" value={blueprint.scorecard.economics} note="Value capture readiness" /><Metric label="Integrity" value={blueprint.scorecard.integrity} note="Boundaries and safeguards" /></div>
        <div className="credit-table-wrap"><table className="credit-table"><thead><tr><th>Label</th><th>Claim</th><th>Source / next evidence</th><th>Owner</th><th>Status</th></tr></thead><tbody>{blueprint.evidence.map(item => <tr key={item.id}><td><span className={`evidence-label evidence-label-${item.label.toLowerCase().replaceAll(" ", "-")}`}>{item.label}</span></td><td>{item.claim}</td><td>{item.source}</td><td>{item.owner}</td><td>{item.status}</td></tr>)}</tbody></table></div>
        <div className="credit-integrity-callout"><span>INTEGRITY RULE</span><h2>A compelling sentence does not upgrade an assumption into a fact.</h2><p>Changes create versions. Regulated functions stay dependency-gated. Trust signals stay visible, purpose-limited, correctable and appealable.</p></div>
      </div>}

      {view === "investor" && <div className="credit-screen">
        <div className="credit-section-head"><div><span>MID-THIRTIES INVESTOR BOUNCE-BACK</span><h1>Five passes before the pitch.</h1><p>The investor is excited by leverage but allergic to unpriced complexity. Each pass ends with a concrete change, not applause.</p></div><Mark tone="pink">5 × CHALLENGE</Mark></div>
        <div className="credit-investor-grid">{blueprint.investorPasses.map(pass => <article key={pass.pass}><header><i>{pass.pass}</i><span><b>{pass.lens}</b><small>{pass.verdict}</small></span></header><h2>{pass.question}</h2><p>{pass.note}</p><div><span>REQUIRED CHANGE</span><p>{pass.requiredChange}</p></div></article>)}</div>
        <article className="credit-investor-verdict"><div><Mark tone="teal">INVESTOR TAKEAWAY</Mark><h2>{blueprint.executive.headline}</h2><p>Most exciting: a reusable governance and evidence layer can make future products faster and safer. Most limiting: breadth. The next round must buy one proof loop, not every possible platform.</p></div><div><span>NEXT PROOF</span><p>{blueprint.executive.singleSlide.proofNext}</p></div></article>
      </div>}

      {view === "roadmap" && <div className="credit-screen">
        <div className="credit-section-head"><div><span>TRACTION & TESTABLE MVP</span><h1>Earn the right to expand.</h1><p>The roadmap is sequenced by uncertainty removed. Each horizon ends in evidence that can change the decision.</p></div><button className="credit-primary" onClick={exportMarkdown}>Download full dossier</button></div>
        <div className="credit-roadmap">{blueprint.milestones.map((milestone, index) => <article key={milestone.horizon}><header><i>{String(index + 1).padStart(2, "0")}</i><b>{milestone.horizon}</b></header><h2>{milestone.outcome}</h2><div><span>EXIT EVIDENCE</span><p>{milestone.proof}</p></div></article>)}</div>
        <div className="credit-test-layout"><article><div className="credit-panel-head"><div><span>ACCEPTANCE TESTS</span><h2>What must be true.</h2></div><Mark tone="teal">{blueprint.acceptanceTests.length} TESTS</Mark></div>{blueprint.acceptanceTests.map((item, index) => <p key={item}><i>{String(index + 1).padStart(2, "0")}</i>{item}</p>)}</article><article className="credit-kill"><div className="credit-panel-head"><div><span>KILL / PIVOT CRITERIA</span><h2>What makes us stop.</h2></div><Mark tone="pink">PRE-COMMITTED</Mark></div>{blueprint.killCriteria.map(item => <p key={item}>× {item}</p>)}</article></div>
        <div className="credit-export-callout"><div><span>PORTABLE BY DESIGN</span><h2>Your strategy is not trapped here.</h2><p>Export the complete blueprint with identifiers, evidence labels, scope boundaries and acceptance tests. The core system remains useful without an AI subscription.</p></div><div><button className="credit-secondary" onClick={exportJson}>Blueprint JSON</button><button className="credit-primary" onClick={exportMarkdown}>Decision dossier .md</button></div></div>
      </div>}

      <footer className="credit-footer"><span>C.R.E.D.I.T Project Foundry · Private prototype · No external AI provider</span><Link href="/">Return to W8R investor demonstration →</Link></footer>
    </section>
  </main>;
}
