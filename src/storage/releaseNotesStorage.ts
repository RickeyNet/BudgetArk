import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SEEN_RELEASE_NOTES_VERSION_KEY =
  "@budgetark_last_seen_release_notes_version" as const;

export const getLastSeenReleaseNotesVersion = async (): Promise<string | null> => {
  return AsyncStorage.getItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY);
};

export const setLastSeenReleaseNotesVersion = async (
  version: string
): Promise<void> => {
  await AsyncStorage.setItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY, version);
};
