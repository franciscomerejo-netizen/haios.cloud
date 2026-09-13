# HAIOS Version Ledger Engine v1.0

**Estado:** DESIGNED_NOT_VERIFIED

## Propósito

Crear un ledger de versiones capaz de representar de forma continua HAIOS V1 → V1,000,000,000 sin fabricar releases vacíos ni promover estados sin evidencia.

## Regla constitucional

`PLANNED ≠ BUILT ≠ TESTED ≠ VERIFIED ≠ AUTHORIZED ≠ ACTIVE`

Una versión puede existir como identidad ordinal `PLANNED`; solo puede promocionarse cuando cumple los prerrequisitos del estado destino.

## Modelo canónico

Campos mínimos por versión:

- `version_id`
- `ordinal`
- `epoch`
- `family`
- `parent_version_id`
- `status`
- `spec_hash_sha256`
- `build_hash_sha256`
- `test_hash_sha256`
- `evidence_hash_sha256`
- `plan_hash_sha256`
- `policy_version`
- `run_id`
- `approval_id`
- `created_at`
- `built_at`
- `tested_at`
- `verified_at`
- `authorized_at`
- `activated_at`

## Máquina de estados

Transiciones válidas:

`PLANNED -> BUILT -> TESTED -> VERIFIED -> AUTHORIZED -> ACTIVE -> OBSOLETE`

No se permiten saltos directos. Una reversión operacional no borra historia: crea un nuevo evento y, cuando corresponda, un rollback/compensación.

## Prerrequisitos

- BUILT: `spec_hash_sha256`, `build_hash_sha256`, `built_at`.
- TESTED: todo lo anterior + `test_hash_sha256`, `test_run_id`, `tested_at`.
- VERIFIED: todo lo anterior + `evidence_hash_sha256`, `verified_at`, verificador distinto del constructor en componentes críticos.
- AUTHORIZED: todo lo anterior + approval receipt válido ligado al plan exacto.
- ACTIVE: todo lo anterior + `activated_at` y post-verification del entorno destino.

## Approval Receipt

Nunca se almacena una master key en código ni en el ledger. La autorización se referencia mediante un objeto firmado externamente:

```json
{
  "approval_id": "opaque-id",
  "version_id": "V123",
  "plan_hash_sha256": "64-hex",
  "policy_version": "policy-v1",
  "run_id": "opaque-run-id",
  "approver_subject": "human-authority-id",
  "issued_at": "RFC3339",
  "expires_at": "RFC3339",
  "signature_ref": "external-signature-reference"
}
```

Modificar el plan invalida la autorización anterior.

## Idempotencia

Toda mutación usa `idempotency_key = SHA256(version_id | target_state | plan_hash_sha256 | policy_version)`.

La misma clave no puede producir dos promociones independientes.

## Evidence Events

El ledger principal conserva el estado actual; `version_events` conserva la historia append-only lógica:

- `event_id`
- `version_id`
- `from_state`
- `to_state`
- `actor_type`
- `actor_id`
- `run_id`
- `idempotency_key`
- `evidence_hash_sha256`
- `timestamp`

## Regression Memory

Los fallos no bloquean permanentemente una versión por existir. Un finding posee `OPEN | MITIGATED | ACCEPTED_RISK | CLOSED`. Solo findings abiertos con severidad/política bloqueante impiden promoción.

## Versiones sin huecos

No se materializan mil millones de registros. El rango ordinal existe por regla matemática. Los registros físicos se crean para versiones con especificación, checkpoint, build, prueba, evidencia o promoción.

Resolver cualquier ordinal `N` devuelve:

- `version_id = VN`
- `ordinal = N`
- `materialized = true|false`
- `status = PLANNED` si no existe registro materializado
- época derivada del rango

## Épocas

- 1–100: FOUNDATION
- 101–1,000: STABILIZATION
- 1,001–10,000: AUTOMATION
- 10,001–100,000: DISTRIBUTED_SYSTEMS
- 100,001–1,000,000: GLOBAL_INFRASTRUCTURE
- 1,000,001–10,000,000: MULTINODE_SCALE
- 10,000,001–100,000,000: PLANETARY_FEDERATION
- 100,000,001–1,000,000,000: ULTRASCALE_RESEARCH

`V25M` corresponde al ordinal 25,000,000 dentro de `PLANETARY_FEDERATION` y puede conservarse como familia/codename.

## Public API

El portal público consume únicamente un snapshot read-only sanitizado. Nunca recibe secretos, tokens de aprobación, credenciales ni endpoints de escritura.

## Gate TEVV

Toda promoción crítica sigue:

`SPEC -> BUILD -> SANDBOX -> TEST -> FAULT/RED-TEAM -> CORRECT -> RETEST -> EVIDENCE -> CROSS-REVIEW -> HUMAN GATE -> ACTIVATE -> POST-VERIFY`

## Estado de esta especificación

`DESIGNED_NOT_VERIFIED`. Este archivo define el contrato; no declara que PocketBase, API, runtime o V25M estén operativos.
