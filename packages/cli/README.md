# PrismaGuard

> Static analysis for Prisma SQL migrations. Catch dangerous database
> operations before they reach production.

PrismaGuard reads the SQL files Prisma generates in `prisma/migrations/`,
parses them into an AST, and runs a set of rules that encode database
reliability knowledge. It is **ESLint for migrations**: the goal is to make
risky operations visible in PRs and CI before they ever hit a production
table.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PrismaGuard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration: 202605071200_add_booking_status
File:      prisma/migrations/202605071200_add_booking_status/migration.sql
Score:     8.2 / 10
Level:     HIGH

Detected Risks:

1. DROP COLUMN   CRITICAL
   Statement drops column "legacyEmail" from table "User". Data in this column will be lost.
   → Deploy code that no longer references the column first. Wait one release cycle, then drop.

2. ALTER COLUMN TYPE   HIGH
   Statement alters column "status" on table "Bookings" to type ENUM. This type change likely
   requires a full table rewrite and write lock.
   → Use a shadow column strategy: add a new column, dual-write, backfill in batches, swap.

Recommendations:
  • Deploy code that no longer references the column first. Wait one release cycle, then drop.
  • Use a shadow column strategy: add a new column, dual-write, backfill in batches, swap.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✖ HIGH risk migration. Review carefully before deployment.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Why

Most database incidents are not bugs. They are migrations that worked in
staging and locked production for 90 seconds. PrismaGuard codifies the
"don't do that" lessons that every team learns the hard way:

- destructive column / table drops with no shadow archive
- adding `NOT NULL` to a column with no default
- `ALTER COLUMN TYPE` on a table large enough to rewrite under a write lock
- bare `UPDATE` statements that scan the whole table
- foreign keys without backing indexes
- non-concurrent index creation
- column / table renames during rolling deploys

## Install

```bash
# one-shot
npx prismaguards analyze prisma/migrations

# project dev dependency
pnpm add -D prismaguards
npm install --save-dev prismaguards
```

Requires Node.js **20+**.

## Usage

```bash
# analyze a whole migrations directory
prismaguard analyze prisma/migrations

# analyze a single file
prismaguard analyze prisma/migrations/202605071200_add_booking_status/migration.sql

# generate an HTML report file
prismaguard analyze prisma/migrations --report report.html

# JSON output for CI tooling
prismaguard analyze prisma/migrations --json

# silence all output, rely on exit code
prismaguard analyze prisma/migrations --silent --fail-on-high-risk

# customize the failure threshold
prismaguard analyze prisma/migrations --fail-on MEDIUM
```

### Exit codes

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| 0    | Migration risk is below the configured threshold     |
| 1    | Migration risk is at or above the configured threshold |
| 2    | Tool error (file not found, parse failure, etc.)     |

### Flags

| Flag                   | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `--json`               | Emit a JSON report instead of formatted terminal output                       |
| `--report <path>`      | Write a self-contained HTML report to the given file path                     |
| `--silent`             | Suppress output. Pair with `--fail-on-high-risk` for exit-code-only CI checks |
| `--fail-on-high-risk`  | Exit 1 if any migration is HIGH risk (default)                                |
| `--fail-on <level>`    | Set the threshold explicitly: `LOW`, `MEDIUM`, `HIGH`                         |
| `-c, --config <path>`  | Path to a config file                                                         |
| `--verbose`            | Include the offending raw SQL statement in the output                         |

## Configuration

Drop a `prismaguard.config.mjs`, `prismaguard.config.js`, or
`prismaguard.config.json` in your project root.

```js
// prismaguard.config.mjs
export default {
  failOn: 'HIGH',
  ignoredRules: ['MULTIPLE_ALTER_TABLE'],
  dialect: 'mysql', // or 'postgresql'
};
```

| Field          | Type                       | Default  | Description                                  |
| -------------- | -------------------------- | -------- | -------------------------------------------- |
| `failOn`       | `'LOW' \| 'MEDIUM' \| 'HIGH'` | `'HIGH'` | Threshold above which CLI exits 1            |
| `ignoredRules` | `string[]`                 | `[]`     | Rule IDs to disable                          |
| `dialect`      | `'mysql' \| 'postgresql'`  | `'mysql'`| SQL dialect to parse migrations as           |

## Rules

| ID                              | Severity        | What it catches                                                                        |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `DROP_TABLE`                    | critical        | `DROP TABLE` — irreversible data loss                                                  |
| `DROP_COLUMN`                   | critical        | `ALTER TABLE … DROP COLUMN` — column data loss                                         |
| `ALTER_COLUMN_TYPE`             | high / medium   | `ALTER … MODIFY/CHANGE COLUMN` — high for ENUM/TEXT/DECIMAL (full rebuild); medium for VARCHAR/INT/BOOLEAN (often online in MySQL InnoDB) |
| `ADD_NOT_NULL_WITHOUT_DEFAULT`  | high            | New `NOT NULL` column without a `DEFAULT` — fails on existing rows                     |
| `LARGE_UPDATE`                  | medium          | `UPDATE` without a `WHERE` clause — full-table rewrite, replication lag                |
| `CREATE_INDEX_NO_CONCURRENT`    | medium          | Index creation that isn't `CONCURRENTLY` (Postgres) or InnoDB online (MySQL)           |
| `MISSING_FK_INDEX`              | low             | Foreign key added without an explicit backing index. MySQL auto-creates one; PostgreSQL does not |
| `TABLE_REWRITE`                 | high            | Operations that force a full table copy: charset conversion, engine change, PK change  |
| `DANGEROUS_RENAME`              | high            | Column or table rename — breaks running app code mid-deploy                            |
| `MULTIPLE_ALTER_TABLE`          | medium          | 5+ `ALTER TABLE` on the same table in a single migration                               |

## Architecture

```
apps/
  docs/                    # docs site (placeholder)
packages/
  cli/                     # commander.js CLI — the user-facing entry point
  analyzer/                # orchestration: load → parse → rules → score
  parser/                  # node-sql-parser wrapper + AST helpers
  rules/                   # 10 individual rule implementations
  scoring/                 # risk score + level computation
  formatter/               # terminal + JSON output renderers
  shared/                  # types, zod schemas, errors, constants
```

Dependency direction (no cycles):

```
cli  →  analyzer  →  parser   →  shared
                  →  rules    →  parser, shared
                  →  scoring  →  shared
        formatter →  shared
        shared
```

The `analyzer` package is the public, framework-agnostic API surface. The
CLI is a thin shell. The same `analyzeMigrations()` function powers the CLI
today and will power the GitHub App, SaaS, and IDE integrations later.

## CI integration

### GitHub Actions

```yaml
name: PrismaGuard
on: [pull_request]
jobs:
  prismaguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx prismaguards analyze prisma/migrations --fail-on HIGH
```

### GitLab CI

```yaml
prismaguard:
  image: node:20-alpine
  script:
    - npx prismaguards analyze prisma/migrations --fail-on HIGH
```

## Adding a new rule

1. Create `packages/rules/src/rules/my-rule.ts` implementing the `Rule`
   interface from `@prismaguard/shared`.
2. Register it in `packages/rules/src/registry.ts`.
3. Add a constant for the ID in `packages/shared/src/constants.ts`.
4. Add a fixture and at least two tests (one positive, one negative).

```ts
import { type Rule, type RuleFinding, type SqlStatement } from '@prismaguard/shared';
import { getNode, isAlterTable } from '@prismaguard/parser';

export const myRule: Rule = {
  id: 'MY_RULE',
  title: 'My Rule',
  severity: 'medium',
  description: '…',
  recommendation: '…',
  scoreImpact: 3,
  detect(statements: SqlStatement[]): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const s of statements) {
      const node = getNode(s);
      if (!isAlterTable(node)) continue;
      // …your logic
    }
    return findings;
  },
};
```

## Roadmap

- **Phase 2**: PostgreSQL dialect parity, `--fix` autofixes for safe rewrites
- **Phase 3**: GitHub App with PR comment annotations, AI-enhanced rollback strategies (optional)
- **Phase 4**: VSCode extension, hosted SaaS dashboard with team-level historical risk trends

## License

MIT
