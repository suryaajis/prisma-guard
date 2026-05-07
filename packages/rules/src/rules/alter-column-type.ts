import { RULE_IDS, type Rule, type RuleFinding, type Severity, type SqlStatement } from '@prismaguard/shared';
import { getAlterTableName, getNode, isAlterTable } from '@prismaguard/parser';

// These types always (or almost always) require a full table copy in MySQL InnoDB.
const HIGH_RISK_TYPES = new Set([
  'enum',
  'text',
  'mediumtext',
  'longtext',
  'tinytext',
  'blob',
  'mediumblob',
  'longblob',
  'tinyblob',
  'decimal',
  'numeric',
]);

// These types are typically handled by MySQL InnoDB as in-place / online DDL
// (e.g. VARCHAR length extension, INT nullability changes). Still worth flagging
// but at lower severity to avoid overwhelming the report.
const MEDIUM_RISK_TYPES = new Set([
  'varchar',
  'char',
  'int',
  'integer',
  'bigint',
  'smallint',
  'tinyint',
  'mediumint',
  'float',
  'double',
  'boolean',
  'bool',
  'datetime',
  'timestamp',
  'date',
  'time',
  'year',
  'json',
]);

function classifyType(dataType: string): { severity: Severity; scoreImpact: number } {
  const t = dataType.toLowerCase();
  if (HIGH_RISK_TYPES.has(t)) return { severity: 'high', scoreImpact: 6 };
  if (MEDIUM_RISK_TYPES.has(t)) return { severity: 'medium', scoreImpact: 3 };
  // Unknown type — treat conservatively
  return { severity: 'high', scoreImpact: 6 };
}

export const alterColumnTypeRule: Rule = {
  id: RULE_IDS.ALTER_COLUMN_TYPE,
  title: 'ALTER COLUMN TYPE',
  severity: 'high',
  description:
    'Changing a column type can trigger a full table rewrite and acquire long-held write locks.',
  recommendation:
    'Use a shadow column strategy: add a new column, dual-write, backfill in batches, swap, then drop the old column.',
  scoreImpact: 6,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isAlterTable(node)) continue;

      const table = getAlterTableName(node);
      for (const expr of node.expr) {
        const isModify =
          (expr.action === 'modify' || expr.action === 'change' || expr.action === 'alter') &&
          expr.resource === 'column';
        if (!isModify) continue;

        const column = expr.column?.column ?? expr.definition?.column?.column ?? 'unknown';
        const newType = expr.definition?.dataType ?? 'unknown';
        const { severity, scoreImpact } = classifyType(newType);

        const riskNote =
          severity === 'high'
            ? 'This type change likely requires a full table rewrite and write lock.'
            : 'MySQL InnoDB may handle this online, but verify with your version and table size.';

        findings.push({
          ruleId: this.id,
          title: this.title,
          severity,
          description: `Statement alters column "${column}" on table "${table ?? 'unknown'}" to type ${newType}. ${riskNote}`,
          recommendation: this.recommendation,
          scoreImpact,
          location: { statement: statement.raw },
        });
      }
    }

    return findings;
  },
};
