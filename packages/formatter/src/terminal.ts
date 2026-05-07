import chalk from 'chalk';
import type { AnalysisReport, MigrationAnalysis, RuleFinding } from '@prismaguard/shared';
import { dim, levelColor, severityColor, severityLabel } from './colors.js';

const DIVIDER = '━'.repeat(74);

export interface RenderOptions {
  verbose?: boolean;
}

export function renderTerminal(report: AnalysisReport, options: RenderOptions = {}): string {
  if (report.results.length === 0) {
    return `${chalk.yellow('No migrations found.')}\n`;
  }

  const sections = report.results.map((result) => renderMigration(result, options));
  return sections.join('\n\n') + '\n';
}

function renderMigration(analysis: MigrationAnalysis, options: RenderOptions): string {
  const { migration, score } = analysis;
  const lines: string[] = [];

  lines.push(chalk.bold(`${DIVIDER}`));
  lines.push(chalk.bold.cyan(`PrismaGuard Report`));
  lines.push(chalk.bold(DIVIDER));
  lines.push(`${dim('Migration:')} ${migration.name}`);
  lines.push(`${dim('File:     ')} ${migration.path}`);
  lines.push(`${dim('Score:    ')} ${formatScore(score.score)} / 10`);
  lines.push(`${dim('Level:    ')} ${levelColor[score.level](score.level)}`);
  lines.push('');

  if (score.findings.length === 0) {
    lines.push(chalk.green('✓ No risks detected.'));
    lines.push(DIVIDER);
    return lines.join('\n');
  }

  lines.push(chalk.bold('Detected Risks:'));
  lines.push('');
  score.findings.forEach((finding, index) => {
    lines.push(...renderFinding(finding, index + 1, options));
    lines.push('');
  });

  lines.push(chalk.bold('Recommendations:'));
  for (const finding of dedupeRecommendations(score.findings)) {
    lines.push(`  ${dim('•')} ${finding.recommendation}`);
  }

  lines.push('');
  lines.push(DIVIDER);
  lines.push(footer(score.level));
  lines.push(DIVIDER);

  return lines.join('\n');
}

function renderFinding(finding: RuleFinding, index: number, options: RenderOptions): string[] {
  const colored = severityColor[finding.severity];
  const tag = colored(` ${severityLabel[finding.severity]} `);
  const header = `${chalk.bold(`${index}.`)} ${chalk.bold(finding.title)}  ${tag}`;
  const lines = [header, `   ${finding.description}`];
  lines.push(`   ${chalk.gray('→')} ${chalk.italic(finding.recommendation)}`);
  if (options.verbose && finding.location?.statement) {
    lines.push('');
    lines.push(chalk.gray('   ' + finding.location.statement.replace(/\n/g, '\n   ')));
  }
  return lines;
}

function dedupeRecommendations(findings: RuleFinding[]): RuleFinding[] {
  const seen = new Set<string>();
  const out: RuleFinding[] = [];
  for (const f of findings) {
    if (seen.has(f.recommendation)) continue;
    seen.add(f.recommendation);
    out.push(f);
  }
  return out;
}

function formatScore(score: number): string {
  const rounded = score.toFixed(1);
  if (score >= 7) return chalk.red.bold(rounded);
  if (score >= 4) return chalk.yellow.bold(rounded);
  return chalk.green.bold(rounded);
}

function footer(level: AnalysisReport['highestLevel']): string {
  switch (level) {
    case 'HIGH':
      return chalk.red.bold('✖ HIGH risk migration. Review carefully before deployment.');
    case 'MEDIUM':
      return chalk.yellow.bold('⚠ MEDIUM risk migration. Inspect findings.');
    case 'LOW':
    default:
      return chalk.green.bold('✓ LOW risk migration. Looks safe to deploy.');
  }
}
