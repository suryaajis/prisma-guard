import { parseMigration } from '@prismaguard/parser';
import type { Rule, RuleFinding } from '@prismaguard/shared';

export function runRule(rule: Rule, sql: string): RuleFinding[] {
  const statements = parseMigration(sql);
  return rule.detect(statements);
}
