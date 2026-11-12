import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const src = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dst = resolve('public/sql-wasm.wasm');
if (!existsSync(src)) {
  console.error('SQLite WASM missing. Run npm install before npm run build.');
  process.exitCode = 1;
} else {
  mkdirSync(resolve('public'), { recursive: true });
  copyFileSync(src, dst);
  console.log('Copied SQLite WebAssembly binary to public/sql-wasm.wasm');
}
