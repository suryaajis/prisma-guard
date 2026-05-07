// Post-build steps for the publishable `prismaguard` package:
//   1. Ensure dist/bin.js has a shebang and is executable on POSIX.
//      (tsup's `banner` already injects the shebang, but we keep this as a
//       safety net for any config drift.)
//   2. Copy the root README.md into the package so it appears on the npm page.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, '..');
const repoRoot = path.resolve(pkgRoot, '..', '..');

const binPath = path.join(pkgRoot, 'dist', 'bin.js');
const rootReadme = path.join(repoRoot, 'README.md');
const pkgReadme = path.join(pkgRoot, 'README.md');

async function ensureShebang() {
  let contents = await fs.readFile(binPath, 'utf8');

  // Strip any leading shebang lines (tsup's `banner` may stack on top of
  // a shebang already present in the source file), then emit exactly one.
  while (contents.startsWith('#!')) {
    const newlineIdx = contents.indexOf('\n');
    contents = newlineIdx === -1 ? '' : contents.slice(newlineIdx + 1);
  }
  await fs.writeFile(binPath, `#!/usr/bin/env node\n${contents}`);

  if (process.platform !== 'win32') {
    await fs.chmod(binPath, 0o755);
  }
}

async function copyReadme() {
  try {
    await fs.copyFile(rootReadme, pkgReadme);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      console.warn(`postbuild: root README not found at ${rootReadme}, skipping copy`);
      return;
    }
    throw err;
  }
}

try {
  await ensureShebang();
  await copyReadme();
} catch (err) {
  console.error('postbuild: failed', err);
  process.exit(1);
}
