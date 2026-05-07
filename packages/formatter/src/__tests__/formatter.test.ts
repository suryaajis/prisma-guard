import { describe, expect, it } from 'vitest';
import type { AnalysisReport } from '@prismaguard/shared';
import { renderJson, renderTerminal } from '../index.js';

const report: AnalysisReport = {
  totalMigrations: 1,
  highestLevel: 'HIGH',
  results: [
    {
      migration: { name: 'sample', path: '/x/sample.sql', contents: '' },
      score: {
        score: 8.2,
        level: 'HIGH',
        findings: [
          {
            ruleId: 'DROP_COLUMN',
            title: 'DROP COLUMN',
            severity: 'critical',
            description: 'Drops a column.',
            recommendation: 'Avoid.',
            scoreImpact: 8,
          },
        ],
      },
    },
  ],
};

describe('renderJson', () => {
  it('produces valid JSON', () => {
    const json = renderJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.totalMigrations).toBe(1);
    expect(parsed.highestLevel).toBe('HIGH');
    expect(parsed.results[0].findings[0].ruleId).toBe('DROP_COLUMN');
  });
});

describe('renderTerminal', () => {
  it('contains the migration name and risk level', () => {
    const text = renderTerminal(report);
    expect(text).toContain('sample');
    expect(text).toContain('HIGH');
    expect(text).toContain('DROP COLUMN');
  });

  it('renders empty report gracefully', () => {
    const text = renderTerminal({ totalMigrations: 0, highestLevel: 'LOW', results: [] });
    expect(text.toLowerCase()).toContain('no migrations');
  });
});
