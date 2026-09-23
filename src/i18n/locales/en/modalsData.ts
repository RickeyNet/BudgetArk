/**
 * BudgetArk - English strings: shared modals (data)
 * File: src/i18n/locales/en/modalsData.ts
 *
 * Covers: MerchantRulesModal, BankStatementImportModal,
 * SpreadsheetSchemaModal, ManageCategoriesModal. TagPillPicker has no
 * strings of its own (its labels are passed in by these callers).
 *
 * Spreadsheet sheet titles ("Budget Entries") and column names ("ID",
 * "MonthlyLimit") are matched verbatim by the importer, so the schema
 * reference keeps them in English and translates only the explanations.
 */

export const modalsData = {
  rules: {
    title: "Merchant Rules",
    subtitleEmpty:
      "Rules remember what to do when a merchant's transactions import.",
    subtitleCount_one:
      "{{count}} remembered rule. Changes apply to future imports and anything still in your inbox - transactions you already skipped stay skipped.",
    subtitleCount_other:
      "{{count}} remembered rules. Changes apply to future imports and anything still in your inbox - transactions you already skipped stay skipped.",
    emptyBody:
      'No rules yet. In the Review Inbox, check "Always do this" when approving or skipping a transaction - the rule will appear here, where you can change or delete it anytime.',
    errors: {
      load: "Couldn't load your rules.",
      save: "Couldn't save this rule.",
      delete: "Couldn't delete this rule.",
    },
    /** Pill text in the "Applies to bill" picker. */
    billOption: "{{name}} · est. {{amount}}",
    debtOption: "{{name}} · min {{amount}}",
    /** One-line summary under the merchant name. */
    behavior: {
      alwaysSkip: "Always skip - never imports",
      logsDebtPayment: "Logs a payment on 💳 {{name}}",
      suggestsDebtPayment: "Suggests a payment on 💳 {{name}}",
      autoApproves: "Auto-approves {{icon}} {{category}}",
      suggests: "Suggests {{icon}} {{category}}",
      renameAs: 'as "{{name}}"',
      usedCount: "used {{count}}×",
      deletedDebt: "(deleted debt)",
      deletedBusiness: "(deleted business)",
      deletedPerson: "(deleted person)",
      deletedBill: "(deleted bill)",
    },
    editor: {
      whenImports: "WHEN THIS MERCHANT IMPORTS",
      alwaysSkipPill: "🚫 Always skip",
      autoApproveHelp:
        "Auto-approve without review - matching imports go straight into your budget with this rule's choices. Unchecked, they wait in the inbox with the category suggested.",
      renameLabel: "RENAME TO (OPTIONAL)",
      renamePlaceholder: "Keep the bank's description",
      businessLabel: "BUSINESS",
      personalPill: "Personal",
      peopleLabel: "PEOPLE",
      unassignedPill: "Unassigned",
      billLabel: "APPLIES TO BILL",
      notABillPill: "Not a bill",
      debtHelp:
        "Payments to this merchant are logged on the debt (Debts tab balance and history) instead of being filed as an expense. The category above is not used.",
      deleteRule: "Delete Rule",
      saving: "Saving...",
    },
    confirmDelete: {
      title: "Delete this rule?",
      bodyIgnore:
        'Future "{{merchant}}" transactions will import into your Review Inbox again. Ones already skipped won\'t come back.',
      bodyApprove:
        'Future "{{merchant}}" transactions will wait in your Review Inbox for manual approval. Entries already created are not changed.',
      bodySuggest:
        'Future "{{merchant}}" transactions will arrive without a suggested category. Approved entries are not changed.',
      keep: "Keep",
      deleting: "Deleting...",
    },
  },
  import: {
    title: "Import bank statement",
    subtitle:
      "Tell BudgetArk which columns to read. It has made a guess - check the preview below and fix anything that looks wrong.",
    accountLabelSection: "ACCOUNT LABEL",
    accountLabelPlaceholder: "Bank statement",
    accountLabelHint:
      "Shown on each row in the Review Inbox so you can tell this import apart from your bank sync. Keep the same label when you re-import a file from this bank - matching labels let BudgetArk skip the rows you already imported.",
    columnsSection: "COLUMNS",
    headerlessHint:
      "This file has no header row, so columns are numbered. Match them up using the preview.",
    field: {
      date: "Date",
      description: "Description",
      amount: "Amount",
      debit: "Money out (debit)",
      credit: "Money in (credit)",
    },
    chooseColumn: "Choose column",
    fieldA11y: "{{label}}: {{value}}",
    fieldA11yEmpty: "{{label}}: choose a column",
    layout: {
      signed: "One amount column",
      split: "Separate debit / credit",
    },
    positiveIsOutflow: "Positive numbers are charges (typical for credit cards)",
    previewSection: "PREVIEW",
    noDescription: "(no description)",
    previewReady_one: "{{count}} transaction ready",
    previewReady_other: "{{count}} transactions ready",
    previewSkipped_one: " · {{count}} unreadable row skipped",
    previewSkipped_other: " · {{count}} unreadable rows skipped",
    noPreviewComplete:
      "No transactions read with these columns yet. Try a different date or amount column.",
    noPreviewIncomplete:
      "Pick a date, a description and an amount column to see a preview.",
    remember: "Remember these columns for next time (this bank)",
    importButton: "Import",
    importing: "Importing…",
    pickerTitle: "Choose the column",
    errors: {
      noneRead:
        "No transactions could be read with these columns. Check that the date and amount columns are right.",
      generic: "Something went wrong importing the statement.",
    },
    summary: {
      added_one: "{{count}} added to the Review Inbox",
      added_other: "{{count}} added to the Review Inbox",
      autoApproved_one: "{{count}} auto-approved by your rules",
      autoApproved_other: "{{count}} auto-approved by your rules",
      autoDismissed_one: "{{count}} skipped by your rules",
      autoDismissed_other: "{{count}} skipped by your rules",
      alreadyKnown_one: "{{count}} already imported",
      alreadyKnown_other: "{{count}} already imported",
      withParts: "{{label}}: {{parts}}.",
      nothingNew: "{{label}}: nothing new to import - every row was already here.",
      flaggedDuplicates_one:
        "{{count}} looks like a transaction you already have - it is flagged in the inbox so you can skip it.",
      flaggedDuplicates_other:
        "{{count}} look like transactions you already have - they are flagged in the inbox so you can skip them.",
      deferred_one:
        "{{count}} did not fit (the inbox holds 500 at a time). Approve or clear some, then import this file again to pick up the rest.",
      deferred_other:
        "{{count}} did not fit (the inbox holds 500 at a time). Approve or clear some, then import this file again to pick up the rest.",
      rowsSkipped_one: "{{count}} row skipped (unreadable date or amount)",
      rowsSkipped_other: "{{count}} rows skipped (unreadable date or amount)",
      zeroRows_one: "{{count}} zero-amount row left out",
      zeroRows_other: "{{count}} zero-amount rows left out",
    },
  },
  schema: {
    title: "Spreadsheet Format",
    subtitle:
      "Headers are matched case-insensitively. CSV files contain only the Budget Entries sheet. Excel files can contain any of the sheets below.",
    tipLabel: "TIP",
    tipBefore: "Easiest way to learn the format: tap ",
    tipAction: "Export Spreadsheet",
    tipAfter:
      " (XLSX), open the file in Excel or Google Sheets, edit, then re-import. IDs round-trip so existing rows update in place. Even with an empty app, the export is a ready-made blank template - every sheet has the correct headers, just no rows yet.",
    presets: {
      title: "Coming from YNAB, Mint or Monarch?",
      body: "Import their transaction CSV as-is. BudgetArk recognizes the file by its headers and maps the columns for you.",
      ynab: "• YNAB: Payee, Outflow, Inflow (Category, Memo)",
      mint: "• Mint: Description, Amount, Transaction Type (Category, Notes)",
      monarch: "• Monarch: Merchant, Amount, Original Statement (Category, Notes)",
      categories:
        "• Categories map to BudgetArk's by keyword (Groceries → Grocery); anything else arrives as a custom category under its own name.",
      transfers:
        "• Transfers between your own accounts are left out - they aren't income or spending. The import summary says how many.",
    },
    limits: {
      title: "Limits",
      fileSize: "• File size: 5 MB max",
      rowsPerSheet: "• Up to 5,000 rows per sheet",
      recordsTotal: "• Up to 6,000 records total per import",
      skipped:
        "• Rows missing required fields are silently skipped (you'll see a count after import).",
    },
    allowedCategories: {
      title: "Allowed Categories",
      body: "Used for both Budget Entries and Budget Limits. Match exactly.",
    },
    required: "Required",
    optional: "Optional",
    csvTag: "CSV",
    excelOnlyTag: "Excel only",
    sheets: {
      entries: {
        description:
          "The core sheet - required for both CSV and Excel imports. CSVs only contain this sheet.",
        footer:
          "Receipt photos never round-trip through spreadsheets - photo files stay on the device that took them.",
        columns: {
          id: "Auto-generated UUID if missing. Keep it for round-trip safety.",
          date: "ISO YYYY-MM-DD, full ISO timestamp, US M/D/YYYY, or Excel native date.",
          type: "Must be income or expense (case-insensitive).",
          category: "Must match an allowed category exactly (see list below).",
          amount: "Positive number. Strips $ and commas. Treats (50.00) as -50.00.",
          description: "Optional note. Up to 220 characters.",
          recurring: "yes / no / true / false / 1 / 0.",
          linkedAccountId: "Asset account UUID for savings entries.",
          businessId:
            "UUID from the Businesses sheet for business-tagged expenses. Round-trips.",
          business: "Readable business name. Export-only - ignored on import.",
          personId:
            "UUID from the People sheet for expenses assigned to a person (the first of them when shared). Round-trips.",
          personIds:
            "Every person a shared expense is assigned to, as ;-separated UUIDs. Round-trips.",
          person: "Readable person name(s). Export-only - ignored on import.",
          private: "yes marks a private entry that never syncs to your partner. Round-trips.",
        },
      },
      limits: {
        description:
          "Per-category monthly spending caps. Imported limits land in the current month.",
        columns: {
          category: "One of the allowed categories.",
          monthlyLimit: "Positive number.",
        },
      },
      debts: {
        description: "Existing debts (cards, loans, etc.).",
        columns: {
          id: "Auto-generated if missing.",
          name: "Up to 80 characters.",
          balance: "Current remaining balance, ≥ 0.",
          originalBalance: "Starting balance, ≥ 0.01.",
          rate: "APR as a percentage, 0-200.",
          minPayment: "Minimum monthly payment, ≥ 0.",
          owner: "mine / partner / joint. Defaults to mine.",
          debtClass:
            "personal_credit / car / house. (Legacy car_house splits to house when the name mentions a mortgage, otherwise car.)",
          debtClassSource: "manual / inferred.",
          goalDate: "Optional payoff target date.",
          createdAt: "ISO timestamp; defaults to now.",
        },
      },
      payments: {
        description: "Individual payments applied to a debt.",
        columns: {
          id: "Auto-generated if missing.",
          debtId: "Must match a row's ID in the Debts sheet.",
          amount: "Positive number, ≥ 0.01.",
          date: "ISO date or US M/D/YYYY.",
        },
      },
      savingsGoals: {
        description: "Tracked savings goals.",
        columns: {
          id: "Auto-generated if missing.",
          name: "Up to 80 characters.",
          category: "emergency_fund / travel / home / car / education / other.",
          targetAmount: "Positive number.",
          currentAmount: "Number, ≥ 0.",
          targetDate: "Optional target date.",
          priority:
            "Purchase planner 'My order' rank (0 = first). Blank when never ranked. Round-trips.",
          usesPerMonth:
            "Cost-per-use input: expected uses per month (1-10,000). Blank when not tracked.",
          usefulLifeYears:
            "Cost-per-use input: years you expect to keep it (up to 100). Blank when not tracked.",
          createdAt: "ISO timestamp; defaults to now.",
          updatedAt:
            "ISO timestamp of last edit. Round-tripped so partner sync keeps the newer copy.",
        },
      },
      assetAccounts: {
        description:
          "Persistent account balances (savings, retirement, HSA, investment).",
        columns: {
          id: "Auto-generated if missing.",
          name: "Up to 80 characters.",
          category: "savings / retirement / hsa / investment / other.",
          balance: "Number, ≥ 0.",
          emergencyFund:
            "yes marks a savings account designated as your emergency fund. Round-trips.",
          createdAt: "ISO timestamp; defaults to now.",
        },
      },
      businesses: {
        description:
          "Businesses that expense entries can be tagged with (via BusinessId). Only live businesses are exported.",
        columns: {
          id: "Auto-generated if missing. Budget entries reference this via BusinessId.",
          name: "Up to 40 characters.",
          createdAt: "ISO timestamp; defaults to now.",
        },
      },
      people: {
        description:
          "People that spending can be assigned to (via PersonId). Only live people are exported.",
        columns: {
          id: "Auto-generated if missing. Budget entries reference this via PersonId.",
          name: "Up to 40 characters.",
          createdAt: "ISO timestamp; defaults to now.",
        },
      },
      holdings: {
        description:
          "Stock / ETF positions. Prices are fetched on-device and never imported - only the position is.",
        columns: {
          id: "Auto-generated if missing.",
          symbol: "Ticker, e.g. AAPL or VTI. Up to 12 chars (letters, digits, . and -).",
          shares: "Positive number. Fractional shares allowed.",
          costBasis: "Total dollars invested, ≥ 0. Used for gain/loss.",
          createdAt: "ISO timestamp; defaults to now.",
        },
      },
    },
  },
  categories: {
    title: "Custom Categories",
    subtitle:
      "Add your own budget categories. They work everywhere built-in ones do - entries, limits, charts, and reports.",
    nameLabel: "NAME",
    namePlaceholder: "e.g. Hobbies, Pets, Childcare",
    iconLabel: "ICON",
    pickIconA11y: "Pick icon {{glyph}}",
    bucketLabel: "50/30/20 BUCKET",
    addButton: "Add Category",
    adding: "Adding…",
    yourCategories: "YOUR CATEGORIES ({{count}})",
    emptyCustom: "No custom categories yet. Add one above.",
    deleteA11y: "Delete {{name}}",
    builtInLabel: "BUILT-IN CATEGORIES",
    builtInHelp:
      "Hide the ones you never use. Hidden categories leave the pickers on this phone; existing entries keep them.",
    alwaysShown: "Always shown",
    restore: "Restore",
    restoreA11y: "Restore {{name}}",
    hide: "Hide",
    hideA11y: "Hide {{name}}",
    confirmDelete: {
      title: "Delete category?",
      body: '"{{name}}" will be removed from the picker. Existing entries keep this category, they just lose the custom icon.',
    },
    confirmHide: {
      title: "Hide category?",
      body: '"{{name}}" leaves the pickers, the Limits sheet and the bulk tools on this phone. Entries already filed under it keep it and still show wherever they have spending. Restore it here any time.',
    },
  },
} as const;
