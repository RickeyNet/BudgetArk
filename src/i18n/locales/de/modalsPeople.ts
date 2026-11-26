/**
 * BudgetArk - Deutsche Texte: gemeinsame Modals (people)
 * File: src/i18n/locales/de/modalsPeople.ts
 *
 * German counterpart of en/modalsPeople.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsPeople as en } from "../en/modalsPeople";

export const modalsPeople: Localized<typeof en> = {
  loans: {
    title: "Dir geschuldet",
    subtitle:
      "Geld, das du verliehen hast. Markiere eine Ausgabe beim Erfassen (oder im Prüfposteingang) als „verliehen an“ und trage hier ein, was zurückkommt.",
    errors: {
      load: "Deine Darlehen konnten nicht geladen werden.",
      amountRequired: "Gib den gezahlten Betrag ein.",
      overpay: "Das ist mehr als die noch offenen {{amount}}.",
      dateFormat: "Das Datum muss so aussehen: 2026-09-15.",
      recordFailedReopen: "Zahlung konnte nicht gespeichert werden – erneut öffnen und nochmal versuchen.",
      recordFailed: "Zahlung konnte nicht gespeichert werden.",
      removeFailed: "Zahlung konnte nicht entfernt werden.",
    },
    loanMeta: "{{date}} · {{amount}} verliehen",
    repaidBack: "{{amount}} zurück",
    paidBack: "Zurückgezahlt",
    repaymentLine: "↳ {{date}} · {{amount}}",
    removeRepaymentA11y: "Zahlung über {{amount}} entfernen",
    logPaymentA11y: "Zahlung von {{name}} eintragen",
    borrowerFallback: "der Person",
    logPayment: "Zahlung eintragen",
    form: {
      amount: "BETRAG",
      amountPlaceholder: "0,00",
      receivedOn: "ERHALTEN AM",
      datePlaceholder: "JJJJ-MM-TT",
      note: "NOTIZ (OPTIONAL)",
      notePlaceholder: "Bar, PayPal, ...",
      saving: "Speichern...",
      save: "Zahlung speichern",
      paidInFullA11y: "Den gesamten offenen Betrag eintragen",
      paidInFull: "Komplett bezahlt · {{amount}}",
    },
    allPaidBack: "Alles zurückgezahlt",
    borrowerMeta_one: "{{lent}} verliehen in {{count}} Darlehen",
    borrowerMeta_other: "{{lent}} verliehen in {{count}} Darlehen",
    borrowerRepaid: "{{amount}} zurückgezahlt",
    stillOwed: "NOCH OFFEN",
    totalSub: "{{lent}} verliehen · {{repaid}} zurückgezahlt",
    loading: "Lädt…",
    empty:
      "Noch nichts verliehen. Wenn du im Budget-Tab eine Ausgabe hinzufügst, trage bei „An jemanden verliehen?“ den Namen ein – dann erscheint sie hier.",
    hideSettled: "Zurückgezahlte Darlehen ausblenden",
    showSettled_one: "{{count}} zurückgezahltes Darlehen anzeigen",
    showSettled_other: "{{count}} zurückgezahlte Darlehen anzeigen",
  },
  report: {
    previousYear: "Vorheriges Jahr",
    nextYear: "Nächstes Jahr",
    loading: "Lädt…",
    deletedSuffix: "(gelöscht)",
    expenses_one: "{{count}} Ausgabe",
    expenses_other: "{{count}} Ausgaben",
    exporting: "Exportiert…",
    exportCsv: "CSV exportieren",
    exportFailed: {
      title: "Export fehlgeschlagen",
      csv: "Die CSV-Datei konnte nicht erstellt werden.",
      zip: "Die ZIP-Datei konnte nicht erstellt werden.",
    },
  },
  businessReport: {
    title: "Geschäftsausgaben",
    subtitle:
      "Alles, was einem Geschäft zugeordnet ist, pro Kalenderjahr. Wiederkehrende Rechnungen zählen einmal pro Monat, genau wie im Budget.",
    shareTitle: "Geschäftsausgaben exportieren",
    grandTotal: "GESCHÄFTSAUSGABEN GESAMT · {{year}}",
    empty:
      "Keine Geschäftsausgaben in {{year}}. Ordne eine Ausgabe beim Hinzufügen im Budget-Tab einem Geschäft zu (Geschäfte legst du unter Profil → Geschäfte an).",
    withReceipt: "{{count}} mit Beleg",
    income: "Einnahmen",
    expenses: "Ausgaben",
    net: "Netto",
    receipts: {
      shareTitle: "Belegfotos exportieren",
      buttonA11y: "Belegfotos als ZIP-Archiv exportieren",
      button: "🧾 Belegfotos exportieren (ZIP)",
      preparing: "ZIP wird erstellt…",
      hint: "Dateinamen passen zu den CSV-Zeilen (datum_geschäft_betrag.jpg).",
      none: {
        title: "Keine Belege",
        message: "Keine Geschäftsausgabe in {{year}} hat Belegfotos.",
      },
      confirm: {
        title: "Belegfotos exportieren?",
        message_one:
          "Das erstellt eine unverschlüsselte ZIP-Datei mit bis zu {{count}} Belegfoto für {{year}}, benannt passend zu den CSV-Zeilen, zum Teilen (z. B. mit deiner Steuerberatung). Einmal geteilt, ist sie nicht mehr durch die BudgetArk-Verschlüsselung geschützt.",
        message_other:
          "Das erstellt eine unverschlüsselte ZIP-Datei mit bis zu {{count}} Belegfotos für {{year}}, benannt passend zu den CSV-Zeilen, zum Teilen (z. B. mit deiner Steuerberatung). Einmal geteilt, ist sie nicht mehr durch die BudgetArk-Verschlüsselung geschützt.",
        export: "Exportieren",
      },
      noneOnDevice: {
        title: "Keine Fotos auf diesem Gerät",
        message:
          "Alle Belegfotos dieses Jahres liegen auf dem Gerät deines Partners – Fotos werden nie synchronisiert, exportiere die ZIP-Datei also dort.",
      },
      skipped: {
        title: "Einige Fotos übersprungen",
        message_one:
          "{{count}} Foto liegt auf dem Gerät deines Partners (oder konnte nicht gelesen werden) und wurde nicht aufgenommen.",
        message_other:
          "{{count}} Fotos liegen auf dem Gerät deines Partners (oder konnten nicht gelesen werden) und wurden nicht aufgenommen.",
      },
    },
  },
  personReport: {
    title: "Ausgaben pro Person",
    subtitle:
      "Alles, was einer Person zugeordnet ist, pro Kalenderjahr - plus, was jeder Verdiener eingebracht hat. Wiederkehrende Rechnungen zählen einmal pro Monat und wiederkehrendes Einkommen verbindet sich mit den zugeordneten Gehältern, genau wie im Budget.",
    shareTitle: "Ausgaben pro Person exportieren",
    grandTotal: "ZUGEORDNETE AUSGABEN GESAMT · {{year}}",
    grandIncome: "Einkommen nach Verdiener · {{amount}}",
    income_one: "💵 Einkommen · {{count}} Eintrag",
    income_other: "💵 Einkommen · {{count}} Einträge",
    net: "Netto (Einkommen − Ausgaben)",
    empty:
      "Keine zugeordneten Ausgaben oder Einkünfte in {{year}}. Ordne eine Ausgabe beim Hinzufügen im Budget-Tab einer Person zu oder nenne den Verdiener bei einem wiederkehrenden Einkommen (Personen legst du unter Profil → Personen an).",
  },
  manage: {
    name: "NAME",
    saving: "Speichert…",
    saveName: "Namen speichern",
    rename: "Umbenennen",
    renameA11y: "{{name}} umbenennen",
    deleteA11y: "{{name}} löschen",
    errors: {
      save: "Speichern fehlgeschlagen. Bitte nochmal versuchen.",
    },
  },
  people: {
    title: "Personen",
    /** Shortcut rows at the top of the sheet - the report and loans live behind this one Profile row. */
    shortcuts: {
      report: "Ausgabenbericht pro Person",
      reportSubtext: "Summen pro Person und Jahr, mit CSV-Export",
      reportA11y: "Ausgabenbericht pro Person öffnen",
      owed: "Dir geschuldet 🤝",
      owedSubtext: "Verliehenes Geld und was schon zurückgezahlt wurde",
      owedA11y: "Ausstehende Rückzahlungen öffnen",
    },
    subtitle:
      "Füge die Personen in deinem Haushalt hinzu (oder alle, für die du Ausgaben verfolgst). Ordne ihnen Ausgaben beim Erfassen oder beim Freigeben importierter Umsätze zu – so ist klar, wer was ausgegeben hat.",
    renameLabel: "PERSON UMBENENNEN",
    placeholder: "z. B. Sam, Alex, die Kinder",
    add: "Person hinzufügen",
    listHeader: "DEINE PERSONEN ({{count}})",
    empty: "Noch keine Personen. Füge oben eine hinzu.",
    noEntries: "Keine zugeordneten Buchungen",
    entries_one: "{{count}} zugeordnete Buchung",
    entries_other: "{{count}} zugeordnete Buchungen",
    deleteConfirm: {
      title: "Person löschen?",
      message: "„{{name}}“ wird aus der Auswahl entfernt.",
      entryNote_one:
        "{{count}} Buchung behält die Zuordnung und wird als „(gelöschte Person)“ angezeigt.",
      entryNote_other:
        "{{count}} Buchungen behalten die Zuordnung und werden als „(gelöschte Person)“ angezeigt.",
    },
    errors: {
      load: "Deine Personen konnten nicht geladen werden. Schließen und nochmal versuchen.",
      delete: "Diese Person konnte nicht gelöscht werden. Bitte nochmal versuchen.",
    },
  },
  businesses: {
    title: "Geschäfte",
    /** Shortcut row at the top of the sheet - the report lives behind this one Profile row. */
    shortcuts: {
      report: "Geschäftsausgaben-Bericht",
      reportSubtext: "Summen je Unternehmen und Jahr, mit CSV-Export",
      reportA11y: "Geschäftsausgaben-Bericht öffnen",
    },
    subtitle:
      "Füge die Geschäfte hinzu, für die du Geld ausgibst (eine Firma, ein Nebenjob oder ein Freelance-Kunde). Ordne ihnen Ausgaben beim Erfassen zu und zieh dir zur Steuerzeit einen Bericht pro Geschäft.",
    renameLabel: "GESCHÄFT UMBENENNEN",
    placeholder: "z. B. Acme GmbH, Etsy-Shop, Beratung",
    add: "Geschäft hinzufügen",
    listHeader: "DEINE GESCHÄFTE ({{count}})",
    empty: "Noch keine Geschäfte. Füge oben eines hinzu.",
    noEntries: "Keine zugeordneten Buchungen",
    rentalToggle: "Mietobjekt",
    rentalHint: "Fügt diesem Unternehmen Mieter, offene Miete und Mahngebühren hinzu.",
    tenantsLink: "Mieter",
    tenantsOwed: "Mieter schulden {{amount}}",
    tenantsA11y: "Mieter von {{name}} öffnen",
    entries_one: "{{count}} zugeordnete Buchung",
    entries_other: "{{count}} zugeordnete Buchungen",
    deleteConfirm: {
      title: "Geschäft löschen?",
      message: "„{{name}}“ wird aus der Auswahl entfernt.",
      entryNote_one:
        "{{count}} Buchung behält die Zuordnung und wird in Berichten als „(gelöschtes Geschäft)“ angezeigt.",
      entryNote_other:
        "{{count}} Buchungen behalten die Zuordnung und werden in Berichten als „(gelöschtes Geschäft)“ angezeigt.",
    },
    errors: {
      load: "Deine Geschäfte konnten nicht geladen werden. Schließen und nochmal versuchen.",
      delete: "Dieses Geschäft konnte nicht gelöscht werden. Bitte nochmal versuchen.",
    },
  },
  tenants: {
    back: "← Unternehmen",
    title: "Mieter von {{name}}",
    subtitle: "Lege für jeden Mieter die Monatsmiete fest. Die Miete wird jeden Monat am Fälligkeitstag zu dem addiert, was er schuldet, und Einnahmen, die du dem Mieter zuordnest, zählen als Zahlung. Bei einer Teilzahlung bleibt der Rest offen. Mahngebühren und einmalige Forderungen erhöhen denselben Saldo.",
    totalOwed: "OFFENE MIETE",
    totalSub: "{{rent}} pro Monat fällig",
    empty: "Noch keine Mieter. Füge unten einen hinzu.",
    addTenant: "+ Mieter hinzufügen",
    rentMeta: "{{rent}}/Monat · fällig am {{day}}.",
    movedOut: "Ausgezogen · letzter Monat {{month}}",
    owes: "Schuldet {{amount}}",
    paidUp: "Alles bezahlt",
    credit: "{{amount}} im Voraus bezahlt",
    unpaidMonths: "Nicht voll bezahlte Monate: {{months}}",
    logPayment: "Zahlung erfassen",
    logPaymentA11y: "Mietzahlung von {{name}} erfassen",
    history: "Verlauf",
    hideHistory: "Verlauf ausblenden",
    monthPaid: "{{rent}} bezahlt",
    monthPartial: "{{paid}} bezahlt · {{owed}} offen",
    monthUnpaid: "{{owed}} offen",
    openingRow: "Offen vor der Erfassung",
    addCharge: "Gebühr hinzufügen",
    addChargeA11y: "Mahngebühr oder andere Forderung für {{name}} hinzufügen",
    lateFee: "Mahngebühr",
    chargeFallback: "Forderung",
    chargesHeader: "MAHNGEBÜHREN & FORDERUNGEN",
    charge: {
      noteLabel: "WOFÜR",
      notePlaceholder: "z. B. Mahngebühr, Fensterreparatur",
      amountLabel: "BETRAG",
      save: "Gebühr hinzufügen",
    },
    pastPayments: "Frühere Zahlungen hinzufügen",
    pastPaymentsA11y: "Frühere Mietzahlungen von {{name}} hinzufügen",
    past: {
      throughLabel: "MIETE BEZAHLT BIS",
      hint: "Fügt für jeden noch nicht bezahlten Mietmonat eine Zahlung hinzu, vom ersten Monat bis zu diesem, jeweils mit dem Fälligkeitstag als Datum. Sie werden als Einnahmen in diesen Monaten gespeichert. Eine offene Mahngebühr oder ein früherer Rückstand wird vor der Miete beglichen.",
      preview: "Hinzuzufügende Zahlungen: {{payments}} · {{total}} · {{from}} bis {{to}}",
      nothing: "Die Miete ist für jeden Monat bis dahin bereits bezahlt.",
      save: "Zahlungen hinzufügen",
    },
    picker: {
      notSet: "Nicht festgelegt",
      clear: "Löschen",
    },
    paymentsHeader: "ZAHLUNGEN",
    noPayments: "Noch keine Zahlungen erfasst.",
    paymentsHint: "Zahlungen sind Einnahmen im Budget-Tab. Bearbeite oder lösche sie dort. Eine Bankgutschrift kannst du im Prüf-Eingang einem Mieter zuordnen.",
    paymentDescription: "Miete - {{name}}",
    form: {
      nameLabel: "NAME DES MIETERS",
      namePlaceholder: "z. B. Sam, Wohnung 2",
      rentLabel: "MONATSMIETE",
      rentPlaceholder: "z. B. 1200",
      firstMonthLabel: "ERSTER MIETMONAT",
      rentHistoryLabel: "MIETE",
      rentTerm: "{{rent}}/Monat ab {{month}}",
      changeRentLabel: "MIETE ÄNDERN (OPTIONAL)",
      changeRentHint: "Gib die neue Miete und den Monat ein, ab dem sie gilt. Frühere Monate behalten die alte Miete.",
      fromMonthLabel: "NEUE MIETE AB",
      dueDayLabel: "MIETE FÄLLIG AM TAG",
      openingLabel: "SCHULDET BEREITS (OPTIONAL)",
      openingHint: "Offene Miete aus der Zeit vor dem ersten Monat oben.",
      paidThroughLabel: "MIETE BEZAHLT BIS (OPTIONAL)",
      paidThroughHint: "Früher eingezogen? Gib den letzten vollständig bezahlten Monat ein, dann wird für jeden Monat bis dahin eine Zahlung hinzugefügt. Setze den ersten Monat oben auf den Einzugsmonat.",
      endMonthLabel: "AUSGEZOGEN (OPTIONAL)",
      endMonthHint: "Der letzte Monat, für den Miete berechnet wird. Offene Beträge bleiben erhalten.",
      add: "Mieter hinzufügen",
      save: "Mieter speichern",
    },
    payment: {
      amountLabel: "ERHALTENER BETRAG",
      dateLabel: "DATUM",
      save: "Zahlung speichern",
    },
    errors: {
      nameRequired: "Gib den Namen des Mieters ein.",
      rentRequired: "Gib die Monatsmiete ein.",
      monthFormat: "Wähle einen Monat.",
      dueDay: "Der Fälligkeitstag muss zwischen 1 und 31 liegen.",
      opening: "Gib den bereits geschuldeten Betrag ein oder lass das Feld leer.",
      endBeforeStart: "Der Auszugsmonat darf nicht vor dem ersten Mietmonat liegen.",
      limit: "Ein Unternehmen kann bis zu {{max}} Mieter haben.",
      save: "Der Mieter konnte nicht gespeichert werden. Bitte versuche es erneut.",
      chargeAmount: "Gib den Betrag der Forderung ein.",
      tooManyPast: "Das wären mehr als {{max}} Zahlungen. Wähle einen früheren Monat.",
      amountRequired: "Gib den erhaltenen Betrag ein.",
      dateFormat: "Wähle ein Datum.",
      paymentFailed: "Die Zahlung konnte nicht gespeichert werden. Bitte versuche es erneut.",
    },
    deleteConfirm: {
      title: "Mieter entfernen?",
      message: "„{{name}}“ und der Mietsaldo werden entfernt. Erfasste Zahlungen bleiben als Einnahmen des Unternehmens in deinem Budget.",
    },
  },
  attachments: {
    label: "BELEGFOTOS ({{count}}/{{max}})",
    hint: "Fotos werden nur auf diesem Gerät verschlüsselt gespeichert – sie werden weder mit deinem Partner synchronisiert noch exportiert.",
    viewA11y: "Belegfoto ansehen",
    removeA11y: "Belegfoto entfernen",
    onPartnerDevice: "Auf Partnergerät",
    adding: "Wird hinzugefügt…",
    takePhoto: "📷 Foto aufnehmen",
    choosePhoto: "🖼️ Foto auswählen",
    cameraPermission: {
      title: "Kamerazugriff nötig",
      message: "Erlaube den Kamerazugriff in den Geräteeinstellungen, um Belege zu fotografieren.",
    },
    secureStorage: {
      title: "Sicherer Speicher nicht verfügbar",
      message:
        "BudgetArk kann nicht auf den sicheren Schlüsselspeicher dieses Geräts zugreifen, daher lassen sich Belegfotos nicht verschlüsselt speichern. Fotos sind deaktiviert, statt ungeschützt gespeichert zu werden.",
    },
    addFailed: {
      title: "Foto konnte nicht hinzugefügt werden",
      message: "Beim Verarbeiten des Bilds ist etwas schiefgelaufen. Bitte nochmal versuchen.",
    },
  },
  viewer: {
    counter: "{{current}} von {{total}}",
    closeA11y: "Fotoansicht schließen",
    missing:
      "Dieses Foto liegt auf dem Gerät, mit dem es aufgenommen wurde. Belegfotos werden beim Sync nicht übertragen.",
    removeA11y: "Dieses Belegfoto entfernen",
    remove: "Foto entfernen",
  },
};
