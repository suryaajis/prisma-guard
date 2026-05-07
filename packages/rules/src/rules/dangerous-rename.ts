import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getAlterTableName, getNode, isAlterTable, isRename } from '@prismaguard/parser';

export const dangerousRenameRule: Rule = {
  id: RULE_IDS.DANGEROUS_RENAME,
  title: 'DANGEROUS RENAME',
  severity: 'high',
  description:
    'Renaming a column or table breaks running app instances that still reference the old name during the rolling deploy window.',
  recommendation:
    'Use an expand/contract migration: add the new name, dual-write, deploy app code, then drop the old name in a follow-up migration.',
  scoreImpact: 5,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);

      if (isAlterTable(node)) {
        const table = getAlterTableName(node) ?? 'unknown';
        for (const expr of node.expr) {
          if (expr.action === 'rename' && expr.resource === 'column') {
            // node-sql-parser stores the new name in `column` (the renamed-to
            // identifier) and the original name in `old_column`.
            const from = expr.old_column?.column ?? 'unknown';
            const to = expr.new_column?.column ?? expr.column?.column ?? 'unknown';
            findings.push({
              ruleId: this.id,
              title: this.title,
              severity: this.severity,
              description: `Renames column "${from}" → "${to}" on table "${table}". Live app code with the old name will break.`,
              recommendation: this.recommendation,
              scoreImpact: this.scoreImpact,
              location: { statement: statement.raw },
            });
          }
          if (expr.action === 'rename' && expr.resource === 'table') {
            const to = expr.table ?? 'unknown';
            findings.push({
              ruleId: this.id,
              title: this.title,
              severity: this.severity,
              description: `Renames table "${table}" → "${to}". Live app code with the old name will break.`,
              recommendation: this.recommendation,
              scoreImpact: this.scoreImpact,
              location: { statement: statement.raw },
            });
          }
        }
      }

      if (isRename(node)) {
        const pair = node.table[0];
        const from = pair?.[0]?.table ?? 'unknown';
        const to = pair?.[1]?.table ?? 'unknown';
        findings.push({
          ruleId: this.id,
          title: this.title,
          severity: this.severity,
          description: `Renames table "${from}" → "${to}". Live app code with the old name will break.`,
          recommendation: this.recommendation,
          scoreImpact: this.scoreImpact,
          location: { statement: statement.raw },
        });
      }
    }

    return findings;
  },
};
