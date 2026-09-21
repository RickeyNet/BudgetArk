/**
 * BudgetArk - Deutsche Texte: Budget-Tab (entry)
 * File: src/i18n/locales/de/budgetEntry.ts
 *
 * German counterpart of en/budgetEntry.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. W-2 / 1099 / 401(k) are
 * US tax terms with no German equivalent and stay as-is.
 */

import type { Localized } from "../types";
import type { budgetEntry as en } from "../en/budgetEntry";

export const budgetEntry: Localized<typeof en> = {
  add: {
    title: "Buchung hinzufügen",
    subtitle: "Einnahmen und Ausgaben nach Kategorie erfassen.",
    submit_one: "Buchung hinzufügen",
    submit_other: "{{count}} Buchungen hinzufügen",
    saveAndAnother: "Speichern + weitere",
    saveAndAnotherA11y: "Speichern und weitere Buchung hinzufügen",
  },
  edit: {
    title: "Buchung bearbeiten",
    subtitle: "Diese Buchung ändern oder löschen.",
    loading: "Lädt...",
  },
  type: {
    label: "BUCHUNGSART",
    expense: "Ausgabe",
    income: "Einnahme",
  },
  incomeType: {
    label: "EINKOMMENSART",
    hint: "W-2 erfasst dein Nettogehalt und 401(k). 1099 zeigt, wie viel du von jeder Zahlung für Steuern zurücklegen solltest.",
    options: {
      regular: "Normal",
      w2: "W-2-Gehalt",
      "1099": "1099 / Auftragnehmer",
    },
  },
  retirement: {
    label: "401(K) DIESES GEHALT (OPTIONAL)",
    hintEdit:
      "Der Betrag unten ist dein Nettogehalt. Ging ein Teil dieses Gehalts in ein 401(k), trag es hier ein - es wird getrennt erfasst, nicht zu den Einnahmen gezählt.",
    hintAdd:
      "Gib unten dein Nettogehalt als Betrag ein. Ging ein Teil dieses Gehalts in ein 401(k), trag es hier ein - es wird getrennt erfasst, nicht zu den Einnahmen gezählt.",
    firstLineNote: "Der 401(k)-Betrag wird der ersten Buchung zugeordnet.",
  },
  taxSetAside: {
    label: "STEUERRÜCKLAGE IN PROZENT",
    hint: "Von 1099-Einkommen wird nichts einbehalten - leg also einen Teil für die Jahressteuer zurück. 25-30 % sind ein üblicher Startwert.",
    preview: "Leg davon {{amount}} für Steuern zurück.",
  },
  category: {
    label: "KATEGORIE",
  },
  amount: {
    label: "BETRAG",
    placeholder: "0,00",
    descriptionLabel: "BESCHREIBUNG (OPTIONAL)",
    descriptionPlaceholder: "z. B. Wocheneinkauf, Netflix usw.",
    descriptionLinePlaceholder: "Beschreibung (optional)",
  },
  estimate: {
    hint: "Deine letzten {{count}} tatsächlichen Abbuchungen lagen im Schnitt bei {{average}}. Die Schätzung ändert sich nur, wenn du tippst.",
    use: "{{average}} übernehmen",
    useA11y: "Schätzung auf {{average}} setzen",
  },
  lines: {
    label: "BUCHUNGEN",
    addA11y: "Weitere Buchungszeile hinzufügen",
    hint: "Mehrere Beträge für dieselbe Kategorie erfassen (z. B. mehrere Einkäufe aus einem Kontoauszug).",
    lineTitle: "Buchung {{index}}",
    singleTitle: "Betrag",
    removeA11y: "Buchung {{index}} entfernen",
    photosFirstLine: "Fotos werden der ersten Buchung zugeordnet.",
  },
  suggestions: {
    useA11y: "{{description}} übernehmen",
    useInCategoryA11y: "{{description}} in {{category}} übernehmen",
  },
  date: {
    monthLabel: "MONAT",
    startMonthLabel: "STARTMONAT",
    dayLabel: "TAG",
    today: "Heute",
    todayA11y: "Datum auf heute setzen",
    weekdays: {
      sun: "So",
      mon: "Mo",
      tue: "Di",
      wed: "Mi",
      thu: "Do",
      fri: "Fr",
      sat: "Sa",
    },
  },
  bill: {
    label: "GEHÖRT ZU RECHNUNG",
    option: "{{name}} · ca. {{amount}}",
    none: "Keine",
    hint: "Das ist die tatsächliche Abbuchung für eine wiederkehrende Rechnung dieses Monats. Wähl sie aus, und die Schätzung der Rechnung tritt für diesen Monat zurück, damit nichts doppelt zählt.",
  },
  recurring: {
    label: "Wiederkehrend",
    hint: "Diese Buchung wiederholt sich ab dem Startmonat im unten gewählten Rhythmus.",
    frequencyLabel: "RHYTHMUS",
    frequency: {
      monthly: "Monatlich",
      quarterly: "Vierteljährlich",
      semiannual: "Alle 6 Monate",
      yearly: "Jährlich",
    },
    payUrlLabel: "ZAHLUNGSLINK (OPTIONAL)",
    payUrlHint: "Link zur Zahlungsseite dieser Rechnung. https:// wird ergänzt, wenn du es weglässt.",
    payUrlPlaceholder: "z. B. meinerechnung.example.com/pay",
    dayOfMonthLabel: "TAG IM MONAT",
    dayOfMonthHint: "Der Tag, an dem die Rechnung abgebucht wird. Tag 29-31 fällt in kürzeren Monaten auf den letzten Tag.",
  },
  privacy: {
    label: "🔒 Privat",
    hint: "Wird nie mit dem Gerät deines Partners synchronisiert. Zählt weiterhin in deinem Budget und ist in deinen Sicherungen und Exporten enthalten.",
    alreadySyncedNote: " Wurde diese Buchung schon synchronisiert, behält dein Partner die vorhandene Kopie.",
  },
  loan: {
    label: "VERLIEHEN? (OPTIONAL)",
    hint: "Geld, das du zurückerwartest. Trag ein, wer es hat, und die Buchung erscheint unter Profil → Personen → Dir geschuldet, wo du Rückzahlungen erfasst. Sie zählt diesen Monat trotzdem als Ausgabe.",
    clearNote: " Löschst du den Namen, gehen auch die dazu erfassten Rückzahlungen verloren.",
    placeholder: "Wer schuldet dir etwas? Leer lassen, wenn niemand",
    chipA11y: "Verliehen an {{name}}",
  },
  account: {
    label: "MIT KONTO VERKNÜPFEN",
    hint: "Beiträge werden dem Kontostand dieses Kontos hinzugefügt.",
    none: "Keins",
  },
  business: {
    label: "UNTERNEHMEN (OPTIONAL)",
    hintEdit: "Ordne diese Ausgabe einem Unternehmen für den Steuerbericht zu.",
    hintAdd: "Ordne diese Ausgabe einem Unternehmen für den Steuerbericht zu. Sie zählt weiterhin in deinem privaten Budget.",
    personal: "Privat",
    deleted: "💼 (gelöschtes Unternehmen)",
  },
  people: {
    label: "PERSONEN (OPTIONAL)",
    hint: "Für wen war das? Wähl eine Person oder alle, die es geteilt haben - beim Einkauf die ganze Familie. Geteilte Ausgaben werden in Personenberichten gleichmäßig aufgeteilt.",
    unassigned: "Nicht zugeordnet",
    deleted: "👤 (gelöschte Person)",
  },
};
