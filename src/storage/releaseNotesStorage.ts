import * as EncryptedStorage from "./encryptedStorage";

const LAST_SEEN_RELEASE_NOTES_VERSION_KEY =
  "@budgetark_last_seen_release_notes_version" as const;

const OTA_UPDATE_INSTALLED_KEY =
  "@budgetark_ota_update_installed" as const;

export const getLastSeenReleaseNotesVersion = async (): Promise<string | null> => {
  return EncryptedStorage.getItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY);
};

export const setLastSeenReleaseNotesVersion = async (
  version: string
): Promise<void> => {
  await EncryptedStorage.setItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY, version);
};

/** Set a flag before OTA reload so the new bundle skips the release notes prompt. */
export const setOtaUpdateInstalled = async (): Promise<void> => {
  await EncryptedStorage.setItem(OTA_UPDATE_INSTALLED_KEY, "true");
};

/** Check and clear the OTA flag. Returns true if an OTA update was just applied. */
export const consumeOtaUpdateInstalled = async (): Promise<boolean> => {
  const value = await EncryptedStorage.getItem(OTA_UPDATE_INSTALLED_KEY);
  if (value === "true") {
    await EncryptedStorage.removeItem(OTA_UPDATE_INSTALLED_KEY);
    return true;
  }
  return false;
};
