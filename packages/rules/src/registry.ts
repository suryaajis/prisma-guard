import type { Rule } from '@prismaguard/shared';
import { dropTableRule } from './rules/drop-table.js';
import { dropColumnRule } from './rules/drop-column.js';
import { alterColumnTypeRule } from './rules/alter-column-type.js';
import { addNotNullWithoutDefaultRule } from './rules/add-not-null-without-default.js';
import { largeUpdateRule } from './rules/large-update.js';
import { createIndexNoConcurrentRule } from './rules/create-index-no-concurrent.js';
import { missingFkIndexRule } from './rules/missing-fk-index.js';
import { tableRewriteRule } from './rules/table-rewrite.js';
import { dangerousRenameRule } from './rules/dangerous-rename.js';
import { multipleAlterTableRule } from './rules/multiple-alter-table.js';

export const allRules: readonly Rule[] = Object.freeze([
  dropTableRule,
  dropColumnRule,
  alterColumnTypeRule,
  addNotNullWithoutDefaultRule,
  largeUpdateRule,
  createIndexNoConcurrentRule,
  missingFkIndexRule,
  tableRewriteRule,
  dangerousRenameRule,
  multipleAlterTableRule,
]);

export function getRule(id: string): Rule | undefined {
  return allRules.find((r) => r.id === id);
}

export function selectRules(options: { ignored?: readonly string[] } = {}): Rule[] {
  const ignored = new Set(options.ignored ?? []);
  return allRules.filter((rule) => !ignored.has(rule.id));
}
