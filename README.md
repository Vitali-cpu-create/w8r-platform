# W8R Platform

**How can we serve you better?**

W8R is an AUD-first commerce concept joining a multi-format marketplace, BTLR merchant migration and OfPay payment orchestration. This repository contains the working private-investor demonstration: a single end-to-end journey from an existing merchant store to a timed digital-asset payment, portable receipt, resale, escrow, reconciliation and buyer/seller protection.

## What the demonstration proves

- BTLR creates a permissioned digital twin of catalogue, files, customers, orders, fulfilment and app dependencies.
- Merchant identity progresses through KYB, payout ownership, authenticity and enhanced-review gates.
- OfPay anchors products in AUD while a buyer selects BTC, ETH, SOL or USDC.
- A quote is displayed for 30 seconds, followed by a bounded settlement-observation stage and a recorded time-of-transfer value.
- A wallet-optional OfPay receipt records the item, serial, purchase value, authenticity evidence and current owner.
- A physical item and its receipt can enter an auction and partner-gated escrow handover.
- Merchant payouts reconcile from gross value through provider, fees and net AUD settlement.
- Refund and dispute flows assemble delivery, condition, identity and receipt evidence.
- Provider adapters expose health, failover and circuit-breaker behaviour.
- QR payments have accessible-link, NFC, manual-code and walletless alternatives.
- An investor proof room separates demonstrated workflow, commercial dependencies and next evidence.

## Product boundaries

This is a high-fidelity sandbox using synthetic data. It never moves real funds, performs identity checks, holds assets or claims regulatory approval. Production launch requires jurisdiction-specific legal advice and contracts with licensed payment, liquidity, identity, custody/escrow, insurance and authentication providers. Australian Consumer Law rights are not replaced by platform policy.

## Technology

- React 19 and Vinext app-router runtime
- Cloudflare Workers deployment target
- Cloudflare D1 with Drizzle ORM for per-user demo state and audit events
- ChatGPT private-site identity headers when hosted through Sites
- Responsive, keyboard-navigable UI with reduced-motion support

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without a D1 binding, the interface falls back to an in-memory local preview while retaining the full interactive journey.

## Validate

```bash
npm test
npm run lint
```

Generate a new migration after changing `db/schema.ts`:

```bash
npm run db:generate
```

## Repository map

- `app/w8r-platform.tsx` — complete interactive investor journey
- `app/api/demo/route.ts` — validated state persistence and audit events
- `app/globals.css` — W8R gold, gloss-black and candy-pink system with BTLR teal accents
- `db/schema.ts` — marketplace and demonstration data model
- `.openai/drizzle/` — generated D1 migrations
- `docs/ARCHITECTURE.md` — production architecture and control boundaries
- `docs/DELIVERY-ROADMAP.md` — evidence-led MVP sequence
- `docs/SECURITY.md` — threat model and pre-production controls

## Status

Release `0.2.0` is an investor demonstration, not a production exchange, custody service or financial product.
