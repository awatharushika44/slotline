const EXCLUSION_VIOLATION = "23P01";

/** Walks the error chain: some libraries wrap the original PostgreSQL error in `cause`. */
export function getPgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (current instanceof Error) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = current.cause;
  }
  return undefined;
}

export function isExclusionViolation(error: unknown): boolean {
  return getPgErrorCode(error) === EXCLUSION_VIOLATION;
}
const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === UNIQUE_VIOLATION;
}