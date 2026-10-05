/**
 * BudgetArk - Deutsche Texte: gemeinsame Modals (data)
 * File: src/i18n/locales/de/modalsData.ts
 *
 * German counterpart of en/modalsData.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Sheet titles ("Budget Entries") and column names ("MonthlyLimit") are
 * file identifiers the importer matches verbatim - they stay English here
 * and only the explanations are translated.
 */

import type { Localized } from "../types";
import type { modalsData as en } from "../en/modalsData";

export const modalsData: Localized<typeof en> = {
  rules: {
    title: "Händlerregeln",
    subtitleEmpty:
      "Regeln merken sich, was mit den Umsätzen eines Händlers beim Import passieren soll.",
    subtitleCount_one:
      "{{count}} gemerkte Regel. Änderungen gelten für künftige Importe und alles, was noch im Posteingang liegt - bereits übersprungene Umsätze bleiben übersprungen.",
    subtitleCount_other:
      "{{count}} gemerkte Regeln. Änderungen gelten für künftige Importe und alles, was noch im Posteingang liegt - bereits übersprungene Umsätze bleiben übersprungen.",
    emptyBody:
      "Noch keine Regeln. Hake im Prüfposteingang „Immer so machen“ an, wenn du einen Umsatz bestätigst oder überspringst - die Regel erscheint dann hier und lässt sich jederzeit ändern oder löschen.",
    errors: {
      load: "Deine Regeln konnten nicht geladen werden.",
      save: "Diese Regel konnte nicht gespeichert werden.",
      delete: "Diese Regel konnte nicht gelöscht werden.",
    },
    billOption: "{{name}} · ca. {{amount}}",
    debtOption: "{{name}} · min. {{amount}}",
    behavior: {
      alwaysSkip: "Immer überspringen - wird nie importiert",
      logsDebtPayment: "Bucht eine Zahlung auf 💳 {{name}}",
      suggestsDebtPayment: "Schlägt eine Zahlung auf 💳 {{name}} vor",
      autoApproves: "Bestätigt automatisch {{icon}} {{category}}",
      suggests: "Schlägt {{icon}} {{category}} vor",
      renameAs: "als „{{name}}“",
      usedCount: "{{count}}× genutzt",
      deletedDebt: "(gelöschte Schuld)",
      deletedBusiness: "(gelöschtes Unternehmen)",
      deletedPerson: "(gelöschte Person)",
      deletedBill: "(gelöschte Rechnung)",
    },
    editor: {
      whenImports: "WENN DIESER HÄNDLER IMPORTIERT WIRD",
      alwaysSkipPill: "🚫 Immer überspringen",
      autoApproveHelp:
        "Ohne Prüfung automatisch bestätigen - passende Importe landen mit den Vorgaben dieser Regel direkt in deinem Budget. Ohne Haken warten sie mit der vorgeschlagenen Kategorie im Posteingang.",
      renameLabel: "UMBENENNEN IN (OPTIONAL)",
      renamePlaceholder: "Beschreibung der Bank behalten",
      businessLabel: "UNTERNEHMEN",
      personalPill: "Privat",
      peopleLabel: "PERSONEN",
      unassignedPill: "Nicht zugewiesen",
      billLabel: "GILT FÜR RECHNUNG",
      notABillPill: "Keine Rechnung",
      debtHelp:
        "Zahlungen an diesen Händler werden auf der Schuld gebucht (Saldo und Verlauf im Schulden-Tab), statt als Ausgabe abgelegt zu werden. Die Kategorie oben wird nicht verwendet.",
      deleteRule: "Regel löschen",
      saving: "Speichern...",
    },
    confirmDelete: {
      title: "Diese Regel löschen?",
      bodyIgnore:
        "Künftige Umsätze von „{{merchant}}“ landen wieder in deinem Prüfposteingang. Bereits übersprungene kommen nicht zurück.",
      bodyApprove:
        "Künftige Umsätze von „{{merchant}}“ warten im Prüfposteingang auf deine Bestätigung. Bereits angelegte Buchungen bleiben unverändert.",
      bodySuggest:
        "Künftige Umsätze von „{{merchant}}“ kommen ohne Kategorievorschlag an. Bestätigte Buchungen bleiben unverändert.",
      keep: "Behalten",
      deleting: "Löschen...",
    },
  },
  import: {
    title: "Kontoauszug importieren",
    subtitle:
      "Sag BudgetArk, welche Spalten gelesen werden sollen. Es hat schon geraten - prüfe die Vorschau unten und korrigiere, was nicht passt.",
    accountLabelSection: "KONTOBEZEICHNUNG",
    accountLabelPlaceholder: "Kontoauszug",
    accountLabelHint:
      "Steht an jeder Zeile im Prüfposteingang, damit du diesen Import von deinem Bank-Sync unterscheiden kannst. Behalte die Bezeichnung bei, wenn du eine Datei dieser Bank erneut importierst - bei gleicher Bezeichnung überspringt BudgetArk die schon importierten Zeilen.",
    columnsSection: "SPALTEN",
    headerlessHint:
      "Diese Datei hat keine Kopfzeile, die Spalten sind daher nummeriert. Ordne sie anhand der Vorschau zu.",
    field: {
      date: "Datum",
      description: "Beschreibung",
      amount: "Betrag",
      debit: "Geld raus (Soll)",
      credit: "Geld rein (Haben)",
    },
    chooseColumn: "Spalte wählen",
    fieldA11y: "{{label}}: {{value}}",
    fieldA11yEmpty: "{{label}}: Spalte wählen",
    layout: {
      signed: "Eine Betragsspalte",
      split: "Getrennt Soll / Haben",
    },
    positiveIsOutflow: "Positive Zahlen sind Belastungen (typisch für Kreditkarten)",
    previewSection: "VORSCHAU",
    noDescription: "(keine Beschreibung)",
    previewReady_one: "{{count}} Umsatz bereit",
    previewReady_other: "{{count}} Umsätze bereit",
    previewSkipped_one: " · {{count}} unlesbare Zeile übersprungen",
    previewSkipped_other: " · {{count}} unlesbare Zeilen übersprungen",
    noPreviewComplete:
      "Mit diesen Spalten wurden noch keine Umsätze gelesen. Probier eine andere Datums- oder Betragsspalte.",
    noPreviewIncomplete:
      "Wähle eine Datums-, eine Beschreibungs- und eine Betragsspalte, um eine Vorschau zu sehen.",
    remember: "Diese Spalten fürs nächste Mal merken (diese Bank)",
    importButton: "Importieren",
    importing: "Importiere…",
    pickerTitle: "Spalte wählen",
    errors: {
      noneRead:
        "Mit diesen Spalten konnten keine Umsätze gelesen werden. Prüfe, ob Datums- und Betragsspalte stimmen.",
      generic: "Beim Import des Kontoauszugs ist etwas schiefgelaufen.",
    },
    summary: {
      added_one: "{{count}} in den Prüfposteingang gelegt",
      added_other: "{{count}} in den Prüfposteingang gelegt",
      autoApproved_one: "{{count}} durch deine Regeln automatisch bestätigt",
      autoApproved_other: "{{count}} durch deine Regeln automatisch bestätigt",
      autoDismissed_one: "{{count}} durch deine Regeln übersprungen",
      autoDismissed_other: "{{count}} durch deine Regeln übersprungen",
      alreadyKnown_one: "{{count}} bereits importiert",
      alreadyKnown_other: "{{count}} bereits importiert",
      withParts: "{{label}}: {{parts}}.",
      nothingNew: "{{label}}: nichts Neues zu importieren - jede Zeile war schon da.",
      flaggedDuplicates_one:
        "{{count}} sieht aus wie ein Umsatz, den du schon hast - er ist im Posteingang markiert, damit du ihn überspringen kannst.",
      flaggedDuplicates_other:
        "{{count}} sehen aus wie Umsätze, die du schon hast - sie sind im Posteingang markiert, damit du sie überspringen kannst.",
      deferred_one:
        "{{count}} hat nicht mehr hineingepasst (der Posteingang fasst 500 auf einmal). Bestätige oder räume ein paar auf und importiere die Datei dann erneut für den Rest.",
      deferred_other:
        "{{count}} haben nicht mehr hineingepasst (der Posteingang fasst 500 auf einmal). Bestätige oder räume ein paar auf und importiere die Datei dann erneut für den Rest.",
      rowsSkipped_one: "{{count}} Zeile übersprungen (Datum oder Betrag unlesbar)",
      rowsSkipped_other: "{{count}} Zeilen übersprungen (Datum oder Betrag unlesbar)",
      zeroRows_one: "{{count}} Zeile mit Betrag 0 weggelassen",
      zeroRows_other: "{{count}} Zeilen mit Betrag 0 weggelassen",
    },
  },
  schema: {
    title: "Tabellenformat",
    subtitle:
      "Spaltenüberschriften werden ohne Beachtung der Groß-/Kleinschreibung erkannt. CSV-Dateien enthalten nur das Blatt „Budget Entries“. Excel-Dateien können jedes der Blätter unten enthalten.",
    tipLabel: "TIPP",
    tipBefore: "Am einfachsten lernst du das Format so: Tippe auf ",
    tipAction: "Exportieren → Tabelle",
    tipAfter:
      " (XLSX), öffne die Datei in Excel oder Google Sheets, bearbeite sie und importiere sie wieder. IDs bleiben erhalten, bestehende Zeilen werden also an Ort und Stelle aktualisiert. Selbst bei leerer App ist der Export eine fertige Vorlage - jedes Blatt hat die richtigen Überschriften, nur noch keine Zeilen.",
    presets: {
      title: "Du kommst von YNAB, Mint oder Monarch?",
      body: "Importiere deren Umsatz-CSV unverändert. BudgetArk erkennt die Datei an den Überschriften und ordnet die Spalten für dich zu.",
      ynab: "• YNAB: Payee, Outflow, Inflow (Category, Memo)",
      mint: "• Mint: Description, Amount, Transaction Type (Category, Notes)",
      monarch: "• Monarch: Merchant, Amount, Original Statement (Category, Notes)",
      categories:
        "• Kategorien werden per Stichwort auf die von BudgetArk abgebildet (Groceries → Grocery); alles andere kommt als eigene Kategorie unter seinem Namen an.",
      transfers:
        "• Umbuchungen zwischen deinen eigenen Konten werden weggelassen - sie sind weder Einnahme noch Ausgabe. Die Importzusammenfassung nennt die Anzahl.",
    },
    limits: {
      title: "Grenzen",
      fileSize: "• Dateigröße: max. 5 MB",
      rowsPerSheet: "• Bis zu 5.000 Zeilen pro Blatt",
      recordsTotal: "• Bis zu 6.000 Datensätze pro Import",
      skipped:
        "• Zeilen ohne Pflichtfelder werden stillschweigend übersprungen (nach dem Import siehst du die Anzahl).",
    },
    allowedCategories: {
      title: "Erlaubte Kategorien",
      body: "Gelten für Budget Entries und Budget Limits. Genau so schreiben.",
    },
    required: "Pflicht",
    optional: "Optional",
    csvTag: "CSV",
    excelOnlyTag: "Nur Excel",
    sheets: {
      entries: {
        description:
          "Das Kernblatt - Pflicht für CSV- und Excel-Importe. CSV-Dateien enthalten nur dieses Blatt.",
        footer:
          "Belegfotos wandern nie durch Tabellen - die Fotodateien bleiben auf dem Gerät, das sie aufgenommen hat.",
        columns: {
          id: "Fehlt sie, wird eine UUID erzeugt. Für sicheres Hin und Zurück behalten.",
          date: "ISO JJJJ-MM-TT, voller ISO-Zeitstempel, US M/T/JJJJ oder natives Excel-Datum.",
          type: "Muss income oder expense sein (Groß-/Kleinschreibung egal).",
          category: "Muss genau einer erlaubten Kategorie entsprechen (siehe Liste unten).",
          amount: "Positive Zahl. $ und Kommas werden entfernt. (50.00) gilt als -50.00.",
          description: "Optionale Notiz. Bis zu 220 Zeichen.",
          recurring: "yes / no / true / false / 1 / 0.",
          linkedAccountId: "UUID des Vermögenskontos bei Sparbuchungen.",
          businessId:
            "UUID aus dem Blatt Businesses für geschäftlich markierte Ausgaben. Bleibt beim Hin und Zurück erhalten.",
          business: "Lesbarer Unternehmensname. Nur im Export - beim Import ignoriert.",
          personId:
            "UUID aus dem Blatt People für Ausgaben, die einer Person zugewiesen sind (bei geteilten die erste). Bleibt erhalten.",
          personIds:
            "Jede Person, der eine geteilte Ausgabe zugewiesen ist, als mit ; getrennte UUIDs. Bleibt erhalten.",
          person: "Lesbare Personennamen. Nur im Export - beim Import ignoriert.",
          private: "yes markiert eine private Buchung, die nie an deinen Partner synchronisiert wird. Bleibt erhalten.",
        },
      },
      limits: {
        description:
          "Monatliche Ausgabenlimits je Kategorie. Importierte Limits landen im aktuellen Monat.",
        columns: {
          category: "Eine der erlaubten Kategorien.",
          monthlyLimit: "Positive Zahl.",
        },
      },
      debts: {
        description: "Bestehende Schulden (Karten, Kredite usw.).",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt.",
          name: "Bis zu 80 Zeichen.",
          balance: "Aktueller Restsaldo, ≥ 0.",
          originalBalance: "Anfangssaldo, ≥ 0,01.",
          rate: "Effektiver Jahreszins in Prozent, 0-200.",
          minPayment: "Monatliche Mindestrate, ≥ 0.",
          owner: "mine / partner / joint. Standard: mine.",
          debtClass:
            "personal_credit / car / house. (Das alte car_house wird zu house, wenn der Name eine Hypothek erwähnt, sonst zu car.)",
          debtClassSource: "manual / inferred.",
          goalDate: "Optionales Zieldatum für die Tilgung.",
          createdAt: "ISO-Zeitstempel; Standard: jetzt.",
        },
      },
      payments: {
        description: "Einzelne Zahlungen auf eine Schuld.",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt.",
          debtId: "Muss der ID einer Zeile im Blatt Debts entsprechen.",
          amount: "Positive Zahl, ≥ 0,01.",
          date: "ISO-Datum oder US M/T/JJJJ.",
        },
      },
      savingsGoals: {
        description: "Verfolgte Sparziele.",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt.",
          name: "Bis zu 80 Zeichen.",
          category: "emergency_fund / travel / home / car / education / other.",
          targetAmount: "Positive Zahl.",
          currentAmount: "Zahl, ≥ 0.",
          targetDate: "Optionales Zieldatum.",
          priority:
            "Rang in der Reihenfolge „Meine Reihenfolge“ des Anschaffungsplaners (0 = zuerst). Leer, wenn nie sortiert. Bleibt erhalten.",
          usesPerMonth:
            "Eingabe für Kosten pro Nutzung: erwartete Nutzungen pro Monat (1-10.000). Leer, wenn nicht erfasst.",
          usefulLifeYears:
            "Eingabe für Kosten pro Nutzung: Jahre, die du es voraussichtlich behältst (bis 100). Leer, wenn nicht erfasst.",
          createdAt: "ISO-Zeitstempel; Standard: jetzt.",
          updatedAt:
            "ISO-Zeitstempel der letzten Änderung. Bleibt erhalten, damit der Partner-Sync die neuere Kopie behält.",
        },
      },
      assetAccounts: {
        description:
          "Dauerhafte Kontostände (Sparen, Altersvorsorge, HSA, Investment).",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt.",
          name: "Bis zu 80 Zeichen.",
          category: "savings / retirement / hsa / investment / other.",
          balance: "Zahl, ≥ 0.",
          emergencyFund:
            "yes markiert ein Sparkonto als deinen Notgroschen. Bleibt erhalten.",
          createdAt: "ISO-Zeitstempel; Standard: jetzt.",
        },
      },
      businesses: {
        description:
          "Unternehmen, mit denen Ausgaben markiert werden können (über BusinessId). Nur aktive Unternehmen werden exportiert.",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt. Buchungen verweisen über BusinessId darauf.",
          name: "Bis zu 40 Zeichen.",
          createdAt: "ISO-Zeitstempel; Standard: jetzt.",
        },
      },
      people: {
        description:
          "Personen, denen Ausgaben zugewiesen werden können (über PersonId). Nur aktive Personen werden exportiert.",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt. Buchungen verweisen über PersonId darauf.",
          name: "Bis zu 40 Zeichen.",
          createdAt: "ISO-Zeitstempel; Standard: jetzt.",
        },
      },
      holdings: {
        description:
          "Aktien-/ETF-Positionen. Kurse werden auf dem Gerät abgerufen und nie importiert - nur die Position.",
        columns: {
          id: "Wird erzeugt, wenn sie fehlt.",
          symbol: "Ticker, z. B. AAPL oder VTI. Bis zu 12 Zeichen (Buchstaben, Ziffern, . und -).",
          shares: "Positive Zahl. Bruchteile erlaubt.",
          costBasis: "Investierter Gesamtbetrag, ≥ 0. Für Gewinn/Verlust.",
          createdAt: "ISO-Zeitstempel; Standard: jetzt.",
        },
      },
    },
  },
  categories: {
    title: "Eigene Kategorien",
    subtitle:
      "Leg eigene Budgetkategorien an. Sie funktionieren überall wie die eingebauten - bei Buchungen, Limits, Diagrammen und Berichten.",
    nameLabel: "NAME",
    namePlaceholder: "z. B. Hobbys, Haustiere, Kinderbetreuung",
    iconLabel: "SYMBOL",
    pickIconA11y: "Symbol {{glyph}} wählen",
    bucketLabel: "50/30/20-TOPF",
    addButton: "Kategorie hinzufügen",
    adding: "Wird hinzugefügt…",
    yourCategories: "DEINE KATEGORIEN ({{count}})",
    emptyCustom: "Noch keine eigenen Kategorien. Leg oben eine an.",
    deleteA11y: "{{name}} löschen",
    builtInLabel: "EINGEBAUTE KATEGORIEN",
    builtInHelp:
      "Blende aus, was du nie nutzt. Ausgeblendete Kategorien verschwinden auf diesem Handy aus den Auswahllisten; bestehende Buchungen behalten sie.",
    alwaysShown: "Immer sichtbar",
    restore: "Wiederherstellen",
    restoreA11y: "{{name}} wiederherstellen",
    hide: "Ausblenden",
    hideA11y: "{{name}} ausblenden",
    confirmDelete: {
      title: "Kategorie löschen?",
      body: "„{{name}}“ wird aus der Auswahl entfernt. Bestehende Buchungen behalten die Kategorie, verlieren nur das eigene Symbol.",
    },
    confirmHide: {
      title: "Kategorie ausblenden?",
      body: "„{{name}}“ verschwindet auf diesem Handy aus den Auswahllisten, dem Limits-Blatt und den Sammelwerkzeugen. Bereits damit abgelegte Buchungen behalten sie und zeigen sie weiterhin, wo Ausgaben anfallen. Hier kannst du sie jederzeit wiederherstellen.",
    },
  },
};
