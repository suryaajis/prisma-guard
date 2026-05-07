import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ConfigError,
  prismaGuardConfigSchema,
  type PrismaGuardConfig,
} from '@prismaguard/shared';

const CONFIG_FILENAMES = [
  'prismaguard.config.ts',
  'prismaguard.config.mjs',
  'prismaguard.config.js',
  'prismaguard.config.json',
];

export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<PrismaGuardConfig | undefined> {
  const candidate = explicitPath ?? (await findConfigFile(cwd));
  if (!candidate) return undefined;

  const raw = await loadConfigFile(candidate);
  const parsed = prismaGuardConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid PrismaGuard config at ${candidate}: ${parsed.error.message}`,
    );
  }
  return stripUndefined(parsed.data);
}

/**
 * `exactOptionalPropertyTypes` requires that an optional field is either
 * present with the right type or absent entirely. Zod's `.optional()` infers
 * `T | undefined`, so we strip explicit `undefined` values before returning.
 */
function stripUndefined(input: Record<string, unknown>): PrismaGuardConfig {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) out[k] = v;
  }
  return out as PrismaGuardConfig;
}

async function findConfigFile(cwd: string): Promise<string | undefined> {
  for (const name of CONFIG_FILENAMES) {
    const full = path.join(cwd, name);
    try {
      await fs.access(full);
      return full;
    } catch {
      continue;
    }
  }
  return undefined;
}

async function loadConfigFile(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath);

  if (ext === '.json') {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  }

  if (ext === '.ts') {
    throw new ConfigError(
      `prismaguard.config.ts requires a TS runtime loader. Use prismaguard.config.mjs or prismaguard.config.json.`,
    );
  }

  const url = pathToFileURL(filePath).href;
  const mod = (await import(url)) as { default?: unknown };
  return mod.default ?? mod;
}
