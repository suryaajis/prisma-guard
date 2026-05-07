export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SqlStatement {
  raw: string;
  ast: unknown;
  type: string;
  index: number;
}

export interface RuleFinding {
  ruleId: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  scoreImpact: number;
  location?: {
    line?: number;
    statement?: string;
  };
}

export interface Rule {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  scoreImpact: number;
  detect(statements: SqlStatement[]): RuleFinding[];
}

export interface MigrationRiskScore {
  score: number;
  level: RiskLevel;
  findings: RuleFinding[];
}

export interface MigrationFile {
  path: string;
  name: string;
  contents: string;
}

export interface MigrationAnalysis {
  migration: MigrationFile;
  score: MigrationRiskScore;
}

export interface AnalysisReport {
  results: MigrationAnalysis[];
  totalMigrations: number;
  highestLevel: RiskLevel;
}

export type SqlDialect = 'mysql' | 'postgresql';

export interface PrismaGuardConfig {
  failOn?: RiskLevel;
  ignoredRules?: string[];
  dialect?: SqlDialect;
}
