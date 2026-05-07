import { describe, expect, it } from 'vitest';
import type { RuleFinding } from '@prismaguard/shared';
import { computeRiskScore, riskLevelFromScore } from '../score.js';

function finding(severity: RuleFinding['severity'], scoreImpact: number): RuleFinding {
  return {
    ruleId: `R_${severity}_${scoreImpact}`,
    title: 't',
    severity,
    description: 'd',
    recommendation: 'r',
    scoreImpact,
  };
}

describe('computeRiskScore', () => {
  it('returns 0 / LOW for empty findings', () => {
    const r = computeRiskScore([]);
    expect(r.score).toBe(0);
    expect(r.level).toBe('LOW');
  });

  it('marks single critical as HIGH', () => {
    const r = computeRiskScore([finding('critical', 9)]);
    expect(r.level).toBe('HIGH');
    expect(r.score).toBeGreaterThanOrEqual(7);
  });

  it('caps at 10', () => {
    const r = computeRiskScore([
      finding('critical', 9),
      finding('critical', 9),
      finding('critical', 9),
      finding('critical', 9),
    ]);
    expect(r.score).toBeLessThanOrEqual(10);
  });

  it('applies diminishing returns within severity', () => {
    const a = computeRiskScore([finding('medium', 4)]);
    const b = computeRiskScore([finding('medium', 4), finding('medium', 4)]);
    expect(b.score).toBeGreaterThan(a.score);
    expect(b.score).toBeLessThan(a.score * 2);
  });
});

describe('riskLevelFromScore', () => {
  it('thresholds map correctly', () => {
    expect(riskLevelFromScore(0)).toBe('LOW');
    expect(riskLevelFromScore(3)).toBe('LOW');
    expect(riskLevelFromScore(4)).toBe('MEDIUM');
    expect(riskLevelFromScore(6)).toBe('MEDIUM');
    expect(riskLevelFromScore(6.1)).toBe('HIGH');
    expect(riskLevelFromScore(10)).toBe('HIGH');
  });
});
