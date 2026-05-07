import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getAlterTableName, getNode, isAlterTable } from '@prismaguard/parser';

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
        findings.push({
          ruleId: this.id,
          title: this.title,
          severity: this.severity,
          description: `Statement alters column "${column}" on table "${table ?? 'unknown'}" to type ${newType}. May rewrite the table and lock writes.`,
          recommendation: this.recommendation,
          scoreImpact: this.scoreImpact,
          location: { statement: statement.raw },
        });
      }
    }

    return findings;
  },
};
