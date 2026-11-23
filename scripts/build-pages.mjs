// Copies the static game into dist/ for GitHub Pages.
// Script URLs in index.html are already relative, so one folder works at the site
// root and under /pr-preview/pr-<number>/. BASE_PATH=./ is the studio convention
// for that. An absolute base would break the pull request preview.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_PATH ?? './';
if (base !== './' && base !== '/' && base !== '') {
  console.error(
    `BASE_PATH ${base} is not supported. Use ./ so the same files work at the site root and under a pull request preview.`,
  );
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'dist');

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(path.join(root, 'index.html'), path.join(dest, 'index.html'));
cpSync(path.join(root, 'js'), path.join(dest, 'js'), { recursive: true });
cpSync(path.join(root, 'sprites'), path.join(dest, 'sprites'), { recursive: true });
writeFileSync(path.join(dest, '.nojekyll'), '');

const html = readFileSync(path.join(dest, 'index.html'), 'utf8');
for (const match of html.matchAll(/\ssrc="([^"]+)"/g)) {
  const src = match[1];
  if (src.startsWith('/') && !src.startsWith('//')) {
    console.error(`Absolute asset URL would break the pull request preview: ${src}`);
    process.exit(1);
  }
}

console.log(`built Pages site -> ${dest}`);
