import chalk, { type ChalkInstance } from 'chalk';
import type { RiskLevel, Severity } from '@prismaguard/shared';

export const severityColor: Record<Severity, ChalkInstance> = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow.bold,
  low: chalk.cyan.bold,
};

export const severityLabel: Record<Severity, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export const levelColor: Record<RiskLevel, ChalkInstance> = {
  HIGH: chalk.red.bold,
  MEDIUM: chalk.yellow.bold,
  LOW: chalk.green.bold,
};

export const dim = chalk.dim;
export const bold = chalk.bold;
export const italic = chalk.italic;
