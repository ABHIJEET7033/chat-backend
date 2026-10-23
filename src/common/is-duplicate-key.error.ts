import { QueryFailedError } from 'typeorm';

export function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const withCode = error as QueryFailedError & { code?: string };
  const driverError = error.driverError as { code?: string; errno?: number };
  return (
    withCode.code === 'ER_DUP_ENTRY' ||
    driverError.code === 'ER_DUP_ENTRY' ||
    driverError.errno === 1062
  );
}
