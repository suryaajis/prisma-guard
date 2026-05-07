import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FileNotFoundError, type MigrationFile } from '@prismaguard/shared';

/**
 * Load migration files from either:
 *   - a single .sql file path
 *   - a Prisma migrations directory (each subdirectory contains migration.sql)
 *   - any directory: recursively collect *.sql files
 */
export async function loadMigrations(targetPath: string): Promise<MigrationFile[]> {
  const stat = await safeStat(targetPath);
  if (!stat) throw new FileNotFoundError(targetPath);

  if (stat.isFile()) {
    if (!targetPath.endsWith('.sql')) {
      throw new FileNotFoundError(`Not a .sql file: ${targetPath}`);
    }
    return [await readMigrationFile(targetPath)];
  }

  return collectFromDirectory(targetPath);
}

async function collectFromDirectory(dir: string): Promise<MigrationFile[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: MigrationFile[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFromDirectory(full);
      files.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      files.push(await readMigrationFile(full));
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

async function readMigrationFile(filePath: string): Promise<MigrationFile> {
  const contents = await fs.readFile(filePath, 'utf8');
  const name = inferMigrationName(filePath);
  return { path: filePath, name, contents };
}

function inferMigrationName(filePath: string): string {
  const parsed = path.parse(filePath);
  if (parsed.name === 'migration') {
    const parent = path.basename(parsed.dir);
    return parent || parsed.name;
  }
  return parsed.name;
}

async function safeStat(targetPath: string) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}
