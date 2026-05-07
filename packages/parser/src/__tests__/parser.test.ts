import { describe, expect, it } from 'vitest';
import { parseMigration } from '../parser.js';
import { getNode, isAlterTable, isCreateIndex, isDrop } from '../ast-helpers.js';

describe('parseMigration', () => {
  it('parses ALTER TABLE ADD COLUMN', () => {
    const [stmt] = parseMigration('ALTER TABLE `User` ADD COLUMN `name` VARCHAR(64) NULL;');
    expect(stmt).toBeDefined();
    const node = getNode(stmt!);
    expect(isAlterTable(node)).toBe(true);
  });

  it('parses DROP TABLE', () => {
    const [stmt] = parseMigration('DROP TABLE `Old`;');
    const node = getNode(stmt!);
    expect(isDrop(node)).toBe(true);
  });

  it('parses CREATE INDEX', () => {
    const [stmt] = parseMigration('CREATE INDEX `User_name_idx` ON `User` (`name`);');
    const node = getNode(stmt!);
    expect(isCreateIndex(node)).toBe(true);
  });

  it('returns null AST for unparseable but tracks raw + type heuristically', () => {
    const [stmt] = parseMigration('ALTER TABLE `User` ADD CONSTRAINT `fk` FOREIGN KEY (`x`) REFERENCES `Y`(`id`);');
    expect(stmt).toBeDefined();
    expect(stmt!.raw).toContain('FOREIGN KEY');
  });
});
