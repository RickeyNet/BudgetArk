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
      "Alles, was einer Person zugeordnet ist, pro Kalenderjahr. Wiederkehrende Rechnungen zählen einmal pro Monat, genau wie im Budget.",
    shareTitle: "Ausgaben pro Person exportieren",
    grandTotal: "ZUGEORDNETE AUSGABEN GESAMT · {{year}}",
    empty:
      "Keine zugeordneten Ausgaben in {{year}}. Ordne eine Ausgabe beim Hinzufügen im Budget-Tab einer Person zu (Personen legst du unter Profil → Personen an).",
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
    subtitle:
      "Füge die Geschäfte hinzu, für die du Geld ausgibst (eine Firma, ein Nebenjob oder ein Freelance-Kunde). Ordne ihnen Ausgaben beim Erfassen zu und zieh dir zur Steuerzeit einen Bericht pro Geschäft.",
    renameLabel: "GESCHÄFT UMBENENNEN",
    placeholder: "z. B. Acme GmbH, Etsy-Shop, Beratung",
    add: "Geschäft hinzufügen",
    listHeader: "DEINE GESCHÄFTE ({{count}})",
    empty: "Noch keine Geschäfte. Füge oben eines hinzu.",
    noEntries: "Keine zugeordneten Buchungen",
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
