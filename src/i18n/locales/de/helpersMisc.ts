/**
 * BudgetArk - Deutsche Texte: reine Helfer (misc)
 * File: src/i18n/locales/de/helpersMisc.ts
 *
 * German counterpart of en/helpersMisc.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { helpersMisc as en } from "../en/helpersMisc";

export const helpersMisc: Localized<typeof en> = {
  dates: {
    unknownDate: "Unbekanntes Datum",
  },
  syncActivity: {
    nothingNew: "nichts Neues",
    removed: "({{n}} entfernt)",
    collections: {
      budgetEntries_one: "{{count}} Buchung",
      budgetEntries_other: "{{count}} Buchungen",
      payments_one: "{{count}} Zahlung",
      payments_other: "{{count}} Zahlungen",
      debts_one: "{{count}} Schuld",
      debts_other: "{{count}} Schulden",
      savingsGoals_one: "{{count}} Sparziel",
      savingsGoals_other: "{{count}} Sparziele",
      assetAccounts_one: "{{count}} Konto",
      assetAccounts_other: "{{count}} Konten",
      holdings_one: "{{count}} Wertpapier",
      holdings_other: "{{count}} Wertpapiere",
      budgetLimits_one: "{{count}} Limit",
      budgetLimits_other: "{{count}} Limits",
      monthStartBalances_one: "{{count}} Startsaldo",
      monthStartBalances_other: "{{count}} Startsalden",
      customCategories_one: "{{count}} Kategorie",
      customCategories_other: "{{count}} Kategorien",
      businesses_one: "{{count}} Unternehmen",
      businesses_other: "{{count}} Unternehmen",
      people_one: "{{count}} Person",
      people_other: "{{count}} Personen",
      dismissedTransactions_one: "{{count}} übersprungener Umsatz",
      dismissedTransactions_other: "{{count}} übersprungene Umsätze",
      netWorthSnapshots_one: "{{count}} Nettovermögens-Momentaufnahme",
      netWorthSnapshots_other: "{{count}} Nettovermögens-Momentaufnahmen",
    },
  },
  validation: {
    tooLong: "Höchstens {{max}} Zeichen.",
    alreadyExists: "„{{name}}“ gibt es schon.",
  },
  categories: {
    nameRequired: "Gib einen Kategorienamen ein.",
    builtIn: "„{{name}}“ ist bereits eine eingebaute Kategorie.",
    limit: "Du kannst bis zu {{max}} eigene Kategorien anlegen.",
    notFound: "Kategorie nicht gefunden.",
  },
  people: {
    nameRequired: "Gib einen Namen ein.",
    limit: "Du kannst bis zu {{max}} Personen anlegen.",
    notFound: "Person nicht gefunden.",
  },
  businesses: {
    nameRequired: "Gib einen Unternehmensnamen ein.",
    limit: "Du kannst bis zu {{max}} Unternehmen anlegen.",
    notFound: "Unternehmen nicht gefunden.",
  },
  pin: {
    incorrect: "Falsche PIN - versuch es erneut",
  },
  connections: {
    keystoreUnavailable:
      "Dieses Gerät kann Bank-Zugangsdaten nicht sicher speichern (sicherer Schlüsselspeicher nicht verfügbar), deshalb wurde die Verbindung nicht gespeichert. Das betrifft oft gerootete oder per Sideload installierte Geräte.",
    credentialsMissing:
      "Die gespeicherten Zugangsdaten dieser Verbindung fehlen. Entferne sie und füge sie neu hinzu.",
    syncFailed: "Beim Synchronisieren dieser Verbindung ist etwas schiefgelaufen.",
    teller: {
      appIdRequired: "Gib zuerst deine Teller-Application-ID ein.",
      badPemFiles:
        "Diese Dateien sehen nicht wie certificate.pem und private_key.pem aus deiner teller.zip aus.",
      listAccountsFailed: "Teller ist verbunden, aber die Konten konnten nicht geladen werden.",
      authRejected:
        "Teller hat die Zugangsdaten dieser Verbindung abgelehnt. Verbinde die Bank neu, um weiter zu synchronisieren.",
      rateLimited: "Das Anfragelimit von Teller ist erreicht. Versuch es später noch einmal.",
      unexpectedResponse: "Teller hat unerwartet geantwortet (HTTP {{status}}).",
      certificateRefused:
        "Teller hat das Client-Zertifikat abgelehnt. Importiere Zertifikat und Schlüssel aus deiner teller.zip erneut.",
      unreachable: "Teller ist nicht erreichbar. Prüfe deine Internetverbindung und versuch es erneut.",
      unparsable: "Die Antwort von Teller konnte nicht gelesen werden.",
      noEnrollments: "Noch keine Teller-Anmeldungen. Verbinde zuerst eine Bank über Teller.",
    },
    simplefin: {
      tokenRequired: "Füge zuerst dein SimpleFIN-Setup-Token ein.",
      tokenInvalid:
        "Das sieht nicht wie ein SimpleFIN-Setup-Token aus. Kopiere das ganze Token von deiner SimpleFIN-Bridge-App-Seite und versuch es erneut.",
      tokenUsed:
        "Das Token hat nicht funktioniert - SimpleFIN-Tokens sind nur einmal gültig. Erzeuge in SimpleFIN Bridge ein neues und füge es hier ein.",
      paymentRequired:
        "SimpleFIN Bridge meldet, dass eine Zahlung fällig ist. Prüfe dein Abo auf bridge.simplefin.org und versuch es dann erneut.",
      unexpectedResponse: "SimpleFIN hat unerwartet geantwortet (HTTP {{status}}).",
      accessUrlUnreadable: "SimpleFIN hat eine Zugriffs-URL geliefert, die BudgetArk nicht lesen konnte.",
      accessUrlMalformed:
        "Die gespeicherte SimpleFIN-Zugriffs-URL ist beschädigt. Entferne diese Verbindung und füge sie neu hinzu.",
      authRejected: "SimpleFIN hat die Zugangsdaten dieser Verbindung abgelehnt.",
      rateLimited: "Das tägliche Anfragelimit von SimpleFIN ist erreicht. Versuch es später noch einmal.",
      unreachable: "SimpleFIN ist nicht erreichbar. Prüfe deine Internetverbindung und versuch es erneut.",
    },
  },
};
