/**
 * BudgetArk - Deutsche Texte: Profil (data)
 * File: src/i18n/locales/de/profileData.ts
 *
 * German counterpart of en/profileData.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Spreadsheet column names
 * (Date, Type, Category, Amount) are literal file headers and stay English.
 */

import type { Localized } from "../types";
import type { profileData as en } from "../en/profileData";

export const profileData: Localized<typeof en> = {
  sectionTitle: "DATEN",
  rows: {
    export: { title: "Exportieren", subtitle: "Verschlüsselte Sicherung als Datei" },
    import: { title: "Importieren", subtitle: "Aus Datei oder Zwischenablage" },
    autoBackup: { title: "Automatische Sicherungen" },
    exportSpreadsheet: {
      title: "Tabelle exportieren",
      subtitle: "CSV oder Excel für Google Sheets / Excel",
    },
    importSpreadsheet: {
      title: "Tabelle importieren",
      subtitle: "Aus einer CSV- oder Excel-Datei",
    },
    importBankStatement: {
      title: "Kontoauszug importieren",
      subtitle: "CSV deiner Bank → Prüfposteingang",
    },
    reset: { title: "Alle Daten zurücksetzen" },
  },
  autoBackup: {
    loading: "Lädt...",
    unavailable: "Nicht verfügbar",
    lastOn: "zuletzt {{date}}",
    noneYet: "noch keine",
    summaryEnabled: "{{cadence}} · {{last}}",
    summaryOff: "Aus · {{last}}",
    cadence: { weekly: "Wöchentlich", monthly: "Monatlich" },
  },
  export: {
    passwordTooShort: {
      title: "Passwort zu kurz",
      message:
        "Bitte gib ein Passwort mit mindestens 4 Zeichen ein oder schalte die Verschlüsselung aus.",
    },
    failed: {
      title: "Export fehlgeschlagen",
      message: "Beim Exportieren deiner Daten ist etwas schiefgelaufen.",
    },
    spinner: {
      title: "Export wird vorbereitet…",
      subtitle: "Das Verschlüsseln kann ein paar Sekunden dauern. Lass die App geöffnet.",
    },
    dialog: {
      title: "Meine Daten exportieren",
      encryptedNote: "Deine Daten werden vor dem Teilen mit einem Passwort verschlüsselt.",
      plaintextNote:
        "Deine Daten werden als unverschlüsseltes JSON exportiert. Jeder mit Zugriff auf die Datei kann deine Finanzdaten lesen.",
      encryptToggle: "Mit Passwort verschlüsseln",
      passwordPlaceholder: "Export-Passwort eingeben",
      encryptAndShare: "Verschlüsseln & teilen",
      sharePlaintext: "Unverschlüsselt teilen",
    },
  },
  import: {
    complete: { title: "Import abgeschlossen" },
    failed: {
      title: "Import fehlgeschlagen",
      message: "Beim Importieren deiner Daten ist etwas schiefgelaufen.",
    },
    labelMerged: "Zusammengeführt:",
    labelImported: "Importiert:",
    summary: "{{label}} {{parts}}.",
    listSeparator: ", ",
    counts: {
      debts_one: "{{count}} Schuld",
      debts_other: "{{count}} Schulden",
      payments_one: "{{count}} Zahlung",
      payments_other: "{{count}} Zahlungen",
      budgetEntries_one: "{{count}} Buchung",
      budgetEntries_other: "{{count}} Buchungen",
      budgetLimits_one: "{{count}} Budgetlimit",
      budgetLimits_other: "{{count}} Budgetlimits",
      limits_one: "{{count}} Limit",
      limits_other: "{{count}} Limits",
      savingsGoals_one: "{{count}} Sparziel",
      savingsGoals_other: "{{count}} Sparziele",
      assetAccounts_one: "{{count}} Vermögenskonto",
      assetAccounts_other: "{{count}} Vermögenskonten",
      holdings_one: "{{count}} Wertpapier",
      holdings_other: "{{count}} Wertpapiere",
      netWorthSnapshots_one: "{{count}} Nettovermögens-Momentaufnahme",
      netWorthSnapshots_other: "{{count}} Nettovermögens-Momentaufnahmen",
      customCategories_one: "{{count}} eigene Kategorie",
      customCategories_other: "{{count}} eigene Kategorien",
      businesses_one: "{{count}} Unternehmen",
      businesses_other: "{{count}} Unternehmen",
      people_one: "{{count}} Person",
      people_other: "{{count}} Personen",
    },
    extras: {
      milestonePlan: "Meilensteinplan",
      payoffStrategy: "Tilgungsstrategie",
    },
    alsoRestored: "\nEbenfalls wiederhergestellt: {{extras}}.",
    staleNote:
      "\n\nHinweis: Dieser Export ist {{days}} Tage alt. Einige Daten sind womöglich veraltet.",
    password: {
      title: "Verschlüsselter Export",
      message:
        "Dieser Export wurde mit einem Passwort verschlüsselt. Gib das Passwort ein, um ihn zu entschlüsseln.",
      placeholder: "Passwort eingeben",
      confirm: "Entschlüsseln & importieren",
    },
    source: {
      title: "Daten importieren",
      message: "Wähle eine Importquelle.",
      pickFile: "Datei wählen",
      pasteText: "Text einfügen",
    },
    mode: {
      title: "Aus Datei importieren",
      message:
        "Zusammenführen behält deine vorhandenen Daten und ergänzt die importierten. Ersetzen löscht zuerst deine aktuellen Daten.",
      merge: "Zusammenführen",
      replace: "Ersetzen",
    },
    paste: {
      title: "Exportdaten einfügen",
      hint: "Füge den JSON-Text ein, den du unter „Meine Daten exportieren“ kopiert hast.",
      placeholder: "JSON hier einfügen...",
      empty: {
        title: "Leer",
        message: "Bitte füge zuerst deine exportierten JSON-Daten ein.",
      },
    },
  },
  spreadsheet: {
    formatReference: "Formatreferenz ansehen →",
    export: {
      dialog: {
        title: "Tabelle exportieren",
        message:
          "CSV exportiert nur Buchungen - am einfachsten für Google Sheets und schnelle Änderungen. Excel exportiert eine vollständige Arbeitsmappe mit mehreren Blättern (Buchungen, Budgetlimits, Schulden, Zahlungen, Sparziele, Vermögenskonten) als komplette Sicherung.",
        csv: "CSV",
        excel: "Excel",
      },
      readyTitle: "{{format}}-Export bereit",
      csvNote:
        "CSV-Exporte enthalten nur Buchungen. Nutze das Excel-Format für eine vollständige Sicherung.",
      excelNote_one:
        "Arbeitsmappe gespeichert mit {{count}} Buchung sowie Schulden, Zahlungen, Sparzielen und Vermögenskonten.",
      excelNote_other:
        "Arbeitsmappe gespeichert mit {{count}} Buchungen sowie Schulden, Zahlungen, Sparzielen und Vermögenskonten.",
      partialNote:
        "\n\nTeilweiser Export: Einige Bereiche konnten nicht gelesen werden und wurden übersprungen ({{sections}}).",
      failedMessage: "Beim Exportieren der Tabelle ist etwas schiefgelaufen.",
    },
    import: {
      dialog: {
        title: "Tabelle importieren",
        message:
          "Wähle eine .csv- oder .xlsx-Datei. Erforderliche Spalten: Date, Type (income/expense), Category, Amount. Zusammenführen behält deine vorhandenen Daten; Ersetzen löscht sie zuerst.",
        tip: "Tipp: Tippe zuerst auf „Tabelle exportieren“, um das genaue Format zu sehen, dann bearbeiten und erneut importieren. IDs bleiben erhalten, sodass vorhandene Zeilen an Ort und Stelle aktualisiert werden.",
      },
      recognizedPreset: "{{preset}}-Export erkannt. {{label}} {{parts}}.",
      fromSpreadsheet: "{{label}} {{parts}} aus der Tabelle.",
      droppedRows_one:
        "\n\n{{count}} Umbuchungs-/Nullbetrag-Zeile ausgelassen - Bewegungen zwischen deinen eigenen Konten sind weder Einnahmen noch Ausgaben.",
      droppedRows_other:
        "\n\n{{count}} Umbuchungs-/Nullbetrag-Zeilen ausgelassen - Bewegungen zwischen deinen eigenen Konten sind weder Einnahmen noch Ausgaben.",
      skippedRows_one: "\n\n{{count}} Zeile übersprungen (Pflichtfelder fehlen oder sind ungültig):",
      skippedRows_other:
        "\n\n{{count}} Zeilen übersprungen (Pflichtfelder fehlen oder sind ungültig):",
      skippedRowLine: "\n• {{sheet}} - {{descriptor}}: {{reason}}",
      andMore: "\n• …und {{count}} weitere",
      staleNote:
        "\n\nHinweis: Diese Datei ist {{days}} Tage alt. Einige Daten sind womöglich veraltet.",
      failedMessage: "Beim Importieren der Tabelle ist etwas schiefgelaufen.",
    },
  },
  bankStatement: {
    readFailed: {
      title: "Datei konnte nicht gelesen werden",
      message:
        "Das sieht nicht nach einer Bank-CSV aus. Exportiere deine Umsätze als CSV und versuch es erneut.",
    },
    noFile: "Keine Datei ausgewählt.",
    tooLarge:
      "Die Datei ist zu groß ({{size}} MB). Maximal 5 MB - exportiere einen kürzeren Zeitraum.",
    importedTitle: "Kontoauszug importiert",
  },
  reset: {
    dialog: {
      title: "Alle Daten zurücksetzen",
      message:
        "Dadurch werden alle deine Schulden, Zahlungen und Kontodaten dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.",
      confirm: "Alles zurücksetzen",
    },
  },
};
