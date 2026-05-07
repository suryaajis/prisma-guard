import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import ora from 'ora';
import {
  analyzeMigrations,
  loadConfig,
  loadMigrations,
} from '@prismaguard/analyzer';
import { renderJson, renderTerminal } from '@prismaguard/formatter';
import {
  PrismaGuardError,
  RISK_LEVEL_RANK,
  type PrismaGuardConfig,
  type RiskLevel,
} from '@prismaguard/shared';
import { ExitCode } from '../exit-codes.js';

export interface AnalyzeCommandOptions {
  json?: boolean;
  silent?: boolean;
  failOnHighRisk?: boolean;
  failOn?: RiskLevel;
  config?: string;
  verbose?: boolean;
}

export async function runAnalyze(
  target: string,
  options: AnalyzeCommandOptions,
): Promise<number> {
  const cwd = process.cwd();
  const absoluteTarget = path.isAbsolute(target) ? target : path.resolve(cwd, target);
  const useJson = options.json === true;
  const silent = options.silent === true;

  const spinner = !silent && !useJson ? ora('Loading migrations…').start() : null;

  try {
    const config = await loadConfig(cwd, options.config);
    const migrations = await loadMigrations(absoluteTarget);
    if (spinner) spinner.text = `Analyzing ${migrations.length} migration(s)…`;
    const report = analyzeMigrations(migrations, config ? { config } : {});
    if (spinner) spinner.succeed(`Analyzed ${migrations.length} migration(s).`);

    if (useJson) {
      process.stdout.write(renderJson(report) + '\n');
    } else if (!silent) {
      process.stdout.write(renderTerminal(report, { verbose: options.verbose === true }));
    }

    const threshold = resolveFailThreshold(options, config);
    return shouldFail(report.highestLevel, threshold) ? ExitCode.RiskExceeded : ExitCode.Success;
  } catch (err) {
    if (spinner) spinner.fail('Analysis failed.');
    if (err instanceof PrismaGuardError) {
      process.stderr.write(chalk.red(`[${err.code}] ${err.message}\n`));
    } else if (err instanceof Error) {
      process.stderr.write(chalk.red(`Unexpected error: ${err.message}\n`));
    } else {
      process.stderr.write(chalk.red('Unexpected error.\n'));
    }
    return ExitCode.ToolError;
  }
}

function resolveFailThreshold(
  options: AnalyzeCommandOptions,
  config: PrismaGuardConfig | undefined,
): RiskLevel {
  if (options.failOn) return options.failOn;
  if (options.failOnHighRisk) return 'HIGH';
  if (config?.failOn) return config.failOn;
  return 'HIGH';
}

function shouldFail(actual: RiskLevel, threshold: RiskLevel): boolean {
  return RISK_LEVEL_RANK[actual] >= RISK_LEVEL_RANK[threshold];
}
