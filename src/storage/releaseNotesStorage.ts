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

export type OtaInstallState = {
  /** True if the just-completed reload was an OTA install we initiated. */
  installed: boolean;
  /**
   * True if the pre-install dialog actually displayed the release notes. When
   * false (e.g. the update was published without the stamped message, so the
   * dialog could only show the version), the post-reload "what's new" prompt
   * must still run so the user sees the baked-in notes instead of nothing.
   */
  notesShown: boolean;
};

/**
 * Set a flag before OTA reload recording whether the install dialog already
 * showed the release notes. The new bundle reads this to decide whether to
 * skip (notes shown) or still run (notes not shown) the "what's new" prompt.
 */
export const setOtaUpdateInstalled = async (
  notesShown: boolean
): Promise<void> => {
  await EncryptedStorage.setItem(
    OTA_UPDATE_INSTALLED_KEY,
    notesShown ? "notes" : "plain"
  );
};

/** Check and clear the OTA flag. */
export const consumeOtaUpdateInstalled = async (): Promise<OtaInstallState> => {
  const value = await EncryptedStorage.getItem(OTA_UPDATE_INSTALLED_KEY);
  if (value === "notes" || value === "plain" || value === "true") {
    await EncryptedStorage.removeItem(OTA_UPDATE_INSTALLED_KEY);
    // Legacy "true" (written by older bundles) meant "notes were shown, skip".
    return { installed: true, notesShown: value !== "plain" };
  }
  return { installed: false, notesShown: false };
};
