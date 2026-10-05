/**
 * BudgetArk - English strings: pure helpers (import)
 * File: src/i18n/locales/en/helpersImport.ts
 *
 * Covers: spreadsheetImport, importData, bankCsvImport, spreadsheetExport
 * (file import/export errors and per-row skip reasons). Read from plain
 * modules via src/i18n/translate.ts. Sheet titles, column headers and CSV
 * header names are file contracts and never live here.
 */

export const helpersImport = {
  file: {
    noFileSelected: "No file selected.",
  },
  spreadsheet: {
    tooManyRows: "Spreadsheet has too many rows ({{rows}}). Maximum is {{max}}.",
    tooLarge: "File is too large ({{mb}} MB). Maximum is 5 MB.",
    unreadable:
      "Could not read the spreadsheet. The file may be corrupt or in an unsupported format.",
    empty: "The spreadsheet is empty.",
    noSheets:
      'No recognized sheets found. Expected a "Budget Entries" sheet (or one of: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).',
    noValidRows:
      "No valid rows found. Check that headers match the documented schema and Date / Amount / Type / Category are filled in.",
    row: {
      typeInvalid: 'Type must be "income" or "expense"',
      categoryUnknown: 'Category "{{category}}" is not a recognized category',
      categoryMissing: "Category is missing",
      categoryOneOf: "Category must be one of: {{list}}",
      amountOutOfRange: "Amount is missing or out of range",
      amountPositive: "Amount must be a positive number of at least 0.01",
      dateMissing: "Date is missing or could not be read",
      repaymentsFormat: 'Repayments must be "YYYY-MM-DD:amount" pairs separated by ";"',
      monthlyLimitPositive: "Monthly limit must be a positive number of at least 0.01",
      nameMissing: "Name is missing",
      balanceNonNegative: "Balance must be a number of 0 or more",
      originalBalancePositive: "Original balance must be a positive number of at least 0.01",
      rateRange: "Rate / APR must be between 0 and {{max}}",
      minPaymentNonNegative: "Minimum payment must be a number of 0 or more",
      debtIdMissing: "Debt ID is missing (the payment isn't linked to a debt)",
      targetAmountPositive: "Target amount must be a positive number of at least 0.01",
      currentAmountNonNegative: "Current amount must be a number of 0 or more",
      costBasisNonNegative: "Cost basis must be a number of 0 or more",
      symbolInvalid: 'Symbol "{{symbol}}" is not a valid ticker',
      symbolMissing: "Symbol is missing",
      sharesPositive: "Shares must be a positive number",
      proxyNeedsSymbol: "Proxy holding needs a Symbol (the proxy ticker)",
      proxyNeedsName: "Proxy holding needs a Name",
      proxyNeedsAnchorPrice: "Proxy holding needs a positive AnchorPrice",
      anchorValueNonNegative: "Anchor value must be a number of 0 or more",
      manualNeedsName: "Manual-value holding needs a Name",
      manualValueNonNegative: "Manual value must be a number of 0 or more",
    },
  },
  statement: {
    unreadable: "Could not read the file. Make sure it is a CSV export from your bank.",
    empty: "The file is empty.",
    tooManyRows:
      "The file has too many rows ({{rows}}). Maximum is {{max}} - export a shorter date range.",
    noDateColumn: "No transaction rows found - the file has no column with dates in it.",
    unreadableDate: 'Unreadable date "{{value}}"',
    unreadableAmount: "Unreadable amount",
    unreadableAmountValue: 'Unreadable amount "{{value}}"',
  },
  export: {
    dialogTitle: "Export BudgetArk Spreadsheet",
    shareTimeout: "Timed out preparing share sheet presentation.",
    loadTimeout: {
      budgetEntries: "Timed out loading budget entries for export.",
      budgetLimits: "Timed out loading budget limits for export.",
      debts: "Timed out loading debts for export.",
      payments: "Timed out loading payments for export.",
      savingsGoals: "Timed out loading savings goals for export.",
      assetAccounts: "Timed out loading asset accounts for export.",
      holdings: "Timed out loading holdings for export.",
      milestonePlan: "Timed out loading milestone plan for export.",
      businesses: "Timed out loading businesses for export.",
      people: "Timed out loading people for export.",
    },
  },
  backup: {
    collections: {
      debts: "debts",
      payments: "payments",
      budgetEntries: "budget entries",
      budgetLimits: "budget limits",
      savingsGoals: "savings goals",
      assetAccounts: "asset accounts",
      holdings: "holdings",
      netWorthSnapshots: "net worth snapshots",
      customCategories: "custom categories",
      businesses: "businesses",
      people: "people",
    },
    tooManyLimits: "Too many budget limits in month {{month}}. Maximum is {{max}}.",
    invalidLimits:
      'Import rejected: budget limits for {{month}} contain invalid records (first at item {{index}} of {{total}}). Each limit needs a valid "category" and a numeric "monthlyLimit".',
    invalidFormat: "Invalid {{label}} format. Expected an array.",
    tooManyItems: "Too many {{label}} items. Maximum allowed is {{max}}.",
    invalidRecords_one:
      "Import rejected: {{label}} contains {{count}} invalid record (first at item {{index}} of {{total}}).",
    invalidRecords_other:
      "Import rejected: {{label}} contains {{count}} invalid records (first at item {{index}} of {{total}}).",
    problem: "Problem: {{detail}}",
    userInvalid: "Import rejected: user profile format is invalid.",
    userMissingId: "Import rejected: user profile is missing a valid id.",
    payloadTooLarge: "Import rejected: payload is too large. Maximum total records is {{max}}.",
    fileTooLarge: "Import file is too large to be a BudgetArk export.",
    passwordRequired:
      "This export is password-encrypted. Please enter the password to decrypt it.",
    wrongPassword: "Decryption failed. The password may be incorrect.",
    malformedEnvelope: "Decryption failed. The encrypted export is malformed.",
    notJson: "The text is not valid JSON. Please paste a BudgetArk export.",
    notExport:
      "The data does not appear to be a BudgetArk export. Expected debts, payments, or budget data.",
    rollbackFailed:
      "Import failed during write and rollback could not restore all data (failed keys: {{failed}}). Some records may be in an inconsistent state - please reinstall the app and re-import your most recent backup before adding new data.",
    writeFailed: "Import failed during write. Your existing data has been restored.",
    pickerStuck:
      "The file picker is stuck from an earlier attempt. Please fully close and reopen the app, then try again.",
  },
} as const;
