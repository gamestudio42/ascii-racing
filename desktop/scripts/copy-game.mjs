// Copies the static web game next to the Electron main process.
// GitHub Pages publishes the copy made by scripts/build-pages.mjs; this folder is only for the snap.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const dest = path.resolve(here, '..', 'www');

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(path.join(repoRoot, 'index.html'), path.join(dest, 'index.html'));
cpSync(path.join(repoRoot, 'js'), path.join(dest, 'js'), { recursive: true });
cpSync(path.join(repoRoot, 'sprites'), path.join(dest, 'sprites'), { recursive: true });
console.log(`copied game -> ${dest}`);
