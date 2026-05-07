import type { AnalysisReport } from '@prismaguard/shared';

export function renderJson(report: AnalysisReport): string {
  const payload = {
    totalMigrations: report.totalMigrations,
    highestLevel: report.highestLevel,
    results: report.results.map((r) => ({
      migration: { name: r.migration.name, path: r.migration.path },
      score: r.score.score,
      level: r.score.level,
      findings: r.score.findings,
    })),
  };
  return JSON.stringify(payload, null, 2);
}
