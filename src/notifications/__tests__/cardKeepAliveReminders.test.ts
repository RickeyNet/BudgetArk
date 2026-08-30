/**
 * BudgetArk - card keep-alive scheduler tests
 * File: src/notifications/__tests__/cardKeepAliveReminders.test.ts
 *
 * Security rule 11 regression guard: notifications may never carry amounts,
 * account/card names, or balances on the lock screen. Every notification
 * this module schedules must have content pulled verbatim from the vetted
 * generic message pool (KEEP_ALIVE_MESSAGES in cardKeepAlivePlanner.ts,
 * already unit-tested there) - this test proves the SCHEDULER wiring never
 * lets a real card name/balance leak into what actually reaches
 * Notifications.scheduleNotificationAsync, using a fixture with a
 * deliberately distinctive card name. Also covers cancel-then-reschedule
 * idempotency (only this feature's own scheduled requests are touched) and
 * that scheduling failures are swallowed rather than thrown.
 *
 * expo-notifications, react-native, and storage/debtStorage are mocked; the
 * real (unmocked) cardKeepAlivePlanner supplies the actual plan. The system
 * clock is faked (the scheduler calls the planner with no explicit `now`,
 * unlike the planner's own tests) so a fixed fixture reliably falls inside
 * the 30-day scheduling window regardless of the real calendar date.
 */
import { KEEP_ALIVE_MESSAGES } from "../../utils/cardKeepAlivePlanner";
import { makeDebt } from "../../__tests__/fixtures";
import {
  CARD_KEEP_ALIVE_CHANNEL_ID,
  CARD_KEEP_ALIVE_DATA_TYPE,
  cancelAllCardKeepAliveReminders,
  ensureCardKeepAlivePermissions,
  rescheduleCardKeepAliveReminders,
} from "../cardKeepAliveReminders";

const SECRET_CARD_NAME = "ZZZ-SECRET-CARD";

type ScheduledContent = { title: string; body: string; data: unknown };
type ScheduledRequest = { content: ScheduledContent; trigger: { channelId: string } };

const mockSchedule = jest.fn(async (_request: ScheduledRequest) => "scheduled-id");
const mockCancel = jest.fn(async (_identifier: string) => {});
const mockGetAllScheduled = jest.fn(async () => [] as unknown[]);
const mockGetPermissions = jest.fn(async () => ({ granted: true, canAskAgain: true }));
const mockRequestPermissions = jest.fn(async () => ({ granted: true }));
const mockSetChannel = jest.fn(async (_id: string, _config: unknown) => {});

// Every mocked export below is a wrapper closure (`(...args) => mockX(...)`),
// never the outer `mockX` const assigned directly: the real import of
// "../cardKeepAliveReminders" above (import/first requires it precede this
// setup) requires these modules immediately, before the `const mockX =
// jest.fn()` lines below have run - a direct property reference would be a
// TDZ crash. A wrapper closure only reads `mockX` when actually CALLED, by
// which time every const in this file is long since initialized.
jest.mock("expo-notifications", () => ({
  setNotificationChannelAsync: (...args: Parameters<typeof mockSetChannel>) =>
    mockSetChannel(...args),
  getPermissionsAsync: (...args: Parameters<typeof mockGetPermissions>) =>
    mockGetPermissions(...args),
  requestPermissionsAsync: (...args: Parameters<typeof mockRequestPermissions>) =>
    mockRequestPermissions(...args),
  getAllScheduledNotificationsAsync: (
    ...args: Parameters<typeof mockGetAllScheduled>
  ) => mockGetAllScheduled(...args),
  cancelScheduledNotificationAsync: (...args: Parameters<typeof mockCancel>) =>
    mockCancel(...args),
  scheduleNotificationAsync: (...args: Parameters<typeof mockSchedule>) =>
    mockSchedule(...args),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

jest.mock("react-native", () => ({ Platform: { OS: "android" } }));

const mockGetDebts = jest.fn(async () => [] as unknown[]);
jest.mock("../../storage/debtStorage", () => ({
  getDebts: (...args: Parameters<typeof mockGetDebts>) => mockGetDebts(...args),
}));

// Same fixture the planner's own tests use: keepAliveLastUsedAt
// 2026-01-15 -> deadline 2026-07-15 with the default 6-month window.
const overdueCard = () =>
  makeDebt({
    name: SECRET_CARD_NAME,
    balance: 4321.99,
    debtClass: "personal_credit",
    keepAliveEnabled: true,
    keepAliveLastUsedAt: "2026-01-15T12:00:00.000Z",
  });

beforeEach(() => {
  jest.useFakeTimers();
  // Jun 20 2026: inside the lead window, with the urgent (-7) and deadline
  // (0) candidate offsets both still in the future - guarantees at least two
  // scheduled reminders (see cardKeepAlivePlanner.test.ts's equivalent case).
  jest.setSystemTime(new Date(2026, 5, 20, 8, 0, 0));
  jest.clearAllMocks();
  mockGetAllScheduled.mockResolvedValue([]);
  mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
  mockRequestPermissions.mockResolvedValue({ granted: true });
  mockGetDebts.mockResolvedValue([]);
  (global as { __DEV__?: boolean }).__DEV__ = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("rescheduleCardKeepAliveReminders - rule 11 content guard", () => {
  it("schedules reminders from the vetted pool, never leaking the card's name or balance", async () => {
    mockGetDebts.mockResolvedValue([overdueCard()]);

    await rescheduleCardKeepAliveReminders();

    expect(mockSchedule).toHaveBeenCalled();
    for (const [request] of mockSchedule.mock.calls) {
      const { content, trigger } = request;
      expect(content.data).toEqual({ type: CARD_KEEP_ALIVE_DATA_TYPE });
      expect(
        KEEP_ALIVE_MESSAGES.some((m) => m.title === content.title && m.body === content.body)
      ).toBe(true);
      expect(content.title).not.toContain(SECRET_CARD_NAME);
      expect(content.body).not.toContain(SECRET_CARD_NAME);
      expect(content.body).not.toContain("4321.99");
      expect(JSON.stringify(request)).not.toContain(SECRET_CARD_NAME);
      expect(trigger.channelId).toBe(CARD_KEEP_ALIVE_CHANNEL_ID);
    }
  });

  it("coalesces multiple tracked cards into shared, still content-free notifications", async () => {
    mockGetDebts.mockResolvedValue([
      overdueCard(),
      makeDebt({
        id: "debt-2",
        name: "Another Secret Card",
        debtClass: "personal_credit",
        keepAliveEnabled: true,
        keepAliveLastUsedAt: "2026-01-15T12:00:00.000Z",
      }),
    ]);
    await rescheduleCardKeepAliveReminders();
    for (const [request] of mockSchedule.mock.calls) {
      expect(request.content.title).not.toContain("Secret Card");
      expect(request.content.body).not.toContain("Secret Card");
    }
  });

  it("cancels any existing schedule and never schedules when no card has keep-alive enabled", async () => {
    mockGetDebts.mockResolvedValue([
      makeDebt({ debtClass: "personal_credit", keepAliveEnabled: false }),
    ]);
    mockGetAllScheduled.mockResolvedValue([
      { identifier: "ours-1", content: { data: { type: CARD_KEEP_ALIVE_DATA_TYPE } } },
      { identifier: "foreign-1", content: { data: { type: "tracking-reminder" } } },
    ]);

    await rescheduleCardKeepAliveReminders();

    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith("ours-1");
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("only cancels this feature's own scheduled requests, never another feature's", async () => {
    mockGetDebts.mockResolvedValue([overdueCard()]);
    mockGetAllScheduled.mockResolvedValue([
      { identifier: "ours-1", content: { data: { type: CARD_KEEP_ALIVE_DATA_TYPE } } },
      { identifier: "foreign-1", content: { data: { type: "tracking-reminder" } } },
      { identifier: "no-data", content: { data: undefined } },
    ]);

    await rescheduleCardKeepAliveReminders();

    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith("ours-1");
  });

  it("sets up the Android notification channel before scheduling", async () => {
    mockGetDebts.mockResolvedValue([overdueCard()]);
    await rescheduleCardKeepAliveReminders();
    expect(mockSetChannel).toHaveBeenCalledWith(
      CARD_KEEP_ALIVE_CHANNEL_ID,
      expect.any(Object)
    );
  });

  it("never throws when a storage read fails - scheduling is best-effort", async () => {
    mockGetDebts.mockRejectedValue(new Error("storage down"));
    await expect(rescheduleCardKeepAliveReminders()).resolves.toBeUndefined();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("serializes concurrent callers into a single underlying run", async () => {
    let resolveDebts!: (v: unknown[]) => void;
    mockGetDebts.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDebts = resolve;
        })
    );
    const first = rescheduleCardKeepAliveReminders();
    const second = rescheduleCardKeepAliveReminders();
    resolveDebts([]);
    await Promise.all([first, second]);
    expect(mockGetDebts).toHaveBeenCalledTimes(1);
  });
});

describe("ensureCardKeepAlivePermissions", () => {
  it("returns true without requesting when already granted", async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
    expect(await ensureCardKeepAlivePermissions()).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("returns false without requesting when permanently declined", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await ensureCardKeepAlivePermissions()).toBe(false);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("requests permission and returns the result when askable", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissions.mockResolvedValue({ granted: true });
    expect(await ensureCardKeepAlivePermissions()).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  });
});

describe("cancelAllCardKeepAliveReminders", () => {
  it("cancels only this feature's scheduled requests", async () => {
    mockGetAllScheduled.mockResolvedValue([
      { identifier: "ours-1", content: { data: { type: CARD_KEEP_ALIVE_DATA_TYPE } } },
      { identifier: "foreign-1", content: { data: { type: "tracking-reminder" } } },
    ]);
    await cancelAllCardKeepAliveReminders();
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith("ours-1");
  });

  it("swallows a failure instead of throwing", async () => {
    mockGetAllScheduled.mockRejectedValue(new Error("os error"));
    await expect(cancelAllCardKeepAliveReminders()).resolves.toBeUndefined();
  });
});
