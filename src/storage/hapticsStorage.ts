import * as EncryptedStorage from "./encryptedStorage";

const HAPTICS_KEY = "@budgetark_haptics_enabled" as const;

/**
 * Default = on. The stored value is the raw "true" / "false" string;
 * any unset / unparseable state defaults to enabled.
 */
export const getHapticsEnabled = async (): Promise<boolean> => {
  const raw = await EncryptedStorage.getItem(HAPTICS_KEY);
  if (raw === null) return true;
  return raw !== "false";
};

export const setHapticsEnabled = async (enabled: boolean): Promise<boolean> => {
  await EncryptedStorage.setItem(HAPTICS_KEY, String(enabled));
  return enabled;
};
