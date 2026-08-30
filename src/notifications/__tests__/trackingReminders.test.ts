/**
 * BudgetArk - tracking-reminder scheduler tests
 * File: src/notifications/__tests__/trackingReminders.test.ts
 *
 * Security rule 11 regression guard: notifications may never carry amounts,
 * account/category names, or balances on the lock screen. Every notification
 * this module schedules must have content pulled verbatim from the vetted
 * generic message pools (CHECK_IN_MESSAGES / MONTH_START_MESSAGES in
 * trackingReminderPlanner.ts, already unit-tested there) - this test proves
 * the SCHEDULER wiring never lets real entry data leak into what actually
 * reaches Notifications.scheduleNotificationAsync, using a fixture with a
 * deliberately distinctive category/description marker. Also covers
 * cancel-then-reschedule idempotency (only this feature's own scheduled
 * requests are touched), the permission-request branches, and that
 * scheduling failures are swallowed rather than thrown (best-effort, must
 * never break app boot/background).
 *
 * expo-notifications, react-native, and the storage getters are mocked; the
 * real (unmocked) trackingReminderPlanner supplies the actual plan. The
 * mock factories below are fully self-contained (every jest.fn() is created
 * INSIDE the factory, never an outer const referenced by it): the module
 * under test calls `Notifications.setNotificationHandler(...)` at its own
 * top level, so the mocked module gets exercised the instant it's required -
 * before any later top-level const in this file would have run.
 */
import {
  CHECK_IN_MESSAGES,
  MONTH_START_MESSAGES,
  DEFAULT_TRACKING_REMINDER_SETTINGS,
} from "../../utils/trackingReminderPlanner";
import { makeBudgetEntry } from "../../__tests__/fixtures";
import {
  TRACKING_REMINDER_CHANNEL_ID,
  TRACKING_REMINDER_DATA_TYPE,
  cancelAllTrackingReminders,
  ensureTrackingReminderPermissions,
  rescheduleTrackingReminders,
} from "../trackingReminders";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => [] as unknown[]),
  cancelScheduledNotificationAsync: jest.fn(async (_id: string) => {}),
  scheduleNotificationAsync: jest.fn(async (_request: unknown) => "scheduled-id"),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

jest.mock("react-native", () => ({ Platform: { OS: "android" } }));

jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntries: jest.fn(async () => [] as unknown[]),
}));

jest.mock("../../storage/trackingReminderSettingsStorage", () => ({
  getTrackingReminderSettings: jest.fn(async () => ({
    ...DEFAULT_TRACKING_REMINDER_SETTINGS,
  })),
}));

type ScheduledContent = { title: string; body: string; data: unknown };
type ScheduledRequest = { content: ScheduledContent; trigger: { channelId: string } };
type NotificationsMock = {
  setNotificationChannelAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock<Promise<string>, [ScheduledRequest]>;
};

const Notifications = jest.requireMock("expo-notifications") as NotificationsMock;
const BudgetStorage = jest.requireMock("../../storage/budgetStorage") as {
  getBudgetEntries: jest.Mock;
};
const SettingsStorage = jest.requireMock(
  "../../storage/trackingReminderSettingsStorage"
) as { getTrackingReminderSettings: jest.Mock };

const SECRET = "ZZZ-SECRET-CATEGORY-DO-NOT-LEAK";
const ALL_MESSAGE_PAIRS = [...CHECK_IN_MESSAGES, ...MONTH_START_MESSAGES];

beforeEach(() => {
  jest.clearAllMocks();
  Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  Notifications.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
  BudgetStorage.getBudgetEntries.mockResolvedValue([]);
  SettingsStorage.getTrackingReminderSettings.mockResolvedValue({
    ...DEFAULT_TRACKING_REMINDER_SETTINGS,
  });
  (global as { __DEV__?: boolean }).__DEV__ = false;
});

describe("rescheduleTrackingReminders - rule 11 content guard", () => {
  it("schedules at least one reminder from the vetted pool, never leaking the entry's category/description", async () => {
    SettingsStorage.getTrackingReminderSettings.mockResolvedValue({
      enabled: true,
      checkInsEnabled: true,
      cadenceDays: 3,
      monthStartEnabled: true,
      hour: 19,
    });
    // Far-overdue entry guarantees at least one check-in lands inside the
    // 30-day scheduling window regardless of the real "now" the test runs at.
    BudgetStorage.getBudgetEntries.mockResolvedValue([
      makeBudgetEntry({
        category: SECRET,
        description: SECRET,
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ]);

    await rescheduleTrackingReminders();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    for (const [request] of Notifications.scheduleNotificationAsync.mock.calls) {
      const { content, trigger } = request;
      expect(content.data).toEqual({ type: TRACKING_REMINDER_DATA_TYPE });
      expect(
        ALL_MESSAGE_PAIRS.some((m) => m.title === content.title && m.body === content.body)
      ).toBe(true);
      // No dollar amount ever appears (a couple of messages say "30 seconds",
      // which is fine - rule 11 is about money/identity, not digits per se).
      expect(content.title).not.toMatch(/\$/);
      expect(content.body).not.toMatch(/\$/);
      expect(content.title).not.toContain(SECRET);
      expect(content.body).not.toContain(SECRET);
      expect(JSON.stringify(request)).not.toContain(SECRET);
      expect(trigger.channelId).toBe(TRACKING_REMINDER_CHANNEL_ID);
    }
  });

  it("cancels any existing schedule and never calls scheduleNotificationAsync when disabled", async () => {
    SettingsStorage.getTrackingReminderSettings.mockResolvedValue({
      ...DEFAULT_TRACKING_REMINDER_SETTINGS,
      enabled: false,
    });
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "ours-1", content: { data: { type: TRACKING_REMINDER_DATA_TYPE } } },
      { identifier: "foreign-1", content: { data: { type: "card-keep-alive-reminder" } } },
    ]);

    await rescheduleTrackingReminders();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("ours-1");
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("only cancels this feature's own scheduled requests, never another feature's", async () => {
    SettingsStorage.getTrackingReminderSettings.mockResolvedValue({
      enabled: true,
      checkInsEnabled: true,
      cadenceDays: 1,
      monthStartEnabled: false,
      hour: 9,
    });
    BudgetStorage.getBudgetEntries.mockResolvedValue([]);
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "ours-1", content: { data: { type: TRACKING_REMINDER_DATA_TYPE } } },
      { identifier: "foreign-1", content: { data: { type: "card-keep-alive-reminder" } } },
      { identifier: "no-data", content: { data: undefined } },
    ]);

    await rescheduleTrackingReminders();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("ours-1");
  });

  it("sets up the Android notification channel before scheduling", async () => {
    SettingsStorage.getTrackingReminderSettings.mockResolvedValue({
      ...DEFAULT_TRACKING_REMINDER_SETTINGS,
      enabled: true,
    });
    await rescheduleTrackingReminders();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      TRACKING_REMINDER_CHANNEL_ID,
      expect.any(Object)
    );
  });

  it("never throws when a storage read fails - scheduling is best-effort", async () => {
    SettingsStorage.getTrackingReminderSettings.mockRejectedValue(
      new Error("storage down")
    );
    await expect(rescheduleTrackingReminders()).resolves.toBeUndefined();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("serializes concurrent callers into a single underlying run", async () => {
    let resolveSettings!: (v: typeof DEFAULT_TRACKING_REMINDER_SETTINGS) => void;
    SettingsStorage.getTrackingReminderSettings.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSettings = resolve;
        })
    );
    const first = rescheduleTrackingReminders();
    const second = rescheduleTrackingReminders();
    resolveSettings({ ...DEFAULT_TRACKING_REMINDER_SETTINGS, enabled: false });
    await Promise.all([first, second]);
    expect(SettingsStorage.getTrackingReminderSettings).toHaveBeenCalledTimes(1);
  });
});

describe("ensureTrackingReminderPermissions", () => {
  it("returns true without requesting when already granted", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });
    expect(await ensureTrackingReminderPermissions()).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns false without requesting when permanently declined", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    expect(await ensureTrackingReminderPermissions()).toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("requests permission and returns the result when askable", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await ensureTrackingReminderPermissions()).toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe("cancelAllTrackingReminders", () => {
  it("cancels only this feature's scheduled requests", async () => {
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "ours-1", content: { data: { type: TRACKING_REMINDER_DATA_TYPE } } },
      { identifier: "foreign-1", content: { data: { type: "card-keep-alive-reminder" } } },
    ]);
    await cancelAllTrackingReminders();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("ours-1");
  });

  it("swallows a failure instead of throwing", async () => {
    Notifications.getAllScheduledNotificationsAsync.mockRejectedValue(
      new Error("os error")
    );
    await expect(cancelAllTrackingReminders()).resolves.toBeUndefined();
  });
});
