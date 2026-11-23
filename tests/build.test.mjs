import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

test('Pages build keeps relative URLs and the static game', () => {
  rmSync(dist, { recursive: true, force: true });
  execFileSync(process.execPath, ['scripts/build-pages.mjs'], {
    cwd: root,
    env: { ...process.env, BASE_PATH: './' },
    stdio: 'pipe',
  });
  assert.equal(existsSync(path.join(dist, '.nojekyll')), true);
  assert.equal(existsSync(path.join(dist, 'js', 'game.js')), true);
  assert.equal(existsSync(path.join(dist, 'sprites', 'baked.js')), true);
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.match(html, /src="js\/game\.js"/);
  assert.match(html, /src="sprites\/baked\.js"/);
  assert.doesNotMatch(html, /src="\/js\//);
});
