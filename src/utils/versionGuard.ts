/**
 * BudgetArk — Version Guard
 * File: src/utils/versionGuard.ts
 *
 * Compares semver-style version strings to prevent downgrade attacks
 * via OTA updates. An update is rejected if its runtimeVersion is
 * lower than the currently running runtimeVersion.
 */

/**
 * Parses a version string like "1.0.5" into numeric parts.
 * Non-numeric or missing segments default to 0.
 */
const parseVersion = (version: string): number[] =>
  version.split(".").map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });

/**
 * Compares two semver-style version strings.
 * Returns:
 *  -1 if a < b  (a is older)
 *   0 if a === b
 *   1 if a > b  (a is newer)
 */
export const compareVersions = (a: string, b: string): -1 | 0 | 1 => {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const segA = partsA[i] ?? 0;
    const segB = partsB[i] ?? 0;
    if (segA < segB) return -1;
    if (segA > segB) return 1;
  }

  return 0;
};

/**
 * Returns true if the incoming update's runtimeVersion is safe to install
 * (i.e. it is not a downgrade from the current runtimeVersion).
 *
 * - If either version is missing/empty, the check passes (fail-open so
 *   updates still work when metadata is unavailable).
 */
export const isUpdateSafe = (
  currentRuntimeVersion: string | undefined,
  incomingRuntimeVersion: string | undefined
): boolean => {
  if (!currentRuntimeVersion || !incomingRuntimeVersion) return true;
  return compareVersions(incomingRuntimeVersion, currentRuntimeVersion) >= 0;
};
