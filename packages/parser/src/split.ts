/**
 * Split a raw SQL string into individual statements while respecting
 * single-quote, double-quote, backtick, and line/block comments.
 *
 * node-sql-parser can parse multi-statement input, but Prisma migrations
 * frequently contain MySQL-specific syntax that benefits from per-statement
 * parsing so a single bad statement does not poison the whole file.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < len) {
    const ch = sql[i] ?? '';
    const next = sql[i + 1] ?? '';

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        current += ch;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        current += ch;
        i++;
        continue;
      }
    }

    if (!inDouble && !inBacktick && ch === "'" && sql[i - 1] !== '\\') {
      inSingle = !inSingle;
      current += ch;
      i++;
      continue;
    }
    if (!inSingle && !inBacktick && ch === '"' && sql[i - 1] !== '\\') {
      inDouble = !inDouble;
      current += ch;
      i++;
      continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      inBacktick = !inBacktick;
      current += ch;
      i++;
      continue;
    }

    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);

  return statements;
}
