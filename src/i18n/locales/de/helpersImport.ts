/**
 * BudgetArk - Deutsche Texte: reine Helfer (import)
 * File: src/i18n/locales/de/helpersImport.ts
 *
 * German counterpart of en/helpersImport.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Sheet titles, column and
 * CSV header names quoted inside sentences stay English: they are file
 * contracts the importer matches verbatim.
 */

import type { Localized } from "../types";
import type { helpersImport as en } from "../en/helpersImport";

export const helpersImport: Localized<typeof en> = {
  file: {
    noFileSelected: "Keine Datei ausgewählt.",
  },
  spreadsheet: {
    tooManyRows: "Die Tabelle hat zu viele Zeilen ({{rows}}). Maximal sind {{max}} erlaubt.",
    tooLarge: "Die Datei ist zu groß ({{mb}} MB). Maximal sind 5 MB erlaubt.",
    unreadable:
      "Die Tabelle konnte nicht gelesen werden. Die Datei ist womöglich beschädigt oder hat ein nicht unterstütztes Format.",
    empty: "Die Tabelle ist leer.",
    noSheets:
      'Keine bekannten Tabellenblätter gefunden. Erwartet wird ein Blatt "Budget Entries" (oder eines von: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).',
    noValidRows:
      "Keine gültigen Zeilen gefunden. Prüfe, ob die Spaltenköpfe dem dokumentierten Schema entsprechen und Date / Amount / Type / Category ausgefüllt sind.",
    row: {
      typeInvalid: 'Type muss "income" oder "expense" sein',
      categoryUnknown: 'Kategorie "{{category}}" ist keine bekannte Kategorie',
      categoryMissing: "Kategorie fehlt",
      categoryOneOf: "Kategorie muss eine der folgenden sein: {{list}}",
      amountOutOfRange: "Betrag fehlt oder liegt außerhalb des Bereichs",
      amountPositive: "Betrag muss eine positive Zahl von mindestens 0,01 sein",
      dateMissing: "Datum fehlt oder konnte nicht gelesen werden",
      repaymentsFormat: 'Repayments müssen Paare im Format "JJJJ-MM-TT:Betrag" sein, getrennt durch ";"',
      monthlyLimitPositive: "Monatslimit muss eine positive Zahl von mindestens 0,01 sein",
      nameMissing: "Name fehlt",
      balanceNonNegative: "Saldo muss eine Zahl von 0 oder mehr sein",
      originalBalancePositive: "Ursprünglicher Saldo muss eine positive Zahl von mindestens 0,01 sein",
      rateRange: "Zinssatz muss zwischen 0 und {{max}} liegen",
      minPaymentNonNegative: "Mindestrate muss eine Zahl von 0 oder mehr sein",
      debtIdMissing: "Debt ID fehlt (die Zahlung ist keiner Schuld zugeordnet)",
      targetAmountPositive: "Zielbetrag muss eine positive Zahl von mindestens 0,01 sein",
      currentAmountNonNegative: "Aktueller Betrag muss eine Zahl von 0 oder mehr sein",
      costBasisNonNegative: "Einstandswert muss eine Zahl von 0 oder mehr sein",
      symbolInvalid: 'Symbol "{{symbol}}" ist kein gültiges Tickersymbol',
      symbolMissing: "Symbol fehlt",
      sharesPositive: "Shares muss eine positive Zahl sein",
      proxyNeedsSymbol: "Ein Proxy-Wertpapier braucht ein Symbol (den Proxy-Ticker)",
      proxyNeedsName: "Ein Proxy-Wertpapier braucht einen Namen",
      proxyNeedsAnchorPrice: "Ein Proxy-Wertpapier braucht einen positiven AnchorPrice",
      anchorValueNonNegative: "Ankerwert muss eine Zahl von 0 oder mehr sein",
      manualNeedsName: "Ein Wertpapier mit manuellem Wert braucht einen Namen",
      manualValueNonNegative: "Manueller Wert muss eine Zahl von 0 oder mehr sein",
    },
  },
  statement: {
    unreadable: "Die Datei konnte nicht gelesen werden. Stelle sicher, dass es ein CSV-Export deiner Bank ist.",
    empty: "Die Datei ist leer.",
    tooManyRows:
      "Die Datei hat zu viele Zeilen ({{rows}}). Maximal sind {{max}} erlaubt - exportiere einen kürzeren Zeitraum.",
    noDateColumn: "Keine Umsatzzeilen gefunden - die Datei hat keine Spalte mit Datumsangaben.",
    unreadableDate: 'Unlesbares Datum "{{value}}"',
    unreadableAmount: "Unlesbarer Betrag",
    unreadableAmountValue: 'Unlesbarer Betrag "{{value}}"',
  },
  export: {
    dialogTitle: "BudgetArk-Tabelle exportieren",
    shareTimeout: "Zeitüberschreitung beim Öffnen des Teilen-Dialogs.",
    loadTimeout: {
      budgetEntries: "Zeitüberschreitung beim Laden der Buchungen für den Export.",
      budgetLimits: "Zeitüberschreitung beim Laden der Ausgabenlimits für den Export.",
      debts: "Zeitüberschreitung beim Laden der Schulden für den Export.",
      payments: "Zeitüberschreitung beim Laden der Zahlungen für den Export.",
      savingsGoals: "Zeitüberschreitung beim Laden der Sparziele für den Export.",
      assetAccounts: "Zeitüberschreitung beim Laden der Vermögenskonten für den Export.",
      holdings: "Zeitüberschreitung beim Laden der Wertpapiere für den Export.",
      milestonePlan: "Zeitüberschreitung beim Laden des Meilensteinplans für den Export.",
      businesses: "Zeitüberschreitung beim Laden der Unternehmen für den Export.",
      people: "Zeitüberschreitung beim Laden der Personen für den Export.",
    },
  },
  backup: {
    collections: {
      debts: "Schulden",
      payments: "Zahlungen",
      budgetEntries: "Buchungen",
      budgetLimits: "Ausgabenlimits",
      savingsGoals: "Sparziele",
      assetAccounts: "Vermögenskonten",
      holdings: "Wertpapiere",
      netWorthSnapshots: "Nettovermögens-Momentaufnahmen",
      customCategories: "eigene Kategorien",
      businesses: "Unternehmen",
      people: "Personen",
    },
    tooManyLimits: "Zu viele Ausgabenlimits im Monat {{month}}. Maximal sind {{max}} erlaubt.",
    invalidLimits:
      'Import abgelehnt: Die Ausgabenlimits für {{month}} enthalten ungültige Einträge (erster bei Eintrag {{index}} von {{total}}). Jedes Limit braucht eine gültige "category" und ein numerisches "monthlyLimit".',
    invalidFormat: "Ungültiges Format für {{label}}. Erwartet wird eine Liste.",
    tooManyItems: "Zu viele Einträge unter {{label}}. Maximal sind {{max}} erlaubt.",
    invalidRecords_one:
      "Import abgelehnt: {{label}} enthält {{count}} ungültigen Eintrag (bei Eintrag {{index}} von {{total}}).",
    invalidRecords_other:
      "Import abgelehnt: {{label}} enthält {{count}} ungültige Einträge (erster bei Eintrag {{index}} von {{total}}).",
    problem: "Problem: {{detail}}",
    userInvalid: "Import abgelehnt: Das Format des Nutzerprofils ist ungültig.",
    userMissingId: "Import abgelehnt: Dem Nutzerprofil fehlt eine gültige ID.",
    payloadTooLarge: "Import abgelehnt: Die Datei ist zu groß. Maximal sind {{max}} Einträge insgesamt erlaubt.",
    fileTooLarge: "Die Importdatei ist zu groß für einen BudgetArk-Export.",
    passwordRequired:
      "Dieser Export ist passwortgeschützt. Gib das Passwort ein, um ihn zu entschlüsseln.",
    wrongPassword: "Entschlüsselung fehlgeschlagen. Das Passwort ist womöglich falsch.",
    malformedEnvelope: "Entschlüsselung fehlgeschlagen. Der verschlüsselte Export ist beschädigt.",
    notJson: "Der Text ist kein gültiges JSON. Füge einen BudgetArk-Export ein.",
    notExport:
      "Die Daten sehen nicht nach einem BudgetArk-Export aus. Erwartet werden Schulden, Zahlungen oder Budgetdaten.",
    rollbackFailed:
      "Der Import ist beim Schreiben fehlgeschlagen und die Wiederherstellung konnte nicht alle Daten zurückholen (fehlgeschlagene Schlüssel: {{failed}}). Einige Einträge sind womöglich inkonsistent - installiere die App bitte neu und importiere deine letzte Sicherung, bevor du neue Daten hinzufügst.",
    writeFailed: "Der Import ist beim Schreiben fehlgeschlagen. Deine bisherigen Daten wurden wiederhergestellt.",
    pickerStuck:
      "Die Dateiauswahl hängt noch von einem früheren Versuch. Schließe die App bitte vollständig, öffne sie erneut und versuche es noch einmal.",
  },
};
