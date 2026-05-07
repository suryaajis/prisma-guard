import {
  RISK_LEVEL_THRESHOLDS,
  type MigrationRiskScore,
  type RiskLevel,
  type RuleFinding,
  type Severity,
} from '@prismaguard/shared';

const DIMINISHING_FACTOR: Record<Severity, number> = {
  critical: 0.85,
  high: 0.7,
  medium: 0.55,
  low: 0.4,
};

/**
 * Compute a 0-10 risk score from rule findings using diminishing returns
 * within each severity bucket. The first finding of each severity contributes
 * its full score impact; subsequent findings of the same severity contribute
 * progressively less. This prevents pathologically large migrations with
 * dozens of low-severity findings from dominating a single critical issue.
 */
export function computeRiskScore(findings: RuleFinding[]): MigrationRiskScore {
  if (findings.length === 0) {
    return { score: 0, level: 'LOW', findings: [] };
  }

  const grouped = groupBySeverity(findings);
  let total = 0;

  for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
    const bucket = grouped[severity];
    const sorted = [...bucket].sort((a, b) => b.scoreImpact - a.scoreImpact);
    const factor = DIMINISHING_FACTOR[severity];
    sorted.forEach((finding, index) => {
      const weight = Math.pow(factor, index);
      total += finding.scoreImpact * weight;
    });
  }

  const score = Math.min(10, Math.round(total * 10) / 10);
  const level = riskLevelFromScore(score);
  return { score, level, findings };
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= RISK_LEVEL_THRESHOLDS.LOW_MAX) return 'LOW';
  if (score <= RISK_LEVEL_THRESHOLDS.MEDIUM_MAX) return 'MEDIUM';
  return 'HIGH';
}

function groupBySeverity(findings: RuleFinding[]): Record<Severity, RuleFinding[]> {
  const result: Record<Severity, RuleFinding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const finding of findings) {
    result[finding.severity].push(finding);
  }
  return result;
}
