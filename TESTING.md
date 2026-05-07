# Testing Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 9

Install dependencies if you haven't already:

```bash
pnpm install
```

---

## Running All Tests

Build all packages first (tests depend on compiled output), then run:

```bash
pnpm build
pnpm test
```

This runs every test suite across all packages via Turborepo in dependency order.

---

## Running Tests for a Single Package

Navigate into a package and run vitest directly:

```bash
# Parser
cd packages/parser
pnpm test

# Rules engine
cd packages/rules
pnpm test

# Scoring engine
cd packages/scoring
pnpm test

# Formatter
cd packages/formatter
pnpm test

# Analyzer (integration)
cd packages/analyzer
pnpm test

# CLI
cd packages/cli
pnpm test
```

Or run a specific package from the root without changing directory:

```bash
pnpm --filter @prismaguard/rules test
pnpm --filter @prismaguard/parser test
pnpm --filter @prismaguard/analyzer test
pnpm --filter prismaguard test
```

---

## Watch Mode (during development)

```bash
cd packages/rules
npx vitest
```

Vitest will watch for file changes and re-run affected tests automatically.

---

## What Each Package Tests

### `packages/parser` — SQL parsing

Tests that raw SQL strings are correctly split into statements and parsed into an AST.

```
packages/parser/src/__tests__/split.test.ts   — statement splitter
packages/parser/src/__tests__/parser.test.ts  — AST output shapes
```

### `packages/rules` — Rule engine

Each of the 10 rules has a "should fire" case and a "should not fire" case.

| Rule ID | What it tests |
|---|---|
| `DROP_TABLE` | Detects `DROP TABLE` |
| `DROP_COLUMN` | Detects `ALTER TABLE … DROP COLUMN` |
| `ALTER_COLUMN_TYPE` | Detects `MODIFY COLUMN` |
| `ADD_NOT_NULL_WITHOUT_DEFAULT` | Detects `ADD COLUMN … NOT NULL` with no `DEFAULT` |
| `LARGE_UPDATE` | Detects `UPDATE` with no `WHERE` clause |
| `CREATE_INDEX_NO_CONCURRENT` | Detects blocking `CREATE INDEX` (non-concurrent) |
| `MISSING_FK_INDEX` | Detects FK constraint with no backing index |
| `TABLE_REWRITE` | Detects `CONVERT TO CHARACTER SET` and similar ops |
| `DANGEROUS_RENAME` | Detects `RENAME COLUMN` |
| `MULTIPLE_ALTER_TABLE` | Detects 3+ `ALTER TABLE` on the same table |

### `packages/scoring` — Score calculation

Tests that raw findings are aggregated into a numeric score (0–10) and mapped to the correct risk level:

- 0–3 → `LOW`
- 4–6 → `MEDIUM`
- 7–10 → `HIGH`

### `packages/formatter` — Output formatting

Tests both terminal (colored) output and `--json` mode to ensure the report structure is correct.

### `packages/analyzer` — Integration tests

Runs the full pipeline (parse → rules → score) against real SQL fixture files:

| Fixture | Expected outcome |
|---|---|
| `safe-migration.sql` | Score ≤ 3, level `LOW` |
| `medium-risk-migration.sql` | Level `MEDIUM` or `HIGH`, includes `LARGE_UPDATE` and `MULTIPLE_ALTER_TABLE` |
| `dangerous-migration.sql` | Level `HIGH`, includes `DROP_TABLE`, `DROP_COLUMN`, `ALTER_COLUMN_TYPE`, `ADD_NOT_NULL_WITHOUT_DEFAULT` |

Also tests that `ignoredRules` in config correctly suppresses findings.

### `packages/cli` — CLI command tests

Tests the `runAnalyze` function (the core of the `analyze` command) directly:

| Scenario | Expected exit code |
|---|---|
| Safe migration | `0` |
| Dangerous migration | `1` |
| Path does not exist | `2` |
| `--json` flag | `0` + valid JSON on stdout |

---

## Test Fixtures

All SQL fixtures live in:

```
packages/analyzer/src/__tests__/fixtures/
  safe-migration.sql          ← ADD COLUMN with NULL + DEFAULT
  medium-risk-migration.sql   ← bulk UPDATE + multiple ALTERs
  dangerous-migration.sql     ← DROP TABLE, DROP COLUMN, MODIFY, NOT NULL
```

To test a new rule, add a fixture here and reference it from `packages/analyzer/src/__tests__/analyze.test.ts`, or write a focused unit test directly in `packages/rules/src/__tests__/rules.test.ts` using inline SQL strings.

---

## Type Checking

Type checking is separate from tests and does not require a prior build of the package under test:

```bash
# All packages
pnpm typecheck

# Single package
pnpm --filter @prismaguard/rules typecheck
```

---

## Manual End-to-End Test

After building, run the CLI directly against the included fixtures:

```bash
pnpm build

# Should exit 0 (LOW risk)
node packages/cli/dist/bin.js analyze packages/analyzer/src/__tests__/fixtures/safe-migration.sql

# Should exit 1 (HIGH risk)
node packages/cli/dist/bin.js analyze packages/analyzer/src/__tests__/fixtures/dangerous-migration.sql

# JSON output
node packages/cli/dist/bin.js analyze packages/analyzer/src/__tests__/fixtures/dangerous-migration.sql --json

# Analyze a whole directory
node packages/cli/dist/bin.js analyze packages/analyzer/src/__tests__/fixtures/
```

Check exit codes on Windows:

```powershell
$LASTEXITCODE   # 0, 1, or 2
```

---

## CI Integration

Add this to your CI pipeline (GitHub Actions example):

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm build

- name: Test
  run: pnpm test

- name: Analyze migrations
  run: node packages/cli/dist/bin.js analyze prisma/migrations --fail-on-high-risk
```

The `--fail-on-high-risk` flag makes the CLI exit `1` only for `HIGH` risk migrations, so `MEDIUM` results pass CI.
