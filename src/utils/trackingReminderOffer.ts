/**
 * BudgetArk - Tracking Reminder Offer
 * File: src/utils/trackingReminderOffer.ts
 *
 * Whether the Budget tab should show the one-time "want a nudge to keep
 * tracking?" card. New installs answer the same question during
 * onboarding (step 4 of 5); this card exists for phones that finished
 * setup before that step existed, or skipped setup entirely. It shows
 * once: any decision - on the card, in onboarding, or by ever opening the
 * Profile sheet - retires it. Pure and unit-tested.
 */

export interface TrackingReminderOfferInputs {
  /** Reminders already on - nothing to offer. */
  enabled: boolean;
  /** A settings record exists at all: the user has been through the sheet. */
  hasStoredSettings: boolean;
  /** "No thanks" / onboarding answer recorded. */
  offerDismissed: boolean;
}

export const shouldOfferTrackingReminders = ({
  enabled,
  hasStoredSettings,
  offerDismissed,
}: TrackingReminderOfferInputs): boolean =>
  !enabled && !hasStoredSettings && !offerDismissed;
