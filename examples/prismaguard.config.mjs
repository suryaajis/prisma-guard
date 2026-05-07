// PrismaGuard configuration.
// Drop this file at your project root to override defaults.
// Supported filenames: prismaguard.config.mjs, prismaguard.config.js, prismaguard.config.json.
// (prismaguard.config.ts requires a TS loader — see docs.)

export default {
  // Risk level that causes a non-zero exit. One of: LOW, MEDIUM, HIGH.
  failOn: 'HIGH',

  // Rule IDs to skip. See README "Rules" for the full list.
  ignoredRules: [
    // 'MULTIPLE_ALTER_TABLE',
  ],

  // SQL dialect of your migrations. 'mysql' (default) or 'postgresql'.
  dialect: 'mysql',
};
