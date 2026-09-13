import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'public-portal');
const OUT = path.join(ROOT, 'dist', 'public-alpha');

const required = [
  'index.html',
  '_headers',
  '_redirects',
  'assets/styles.css',
  'assets/app.js',
  'data/status.json',
  'data/countries.json',
  'data/version-ledger.json'
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const relative of required) {
  const src = path.join(SRC, relative);
  if (!fs.existsSync(src)) {
    console.error(`BUILD_FAIL: required public artifact missing: ${relative}`);
    process.exit(1);
  }
  const dest = path.join(OUT, relative);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const emitted = [];
for (const relative of required) {
  const full = path.join(OUT, relative);
  if (fs.existsSync(full)) emitted.push(relative);
}

console.log(JSON.stringify({
  schema_version: 'haios.public-site-build.v1',
  status: 'PASS',
  output_dir: 'dist/public-alpha',
  files: emitted,
  note: 'Only whitelisted static assets are emitted. Version Ledger is a sanitized read-only snapshot; repository scripts, internal schemas, credentials and write controls are excluded.'
}, null, 2));
