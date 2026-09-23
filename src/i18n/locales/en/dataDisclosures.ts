/**
 * BudgetArk - English strings: bundled data (disclosures)
 * File: src/i18n/locales/en/dataDisclosures.ts
 *
 * Covers: missionStatement, learningDisclaimer, and the three off-device
 * disclosures (connections / exchange rates / holdings). The disclosures are
 * rule-4 consent copy (CLAUDE.md): every translation must say exactly what
 * the English says - no softer, no stronger. Resolved lazily from src/data
 * via src/i18n/translate.ts.
 */

export const dataDisclosures = {
  mission: {
    eyebrow: "OUR MISSION",
    title: "Why I built BudgetArk",
    body: "I wanted to be proactive with my finances, get them under control and start preparing for the future, without giving up my privacy or paying for another subscription. I needed debt payoff, monthly budgeting, and a clear view of the road ahead in one offline app that stays on your device and goes nowhere else. I built BudgetArk to help you do the same, at no cost to you.",
    invite:
      "I want this to feel like yours. If you have an idea for the app - a feature, a fix, even a new theme - reach out through Send Feedback on the Profile tab. I read every message.",
  },
  learningDisclaimer:
    "BudgetArk lessons reflect one app's approach to personal money management. The author is not a licensed financial advisor, accountant, or attorney. This is general education and opinion, not advice for your situation. For big decisions, talk to a qualified professional.",
  connections: {
    title: "Before you connect",
    intro:
      "Bank Connections talk to your financial providers directly from this device. Here's exactly what that means:",
    points: {
      credentials:
        "Your credentials (a SimpleFIN token or your Teller certificate) are stored encrypted on this device only. They never sync to a paired partner and never touch a BudgetArk server - BudgetArk doesn't have one.",
      direct:
        "To fetch balances and transactions, this device connects directly to SimpleFIN or Teller. Those providers see the requests come from you, not from BudgetArk.",
      inbox:
        'Imported transactions wait in a Review Inbox. Nothing enters your budget until you approve it - unless you save an "always approve" rule for a merchant you trust, which you can change or delete anytime.',
      remove:
        "You can remove a connection at any time. Its credentials are deleted from this device, and entries you already approved stay in your budget.",
    },
  },
  exchangeRates: {
    title: "Before we fetch a rate",
    intro: "Converting your amounts uses today's exchange rate. Here's exactly what leaves your device:",
    points: {
      request:
        "This device requests the day's public rate table from a free exchange-rate service (open.er-api.com). The request carries no account, amount, or identity - it's the same table everyone gets.",
      onDevice:
        "Your balances and entries are converted on this device. Nothing about your finances is sent anywhere.",
      fallback:
        "If the service can't be reached, BudgetArk falls back to the last rates it saved, then to a built-in estimate - you'll see which one was used before you confirm.",
    },
  },
  holdings: {
    title: "Before you turn this on",
    intro: "Live Holdings sends a little data off your device. Here's exactly what:",
    points: {
      stored:
        "Your tickers and share counts are stored on this device and sync to your paired partner, just like your accounts.",
      symbolsOnly:
        "To show prices, only your ticker symbols are sent to BudgetArk's quote service about once a day. Your share counts, balances, and identity are never sent.",
      thirdParty: "Prices come from a third-party market data provider.",
    },
  },
} as const;
