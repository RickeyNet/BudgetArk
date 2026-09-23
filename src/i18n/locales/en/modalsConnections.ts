/**
 * BudgetArk - English strings: shared modals (connections)
 * File: src/i18n/locales/en/modalsConnections.ts
 *
 * Covers: AddConnectionModal, ConnectionsModal, ProviderSetupGuideModal,
 * TellerConnectModal (bank connections). The per-provider guide CONTENT
 * (steps, tips, privacy points) comes from src/data/connectionGuides.ts and
 * is not part of this tree; Bridge account category names reuse
 * `bridge.screen.accounts.categories.*`.
 */

export const modalsConnections = {
  teller: {
    title: "Connect via Teller",
    failure: "Teller Connect reported a failure.",
  },
  guide: {
    cost: "COST",
    openSite: "Open {{site}} ↗",
    stepByStep: "STEP BY STEP",
    officialGuide: "See {{name}}'s official setup guide ↗",
    goodToKnow: "GOOD TO KNOW",
    privacy: "PRIVACY AT A GLANCE",
    policy: "Read {{name}}'s full privacy policy ↗",
    disclaimer:
      "This is a plain-language summary, not legal advice. Policies can change - the link above is always the authoritative version.",
    startSetup: "Start setup →",
  },
  /** Per-account mapping rows shared by the wizard and the connection detail. */
  mapping: {
    importTransactions: "Import transactions",
    whoseCard: "Whose card is this?",
    noOne: "No one",
    balanceUpdates: "Balance updates",
    none: "None",
    newAccount: "+ New account",
    accountNamePlaceholder: "Account name",
    createAndMap: "Create & map",
    savingsHint:
      "Savings accounts can be marked as your emergency fund from the Bridge tab once created.",
    investmentHint:
      "The bank's balance becomes this account's value on the Bridge. If you also add its stocks or funds there, they count on top of it.",
  },
  timeAgo: {
    never: "never",
    justNow: "just now",
    minutes: "{{count}}m ago",
    hours: "{{count}}h ago",
    days: "{{count}}d ago",
  },
  status: {
    reconnectNeeded: "Reconnect needed",
    lastSyncFailed: "Last sync failed",
    bridgeAttention: "A bank needs attention on your SimpleFIN Bridge",
    lastSynced: "Last synced {{when}}",
  },
  list: {
    title: "Bank Connections",
    subtitle:
      "Connections fetch transactions and balances directly from your providers using credentials stored on this device.",
    empty:
      "No connections yet. Connect a bank to import transactions and keep balances current automatically.",
    addConnection: "+ Add Connection",
    syncAll: "Sync All Now",
  },
  detail: {
    back: "‹ All connections",
    reauthBanner:
      "This connection needs to be re-authorized. Remove it and add it again to reconnect.",
    bridgeWarningIntro:
      "Your SimpleFIN Bridge reports that a bank behind this connection needs a fresh login. Its transactions stop arriving until you reconnect it:",
    bridgeWarningOutro:
      "Sign in at beta-bridge.simplefin.org and reconnect that bank. Once it's back, the next sync re-imports the transactions it missed on its own.",
    unfinishedSetup:
      "Setup didn't finish - no accounts are mapped yet, so nothing imports. Your setup token was already claimed, so you can finish without a new one.",
    finishSetup: "Finish Account Setup",
    linkedAccounts: "LINKED ACCOUNTS",
    noAccounts: "No accounts mapped.",
    importsOn: "Imports transactions",
    importsOff: "Import off",
    updatesAccount: " · updates {{name}}",
    balanceFallback: "balance",
    updatesDebtCard: " · updates a card on Debts",
    balanceNotTracked: " · balance not tracked",
    balanceValue: " · {{amount}}",
    addAnotherBank: "+ Add another bank",
    checkNewAccounts: "+ Check for New Accounts",
    syncNow: "Sync Now",
    reimport: "Re-import the last {{count}} days",
    reimportHint:
      "Use this if a bank was disconnected for a while and its transactions are missing. Anything you already reviewed stays as it is.",
    remove: "Remove Connection",
    errors: {
      loadAccounts: "Couldn't load this connection's accounts.",
      savePerson: "Couldn't save who this card belongs to.",
      savePreferences: "Couldn't save this account's settings.",
      createAccount: "Couldn't create the Bridge account.",
    },
  },
  removeDialog: {
    title: "Remove this connection?",
    body:
      "Its credentials are deleted from this device and syncing stops. Budget entries you already approved stay. Unreviewed inbox items from this connection are discarded.",
    keep: "Keep",
    remove: "Remove",
    removing: "Removing...",
  },
  wizard: {
    provider: {
      title: "Connect a Bank",
      subtitle:
        'Pick a provider. Your credentials stay encrypted on this device. New to this? Tap "Setup guide & privacy" for step-by-step help.',
      simplefinTitle: "🏦 SimpleFIN Bridge (recommended)",
      simplefinDescription:
        "One setup token covers Chase and thousands of US banks and credit cards. Paid service (~$1.50/month) with open signup - anyone can join today.",
      simplefinGuide: "📖 SimpleFIN setup guide & privacy",
      tellerTitle: "🔗 Teller",
      tellerDescription:
        "Bring your own Teller developer account (100 free bank connections). Best if you already have one: Teller has no public signup right now - new accounts are by request via support@teller.io.",
      tellerGuide: "📖 Teller setup guide & privacy",
    },
    fullGuide: "📖 Full setup guide, links & privacy",
    tellerSetup: {
      title: "Teller Setup",
      subtitle: "Uses your own free developer account from teller.io.",
      step1:
        "1. Sign in at teller.io - no account? Signups are currently by request only (email support@teller.io), or use SimpleFIN instead",
      step2:
        "2. Download and unzip the teller.zip from your dashboard (it holds certificate.pem and private_key.pem)",
      step3:
        "3. Copy your Application ID from the dashboard and import both .pem files below",
      applicationId: "APPLICATION ID",
      applicationIdPlaceholder: "app_...",
      environment: "ENVIRONMENT",
      clientCertificate: "CLIENT CERTIFICATE",
      certificateLoaded: "✓ certificate.pem loaded",
      importCertificate: "Import certificate.pem",
      privateKey: "PRIVATE KEY",
      keyLoaded: "✓ private_key.pem loaded",
      importKey: "Import private_key.pem",
      hint:
        "The certificate and key stay encrypted on this device - they're how Teller verifies the requests come from your app.",
      readFileError:
        "Couldn't read that file. Unzip teller.zip and pick the .pem files directly.",
    },
    tellerEnroll: {
      addBankTitle: "Add Another Bank",
      connectTitle: "Connect Your Bank",
      addBankSubtitle:
        "Log in to another bank through Teller Connect. It's added to this same connection - your existing banks stay as they are.",
      connectSubtitle:
        "Next, log in to your bank through Teller Connect. Your bank credentials go to Teller, never to BudgetArk.",
      openTitle: "🏦 Open Teller Connect",
      openDescription:
        "Opens Teller's secure bank-login flow. When it finishes, your accounts appear here for mapping.",
    },
    simplefin: {
      rediscoverTitle: "Check for New Accounts",
      rediscoverSubtitle:
        "Added a bank or account on your SimpleFIN Bridge after setup? This re-lists your bridge's accounts and offers any that aren't mapped yet. Accounts you've already mapped stay as they are.",
      resumeTitle: "Finish SimpleFIN Setup",
      resumeSubtitle:
        "Your setup token was already claimed and this connection is saved on this device - you don't need a new token.",
      resumeInstruction:
        "Listing your accounts failed, most often because SimpleFIN Bridge needs an active subscription. Check your billing at beta-bridge.simplefin.org, then load your accounts to finish setup.",
      title: "SimpleFIN Setup",
      subtitle: "Three steps on SimpleFIN's site, then paste one token here.",
      step1: "1. Create an account at beta-bridge.simplefin.org",
      step2: "2. Connect your bank(s) there",
      step3: '3. Choose "New App", copy the setup token, and paste it below',
      setupToken: "SETUP TOKEN",
      tokenPlaceholder: "Paste your SimpleFIN setup token",
      tokenHint:
        "Tokens are single-use: once BudgetArk claims it, it can't be pasted anywhere else.",
    },
    map: {
      title: "Your Accounts",
      subtitle:
        "Choose what to import, and where balances should land. Unmapped accounts still import transactions to the Review Inbox.",
      whoseCard: "WHOSE CARD IS THIS?",
      personHint: "Expenses imported from this account will suggest this person.",
      balanceUpdates: "BALANCE UPDATES",
      saveError: "Saving the account mapping failed. Try again.",
    },
    done: {
      allSetTitle: "✅ All Set",
      rediscoverNothing:
        "No new accounts found - everything on your bridge is already mapped. If you just added a bank on your SimpleFIN Bridge, give it a few minutes to finish linking and check again.",
      addBankNothing:
        "That bank's accounts were already connected, so nothing changed.",
      connectedTitle: "✅ Connected",
      summary_one:
        "{{count}} account will import transactions to your Review Inbox. New items appear after each sync.",
      summary_other:
        "{{count}} accounts will import transactions to your Review Inbox. New items appear after each sync.",
    },
    actions: {
      checking: "Checking...",
      checkNewAccounts: "Check for New Accounts",
      loadingAccounts: "Loading accounts...",
      loadAccounts: "Load Accounts",
      connecting: "Connecting...",
      connect: "Connect",
      saving: "Saving...",
      openTellerConnect: "Open Teller Connect",
    },
  },
} as const;
