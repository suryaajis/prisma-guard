import type { RiskLevel, Severity } from './types.js';

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  low: 1,
  medium: 3,
  high: 6,
  critical: 9,
};

export const RISK_LEVEL_THRESHOLDS = {
  LOW_MAX: 3,
  MEDIUM_MAX: 6,
} as const;

export const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

export const RULE_IDS = {
  DROP_TABLE: 'DROP_TABLE',
  DROP_COLUMN: 'DROP_COLUMN',
  ALTER_COLUMN_TYPE: 'ALTER_COLUMN_TYPE',
  ADD_NOT_NULL_WITHOUT_DEFAULT: 'ADD_NOT_NULL_WITHOUT_DEFAULT',
  LARGE_UPDATE: 'LARGE_UPDATE',
  CREATE_INDEX_NO_CONCURRENT: 'CREATE_INDEX_NO_CONCURRENT',
  MISSING_FK_INDEX: 'MISSING_FK_INDEX',
  TABLE_REWRITE: 'TABLE_REWRITE',
  DANGEROUS_RENAME: 'DANGEROUS_RENAME',
  MULTIPLE_ALTER_TABLE: 'MULTIPLE_ALTER_TABLE',
} as const;

export type RuleId = (typeof RULE_IDS)[keyof typeof RULE_IDS];
