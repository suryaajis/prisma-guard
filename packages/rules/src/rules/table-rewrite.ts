import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import {
  getAlterTableName,
  getNode,
  isAlterTable,
  type AlterTableNode,
} from '@prismaguard/parser';

/**
 * Detects ALTER TABLE operations that frequently force a full table copy:
 *   - changing primary key
 *   - changing character set / collation
 *   - changing storage engine
 *
 * Type changes (MODIFY/CHANGE COLUMN) are intentionally excluded here —
 * ALTER_COLUMN_TYPE already covers them. Duplicating here inflates the score.
 */
export const tableRewriteRule: Rule = {
  id: RULE_IDS.TABLE_REWRITE,
  title: 'POTENTIAL TABLE REWRITE',
  severity: 'high',
  description:
    'This operation can force a full table copy, holding locks proportional to table size and consuming 2x disk.',
  recommendation:
    'Use pt-online-schema-change, gh-ost, or a shadow-table dual-write strategy for large tables.',
  scoreImpact: 5,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      const isAlter = isAlterTable(node);
      // Some MySQL ALTER syntaxes (CONVERT TO CHARACTER SET, ENGINE=, etc.)
      // are not parsed by node-sql-parser. Fall back to raw classification
      // when the type heuristic identified the statement as an ALTER.
      const looksAlter = isAlter || statement.type === 'alter';
      if (!looksAlter) continue;

      const table = isAlter ? (getAlterTableName(node) ?? 'unknown') : extractTableFromRaw(statement.raw);
      const reasons = collectRewriteReasons(statement.raw, isAlter ? node : null);

      if (reasons.length > 0) {
        findings.push({
          ruleId: this.id,
          title: this.title,
          severity: this.severity,
          description: `ALTER on "${table}" may rewrite the table: ${reasons.join('; ')}.`,
          recommendation: this.recommendation,
          scoreImpact: this.scoreImpact,
          location: { statement: statement.raw },
        });
      }
    }

    return findings;
  },
};

function extractTableFromRaw(raw: string): string {
  const match = /ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?/i.exec(raw);
  return match?.[1] ?? 'unknown';
}

function collectRewriteReasons(raw: string, node: AlterTableNode | null): string[] {
  const reasons: string[] = [];
  const upper = raw.toUpperCase();

  if (upper.includes('CONVERT TO CHARACTER SET') || upper.includes('CHARACTER SET')) {
    reasons.push('character set conversion');
  }
  if (upper.includes('ENGINE=') || upper.includes('ENGINE =')) {
    reasons.push('storage engine change');
  }

  if (!node) return reasons;

  for (const expr of node.expr) {
    const action = expr.action;
    const resource = expr.resource;
    const constraintType = expr.definition?.constraint_type;

    if (action === 'drop' && resource === 'primary key') {
      reasons.push('primary key removal');
    }
    if (action === 'add' && (resource === 'primary key' || constraintType === 'PRIMARY KEY')) {
      reasons.push('primary key addition');
    }
  }

  return reasons;
}
