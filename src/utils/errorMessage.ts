/**
 * BudgetArk - Error -> user-facing message
 * File: src/utils/errorMessage.ts
 *
 * One place that turns a thrown value into a sentence a modal can show
 * inline. Storage errors in this codebase already carry plain-language
 * messages (EncryptionUnavailableError, DecryptionError, the validators'
 * "Import rejected: ..." strings), so those pass through; anything else -
 * non-Error throws, empty messages - falls back to the caller's
 * context-specific sentence. Never returns an empty string and never
 * includes a stack, so the result is safe to render as-is.
 */

export const describeError = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  return fallback;
};
