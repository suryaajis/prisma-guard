import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAnalyze } from '../commands/analyze.js';
import { ExitCode } from '../exit-codes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, '../../../analyzer/src/__tests__/fixtures');

describe('runAnalyze', () => {
  let writeOut: ReturnType<typeof vi.spyOn>;
  let writeErr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeOut = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    writeErr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeOut.mockRestore();
    writeErr.mockRestore();
  });

  it('exits 0 for a safe migration', async () => {
    const code = await runAnalyze(path.join(fixtureDir, 'safe-migration.sql'), { silent: true });
    expect(code).toBe(ExitCode.Success);
  });

  it('exits 1 for a dangerous migration', async () => {
    const code = await runAnalyze(path.join(fixtureDir, 'dangerous-migration.sql'), {
      silent: true,
    });
    expect(code).toBe(ExitCode.RiskExceeded);
  });

  it('exits 2 if path does not exist', async () => {
    const code = await runAnalyze('/this/does/not/exist.sql', { silent: true });
    expect(code).toBe(ExitCode.ToolError);
  });

  it('emits JSON when --json is passed', async () => {
    const code = await runAnalyze(path.join(fixtureDir, 'safe-migration.sql'), { json: true });
    expect(code).toBe(ExitCode.Success);
    const written = writeOut.mock.calls.map((c) => String(c[0])).join('');
    expect(() => JSON.parse(written)).not.toThrow();
  });
});
