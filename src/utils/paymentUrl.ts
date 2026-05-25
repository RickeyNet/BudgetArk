import { PAYMENT_URL_MAX_LENGTH } from "../types";
import { sanitizeTextInput } from "./sanitize";

/**
 * Returns a safe-to-store payment URL or `null` if the input is empty/invalid.
 *
 * Rules:
 *   - Trim + strip control chars (matches the rest of the app's input policy).
 *   - Reject any scheme that isn't http(s). Blocks `javascript:`, `data:`,
 *     `file:`, custom-app deep links, etc. - all of which would either crash
 *     the browser open or surface a phishing/exfil vector if a malicious peer
 *     pushed a record via sync.
 *   - Missing scheme: auto-prepend `https://` so users can paste
 *     "electric.example.com/pay" without ceremony.
 *   - Length capped at `PAYMENT_URL_MAX_LENGTH`.
 *
 * Does NOT try to verify the URL is reachable - that's an offline-first app's
 * problem, not ours.
 */
export const normalizePaymentUrl = (raw: string | undefined | null): string | null => {
  if (raw == null) return null;
  const cleaned = sanitizeTextInput(raw).trim();
  if (cleaned.length === 0) return null;

  // Strip surrounding angle brackets / quotes some users paste from emails.
  const stripped = cleaned.replace(/^[<"'`]+|[>"'`]+$/g, "").trim();
  if (stripped.length === 0) return null;

  let candidate = stripped;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") return null;

  // Reject hosts that are empty or trivially invalid (e.g. "https://" alone).
  if (!parsed.hostname || parsed.hostname.length < 3 || !parsed.hostname.includes(".")) {
    return null;
  }

  const out = parsed.toString();
  if (out.length > PAYMENT_URL_MAX_LENGTH) return null;
  return out;
};

/**
 * Lenient validity check used by validators on the sync / spreadsheet path:
 * accepts anything `normalizePaymentUrl` would accept, but also accepts the
 * empty string (which the modal writes when the user clears the field).
 */
export const isAcceptablePaymentUrl = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value !== "string") return false;
  if (value.length === 0) return true;
  if (value.length > PAYMENT_URL_MAX_LENGTH) return false;
  return normalizePaymentUrl(value) != null;
};
