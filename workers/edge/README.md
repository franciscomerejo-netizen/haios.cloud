# HAIOS Dual Route — Pages + Workers

Status: `DESIGNED / WORKER_NOT_YET_DEPLOYED`

## Route A — Public web

- Authority: Cloudflare Pages
- Project: `haios-cloud`
- Intended hostname: `haios.cloud` / `www.haios.cloud`
- Artifact: `dist/public-alpha`
- Purpose: institutional public portal, PAIDEIA, public Version Ledger, documentation and read-only public state.

## Route B — Dynamic edge

- Authority: Cloudflare Workers
- Worker service: `haios-edge-api`
- Intended hostname after DNS/custom-domain authorization: `api.haios.cloud` (or `edge.haios.cloud` if governance chooses it later)
- Source: `workers/edge/src/index.mjs`
- Purpose: dynamic edge/API functions only.

## Separation rule

Pages and Workers must not use the same deployment identity. `haios-cloud` belongs to Pages. `haios-edge-api` belongs to Workers.

The Worker begins read-only with only `GET/HEAD /health` and `/version`. It does not proxy PocketBase, expose local ports, accept writes, handle money, or contain secrets.

## Promotion

`DESIGNED -> TESTED -> VERIFIED -> AUTHORIZED -> ACTIVE`

Creating these files does not mean `api.haios.cloud` exists or that the Worker has been deployed. Custom-domain activation requires a separate, explicit deployment and DNS verification.
