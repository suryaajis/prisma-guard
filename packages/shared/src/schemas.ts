import { z } from 'zod';

export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const riskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const sqlDialectSchema = z.enum(['mysql', 'postgresql']);

export const ruleFindingSchema = z.object({
  ruleId: z.string(),
  title: z.string(),
  severity: severitySchema,
  description: z.string(),
  recommendation: z.string(),
  scoreImpact: z.number().min(0).max(10),
  location: z
    .object({
      line: z.number().optional(),
      statement: z.string().optional(),
    })
    .optional(),
});

export const migrationRiskScoreSchema = z.object({
  score: z.number().min(0).max(10),
  level: riskLevelSchema,
  findings: z.array(ruleFindingSchema),
});

export const prismaGuardConfigSchema = z.object({
  failOn: riskLevelSchema.optional(),
  ignoredRules: z.array(z.string()).optional(),
  dialect: sqlDialectSchema.optional(),
});

export type RuleFindingInput = z.infer<typeof ruleFindingSchema>;
export type MigrationRiskScoreInput = z.infer<typeof migrationRiskScoreSchema>;
export type PrismaGuardConfigInput = z.infer<typeof prismaGuardConfigSchema>;
