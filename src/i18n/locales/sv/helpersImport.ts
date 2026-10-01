/**
 * BudgetArk - Svenska texter: rena hjälpfunktioner (import)
 * File: src/i18n/locales/sv/helpersImport.ts
 *
 * Swedish counterpart of en/helpersImport.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Sheet titles, column and
 * CSV header names quoted inside sentences stay English: they are file
 * contracts the importer matches verbatim.
 */

import type { Localized } from "../types";
import type { helpersImport as en } from "../en/helpersImport";

export const helpersImport: Localized<typeof en> = {
  file: {
    noFileSelected: "Ingen fil vald.",
  },
  spreadsheet: {
    tooManyRows: "Kalkylbladet har för många rader ({{rows}}). Max är {{max}}.",
    tooLarge: "Filen är för stor ({{mb}} MB). Max är 5 MB.",
    unreadable:
      "Kunde inte läsa kalkylbladet. Filen kan vara skadad eller ha ett format som inte stöds.",
    empty: "Kalkylbladet är tomt.",
    noSheets:
      'Inga kända blad hittades. Förväntade ett blad "Budget Entries" (eller ett av: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).',
    noValidRows:
      "Inga giltiga rader hittades. Kontrollera att rubrikerna följer det dokumenterade schemat och att Date / Amount / Type / Category är ifyllda.",
    row: {
      typeInvalid: 'Type måste vara "income" eller "expense"',
      categoryUnknown: 'Kategorin "{{category}}" är inte en känd kategori',
      categoryMissing: "Kategori saknas",
      categoryOneOf: "Kategori måste vara en av: {{list}}",
      amountOutOfRange: "Belopp saknas eller ligger utanför intervallet",
      amountPositive: "Belopp måste vara ett positivt tal på minst 0,01",
      dateMissing: "Datum saknas eller kunde inte läsas",
      repaymentsFormat: 'Repayments måste vara par i formatet "ÅÅÅÅ-MM-DD:belopp" åtskilda med ";"',
      monthlyLimitPositive: "Månadsgräns måste vara ett positivt tal på minst 0,01",
      nameMissing: "Namn saknas",
      balanceNonNegative: "Saldo måste vara ett tal på 0 eller mer",
      originalBalancePositive: "Ursprungligt saldo måste vara ett positivt tal på minst 0,01",
      rateRange: "Ränta måste ligga mellan 0 och {{max}}",
      minPaymentNonNegative: "Minimibetalning måste vara ett tal på 0 eller mer",
      debtIdMissing: "Debt ID saknas (betalningen är inte kopplad till någon skuld)",
      targetAmountPositive: "Målbelopp måste vara ett positivt tal på minst 0,01",
      currentAmountNonNegative: "Aktuellt belopp måste vara ett tal på 0 eller mer",
      costBasisNonNegative: "Anskaffningsvärde måste vara ett tal på 0 eller mer",
      symbolInvalid: 'Symbolen "{{symbol}}" är inte en giltig ticker',
      symbolMissing: "Symbol saknas",
      sharesPositive: "Shares måste vara ett positivt tal",
      proxyNeedsSymbol: "Ett proxyinnehav behöver en Symbol (proxytickern)",
      proxyNeedsName: "Ett proxyinnehav behöver ett namn",
      proxyNeedsAnchorPrice: "Ett proxyinnehav behöver ett positivt AnchorPrice",
      anchorValueNonNegative: "Ankarvärde måste vara ett tal på 0 eller mer",
      manualNeedsName: "Ett innehav med manuellt värde behöver ett namn",
      manualValueNonNegative: "Manuellt värde måste vara ett tal på 0 eller mer",
    },
  },
  statement: {
    unreadable: "Kunde inte läsa filen. Kontrollera att det är en CSV-export från din bank.",
    empty: "Filen är tom.",
    tooManyRows:
      "Filen har för många rader ({{rows}}). Max är {{max}} - exportera ett kortare datumintervall.",
    noDateColumn: "Inga transaktionsrader hittades - filen har ingen kolumn med datum.",
    unreadableDate: 'Oläsligt datum "{{value}}"',
    unreadableAmount: "Oläsligt belopp",
    unreadableAmountValue: 'Oläsligt belopp "{{value}}"',
  },
  export: {
    dialogTitle: "Exportera BudgetArk-kalkylblad",
    shareTimeout: "Tidsgränsen gick ut när delningsmenyn skulle öppnas.",
    loadTimeout: {
      budgetEntries: "Tidsgränsen gick ut vid inläsning av poster för export.",
      budgetLimits: "Tidsgränsen gick ut vid inläsning av utgiftsgränser för export.",
      debts: "Tidsgränsen gick ut vid inläsning av skulder för export.",
      payments: "Tidsgränsen gick ut vid inläsning av betalningar för export.",
      savingsGoals: "Tidsgränsen gick ut vid inläsning av sparmål för export.",
      assetAccounts: "Tidsgränsen gick ut vid inläsning av tillgångskonton för export.",
      holdings: "Tidsgränsen gick ut vid inläsning av innehav för export.",
      milestonePlan: "Tidsgränsen gick ut vid inläsning av milstolpeplanen för export.",
      businesses: "Tidsgränsen gick ut vid inläsning av företag för export.",
      people: "Tidsgränsen gick ut vid inläsning av personer för export.",
    },
  },
  backup: {
    collections: {
      debts: "skulder",
      payments: "betalningar",
      budgetEntries: "poster",
      budgetLimits: "utgiftsgränser",
      savingsGoals: "sparmål",
      assetAccounts: "tillgångskonton",
      holdings: "innehav",
      netWorthSnapshots: "ögonblicksbilder av nettoförmögenheten",
      customCategories: "egna kategorier",
      businesses: "företag",
      people: "personer",
    },
    tooManyLimits: "För många utgiftsgränser i månad {{month}}. Max är {{max}}.",
    invalidLimits:
      'Importen avvisades: utgiftsgränserna för {{month}} innehåller ogiltiga poster (första vid post {{index}} av {{total}}). Varje gräns behöver en giltig "category" och ett numeriskt "monthlyLimit".',
    invalidFormat: "Ogiltigt format för {{label}}. Förväntade en lista.",
    tooManyItems: "För många poster under {{label}}. Max är {{max}}.",
    invalidRecords_one:
      "Importen avvisades: {{label}} innehåller {{count}} ogiltig post (vid post {{index}} av {{total}}).",
    invalidRecords_other:
      "Importen avvisades: {{label}} innehåller {{count}} ogiltiga poster (första vid post {{index}} av {{total}}).",
    problem: "Problem: {{detail}}",
    userInvalid: "Importen avvisades: användarprofilens format är ogiltigt.",
    userMissingId: "Importen avvisades: användarprofilen saknar ett giltigt id.",
    payloadTooLarge: "Importen avvisades: filen är för stor. Max är {{max}} poster totalt.",
    fileTooLarge: "Importfilen är för stor för att vara en BudgetArk-export.",
    passwordRequired:
      "Den här exporten är lösenordsskyddad. Ange lösenordet för att avkryptera den.",
    wrongPassword: "Avkrypteringen misslyckades. Lösenordet kan vara fel.",
    malformedEnvelope: "Avkrypteringen misslyckades. Den krypterade exporten är skadad.",
    notJson: "Texten är inte giltig JSON. Klistra in en BudgetArk-export.",
    notExport:
      "Datan ser inte ut som en BudgetArk-export. Förväntade skulder, betalningar eller budgetdata.",
    rollbackFailed:
      "Importen misslyckades under skrivningen och återställningen kunde inte återskapa all data (misslyckade nycklar: {{failed}}). Vissa poster kan vara inkonsekventa - installera om appen och importera din senaste säkerhetskopia innan du lägger till ny data.",
    writeFailed: "Importen misslyckades under skrivningen. Din befintliga data har återställts.",
    pickerStuck:
      "Filväljaren har hängt sig sedan ett tidigare försök. Stäng appen helt, öppna den igen och försök på nytt.",
  },
};
