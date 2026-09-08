# W8R production architecture

## Product domains

| Domain | Responsibility | Production boundary |
| --- | --- | --- |
| W8R Marketplace | Catalogue, storefront, orders, customers, auctions and merchant CRM | W8R-controlled application services |
| BTLR | Permissioned import, mapping, digital-twin review and cutover | Reads only merchant-authorised exports and APIs |
| OfPay | Quote orchestration, route selection, TOTvalue record and settlement observation | Never stores partner secrets in the browser; custody and fiat settlement remain with licensed partners |
| Receipt Vault | Signed purchase credential, recovery, ownership history and accounting evidence | Public verification reveals minimum necessary fields; private evidence is access controlled |
| Trust & Protection | KYB state, delivery outcomes, case evidence, policy and fee incentives | Identity decisions and high-risk reviews require qualified providers and human escalation |
| C.R.E.D.I.T Project Foundry | Founder intake, Phase Ω governance, evidence labels, scope boundaries, capability selection and investor interrogation | Deterministic provider-neutral core; optional providers cannot override policy or provenance |

## Reference flow

1. A merchant gives BTLR scoped access to a supported store or export.
2. BTLR builds a reviewable digital twin and a dependency-equivalence report.
3. The merchant completes identity, beneficial-owner and payout-account checks.
4. Product prices remain authoritative in AUD.
5. At checkout, OfPay requests signed quotes from healthy provider adapters.
6. The chosen asset amount is displayed for 30 seconds; the provider, route, rate, fees and timestamp form the TOTvalue record.
7. Broadcast enters a bounded observation state. Confirmation policies vary by chain, asset, value and risk.
8. Successful settlement creates the order and signed OfPay receipt atomically.
9. Merchant payout events reconcile against order, quote, fees, tax and receipt.
10. On resale, an approved escrow partner conditions fund and receipt transfer on delivery and inspection evidence.

## Service decomposition

The demonstration is intentionally a modular monolith. The production platform can extract domains behind versioned events when scale or regulation demands it:

- Identity and organisation service
- Catalogue and inventory service
- Order and fulfilment service
- Quote router and provider adapter workers
- Payment observation and reconciliation workers
- Receipt credential and recovery service
- Auction, escrow and ownership-transfer service
- Case management and evidence service
- Notification and merchant CRM service
- Audit, risk and reporting pipeline

## Data rules

- AUD is the product and accounting source of truth.
- Quote and payment records are immutable; corrections are compensating events.
- Private identity evidence is tokenised and retained only as long as policy and law require.
- The receipt points to hashes and attestations rather than publishing personal data on-chain.
- Every privileged action emits an append-only audit event.
- Provider credentials use a managed secret store and are never committed to this repository.

## Current implementation

The app persists per-viewer sandbox state in Cloudflare D1 using `demo_workspaces` and records user actions in `audit_events`. The UI gracefully becomes a local-only preview when a D1 binding is absent. Marketplace tables are present for merchant, product, customer, order, quote and integration development.

Project Foundry adds a second, user-owned persistence surface. `credit_projects` points to the latest version, while `credit_project_versions`, `credit_evidence`, `credit_graph_nodes`, `credit_graph_edges` and `credit_build_runs` preserve each immutable compilation. The rules compiler lives separately from the HTTP and rendering layers, so the same normalised brief produces the same fingerprint in the interface, API and automated tests. The route remains useful when D1 is absent but explicitly labels that result as local rather than saved.

Project Foundry's integration contract is clean-room and permissioned: documented OAuth APIs, signed webhooks and user-owned exports only. Every adapter declares authorisation, data boundary, failure recovery and certification evidence. External AI is an optional future adapter and is not part of release `0.3.1`.

## Founder pilot evidence boundary

Release `0.3.1` adds two private product surfaces:

- `/credit/pilot` owns consent, the standard test journey, assistance signals, outcome feedback and issue reporting;
- `/credit/ops` owns invitation creation, Day-30 gate evaluation and portable diligence exports.

The participant API enforces authenticated, per-session ownership. The operator API requires a deployment-managed user-ID or email allowlist. Invitation codes are returned once and stored only as SHA-256 hashes. Operator responses and evidence exports use pseudonymous participant aliases rather than email addresses or account identifiers.

Pilot records are append-oriented: sessions preserve consent and timing, events preserve observed progress, feedback preserves deliberate outcomes and issues preserve product friction. Invitations and issues change status without deleting their history.
