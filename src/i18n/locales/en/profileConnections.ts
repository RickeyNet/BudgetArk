/**
 * BudgetArk - English strings: Profile (connections)
 * File: src/i18n/locales/en/profileConnections.ts
 *
 * Covers: ConnectionsSection, PartnerSyncSection, PeopleSection.
 * The bank-connections first-use disclosure text stays in
 * src/data/connectionsDisclosure.ts (a reviewed privacy statement) and is
 * not part of this tree.
 */

export const profileConnections = {
  banks: {
    sectionTitle: "CONNECTIONS",
    bankConnections: "Bank Connections",
    needsAttention: "Needs attention",
    importPrompt: "Import transactions from your bank",
    connectedCount_one: "{{count}} connected",
    connectedCount_other: "{{count}} connected",
    reviewInbox: "Review Inbox",
    waiting_one: "{{count}} transaction waiting",
    waiting_other: "{{count}} transactions waiting",
    nothingToReview: "Nothing to review",
    disclosure: {
      notNow: "Not now",
      continue: "Continue",
    },
  },
  partnerSync: {
    sectionTitle: "PARTNER SYNC",
    pair: "Pair with Partner",
    pairSubtext: "Sync budgets over WiFi - no account needed",
    autoSyncStatus: "Auto-sync {{state}} · \"{{ssid}}\"",
    setHomeWifi: "Tap to set home WiFi for auto-sync",
    disable: "Disable",
    enable: "Enable",
    syncNow: "Sync Now",
    discovering: "Looking for partner...",
    connecting: "Connecting...",
    syncing: "Syncing data...",
    lastSynced: "Last synced {{when}}",
    neverSynced: "Never synced",
    recentActivity: "Recent activity",
    activityRow: "{{when}} · {{received}} from {{partner}}",
    activitySent: " · sent {{count}}",
    unpair: "Unpair",
    unpairConfirm: {
      title: "Unpair Device",
      message:
        "This will disconnect partner sync. Your data stays on this device, but you'll need to pair again to sync.",
    },
  },
  people: {
    sectionTitle: "PEOPLE",
    manageA11y: "Manage people",
    people: "People 👤",
    peopleSubtext: "Assign spending to household members",
    reportA11y: "Open person spending report",
    report: "Person Spending Report",
    reportSubtext: "Per-person totals by year, with CSV export",
    owedA11y: "Open owed to you",
    owed: "Owed to You 🤝",
    owedSubtext: "Money you've lent out, and what's been paid back",
  },
} as const;
