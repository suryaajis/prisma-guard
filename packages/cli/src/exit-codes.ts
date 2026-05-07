export const ExitCode = {
  Success: 0,
  RiskExceeded: 1,
  ToolError: 2,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];
