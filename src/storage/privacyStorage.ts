import * as EncryptedStorage from "./encryptedStorage";

const PRIVACY_KEY = "@budgetark_privacy_mode" as const;

export const getPrivacyMode = async (): Promise<boolean> => {
  const raw = await EncryptedStorage.getItem(PRIVACY_KEY);
  return raw === "true";
};

export const setPrivacyMode = async (enabled: boolean): Promise<boolean> => {
  await EncryptedStorage.setItem(PRIVACY_KEY, String(enabled));
  return enabled;
};
