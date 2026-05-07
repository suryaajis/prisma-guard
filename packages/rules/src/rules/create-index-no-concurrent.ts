import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getNode, isCreateIndex } from '@prismaguard/parser';

/**
 * MySQL: CREATE INDEX is online for InnoDB by default in 5.6+, but still
 * holds a metadata lock that can stall on long-running transactions.
 * PostgreSQL: CREATE INDEX takes an ACCESS EXCLUSIVE lock unless CONCURRENTLY
 * is used. We flag both dialects since "no concurrent flag" is the universal
 * safety rule, with stronger wording for Postgres.
 */
export const createIndexNoConcurrentRule: Rule = {
  id: RULE_IDS.CREATE_INDEX_NO_CONCURRENT,
  title: 'CREATE INDEX BLOCKING',
  severity: 'medium',
  description:
    'Index creation can block writes on the target table for the duration of the build on large tables.',
  recommendation:
    'On PostgreSQL, use CREATE INDEX CONCURRENTLY. On MySQL, run during low-traffic windows and verify InnoDB online DDL applies (no FULLTEXT/SPATIAL).',
  scoreImpact: 4,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];

    for (const statement of statements) {
      const node = getNode(statement);
      if (!isCreateIndex(node)) continue;

      const raw = statement.raw.toUpperCase();
      const isConcurrent = raw.includes('CONCURRENTLY');
      if (isConcurrent) continue;

      const table = node.table?.table ?? node.on?.table ?? 'unknown';
      const indexName = node.index ?? 'unnamed_index';
      findings.push({
        ruleId: this.id,
        title: this.title,
        severity: this.severity,
        description: `Index "${indexName}" on "${table}" is created without CONCURRENTLY. May block writes on large tables.`,
        recommendation: this.recommendation,
        scoreImpact: this.scoreImpact,
        location: { statement: statement.raw },
      });
    }

    return findings;
  },
};
