import { Command } from 'commander';
import { runAnalyze, type AnalyzeCommandOptions } from './commands/analyze.js';
import { ExitCode } from './exit-codes.js';

const VERSION = '0.1.0';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('prismaguard')
    .description('Detect dangerous operations in Prisma SQL migrations before deployment.')
    .version(VERSION);

  program
    .command('analyze')
    .description('Analyze a migration file or a Prisma migrations directory.')
    .argument('<path>', 'Path to a .sql file or a migrations directory')
    .option('--json', 'Output machine-readable JSON instead of formatted text')
    .option('--silent', 'Suppress all output. Useful for exit-code-only CI usage.')
    .option('--fail-on-high-risk', 'Exit with code 1 if any migration is HIGH risk (default behavior)')
    .option('--fail-on <level>', 'Set the minimum risk level that triggers exit code 1 (LOW|MEDIUM|HIGH)')
    .option('-c, --config <path>', 'Path to a prismaguard config file')
    .option('--verbose', 'Include raw SQL statements in the output')
    .option('--report <path>', 'Write an HTML report to the specified file path')
    .action(async (target: string, opts: AnalyzeCommandOptions) => {
      const code = await runAnalyze(target, normalizeOptions(opts));
      process.exit(code);
    });

  program.exitOverride((err) => {
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(ExitCode.Success);
    }
    process.exit(ExitCode.ToolError);
  });

  return program;
}

function normalizeOptions(opts: AnalyzeCommandOptions & { failOn?: string }): AnalyzeCommandOptions {
  const failOn = opts.failOn?.toUpperCase();
  const validLevel =
    failOn === 'LOW' || failOn === 'MEDIUM' || failOn === 'HIGH' ? failOn : undefined;
  const out: AnalyzeCommandOptions = {};
  if (opts.json !== undefined) out.json = opts.json;
  if (opts.silent !== undefined) out.silent = opts.silent;
  if (opts.failOnHighRisk !== undefined) out.failOnHighRisk = opts.failOnHighRisk;
  if (validLevel !== undefined) out.failOn = validLevel;
  if (opts.config !== undefined) out.config = opts.config;
  if (opts.verbose !== undefined) out.verbose = opts.verbose;
  if (opts.report !== undefined) out.report = opts.report;
  return out;
}

export { runAnalyze, ExitCode };
