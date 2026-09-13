# HAIOS GLOBAL LAB — Phase I (V1–V10)

Status: `DESIGNED_NOT_VERIFIED`

This directory implements the first ten sequential versions of the HAIOS Global Lab roadmap. Nothing here is promoted to `VERIFIED`, `AUTHORIZED`, or `ACTIVE` merely because the files exist.

## Truth rule

`DESIGNED != TESTED != VERIFIED != AUTHORIZED != ACTIVE`

A version closes only when its specification, implementation, test evidence, regressions (when applicable), timestamp, and promotion decision are present.

## Versions

- V1 — Constitution and truth-state model.
- V2 — Canonical Phase-I structure and registry.
- V3 — Provenance/evidence record contract.
- V4 — Agent Anatomy validation contract.
- V5 — Risk tiers R0–R4.
- V6 — Guardian execution state machine.
- V7 — Persistent idempotency contract.
- V8 — Typed failure taxonomy.
- V9 — Bounded retry policy.
- V10 — Circuit-breaker / failed-safe contract.

## Operational gate

`SPEC -> BUILD -> SANDBOX -> TEST -> FAULT TEST -> CORRECT -> RETEST -> EVIDENCE -> CROSS-REVIEW -> HUMAN GATE (when required) -> RELEASE`

Run the local self-test with:

```bash
node laboratory_global/phase1/tests/phase1.selftest.mjs
```

The self-test is intentionally offline and non-destructive. It does not prove PocketBase, Cloudflare, local Windows services, payments, or production runtime health.
