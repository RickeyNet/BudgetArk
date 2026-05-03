import * as EncryptedStorage from "./encryptedStorage";

const COACHMARKS_KEY = "@budgetark_coachmarks" as const;

export const COACHMARK_VERSION = 2;

export type CoachmarkState = {
  seenTabs: string[];
  skippedAll: boolean;
  version: number;
};

const EMPTY: CoachmarkState = {
  seenTabs: [],
  skippedAll: false,
  version: COACHMARK_VERSION,
};

export const getCoachmarkState = async (): Promise<CoachmarkState> => {
  const raw = await EncryptedStorage.getItem(COACHMARKS_KEY);
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as Partial<CoachmarkState>;
    if (parsed.version !== COACHMARK_VERSION) return { ...EMPTY };
    return {
      seenTabs: Array.isArray(parsed.seenTabs) ? parsed.seenTabs.filter((s): s is string => typeof s === "string") : [],
      skippedAll: parsed.skippedAll === true,
      version: COACHMARK_VERSION,
    };
  } catch {
    return { ...EMPTY };
  }
};

export const saveCoachmarkState = async (state: CoachmarkState): Promise<void> => {
  await EncryptedStorage.setItem(COACHMARKS_KEY, JSON.stringify(state));
};

export const resetCoachmarks = async (): Promise<void> => {
  await EncryptedStorage.setItem(COACHMARKS_KEY, JSON.stringify({ ...EMPTY }));
};
