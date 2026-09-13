import assert from 'node:assert/strict';
import worker from '../src/index.mjs';

const call = (path, method = 'GET') => worker.fetch(new Request(`https://edge.test${path}`, { method }), {}, {});

const health = await call('/health');
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.service, 'haios-edge-api');
assert.equal(healthBody.state, 'EDGE_HANDLER_RESPONDED');

const version = await call('/version');
assert.equal(version.status, 200);
const versionBody = await version.json();
assert.equal(versionBody.architecture.public_web, 'Cloudflare Pages');
assert.equal(versionBody.architecture.dynamic_edge, 'Cloudflare Workers');

const write = await call('/health', 'POST');
assert.equal(write.status, 405);
assert.equal(write.headers.get('allow'), 'GET, HEAD');

const missing = await call('/missing');
assert.equal(missing.status, 404);

console.log(JSON.stringify({
  status: 'TESTED_IN_NODE_SELFTEST',
  scope: 'Worker handler contract only; no Cloudflare deployment or DNS claim',
  tests: 4,
  passed: 4
}, null, 2));
