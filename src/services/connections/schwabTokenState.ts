/**
 * BudgetArk - Bank Connections: Schwab Token Lifecycle
 * File: src/services/connections/schwabTokenState.ts
 *
 * Pure state machine deciding what to do with a Schwab token set before a
 * fetch. Schwab access tokens live ~30 minutes; refresh tokens die a hard
 * death 7 DAYS after issue and there is no way to renew one without a full
 * browser re-login - the "reauth-required" outcome must surface prominently
 * in the UI or syncing silently stops. Node-testable; the clock is injected.
 */

export const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 3600_000;

/**
 * Stop trusting a refresh token this long before its hard 7-day death so an
 * in-flight sync doesn't race the deadline.
 */
export const REFRESH_SAFETY_MARGIN_MS = 10 * 60_000;

export interface SchwabTokenSnapshot {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenIssuedAt?: string;
}

export type TokenAction = "use-access" | "refresh" | "reauth-required";

/**
 * Decide the next step for a token set at `nowMs`:
 *  - no refresh token, unparseable issue time, or past (7 days - margin)
 *    since issue -> "reauth-required" (full browser login needed);
 *  - live access token -> "use-access";
 *  - otherwise -> "refresh".
 */
export const planTokenAction = (
  snapshot: SchwabTokenSnapshot,
  nowMs: number,
): TokenAction => {
  const issuedAt = snapshot.refreshTokenIssuedAt
    ? Date.parse(snapshot.refreshTokenIssuedAt)
    : NaN;
  if (
    !snapshot.refreshToken ||
    !Number.isFinite(issuedAt) ||
    nowMs - issuedAt >= REFRESH_TOKEN_LIFETIME_MS - REFRESH_SAFETY_MARGIN_MS
  ) {
    return "reauth-required";
  }

  const expiresAt = snapshot.accessTokenExpiresAt
    ? Date.parse(snapshot.accessTokenExpiresAt)
    : NaN;
  if (snapshot.accessToken && Number.isFinite(expiresAt) && nowMs < expiresAt) {
    return "use-access";
  }
  return "refresh";
};
