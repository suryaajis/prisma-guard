// node-sql-parser ships as CommonJS. Under pure Node ESM, named imports fail
// at runtime even though TypeScript+Vitest accept them via interop. Use the
// default-import form so dist/*.js works when the published CLI runs.
import sqlParser from 'node-sql-parser';
import { ParseError, type SqlDialect, type SqlStatement } from '@prismaguard/shared';
import { splitSqlStatements } from './split.js';

const { Parser } = sqlParser;

const DIALECT_MAP: Record<SqlDialect, string> = {
  mysql: 'MySQL',
  postgresql: 'Postgresql',
};

export interface ParseOptions {
  dialect?: SqlDialect;
}

/**
 * Parse a SQL migration file into structured statements with AST metadata.
 *
 * Strategy:
 * 1. Pre-split the file into statements (Prisma migrations are usually a
 *    sequence of independent DDL statements).
 * 2. Parse each statement individually with node-sql-parser.
 * 3. If a statement fails to parse, fall back to a regex-classified raw
 *    statement so rules that match on type strings still work, but the AST
 *    field is null. Rules using AST detection skip these gracefully.
 */
export function parseMigration(sql: string, options: ParseOptions = {}): SqlStatement[] {
  const dialect = options.dialect ?? 'mysql';
  const parser = new Parser();
  const rawStatements = splitSqlStatements(sql);
  const result: SqlStatement[] = [];

  rawStatements.forEach((raw, index) => {
    const ast = tryParse(parser, raw, dialect);
    const type = inferStatementType(raw, ast);
    result.push({ raw, ast, type, index });
  });

  return result;
}

function tryParse(parser: InstanceType<typeof Parser>, sql: string, dialect: SqlDialect): unknown {
  try {
    const database = DIALECT_MAP[dialect];
    const ast = parser.astify(sql, { database });
    return ast;
  } catch {
    return null;
  }
}

function inferStatementType(raw: string, ast: unknown): string {
  if (ast && typeof ast === 'object') {
    const node = Array.isArray(ast) ? ast[0] : (ast as { type?: string });
    if (node && typeof node === 'object' && 'type' in node && typeof node.type === 'string') {
      return node.type.toLowerCase();
    }
  }
  const upper = raw.trim().toUpperCase();
  if (upper.startsWith('CREATE TABLE')) return 'create';
  if (upper.startsWith('DROP TABLE')) return 'drop';
  if (upper.startsWith('ALTER TABLE')) return 'alter';
  if (upper.startsWith('CREATE INDEX') || upper.startsWith('CREATE UNIQUE INDEX')) return 'create_index';
  if (upper.startsWith('DROP INDEX')) return 'drop_index';
  if (upper.startsWith('UPDATE')) return 'update';
  if (upper.startsWith('DELETE')) return 'delete';
  if (upper.startsWith('INSERT')) return 'insert';
  if (upper.startsWith('RENAME TABLE')) return 'rename';
  return 'unknown';
}

export function ensureParsed(statement: SqlStatement): asserts statement is SqlStatement & {
  ast: NonNullable<unknown>;
} {
  if (statement.ast === null || statement.ast === undefined) {
    throw new ParseError(`Statement could not be parsed: ${statement.raw.slice(0, 80)}`);
  }
}
