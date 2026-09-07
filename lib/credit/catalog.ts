import type { AdapterManifest, CapabilityNode, DeliveryStatus, FounderBrief } from "./types";

type ModuleRule = {
  id: string;
  label: string;
  kind: CapabilityNode["kind"];
  status: DeliveryStatus;
  description: string;
  terms?: string[];
};

const CORE_MODULES: ModuleRule[] = [
  { id: "constitution", label: "Phase Ω Constitution", kind: "governance", status: "PROTOTYPE", description: "Purpose, contribution, dependency and integrity gates before delivery." },
  { id: "founder-intake", label: "Founder Intake", kind: "experience", status: "PROTOTYPE", description: "A structured brief converts founder intent into testable project inputs." },
  { id: "rules-compiler", label: "Deterministic Rules Compiler", kind: "platform", status: "PROTOTYPE", description: "Produces stable core outputs without an external AI provider." },
  { id: "evidence-ledger", label: "Evidence Ledger", kind: "evidence", status: "PROTOTYPE", description: "Every material claim carries provenance, an owner and a next test." },
  { id: "version-control", label: "Decision Versioning", kind: "platform", status: "MVP NEXT", description: "Preserves briefs, blueprints and the reasoning behind each revision." },
  { id: "investor-room", label: "Investor Bounce-back", kind: "experience", status: "PROTOTYPE", description: "Five sceptical passes expose proof gaps before capital is requested." },
  { id: "export-layer", label: "Portable Export Layer", kind: "platform", status: "PROTOTYPE", description: "Produces traceable JSON and human-readable Markdown dossiers." },
];

const CONDITIONAL_MODULES: ModuleRule[] = [
  { id: "catalogue", label: "Catalogue & Inventory", kind: "domain", status: "MVP NEXT", description: "Products, variants, media, stock and pricing share one canonical model.", terms: ["commerce", "marketplace", "store", "retail", "product", "shopify", "etsy", "ebay"] },
  { id: "merchant-migration", label: "BTLR Authorised Migration", kind: "integration", status: "MVP NEXT", description: "OAuth, exports and clean-room adapters create a reviewable seller twin.", terms: ["migration", "shopify", "etsy", "ebay", "vendor", "merchant", "store"] },
  { id: "fulfilment", label: "Fulfilment & Exceptions", kind: "domain", status: "EXPANSION", description: "Delivery, digital fulfilment, returns and operator exceptions remain observable.", terms: ["delivery", "shipping", "fulfilment", "physical", "dropship", "pod", "product"] },
  { id: "ofpay-quotes", label: "OfPay Quote Orchestration", kind: "domain", status: "DEPENDENCY", description: "AUD remains authoritative while licensed routes provide time-bound payment quotes.", terms: ["payment", "crypto", "coin", "token", "exchange", "ofpay", "currency"] },
  { id: "money-ledger", label: "Money & Reconciliation Ledger", kind: "platform", status: "DEPENDENCY", description: "Immutable entries reconcile quote, fees, settlement, refund and payout.", terms: ["payment", "revenue", "transaction", "exchange", "settlement", "refund"] },
  { id: "receipt-vault", label: "Portable Receipt Vault", kind: "evidence", status: "MVP NEXT", description: "Signed, recoverable proofs of purchase minimise public personal data.", terms: ["receipt", "reciept", "nft", "ownership", "resale", "proof"] },
  { id: "protected-resale", label: "Protected Resale", kind: "domain", status: "EXPANSION", description: "Ownership evidence, item condition and partner escrow travel as one workflow.", terms: ["resale", "auction", "escrow", "nft", "collectible"] },
  { id: "trust-evidence", label: "Transparent Trust Evidence", kind: "governance", status: "MVP NEXT", description: "Visible delivery and identity signals include consent, appeal and correction; no secret social score.", terms: ["trust", "identity", "social", "reputation", "verification"] },
  { id: "community", label: "Community & Contribution", kind: "experience", status: "EXPANSION", description: "Contribution systems reward useful participation without coercive ranking.", terms: ["community", "social", "creator", "member"] },
  { id: "adapter-sdk", label: "Adapter & Plugin SDK", kind: "integration", status: "MVP NEXT", description: "Versioned manifests declare permissions, data boundaries, failure modes and certification.", terms: ["plugin", "integration", "platform", "saas", "api", "app"] },
  { id: "provider-gateway", label: "Optional Provider Gateway", kind: "integration", status: "NOT NOW", description: "Future AI providers may suggest language but cannot override policy or provenance.", terms: ["ai", "agent", "automation", "assistant", "btlr"] },
];

export function selectCapabilities(brief: FounderBrief): CapabilityNode[] {
  const corpus = Object.values(brief).join(" ").toLowerCase();
  const selected = CONDITIONAL_MODULES.filter(module => module.terms?.some(term => corpus.includes(term)));
  const fallback = selected.length ? selected : CONDITIONAL_MODULES.filter(module => ["adapter-sdk", "trust-evidence"].includes(module.id));
  return [...CORE_MODULES, ...fallback].map(module => ({
    id: module.id,
    label: module.label,
    kind: module.kind,
    status: module.status,
    description: module.description,
  }));
}

const ADAPTERS: AdapterManifest[] = [
  {
    id: "shopify-admin",
    name: "Shopify Admin",
    category: "commerce",
    status: "MVP NEXT",
    authorisation: "Merchant OAuth with least-privilege Admin API scopes",
    dataBoundary: "Merchant-owned catalogue, orders, customers, files and configuration exposed by documented APIs or exports",
    certification: ["Signed webhook verification", "Resumable bulk import", "Field provenance", "Reconciliation report"],
  },
  {
    id: "etsy-open-api",
    name: "Etsy Open API v3",
    category: "commerce",
    status: "EXPANSION",
    authorisation: "Seller OAuth plus application key and scoped access",
    dataBoundary: "Listings, shops, receipts and files available through authorised endpoints",
    certification: ["OAuth scope review", "Signed webhook verification", "Retry safety", "Exception export"],
  },
  {
    id: "ebay-sell",
    name: "eBay Sell APIs",
    category: "commerce",
    status: "EXPANSION",
    authorisation: "Seller OAuth and eBay business-policy prerequisites",
    dataBoundary: "Inventory, offers, fulfilment and disputes available under documented API terms",
    certification: ["SKU identity mapping", "Policy mapping", "Sandbox publishing", "Fulfilment reconciliation"],
  },
  {
    id: "regulated-payment",
    name: "Regulated payment route",
    category: "payment",
    status: "DEPENDENCY",
    authorisation: "Partner contract, jurisdiction approval and merchant consent",
    dataBoundary: "Signed quote, settlement status and minimum reconciliation metadata; no browser secrets",
    certification: ["Legal perimeter decision", "Quote signature tests", "Failover drill", "Loss and reconciliation controls"],
  },
  {
    id: "identity-provider",
    name: "Identity / KYB provider",
    category: "identity",
    status: "DEPENDENCY",
    authorisation: "Purpose-limited merchant consent and provider contract",
    dataBoundary: "Return decisions and reference tokens; minimise raw identity evidence held by W8R",
    certification: ["Privacy impact assessment", "Human appeal path", "Retention schedule", "False-positive test"],
  },
  {
    id: "signed-receipt",
    name: "Signed receipt credential",
    category: "evidence",
    status: "MVP NEXT",
    authorisation: "Buyer and merchant receipt terms with export and recovery controls",
    dataBoundary: "Minimum purchase and ownership claims; personal data remains private by default",
    certification: ["Signature verification", "Revocation and recovery", "Duplicate ownership prevention", "Selective disclosure"],
  },
  {
    id: "optional-ai",
    name: "Optional AI provider",
    category: "ai",
    status: "NOT NOW",
    authorisation: "Explicit workspace opt-in and provider data-processing terms",
    dataBoundary: "Redacted project context only; never authoritative evidence or policy decisions",
    certification: ["Provider-off parity", "Prompt-injection isolation", "Human acceptance", "Provenance label"],
  },
];

export function selectAdapters(nodes: CapabilityNode[]): AdapterManifest[] {
  const ids = new Set(nodes.map(node => node.id));
  return ADAPTERS.filter(adapter => {
    if (adapter.category === "commerce") return ids.has("merchant-migration");
    if (adapter.category === "payment") return ids.has("ofpay-quotes");
    if (adapter.category === "identity") return ids.has("trust-evidence") || ids.has("merchant-migration");
    if (adapter.category === "evidence") return ids.has("receipt-vault") || ids.has("evidence-ledger");
    if (adapter.category === "ai") return true;
    return false;
  });
}
