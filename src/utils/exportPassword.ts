/**
 * BudgetArk - Export Password Check
 *
 * An encrypted backup is only as recoverable as the password typed when it
 * was made: there is no server and no reset, so a typo in a masked field
 * produces a file nobody can ever open. This is the pure gate the export
 * dialog runs before encrypting - the password must be long enough AND match
 * a second, independently typed copy. Kept out of the screen so the rule is
 * unit-tested rather than buried in a press handler.
 */

/** Minimum characters for a backup password (matches the user-facing copy). */
export const EXPORT_PASSWORD_MIN_LENGTH = 4;

export type ExportPasswordCheck = "ok" | "tooShort" | "mismatch";

/**
 * Validate the password + confirmation pair from the export dialog.
 *
 * Comparison is deliberately exact - no trimming, no case folding, no Unicode
 * normalization. The password is fed to the KDF byte-for-byte, so anything
 * looser here would call two different keys "the same".
 *
 * Length is checked first so a short password reports "tooShort" even while
 * the confirmation is still empty.
 */
export const checkExportPassword = (
  password: string,
  confirmation: string,
): ExportPasswordCheck => {
  if (password.length < EXPORT_PASSWORD_MIN_LENGTH) return "tooShort";
  if (password !== confirmation) return "mismatch";
  return "ok";
};
