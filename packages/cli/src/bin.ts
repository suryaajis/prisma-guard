#!/usr/bin/env node
import { createProgram } from './index.js';

async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
