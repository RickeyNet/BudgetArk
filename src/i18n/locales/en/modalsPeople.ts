/**
 * BudgetArk - English strings: shared modals (people)
 * File: src/i18n/locales/en/modalsPeople.ts
 *
 * Covers: LoansModal, BusinessReportModal, PersonReportModal,
 * ManagePeopleModal, ManageBusinessesModal, AttachmentSection,
 * AttachmentViewerModal (people, businesses, receipts). Category names in
 * the reports go through categoryLabel(); person / business names are
 * user data and pass through untouched.
 */

export const modalsPeople = {
  loans: {
    title: "Owed to You",
    subtitle:
      "Money you've lent out. Mark an expense \"lent to\" someone when you log it (or in the Review Inbox), then record what they pay back here.",
    errors: {
      load: "Couldn't load your loans.",
      amountRequired: "Enter the amount they paid.",
      overpay: "That's more than the {{amount}} still owed.",
      dateFormat: "Date must look like 2026-09-15.",
      recordFailedReopen: "Couldn't record that payment - reopen and try again.",
      recordFailed: "Couldn't record the payment.",
      removeFailed: "Couldn't remove the payment.",
    },
    loanMeta: "{{date}} · lent {{amount}}",
    repaidBack: "{{amount}} back",
    paidBack: "Paid back",
    repaymentLine: "↳ {{date}} · {{amount}}",
    removeRepaymentA11y: "Remove the {{amount}} payment",
    logPaymentA11y: "Log a payment from {{name}}",
    borrowerFallback: "the borrower",
    logPayment: "Log payment",
    form: {
      amount: "AMOUNT",
      amountPlaceholder: "0.00",
      receivedOn: "RECEIVED ON",
      datePlaceholder: "YYYY-MM-DD",
      note: "NOTE (OPTIONAL)",
      notePlaceholder: "Cash, Venmo, ...",
      saving: "Saving...",
      save: "Save payment",
      paidInFullA11y: "Fill in the full amount still owed",
      paidInFull: "Paid in full · {{amount}}",
    },
    allPaidBack: "All paid back",
    borrowerMeta_one: "{{lent}} lent across {{count}} loan",
    borrowerMeta_other: "{{lent}} lent across {{count}} loans",
    borrowerRepaid: "{{amount}} paid back",
    stillOwed: "STILL OWED TO YOU",
    totalSub: "{{lent}} lent · {{repaid}} paid back",
    loading: "Loading…",
    empty:
      "Nothing lent out yet. When you add an expense on the Budget tab, fill in \"Lent to someone?\" with the person's name and it will show up here.",
    hideSettled: "Hide paid-back loans",
    showSettled_one: "Show {{count}} paid-back loan",
    showSettled_other: "Show {{count}} paid-back loans",
  },
  report: {
    previousYear: "Previous year",
    nextYear: "Next year",
    loading: "Loading…",
    deletedSuffix: "(deleted)",
    expenses_one: "{{count}} expense",
    expenses_other: "{{count}} expenses",
    exporting: "Exporting…",
    exportCsv: "Export CSV",
    exportFailed: {
      title: "Export failed",
      csv: "Could not create the CSV file.",
      zip: "Could not create the zip file.",
    },
  },
  businessReport: {
    title: "Business Expenses",
    subtitle:
      "Everything tagged to a business, by calendar year. Recurring bills count once per month they hit, same as the Budget screen.",
    shareTitle: "Export Business Expenses",
    grandTotal: "TOTAL BUSINESS EXPENSES · {{year}}",
    empty:
      "No business expenses in {{year}}. Tag an expense to a business when adding it on the Budget tab (create businesses under Profile → Businesses).",
    withReceipt: "{{count}} with receipt",
    receipts: {
      shareTitle: "Export Receipt Photos",
      buttonA11y: "Export receipt photos as a zip archive",
      button: "🧾 Export Receipt Photos (ZIP)",
      preparing: "Preparing zip…",
      hint: "File names match the CSV rows (date_business_amount.jpg).",
      none: {
        title: "No receipts",
        message: "No business expenses in {{year}} have receipt photos.",
      },
      confirm: {
        title: "Export receipt photos?",
        message_one:
          "This creates an unencrypted zip of up to {{count}} receipt photo for {{year}}, named to match the CSV rows, for sharing (e.g. with your accountant). It isn't protected by BudgetArk's encryption once shared.",
        message_other:
          "This creates an unencrypted zip of up to {{count}} receipt photos for {{year}}, named to match the CSV rows, for sharing (e.g. with your accountant). It isn't protected by BudgetArk's encryption once shared.",
        export: "Export",
      },
      noneOnDevice: {
        title: "No photos on this device",
        message:
          "Every receipt photo for this year lives on your partner's device - photos never sync, so export the zip from there.",
      },
      skipped: {
        title: "Some photos skipped",
        message_one:
          "{{count}} photo lives on your partner's device (or couldn't be read) and was not included.",
        message_other:
          "{{count}} photos live on your partner's device (or couldn't be read) and were not included.",
      },
    },
  },
  personReport: {
    title: "Person Spending",
    subtitle:
      "Everything assigned to a person, by calendar year. Recurring bills count once per month they hit, same as the Budget screen.",
    shareTitle: "Export Person Spending",
    grandTotal: "TOTAL ASSIGNED SPENDING · {{year}}",
    empty:
      "No assigned spending in {{year}}. Assign an expense to a person when adding it on the Budget tab (add people under Profile → People).",
  },
  manage: {
    name: "NAME",
    saving: "Saving…",
    saveName: "Save Name",
    rename: "Rename",
    renameA11y: "Rename {{name}}",
    deleteA11y: "Delete {{name}}",
    errors: {
      save: "Couldn't save. Please try again.",
    },
  },
  people: {
    title: "People",
    subtitle:
      "Add the people in your household (or anyone you track spending for). Assign expenses to them when adding entries or approving imported transactions, so it's clear who spent what.",
    renameLabel: "RENAME PERSON",
    placeholder: "e.g. Sam, Alex, the kids",
    add: "Add Person",
    listHeader: "YOUR PEOPLE ({{count}})",
    empty: "No people yet. Add one above.",
    noEntries: "No assigned entries",
    entries_one: "{{count}} assigned entry",
    entries_other: "{{count}} assigned entries",
    deleteConfirm: {
      title: "Delete person?",
      message: "\"{{name}}\" will be removed from the picker.",
      entryNote_one:
        "{{count}} entry keeps the assignment and will show as \"(deleted person)\".",
      entryNote_other:
        "{{count}} entries keep the assignment and will show as \"(deleted person)\".",
    },
    errors: {
      load: "Couldn't load your people. Close and try again.",
      delete: "Couldn't delete this person. Please try again.",
    },
  },
  businesses: {
    title: "Businesses",
    subtitle:
      "Add the businesses you spend for (a company, side gig, or freelance client). Tag expenses to them when adding entries, then pull a per-business report at tax time.",
    renameLabel: "RENAME BUSINESS",
    placeholder: "e.g. Acme LLC, Etsy shop, Consulting",
    add: "Add Business",
    listHeader: "YOUR BUSINESSES ({{count}})",
    empty: "No businesses yet. Add one above.",
    noEntries: "No tagged entries",
    entries_one: "{{count}} tagged entry",
    entries_other: "{{count}} tagged entries",
    deleteConfirm: {
      title: "Delete business?",
      message: "\"{{name}}\" will be removed from the picker.",
      entryNote_one:
        "{{count}} entry keeps the tag and will show as \"(deleted business)\" in reports.",
      entryNote_other:
        "{{count}} entries keep the tag and will show as \"(deleted business)\" in reports.",
    },
    errors: {
      load: "Couldn't load your businesses. Close and try again.",
      delete: "Couldn't delete this business. Please try again.",
    },
  },
  attachments: {
    label: "RECEIPT PHOTOS ({{count}}/{{max}})",
    hint: "Photos are stored encrypted on this device only - they don't sync to your partner or leave with exports.",
    viewA11y: "View receipt photo",
    removeA11y: "Remove receipt photo",
    onPartnerDevice: "On partner's device",
    adding: "Adding…",
    takePhoto: "📷 Take Photo",
    choosePhoto: "🖼️ Choose Photo",
    cameraPermission: {
      title: "Camera access needed",
      message: "Allow camera access in your device Settings to photograph receipts.",
    },
    secureStorage: {
      title: "Secure storage unavailable",
      message:
        "BudgetArk can't access this device's secure keystore, so receipt photos can't be stored encrypted. Photos are disabled rather than saved unprotected.",
    },
    addFailed: {
      title: "Couldn't add photo",
      message: "Something went wrong while processing the image. Please try again.",
    },
  },
  viewer: {
    counter: "{{current}} of {{total}}",
    closeA11y: "Close photo viewer",
    missing:
      "This photo lives on the device that took it. Receipt photos don't transfer during sync.",
    removeA11y: "Remove this receipt photo",
    remove: "Remove Photo",
  },
} as const;
