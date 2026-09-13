import assert from 'node:assert/strict';
import { CircuitBreaker, FAILURE, assertRiskGate, backoffMs, classifyFailure, executeVerified, idempotencyKey, retryDecision, sha256 } from '../src/reliability-core.mjs';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.message }); process.exitCode = 1; }
}

await test('V3 SHA-256 provenance primitive', () => assert.equal(sha256('HAIOS').length, 64));
await test('V5 R0 allowed', () => assert.equal(assertRiskGate('R0'), true));
await test('V5 R2 blocks without review', () => assert.throws(() => assertRiskGate('R2'), /R2_REVIEW_REQUIRED/));
await test('V5 R3 blocks without human authorization', () => assert.throws(() => assertRiskGate('R3'), /R3_HUMAN_AUTHORIZATION_REQUIRED/));
await test('V5 R4 blocks without high-assurance human gate', () => assert.throws(() => assertRiskGate('R4'), /R4_HIGH_ASSURANCE/));
await test('V7 idempotency is stable', () => {
  const input = { automationVersion:'1.0.0', operationIdentity:'op-1', targetIdentity:'target-1' };
  assert.equal(idempotencyKey(input), idempotencyKey(input));
  assert.equal(idempotencyKey(input).length, 64);
});
await test('V8 transient classification', () => assert.equal(classifyFailure(new Error('HTTP 503 temporary')), FAILURE.TRANSIENT));
await test('V8 unknown does not become transient', () => assert.equal(classifyFailure(new Error('unexpected logic error')), FAILURE.UNKNOWN));
await test('V9 retry is bounded and transient-only', () => {
  assert.equal(retryDecision(FAILURE.TRANSIENT, 1, 3).retry, true);
  assert.equal(retryDecision(FAILURE.TRANSIENT, 3, 3).retry, false);
  assert.equal(retryDecision(FAILURE.AUTHORIZATION, 1, 3).retry, false);
  assert.equal(backoffMs(3, 100, 0), 400);
});
await test('V10 circuit opens at threshold and recovers after window', () => {
  let now = 1000; const c = new CircuitBreaker({ threshold:2, openMs:100, now:()=>now });
  c.failure(); assert.equal(c.state(), 'CLOSED'); c.failure(); assert.equal(c.state(), 'OPEN'); assert.equal(c.canExecute(), false);
  now = 1101; assert.equal(c.canExecute(), true); assert.equal(c.state(), 'CLOSED');
});
await test('V6 execution requires real post-verification', async () => {
  const ok = await executeVerified({ action: async()=>({value:42}), verify: async r=>r.value===42 });
  assert.equal(ok.state, 'VERIFIED');
  await assert.rejects(() => executeVerified({ action:async()=>1, verify:async()=>false }), /POST_CONDITION_FAILED/);
});

const summary = { status: results.every(r=>r.status==='PASS') ? 'TESTED_IN_NODE_SELFTEST' : 'SELFTEST_FAILED', tests: results.length, passed: results.filter(r=>r.status==='PASS').length, failed: results.filter(r=>r.status==='FAIL').length, results };
console.log(JSON.stringify(summary, null, 2));
