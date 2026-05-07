import { defineConfig } from 'tsup';

// PrismaGuard ships as a single self-contained binary on npm.
//
// The `@prismaguard/*` packages are private workspace packages that will never
// be published — so we bundle them directly into dist/bin.js. Real npm
// dependencies (chalk, commander, ora) and Node built-ins stay external so
// they resolve via node_modules at install time.
export default defineConfig({
  // bin.ts is the CLI entrypoint; index.ts exposes the programmatic API
  // (`createProgram`, `runAnalyze`, `ExitCode`) so consumers can embed
  // PrismaGuard from JS without shelling out — both must be in dist/.
  entry: ['src/bin.ts', 'src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  // Inline every transitive workspace package + their non-runtime deps
  // (zod, node-sql-parser) so installers don't need them.
  noExternal: [/^@prismaguard\//, 'zod', 'node-sql-parser'],
  external: ['chalk', 'commander', 'ora'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Enabled so bin.ts and index.ts share one chunk for the analyzer/parser/
  // rules code (~4 MB). Without splitting, each entry would inline the full
  // workspace tree separately and double the published size.
  splitting: true,
  shims: false,
  // Shebang is added by scripts/postbuild.mjs to bin.js only — using
  // tsup's `banner` would also inject it into index.js and the shared
  // chunk, which is harmless but noisy.
});
