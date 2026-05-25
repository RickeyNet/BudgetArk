import { RELEASE_NOTES, type ReleaseNote } from "../data/releaseNotes";

const SEMVER_REGEX = /\b\d+\.\d+\.\d+\b/;

export type ResolvedUpdateInfo = {
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
  appVersion?: string;
  releaseNote?: ReleaseNote;
};

export const normalizeVersionString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const directMatch = trimmed.match(/^v?(\d+\.\d+\.\d+)$/i);
  if (directMatch) return directMatch[1];
  const semverMatch = trimmed.match(SEMVER_REGEX);
  return semverMatch?.[0];
};

export const findReleaseNoteForVersion = (version?: string): ReleaseNote | undefined => {
  const normalizedVersion = normalizeVersionString(version);
  return normalizedVersion
    ? RELEASE_NOTES.find((release) => release.version === normalizedVersion)
    : undefined;
};

/**
 * Parse a release note carried in the OTA manifest's `message` field as JSON.
 * The publish helper (scripts/eas-update-message.mjs) emits this payload so
 * the running (older) bundle can describe the *incoming* update without
 * needing the new version baked into its own RELEASE_NOTES list.
 *
 * Returns undefined for plain-string messages so the legacy lookup path
 * still runs.
 */
export const tryParseReleaseNoteFromMessage = (
  message: string
): ReleaseNote | undefined => {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as ReleaseNote).version === "string" &&
      typeof (parsed as ReleaseNote).title === "string" &&
      typeof (parsed as ReleaseNote).releasedAt === "string" &&
      Array.isArray((parsed as ReleaseNote).highlights) &&
      (parsed as ReleaseNote).highlights.every((h) => typeof h === "string")
    ) {
      return parsed as ReleaseNote;
    }
  } catch {
    // not JSON - treat as plain-string message
  }
  return undefined;
};

const compareVersions = (a: string, b: string): number => {
  const aParts = a.split(".").map((part) => Number(part) || 0);
  const bParts = b.split(".").map((part) => Number(part) || 0);
  const length = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < length; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const inferReleaseFromCurrentVersion = (currentVersion: string): ReleaseNote | undefined =>
  RELEASE_NOTES.find((release) => compareVersions(release.version, currentVersion) > 0);

export const resolveUpdateInfo = (
  manifest: unknown,
  currentVersion: string
): ResolvedUpdateInfo => {
  const data =
    manifest != null && typeof manifest === "object"
      ? (manifest as Record<string, unknown>)
      : {};
  const metadata =
    data.metadata != null && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};
  const extras =
    data.extra != null && typeof data.extra === "object"
      ? (data.extra as Record<string, unknown>)
      : {};
  const eas =
    extras.eas != null && typeof extras.eas === "object"
      ? (extras.eas as Record<string, unknown>)
      : {};
  const expoClient =
    extras.expoClient != null && typeof extras.expoClient === "object"
      ? (extras.expoClient as Record<string, unknown>)
      : {};

  const messageCandidates = [
    metadata.message,
    metadata.updateMessage,
    eas.message,
    data.description,
    data.message,
  ];
  const rawMessage =
    messageCandidates.find((candidate) => typeof candidate === "string") ||
    "A new update is ready to install.";

  // Notes shipped in the manifest message override the baked-in lookup so a
  // user running an older bundle can still see highlights for the incoming
  // version (the entry doesn't yet exist in their local RELEASE_NOTES).
  const inlineReleaseNote = tryParseReleaseNoteFromMessage(rawMessage);

  const versionCandidates = [
    inlineReleaseNote?.version,
    metadata.appVersion,
    metadata.version,
    eas.appVersion,
    data.version,
    extras.version,
    rawMessage,
    expoClient.version,
  ];
  const appVersion = versionCandidates
    .map((candidate) => normalizeVersionString(candidate))
    .find((candidate) => !!candidate);

  const releaseNote =
    inlineReleaseNote ||
    findReleaseNoteForVersion(appVersion) ||
    findReleaseNoteForVersion(rawMessage) ||
    inferReleaseFromCurrentVersion(currentVersion);

  const displayMessage = inlineReleaseNote
    ? inlineReleaseNote.title
    : releaseNote?.title || rawMessage;

  return {
    message: displayMessage,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    runtimeVersion:
      typeof data.runtimeVersion === "string" ? data.runtimeVersion : undefined,
    appVersion: releaseNote?.version || appVersion,
    releaseNote,
  };
};
