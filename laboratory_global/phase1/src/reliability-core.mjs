import crypto from 'node:crypto';

export const FAILURE = Object.freeze({
  TRANSIENT: 'TRANSIENT', AUTHORIZATION: 'AUTHORIZATION', CONFIGURATION: 'CONFIGURATION',
  CONFLICT: 'CONFLICT', DEPENDENCY: 'DEPENDENCY', VERIFICATION: 'VERIFICATION',
  POLICY: 'POLICY', UNKNOWN: 'UNKNOWN'
});

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function idempotencyKey({ automationVersion, operationIdentity, targetIdentity }) {
  if (!automationVersion || !operationIdentity || !targetIdentity) throw new Error('IDEMPOTENCY_INPUT_REQUIRED');
  return sha256(`${automationVersion}|${operationIdentity}|${targetIdentity}`);
}

export function classifyFailure(error) {
  const code = String(error?.code ?? '').toUpperCase();
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  if (['ETIMEDOUT','ECONNRESET','EAI_AGAIN'].includes(code) || /timeout|temporar|429|502|503|connection reset/.test(msg)) return FAILURE.TRANSIENT;
  if (/unauthori|forbidden|permission|credential|token/.test(msg)) return FAILURE.AUTHORIZATION;
  if (/config|missing required|invalid setting/.test(msg)) return FAILURE.CONFIGURATION;
  if (/conflict|already exists|locked/.test(msg)) return FAILURE.CONFLICT;
  if (/dependency|unavailable|not ready/.test(msg)) return FAILURE.DEPENDENCY;
  if (/verify|verification|post-condition|expected state/.test(msg)) return FAILURE.VERIFICATION;
  if (/policy|denied|risk gate/.test(msg)) return FAILURE.POLICY;
  return FAILURE.UNKNOWN;
}

export function retryDecision(failureClass, attempt, maxAttempts = 3) {
  return { retry: failureClass === FAILURE.TRANSIENT && attempt < maxAttempts, failureClass, attempt, maxAttempts };
}

export function backoffMs(attempt, baseMs = 250, jitter = 0) {
  const boundedAttempt = Math.max(1, Number(attempt) || 1);
  const deterministic = baseMs * (2 ** (boundedAttempt - 1));
  return Math.round(deterministic + Math.max(0, jitter));
}

export class CircuitBreaker {
  constructor({ threshold = 3, openMs = 900000, now = () => Date.now() } = {}) {
    this.threshold = threshold; this.openMs = openMs; this.now = now;
    this.failures = 0; this.openedAt = null;
  }
  canExecute() {
    if (this.openedAt === null) return true;
    if (this.now() - this.openedAt >= this.openMs) { this.failures = 0; this.openedAt = null; return true; }
    return false;
  }
  success() { this.failures = 0; this.openedAt = null; }
  failure() { this.failures += 1; if (this.failures >= this.threshold && this.openedAt === null) this.openedAt = this.now(); }
  state() { return this.openedAt === null ? 'CLOSED' : 'OPEN'; }
}

export function assertRiskGate(riskTier, { independentReview = false, humanAuthorized = false, highAssuranceHumanGate = false } = {}) {
  if (!['R0','R1','R2','R3','R4'].includes(riskTier)) throw new Error('POLICY_INVALID_RISK_TIER');
  if (riskTier === 'R2' && !independentReview) throw new Error('POLICY_R2_REVIEW_REQUIRED');
  if (riskTier === 'R3' && !humanAuthorized) throw new Error('POLICY_R3_HUMAN_AUTHORIZATION_REQUIRED');
  if (riskTier === 'R4' && !highAssuranceHumanGate) throw new Error('POLICY_R4_HIGH_ASSURANCE_HUMAN_GATE_REQUIRED');
  return true;
}

export async function executeVerified({ action, verify }) {
  if (typeof action !== 'function') throw new Error('CONFIG_ACTION_REQUIRED');
  if (typeof verify !== 'function') throw new Error('CONFIG_POST_VERIFICATION_REQUIRED');
  const result = await action();
  const verification = await verify(result);
  if (verification !== true) throw new Error('VERIFICATION_POST_CONDITION_FAILED');
  return { state: 'VERIFIED', result };
}
