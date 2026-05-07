import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getNode, isUpdate } from '@prismaguard/parser';

export const largeUpdateRule: Rule = {
  id: RULE_IDS.LARGE_UPDATE,
  title: 'UPDATE WITHOUT WHERE',
  severity: 'medium',
  description:
    'A bare UPDATE statement rewrites every row in the table, holding row locks and blowing up replication lag.',
  recommendation:
    'Add a WHERE clause to scope the update. For backfills, batch by primary key range and sleep between batches.',
  scoreImpact: 5,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isUpdate(node)) continue;

      const where = node.where;
      const hasWhere = where !== null && where !== undefined;
      const table = node.table[0]?.table ?? 'unknown';

      if (!hasWhere) {
        findings.push({
          ruleId: this.id,
          title: this.title,
          severity: this.severity,
          description: `UPDATE on "${table}" has no WHERE clause. Every row will be rewritten.`,
          recommendation: this.recommendation,
          scoreImpact: this.scoreImpact,
          location: { statement: statement.raw },
        });
      }
    }

    return findings;
  },
};
