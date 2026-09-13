import fs from 'node:fs';
import crypto from 'node:crypto';
import process from 'node:process';

const FILE = process.argv[2] || 'public-portal/data/version-ledger.json';
const STATES = ['PLANNED','BUILT','TESTED','VERIFIED','AUTHORIZED','ACTIVE','OBSOLETE'];
const SHA = /^[a-f0-9]{64}$/;

function fail(message) {
  console.error(`LEDGER_VALIDATE_FAIL: ${message}`);
  process.exit(1);
}
function required(v, field) {
  if (!v[field]) fail(`${v.version_id}: missing ${field} for ${v.status}`);
}
function hash(v, field) {
  required(v, field);
  if (!SHA.test(v[field])) fail(`${v.version_id}: ${field} is not full lowercase SHA-256`);
}
function stateAtLeast(status, target) {
  return STATES.indexOf(status) >= STATES.indexOf(target);
}

let data;
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
catch (e) { fail(`cannot parse ${FILE}: ${e.message}`); }

if (data.schema_version !== 'haios.public-version-ledger.v1') fail('unexpected schema_version');
if (data.mode !== 'READ_ONLY_SNAPSHOT') fail('public ledger must be READ_ONLY_SNAPSHOT');
if (data.runtime_claim !== 'NONE') fail('snapshot cannot make a runtime claim');
if (!Array.isArray(data.nodes) || data.nodes.length === 0) fail('nodes required');

const ids = new Set();
const ordinals = new Set();
for (const v of data.nodes) {
  if (!/^V[1-9][0-9]*$/.test(v.version_id || '')) fail(`invalid version_id ${v.version_id}`);
  if (!Number.isSafeInteger(v.ordinal) || v.ordinal < 1 || v.ordinal > 1_000_000_000) fail(`${v.version_id}: invalid ordinal`);
  if (v.version_id !== `V${v.ordinal}`) fail(`${v.version_id}: id/ordinal mismatch`);
  if (ids.has(v.version_id)) fail(`duplicate id ${v.version_id}`);
  if (ordinals.has(v.ordinal)) fail(`duplicate ordinal ${v.ordinal}`);
  ids.add(v.version_id); ordinals.add(v.ordinal);
  if (!STATES.includes(v.status)) fail(`${v.version_id}: invalid status ${v.status}`);

  // A public snapshot may advertise only evidence actually included by reference/hash.
  if (stateAtLeast(v.status,'BUILT')) { hash(v,'spec_hash_sha256'); hash(v,'build_hash_sha256'); required(v,'built_at_utc'); }
  if (stateAtLeast(v.status,'TESTED')) { hash(v,'test_hash_sha256'); required(v,'test_run_id'); required(v,'tested_at_utc'); }
  if (stateAtLeast(v.status,'VERIFIED')) { hash(v,'evidence_hash_sha256'); required(v,'verified_at_utc'); }
  if (stateAtLeast(v.status,'AUTHORIZED')) { required(v,'approval_id'); required(v,'authorized_at_utc'); }
  if (v.status === 'ACTIVE') { required(v,'activated_at_utc'); required(v,'post_verification'); if (v.post_verification !== 'PASS') fail(`${v.version_id}: ACTIVE without post verification PASS`); }

  for (const field of ['authorization_token','master_key','password','private_key','api_token']) {
    if (field in v) fail(`${v.version_id}: forbidden secret-like field ${field}`);
  }
}

const canonical = JSON.stringify(data.nodes.map(v => ({version_id:v.version_id,ordinal:v.ordinal,status:v.status,evidence:v.evidence_hash_sha256||null})));
const snapshotHash = crypto.createHash('sha256').update(canonical).digest('hex');
console.log(JSON.stringify({schema_version:'haios.version-ledger-validation.v1',status:'PASS',file:FILE,node_count:data.nodes.length,snapshot_projection_sha256:snapshotHash,note:'PASS validates snapshot structure and evidence prerequisites only; it does not verify runtime.'},null,2));
