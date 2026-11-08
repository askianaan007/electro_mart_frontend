// Copies the barcode reader's .wasm into public/ so phone camera scanning
// never depends on a third-party CDN. The path carries the version, so an
// upgrade of zxing-wasm can't serve a stale binary.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'zxing-wasm');
if (!existsSync(pkgDir)) process.exit(0);

const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const target = join(root, 'public', 'zxing', version);
mkdirSync(target, { recursive: true });
copyFileSync(join(pkgDir, 'dist', 'reader', 'zxing_reader.wasm'), join(target, 'zxing_reader.wasm'));
