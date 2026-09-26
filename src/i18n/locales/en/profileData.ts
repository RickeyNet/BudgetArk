/**
 * BudgetArk - English strings: Profile (data)
 * File: src/i18n/locales/en/profileData.ts
 *
 * Covers: DataSection.tsx (export / import / backups / reset).
 * Result-summary strings keep their leading "\n" so the section can
 * concatenate paragraphs without per-language layout logic.
 */

export const profileData = {
  sectionTitle: "DATA",
  rows: {
    export: { title: "Export", subtitle: "Encrypted backup or spreadsheet" },
    import: {
      title: "Import",
      subtitle: "Backup, spreadsheet or bank statement",
    },
    autoBackup: { title: "Automatic Backups" },
    reset: { title: "Reset All Data" },
  },
  exportMenu: {
    title: "Export",
    backup: {
      title: "Encrypted Backup",
      subtitle: "Everything, as a password-protected file",
    },
    spreadsheet: {
      title: "Spreadsheet",
      subtitle: "CSV or Excel for Google Sheets / Excel",
    },
  },
  importMenu: {
    title: "Import",
    backupFile: {
      title: "Backup from File",
      subtitle: "Restore a BudgetArk export",
    },
    backupPaste: {
      title: "Paste Backup Text",
      subtitle: "JSON copied from an export",
    },
    spreadsheet: {
      title: "Spreadsheet",
      subtitle: "From a CSV or Excel file",
    },
    bankStatement: {
      title: "Bank Statement",
      subtitle: "A CSV from your bank → Review Inbox",
    },
  },
  autoBackup: {
    loading: "Loading...",
    unavailable: "Unavailable",
    lastOn: "last {{date}}",
    noneYet: "none yet",
    summaryEnabled: "{{cadence}} · {{last}}",
    summaryOff: "Off · {{last}}",
    cadence: { weekly: "Weekly", monthly: "Monthly" },
  },
  export: {
    passwordTooShort: {
      title: "Password Too Short",
      message: "Please enter a password with at least 4 characters, or turn off encryption.",
    },
    failed: {
      title: "Export Failed",
      message: "Something went wrong while exporting your data.",
    },
    spinner: {
      title: "Preparing your export…",
      subtitle: "Encrypting can take a few seconds. Keep the app open.",
    },
    dialog: {
      title: "Export My Data",
      encryptedNote: "Your data will be encrypted with a password before sharing.",
      plaintextNote:
        "Your data will be exported as plaintext JSON. Anyone with access to the file can read your financial data.",
      encryptToggle: "Encrypt with password",
      passwordPlaceholder: "Enter export password",
      encryptAndShare: "Encrypt & Share",
      sharePlaintext: "Share Plaintext",
    },
  },
  import: {
    complete: { title: "Import Complete" },
    failed: {
      title: "Import Failed",
      message: "Something went wrong while importing your data.",
    },
    labelMerged: "Merged",
    labelImported: "Imported",
    summary: "{{label}} {{parts}}.",
    listSeparator: ", ",
    counts: {
      debts_one: "{{count}} debt",
      debts_other: "{{count}} debts",
      payments_one: "{{count}} payment",
      payments_other: "{{count}} payments",
      budgetEntries_one: "{{count}} budget entry",
      budgetEntries_other: "{{count}} budget entries",
      budgetLimits_one: "{{count}} budget limit",
      budgetLimits_other: "{{count}} budget limits",
      limits_one: "{{count}} limit",
      limits_other: "{{count}} limits",
      savingsGoals_one: "{{count}} savings goal",
      savingsGoals_other: "{{count}} savings goals",
      assetAccounts_one: "{{count}} asset account",
      assetAccounts_other: "{{count}} asset accounts",
      holdings_one: "{{count}} holding",
      holdings_other: "{{count}} holdings",
      netWorthSnapshots_one: "{{count}} net worth snapshot",
      netWorthSnapshots_other: "{{count}} net worth snapshots",
      customCategories_one: "{{count}} custom category",
      customCategories_other: "{{count}} custom categories",
      businesses_one: "{{count}} business",
      businesses_other: "{{count}} businesses",
      people_one: "{{count}} person",
      people_other: "{{count}} people",
    },
    extras: {
      milestonePlan: "milestone plan",
      payoffStrategy: "payoff strategy",
    },
    alsoRestored: "\nAlso restored: {{extras}}.",
    staleNote: "\n\nNote: This export is {{days}} days old. Some data may be outdated.",
    password: {
      title: "Encrypted Export",
      message: "This export was encrypted with a password. Enter the password to decrypt it.",
      placeholder: "Enter password",
      confirm: "Decrypt & Import",
    },
    mode: {
      title: "Import from File",
      message:
        "Merge keeps your existing data and adds the imported data. Replace wipes your current data first.",
      merge: "Merge",
      replace: "Replace",
    },
    paste: {
      title: "Paste Export Data",
      hint: "Paste the JSON text you copied from Export My Data.",
      placeholder: "Paste JSON here...",
      empty: {
        title: "Empty",
        message: "Please paste your exported JSON data first.",
      },
    },
  },
  spreadsheet: {
    formatReference: "View format reference →",
    export: {
      dialog: {
        title: "Export Spreadsheet",
        message:
          "CSV exports budget entries only - easiest for Google Sheets and quick edits. Excel exports a full multi-sheet workbook (Budget Entries, Budget Limits, Debts, Payments, Savings Goals, Asset Accounts) for a complete backup.",
        csv: "CSV",
        excel: "Excel",
      },
      readyTitle: "{{format}} Export Ready",
      csvNote: "CSV exports include budget entries only. Use Excel format for a full backup.",
      excelNote_one:
        "Workbook saved with {{count}} budget entry plus debts, payments, savings goals, and asset accounts.",
      excelNote_other:
        "Workbook saved with {{count}} budget entries plus debts, payments, savings goals, and asset accounts.",
      partialNote:
        "\n\nPartial export: some sections could not be read and were skipped ({{sections}}).",
      failedMessage: "Something went wrong while exporting the spreadsheet.",
    },
    import: {
      dialog: {
        title: "Import Spreadsheet",
        message:
          "Pick a .csv or .xlsx file. Required headers: Date, Type (income/expense), Category, Amount. Merge keeps your existing data; Replace wipes it first.",
        tip: "Tip: tap Export Spreadsheet first to see the exact format, then edit and re-import. IDs round-trip so existing rows update in place.",
      },
      recognizedPreset: "Recognized a {{preset}} export. {{label}} {{parts}}.",
      fromSpreadsheet: "{{label}} {{parts}} from the spreadsheet.",
      droppedRows_one:
        "\n\n{{count}} transfer / zero-amount row left out - moves between your own accounts aren't income or spending.",
      droppedRows_other:
        "\n\n{{count}} transfer / zero-amount rows left out - moves between your own accounts aren't income or spending.",
      skippedRows_one: "\n\n{{count}} row skipped (required fields missing or invalid):",
      skippedRows_other: "\n\n{{count}} rows skipped (required fields missing or invalid):",
      skippedRowLine: "\n• {{sheet}} - {{descriptor}}: {{reason}}",
      andMore: "\n• …and {{count}} more",
      staleNote: "\n\nNote: This file is {{days}} days old. Some data may be outdated.",
      failedMessage: "Something went wrong while importing the spreadsheet.",
    },
  },
  bankStatement: {
    readFailed: {
      title: "Couldn't read the file",
      message: "That doesn't look like a bank CSV. Export your transactions as CSV and try again.",
    },
    noFile: "No file selected.",
    tooLarge: "File is too large ({{size}} MB). Maximum is 5 MB - export a shorter date range.",
    importedTitle: "Statement Imported",
  },
  reset: {
    dialog: {
      title: "Reset All Data",
      message:
        "This will permanently delete all your debts, payments, and account data. This cannot be undone.",
      confirm: "Reset Everything",
    },
  },
} as const;
