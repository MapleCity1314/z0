export interface DomainErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class DomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(shape: DomainErrorShape) {
    super(shape.message);
    this.name = "DomainError";
    this.code = shape.code;
    this.details = shape.details;
  }
}

export type DomainResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: DomainErrorShape;
    };

export function ok<T>(data: T): DomainResult<T> {
  return { ok: true, data };
}

export function fail(error: DomainError | DomainErrorShape): DomainResult<never> {
  const shape =
    error instanceof DomainError
      ? { code: error.code, message: error.message, details: error.details }
      : error;

  return { ok: false, error: shape };
}

export function assertPresent<T>(
  value: T | null | undefined,
  error: DomainErrorShape,
): T {
  if (value == null) {
    throw new DomainError(error);
  }

  return value;
}
