import { errorDefinitions, type ErrorCode } from './codes';

type AppErrorOptions = {
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Array<{ field: string; message: string }>;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const definition = errorDefinitions[code];
    super(options.message ?? definition.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = definition.status;
    this.fieldErrors = options.fieldErrors;
  }
}
