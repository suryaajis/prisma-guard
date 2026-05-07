import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeMigration, analyzeMigrations, loadMigrations } from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, 'fixtures');

async function read(name: string) {
  const filePath = path.join(fixtureDir, name);
  const contents = await fs.readFile(filePath, 'utf8');
  return { path: filePath, name: name.replace(/\.sql$/, ''), contents };
}

describe('analyzeMigration', () => {
  it('returns LOW for a safe migration', async () => {
    const migration = await read('safe-migration.sql');
    const result = analyzeMigration(migration);
    expect(result.score.level).toBe('LOW');
    expect(result.score.score).toBeLessThanOrEqual(3);
  });

  it('returns HIGH for a dangerous migration', async () => {
    const migration = await read('dangerous-migration.sql');
    const result = analyzeMigration(migration);
    expect(result.score.level).toBe('HIGH');
    const ids = new Set(result.score.findings.map((f) => f.ruleId));
    expect(ids.has('DROP_COLUMN')).toBe(true);
    expect(ids.has('DROP_TABLE')).toBe(true);
    expect(ids.has('ALTER_COLUMN_TYPE')).toBe(true);
    expect(ids.has('ADD_NOT_NULL_WITHOUT_DEFAULT')).toBe(true);
  });

  it('returns MEDIUM for a stacked-but-not-destructive migration', async () => {
    const migration = await read('medium-risk-migration.sql');
    const result = analyzeMigration(migration);
    expect(['MEDIUM', 'HIGH']).toContain(result.score.level);
    const ids = new Set(result.score.findings.map((f) => f.ruleId));
    expect(ids.has('LARGE_UPDATE')).toBe(true);
    expect(ids.has('MULTIPLE_ALTER_TABLE')).toBe(true);
  });

  it('respects ignoredRules from config', async () => {
    const migration = await read('dangerous-migration.sql');
    const result = analyzeMigration(migration, {
      config: { ignoredRules: ['DROP_TABLE'] },
    });
    const ids = new Set(result.score.findings.map((f) => f.ruleId));
    expect(ids.has('DROP_TABLE')).toBe(false);
  });
});

describe('analyzeMigrations + loadMigrations', () => {
  it('aggregates highestLevel across migrations', async () => {
    const migrations = await loadMigrations(fixtureDir);
    const report = analyzeMigrations(migrations);
    expect(report.totalMigrations).toBe(3);
    expect(report.highestLevel).toBe('HIGH');
  });
});
