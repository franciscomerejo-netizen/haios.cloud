import fs from 'node:fs';
import process from 'node:process';

function fail(message){console.error(`VERIFY_FAIL: ${message}`);process.exit(1)}
function readJson(path){try{return JSON.parse(fs.readFileSync(path,'utf8'))}catch(error){fail(`invalid JSON at ${path}: ${error.message}`)}}

const status=readJson('data/status.json');
const countries=readJson('data/countries.json');
const ledger=readJson('data/version-ledger.json');
const html=fs.readFileSync('index.html','utf8');

if(status.schema_version!=='haios.public-state.v1')fail('unexpected public-state schema');
if(status.public_mode!=='READ_ONLY')fail('public_mode must remain READ_ONLY');
if(status.runtime?.state!=='UNKNOWN')fail('runtime must remain UNKNOWN in Alpha');
if(status.runtime?.evidence_level!=='E1')fail('global EvidenceLevel must remain E1 in Alpha');
if(status.v8?.status!=='BLOCKED')fail('V8 must remain BLOCKED');
if(status.v24_1_transition?.runtime_verified!==false)fail('runtime_verified must remain false');
if(status.country_live_state?.auto_promotes_evidence!==false)fail('country live state cannot auto-promote evidence');

const forbidden=['RUNTIME_VERIFIED = YES','RUNTIME_VERIFIED=YES','EVIDENCELEVEL: E3','EVIDENCELEVEL: E4','PRODUCTION VERIFIED','POCKETBASE PUBLIC','PB_ADMIN_TOKEN','CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','MASTER-KEY','MASTER_KEY'];
for(const marker of forbidden)if(html.toUpperCase().includes(marker.toUpperCase()))fail(`forbidden public claim/secret marker found: ${marker}`);

if(countries.schema_version!=='haios.public-country-registry.v1')fail('unexpected country registry schema');
if(!Array.isArray(countries.nodes)||countries.nodes.length===0)fail('country registry must contain design entries');
const seen=new Set();
for(const node of countries.nodes){if(!/^[A-Z]{3}$/.test(node.iso3||''))fail('country node has invalid ISO3 identifier');if(seen.has(node.iso3))fail(`duplicate country node: ${node.iso3}`);seen.add(node.iso3);if(node.runtime_state!=='DESIGNED')fail(`country ${node.iso3} must remain DESIGNED in Public Alpha`);if(node.evidence_level!=='E0')fail(`country ${node.iso3} must remain E0 until country-specific evidence exists`);if(node.brand_status!=='UNVERIFIED')fail(`country ${node.iso3} brand status must remain UNVERIFIED`);if(!String(node.brand_assets||'').includes('UNVERIFIED'))fail(`country ${node.iso3} brand assets must remain UNVERIFIED`);if(!String(node.brand_assets||'').includes('approved_for_use:false'))fail(`country ${node.iso3} brand assets must not be approved for use`)}

if(ledger.schema_version!=='haios.public-version-ledger.v1')fail('unexpected version ledger schema');
if(ledger.mode!=='READ_ONLY_SNAPSHOT')fail('ledger must remain READ_ONLY_SNAPSHOT');
if(ledger.runtime_claim!=='NONE')fail('ledger cannot claim runtime');
if(!Array.isArray(ledger.nodes)||ledger.nodes.length===0)fail('ledger checkpoints required');
const versionIds=new Set(),ordinals=new Set();
for(const node of ledger.nodes){if(!/^V[1-9][0-9]*$/.test(node.version_id||''))fail(`invalid version id ${node.version_id}`);if(node.version_id!==`V${node.ordinal}`)fail(`version/ordinal mismatch ${node.version_id}`);if(versionIds.has(node.version_id)||ordinals.has(node.ordinal))fail(`duplicate ledger checkpoint ${node.version_id}`);versionIds.add(node.version_id);ordinals.add(node.ordinal);if(node.status!=='PLANNED')fail(`${node.version_id} must remain PLANNED until evidence-bearing promotion`);if(node.ordinal<1||node.ordinal>1_000_000_000)fail(`${node.version_id} outside authorized ledger range`)}
if(!ordinals.has(25_000_000))fail('V25M checkpoint missing');
if(!ordinals.has(1_000_000_000))fail('V1B checkpoint missing');

console.log('VERIFY_PASS: public portal, country registry and Version Ledger guardrails preserved; no runtime/evidence auto-promotion.');
