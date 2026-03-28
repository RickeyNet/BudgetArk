import * as EncryptedStorage from "./encryptedStorage";
import { UpdatePreferences } from "../types";

const UPDATE_PREFERENCES_KEY = "@budgetark_update_preferences" as const;

const DEFAULT_UPDATE_PREFERENCES: UpdatePreferences = {
  manualUpdateMode: false,
};

export const getUpdatePreferences = async (): Promise<UpdatePreferences> => {
  const raw = await EncryptedStorage.getItem(UPDATE_PREFERENCES_KEY);
  if (!raw) {
    return DEFAULT_UPDATE_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UpdatePreferences>;
    return {
      ...DEFAULT_UPDATE_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_UPDATE_PREFERENCES;
  }
};

export const saveUpdatePreferences = async (
  value: UpdatePreferences
): Promise<UpdatePreferences> => {
  await EncryptedStorage.setItem(UPDATE_PREFERENCES_KEY, JSON.stringify(value));
  return value;
};

export const setManualUpdateMode = async (
  manualUpdateMode: boolean
): Promise<UpdatePreferences> => {
  const current = await getUpdatePreferences();
  const updated: UpdatePreferences = {
    ...current,
    manualUpdateMode,
  };
  return saveUpdatePreferences(updated);
};

export const setLastUpdateCheckAt = async (
  lastCheckedAt: string
): Promise<UpdatePreferences> => {
  const current = await getUpdatePreferences();
  const updated: UpdatePreferences = {
    ...current,
    lastCheckedAt,
  };
  return saveUpdatePreferences(updated);
};
