import * as EncryptedStorage from "./encryptedStorage";

const LAST_SEEN_RELEASE_NOTES_VERSION_KEY =
  "@budgetark_last_seen_release_notes_version" as const;

export const getLastSeenReleaseNotesVersion = async (): Promise<string | null> => {
  return EncryptedStorage.getItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY);
};

export const setLastSeenReleaseNotesVersion = async (
  version: string
): Promise<void> => {
  await EncryptedStorage.setItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY, version);
};
