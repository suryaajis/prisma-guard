import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getAlterTableName, getNode, isAlterTable } from '@prismaguard/parser';

export const addNotNullWithoutDefaultRule: Rule = {
  id: RULE_IDS.ADD_NOT_NULL_WITHOUT_DEFAULT,
  title: 'ADD NOT NULL COLUMN WITHOUT DEFAULT',
  severity: 'high',
  description:
    'Adding a NOT NULL column without a default value will fail on existing rows and may take a long lock during validation.',
  recommendation:
    'Add the column as nullable first, backfill in batches, then add the NOT NULL constraint in a separate migration.',
  scoreImpact: 6,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isAlterTable(node)) continue;

      const table = getAlterTableName(node);
      for (const expr of node.expr) {
        if (expr.action !== 'add' || expr.resource !== 'column') continue;

        // node-sql-parser places `nullable` and `default_val` on the expr
        // itself for ADD COLUMN, not inside `definition`.
        const nullable = expr.nullable;
        const isNotNull =
          nullable !== undefined &&
          nullable !== null &&
          (nullable.type === 'not null' || nullable.value === 'not null');
        const hasDefault = expr.default_val !== undefined && expr.default_val !== null;

        if (isNotNull && !hasDefault) {
          const column = expr.column?.column ?? expr.definition?.column?.column ?? 'unknown';
          findings.push({
            ruleId: this.id,
            title: this.title,
            severity: this.severity,
            description: `NOT NULL column "${column}" added to "${table ?? 'unknown'}" with no default value. Existing rows will violate the constraint.`,
            recommendation: this.recommendation,
            scoreImpact: this.scoreImpact,
            location: { statement: statement.raw },
          });
        }
      }
    }

    return findings;
  },
};
