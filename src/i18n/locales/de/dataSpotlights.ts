/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (spotlights)
 * File: src/i18n/locales/de/dataSpotlights.ts
 *
 * German counterpart of en/dataSpotlights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names (Deep Sea,
 * Slate, Lighthouse, ...) and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataSpotlights as en } from "../en/dataSpotlights";

export const dataSpotlights: Localized<typeof en> = {
  "german-language": {
    title: "BudgetArk spricht deine Sprache",
    blurb:
      "Jeder Tab, jedes Sheet und jede Erinnerung gibt es jetzt auf Deutsch, Russisch und Ukrainisch. Die Sprache folgt automatisch deinem Handy, oder du wählst sie selbst im Profil, direkt neben der Währung.",
    cta: "Sprache wählen",
  },
  "bill-fulfillment": {
    title: "Rechnungen, die sich selbst abrechnen",
    blurb:
      "Leg eine Rechnung einmal mit deiner besten Schätzung an. Kommt die echte Strom- oder Wasserabbuchung - von der Bank oder von Hand eingetragen - ordnest du sie der Rechnung zu, und der Ist-Betrag ersetzt für diesen Monat überall die Schätzung. Nichts doppelt gezählt, nichts am Plan geändert.",
    cta: "Ist-Betrag einer Rechnung buchen",
  },
  "bank-card-balances": {
    title: "Kreditkarten, die sich selbst verfolgen",
    blurb:
      "Verknüpfe eine Karte im Schulden-Tab mit dem Bankkonto dahinter, und ihr Saldo aktualisiert sich nach jedem Sync - dieselbe Verknüpfung stempelt auch die letzte Nutzung für die Karten-Wache. Einmal pro Karte auswählen, und die Schuldenverfolgung läuft fast von allein.",
    cta: "Karte verknüpfen",
  },
  "cash-flow-budget": {
    title: "Wissen, was verfügbar ist",
    blurb:
      "Sag BudgetArk zum Monatsanfang, was auf deinem Girokonto liegt, und der Budget-Tab rechnet vor, wo der Monat endet - Einnahmen rein, Rechnungen und Mindestraten raus - mit einem echten verfügbaren Betrag statt einer Schätzung.",
  },
  "private-entries": {
    title: "Manche Ausgaben gehen nur dich an",
    blurb:
      "Markiere eine Buchung als privat, und sie wird nie auf das Gerät deines Partners synchronisiert - perfekt für Geschenke und Überraschungen. In deinem eigenen Budget und in Sicherungen zählt sie weiterhin; nur das Teilen ändert sich.",
    cta: "Private Buchung hinzufügen",
  },
  "card-keep-alive": {
    title: "Lass keine ruhende Karte schließen",
    blurb:
      "Banken können eine ungenutzte Kreditkarte kündigen - und deine Bonität leidet darunter. Schalte für jede Karte die Karten-Wache ein, und BudgetArk warnt dich direkt auf deiner Brücke, bevor das Inaktivitätsfenster abläuft.",
    cta: "Karten-Wache einrichten",
  },
  "income-types": {
    title: "W-2 oder 1099? Markiere deine Gehaltszahlungen",
    blurb:
      "Kennzeichne Einnahmen als W-2-Gehalt oder 1099-Honorar. W-2-Buchungen können die 401(k)-Abzüge jeder Zahlung festhalten, und 1099-Buchungen zeigen genau, wie viel du für Steuern zurücklegen solltest - monatlich summiert in deinem Budget.",
    cta: "Gehaltszahlung buchen",
  },
  "bank-connections": {
    title: "Deine Bank auf Autopilot",
    blurb:
      "Verbinde deine Bank und lass Umsätze von selbst hereinkommen - nichts landet in deinem Budget, bevor du es im Prüfposteingang freigibst. Deine Zugangsdaten bleiben verschlüsselt auf diesem Gerät; BudgetArk hat keinen Server und steht nie zwischen dir und deiner Bank.",
    cta: "Verbindung einrichten",
  },
  "business-expenses": {
    title: "Geschäftsausgaben, sortiert",
    blurb:
      "Ordne jede Ausgabe einer Firma oder einem Nebenerwerb zu und zieh zur Steuerzeit einen Bericht mit Summen pro Unternehmen und einer CSV für deine Steuerberatung. Zugeordnete Buchungen zählen weiter in deinem normalen Budget - getrennt wird erst im Bericht.",
    cta: "Unternehmen anlegen",
  },
  "people-assignment": {
    title: "Wer hat das ausgegeben?",
    blurb:
      "Leg die Personen in deinem Haushalt an und ordne ihnen Ausgaben zu - beim Buchen oder beim Freigeben importierter Bankumsätze. Jede Buchung zeigt, zu wem sie gehört, damit gemeinsame Ausgaben endlich Namen haben.",
    cta: "Personen anlegen",
  },
  "receipt-photos": {
    title: "Beleg anhängen",
    blurb:
      "Knips bis zu drei Belegfotos direkt im Formular an jede Buchung. Die Fotos werden vor dem Speichern verschlüsselt und verlassen dein Handy nie - außer du exportierst sie selbst.",
    cta: "Buchung hinzufügen",
  },
  "tracking-reminders": {
    title: "Sanfte Erinnerungen",
    blurb:
      "Lass dich erinnern, wenn du länger keine Ausgaben gebucht hast, oder zum Monatsstart, damit du deine Ziele setzt. Alles wird nur auf deinem Handy geplant - auf dem Sperrbildschirm erscheint nichts über deine Finanzen.",
    cta: "Erinnerungen einrichten",
  },
  "account-change-tracker": {
    title: "Sieh, wie deine Konten steigen und fallen",
    blurb:
      "Jedes Konto und jede Kategorie auf der Brücke zeigt jetzt, wie viel es im gewählten Zeitraum hoch oder runter ging - ein Tag, eine Woche, ein Monat oder ein Quartal. Privat auf diesem Handy aus deinen eigenen Salden und Kursen erfasst; nichts verlässt das Gerät.",
    cta: "Zur Brücke",
  },
  "what-if-spending": {
    title: "Was wäre, wenn du nichts mehr ausgibst für …?",
    blurb:
      "Wähl eine Ausgabenkategorie und sieh, was das Umlenken dieses Geldes bringen könnte: wie viel früher du schuldenfrei wärst, welche Zinsen du dir sparst oder was daraus in 1, 5 und 10 Jahren wird. Zu finden unter Werkzeuge im Karten-Tab.",
    cta: "Was-wäre-wenn starten",
  },
  "purchase-planner": {
    title: "Anschaffung planen, Ziele behalten",
    blurb:
      "Nenn das Ding, auf das du sparst, und BudgetArk baut den Ansparposten drumherum: einen Monatsbetrag, der zu deinem echten Cashflow passt, den Monat, in dem es so weit ist, und Rat passend zu deiner Etappe in Baue deine Arche - damit die Anschaffung deinen Plan nie aus der Bahn wirft.",
    cta: "Anschaffung planen",
  },
  "take-home-pay": {
    title: "Was wirklich auf dem Konto ankommt",
    blurb:
      "Gib Gehalt, Steuerklasse und US-Bundesstaat ein und sieh dein echtes Nettogehalt pro Zahlung - Bundessteuer, Staatssteuer, Social Security und Medicare, alles aus gebündelten Steuertabellen, die nie nach Hause telefonieren. Tipp auf einen anderen Bundesstaat und sieh, was dort vom selben Gehalt bleibt.",
    cta: "Nettogehalt schätzen",
  },
  "app-lock": {
    title: "App hinter einer PIN sperren",
    blurb:
      "Schalte die App-Sperre ein, und BudgetArk fragt bei jedem Öffnen nach einer 4- bis 8-stelligen PIN - so kann niemand, der dein Handy ausleiht, in deinen Finanzen stöbern. Die PIN bleibt auf diesem Gerät - nie synchronisiert, exportiert oder gesichert.",
    cta: "App-Sperre einrichten",
  },
  "theme-fleet": {
    title: "Sieben neue Designs für deine Arche",
    blurb:
      "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn und Ledger sind zur Flotte gestoßen - von Tiefseeblau mit biolumineszentem Schimmer über ein Hochkontrast-Design mit geprüfter Lesbarkeit, eine Seekarte und einen pfirsichfarbenen Sonnenaufgang bis zum klassischen grünen Buchhaltungspapier. Alle unter Darstellung ausprobieren.",
    cta: "Designs ansehen",
  },
  "subscription-detective": {
    title: "Abo-Detektiv",
    blurb:
      "Ein neues Werkzeug im Karten-Tab findet importierte Bankabbuchungen, die sich wie ein Abo wiederholen - monatlich oder jährlich - ohne hinterlegte Rechnung, rechnet zusammen, was sie im Jahr kosten, und macht jede mit einem Tipp zur wiederkehrenden Rechnung.",
    cta: "Detektiv starten",
  },
  "owed-to-you": {
    title: "Dir geschuldet",
    blurb:
      "Jemandem Geld geliehen? Nenn die Person beim Buchen der Ausgabe (oder im Prüfposteingang), verfolge, was sie noch schuldet, und buche jede Rückzahlung unter Profil → Personen → Dir geschuldet.",
    cta: "Dir geschuldet öffnen",
  },
  "net-worth-goal": {
    title: "Wohin dein Nettovermögen steuert",
    blurb:
      "Die Brücke führt deine Nettovermögenslinie jetzt weiter - aus dem Monatsüberschuss deines Budgets und deinen Schulden bei Mindestrate. Setz ein Ziel - ein Betrag bis zu einem Monat - und sieh, ob du auf Kurs bist, was es pro Monat bräuchte und wann das heutige Tempo ankommt.",
    cta: "Prognose ansehen",
  },
  "paycheck-cycle": {
    title: "Bis zum Zahltag",
    blurb:
      "Budgetiere nach Zahlungsperiode statt Kalendermonat: Sag BudgetArk, wann du bezahlt wirst, und der Budget-Tab zeigt, was vor der nächsten Zahlung fällig ist und was bis dahin verfügbar bleibt.",
    cta: "Zahlungsperioden einrichten",
  },
  "quarterly-taxes": {
    title: "Quartalssteuern",
    blurb:
      "Buche 1099-Einnahmen, und das neue Werkzeug im Karten-Tab zeigt jedes IRS-Quartal: was du verdient und was du zurückgelegt hast, die geschätzte Zahlung und ihre Fälligkeit - mit einem Als bezahlt markieren pro Quartal.",
    cta: "Meine Quartale ansehen",
  },
  "purchase-plan-priorities": {
    title: "Anschaffungspläne, der Reihe nach",
    blurb:
      "Die Karte Anschaffungspläne rechnet jetzt alles zusammen - gespart, noch offen und wann alles finanziert ist - und lässt dich die Pläne ordnen: kleinste zuerst, dringendste zuerst oder in deiner eigenen Reihenfolge. Setz einen Monatsbetrag, und er fließt wie ein Schulden-Schneeball die Liste hinunter, jeder Plan rollt in den nächsten.",
    cta: "Meine Pläne ansehen",
  },
  "bank-statement-import": {
    title: "Kontoauszug importieren",
    blurb:
      "Lade eine CSV von der Website deiner Bank herunter, und BudgetArk liest sie: Bestätige einmal, welche Spalten Datum, Beschreibung und Betrag sind, und jeder Umsatz landet zur Freigabe im Prüfposteingang. Für die Monate vor deiner Bankverbindung - oder eine Bank, die du nie verbinden wirst.",
    cta: "Kontoauszug importieren",
  },
  "tip-jar": {
    title: "Trinkgeldkasse",
    blurb:
      "Optionale einmalige Trinkgelder, komplett über den App-Store abgewickelt. Schaltet nichts frei - jede Funktion ist schon kostenlos.",
  },
};
