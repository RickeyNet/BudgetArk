import {
  planTokenAction,
  REFRESH_TOKEN_LIFETIME_MS,
  REFRESH_SAFETY_MARGIN_MS,
} from "../schwabTokenState";

const NOW = Date.parse("2026-07-01T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

const freshSnapshot = {
  accessToken: "AT",
  accessTokenExpiresAt: iso(NOW + 20 * 60_000),
  refreshToken: "RT",
  refreshTokenIssuedAt: iso(NOW - 1 * 3600_000),
};

describe("planTokenAction", () => {
  it("uses a live access token", () => {
    expect(planTokenAction(freshSnapshot, NOW)).toBe("use-access");
  });

  it("refreshes when the access token is expired but the refresh token lives", () => {
    expect(
      planTokenAction(
        { ...freshSnapshot, accessTokenExpiresAt: iso(NOW - 1000) },
        NOW,
      ),
    ).toBe("refresh");
  });

  it("refreshes when there is no access token at all", () => {
    expect(
      planTokenAction(
        {
          refreshToken: "RT",
          refreshTokenIssuedAt: iso(NOW - 3600_000),
        },
        NOW,
      ),
    ).toBe("refresh");
  });

  it("still refreshes at day ~6.9", () => {
    const issued = NOW - (REFRESH_TOKEN_LIFETIME_MS - REFRESH_SAFETY_MARGIN_MS - 60_000);
    expect(
      planTokenAction(
        {
          refreshToken: "RT",
          refreshTokenIssuedAt: iso(issued),
        },
        NOW,
      ),
    ).toBe("refresh");
  });

  it("requires re-auth inside the safety margin before the 7-day death", () => {
    const issued = NOW - (REFRESH_TOKEN_LIFETIME_MS - REFRESH_SAFETY_MARGIN_MS);
    expect(
      planTokenAction(
        { refreshToken: "RT", refreshTokenIssuedAt: iso(issued) },
        NOW,
      ),
    ).toBe("reauth-required");
  });

  it("requires re-auth past the full 7-day lifetime", () => {
    const issued = NOW - REFRESH_TOKEN_LIFETIME_MS - 1;
    expect(
      planTokenAction(
        {
          accessToken: "AT",
          accessTokenExpiresAt: iso(NOW + 60_000),
          refreshToken: "RT",
          refreshTokenIssuedAt: iso(issued),
        },
        NOW,
      ),
    ).toBe("reauth-required");
  });

  it("requires re-auth with no refresh token or a garbage issue time", () => {
    expect(planTokenAction({}, NOW)).toBe("reauth-required");
    expect(
      planTokenAction(
        { refreshToken: "RT", refreshTokenIssuedAt: "garbage" },
        NOW,
      ),
    ).toBe("reauth-required");
    expect(planTokenAction({ refreshToken: "RT" }, NOW)).toBe(
      "reauth-required",
    );
  });
});
