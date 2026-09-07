import { selectAdapters, selectCapabilities } from "./catalog";
import type {
  CapabilityEdge,
  CreditBlueprint,
  CreditStage,
  EvidenceClaim,
  FounderBrief,
  InvestorPass,
  RiskProfile,
} from "./types";

export const CREDIT_ENGINE_VERSION = "0.3.0-rulebook.1";

export const DEFAULT_BRIEF: FounderBrief = {
  ventureName: "C.R.E.D.I.T Project Foundry",
  oneLine: "A governed idea-to-evidence system that turns an entrepreneurial brief into an investable blueprint and build plan.",
  customer: "Founder-led ventures that need clarity, credible scope and a testable path before committing serious capital.",
  problem: "Big ideas fragment across documents, decks, mind maps and software experiments without shared evidence, boundaries or delivery logic.",
  ambition: "Make W8R, OfPay and BTLR the first reusable modules in a provider-neutral platform that can prepare and govern many ventures.",
  revenueModel: "Tiered workspace subscription, implementation services and certified adapter participation fees.",
  targetPlatform: "Private web workspace first; organisation platform and authorised commerce adapters next.",
  jurisdiction: "Australia first, with jurisdiction gates before expansion.",
  riskProfile: "balanced",
};

const stageNames: Record<CreditStage["letter"], [string, string]> = {
  C: ["Clarify", "Concept, customer and claims"],
  R: ["Research", "Reality, rivals and risk"],
  E: ["Engineer", "Economics, experience and edge"],
  D: ["Design", "Brand, deck and delivery"],
  I: ["Interrogate", "Investor challenge and iteration"],
  T: ["Translate", "Traction, testable MVP and one takeaway"],
};

function clean(value: string, fallback: string): string {
  const normalised = value.replace(/\s+/g, " ").trim();
  return normalised || fallback;
}

export function normaliseBrief(input: Partial<FounderBrief>): FounderBrief {
  const risk: RiskProfile = ["conservative", "balanced", "frontier"].includes(input.riskProfile ?? "")
    ? input.riskProfile as RiskProfile
    : "balanced";
  return {
    ventureName: clean(input.ventureName ?? "", "Untitled venture"),
    oneLine: clean(input.oneLine ?? "", "A venture requiring a clear, testable value proposition."),
    customer: clean(input.customer ?? "", "A defined early adopter segment"),
    problem: clean(input.problem ?? "", "A costly, frequent problem that needs validation"),
    ambition: clean(input.ambition ?? "", "Build a trusted, useful and economically sustainable product"),
    revenueModel: clean(input.revenueModel ?? "", "Revenue model to be validated with customers"),
    targetPlatform: clean(input.targetPlatform ?? "", "Responsive web MVP"),
    jurisdiction: clean(input.jurisdiction ?? "", "Australia first"),
    riskProfile: risk,
  };
}

function canonicalBrief(brief: FounderBrief): string {
  return Object.entries(brief)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value).trim().toLowerCase()}`)
    .join("|");
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `cr-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function claims(brief: FounderBrief, hasPayments: boolean, hasMigration: boolean): EvidenceClaim[] {
  const base: EvidenceClaim[] = [
    { id: "ev-01", label: "FOUNDER INPUT", claim: sentence(brief.oneLine), source: "Current founder brief", owner: "Founder", status: "owned" },
    { id: "ev-02", label: "FOUNDER INPUT", claim: `Primary customer: ${brief.customer}`, source: "Current founder brief", owner: "Founder", status: "owned" },
    { id: "ev-03", label: "FOUNDER INPUT", claim: `Problem to solve: ${brief.problem}`, source: "Current founder brief", owner: "Founder", status: "owned" },
    { id: "ev-04", label: "FOUNDER INPUT", claim: `Proposed business model: ${brief.revenueModel}`, source: "Current founder brief", owner: "Founder / CFO", status: "owned" },
    { id: "ev-05", label: "ASSUMPTION", claim: "The named early adopter experiences this problem frequently enough to change behaviour.", source: "Requires interviews and observed workflow evidence", owner: "Product lead", status: "research" },
    { id: "ev-06", label: "HYPOTHESIS", claim: "A governed first blueprint can be completed in under ten minutes without live assistance.", source: "Five-user completion test", owner: "Product lead", status: "test" },
    { id: "ev-07", label: "TARGET", claim: "At least four of five pilot founders can accurately restate the wedge and next proof after one walkthrough.", source: "Pilot comprehension scorecard", owner: "Founder / BDM", status: "test" },
    { id: "ev-08", label: "RECOMMENDATION", claim: "Fund one narrow proof loop before expanding the platform surface.", source: "C.R.E.D.I.T scope discipline", owner: "Executive team", status: "owned" },
    { id: "ev-09", label: "DEPENDENCY", claim: `Launch and claims must be reviewed for ${brief.jurisdiction}.`, source: "Current legal, consumer, privacy and sector advice", owner: "Legal / risk", status: "gate" },
    { id: "ev-10", label: "UNVERIFIED CLAIM", claim: "The proposed model will outperform existing alternatives on conversion, cost or trust.", source: "Controlled pilot required", owner: "Growth lead", status: "test" },
  ];
  if (hasMigration) base.push({ id: "ev-11", label: "DEPENDENCY", claim: "Seller migration depends on documented APIs, export rights and explicit merchant authorisation.", source: "Platform API terms and granted scopes", owner: "Integration lead", status: "gate" });
  if (hasPayments) base.push({ id: "ev-12", label: "DEPENDENCY", claim: "Live exchange, custody, transfer or settlement requires a documented regulatory perimeter and approved partners.", source: "Current jurisdiction-specific legal advice", owner: "CEO / compliance", status: "gate" });
  return base;
}

function buildStages(brief: FounderBrief): CreditStage[] {
  const content: Record<CreditStage["letter"], { decisions: string[]; questions: string[] }> = {
    C: {
      decisions: [
        `${brief.ventureName} serves ${brief.customer}`,
        `The job to be done is to resolve: ${brief.problem}`,
        `The governing ambition is: ${brief.ambition}`,
      ],
      questions: ["Which customer segment feels the pain most often and already pays for a workaround?", "Which phrase in the one-line promise would a customer reject or misunderstand?"],
    },
    R: {
      decisions: ["Treat market size, competitor performance and conversion claims as unverified until sourced.", "Research direct products, substitutes, manual workarounds and the cost of doing nothing.", `Validate regulatory, privacy and consumer boundaries in ${brief.jurisdiction}.`],
      questions: ["What evidence proves urgency rather than founder enthusiasm?", "Which incumbent owns distribution, data portability or trust?"],
    },
    E: {
      decisions: [`Test the model: ${brief.revenueModel}`, "Model contribution margin after onboarding, support, partner, fraud and infrastructure costs.", "Design the complete happy path plus failure, recovery, accessibility and operator paths."],
      questions: ["What is the smallest paid outcome?", "Which cost or risk scales faster than revenue?"],
    },
    D: {
      decisions: ["Brand voice: composed, service-led, exact and visibly honest about status.", `Delivery surface: ${brief.targetPlatform}`, "Use the same evidence labels in product, deck, roadmap and diligence material."],
      questions: ["Can the customer recognise the promise in five seconds?", "Does the design communicate evidence without becoming a compliance dashboard?"],
    },
    I: {
      decisions: ["Run five investor passes: customer truth, moat, economics, execution and integrity.", "Convert every objection into a test, boundary or explicit dependency.", "Do not let a persuasive narrative upgrade an assumption into a fact."],
      questions: ["Why this team, why now and why can the wedge expand?", "What evidence would make a disciplined investor say no?"],
    },
    T: {
      decisions: ["Ship one end-to-end proof loop before broad platform expansion.", "Define measurable acceptance and kill criteria before pilot recruitment.", "Make the next capital ask purchase a specific reduction in uncertainty."],
      questions: ["What will be live in 30 days?", "Which result earns the right to build the 180-day expansion?"],
    },
  };
  return (["C", "R", "E", "D", "I", "T"] as CreditStage["letter"][]).map(letter => ({
    letter,
    name: stageNames[letter][0],
    mandate: stageNames[letter][1],
    decisions: content[letter].decisions,
    openQuestions: content[letter].questions,
  }));
}

function investorPasses(brief: FounderBrief): InvestorPass[] {
  return [
    { pass: 1, lens: "Customer truth", question: "Who changes behaviour first, and what evidence shows the pain is urgent?", note: `The customer definition is directionally useful—${brief.customer}—but remains founder input.`, requiredChange: "Recruit five tightly matched users and record current workflow, cost, trigger and buying authority.", verdict: "INVESTIGATE" },
    { pass: 2, lens: "Wedge & moat", question: "Why is this a company rather than a feature or consulting template?", note: "The governed evidence graph can compound, but only after repeated projects prove reusable structure.", requiredChange: "Measure which decisions, capability modules and evidence tests recur across pilots; protect the schema and workflow, not generic prose.", verdict: "TEST" },
    { pass: 3, lens: "Economics", question: "What does one customer contribute after acquisition, onboarding, support and partner costs?", note: `${brief.revenueModel} is a proposal, not validated willingness to pay.`, requiredChange: "Price the smallest finished outcome and run paid or letter-of-intent tests before modelling platform scale.", verdict: "TEST" },
    { pass: 4, lens: "Execution", question: "Can this team finish one complete journey before platform scope consumes it?", note: "The principal constraint is breadth, not imagination.", requiredChange: "Freeze the MVP boundary, assign one owner per dependency and demo failure/recovery as rigorously as the happy path.", verdict: "ADVANCE" },
    { pass: 5, lens: "Integrity", question: "Are users protected when identity, money, automation or trust signals are wrong?", note: `The ${brief.riskProfile} risk posture needs visible consent, correction, appeal and provider gates.`, requiredChange: "Complete privacy, threat, consumer and regulatory reviews before any public claim of live protected capability.", verdict: "ADVANCE" },
  ];
}

function score(brief: FounderBrief, evidenceCount: number, moduleCount: number) {
  const detail = Object.values(brief).reduce((sum, value) => sum + String(value).length, 0);
  const clarity = Math.min(94, 58 + Math.round(Math.min(detail, 900) / 30));
  const evidence = Math.min(88, 48 + evidenceCount * 3);
  const economics = brief.revenueModel.length > 45 ? 72 : 61;
  const desirability = brief.customer.length > 50 && brief.problem.length > 60 ? 78 : 66;
  const integrity = brief.jurisdiction.length > 8 ? 86 : 72;
  const tractionReadiness = Math.min(82, 50 + moduleCount * 2);
  const values = [clarity, evidence, economics, desirability, integrity, tractionReadiness];
  return { clarity, evidence, economics, desirability, integrity, tractionReadiness, overall: Math.round(values.reduce((a, b) => a + b, 0) / values.length) };
}

export function compileCreditProject(input: Partial<FounderBrief>): CreditBlueprint {
  const brief = normaliseBrief(input);
  const nodes = selectCapabilities(brief);
  const nodeIds = new Set(nodes.map(node => node.id));
  const hasPayments = nodeIds.has("ofpay-quotes");
  const hasMigration = nodeIds.has("merchant-migration");
  const evidence = claims(brief, hasPayments, hasMigration);
  const edges: CapabilityEdge[] = nodes.slice(1).map((node, index) => ({
    id: `edge-${String(index + 1).padStart(2, "0")}`,
    from: index < 3 ? "constitution" : nodes[Math.max(0, index - 2)].id,
    to: node.id,
    relationship: node.kind === "integration" ? "authorises" : node.kind === "evidence" ? "proves" : "enables",
  }));
  const generatedAt = "2026-09-07T00:00:00.000Z";
  const id = fingerprint(canonicalBrief(brief));
  const wedge = `Deliver a traceable first blueprint for ${brief.customer} before attempting the full ambition.`;
  const mvp = [
    "Structured founder intake and Phase Ω constitutional gate",
    "Deterministic C.R.E.D.I.T dossier with evidence labels",
    "Five-pass investor challenge with recorded changes",
    "Capability graph, delivery boundaries and adapter manifests",
    "Versioned private persistence plus JSON and Markdown export",
  ];
  if (hasMigration) mvp.push("One seller-authorised sample import with a field-level reconciliation report");
  return {
    meta: {
      engine: CREDIT_ENGINE_VERSION,
      fingerprint: id,
      generatedAt,
      providerMode: "deterministic-rules",
      sourcePolicy: "Founder input is authoritative for intent; external claims require current primary evidence; rules never upgrade assumptions silently.",
    },
    brief,
    executive: {
      headline: `${brief.ventureName}: from purpose to proof, then product.`,
      thesis: sentence(brief.oneLine),
      wedge,
      singleSlide: {
        problem: brief.problem,
        solution: brief.oneLine,
        customer: brief.customer,
        businessModel: brief.revenueModel,
        proofNext: "Five target users complete the core journey and can name the decision it improved, the time it saved and the risk it exposed.",
        ask: "Fund the next proof point, not the entire vision: customer validation, one working loop and its control evidence.",
      },
    },
    constitution: {
      purpose: `Help ${brief.customer} make a better, evidence-led decision about ${brief.ventureName}.`,
      servicePromise: "Increase clarity, build capability, avoid dependency and encourage useful contribution.",
      tests: [
        { question: "Does this increase clarity?", result: brief.oneLine.length >= 45 ? "PASS" : "REVIEW", rationale: "The one-line promise and MVP boundary must be repeatable without explanation." },
        { question: "Does this build capability?", result: "PASS", rationale: "The user keeps a portable blueprint, graph, evidence register and delivery tests." },
        { question: "Does this avoid dependency?", result: "PASS", rationale: "The core compiler works without an AI provider and exports open formats." },
        { question: "Does this encourage contribution?", result: brief.customer.length >= 35 ? "PASS" : "REVIEW", rationale: "Named actors, owners and evidence requests make participation concrete." },
      ],
      verdict: brief.oneLine.length >= 45 && brief.customer.length >= 35 ? "PROCEED" : "REFINE",
    },
    stages: buildStages(brief),
    boundaries: {
      vision: brief.ambition,
      wedge,
      mvp,
      expansion: ["Organisation roles and collaborative approvals", "Certified marketplace, payment, identity and fulfilment adapters", "Reusable brand, deck and implementation templates", "Portfolio learning across consented, de-identified project patterns"],
      notNow: ["Unlicensed custody, exchange or settlement", "Automatic launch of regulated or high-risk features", "Proprietary platform-code cloning", "Secret social scoring or inferred criminality", "Autonomous AI decisions that bypass evidence and human approval"],
    },
    evidence,
    architecture: { nodes, edges },
    investorPasses: investorPasses(brief),
    experience: [
      { actor: "Founder", moment: "Frames the venture", success: "Receives a clear wedge and sees every assumption labelled", recovery: "Incomplete fields trigger refinement prompts without losing the draft" },
      { actor: "Customer / design partner", moment: "Tests the promise", success: "Can complete the proposed outcome and explain its value", recovery: "Can decline data use, correct evidence and leave feedback without coercion" },
      { actor: "Operator", moment: "Turns decisions into delivery", success: "Sees owners, dependencies, exceptions and the next proof", recovery: "Failed steps create visible exceptions and resumable work" },
      { actor: "Investor", moment: "Interrogates risk and leverage", success: "Separates live proof from target, dependency and expansion", recovery: "Can trace every material claim to source, owner and test" },
    ],
    adapters: selectAdapters(nodes),
    acceptanceTests: [
      "A founder creates a useful first dossier in under ten minutes without an external AI key.",
      "Identical normalised inputs and engine version produce the same fingerprint and core blueprint.",
      "Every material claim carries an evidence label, source, owner and next status.",
      "A changed brief creates a new version and preserves the prior decision record.",
      "JSON and Markdown exports preserve identifiers, labels, boundaries and provenance.",
      "Keyboard-only and screen-reader users can complete the core journey at WCAG 2.2 AA target quality.",
      "Adapters cannot activate without declared permissions, data boundaries and certification checks.",
      "No prototype, partner dependency or regulated function is represented as live.",
    ],
    killCriteria: [
      "Fewer than three of five matched founders finish without live assistance after two iterations.",
      "More than twenty percent of material claims lack a valid evidence label or owner.",
      "Target users cannot state the wedge and next proof after a five-minute walkthrough.",
      "The deterministic output is not meaningfully more useful than a disciplined static template.",
      "The required privacy, consumer, security or regulated-service controls cannot fit the unit economics.",
      ...(hasMigration ? ["A supported authorised import cannot reconcile at least ninety-nine percent of in-scope records."] : []),
    ],
    milestones: [
      { horizon: "30 days", outcome: "Intake, compiler, evidence ledger, exports and private proof", proof: "Five external founders finish one complete dossier" },
      { horizon: "60 days", outcome: "Canonical schema, delivery backlog, adapter contract and sample import", proof: "Two authorised sample datasets reconcile with visible exceptions" },
      { horizon: "90 days", outcome: "BTLR operating flow, approvals, roles and observability", proof: "Ten pilots produce measured completion, correction and decision-quality data" },
      { horizon: "180 days", outcome: "One partner-gated transaction or specialist-domain pilot", proof: "Control gates, recovery, reconciliation and independent review pass" },
    ],
    scorecard: score(brief, evidence.length, nodes.length),
  };
}

export function blueprintToMarkdown(blueprint: CreditBlueprint): string {
  const lines = [
    `# ${blueprint.brief.ventureName}`,
    "",
    `> ${blueprint.executive.headline}`,
    "",
    `**Fingerprint:** ${blueprint.meta.fingerprint}  `,
    `**Engine:** ${blueprint.meta.engine}  `,
    `**Mode:** Provider-neutral deterministic rules`,
    "",
    "## One-slide investment brief",
    "",
    `- **Problem:** ${blueprint.executive.singleSlide.problem}`,
    `- **Solution:** ${blueprint.executive.singleSlide.solution}`,
    `- **Customer:** ${blueprint.executive.singleSlide.customer}`,
    `- **Business model:** ${blueprint.executive.singleSlide.businessModel}`,
    `- **Next proof:** ${blueprint.executive.singleSlide.proofNext}`,
    `- **Ask:** ${blueprint.executive.singleSlide.ask}`,
    "",
    "## Phase Ω constitutional gate",
    "",
    `**Verdict:** ${blueprint.constitution.verdict}`,
    "",
    ...blueprint.constitution.tests.map(test => `- **${test.result}:** ${test.question} — ${test.rationale}`),
    "",
    "## Scope boundaries",
    "",
    `**Vision:** ${blueprint.boundaries.vision}`,
    "",
    `**Wedge:** ${blueprint.boundaries.wedge}`,
    "",
    "### MVP",
    ...blueprint.boundaries.mvp.map(item => `- ${item}`),
    "",
    "### Expansion",
    ...blueprint.boundaries.expansion.map(item => `- ${item}`),
    "",
    "### Not now",
    ...blueprint.boundaries.notNow.map(item => `- ${item}`),
    "",
    "## C.R.E.D.I.T work-up",
    "",
    ...blueprint.stages.flatMap(stage => [
      `### ${stage.letter} — ${stage.name}`,
      `_${stage.mandate}_`,
      ...stage.decisions.map(item => `- ${item}`),
      "",
      "Open questions:",
      ...stage.openQuestions.map(item => `- ${item}`),
      "",
    ]),
    "## Evidence register",
    "",
    "| Label | Claim | Source | Owner |",
    "| --- | --- | --- | --- |",
    ...blueprint.evidence.map(item => `| ${item.label} | ${item.claim.replaceAll("|", "\\|")} | ${item.source.replaceAll("|", "\\|")} | ${item.owner} |`),
    "",
    "## Investor bounce-back",
    "",
    ...blueprint.investorPasses.flatMap(item => [`### Pass ${item.pass}: ${item.lens}`, `**Question:** ${item.question}`, `**Note:** ${item.note}`, `**Required change:** ${item.requiredChange}`, ""]),
    "## Milestones",
    "",
    "| Horizon | Outcome | Proof |",
    "| --- | --- | --- |",
    ...blueprint.milestones.map(item => `| ${item.horizon} | ${item.outcome} | ${item.proof} |`),
    "",
    "## Acceptance tests",
    "",
    ...blueprint.acceptanceTests.map(item => `- ${item}`),
    "",
    "## Kill criteria",
    "",
    ...blueprint.killCriteria.map(item => `- ${item}`),
    "",
    "---",
    "Generated by the C.R.E.D.I.T Project Foundry rules engine. This dossier labels hypotheses and dependencies; it is not legal, financial or tax advice.",
  ];
  return lines.join("\n");
}
