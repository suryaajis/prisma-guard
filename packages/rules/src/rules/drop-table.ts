import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getNode, isDrop } from '@prismaguard/parser';

export const dropTableRule: Rule = {
  id: RULE_IDS.DROP_TABLE,
  title: 'DROP TABLE',
  severity: 'critical',
  description: 'Permanently destroys a table and all of its data.',
  recommendation:
    'Archive the table to a shadow table first. Consider renaming the table to *_archived for one release cycle before dropping.',
  scoreImpact: 9,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isDrop(node) || node.keyword !== 'table') continue;

      const tableName = node.name[0]?.table ?? 'unknown';
      findings.push({
        ruleId: this.id,
        title: this.title,
        severity: this.severity,
        description: `Statement drops table "${tableName}". This is irreversible without a backup.`,
        recommendation: this.recommendation,
        scoreImpact: this.scoreImpact,
        location: { statement: statement.raw },
      });
    }

    return findings;
  },
};
