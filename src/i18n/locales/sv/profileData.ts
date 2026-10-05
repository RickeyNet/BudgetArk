/**
 * BudgetArk - Svenska texter: Profil (data)
 * File: src/i18n/locales/sv/profileData.ts
 *
 * Swedish counterpart of en/profileData.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Spreadsheet column names
 * (Date, Type, Category, Amount) are literal file headers and stay English.
 */

import type { Localized } from "../types";
import type { profileData as en } from "../en/profileData";

export const profileData: Localized<typeof en> = {
  sectionTitle: "DATA",
  rows: {
    export: {
      title: "Exportera",
      subtitle: "Krypterad säkerhetskopia eller kalkylblad",
    },
    import: {
      title: "Importera",
      subtitle: "Säkerhetskopia, kalkylblad eller kontoutdrag",
    },
    autoBackup: { title: "Automatiska säkerhetskopior" },
    reset: { title: "Nollställ all data" },
  },
  exportMenu: {
    title: "Exportera",
    backup: {
      title: "Krypterad säkerhetskopia",
      subtitle: "Allt, som en lösenordsskyddad fil",
    },
    spreadsheet: {
      title: "Kalkylblad",
      subtitle: "CSV eller Excel för Google Sheets / Excel",
    },
  },
  importMenu: {
    title: "Importera",
    backupFile: {
      title: "Säkerhetskopia från fil",
      subtitle: "Återställ en BudgetArk-export",
    },
    backupPaste: {
      title: "Klistra in säkerhetskopietext",
      subtitle: "JSON kopierad från en export",
    },
    spreadsheet: {
      title: "Kalkylblad",
      subtitle: "Från en CSV- eller Excel-fil",
    },
    bankStatement: {
      title: "Kontoutdrag",
      subtitle: "En CSV från din bank → granskningsinkorgen",
    },
  },
  autoBackup: {
    loading: "Laddar...",
    unavailable: "Inte tillgängligt",
    lastOn: "senast {{date}}",
    noneYet: "ingen än",
    summaryEnabled: "{{cadence}} · {{last}}",
    summaryOff: "Av · {{last}}",
    cadence: { weekly: "Veckovis", monthly: "Månadsvis" },
  },
  export: {
    passwordTooShort: {
      title: "Lösenordet är för kort",
      message:
        "Ange ett lösenord med minst 4 tecken eller stäng av krypteringen.",
    },
    failed: {
      title: "Exporten misslyckades",
      message: "Något gick fel när dina data exporterades.",
    },
    spinner: {
      title: "Förbereder din export…",
      subtitle: "Krypteringen kan ta några sekunder. Håll appen öppen.",
    },
    dialog: {
      title: "Exportera mina data",
      encryptedNote: "Dina data krypteras med ett lösenord innan de delas.",
      plaintextNote:
        "Dina data exporteras som okrypterad JSON. Alla som har tillgång till filen kan läsa dina ekonomiska uppgifter.",
      encryptToggle: "Kryptera med lösenord",
      passwordPlaceholder: "Ange exportlösenord",
      encryptAndShare: "Kryptera & dela",
      sharePlaintext: "Dela okrypterat",
    },
  },
  import: {
    complete: { title: "Importen är klar" },
    failed: {
      title: "Importen misslyckades",
      message: "Något gick fel när dina data importerades.",
    },
    labelMerged: "Sammanslaget:",
    labelImported: "Importerat:",
    summary: "{{label}} {{parts}}.",
    listSeparator: ", ",
    counts: {
      debts_one: "{{count}} skuld",
      debts_other: "{{count}} skulder",
      payments_one: "{{count}} betalning",
      payments_other: "{{count}} betalningar",
      budgetEntries_one: "{{count}} budgetpost",
      budgetEntries_other: "{{count}} budgetposter",
      budgetLimits_one: "{{count}} budgetgräns",
      budgetLimits_other: "{{count}} budgetgränser",
      limits_one: "{{count}} gräns",
      limits_other: "{{count}} gränser",
      savingsGoals_one: "{{count}} sparmål",
      savingsGoals_other: "{{count}} sparmål",
      assetAccounts_one: "{{count}} tillgångskonto",
      assetAccounts_other: "{{count}} tillgångskonton",
      holdings_one: "{{count}} innehav",
      holdings_other: "{{count}} innehav",
      netWorthSnapshots_one: "{{count}} ögonblicksbild av nettoförmögenheten",
      netWorthSnapshots_other: "{{count}} ögonblicksbilder av nettoförmögenheten",
      customCategories_one: "{{count}} egen kategori",
      customCategories_other: "{{count}} egna kategorier",
      businesses_one: "{{count}} företag",
      businesses_other: "{{count}} företag",
      people_one: "{{count}} person",
      people_other: "{{count}} personer",
    },
    extras: {
      milestonePlan: "milstolpsplan",
      payoffStrategy: "återbetalningsstrategi",
    },
    alsoRestored: "\nÅterställde även: {{extras}}.",
    staleNote:
      "\n\nObs: Den här exporten är {{days}} dagar gammal. Vissa data kan vara inaktuella.",
    password: {
      title: "Krypterad export",
      message:
        "Den här exporten krypterades med ett lösenord. Ange lösenordet för att avkryptera den.",
      placeholder: "Ange lösenord",
      confirm: "Avkryptera & importera",
    },
    mode: {
      title: "Importera från fil",
      message:
        "Slå ihop behåller dina befintliga data och lägger till de importerade. Ersätt raderar dina nuvarande data först.",
      merge: "Slå ihop",
      replace: "Ersätt",
    },
    paste: {
      title: "Klistra in exportdata",
      hint: "Klistra in JSON-texten du kopierade från ”Exportera mina data”.",
      placeholder: "Klistra in JSON här...",
      empty: {
        title: "Tomt",
        message: "Klistra in dina exporterade JSON-data först.",
      },
    },
  },
  spreadsheet: {
    formatReference: "Visa formatreferens →",
    export: {
      dialog: {
        title: "Exportera kalkylblad",
        message:
          "CSV exporterar bara budgetposter - enklast för Google Sheets och snabba ändringar. Excel exporterar en komplett arbetsbok med flera blad (budgetposter, budgetgränser, skulder, betalningar, sparmål, tillgångskonton) som en fullständig säkerhetskopia.",
        csv: "CSV",
        excel: "Excel",
      },
      readyTitle: "{{format}}-export klar",
      csvNote:
        "CSV-exporter innehåller bara budgetposter. Använd Excel-formatet för en fullständig säkerhetskopia.",
      excelNote_one:
        "Arbetsboken sparades med {{count}} budgetpost plus skulder, betalningar, sparmål och tillgångskonton.",
      excelNote_other:
        "Arbetsboken sparades med {{count}} budgetposter plus skulder, betalningar, sparmål och tillgångskonton.",
      partialNote:
        "\n\nOfullständig export: vissa avsnitt kunde inte läsas och hoppades över ({{sections}}).",
      failedMessage: "Något gick fel när kalkylbladet exporterades.",
    },
    import: {
      dialog: {
        title: "Importera kalkylblad",
        message:
          "Välj en .csv- eller .xlsx-fil. Obligatoriska kolumner: Date, Type (income/expense), Category, Amount. Slå ihop behåller dina befintliga data; Ersätt raderar dem först.",
        tip: "Tips: tryck först på ”Exportera kalkylblad” för att se det exakta formatet, ändra sedan och importera igen. ID:n följer med så att befintliga rader uppdateras på plats.",
      },
      recognizedPreset: "Kände igen en {{preset}}-export. {{label}} {{parts}}.",
      fromSpreadsheet: "{{label}} {{parts}} från kalkylbladet.",
      droppedRows_one:
        "\n\n{{count}} överförings-/nollbeloppsrad utelämnad - flyttar mellan dina egna konton är varken inkomster eller utgifter.",
      droppedRows_other:
        "\n\n{{count}} överförings-/nollbeloppsrader utelämnade - flyttar mellan dina egna konton är varken inkomster eller utgifter.",
      skippedRows_one: "\n\n{{count}} rad hoppades över (obligatoriska fält saknas eller är ogiltiga):",
      skippedRows_other:
        "\n\n{{count}} rader hoppades över (obligatoriska fält saknas eller är ogiltiga):",
      skippedRowLine: "\n• {{sheet}} - {{descriptor}}: {{reason}}",
      andMore: "\n• …och {{count}} till",
      staleNote:
        "\n\nObs: Den här filen är {{days}} dagar gammal. Vissa data kan vara inaktuella.",
      failedMessage: "Något gick fel när kalkylbladet importerades.",
    },
  },
  bankStatement: {
    readFailed: {
      title: "Kunde inte läsa filen",
      message:
        "Det ser inte ut som en CSV från en bank. Exportera dina transaktioner som CSV och försök igen.",
    },
    noFile: "Ingen fil vald.",
    tooLarge:
      "Filen är för stor ({{size}} MB). Max är 5 MB - exportera ett kortare datumintervall.",
    importedTitle: "Kontoutdrag importerat",
  },
  reset: {
    dialog: {
      title: "Nollställ all data",
      message:
        "Detta raderar permanent alla dina skulder, betalningar och kontouppgifter. Det går inte att ångra.",
      confirm: "Nollställ allt",
    },
  },
};
