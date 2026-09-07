# C.R.E.D.I.Tproject031 — Project Foundry

**Reviewed:** 7 September 2026

**Release:** `0.3.0` private prototype

**Promise:** From purpose to proof, then product.

Project Foundry is the governed preparation layer for W8R, BTLR, OfPay and future C.R.E.D.I.T portfolio ventures. A founder supplies one brief; the system returns a versioned decision dossier, explicit evidence register, product boundary, capability graph, investor challenge, delivery tests and portable exports.

The current release does **not** use the OpenAI API or any other external AI provider. The core is a deterministic rules compiler: equal normalised inputs under the same engine version produce the same fingerprint and core blueprint. A future provider may be added behind an optional adapter, but it may suggest language only—it may not relabel evidence, bypass policy, activate regulated capability or erase prior decisions.

## Source hierarchy

When inputs disagree, the platform applies this order:

1. Current founder instructions and approved W8R / BTLR / OfPay decisions.
2. The 2026 C.R.E.D.I.T Project Preparation Prompt:
   - Clarify concept, customer and claims.
   - Research reality, rivals and risk.
   - Engineer economics, experience and edge.
   - Design brand, deck and delivery.
   - Interrogate as an investor and iterate.
   - Translate into traction, a testable MVP and one takeaway.
3. Vitruvianism: strength, useful function and humane beauty; service, contribution, integrity and accessibility.
4. Phase Ω: does this increase clarity, build capability, avoid dependency and encourage contribution?
5. Current primary standards, regulators and documented platform APIs.
6. Older PDFs, conversations and maps as a preserved historical archive, never as silently current fact.

## 2026 revalidation decisions

| Input or earlier direction | Current governed decision |
| --- | --- |
| Use an AI code-copying product to reproduce Shopify-native apps | Do not copy proprietary code or protected product expression. Use merchant-authorised exports, documented APIs, webhooks, public behaviour, clean-room implementation and independently specified capability contracts. |
| Make all trust outcomes into a social-credit system | Do not create a secret, general-purpose or criminality-inference score. Use purpose-limited evidence such as verified identity state, completed deliveries and dispute outcomes, with disclosure, correction, appeal, export and deletion paths. |
| Make every receipt a public NFT | Issue a signed, portable and recoverable receipt credential first. Public-chain anchoring is optional and must minimise personal and commercially sensitive data. W3C Verifiable Credentials 2.0 is the reference model, not a claim that trust is automatic. |
| Let any coin or exchange activate itself | Publish a versioned adapter manifest and sandbox. Activation needs declared permissions, supported jurisdictions, sanctions/fraud controls, quote and settlement tests, failure handling and human approval. |
| Build OfPay as an immediate exchange, custodian and settlement service | Keep production custody, exchange and settlement dependency-gated until current legal-perimeter work and qualified regulated partners are evidenced. |
| Use a huge mind map as the operating database | Keep the map as a human-facing system view. Store product decisions in a versioned capability/evidence graph with durable IDs and exports. |
| Require an OpenAI account or key to use the Foundry | No. Release `0.3.0` compiles locally and saves to the private W8R ledger when D1 is available. |

## Product contract

### Input

A founder supplies:

- venture name and one-line promise;
- narrow first customer and painful current problem;
- long ambition and proposed revenue logic;
- first delivery surface, jurisdiction and risk posture.

### Output

The compiler produces:

1. Phase Ω constitutional verdict and rationale.
2. A six-stage C.R.E.D.I.T work-up with decisions and open questions.
3. Vision, wedge, MVP, expansion and `NOT NOW` boundaries.
4. Evidence claims labelled `FACT`, `FOUNDER INPUT`, `ASSUMPTION`, `HYPOTHESIS`, `TARGET`, `RECOMMENDATION`, `DEPENDENCY` or `UNVERIFIED CLAIM`.
5. A selected capability graph and adapter contracts.
6. Complete founder, customer, operator and investor paths, including failure and recovery.
7. Five investor bounce-back passes: customer truth, moat, economics, execution and integrity.
8. Acceptance tests, kill criteria and 30/60/90/180-day milestones.
9. A one-slide investment summary.
10. JSON and Markdown exports that preserve IDs, labels and boundaries.

## Status vocabulary

| Status | Meaning | Evidence required to advance |
| --- | --- | --- |
| `PROTOTYPE` | Working demonstration with synthetic or local behaviour | Named tester can complete the journey and distinguish simulation from production |
| `MVP NEXT` | Accepted scope for the next proof loop | Owner, acceptance tests, delivery estimate and dependency list |
| `DEPENDENCY` | Cannot truthfully activate inside W8R alone | Signed partner, counsel, licence, certification or external decision evidence |
| `EXPANSION` | Valuable after the wedge is proven | Traction threshold and economic rationale |
| `NOT NOW` | Explicitly excluded from the funded scope | Formal versioned decision to reconsider |
| `LIVE` | Operating with real users and production controls | Independently verifiable operational evidence; never a copywriting decision |

## Architecture

```text
Founder brief
    │
    ▼
Input validation ──► Phase Ω gate ──► Deterministic C.R.E.D.I.T compiler
                                             │
                  ┌──────────────────────────┼─────────────────────────┐
                  ▼                          ▼                         ▼
           Evidence ledger           Capability graph          Investor passes
                  │                          │                         │
                  └──────────────────────────┼─────────────────────────┘
                                             ▼
                                   Versioned project dossier
                                     │                 │
                                     ▼                 ▼
                              Private D1 record    JSON / Markdown
```

The current app is a modular monolith. Business rules live in `lib/credit`, HTTP validation and ownership enforcement live in the server route, and the client renders the same blueprint and actions. The provider gateway is optional and `NOT NOW`. Each save creates a new immutable version, evidence snapshot, capability snapshot, build-run record and audit event.

## Durable data model

- `credit_projects`: user-owned project head, current brief and latest version number.
- `credit_project_versions`: immutable engine version, fingerprint and full blueprint.
- `credit_evidence`: queryable claim, label, source, owner and status per version.
- `credit_graph_nodes` / `credit_graph_edges`: versioned capabilities and relationships.
- `credit_build_runs`: compiler mode, result and score summary.
- `audit_events`: append-only record of successful blueprint compilation.

The API validates allowed fields, rejects oversized bodies, enforces project ownership and falls back to a clearly labelled local compilation when D1 is absent. Browser storage is not treated as authoritative project persistence.

## Adapter manifest

Every future integration must declare:

```json
{
  "id": "provider-stable-id",
  "category": "commerce | payment | identity | fulfilment | evidence | ai",
  "status": "DEPENDENCY",
  "authorisation": "How the user and provider grant access",
  "dataBoundary": "Exactly what enters, leaves and is retained",
  "certification": [
    "signature and replay tests",
    "idempotency and retry tests",
    "failure and recovery drill",
    "field-level reconciliation",
    "permission and revocation test"
  ]
}
```

Adapters are replaceable. Credentials stay in managed secrets. Webhooks are signed and replay-protected. Imports preserve source platform, source ID, permission scope, retrieval time, checksum, transformation and reconciliation status.

### Authorised seller migration

- Shopify documents GraphQL Admin bulk operations and webhook completion for large imports. BTLR should use merchant OAuth, staged bulk operations, resumable jobs and reconciliation rather than screen scraping or cloning: [Shopify bulk import](https://shopify.dev/docs/api/usage/bulk-operations/imports).
- Etsy Open API v3 exposes scoped listings, shops, receipts and files, while its webhook system supports signed, retried order events. Access must follow Etsy app terms and the seller's OAuth scopes: [Etsy Open API v3](https://developer.etsy.com/documentation/) and [Etsy webhooks](https://developer.etsy.com/documentation/essentials/webhooks/).
- eBay's Inventory API manages inventory and offers and documents migration of eligible existing listings; the Fulfilment API covers orders, shipment and payment-dispute operations: [eBay Inventory API](https://developer.ebay.com/api-docs/sell/inventory/static/overview.html) and [eBay Fulfilment API](https://developer.ebay.com/develop/api/sell/fulfillment_api).
- OpenSea's documented API provides NFT metadata, events and marketplace order functions. Any user-side signing or marketplace action remains explicit and authorised: [OpenSea API overview](https://docs.opensea.io/reference/api-overview).

## W8R / BTLR / OfPay module policy

Project Foundry treats the existing products as a reusable portfolio kernel:

- **W8R**: catalogue, storefront, order, customer, CRM, auction and operator experience.
- **BTLR**: permissioned seller intake, migration, dependency mapping, exception handling and assisted cutover.
- **OfPay**: AUD-authoritative quote orchestration, provider routing, TOTvalue evidence, settlement observation and reconciliation.
- **Receipt Vault**: signed proof of purchase, privacy-preserving recovery and ownership-transfer evidence.
- **Trust & Protection**: identity state, delivery evidence, disputes and transparent fee incentives.

The Foundry can select these modules for a relevant project, but selection does not make them live. OfPay production remains a separate regulated-partner programme. Receipt evidence supports accounting workflows but does not itself determine tax treatment.

## Current external guardrails

- AUSTRAC says digital currency exchange and related virtual-asset service providers may need enrolment and registration. The exact W8R/OfPay perimeter needs current Australian legal advice before live value exchange, transfer, custody or settlement: [AUSTRAC virtual asset overview](https://www.austrac.gov.au/industry-and-business/your-industry/virtual-asset-service-providers/virtual-asset-service-providers-overview) and [DCE registration](https://www.austrac.gov.au/enrol-and-register-dce).
- Treasury continues to develop Australia's digital-asset platform framework. Planned functions remain labelled `DEPENDENCY` until applicable law, transition timing and partner responsibilities are confirmed: [Treasury digital assets statement](https://treasury.gov.au/publication/p2025-628504).
- Australian Consumer Law guarantees cannot be removed by platform policy. Seller identity, marketplace role, returns, refund and dispute responsibilities must be presented clearly: [ACCC consumer guarantees](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees) and [ACCC buying online](https://www.accc.gov.au/consumers/buying-products-and-services/buying-online).
- Privacy work begins with data mapping and a Privacy Impact Assessment, not after an identity or trust feature is built: [OAIC privacy by design](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/privacy-impact-assessments/privacy-by-design) and [OAIC securing personal information](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/guide-to-securing-personal-information).
- Portable receipt credentials can align to the [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model/). The specification explicitly leaves issuer trust decisions to verifiers; conformance is not the same as commercial trust.
- Core journeys target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/), including keyboard access, visible focus, accessible authentication and non-QR alternatives.
- Secure delivery follows [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final): threat modelling, protected build inputs, review, release evidence and vulnerability response throughout the life cycle.
- Card paths should minimise W8R's card-data environment and be scoped against [PCI DSS 4.0.1](https://www.pcisecuritystandards.org/document_library/?class=pcidss&doc=pci_dss) with qualified advice before production.

## Investor bounce-back applied to Project Foundry

1. **Customer truth:** “Founder” is too broad. The first cohort is founder-led ventures with a complex platform idea, existing source material and a near-term capital or build decision.
2. **Moat:** a prompt is not a moat. The candidate moat is the governed project schema, accumulated decision/evidence graph, reusable tested modules and verified delivery data.
3. **Economics:** subscription and services are still founder proposals. Price a finished decision outcome, then measure acquisition, assisted onboarding, correction time, storage, support and specialist-review costs.
4. **Execution:** broad vision is the primary risk. Release `0.3.0` therefore proves one loop only: brief → governed blueprint → private version → portable export.
5. **Integrity:** automated confidence can be dangerous. Scores are visibly heuristic, claims remain labelled, users can correct inputs, and provider/regulated capabilities cannot activate from generated text.

## MVP acceptance tests

- A matched founder produces a useful first dossier in under ten minutes without an external AI key.
- Equal normalised inputs and engine version produce the same fingerprint and core output.
- Every material claim has an evidence label, source, owner and status.
- Updating a saved brief increments the version while preserving the previous snapshot.
- JSON and Markdown exports preserve identifiers, evidence and scope boundaries.
- Keyboard and screen-reader users can complete the core journey at the WCAG 2.2 AA target.
- An integration cannot activate without permissions, data boundaries and certification tests.
- No prototype, partner dependency or regulated feature is represented as live.

## Kill or pivot criteria

Pause expansion and redesign if any condition persists after two focused iterations:

- fewer than three of five matched founders complete without live assistance;
- more than 20% of material claims lack an evidence label or owner;
- target users cannot restate the wedge and next proof after five minutes;
- the deterministic output is not more decision-useful than a disciplined static document;
- a supported authorised import cannot reconcile at least 99% of in-scope records;
- privacy, consumer, security or regulated-service controls cannot fit the business model.

## 30 / 60 / 90 / 180-day proof plan

| Horizon | Deliverable | Exit evidence |
| --- | --- | --- |
| 0–30 days | Provider-neutral compiler, founder intake, evidence ledger, exports and private deployment | Five outside founders finish a dossier and name the decision improved, time saved and risk exposed |
| 31–60 days | Canonical schema, delivery backlog, adapter manifest and authorised sample-import harness | Two consented sample datasets reconcile with visible, merchant-approved exceptions |
| 61–90 days | BTLR operator workflow, roles, change approvals, observability and exception ledger | Ten pilots produce measured completion, correction and decision-quality data |
| 91–180 days | One regulated-partner sandbox or specialist-domain implementation | Counsel and partner gates, recovery, reconciliation and independent review pass |

## Release evidence

Release `0.3.0` is complete only when:

- the Foundry route server-renders and compiles a blueprint through the same API used by the interface;
- malformed briefs and oversized payloads fail intentionally;
- the schema migration is generated, inspected and included;
- TypeScript, lint, build and automated route tests pass;
- the Git commit is pushed to the existing private development repository;
- the owner-only Sites deployment publishes and its health is confirmed.

This document is a product and control record. It is not legal, financial, accounting or tax advice.
