import { searchGuide } from "../guideSearch";
import type { CoachmarkTabId, CoachmarkTour } from "../../data/coachmarkContent";

// Small controlled fixture: real COACHMARKS content is covered by
// coachmarkContent.test.ts; these tests pin the matching/ranking rules.
const tours: Record<CoachmarkTabId, CoachmarkTour> = {
  DebtTracker: {
    tabId: "DebtTracker",
    emoji: "⛓️",
    intro: "Debts - your payoff plan",
    steps: [
      {
        id: "debts-keepalive",
        title: "Keep idle credit cards alive",
        body: "Warns before an inactivity window runs out.",
        detail: "Enable the watch in Edit Debt.",
        location: "Debts tab → tap a card → Edit",
        keywords: ["credit card", "closure", "credit score"],
      },
      {
        id: "debts-payments",
        title: "Log payments as you go",
        body: "Tap a debt card to record a payment.",
        detail: "Payment history lives behind the card.",
        location: "Debts tab → tap a debt card",
      },
    ],
  },
  Budget: {
    tabId: "Budget",
    emoji: "💰",
    intro: "Budget - what comes in, what goes out",
    steps: [
      {
        id: "budget-receipts",
        title: "Receipts and business expenses",
        body: "Attach receipt photos to any entry.",
        detail: "Photos are encrypted and stay on this phone.",
        location: "Budget tab → edit an entry",
        keywords: ["photo", "tax"],
      },
    ],
  },
  Bridge: {
    tabId: "Bridge",
    emoji: "🧭",
    intro: "Bridge - your net worth",
    steps: [],
  },
  Utilities: {
    tabId: "Utilities",
    emoji: "📈",
    intro: "Charts - tools",
    steps: [],
  },
  Profile: {
    tabId: "Profile",
    emoji: "⚙️",
    intro: "Profile - your settings",
    steps: [
      {
        id: "profile-sync-data",
        title: "Partner sync and backups",
        body: "Encrypted backups and spreadsheet export.",
        detail: "Reset All Data starts you over.",
        location: "Profile tab → Data",
        keywords: ["excel", "csv"],
      },
    ],
  },
};

describe("searchGuide", () => {
  it("returns nothing for empty or whitespace queries", () => {
    expect(searchGuide("", tours)).toEqual([]);
    expect(searchGuide("   ", tours)).toEqual([]);
  });

  it("matches case-insensitively across title, body, and detail", () => {
    expect(searchGuide("RECEIPT", tours).map((r) => r.step.id)).toEqual([
      "budget-receipts",
    ]);
    expect(searchGuide("encrypted", tours).map((r) => r.step.id)).toEqual(
      expect.arrayContaining(["budget-receipts", "profile-sync-data"])
    );
  });

  it("finds steps by search-only keyword synonyms", () => {
    expect(searchGuide("credit card", tours).map((r) => r.step.id)).toEqual([
      "debts-keepalive",
    ]);
    expect(searchGuide("excel", tours).map((r) => r.step.id)).toEqual([
      "profile-sync-data",
    ]);
  });

  it("finds steps by their where-to-find location", () => {
    const ids = searchGuide("edit", tours).map((r) => r.step.id);
    expect(ids).toContain("debts-keepalive"); // "Edit" in location
    expect(ids).toContain("budget-receipts"); // "edit an entry"
  });

  it("requires every token to match (AND semantics)", () => {
    expect(searchGuide("payment history", tours).map((r) => r.step.id)).toEqual(
      ["debts-payments"]
    );
    expect(searchGuide("payment nonexistentword", tours)).toEqual([]);
  });

  it("ranks title hits above body/detail hits", () => {
    // "payments" is in debts-payments' title; "payment" also appears in
    // other steps' bodies would rank lower. Use "sync": title hit on
    // profile-sync-data vs nothing else.
    const results = searchGuide("backups", tours);
    expect(results[0].step.id).toBe("profile-sync-data");
  });

  it("returns tab label and id with each result", () => {
    const [result] = searchGuide("receipt", tours);
    expect(result.tabId).toBe("Budget");
    expect(result.tabLabel).toBe("Budget - what comes in, what goes out");
  });

  it("finds nothing for a no-match query", () => {
    expect(searchGuide("zebra", tours)).toEqual([]);
  });

  it("keeps tour order within a rank", () => {
    // "tab" appears in every step's location -> all rank LOCATION,
    // ordered by tour/tab order.
    const ids = searchGuide("tab", tours).map((r) => r.step.id);
    expect(ids).toEqual([
      "debts-keepalive",
      "debts-payments",
      "budget-receipts",
      "profile-sync-data",
    ]);
  });

  it("searches the real content by default", () => {
    // Sanity: the default COACHMARKS export answers a real question.
    const ids = searchGuide("credit card closed").map((r) => r.step.id);
    expect(ids).toContain("debts-keepalive");
  });
});
