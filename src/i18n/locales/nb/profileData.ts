/**
 * BudgetArk - Norske tekster: Profil (data)
 * File: src/i18n/locales/nb/profileData.ts
 *
 * Norwegian (Bokmål) counterpart of en/profileData.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Spreadsheet column names
 * (Date, Type, Category, Amount) are literal file headers and stay English.
 */

import type { Localized } from "../types";
import type { profileData as en } from "../en/profileData";

export const profileData: Localized<typeof en> = {
  sectionTitle: "DATA",
  rows: {
    export: {
      title: "Eksporter",
      subtitle: "Kryptert sikkerhetskopi eller regneark",
    },
    import: {
      title: "Importer",
      subtitle: "Sikkerhetskopi, regneark eller kontoutskrift",
    },
    autoBackup: { title: "Automatiske sikkerhetskopier" },
    reset: { title: "Nullstill alle data" },
  },
  exportMenu: {
    title: "Eksporter",
    backup: {
      title: "Kryptert sikkerhetskopi",
      subtitle: "Alt, som en passordbeskyttet fil",
    },
    spreadsheet: {
      title: "Regneark",
      subtitle: "CSV eller Excel for Google Sheets / Excel",
    },
  },
  importMenu: {
    title: "Importer",
    backupFile: {
      title: "Sikkerhetskopi fra fil",
      subtitle: "Gjenopprett en BudgetArk-eksport",
    },
    backupPaste: {
      title: "Lim inn sikkerhetskopitekst",
      subtitle: "JSON kopiert fra en eksport",
    },
    spreadsheet: {
      title: "Regneark",
      subtitle: "Fra en CSV- eller Excel-fil",
    },
    bankStatement: {
      title: "Kontoutskrift",
      subtitle: "En CSV fra banken din → gjennomgangsinnboksen",
    },
  },
  autoBackup: {
    loading: "Laster...",
    unavailable: "Utilgjengelig",
    lastOn: "sist {{date}}",
    noneYet: "ingen enda",
    summaryEnabled: "{{cadence}} · {{last}}",
    summaryOff: "Av · {{last}}",
    cadence: { weekly: "Ukentlig", monthly: "Månedlig" },
  },
  export: {
    passwordTooShort: {
      title: "Passordet er for kort",
      message:
        "Skriv inn et passord med minst 4 tegn, eller slå av krypteringen.",
    },
    failed: {
      title: "Eksporten mislyktes",
      message: "Noe gikk galt under eksporten av dataene dine.",
    },
    spinner: {
      title: "Forbereder eksporten din…",
      subtitle: "Krypteringen kan ta noen sekunder. Hold appen åpen.",
    },
    dialog: {
      title: "Eksporter mine data",
      encryptedNote: "Dataene dine krypteres med et passord før de deles.",
      plaintextNote:
        "Dataene dine eksporteres som ukryptert JSON. Alle med tilgang til filen kan lese de økonomiske opplysningene dine.",
      encryptToggle: "Krypter med passord",
      passwordPlaceholder: "Skriv inn eksportpassord",
      encryptAndShare: "Krypter & del",
      sharePlaintext: "Del ukryptert",
    },
  },
  import: {
    complete: { title: "Importen er fullført" },
    failed: {
      title: "Importen mislyktes",
      message: "Noe gikk galt under importen av dataene dine.",
    },
    labelMerged: "Slo sammen",
    labelImported: "Importerte",
    summary: "{{label}} {{parts}}.",
    listSeparator: ", ",
    counts: {
      debts_one: "{{count}} gjeldspost",
      debts_other: "{{count}} gjeldsposter",
      payments_one: "{{count}} betaling",
      payments_other: "{{count}} betalinger",
      budgetEntries_one: "{{count}} budsjettpost",
      budgetEntries_other: "{{count}} budsjettposter",
      budgetLimits_one: "{{count}} budsjettgrense",
      budgetLimits_other: "{{count}} budsjettgrenser",
      limits_one: "{{count}} grense",
      limits_other: "{{count}} grenser",
      savingsGoals_one: "{{count}} sparemål",
      savingsGoals_other: "{{count}} sparemål",
      assetAccounts_one: "{{count}} eiendelskonto",
      assetAccounts_other: "{{count}} eiendelskontoer",
      holdings_one: "{{count}} beholdning",
      holdings_other: "{{count}} beholdninger",
      netWorthSnapshots_one: "{{count}} øyeblikksbilde av nettoformuen",
      netWorthSnapshots_other: "{{count}} øyeblikksbilder av nettoformuen",
      customCategories_one: "{{count}} egen kategori",
      customCategories_other: "{{count}} egne kategorier",
      businesses_one: "{{count}} bedrift",
      businesses_other: "{{count}} bedrifter",
      people_one: "{{count}} person",
      people_other: "{{count}} personer",
    },
    extras: {
      milestonePlan: "milepælsplan",
      payoffStrategy: "nedbetalingsstrategi",
    },
    alsoRestored: "\nGjenopprettet også: {{extras}}.",
    staleNote:
      "\n\nMerk: Denne eksporten er {{days}} dager gammel. Noen data kan være utdaterte.",
    password: {
      title: "Kryptert eksport",
      message:
        "Denne eksporten ble kryptert med et passord. Skriv inn passordet for å dekryptere den.",
      placeholder: "Skriv inn passord",
      confirm: "Dekrypter & importer",
    },
    mode: {
      title: "Importer fra fil",
      message:
        "Slå sammen beholder de eksisterende dataene dine og legger til de importerte. Erstatt sletter de nåværende dataene dine først.",
      merge: "Slå sammen",
      replace: "Erstatt",
    },
    paste: {
      title: "Lim inn eksportdata",
      hint: "Lim inn JSON-teksten du kopierte fra «Eksporter mine data».",
      placeholder: "Lim inn JSON her...",
      empty: {
        title: "Tomt",
        message: "Lim inn de eksporterte JSON-dataene dine først.",
      },
    },
  },
  spreadsheet: {
    formatReference: "Vis formatreferanse →",
    export: {
      dialog: {
        title: "Eksporter regneark",
        message:
          "CSV eksporterer bare budsjettposter - enklest for Google Sheets og raske endringer. Excel eksporterer en komplett arbeidsbok med flere ark (budsjettposter, budsjettgrenser, gjeldsposter, betalinger, sparemål, eiendelskontoer) som en fullstendig sikkerhetskopi.",
        csv: "CSV",
        excel: "Excel",
      },
      readyTitle: "{{format}}-eksport klar",
      csvNote:
        "CSV-eksporter inneholder bare budsjettposter. Bruk Excel-formatet for en fullstendig sikkerhetskopi.",
      excelNote_one:
        "Arbeidsboken ble lagret med {{count}} budsjettpost pluss gjeldsposter, betalinger, sparemål og eiendelskontoer.",
      excelNote_other:
        "Arbeidsboken ble lagret med {{count}} budsjettposter pluss gjeldsposter, betalinger, sparemål og eiendelskontoer.",
      partialNote:
        "\n\nDelvis eksport: noen deler kunne ikke leses og ble hoppet over ({{sections}}).",
      failedMessage: "Noe gikk galt under eksporten av regnearket.",
    },
    import: {
      dialog: {
        title: "Importer regneark",
        message:
          "Velg en .csv- eller .xlsx-fil. Obligatoriske kolonner: Date, Type (income/expense), Category, Amount. Slå sammen beholder de eksisterende dataene dine; Erstatt sletter dem først.",
        tip: "Tips: trykk først på «Eksporter regneark» for å se det nøyaktige formatet, endre deretter og importer igjen. ID-er følger med, så eksisterende rader oppdateres på plass.",
      },
      recognizedPreset: "Gjenkjente en {{preset}}-eksport. {{label}} {{parts}}.",
      fromSpreadsheet: "{{label}} {{parts}} fra regnearket.",
      droppedRows_one:
        "\n\n{{count}} overførings-/nullbeløpsrad utelatt - flytting mellom dine egne kontoer er verken inntekt eller forbruk.",
      droppedRows_other:
        "\n\n{{count}} overførings-/nullbeløpsrader utelatt - flytting mellom dine egne kontoer er verken inntekt eller forbruk.",
      skippedRows_one: "\n\n{{count}} rad hoppet over (obligatoriske felt mangler eller er ugyldige):",
      skippedRows_other:
        "\n\n{{count}} rader hoppet over (obligatoriske felt mangler eller er ugyldige):",
      skippedRowLine: "\n• {{sheet}} - {{descriptor}}: {{reason}}",
      andMore: "\n• …og {{count}} til",
      staleNote:
        "\n\nMerk: Denne filen er {{days}} dager gammel. Noen data kan være utdaterte.",
      failedMessage: "Noe gikk galt under importen av regnearket.",
    },
  },
  bankStatement: {
    readFailed: {
      title: "Kunne ikke lese filen",
      message:
        "Det ser ikke ut som en CSV fra en bank. Eksporter transaksjonene dine som CSV og prøv igjen.",
    },
    noFile: "Ingen fil valgt.",
    tooLarge:
      "Filen er for stor ({{size}} MB). Maks er 5 MB - eksporter et kortere datointervall.",
    importedTitle: "Kontoutskrift importert",
  },
  reset: {
    dialog: {
      title: "Nullstill alle data",
      message:
        "Dette sletter permanent all gjeld, alle betalinger og alle kontodata. Dette kan ikke angres.",
      confirm: "Nullstill alt",
    },
  },
};
