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

/** Longest headline the update / what's-new dialogs show per highlight. */
export const HIGHLIGHT_SUMMARY_MAX = 100;

/**
 * Reduce a release-note highlight to its headline for the update and
 * what's-new dialogs. Highlights are written headline-first ("Refunds are no
 * longer counted as income. When money comes back ..."), so the first
 * sentence is the basics and the rest is detail that belongs on the Release
 * Notes screen. A headline that still runs long is cut at a word boundary.
 *
 * Idempotent, deliberately: scripts/eas-update-message.mjs stamps the OTA
 * message with already-summarized highlights (so bundles that predate this
 * helper show the short form too) and this runs over them again on display.
 * Keep the two implementations in step - releaseNotes.test.ts compares them.
 */
export const summarizeHighlight = (highlight: string): string => {
  const text = highlight.trim().replace(/\s+/g, " ");
  // A sentence ends at . ! ? followed by the start of another sentence (or
  // the end of the text) - so "budgetark.app" and "$1.50" don't split it.
  const sentence = text.match(/^.*?[.!?](?=\s+[A-Z0-9'"(]|$)/)?.[0] ?? text;
  if (sentence.length <= HIGHLIGHT_SUMMARY_MAX) return sentence;
  const cut = sentence.slice(0, HIGHLIGHT_SUMMARY_MAX - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const head = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-]+$/, "");
  return `${head}\u2026`;
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
