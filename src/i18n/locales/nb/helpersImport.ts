/**
 * BudgetArk - Norske tekster: rene hjelpefunksjoner (import)
 * File: src/i18n/locales/nb/helpersImport.ts
 *
 * Norwegian (Bokmål) counterpart of en/helpersImport.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Sheet
 * titles, column and CSV header names quoted inside sentences stay English:
 * they are file contracts the importer matches verbatim.
 */

import type { Localized } from "../types";
import type { helpersImport as en } from "../en/helpersImport";

export const helpersImport: Localized<typeof en> = {
  file: {
    noFileSelected: "Ingen fil valgt.",
  },
  spreadsheet: {
    tooManyRows: "Regnearket har for mange rader ({{rows}}). Maks er {{max}}.",
    tooLarge: "Filen er for stor ({{mb}} MB). Maks er 5 MB.",
    unreadable:
      "Kunne ikke lese regnearket. Filen kan være skadet eller i et format som ikke støttes.",
    empty: "Regnearket er tomt.",
    noSheets:
      'Fant ingen kjente ark. Forventet et ark "Budget Entries" (eller ett av: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).',
    noValidRows:
      "Fant ingen gyldige rader. Sjekk at overskriftene følger det dokumenterte skjemaet og at Date / Amount / Type / Category er fylt ut.",
    row: {
      typeInvalid: 'Type må være "income" eller "expense"',
      categoryUnknown: "Kategorien «{{category}}» er ikke en kjent kategori",
      categoryMissing: "Kategori mangler",
      categoryOneOf: "Kategori må være en av: {{list}}",
      amountOutOfRange: "Beløp mangler eller er utenfor området",
      amountPositive: "Beløp må være et positivt tall på minst 0,01",
      dateMissing: "Dato mangler eller kunne ikke leses",
      repaymentsFormat: 'Repayments må være par på formen "ÅÅÅÅ-MM-DD:beløp" adskilt med ";"',
      monthlyLimitPositive: "Månedsgrense må være et positivt tall på minst 0,01",
      nameMissing: "Navn mangler",
      balanceNonNegative: "Saldo må være et tall på 0 eller mer",
      originalBalancePositive: "Opprinnelig saldo må være et positivt tall på minst 0,01",
      rateRange: "Rente må være mellom 0 og {{max}}",
      minPaymentNonNegative: "Minstebetaling må være et tall på 0 eller mer",
      debtIdMissing: "Debt ID mangler (betalingen er ikke knyttet til noen gjeldspost)",
      targetAmountPositive: "Målbeløp må være et positivt tall på minst 0,01",
      currentAmountNonNegative: "Nåværende beløp må være et tall på 0 eller mer",
      costBasisNonNegative: "Kostpris må være et tall på 0 eller mer",
      symbolInvalid: "Symbolet «{{symbol}}» er ikke en gyldig ticker",
      symbolMissing: "Symbol mangler",
      sharesPositive: "Shares må være et positivt tall",
      proxyNeedsSymbol: "En proxybeholdning trenger et Symbol (proxytickeren)",
      proxyNeedsName: "En proxybeholdning trenger et navn",
      proxyNeedsAnchorPrice: "En proxybeholdning trenger en positiv AnchorPrice",
      anchorValueNonNegative: "Ankerverdi må være et tall på 0 eller mer",
      manualNeedsName: "En beholdning med manuell verdi trenger et navn",
      manualValueNonNegative: "Manuell verdi må være et tall på 0 eller mer",
    },
  },
  statement: {
    unreadable: "Kunne ikke lese filen. Sjekk at det er en CSV-eksport fra banken din.",
    empty: "Filen er tom.",
    tooManyRows:
      "Filen har for mange rader ({{rows}}). Maks er {{max}} - eksporter et kortere datointervall.",
    noDateColumn: "Fant ingen transaksjonsrader - filen har ingen kolonne med datoer.",
    unreadableDate: "Uleselig dato «{{value}}»",
    unreadableAmount: "Uleselig beløp",
    unreadableAmountValue: "Uleselig beløp «{{value}}»",
  },
  export: {
    dialogTitle: "Eksporter BudgetArk-regneark",
    shareTimeout: "Tidsavbrudd under klargjøring av delingsmenyen.",
    loadTimeout: {
      budgetEntries: "Tidsavbrudd under innlasting av poster for eksport.",
      budgetLimits: "Tidsavbrudd under innlasting av forbruksgrenser for eksport.",
      debts: "Tidsavbrudd under innlasting av gjeldsposter for eksport.",
      payments: "Tidsavbrudd under innlasting av betalinger for eksport.",
      savingsGoals: "Tidsavbrudd under innlasting av sparemål for eksport.",
      assetAccounts: "Tidsavbrudd under innlasting av eiendelskontoer for eksport.",
      holdings: "Tidsavbrudd under innlasting av beholdning for eksport.",
      milestonePlan: "Tidsavbrudd under innlasting av milepælsplanen for eksport.",
      businesses: "Tidsavbrudd under innlasting av bedrifter for eksport.",
      people: "Tidsavbrudd under innlasting av personer for eksport.",
    },
  },
  backup: {
    collections: {
      debts: "gjeldsposter",
      payments: "betalinger",
      budgetEntries: "poster",
      budgetLimits: "forbruksgrenser",
      savingsGoals: "sparemål",
      assetAccounts: "eiendelskontoer",
      holdings: "beholdning",
      netWorthSnapshots: "øyeblikksbilder av nettoformuen",
      customCategories: "egne kategorier",
      businesses: "bedrifter",
      people: "personer",
    },
    tooManyLimits: "For mange forbruksgrenser i måned {{month}}. Maks er {{max}}.",
    invalidLimits:
      'Importen ble avvist: forbruksgrensene for {{month}} inneholder ugyldige poster (første ved element {{index}} av {{total}}). Hver grense trenger en gyldig "category" og et numerisk "monthlyLimit".',
    invalidFormat: "Ugyldig format for {{label}}. Forventet en liste.",
    tooManyItems: "For mange elementer under {{label}}. Maks er {{max}}.",
    invalidRecords_one:
      "Importen ble avvist: {{label}} inneholder {{count}} ugyldig post (ved element {{index}} av {{total}}).",
    invalidRecords_other:
      "Importen ble avvist: {{label}} inneholder {{count}} ugyldige poster (første ved element {{index}} av {{total}}).",
    problem: "Problem: {{detail}}",
    userInvalid: "Importen ble avvist: brukerprofilen har ugyldig format.",
    userMissingId: "Importen ble avvist: brukerprofilen mangler en gyldig id.",
    payloadTooLarge: "Importen ble avvist: innholdet er for stort. Maks er {{max}} poster totalt.",
    fileTooLarge: "Importfilen er for stor til å være en BudgetArk-eksport.",
    passwordRequired:
      "Denne eksporten er passordbeskyttet. Skriv inn passordet for å dekryptere den.",
    wrongPassword: "Dekrypteringen mislyktes. Passordet kan være feil.",
    malformedEnvelope: "Dekrypteringen mislyktes. Den krypterte eksporten er skadet.",
    notJson: "Teksten er ikke gyldig JSON. Lim inn en BudgetArk-eksport.",
    notExport:
      "Dataene ser ikke ut som en BudgetArk-eksport. Forventet gjeld, betalinger eller budsjettdata.",
    rollbackFailed:
      "Importen mislyktes under skriving, og tilbakerullingen kunne ikke gjenopprette alle data (mislykkede nøkler: {{failed}}). Noen poster kan være i en inkonsistent tilstand - installer appen på nytt og importer den nyeste sikkerhetskopien din før du legger til nye data.",
    writeFailed: "Importen mislyktes under skriving. De eksisterende dataene dine er gjenopprettet.",
    pickerStuck:
      "Filvelgeren har hengt seg fra et tidligere forsøk. Lukk appen helt, åpne den igjen og prøv på nytt.",
  },
};
