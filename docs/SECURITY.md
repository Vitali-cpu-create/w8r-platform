# Security and trust model

## Assets to protect

- Merchant and beneficial-owner identity evidence
- Customer identity, addresses and purchase history
- Product files, licences, serials and authenticity evidence
- Provider credentials, quote signatures and webhook secrets
- Payment, refund, payout and reconciliation ledgers
- Receipt signing, recovery and revocation authority

## Primary threats

- Account takeover and fraudulent merchant onboarding
- Fake stores, counterfeit goods and manipulated condition evidence
- Quote tampering, replay, stale pricing and provider compromise
- Duplicate receipt issue or unauthorised ownership transfer
- Refund abuse, chargeback abuse and escrow release manipulation
- Supply-chain compromise in merchant apps and provider adapters
- Personal-data leakage through public chains or over-broad staff access
- Insider changes to fee, risk, payout or dispute decisions
- Evidence-label tampering, unauthorised project access or deletion of prior C.R.E.D.I.T versions
- Prompt or imported-content injection if an optional provider or marketplace adapter is added later
- Generated language falsely upgrading a prototype, dependency or unverified claim to live fact
- Invitation-code disclosure, pilot impersonation or unauthorised access to participant evidence
- Free-text pilot feedback containing credentials, identity documents or third-party personal information

## Required production controls

- Phishing-resistant multi-factor authentication for merchants and staff
- Least-privilege roles, just-in-time administration and dual control for sensitive changes
- Managed secrets, key rotation, signed webhooks and mutual authentication where supported
- Idempotency keys and an append-only double-entry ledger for money movement
- Provider quote signatures bound to asset, network, amount, route, fee, expiry and merchant
- Network-specific confirmation and reorganisation policy
- Receipt signing in managed key infrastructure with rotation, revocation and recovery audit
- Encryption in transit and at rest; field-level protection for sensitive identity data
- Immutable audit export, anomaly detection and independent alert paths
- Dependency scanning, code review, protected branches, release provenance and penetration testing
- Tested backup, recovery, regional failover and incident-response exercises
- Retention/deletion schedules and privacy review before any on-chain anchoring
- Server-side project ownership checks and append-only version records for Foundry workspaces
- Strict founder-brief field allowlists, length limits and deterministic normalisation
- Provider-off parity: core C.R.E.D.I.T compilation must remain available without an external AI service
- Future generated suggestions are untrusted input until a human accepts them; evidence labels and policy gates are not provider-editable
- Pilot invitation codes are random, bounded by use and expiry, and stored only as SHA-256 hashes
- Pilot APIs require the authenticated Site user and enforce per-session ownership server-side
- The evidence room requires a deployment-managed operator allowlist and returns pseudonymous participant records without email addresses
- Pilot free text is length-bounded, purpose-limited and accompanied by explicit safe-data instructions

## Demonstration controls

- The interface labels itself as a sandbox and uses synthetic records.
- No private keys, API credentials or live payment addresses are included.
- API state accepts a fixed allowlist of fields and rejects oversized or unknown payloads.
- Hosted state is isolated by platform-authenticated user ID.
- Sensitive production actions are described as partner-gated rather than falsely implemented.

## Responsible disclosure

Before production release, publish a monitored security contact, safe-harbour disclosure policy and severity-based response targets. Do not submit real credentials, private keys, identity documents or payment data through public issues.
