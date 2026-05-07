import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getAlterTableName, getNode, isAlterTable } from '@prismaguard/parser';

export const dropColumnRule: Rule = {
  id: RULE_IDS.DROP_COLUMN,
  title: 'DROP COLUMN',
  severity: 'critical',
  description: 'Removes a column and permanently loses its data.',
  recommendation:
    'Deploy code that no longer references the column first. Wait one release cycle, then drop. Consider a shadow table archive.',
  scoreImpact: 8,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isAlterTable(node)) continue;

      const table = getAlterTableName(node);
      for (const expr of node.expr) {
        if (expr.action === 'drop' && expr.resource === 'column') {
          const column = expr.column?.column ?? 'unknown';
          findings.push({
            ruleId: this.id,
            title: this.title,
            severity: this.severity,
            description: `Statement drops column "${column}" from table "${table ?? 'unknown'}". Data in this column will be lost.`,
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
