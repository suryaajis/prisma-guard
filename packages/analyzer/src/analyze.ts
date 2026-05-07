import { parseMigration } from '@prismaguard/parser';
import { selectRules } from '@prismaguard/rules';
import { computeRiskScore } from '@prismaguard/scoring';
import {
  RISK_LEVEL_RANK,
  type AnalysisReport,
  type MigrationAnalysis,
  type MigrationFile,
  type MigrationRiskScore,
  type PrismaGuardConfig,
  type RiskLevel,
  type Rule,
  type RuleFinding,
} from '@prismaguard/shared';

export interface AnalyzeOptions {
  config?: PrismaGuardConfig;
  rules?: readonly Rule[];
}

export function analyzeMigration(
  migration: MigrationFile,
  options: AnalyzeOptions = {},
): MigrationAnalysis {
  const config = options.config ?? {};
  const rules =
    options.rules ?? selectRules(config.ignoredRules ? { ignored: config.ignoredRules } : {});
  const dialect = config.dialect ?? 'mysql';

  const statements = parseMigration(migration.contents, { dialect });
  const findings: RuleFinding[] = [];
  for (const rule of rules) {
    findings.push(...rule.detect(statements));
  }

  const score: MigrationRiskScore = computeRiskScore(findings);
  return { migration, score };
}

export function analyzeMigrations(
  migrations: MigrationFile[],
  options: AnalyzeOptions = {},
): AnalysisReport {
  const results = migrations.map((m) => analyzeMigration(m, options));
  const highestLevel = results.reduce<RiskLevel>(
    (acc, r) => (RISK_LEVEL_RANK[r.score.level] > RISK_LEVEL_RANK[acc] ? r.score.level : acc),
    'LOW',
  );
  return {
    results,
    totalMigrations: results.length,
    highestLevel,
  };
}
