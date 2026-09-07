"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Screen =
  | "command"
  | "migration"
  | "identity"
  | "checkout"
  | "receipts"
  | "resale"
  | "reconciliation"
  | "protection"
  | "partners"
  | "proof";

type DemoState = {
  migrationProgress: number;
  identityStage: number;
  quoteAsset: string;
  quoteProvider: string;
  paymentStatus: "ready" | "quoted" | "observing" | "settled";
  receiptStatus: "pending" | "issued" | "transferred";
  escrowStatus: "not-listed" | "listed" | "funded" | "released";
  disputeStatus: "none" | "opened" | "resolved";
  reconciliationStatus: "unmatched" | "matched";
  noQrMode: boolean;
};

type Viewer = { displayName: string; email: string | null; authenticated: boolean };

const initialState: DemoState = {
  migrationProgress: 38,
  identityStage: 2,
  quoteAsset: "BTC",
  quoteProvider: "Mercury Exchange",
  paymentStatus: "ready",
  receiptStatus: "pending",
  escrowStatus: "not-listed",
  disputeStatus: "none",
  reconciliationStatus: "unmatched",
  noQrMode: false,
};

const screens: { id: Screen; label: string; kicker: string; glyph: string }[] = [
  { id: "command", label: "Investor journey", kicker: "Command centre", glyph: "01" },
  { id: "migration", label: "BTLR migration", kicker: "Digital twin", glyph: "02" },
  { id: "identity", label: "Merchant identity", kicker: "Trust layer", glyph: "03" },
  { id: "checkout", label: "OfPay checkout", kicker: "30-second quote", glyph: "04" },
  { id: "receipts", label: "Receipt vault", kicker: "Proof of purchase", glyph: "05" },
  { id: "resale", label: "Resale & escrow", kicker: "Ownership transfer", glyph: "06" },
  { id: "reconciliation", label: "Reconciliation", kicker: "Merchant finance", glyph: "07" },
  { id: "protection", label: "Protection centre", kicker: "Refunds & disputes", glyph: "08" },
  { id: "partners", label: "Partners & resilience", kicker: "Provider network", glyph: "09" },
  { id: "proof", label: "Investor proof", kicker: "Readiness room", glyph: "10" },
];

const assetRates: Record<string, { rate: number; decimals: number; network: string }> = {
  BTC: { rate: 176245.18, decimals: 6, network: "Bitcoin" },
  ETH: { rate: 5984.61, decimals: 5, network: "Ethereum" },
  SOL: { rate: 278.42, decimals: 3, network: "Solana" },
  USDC: { rate: 1.53, decimals: 2, network: "Base" },
};

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

function download(name: string, content: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "teal" | "pink" | "muted" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function SectionHead({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="section-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function Progress({ value }: { value: number }) {
  return <div className="progress" aria-label={`${value}% complete`}><span style={{ width: `${value}%` }} /></div>;
}

function Stat({ label, value, note, tone = "gold" }: { label: string; value: string; note: string; tone?: "gold" | "teal" | "pink" }) {
  return <article className={`stat stat-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export default function W8RPlatform({ viewer }: { viewer: Viewer }) {
  const [screen, setScreen] = useState<Screen>("command");
  const [state, setState] = useState<DemoState>(initialState);
  const [seconds, setSeconds] = useState(30);
  const [toast, setToast] = useState("");
  const [sync, setSync] = useState<"loading" | "saved" | "local">("loading");
  const priceAud = 160;
  const quote = useMemo(() => (priceAud / assetRates[state.quoteAsset].rate).toFixed(assetRates[state.quoteAsset].decimals), [state.quoteAsset]);

  useEffect(() => {
    fetch("/api/demo").then(async response => {
      if (!response.ok) throw new Error("Persistence unavailable");
      const result = await response.json() as { state?: Partial<DemoState> };
      if (result.state) setState(current => ({ ...current, ...result.state }));
      setSync("saved");
    }).catch(() => setSync("local"));
  }, []);

  useEffect(() => {
    if (state.paymentStatus !== "quoted") return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [state.paymentStatus]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const commit = (patch: Partial<DemoState>, action: string) => {
    const next = { ...state, ...patch };
    setState(next);
    setSync("loading");
    fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: next, action }) })
      .then(response => { if (!response.ok) throw new Error("Save failed"); setSync("saved"); })
      .catch(() => setSync("local"));
  };

  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextScreen = () => {
    const index = screens.findIndex(item => item.id === screen);
    go(screens[Math.min(index + 1, screens.length - 1)].id);
  };

  const generateQuote = () => {
    setSeconds(30);
    commit({ paymentStatus: "quoted", receiptStatus: "pending" }, "quote.generated");
    notify("30-second TOTvalue quote created");
  };

  const settlePayment = () => {
    commit({ paymentStatus: "settled", receiptStatus: "issued", reconciliationStatus: "unmatched" }, "payment.settled");
    notify("Payment settled and OfPay receipt issued");
  };

  return <main className="platform-shell">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    {toast && <div className="toast" role="status">✓ {toast}</div>}
    <aside className="rail">
      <button className="wordmark" onClick={() => go("command")} aria-label="W8R home">
        <b>W8R</b><span>HOW CAN WE SERVE<br />YOU BETTER?</span>
      </button>
      <div className="suite-mark"><Image src="/ofpay-symbol-final-vector.svg" alt="" width={29} height={29} /><div><b>PRIVATE DEMO</b><span>Founder release 0.3</span></div></div>
      <nav aria-label="Platform demonstrations">
        {screens.map(item => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => go(item.id)}><i>{item.glyph}</i><span><b>{item.label}</b><small>{item.kicker}</small></span></button>)}
      </nav>
      <div className="rail-footer"><span className={`sync sync-${sync}`}>● {sync === "loading" ? "Saving" : sync === "saved" ? "Workspace saved" : "Local preview"}</span><small>Sandbox adapters · No real funds</small></div>
    </aside>

    <section className="workspace" id="workspace">
      <header className="topbar"><div><span>W8R / BTLR / OfPay</span><Badge tone="teal">INTERACTIVE PROOF</Badge><Link className="foundry-link" href="/credit">Open C.R.E.D.I.T Foundry →</Link></div><div className="viewer"><span>{viewer.authenticated ? "Private workspace" : "Local sandbox"}</span><b>{viewer.displayName}</b><i>{viewer.displayName.slice(0, 2).toUpperCase()}</i></div></header>

      {screen === "command" && <div className="screen">
        <SectionHead eyebrow="INVESTOR COMMAND CENTRE" title="One transaction. Every proof point." copy="A working narrative from merchant migration to payment, ownership, resale, settlement and protection. Every action below updates this private demonstration workspace." action={<button className="primary" onClick={() => go("migration")}>Run the end-to-end journey →</button>} />
        <div className="stats"><Stat label="AUD-priced GMV" value="A$2.48m" note="Sandbox cohort · trailing 30 days" /><Stat label="OfPay conversion" value="72.4%" note="+11.8 pts vs fragmented crypto flow" tone="teal" /><Stat label="Delivery confidence" value="98.6%" note="30 completed outcomes unlock rewards" /><Stat label="Provider uptime" value="99.98%" note="Multi-route quote health" tone="pink" /></div>
        <div className="journey-grid">
          <article className="panel journey-map"><div className="panel-title"><div><span>THE W8R FLYWHEEL</span><h2>Commerce becomes portable trust.</h2></div><Badge>10 LIVE MODULES</Badge></div>
            <div className="flowline">{[
              ["01", "Import", "BTLR builds a permissioned store twin"], ["02", "Verify", "KYB and identity establish accountability"], ["03", "Pay", "OfPay locks AUD value for 30 seconds"], ["04", "Prove", "A wallet-optional receipt records ownership"], ["05", "Resell", "Escrow joins the receipt and physical item"], ["06", "Grow", "Good outcomes reduce seller fees"],
            ].map((item, index) => <div key={item[0]}><i>{item[0]}</i><b>{item[1]}</b><span>{item[2]}</span>{index < 5 && <em>→</em>}</div>)}</div>
          </article>
          <article className="panel readiness"><div className="panel-title"><div><span>INVESTOR CHECKLIST</span><h2>Proof, not promises.</h2></div><strong>8/10</strong></div>
            {[["Checkout & timed quote", true], ["Receipt issue & recovery", state.receiptStatus !== "pending"], ["Physical resale & escrow", state.escrowStatus === "released"], ["Payout reconciliation", state.reconciliationStatus === "matched"], ["Refund & dispute evidence", state.disputeStatus === "resolved"], ["Provider failover", true]].map(row => <button key={String(row[0])}><span>{row[1] ? "✓" : "○"}</span>{row[0]}</button>)}
          </article>
        </div>
        <div className="callout"><div><Badge tone="pink">CORE THESIS</Badge><h2>W8R does not ask a merchant to become a crypto expert.</h2><p>It keeps product truth in AUD, lets the buyer choose the payment rail, and turns every completed purchase into portable proof of ownership.</p></div><Image src="/ofpay-symbol-gold.svg" alt="OfPay" width={125} height={125} /></div>
      </div>}

      {screen === "migration" && <div className="screen">
        <SectionHead eyebrow="BTLR · YOUR OFPAY VA AT W8R" title="Move the business, not just the catalogue." copy="BTLR creates a permissioned digital twin of products, files, customers, fulfilment rules and automation dependencies before anything goes live." action={<Badge tone="teal">NEON TEAL SUITE</Badge>} />
        <div className="split">
          <article className="panel"><div className="panel-title"><div><span>MIGRATION RUN</span><h2>Maison North / Shopify</h2></div><strong>{state.migrationProgress}%</strong></div><Progress value={state.migrationProgress} />
            <div className="task-list">{[["Catalogue & variants", 428, true], ["Media and digital files", 1692, state.migrationProgress > 35], ["Customer permissions", 18420, state.migrationProgress > 55], ["Orders and tax history", 54882, state.migrationProgress > 72], ["App dependency map", 37, state.migrationProgress === 100]].map(item => <div key={String(item[0])}><i className={item[2] ? "done" : ""}>{item[2] ? "✓" : "···"}</i><span><b>{item[0]}</b><small>{item[1].toLocaleString()} records</small></span><em>{item[2] ? "Verified" : "Queued"}</em></div>)}</div>
            <button className="primary full" onClick={() => { const progress = state.migrationProgress === 100 ? 38 : 100; commit({ migrationProgress: progress }, progress === 100 ? "migration.completed" : "migration.reset"); notify(progress === 100 ? "Digital twin completed" : "Migration run reset"); }}>{state.migrationProgress === 100 ? "Reset migration demo" : "Complete sandbox migration"}</button>
          </article>
          <article className="panel"><div className="panel-title"><div><span>DEPENDENCY INTELLIGENCE</span><h2>App equivalence map</h2></div><Badge>37 FOUND</Badge></div>
            <div className="app-map">{[["Klaviyo", "Lifecycle flows", "Native W8R Campaigns"], ["Printful", "POD fulfilment", "Connector ready"], ["Recharge", "Subscriptions", "Adapter specified"], ["Digital Downloads", "File delivery", "Native vault"], ["Judge.me", "Reviews", "Verified receipt reviews"]].map(row => <div key={row[0]}><b>{row[0]}</b><span>{row[1]}</span><em>→</em><strong>{row[2]}</strong></div>)}</div>
            <div className="notice"><b>Permission boundary</b><p>BTLR imports data the merchant owns or is authorised to export. It does not clone proprietary third-party code. Unsupported apps are mapped to native features, partner APIs or a clearly scoped replacement.</p></div>
          </article>
        </div>
      </div>}

      {screen === "identity" && <div className="screen">
        <SectionHead eyebrow="TRUST LAYER" title="Identity earns reach, lower cost and confidence." copy="Progressive merchant verification joins legal identity, payout ownership, product evidence and delivery history without exposing sensitive records to buyers." />
        <div className="identity-grid">
          <article className="panel identity-card"><div className="merchant-seal"><span>MN</span><Badge tone="teal">LEVEL {state.identityStage}</Badge></div><h2>Maison North Pty Ltd</h2><p>Australian proprietary company · Brisbane, QLD</p><div className="verification-steps">{["Email and device", "Director & beneficial owner", "Bank payout ownership", "Product authenticity", "Enhanced due diligence"].map((label, index) => <div className={state.identityStage > index ? "complete" : state.identityStage === index ? "current" : ""} key={label}><i>{state.identityStage > index ? "✓" : index + 1}</i><span><b>{label}</b><small>{state.identityStage > index ? "Validated in sandbox" : state.identityStage === index ? "Ready for review" : "Unlocks next"}</small></span></div>)}</div>
            <button className="primary full" disabled={state.identityStage === 5} onClick={() => { commit({ identityStage: Math.min(5, state.identityStage + 1) }, "identity.stage_advanced"); notify("Verification stage advanced"); }}>{state.identityStage === 5 ? "Merchant fully verified" : "Approve next sandbox check"}</button></article>
          <article className="panel trust-economics"><div className="panel-title"><div><span>REPUTATION ECONOMICS</span><h2>Good fulfilment compounds.</h2></div><strong>24/30</strong></div><div className="delivery-ring"><div><b>24</b><span>successful<br />deliveries</span></div></div><h3>Six more outcomes to unlock half-price transaction fees.</h3><p>Reward eligibility uses confirmed delivery, dispute rate, identity status and category risk. It is a transparent merchant incentive—not a general-purpose “social credit” score.</p><div className="fee-row"><span>Current platform fee<b>1.90%</b></span><em>→</em><span>Trust-tier fee<b>0.95%</b></span></div></article>
        </div>
      </div>}

      {screen === "checkout" && <div className="screen">
        <SectionHead eyebrow="OFPAY TRANSACTION ENGINE" title="AUD certainty. Buyer choice." copy="The seller fixes the real-world price. OfPay requests a live route, locks the displayed crypto amount for 30 seconds and records the exact time-of-transfer valuation." />
        <div className="checkout-grid">
          <article className="product-panel"><div className="product-art"><span>LIMITED OBJECT / 042</span><div>W8R</div></div><div className="product-copy"><Badge>PHYSICAL + NFT RECEIPT</Badge><h2>Nocturne Carryall</h2><p>Atelier 88 · Serial A88-042 · Authenticated</p><strong>{money.format(priceAud)}</strong><small>GST included · Australia-wide insured delivery</small></div></article>
          <article className="panel payment-panel"><div className="panel-title"><div><span>PAY WITH OFPAY</span><h2>{state.paymentStatus === "settled" ? "Payment complete" : "Choose your currency"}</h2></div><Badge tone={state.paymentStatus === "settled" ? "teal" : "pink"}>{state.paymentStatus.toUpperCase()}</Badge></div>
            <div className="asset-row">{Object.keys(assetRates).map(asset => <button className={state.quoteAsset === asset ? "active" : ""} key={asset} onClick={() => { commit({ quoteAsset: asset, paymentStatus: "ready" }, "quote.asset_changed"); setSeconds(30); }}><i>{asset === "BTC" ? "₿" : asset === "ETH" ? "◆" : asset[0]}</i><span>{asset}</span></button>)}</div>
            <label className="select-label">Quote provider<select value={state.quoteProvider} onChange={event => commit({ quoteProvider: event.target.value, paymentStatus: "ready" }, "quote.provider_changed")}><option>Mercury Exchange</option><option>Southern Cross Liquidity</option><option>Atlas Digital</option></select></label>
            {state.paymentStatus === "ready" && <div className="quote-ready"><span>AUD PRICE</span><strong>A$160.00</strong><p>Provider, slippage policy and network health will be checked before the quote is signed.</p><button className="primary full" onClick={generateQuote}>Generate 30-second quote</button></div>}
            {state.paymentStatus === "quoted" && <div className="live-quote"><div className="qr" aria-label="Demonstration payment QR code">{Array.from({ length: 49 }, (_, index) => <i key={index} className={(index * 7 + index % 5) % 3 ? "on" : ""} />)}</div><div><span>SEND EXACTLY</span><strong>{quote} {state.quoteAsset}</strong><p>via {assetRates[state.quoteAsset].network} · {state.quoteProvider}</p><div className={seconds < 8 ? "timer urgent" : "timer"}><i style={{ width: `${seconds / 30 * 100}%` }} /><b>{seconds}s</b></div><code>{state.noQrMode ? "ofpay.me/W8R-042" : "TOT-AUD160@2026-09-06T10:42:30+10:00"}</code><button className="primary full" disabled={seconds === 0} onClick={() => commit({ paymentStatus: "observing" }, "payment.broadcast")}>{seconds ? "Simulate wallet broadcast" : "Refresh expired quote"}</button></div></div>}
            {state.paymentStatus === "observing" && <div className="observation"><span className="pulse">●</span><h3>Observing settlement</h3><p>The 30-second customer quote is closed. A maximum five-minute observation window validates the signed amount, route and confirmations against the original TOTvalue.</p><div><span>Quote signature<b>Valid</b></span><span>Network seen<b>2 confirmations</b></span><span>Variance<b>0.00%</b></span></div><button className="primary full" onClick={settlePayment}>Confirm sandbox settlement</button></div>}
            {state.paymentStatus === "settled" && <div className="success"><i>✓</i><h3>{money.format(priceAud)} settled</h3><p>{quote} {state.quoteAsset} was valued at the signed time of transfer. Receipt OFP-8842 has been issued.</p><button className="primary" onClick={() => go("receipts")}>Open receipt vault →</button><button className="secondary" onClick={() => commit({ paymentStatus: "ready", receiptStatus: "pending" }, "checkout.reset")}>Reset demo</button></div>}
            <label className="toggle"><input type="checkbox" checked={state.noQrMode} onChange={event => commit({ noQrMode: event.target.checked }, "accessibility.no_qr_toggled")} /><span />Use accessible payment link instead of QR</label>
          </article>
        </div>
      </div>}

      {screen === "receipts" && <div className="screen">
        <SectionHead eyebrow="OFPAY RECEIPT VAULT" title="Ownership without a wallet requirement." copy="Every successful purchase produces a signed digital receipt. It can live in a W8R account, be recovered by verified identity, or be exported to a compatible wallet." action={<button className="secondary" onClick={() => download("ofpay-receipt-OFP-8842.json", JSON.stringify({ id: "OFP-8842", item: "Nocturne Carryall", serial: "A88-042", audValue: 160, asset: state.quoteAsset, status: state.receiptStatus, sandbox: true }, null, 2), "application/json")}>Export credential ↓</button>} />
        <div className="receipt-grid">
          <article className="receipt-card"><div className="receipt-top"><Image src="/ofpay-symbol-gold.svg" alt="" width={39} height={39} /><span><b>OFPAY RECEIPT</b><small>OFP-8842 · SANDBOX</small></span><Badge tone={state.receiptStatus === "pending" ? "muted" : "teal"}>{state.receiptStatus.toUpperCase()}</Badge></div><div className="receipt-item"><div>W8R</div><span><small>ITEM</small><b>Nocturne Carryall</b><em>Serial A88-042 · Condition: New</em></span></div><dl><div><dt>AUD purchase value</dt><dd>A$160.00</dd></div><div><dt>Paid with</dt><dd>{quote} {state.quoteAsset}</dd></div><div><dt>Owner</dt><dd>{state.receiptStatus === "transferred" ? "Jamie Li" : "Daniel B."}</dd></div><div><dt>Authenticity</dt><dd>Atelier 88 verified</dd></div></dl><div className="receipt-hash">SHA-256 · 8A1F…C9E2</div></article>
          <article className="panel"><div className="panel-title"><div><span>LIFECYCLE</span><h2>Receipt history</h2></div><Badge>RECOVERABLE</Badge></div><div className="timeline">{[["Purchase settled", "6 Sep 2026 · OfPay TOTvalue anchored", state.receiptStatus !== "pending"], ["Receipt issued", "Buyer W8R vault · wallet optional", state.receiptStatus !== "pending"], ["Ownership transferred", "Escrow release signs new holder", state.receiptStatus === "transferred"]].map(item => <div className={item[2] ? "done" : ""} key={String(item[0])}><i>{item[2] ? "✓" : "○"}</i><span><b>{item[0]}</b><small>{item[1]}</small></span></div>)}</div><div className="recovery"><h3>Receipt recovery</h3><p>Restore access using verified email, device challenge and merchant/order evidence. Recovery rotates the credential; it never duplicates ownership.</p><button className="secondary" onClick={() => notify("Recovery link generated for the verified buyer")}>Simulate secure recovery</button></div></article>
        </div>
      </div>}

      {screen === "resale" && <div className="screen">
        <SectionHead eyebrow="PHYSICAL RESALE + ESCROW" title="Auction the proof. Deliver the object." copy="The OfPay receipt identifies the current owner and item. Funds remain in licensed-partner escrow until shipment, inspection and buyer-protection conditions are satisfied." />
        <div className="resale-layout"><article className="listing-card"><div className="listing-visual"><Badge tone="teal">AUTHENTICATED</Badge><span>A88<br />042</span></div><div><span>ATELIER 88</span><h2>Nocturne Carryall</h2><p>Condition: Excellent · Original receipt · Brisbane, AU</p><div className="bid"><small>CURRENT BID</small><strong>A$242.00</strong><em>8 bids · 02:14:08</em></div></div></article>
          <article className="panel escrow"><div className="panel-title"><div><span>ESCROW ORCHESTRATION</span><h2>Ownership handover</h2></div><Badge tone="pink">PARTNER-GATED</Badge></div><div className="escrow-steps">{[["Listing signed", state.escrowStatus !== "not-listed"], ["Buyer funds secured", ["funded", "released"].includes(state.escrowStatus)], ["Tracked shipment", state.escrowStatus === "released"], ["Inspection window", state.escrowStatus === "released"], ["Receipt + funds released", state.escrowStatus === "released"]].map((item, index) => <div className={item[1] ? "complete" : ""} key={String(item[0])}><i>{item[1] ? "✓" : index + 1}</i><span>{item[0]}</span></div>)}</div>
            {state.escrowStatus === "not-listed" && <button className="primary full" onClick={() => commit({ escrowStatus: "listed" }, "resale.listed")}>List OfPay receipt for auction</button>}{state.escrowStatus === "listed" && <button className="primary full" onClick={() => commit({ escrowStatus: "funded" }, "escrow.funded")}>Simulate winning bid & funding</button>}{state.escrowStatus === "funded" && <button className="primary full" onClick={() => { commit({ escrowStatus: "released", receiptStatus: "transferred" }, "escrow.released"); notify("Ownership transferred to Jamie Li"); }}>Confirm delivery & release</button>}{state.escrowStatus === "released" && <button className="secondary full" onClick={() => commit({ escrowStatus: "not-listed", receiptStatus: "issued" }, "resale.reset")}>Reset resale demo</button>}
            <div className="notice"><b>Legal operating boundary</b><p>Production escrow, custody, insurance and authentication are fulfilled only through approved, licensed partners by jurisdiction.</p></div></article></div>
      </div>}

      {screen === "reconciliation" && <div className="screen">
        <SectionHead eyebrow="MERCHANT FINANCE" title="Every payout traces back to a sale." copy="Gross AUD value, asset conversion, fees, tax, settlement rail and the OfPay receipt resolve into one exportable ledger." action={<button className="secondary" onClick={() => download("w8r-reconciliation.csv", "order,receipt,gross_aud,asset,provider,fee_aud,net_aud,status\nW8R-8842,OFP-8842,160.00," + state.quoteAsset + "," + state.quoteProvider + ",3.04,156.96,matched\nW8R-8841,OFP-8841,289.00,AUD,Card Rail,5.49,283.51,matched", "text/csv")}>Export accounting CSV ↓</button>} />
        <div className="stats"><Stat label="Gross settled" value="A$12,840.00" note="42 orders" /><Stat label="Fees" value="A$231.12" note="1.80% blended" tone="pink" /><Stat label="Net payout" value="A$12,608.88" note="AUD to verified account" tone="teal" /><Stat label="Exceptions" value={state.reconciliationStatus === "matched" ? "0" : "1"} note="Receipt OFP-8842" /></div>
        <article className="panel ledger"><div className="panel-title"><div><span>SETTLEMENT BATCH WB-0906</span><h2>Transaction reconciliation</h2></div><Badge tone={state.reconciliationStatus === "matched" ? "teal" : "pink"}>{state.reconciliationStatus.toUpperCase()}</Badge></div><div className="table"><div className="tr th"><span>Order / receipt</span><span>Gross</span><span>Rail</span><span>Fees</span><span>Net</span><span>Status</span></div>{[["W8R-8842 / OFP-8842", "A$160.00", state.quoteAsset, "A$3.04", "A$156.96", state.reconciliationStatus], ["W8R-8841 / OFP-8841", "A$289.00", "AUD", "A$5.49", "A$283.51", "matched"], ["W8R-8840 / OFP-8840", "A$620.00", "ETH", "A$11.78", "A$608.22", "matched"], ["W8R-8839 / OFP-8839", "A$48.00", "USDC", "A$0.91", "A$47.09", "matched"]].map(row => <div className="tr" key={row[0]}>{row.map((cell, index) => <span key={index}>{index === 5 ? <Badge tone={cell === "matched" ? "teal" : "pink"}>{cell}</Badge> : cell}</span>)}</div>)}</div><button className="primary" disabled={state.reconciliationStatus === "matched"} onClick={() => { commit({ reconciliationStatus: "matched" }, "reconciliation.matched"); notify("Settlement matched to order and receipt"); }}>Match exception</button></article>
      </div>}

      {screen === "protection" && <div className="screen">
        <SectionHead eyebrow="BUYER + SELLER PROTECTION" title="A dispute is an evidence workflow." copy="Orders, identity, messages, delivery, item condition, transaction signature and receipt ownership assemble into a reviewable case—without pretending every category has the same risk." />
        <div className="protection-grid"><article className="panel case"><div className="panel-title"><div><span>CASE W8R-D104</span><h2>Item condition differs</h2></div><Badge tone={state.disputeStatus === "resolved" ? "teal" : "pink"}>{state.disputeStatus === "none" ? "READY" : state.disputeStatus.toUpperCase()}</Badge></div><dl><div><dt>Order</dt><dd>W8R-8842</dd></div><div><dt>Protection</dt><dd>High-value physical</dd></div><div><dt>Response SLA</dt><dd>12 hours</dd></div><div><dt>Escrow status</dt><dd>Held</dd></div></dl><div className="evidence">{["Original serial & condition", "Carrier delivery scan", "Buyer photos + timestamp", "Merchant product record", "OfPay ownership receipt"].map(item => <span key={item}>✓ {item}</span>)}</div>{state.disputeStatus === "none" && <button className="primary full" onClick={() => commit({ disputeStatus: "opened" }, "dispute.opened")}>Open evidence case</button>}{state.disputeStatus === "opened" && <button className="primary full" onClick={() => { commit({ disputeStatus: "resolved" }, "dispute.resolved"); notify("Refund approved; receipt marked return-pending"); }}>Approve protected refund</button>}{state.disputeStatus === "resolved" && <button className="secondary full" onClick={() => commit({ disputeStatus: "none" }, "dispute.reset")}>Reset protection demo</button>}</article>
          <article className="panel policies"><div className="panel-title"><div><span>POLICY ENGINE</span><h2>Clear expectations by category.</h2></div></div>{[["Digital goods", "Download event + licence evidence", "48h"], ["Standard physical", "Tracked delivery + 7-day report", "7d"], ["High-value physical", "Serial, insurance and inspection", "72h"], ["NFT / on-chain", "Wallet delivery + collection policy", "Final*"]].map(row => <div key={row[0]}><span><b>{row[0]}</b><small>{row[1]}</small></span><Badge>{row[2]}</Badge></div>)}<p>*Subject to fraud, legal rights, listing accuracy and chain failure policies. Australian Consumer Law cannot be contracted out of.</p></article></div>
      </div>}

      {screen === "partners" && <div className="screen">
        <SectionHead eyebrow="PARTNER NETWORK + ACCESSIBILITY" title="Designed to fail over, not fall over." copy="Quotes, wallets, exchanges, escrow, identity and authentication use versioned adapters with health checks, circuit breakers and accessible fallbacks." />
        <div className="partner-grid"><article className="panel"><div className="panel-title"><div><span>QUOTE ROUTING</span><h2>Provider health</h2></div><Badge tone="teal">3 / 3 ONLINE</Badge></div><div className="provider-list">{[["Mercury Exchange", "41ms", "Primary", "Healthy"], ["Southern Cross Liquidity", "63ms", "Warm standby", "Healthy"], ["Atlas Digital", "88ms", "Fallback", "Healthy"]].map(row => <div key={row[0]}><i>●</i><span><b>{row[0]}</b><small>{row[2]}</small></span><em>{row[1]}</em><Badge tone="teal">{row[3]}</Badge></div>)}</div><button className="secondary full" onClick={() => { commit({ quoteProvider: state.quoteProvider === "Mercury Exchange" ? "Southern Cross Liquidity" : "Mercury Exchange" }, "provider.failover_tested"); notify("Circuit breaker routed traffic to a healthy provider"); }}>Test automatic failover</button></article>
          <article className="panel"><div className="panel-title"><div><span>INCLUSION</span><h2>QR is an option, not a gate.</h2></div></div><div className="access-list">{[["Accessible pay link", "Large type, screen-reader labels and copyable address"], ["NFC tap", "Merchant terminal or table marker handoff"], ["Manual payment code", "Short-lived code for assisted checkout"], ["Walletless account", "Card or bank payment still receives a receipt vault"]].map(item => <div key={item[0]}><i>✓</i><span><b>{item[0]}</b><small>{item[1]}</small></span></div>)}</div></article>
          <article className="panel wide"><div className="panel-title"><div><span>HIGH-VALUE PARTNER FABRIC</span><h2>Capabilities W8R orchestrates—not counterfeits.</h2></div><Badge tone="pink">COMMERCIAL AGREEMENTS REQUIRED</Badge></div><div className="capabilities">{[["Identity / KYB", "Document, liveness, sanctions and business ownership checks"], ["Licensed escrow", "Jurisdiction-aware custody and conditional release"], ["Authentication", "Serial, provenance, condition and expert inspection"], ["Insurance", "Transit, fraud and high-value item cover"], ["Liquidity", "Signed quotes, route health and fiat settlement"], ["Accounting", "Tax categories, depreciation evidence and ledger export"]].map(item => <div key={item[0]}><b>{item[0]}</b><p>{item[1]}</p><span>Adapter contract ready</span></div>)}</div></article></div>
      </div>}

      {screen === "proof" && <div className="screen">
        <SectionHead eyebrow="INVESTOR PROOF ROOM" title="What is real, what is next, what unlocks scale." copy="A diligence-friendly view of the product today, the dependency boundary and the evidence required before financial projections should be treated as investable." action={<Badge tone="pink">PRE-SEED DEMONSTRATION</Badge>} />
        <div className="proof-grid"><article className="panel scorecard"><div className="panel-title"><div><span>DEMO READINESS</span><h2>Interactive modules</h2></div><strong>10</strong></div>{[["BTLR migration twin", state.migrationProgress === 100], ["Merchant identity ladder", state.identityStage === 5], ["30s quote + TOTvalue", state.paymentStatus === "settled"], ["Receipt issue & recovery", state.receiptStatus !== "pending"], ["Resale escrow lifecycle", state.escrowStatus === "released"], ["Payout reconciliation", state.reconciliationStatus === "matched"], ["Dispute evidence", state.disputeStatus === "resolved"], ["Provider failover", true]].map(row => <div key={String(row[0])}><i className={row[1] ? "done" : ""}>{row[1] ? "✓" : "○"}</i><span>{row[0]}</span><Badge tone={row[1] ? "teal" : "muted"}>{row[1] ? "PROVEN" : "RUN DEMO"}</Badge></div>)}</article>
          <article className="panel diligence"><div className="panel-title"><div><span>DILIGENCE QUESTIONS</span><h2>The next evidence pack</h2></div></div>{[["01", "Demand", "10–20 design partners with signed migration intent"], ["02", "Economics", "Live provider quotes, fraud loss and support cost per order"], ["03", "Regulation", "AUSTRAC, custody, escrow and marketplace legal opinions"], ["04", "Defensibility", "BTLR mapping accuracy and proprietary receipt graph effects"], ["05", "Execution", "Named payments, identity, insurance and authentication partners"]].map(item => <div key={item[0]}><i>{item[0]}</i><span><b>{item[1]}</b><small>{item[2]}</small></span></div>)}</article>
        </div>
        <div className="funding"><div><span>THE ASK</span><h2>A$2.4m pre-seed</h2><p>18 months to regulated sandbox, 20 merchant design partners and repeatable migration-to-first-transaction proof.</p></div><div>{[["42%", "Product & engineering"], ["24%", "Compliance & security"], ["20%", "Merchant acquisition"], ["14%", "Operations & contingency"]].map(item => <span key={item[1]}><b>{item[0]}</b>{item[1]}</span>)}</div><button className="primary" onClick={() => notify("Diligence pack prepared for secure sharing")}>Prepare diligence pack →</button></div>
      </div>}

      <footer className="workspace-footer"><span>W8R investor sandbox · Synthetic demonstration data · No live financial activity</span>{screen !== "proof" && <button onClick={nextScreen}>Continue journey →</button>}</footer>
    </section>
  </main>;
}
