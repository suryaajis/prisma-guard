import { RULE_IDS, type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import {
  getAlterTableName,
  getNode,
  isAlterTable,
  isCreateIndex,
  isCreateTable,
} from '@prismaguard/parser';

interface FkAddition {
  table: string;
  column: string;
  statement: string;
}

/**
 * Detect foreign keys added without a backing index. MySQL InnoDB auto-creates
 * an index for FKs if one is missing, but the auto-created index is often
 * suboptimal (single-column when a composite would serve queries better).
 * PostgreSQL never auto-creates an FK index — this is a frequent perf footgun.
 */
export const missingFkIndexRule: Rule = {
  id: RULE_IDS.MISSING_FK_INDEX,
  title: 'MISSING FK INDEX',
  severity: 'medium',
  description:
    'Foreign key constraints without a backing index cause slow joins and full-table scans on cascading updates/deletes.',
  recommendation:
    'Create an index on the FK column in the same migration. Consider composite indexes if the FK is queried alongside other columns.',
  scoreImpact: 3,

  detect(statements: SqlStatement[]): RuleFinding[] {
    const fkAdditions = collectFkAdditions(statements);
    if (fkAdditions.length === 0) return [];

    const indexedColumns = collectIndexedColumns(statements);
    const findings: RuleFinding[] = [];

    for (const fk of fkAdditions) {
      const key = `${fk.table.toLowerCase()}.${fk.column.toLowerCase()}`;
      if (indexedColumns.has(key)) continue;

      findings.push({
        ruleId: this.id,
        title: this.title,
        severity: this.severity,
        description: `Foreign key on "${fk.table}.${fk.column}" has no backing index in this migration.`,
        recommendation: this.recommendation,
        scoreImpact: this.scoreImpact,
        location: { statement: fk.statement },
      });
    }

    return findings;
  },
};

function collectFkAdditions(statements: SqlStatement[]): FkAddition[] {
  const additions: FkAddition[] = [];

  for (const statement of statements) {
    const node = getNode(statement);

    if (isAlterTable(node)) {
      const table = getAlterTableName(node) ?? 'unknown';
      for (const expr of node.expr) {
        if (expr.action !== 'add' || expr.resource !== 'constraint') continue;
        // node-sql-parser puts ALTER TABLE ADD CONSTRAINT FK details in
        // `create_definitions` (singular object).
        const cd = expr.create_definitions;
        if (!cd || cd.constraint_type !== 'FOREIGN KEY') continue;
        const column = cd.definition?.[0]?.column;
        if (column) additions.push({ table, column, statement: statement.raw });
      }
    }

    if (isCreateTable(node)) {
      const table = node.table[0]?.table ?? 'unknown';
      for (const def of node.create_definitions ?? []) {
        if (def.resource !== 'constraint' || def.constraint_type !== 'FOREIGN KEY') continue;
        const fkDef = def.definition;
        const column = Array.isArray(fkDef) ? fkDef[0]?.column : undefined;
        if (column) additions.push({ table, column, statement: statement.raw });
      }
    }
  }

  return additions;
}

function collectIndexedColumns(statements: SqlStatement[]): Set<string> {
  const indexed = new Set<string>();

  for (const statement of statements) {
    const node = getNode(statement);

    if (isCreateIndex(node)) {
      const table = node.table?.table ?? node.on?.table;
      if (!table) continue;
      for (const col of node.index_columns ?? []) {
        // `column` is a plain string identifier on this AST node.
        const colName = col.column;
        if (colName) indexed.add(key(table, colName));
      }
    }

    if (isCreateTable(node)) {
      const table = node.table[0]?.table;
      if (!table) continue;
      for (const def of node.create_definitions ?? []) {
        const isIndex = def.resource === 'index' || def.keyword === 'index';
        const isPk = def.resource === 'constraint' && def.constraint_type === 'PRIMARY KEY';
        if (!isIndex && !isPk) continue;
        const cols = def.definition;
        if (Array.isArray(cols)) {
          for (const c of cols) {
            if (c.column) indexed.add(key(table, c.column));
          }
        }
      }
    }

    if (isAlterTable(node)) {
      const table = node.table[0]?.table ?? '';
      if (!table) continue;
      for (const expr of node.expr) {
        if (expr.action !== 'add') continue;
        if (expr.resource === 'index') {
          const cd = expr.create_definitions;
          const cols = cd?.definition;
          if (Array.isArray(cols)) {
            for (const c of cols) {
              if (c.column) indexed.add(key(table, c.column));
            }
          }
        }
      }
    }
  }

  return indexed;
}

function key(table: string, column: string): string {
  return `${table.toLowerCase()}.${column.toLowerCase()}`;
}
