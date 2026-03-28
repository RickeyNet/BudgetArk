import * as EncryptedStorage from "./encryptedStorage";

const OPEN_ARK_SETUP_ONCE_KEY = "@budgetark_open_ark_setup_once" as const;

export const requestArkSetupPrompt = async (): Promise<void> => {
  await EncryptedStorage.setItem(OPEN_ARK_SETUP_ONCE_KEY, "1");
};

export const consumeArkSetupPromptRequest = async (): Promise<boolean> => {
  const raw = await EncryptedStorage.getItem(OPEN_ARK_SETUP_ONCE_KEY);
  if (raw !== "1") return false;
  await EncryptedStorage.removeItem(OPEN_ARK_SETUP_ONCE_KEY);
  return true;
};
