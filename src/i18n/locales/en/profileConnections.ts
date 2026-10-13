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
    waiting_one: "{{count}} transaction waiting",
    waiting_other: "{{count}} transactions waiting",
    disclosure: {
      notNow: "Not now",
      continue: "Continue",
    },
  },
  /** Bridge/Budget banner when a bank connection needs the user. */
  banner: {
    title: "A bank connection needs attention",
    body: "A bank needs a fresh login or the last sync failed. Open Bank Connections to fix it.",
    open: "Open",
    later: "Later",
  },
  partnerSync: {
    sectionTitle: "PARTNER SYNC",
    pair: "Pair with Partner",
    pairSubtext: "Sync budgets over WiFi - no account needed",
    autoSyncStatus: "Auto-sync {{state}} · \"{{ssid}}\"",
    /** Sync Now row subtext: partner name + the sync status / last-synced line. */
    statusWithPartner: "{{partner}} · {{status}}",
    /** Overflow (⋯) button + its sheet: home Wi-Fi and unpair. */
    options: "Sync options",
    homeWifi: "Home Wi-Fi",
    homeWifiUnset: "Not set · tap to use the network you're on",
    /** Auto-sync pill on the Sync Now row (shown once a home Wi-Fi is set). */
    autoOn: "Auto on",
    autoOff: "Auto off",
    autoA11y: "Auto-sync on home Wi-Fi",
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
    manageA11y: "Manage people",
    people: "People 👤",
    peopleSubtext: "Household members, who spent what, and money owed to you",
  },
} as const;
