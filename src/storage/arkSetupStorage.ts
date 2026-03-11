import AsyncStorage from "@react-native-async-storage/async-storage";

const OPEN_ARK_SETUP_ONCE_KEY = "@budgetark_open_ark_setup_once" as const;

export const requestArkSetupPrompt = async (): Promise<void> => {
  await AsyncStorage.setItem(OPEN_ARK_SETUP_ONCE_KEY, "1");
};

export const consumeArkSetupPromptRequest = async (): Promise<boolean> => {
  const raw = await AsyncStorage.getItem(OPEN_ARK_SETUP_ONCE_KEY);
  if (raw !== "1") return false;
  await AsyncStorage.removeItem(OPEN_ARK_SETUP_ONCE_KEY);
  return true;
};
