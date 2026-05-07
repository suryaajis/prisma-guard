import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getAlterTableName, getNode, isAlterTable } from '@prismaguard/parser';

// Prisma commonly emits 2–4 ALTER TABLE statements per migration for a single
// schema change. Fire only when the count is high enough to represent a real
// merge opportunity rather than normal Prisma codegen output.
const THRESHOLD = 4;

export const multipleAlterTableRule: Rule = {
  id: RULE_IDS.MULTIPLE_ALTER_TABLE,
  title: 'MULTIPLE ALTER TABLE',
  severity: 'medium',
  description:
    'Multiple ALTER TABLE statements on the same table compound lock time and disk usage. They should be merged into a single ALTER.',
  recommendation:
    'Combine alterations into one ALTER TABLE so the engine only rewrites/locks the table once.',
  scoreImpact: 3,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const counts = new Map<string, { count: number; firstStatement: string }>();

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isAlterTable(node)) continue;

      const table = getAlterTableName(node);
      if (!table) continue;

      const key = table.toLowerCase();
      const entry = counts.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(key, { count: 1, firstStatement: statement.raw });
      }
    }

    const findings: RuleFinding[] = [];
    for (const [table, info] of counts) {
      if (info.count >= THRESHOLD + 1) {
        findings.push({
          ruleId: this.id,
          title: this.title,
          severity: this.severity,
          description: `Table "${table}" is altered ${info.count} times in this migration. Merge into one statement.`,
          recommendation: this.recommendation,
          scoreImpact: this.scoreImpact,
          location: { statement: info.firstStatement },
        });
      }
    }

    return findings;
  },
};
