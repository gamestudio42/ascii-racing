import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

const files = [
  ...jsFiles(path.join(root, 'js')),
  ...jsFiles(path.join(root, 'sprites')),
  ...jsFiles(path.join(root, 'desktop', 'src')),
  ...jsFiles(path.join(root, 'desktop', 'scripts')),
  ...jsFiles(path.join(root, 'scripts')),
];

for (const file of files) {
  test(`syntax ${path.relative(root, file)}`, () => {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  });
}
