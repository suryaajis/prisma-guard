import type { SqlStatement } from '@prismaguard/shared';

/**
 * node-sql-parser produces AST nodes whose shapes vary by statement type.
 * The helpers here narrow common shapes safely without leaking `any` into
 * downstream rule code.
 */

export interface AlterTableExpr {
  action: string;
  resource: string;
  keyword?: string;
  /** ADD / MODIFY / CHANGE / RENAME COLUMN — the column reference (or new name on RENAME). */
  column?: { column?: string };
  /** RENAME COLUMN — the original column name. */
  old_column?: { column?: string };
  /** Used by some dialects/versions for the rename target. */
  new_column?: { column?: string };
  /** Type definition for ADD / MODIFY / CHANGE COLUMN. */
  definition?: {
    column?: { column?: string };
    dataType?: string;
    constraint_type?: string;
    reference?: unknown;
  };
  /**
   * NOT NULL / NULL flag — this lives on the expr itself (NOT inside
   * `definition`) for ADD/MODIFY column actions in node-sql-parser.
   */
  nullable?: { type?: string; value?: string } | null;
  /** DEFAULT clause — also at expr level. */
  default_val?: unknown;
  /** ADD CONSTRAINT (FK) details live here in node-sql-parser. */
  create_definitions?: {
    constraint?: string;
    constraint_type?: string;
    keyword?: string;
    resource?: string;
    definition?: Array<{ column?: string }>;
    reference_definition?: unknown;
  };
  /** RENAME TABLE target name. */
  table?: string;
}

export interface AlterTableNode {
  type: 'alter';
  table: Array<{ table: string; db?: string }>;
  expr: AlterTableExpr[];
}

export interface DropNode {
  type: 'drop';
  keyword: 'table' | 'index' | string;
  name: Array<{ table?: string; index?: string }>;
}

export interface CreateIndexNode {
  type: 'create';
  keyword: 'index';
  index_type?: string | null;
  index?: string;
  table?: { table: string } | null;
  on?: { table: string } | null;
  /**
   * Each entry's `column` is a plain string identifier in node-sql-parser's
   * MySQL output for CREATE INDEX, even though older docs show `{ value }`.
   */
  index_columns?: Array<{ column: string; type?: string }>;
}

export interface CreateTableNode {
  type: 'create';
  keyword: 'table';
  table: Array<{ table: string }>;
  create_definitions?: Array<{
    column?: { column: string };
    definition?: { dataType?: string } | Array<{ column?: string }>;
    constraint?: string;
    constraint_type?: string;
    reference?: unknown;
    resource?: string;
    keyword?: string;
    index?: string | null;
  }>;
}

export interface UpdateNode {
  type: 'update';
  table: Array<{ table: string }>;
  where: unknown;
}

export interface RenameNode {
  type: 'rename';
  table: Array<Array<{ table: string }>>;
}

export function getNode(statement: SqlStatement): unknown {
  if (!statement.ast) return null;
  return Array.isArray(statement.ast) ? statement.ast[0] : statement.ast;
}

export function isAlterTable(node: unknown): node is AlterTableNode {
  return isObject(node) && node.type === 'alter' && Array.isArray(node.expr);
}

export function isDrop(node: unknown): node is DropNode {
  return isObject(node) && node.type === 'drop';
}

export function isCreateIndex(node: unknown): node is CreateIndexNode {
  return (
    isObject(node) &&
    node.type === 'create' &&
    'keyword' in node &&
    (node as { keyword?: string }).keyword === 'index'
  );
}

export function isCreateTable(node: unknown): node is CreateTableNode {
  return (
    isObject(node) &&
    node.type === 'create' &&
    'keyword' in node &&
    (node as { keyword?: string }).keyword === 'table'
  );
}

export function isUpdate(node: unknown): node is UpdateNode {
  return isObject(node) && node.type === 'update';
}

export function isRename(node: unknown): node is RenameNode {
  return isObject(node) && node.type === 'rename';
}

export function getAlterTableName(node: AlterTableNode): string | undefined {
  return node.table[0]?.table;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
