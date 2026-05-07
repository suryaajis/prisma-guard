export { parseMigration, ensureParsed } from './parser.js';
export type { ParseOptions } from './parser.js';
export { splitSqlStatements } from './split.js';
export {
  getNode,
  isAlterTable,
  isDrop,
  isCreateIndex,
  isCreateTable,
  isUpdate,
  isRename,
  getAlterTableName,
} from './ast-helpers.js';
export type {
  AlterTableExpr,
  AlterTableNode,
  DropNode,
  CreateIndexNode,
  CreateTableNode,
  UpdateNode,
  RenameNode,
} from './ast-helpers.js';
