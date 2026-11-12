import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = new URL('../dist/', import.meta.url);
const dist = fileURLToPath(folder);
function assert(condition, message) {
  if (!condition) {
    console.error(`Build verification failed: ${message}`);
    process.exitCode = 1;
  }
}

const htmlPath = join(dist, 'index.html');
const wasmPath = join(dist, 'sql-wasm.wasm');
assert(existsSync(htmlPath), 'dist/index.html is missing');
assert(existsSync(wasmPath), 'SQLite WebAssembly binary is missing from dist');
if (existsSync(wasmPath)) assert(statSync(wasmPath).size > 10_000, 'SQLite WASM file appears incomplete');

if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf8');
  assert(!html.includes('/src/main.tsx'), 'source TypeScript is still referenced: deploy the compiled dist folder, not the source');
  assert(!html.includes('%BASE_URL%'), 'Vite base placeholders were not replaced');
  assert(/src="\/QueryLab\/assets\/[^" ]+\.js"/.test(html), 'compiled JavaScript bundle must be served from /QueryLab/assets/');
}

const assetsPath = join(dist, 'assets');
assert(existsSync(assetsPath), 'compiled dist/assets directory is missing');
if (existsSync(assetsPath)) {
  const assets = readdirSync(assetsPath);
  assert(assets.some(name => name.endsWith('.css')), 'compiled stylesheet is missing');
  assert(assets.some(name => name.endsWith('.js')), 'compiled JavaScript is missing');
}
if (!process.exitCode) console.log('Verified: compiled GitHub Pages assets and SQLite WASM are present under dist/');
