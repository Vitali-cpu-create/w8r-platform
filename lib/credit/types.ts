export const EVIDENCE_LABELS = [
  "FACT",
  "FOUNDER INPUT",
  "ASSUMPTION",
  "HYPOTHESIS",
  "TARGET",
  "RECOMMENDATION",
  "DEPENDENCY",
  "UNVERIFIED CLAIM",
] as const;

export type EvidenceLabel = (typeof EVIDENCE_LABELS)[number];
export type DeliveryStatus = "PROTOTYPE" | "MVP NEXT" | "DEPENDENCY" | "EXPANSION" | "NOT NOW" | "LIVE";
export type RiskProfile = "conservative" | "balanced" | "frontier";

export type FounderBrief = {
  ventureName: string;
  oneLine: string;
  customer: string;
  problem: string;
  ambition: string;
  revenueModel: string;
  targetPlatform: string;
  jurisdiction: string;
  riskProfile: RiskProfile;
};

export type ConstitutionalGate = {
  purpose: string;
  servicePromise: string;
  tests: { question: string; result: "PASS" | "REVIEW"; rationale: string }[];
  verdict: "PROCEED" | "REFINE";
};

export type CreditStage = {
  letter: "C" | "R" | "E" | "D" | "I" | "T";
  name: string;
  mandate: string;
  decisions: string[];
  openQuestions: string[];
};

export type EvidenceClaim = {
  id: string;
  label: EvidenceLabel;
  claim: string;
  source: string;
  owner: string;
  status: "owned" | "research" | "test" | "gate";
};

export type CapabilityNode = {
  id: string;
  label: string;
  kind: "governance" | "experience" | "domain" | "platform" | "integration" | "evidence";
  status: DeliveryStatus;
  description: string;
};

export type CapabilityEdge = {
  id: string;
  from: string;
  to: string;
  relationship: string;
};

export type InvestorPass = {
  pass: number;
  lens: string;
  question: string;
  note: string;
  requiredChange: string;
  verdict: "INVESTIGATE" | "TEST" | "ADVANCE";
};

export type Milestone = {
  horizon: "30 days" | "60 days" | "90 days" | "180 days";
  outcome: string;
  proof: string;
};

export type AdapterManifest = {
  id: string;
  name: string;
  category: "commerce" | "payment" | "identity" | "fulfilment" | "evidence" | "ai";
  status: DeliveryStatus;
  authorisation: string;
  dataBoundary: string;
  certification: string[];
};

export type CreditBlueprint = {
  meta: {
    engine: string;
    fingerprint: string;
    generatedAt: string;
    providerMode: "deterministic-rules";
    sourcePolicy: string;
  };
  brief: FounderBrief;
  executive: {
    headline: string;
    thesis: string;
    wedge: string;
    singleSlide: {
      problem: string;
      solution: string;
      customer: string;
      businessModel: string;
      proofNext: string;
      ask: string;
    };
  };
  constitution: ConstitutionalGate;
  stages: CreditStage[];
  boundaries: {
    vision: string;
    wedge: string;
    mvp: string[];
    expansion: string[];
    notNow: string[];
  };
  evidence: EvidenceClaim[];
  architecture: {
    nodes: CapabilityNode[];
    edges: CapabilityEdge[];
  };
  investorPasses: InvestorPass[];
  experience: { actor: string; moment: string; success: string; recovery: string }[];
  adapters: AdapterManifest[];
  acceptanceTests: string[];
  killCriteria: string[];
  milestones: Milestone[];
  scorecard: {
    clarity: number;
    evidence: number;
    economics: number;
    desirability: number;
    integrity: number;
    tractionReadiness: number;
    overall: number;
  };
};
