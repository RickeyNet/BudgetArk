import * as EncryptedStorage from "./encryptedStorage";
import {
  DEFAULT_TRACKING_REMINDER_SETTINGS,
  type ReminderCadenceDays,
  type ReminderHour,
  type TrackingReminderSettings,
} from "../utils/trackingReminderPlanner";

const SETTINGS_KEY = "@budgetark_tracking_reminder_settings" as const;
/** Set once the one-time offer (onboarding step / Budget-tab card) is answered. */
const OFFER_KEY = "@budgetark_tracking_reminder_offer" as const;

const VALID_CADENCES: readonly ReminderCadenceDays[] = [1, 3, 7];
const VALID_HOURS: readonly ReminderHour[] = [9, 13, 19];

const sanitize = (raw: unknown): TrackingReminderSettings => {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_TRACKING_REMINDER_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    enabled: obj.enabled === true,
    checkInsEnabled: obj.checkInsEnabled !== false,
    cadenceDays: VALID_CADENCES.includes(obj.cadenceDays as ReminderCadenceDays)
      ? (obj.cadenceDays as ReminderCadenceDays)
      : DEFAULT_TRACKING_REMINDER_SETTINGS.cadenceDays,
    monthStartEnabled: obj.monthStartEnabled !== false,
    hour: VALID_HOURS.includes(obj.hour as ReminderHour)
      ? (obj.hour as ReminderHour)
      : DEFAULT_TRACKING_REMINDER_SETTINGS.hour,
  };
};

/**
 * Default = disabled (opt-in). Per-device preference - deliberately NOT
 * synced to a paired partner: which phone nudges whom is a device choice,
 * and the partner may not even have notifications permission granted.
 */
export const getTrackingReminderSettings =
  async (): Promise<TrackingReminderSettings> => {
    try {
      const raw = await EncryptedStorage.getItem(SETTINGS_KEY);
      if (raw === null) return { ...DEFAULT_TRACKING_REMINDER_SETTINGS };
      return sanitize(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_TRACKING_REMINDER_SETTINGS };
    }
  };

export const setTrackingReminderSettings = async (
  settings: TrackingReminderSettings
): Promise<TrackingReminderSettings> => {
  const clean = sanitize(settings);
  await EncryptedStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
};

/**
 * Whether a settings record exists at all - i.e. the user has been through
 * the Profile sheet (it persists on every toggle). The one-time offer
 * treats that as "already decided" (utils/trackingReminderOffer).
 */
export const hasStoredTrackingReminderSettings = async (): Promise<boolean> =>
  (await EncryptedStorage.getItem(SETTINGS_KEY)) !== null;

export const getTrackingReminderOfferDismissed = async (): Promise<boolean> =>
  (await EncryptedStorage.getItem(OFFER_KEY)) !== null;

/** Any answer to the offer - on, off, or "no thanks" - retires it for good. */
export const markTrackingReminderOfferDismissed = async (): Promise<void> => {
  await EncryptedStorage.setItem(
    OFFER_KEY,
    JSON.stringify({ decidedAt: new Date().toISOString() })
  );
};
