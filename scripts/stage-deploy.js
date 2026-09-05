import fs from 'node:fs';
import path from 'node:path';

const PROJECT = process.cwd();
const DEPLOY_DIR = path.join(PROJECT, 'deploy');
const NEXT_BUILD_DIR = path.join(PROJECT, '.next');
const OUT_DIR = path.join(PROJECT, 'out');

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function tryStage(label, src) {
  if (!exists(src)) {
    console.log(`[stage] ${label}: missing ${src}`);
    return false;
  }
  const stat = fs.statSync(src);
  if (!stat.isDirectory()) {
    console.log(`[stage] ${label}: ${src} is not a directory`);
    return false;
  }
  copyDir(src, DEPLOY_DIR);
  console.log(`[stage] ${label}: staged ${src} -> ${DEPLOY_DIR}`);
  return true;
}

const staged =
  tryStage('out', OUT_DIR) ||
  tryStage('next-build', NEXT_BUILD_DIR);

if (!staged) {
  console.log('[stage] manual-staging: no build artifact found; using existing deploy/ contents.');
  if (!exists(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR, { recursive: true });
    console.log(`[stage] created ${DEPLOY_DIR}`);
  }
}
