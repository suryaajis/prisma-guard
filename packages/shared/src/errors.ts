export class PrismaGuardError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'PRISMAGUARD_ERROR') {
    super(message);
    this.name = 'PrismaGuardError';
    this.code = code;
  }
}

export class ParseError extends PrismaGuardError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

export class FileNotFoundError extends PrismaGuardError {
  constructor(path: string) {
    super(`File or directory not found: ${path}`, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
  }
}

export class ConfigError extends PrismaGuardError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}
