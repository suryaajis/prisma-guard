import { describe, expect, it } from 'vitest';
import { splitSqlStatements } from '../split.js';

describe('splitSqlStatements', () => {
  it('splits on semicolons', () => {
    const out = splitSqlStatements('SELECT 1; SELECT 2;');
    expect(out).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('ignores semicolons inside single quotes', () => {
    const out = splitSqlStatements(`INSERT INTO t VALUES ('a;b'); SELECT 1;`);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("'a;b'");
  });

  it('ignores semicolons inside line comments', () => {
    const out = splitSqlStatements(`-- a; b\nSELECT 1;`);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('SELECT 1');
  });

  it('ignores semicolons inside block comments', () => {
    const out = splitSqlStatements(`/* a;b */ SELECT 1;`);
    expect(out).toHaveLength(1);
  });

  it('handles backtick identifiers', () => {
    const out = splitSqlStatements('CREATE TABLE `t;weird` (id INT);');
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('`t;weird`');
  });
});
