#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ENVS = {
  dev: { db: 'mememint-db-dev', dbId: 'ca9d0794-9db8-4ff1-8533-b38fea11eff7' },
  qa: { db: 'mememint-db-qa', dbId: 'eb306177-ff43-4da5-b0d0-22101e6b2542' },
  main: { db: 'mememint-db', dbId: 'd9f9df79-99e0-4725-9727-27cf13a9042b' },
};

const WORKER = {
  dev: 'mememint-dev',
  qa: 'mememint-qa',
  main: 'mememint',
};

const RENDER_WORKER = {
  dev: 'mememint-render-dev',
  qa: 'mememint-render-qa',
  main: 'mememint-render',
};

function parseJsonc(src) {
  return JSON.parse(
    src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
  );
}

function writeConfig(env, kind) {
  const template = kind === 'main' ? 'wrangler.jsonc' : 'wrangler.render.jsonc';
  const outFile =
    kind === 'main'
      ? `wrangler.env.${env}.jsonc`
      : `wrangler.env.${env}.render.jsonc`;
  const cfg = parseJsonc(fs.readFileSync(path.join(ROOT, template), 'utf8'));

  cfg.name = kind === 'main' ? WORKER[env] : RENDER_WORKER[env];

  if (kind === 'main') {
    cfg.services[0].service = RENDER_WORKER[env];
    cfg.durable_objects.bindings[0].script_name = WORKER[env];
  }

  cfg.d1_databases[0].database_name = ENVS[env].db;
  cfg.d1_databases[0].database_id = ENVS[env].dbId;

  fs.writeFileSync(
    path.join(ROOT, outFile),
    `// AUTO-GENERATED from ${template} by scripts/gen-wrangler-config.mjs - do not edit manually.\n${JSON.stringify(cfg, null, 2)}\n`
  );
  console.log(`Wrote ${outFile}`);
}

const env = process.argv[2];
if (!env || !ENVS[env]) {
  console.error('Usage: node scripts/gen-wrangler-config.mjs <dev|qa|main>');
  process.exit(1);
}

writeConfig(env, 'main');
writeConfig(env, 'render');