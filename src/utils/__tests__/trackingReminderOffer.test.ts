import { shouldOfferTrackingReminders } from "../trackingReminderOffer";

describe("shouldOfferTrackingReminders", () => {
  it("offers only to a phone that has never decided", () => {
    expect(
      shouldOfferTrackingReminders({ enabled: false, hasStoredSettings: false, offerDismissed: false })
    ).toBe(true);
  });

  it("retires on any decision: enabled, sheet visited, or dismissed", () => {
    expect(
      shouldOfferTrackingReminders({ enabled: true, hasStoredSettings: true, offerDismissed: false })
    ).toBe(false);
    expect(
      shouldOfferTrackingReminders({ enabled: false, hasStoredSettings: true, offerDismissed: false })
    ).toBe(false);
    expect(
      shouldOfferTrackingReminders({ enabled: false, hasStoredSettings: false, offerDismissed: true })
    ).toBe(false);
  });
});
