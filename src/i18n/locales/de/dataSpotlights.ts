/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (spotlights)
 * File: src/i18n/locales/de/dataSpotlights.ts
 *
 * German counterpart of en/dataSpotlights.ts: the debut carousel copy AND
 * the feature guide's per-feature how-to (`guide`: a where-to-find
 * breadcrumb plus numbered `step1`..`stepN`). Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Breadcrumbs name the rows
 * and tools exactly as the German UI labels them. Theme names (Deep Sea,
 * Slate, Lighthouse, ...) and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataSpotlights as en } from "../en/dataSpotlights";

export const dataSpotlights: Localized<typeof en> = {
  "feature-guide": {
    title: "Jede Funktion, einen Tipp entfernt",
    blurb:
      "Die neue Funktionsübersicht listet alles, was BudgetArk kann - nach Tab gruppiert, mit dem Ort jeder Funktion und ein paar Schritten zur Nutzung. Such nach einem Wort, lies die Schritte und spring direkt hin.",
    cta: "Funktionsübersicht öffnen",
    guide: {
      where: "Profil-Tab → Hilfe → Funktionsübersicht",
      step1: "Öffne den Profil-Tab und scrolle zur Karte Hilfe.",
      step2: "Tipp auf Funktionsübersicht, dann stöbere nach Tab oder tipp ein Wort wie \"Beleg\" oder \"Zahltag\" ein.",
      step3: "Tipp auf eine Funktion, um zu sehen, wo sie liegt und wie du sie nutzt. Der Button unter den Schritten bringt dich direkt dorthin.",
    },
  },
  languages: {
    title: "BudgetArk spricht deine Sprache",
    blurb:
      "Jeder Tab, jedes Sheet und jede Erinnerung gibt es jetzt auf Deutsch, Russisch, Ukrainisch, Schwedisch und Norwegisch. Die Sprache folgt automatisch deinem Handy, oder du wählst sie selbst im Profil, direkt neben der Währung.",
    cta: "Sprache wählen",
    guide: {
      where: "Profil-Tab → Einstellungen → Sprache",
      step1: "Öffne den Profil-Tab und such Sprache, direkt neben der Währung.",
      step2: "Lass es auf Automatisch, um deinem Handy zu folgen, oder wähl selbst eine Sprache.",
      step3: "Jeder Tab wechselt sofort. Check-in-Erinnerungen und das Widget auf dem Startbildschirm ziehen mit.",
    },
  },
  "bill-fulfillment": {
    title: "Rechnungen, die sich selbst abrechnen",
    blurb:
      "Leg eine Rechnung einmal mit deiner besten Schätzung an. Kommt die echte Strom- oder Wasserabbuchung - von der Bank oder von Hand eingetragen - ordnest du sie der Rechnung zu, und der Ist-Betrag ersetzt für diesen Monat überall die Schätzung. Nichts doppelt gezählt, nichts am Plan geändert.",
    cta: "Ist-Betrag einer Rechnung buchen",
    guide: {
      where: "Budget-Tab → + Buchung hinzufügen → Gehört zu Rechnung",
      step1: "Leg eine wiederkehrende Ausgabe einmal an, mit deiner besten Schätzung als Betrag.",
      step2: "Kommt die echte Abbuchung, trag sie als Ausgabe ein und wähl die Rechnung unter Gehört zu Rechnung. Im Prüfposteingang bieten importierte Umsätze dieselbe Liste.",
      step3: "Der Ist-Betrag ersetzt für diesen Monat überall die Schätzung - im Budget, im Kalender und auf der Cashflow-Karte.",
    },
  },
  "bank-card-balances": {
    title: "Kreditkarten, die sich selbst verfolgen",
    blurb:
      "Verknüpfe eine Karte im Schulden-Tab mit dem Bankkonto dahinter, und ihr Saldo aktualisiert sich nach jedem Sync - dieselbe Verknüpfung stempelt auch die letzte Nutzung für die Karten-Wache. Einmal pro Karte auswählen, und die Schuldenverfolgung läuft fast von allein.",
    cta: "Karte verknüpfen",
    guide: {
      where: "Schulden-Tab → Karte antippen → Bearbeiten → Verbundenes Bankkonto",
      step1: "Verbinde zuerst deine Bank unter Profil → Bankverbindungen.",
      step2: "Öffne die Karte im Schulden-Tab, tipp auf Bearbeiten und wähl unter Verbundenes Bankkonto das Bankkonto, das diese Karte ist.",
      step3: "Nach jedem Sync landet der Saldo der Karte von selbst hier; mit eingeschalteter Keep-Alive-Überwachung stempeln Einkäufe auch ihre letzte Nutzung.",
    },
  },
  "cash-flow-budget": {
    title: "Wissen, was verfügbar ist",
    blurb:
      "Sag BudgetArk zum Monatsanfang, was auf deinem Girokonto liegt, und der Budget-Tab rechnet vor, wo der Monat endet - Einnahmen rein, Rechnungen und Mindestraten raus - mit einem echten verfügbaren Betrag statt einer Schätzung.",
    guide: {
      where: "Budget-Tab → Cashflow-Karte ganz oben",
      step1: "Beantworte zum Monatsanfang die Startsaldo-Abfrage mit dem, was auf dem Girokonto liegt (oder tipp später auf die Cashflow-Karte, um es nachzutragen).",
      step2: "Die Karte rechnet das Monatsende vor: Einnahmen rein, Rechnungen und Mindestraten raus.",
      step3: "Lies vor einem Kauf den verfügbaren Betrag ab - er berücksichtigt schon, was noch fällig ist.",
    },
  },
  "private-entries": {
    title: "Manche Ausgaben gehen nur dich an",
    blurb:
      "Markiere eine Buchung als privat, und sie wird nie auf das Gerät deines Partners synchronisiert - perfekt für Geschenke und Überraschungen. In deinem eigenen Budget und in Sicherungen zählt sie weiterhin; nur das Teilen ändert sich.",
    cta: "Private Buchung hinzufügen",
    guide: {
      where: "Budget-Tab → + Buchung hinzufügen → 🔒 Privat",
      step1: "Leg eine Buchung an oder bearbeite sie und schalte den Schalter 🔒 Privat ein.",
      step2: "Die Buchung bleibt in deinem eigenen Budget und deinen Sicherungen, wandert beim Sync aber nie auf das Gerät deines Partners.",
      step3: "Schaltest du ihn später aus, wird sie beim nächsten Durchlauf synchronisiert; eine bereits synchronisierte Kopie wird nicht zurückgeholt.",
    },
  },
  "card-keep-alive": {
    title: "Lass keine ruhende Karte schließen",
    blurb:
      "Banken können eine ungenutzte Kreditkarte kündigen - und deine Bonität leidet darunter. Schalte für jede Karte die Karten-Wache ein, und BudgetArk warnt dich direkt auf deiner Brücke, bevor das Inaktivitätsfenster abläuft.",
    cta: "Karten-Wache einrichten",
    guide: {
      where: "Schulden-Tab → Karte antippen → Bearbeiten → Karten-Keep-Alive",
      step1: "Öffne eine Kreditkarte im Schulden-Tab und tipp auf Bearbeiten.",
      step2: "Schalte die Keep-Alive-Überwachung ein und leg das erlaubte Inaktivitätsfenster fest - je nach Bank verschieden, 6 bis 12 Monate sind üblich.",
      step3: "Buche einen Einkauf mit der Karte (oder lass ein verbundenes Bankkonto ihn stempeln), um die Uhr zurückzusetzen. Ein Banner auf der Brücke warnt, bevor das Fenster abläuft.",
    },
  },
  "income-types": {
    title: "W-2 oder 1099? Markiere deine Gehaltszahlungen",
    blurb:
      "Kennzeichne Einnahmen als W-2-Gehalt oder 1099-Honorar. W-2-Buchungen können die 401(k)-Abzüge jeder Zahlung festhalten, und 1099-Buchungen zeigen genau, wie viel du für Steuern zurücklegen solltest - monatlich summiert in deinem Budget.",
    cta: "Gehaltszahlung buchen",
    guide: {
      where: "Budget-Tab → + Buchung hinzufügen → Einnahme → Einkommensart",
      step1: "Leg eine Einnahme an und wähl W-2-Gehalt oder 1099 / Auftragnehmer.",
      step2: "Bei W-2 trägst du die 401(k)-Abzüge dieser Zahlung ein; bei 1099 legst du den Anteil fest, den du für Steuern zurücklegst (25-30 % sind ein üblicher Start).",
      step3: "Der Budget-Tab summiert Abzüge und Rücklage jeden Monat, und 1099-Einnahmen fließen in das Werkzeug Quartalssteuern im Karten-Tab.",
    },
  },
  "bank-connections": {
    title: "Deine Bank auf Autopilot",
    blurb:
      "Verbinde deine Bank und lass Umsätze von selbst hereinkommen - nichts landet in deinem Budget, bevor du es im Prüfposteingang freigibst. Deine Zugangsdaten bleiben verschlüsselt auf diesem Gerät; BudgetArk hat keinen Server und steht nie zwischen dir und deiner Bank.",
    cta: "Verbindung einrichten",
    guide: {
      where: "Profil-Tab → Bankverbindungen",
      step1: "Öffne Profil → Bankverbindungen und füge eine Verbindung hinzu. Der Einrichtungsassistent führt dich durch SimpleFIN oder Teller - mit deinem eigenen Konto dort.",
      step2: "Wähl, welche Konten importiert werden und wo ihre Kontostände auf der Brücke landen.",
      step3: "Neue Umsätze warten im Prüfposteingang des Budget-Tabs, bis du sie freigibst, kategorisierst oder überspringst. Nichts landet von allein in deinem Budget.",
    },
  },
  "business-expenses": {
    title: "Geschäftsausgaben, sortiert",
    blurb:
      "Ordne jede Ausgabe einer Firma oder einem Nebenerwerb zu und zieh zur Steuerzeit einen Bericht mit Summen pro Unternehmen und einer CSV für deine Steuerberatung. Zugeordnete Buchungen zählen weiter in deinem normalen Budget - getrennt wird erst im Bericht.",
    cta: "Unternehmen anlegen",
    guide: {
      where: "Profil-Tab → Unternehmen",
      step1: "Leg ein Unternehmen unter Profil → Unternehmen an.",
      step2: "Ordne eine Ausgabe beim Buchen im Budget-Tab diesem Unternehmen zu. Sie zählt weiterhin in deinem privaten Budget.",
      step3: "Zurück unter Profil → Unternehmen öffnest du den Bericht mit Summen pro Unternehmen und Jahr und einer CSV für deine Steuerberatung.",
    },
  },
  "people-assignment": {
    title: "Wer hat das ausgegeben?",
    blurb:
      "Leg die Personen in deinem Haushalt an und ordne ihnen Ausgaben zu - beim Buchen oder beim Freigeben importierter Bankumsätze. Jede Buchung zeigt, zu wem sie gehört, damit gemeinsame Ausgaben endlich Namen haben.",
    cta: "Personen anlegen",
    guide: {
      where: "Profil-Tab → Personen",
      step1: "Leg die Personen in deinem Haushalt unter Profil → Personen an.",
      step2: "Wähl beim Buchen einer Ausgabe oder beim Freigeben im Prüfposteingang, für wen sie war - eine Person oder alle, die sie sich geteilt haben.",
      step3: "Jede Buchung zeigt ihre Namen; geteilte Ausgaben werden in den Berichten pro Person gleichmäßig aufgeteilt.",
    },
  },
  "receipt-photos": {
    title: "Beleg anhängen",
    blurb:
      "Knips bis zu drei Belegfotos direkt im Formular an jede Buchung. Die Fotos werden vor dem Speichern verschlüsselt und verlassen dein Handy nie - außer du exportierst sie selbst.",
    cta: "Buchung hinzufügen",
    guide: {
      where: "Budget-Tab → + Buchung hinzufügen → Belegfotos",
      step1: "Leg eine Ausgabe an oder bearbeite sie und scrolle zu Belegfotos.",
      step2: "Nimm ein Foto auf oder wähl eins aus deiner Mediathek - bis zu drei pro Buchung.",
      step3: "Die Fotos werden auf diesem Handy verschlüsselt und bleiben aus Partner-Sync und Sicherungen heraus. Der Export ist ein eigener, ausdrücklicher Schritt.",
    },
  },
  "tracking-reminders": {
    title: "Sanfte Erinnerungen",
    blurb:
      "Lass dich erinnern, wenn du länger keine Ausgaben gebucht hast, oder zum Monatsstart, damit du deine Ziele setzt. Alles wird nur auf deinem Handy geplant - auf dem Sperrbildschirm erscheint nichts über deine Finanzen.",
    cta: "Erinnerungen einrichten",
    guide: {
      where: "Profil-Tab → Einstellungen → Erinnerungen",
      step1: "Öffne Profil → Erinnerungen und schalte die Anstöße ein, die du möchtest: ein Check-in nach einer ruhigen Phase oder eine Erinnerung zum Monatsstart.",
      step2: "Erlaube Benachrichtigungen, wenn dein Handy danach fragt.",
      step3: "Erinnerungen werden nur auf diesem Handy geplant und nennen nie Beträge oder Konten.",
    },
  },
  "account-change-tracker": {
    title: "Sieh, wie deine Konten steigen und fallen",
    blurb:
      "Jedes Konto und jede Kategorie auf der Brücke zeigt jetzt, wie viel es im gewählten Zeitraum hoch oder runter ging - ein Tag, eine Woche, ein Monat oder ein Quartal. Privat auf diesem Handy aus deinen eigenen Salden und Kursen erfasst; nichts verlässt das Gerät.",
    cta: "Zur Brücke",
    guide: {
      where: "Brücke-Tab → Änderung-Chips über deinen Konten",
      step1: "Öffne die Brücke und wähl mit den Änderung-Chips einen Zeitraum: ein Tag, eine Woche, ein Monat oder ein Quartal.",
      step2: "Jedes Konto und jede Kategorie zeigt, wie viel es in diesem Zeitraum hoch oder runter ging.",
      step3: "Der Verlauf entsteht aus einem täglichen Schnappschuss auf diesem Handy - die ersten Tage zeigen also weniger als einen vollen Zeitraum.",
    },
  },
  "what-if-spending": {
    title: "Was wäre, wenn du nichts mehr ausgibst für …?",
    blurb:
      "Wähl eine Ausgabenkategorie und sieh, was das Umlenken dieses Geldes bringen könnte: wie viel früher du schuldenfrei wärst, welche Zinsen du dir sparst oder was daraus in 1, 5 und 10 Jahren wird. Zu finden unter Werkzeuge im Karten-Tab.",
    cta: "Was-wäre-wenn starten",
    guide: {
      where: "Karten-Tab → Werkzeuge → Was wäre, wenn ich nichts mehr ausgebe für…",
      step1: "Öffne den Karten-Tab, scrolle zu Werkzeuge und tipp auf Was wäre, wenn ich nichts mehr ausgebe für….",
      step2: "Wähl eine Kategorie; BudgetArk nimmt deinen echten Monatsdurchschnitt dafür.",
      step3: "Vergleich die Ergebnisse: früher schuldenfrei und gesparte Zinsen, oder was aus dem Geld in 1, 5 und 10 Jahren wird.",
    },
  },
  "purchase-planner": {
    title: "Anschaffung planen, Ziele behalten",
    blurb:
      "Nenn das Ding, auf das du sparst, und BudgetArk baut den Ansparposten drumherum: einen Monatsbetrag, der zu deinem echten Cashflow passt, den Monat, in dem es so weit ist, und Rat passend zu deiner Etappe in Baue deine Arche - damit die Anschaffung deinen Plan nie aus der Bahn wirft.",
    cta: "Anschaffung planen",
    guide: {
      where: "Karten-Tab → Werkzeuge → Anschaffung planen",
      step1: "Öffne Karten → Werkzeuge → Anschaffung planen und nenn, worauf du sparst, den Preis und wann du es haben möchtest.",
      step2: "BudgetArk schlägt einen Monatsbetrag vor, der zu deinem Cashflow passt, und sagt dir den Monat, in dem es so weit ist.",
      step3: "Gespeicherte Pläne erscheinen auf der Karte Anschaffungspläne auf der Brücke, wo du buchst, was du zurückgelegt hast.",
    },
  },
  "take-home-pay": {
    title: "Was wirklich auf dem Konto ankommt",
    blurb:
      "Gib Gehalt, Steuerklasse und US-Bundesstaat ein und sieh dein echtes Nettogehalt pro Zahlung - Bundessteuer, Staatssteuer, Social Security und Medicare, alles aus gebündelten Steuertabellen, die nie nach Hause telefonieren. Tipp auf einen anderen Bundesstaat und sieh, was dort vom selben Gehalt bleibt.",
    cta: "Nettogehalt schätzen",
    guide: {
      where: "Karten-Tab → Werkzeuge → Nettogehalt",
      step1: "Öffne Karten → Werkzeuge → Nettogehalt und gib Gehalt, Steuerklasse und Bundesstaat ein.",
      step2: "Lies das Nettogehalt pro Zahlung ab, aufgeschlüsselt nach Bundessteuer, Staatssteuer, Social Security und Medicare.",
      step3: "Tipp auf einen anderen Bundesstaat, um zu vergleichen, was dort vom selben Gehalt bleibt. Nur US-Steuertabellen, in der App gebündelt - nichts wird irgendwohin gesendet.",
    },
  },
  "app-lock": {
    title: "App hinter einer PIN sperren",
    blurb:
      "Schalte die App-Sperre ein, und BudgetArk fragt bei jedem Öffnen nach einer 4- bis 8-stelligen PIN - so kann niemand, der dein Handy ausleiht, in deinen Finanzen stöbern. Die PIN bleibt auf diesem Gerät - nie synchronisiert, exportiert oder gesichert.",
    cta: "App-Sperre einrichten",
    guide: {
      where: "Profil-Tab → Einstellungen → App-Sperre",
      step1: "Öffne Profil → App-Sperre und schalte sie ein.",
      step2: "Wähl eine 4- bis 8-stellige PIN und bestätige sie.",
      step3: "BudgetArk fragt bei jedem Öffnen nach der PIN. Sie bleibt auf diesem Gerät - nie synchronisiert, exportiert oder gesichert - also bewahr sie sicher auf.",
    },
  },
  "theme-fleet": {
    title: "Sieben neue Designs für deine Arche",
    blurb:
      "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn und Ledger sind zur Flotte gestoßen - von Tiefseeblau mit biolumineszentem Schimmer über ein Hochkontrast-Design mit geprüfter Lesbarkeit, eine Seekarte und einen pfirsichfarbenen Sonnenaufgang bis zum klassischen grünen Buchhaltungspapier. Alle unter Darstellung ausprobieren.",
    cta: "Designs ansehen",
    guide: {
      where: "Profil-Tab → Darstellung → Farbschema",
      step1: "Öffne Profil → Darstellung und tipp auf Farbschema.",
      step2: "Wähl ein Design; die ganze App wechselt beim Antippen.",
      step3: "Oberflächenstil und Stimmungshintergründe auf derselben Karte regeln Glas-Karten und den bewegten Hintergrund.",
    },
  },
  "subscription-detective": {
    title: "Abo-Detektiv",
    blurb:
      "Ein neues Werkzeug im Karten-Tab findet importierte Bankabbuchungen, die sich wie ein Abo wiederholen - monatlich oder jährlich - ohne hinterlegte Rechnung, rechnet zusammen, was sie im Jahr kosten, und macht jede mit einem Tipp zur wiederkehrenden Rechnung.",
    cta: "Detektiv starten",
    guide: {
      where: "Karten-Tab → Werkzeuge → Abo-Detektiv",
      step1: "Verbinde zuerst eine Bank oder importiere einen Kontoauszug - der Detektiv liest importierte Abbuchungen.",
      step2: "Öffne Karten → Werkzeuge → Abo-Detektiv und sieh Abbuchungen, die sich monatlich oder jährlich ohne hinterlegte Rechnung wiederholen, und was sie im Jahr kosten.",
      step3: "Tipp auf eine, um sie zur wiederkehrenden Rechnung zu machen; künftige Abbuchungen werden ihr automatisch zugeordnet.",
    },
  },
  "owed-to-you": {
    title: "Dir geschuldet",
    blurb:
      "Jemandem Geld geliehen? Nenn die Person beim Buchen der Ausgabe (oder im Prüfposteingang), verfolge, was sie noch schuldet, und buche jede Rückzahlung unter Profil → Personen → Dir geschuldet.",
    cta: "Dir geschuldet öffnen",
    guide: {
      where: "Profil-Tab → Personen → Dir geschuldet",
      step1: "Buchst du eine Ausgabe, die du zurückerwartest, schalte Verliehen? ein und nenn die Person.",
      step2: "Öffne Profil → Personen → Dir geschuldet, um zu sehen, was jede Person noch schuldet.",
      step3: "Buche dort jede Rückzahlung; der Saldo schrumpft, bis alles beglichen ist.",
    },
  },
  "net-worth-goal": {
    title: "Wohin dein Nettovermögen steuert",
    blurb:
      "Die Brücke führt deine Nettovermögenslinie jetzt weiter - aus dem Monatsüberschuss deines Budgets und deinen Schulden bei Mindestrate. Setz ein Ziel - ein Betrag bis zu einem Monat - und sieh, ob du auf Kurs bist, was es pro Monat bräuchte und wann das heutige Tempo ankommt.",
    cta: "Prognose ansehen",
    guide: {
      where: "Brücke-Tab → Karte Wohin es geht",
      step1: "Öffne die Brücke und such das Nettovermögens-Diagramm Wohin es geht unter deinen Konten.",
      step2: "Tipp auf Nettovermögensziel setzen und gib einen Betrag und einen Monat ein.",
      step3: "Die Karte sagt, ob du auf Kurs bist, was es pro Monat bräuchte und wann das heutige Tempo ankommt.",
    },
  },
  "paycheck-cycle": {
    title: "Bis zum Zahltag",
    blurb:
      "Budgetiere nach Zahlungsperiode statt Kalendermonat: Sag BudgetArk, wann du bezahlt wirst, und der Budget-Tab zeigt, was vor der nächsten Zahlung fällig ist und was bis dahin verfügbar bleibt.",
    cta: "Zahlungsperioden einrichten",
    guide: {
      where: "Budget-Tab → Karte Bis zum Zahltag",
      step1: "Tipp im Budget-Tab auf Zahlungsperioden einrichten auf der Karte Bis zum Zahltag.",
      step2: "Gib ein, wann du bezahlt wirst und wie oft.",
      step3: "Die Karte zeigt, was vor der nächsten Zahlung fällig ist und - mit erfasstem Startsaldo - was bis zum Zahltag verfügbar bleibt.",
    },
  },
  "quarterly-taxes": {
    title: "Quartalssteuern",
    blurb:
      "Buche 1099-Einnahmen, und das neue Werkzeug im Karten-Tab zeigt jedes IRS-Quartal: was du verdient und was du zurückgelegt hast, die geschätzte Zahlung und ihre Fälligkeit - mit einem Als bezahlt markieren pro Quartal.",
    cta: "Meine Quartale ansehen",
    guide: {
      where: "Karten-Tab → Werkzeuge → Quartalssteuern",
      step1: "Buche Einnahmen als 1099 / Auftragnehmer mit einem Anteil als Steuerrücklage.",
      step2: "Öffne Karten → Werkzeuge → Quartalssteuern und sieh jedes IRS-Quartal: verdient, zurückgelegt, die geschätzte Zahlung und ihre Fälligkeit.",
      step3: "Tipp auf Als bezahlt markieren, sobald du die Zahlung eines Quartals überwiesen hast.",
    },
  },
  "purchase-plan-priorities": {
    title: "Anschaffungspläne, der Reihe nach",
    blurb:
      "Die Karte Anschaffungspläne rechnet jetzt alles zusammen - gespart, noch offen und wann alles finanziert ist - und lässt dich die Pläne ordnen: kleinste zuerst, dringendste zuerst oder in deiner eigenen Reihenfolge. Setz einen Monatsbetrag, und er fließt wie ein Schulden-Schneeball die Liste hinunter, jeder Plan rollt in den nächsten.",
    cta: "Meine Pläne ansehen",
    guide: {
      where: "Brücke-Tab → Karte Anschaffungspläne → Reihenfolge",
      step1: "Speichere zwei oder mehr Pläne mit Anschaffung planen im Karten-Tab.",
      step2: "Wähl auf der Karte Anschaffungspläne auf der Brücke eine Reihenfolge: Kleinste zuerst, Dringendste zuerst oder Meine Reihenfolge.",
      step3: "Setz einen Monatsbetrag; er finanziert den ersten Plan und rollt dann wie ein Schulden-Schneeball in den nächsten.",
    },
  },
  "bank-statement-import": {
    title: "Kontoauszug importieren",
    blurb:
      "Lade eine CSV von der Website deiner Bank herunter, und BudgetArk liest sie: Bestätige einmal, welche Spalten Datum, Beschreibung und Betrag sind, und jeder Umsatz landet zur Freigabe im Prüfposteingang. Für die Monate vor deiner Bankverbindung - oder eine Bank, die du nie verbinden wirst.",
    cta: "Kontoauszug importieren",
    guide: {
      where: "Profil-Tab → Daten → Importieren → Kontoauszug",
      step1: "Lade eine Umsatz-CSV von der Website deiner Bank herunter.",
      step2: "Öffne Profil → Daten → Importieren → Kontoauszug und wähl die Datei; bestätige, welche Spalten Datum, Beschreibung und Betrag enthalten.",
      step3: "Jede Zeile landet im Prüfposteingang des Budget-Tabs zum Freigeben, Kategorisieren oder Überspringen. Die Spaltenzuordnung wird pro Bank gemerkt, und erneutes Importieren verdoppelt nichts.",
    },
  },
  "tip-jar": {
    title: "Trinkgeldkasse",
    blurb:
      "Optionale einmalige Trinkgelder, komplett über den App-Store abgewickelt. Schaltet nichts frei - jede Funktion ist schon kostenlos.",
    guide: {
      where: "Profil-Tab → Trinkgeldkasse",
      step1: "Öffne Profil → Trinkgeldkasse.",
      step2: "Wähl einen Betrag; die Zahlung läuft über den App-Store. Es schaltet nichts frei - jede Funktion ist schon kostenlos.",
    },
  },
};
