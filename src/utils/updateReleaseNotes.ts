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

  const versionCandidates = [
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
    findReleaseNoteForVersion(appVersion) ||
    findReleaseNoteForVersion(rawMessage) ||
    inferReleaseFromCurrentVersion(currentVersion);

  return {
    message: releaseNote?.title || rawMessage,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    runtimeVersion:
      typeof data.runtimeVersion === "string" ? data.runtimeVersion : undefined,
    appVersion: releaseNote?.version || appVersion,
    releaseNote,
  };
};
