/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (coachmarks)
 * File: src/i18n/locales/de/dataCoachmarks.ts
 *
 * German counterpart of en/dataCoachmarks.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. `keywords` are lowercase,
 * comma-separated search synonyms: German terms plus the product words a
 * German user would still type in English (csv, excel, simplefin, etf).
 * Theme and product names stay untranslated.
 */

import type { Localized } from "../types";
import type { dataCoachmarks as en } from "../en/dataCoachmarks";

export const dataCoachmarks: Localized<typeof en> = {
  DebtTracker: {
    intro: "Schulden - dein Tilgungsplan",
    steps: {
      "debts-summary": {
        title: "Deine Schulden auf einen Blick",
        body: "Gesamtsaldo, insgesamt bezahlt und der Gesamtfortschritt stehen hier. Der Ring rechts zeigt, wie viel Prozent du über alle Schulden hinweg getilgt hast, und der Countdown darunter rechnet aus deinem echten Zahlungstempo den Tag aus, an dem du schuldenfrei bist.",
        detail: "Die Übersichtskarte summiert jede Schuld, die du verfolgst: was du noch schuldest, was du schon getilgt hast, und der Fortschrittsring zeigt den bereinigten Anteil. Darunter grenzt der Filter Meine / Partner / Gemeinsam die Liste auf einen Inhaber ein - die Summen folgen dem Filter, sodass ein Paar mit einem Tipp jede Seite einzeln sehen kann. Getilgte Schulden bleiben mit Saldo 0 in der Liste (samt Verlauf), damit dein Fortschritt nie verliert, was du schon geschafft hast. Direkt unter der Übersicht zeigt der Schuldenfrei-Countdown die Jahre, Monate und Tage, bis du voraussichtlich nichts mehr schuldest - berechnet aus deinem echten Zahlungstempo der letzten sechs Monate gebuchter Zahlungen (oder aus deinen Mindestraten, solange es noch keinen Verlauf gibt). Eine größere Zahlung zieht das Datum sichtbar näher.",
        location: "Schulden-Tab (oberste Karte)",
        keywords: "gesamt, summe, übersicht, fortschritt, getilgt, abbezahlt, inhaber, partner, gemeinsam, ring, countdown, schuldenfrei, schuldenfrei-datum, tilgungsdatum",
      },
      "debts-fab": {
        title: "Schuld hinzufügen mit +",
        body: "Tippe auf +, um eine Kreditkarte, einen Kredit oder eine Hypothek anzulegen. Du gibst Saldo, Zinssatz und Mindestrate an - jede gebuchte Zahlung senkt den Saldo.",
        detail: "Jede Schuld bekommt einen Namen, den aktuellen Saldo, den effektiven Jahreszins und die monatliche Mindestrate, dazu eine Art (Kredit / Privat, Auto oder Haus - die Art steuert die Tilgungsreihenfolge), einen Inhaber, optional einen Fälligkeitstag für Erinnerungen und optional ein Zieldatum für die Tilgung, das die dafür nötige Monatsrate zeigt. Kreditkarten kannst du mit Saldo 0 anlegen - praktisch, wenn du eine abbezahlte Karte nur mit der Karten-Wache im Blick behalten willst. Alles lässt sich später über Bearbeiten auf der Karte ändern.",
        location: "Schulden-Tab → Taste +",
        keywords: "hinzufügen, neue schuld, kredit, darlehen, hypothek, kreditkarte, zinssatz, zinsen, effektiver jahreszins, mindestrate, zieldatum, fälligkeitstag",
      },
      "debts-payments": {
        title: "Zahlungen laufend buchen",
        body: "Tippe auf eine Schuldkarte, um eine Zahlung zu buchen oder ihren Zahlungsverlauf zu öffnen - jede Zahlung senkt den Saldo und zählt zu deinem Fortschritt. Gib einer Schuld einen Fälligkeitstag, und BudgetArk erinnert dich in der App, wenn er näher rückt - am Fälligkeitstag selbst mit einem Ein-Tipp-Angebot, die Mindestrate zu buchen.",
        detail: "Klapp eine Schuldkarte auf und buche mit Zahlen eine Zahlung - Überzahlungen werden gekappt, damit Anzeigerundung nie einen verirrten Cent stehen lässt, und ein getilgter Saldo löst eine Tilgungsfeier aus. Der Zahlungsverlauf (mit Löschen und Rückgängig pro Zahlung) steckt ebenfalls hinter der Karte. Lege beim Anlegen oder Bearbeiten einen Fälligkeitstag fest, und über der Liste erscheint ein Erinnerungsbanner, wenn der Tag näher rückt; am Tag selbst bietet ein Hinweis beim Öffnen der App an, die Mindestrate mit einem Tipp zu buchen. Eine weggewischte Erinnerung schweigt nur für diesen Monat. Gebuchte Zahlungen erscheinen auch im Budget-Tab in der Kategorie Schuldenzahlungen, damit beide Tabs immer übereinstimmen.",
        location: "Schulden-Tab → auf eine Schuldkarte tippen",
        keywords: "zahlung, zahlen, buchen, verlauf, historie, fälligkeit, erinnerung, banner, mindestrate, rückgängig, tilgung",
      },
      "debts-keepalive": {
        title: "Ruhende Kreditkarten aktiv halten",
        body: "Banken können eine ungenutzte Kreditkarte kündigen - und deine Bonität leidet darunter. Schalte für jede Karte die Karten-Wache ein, und BudgetArk warnt dich, bevor ihr Inaktivitätsfenster abläuft.",
        detail: "Bearbeite eine Kreditkarten-Schuld und schalte Karte aktiv halten ein. Gib an, wie viel Inaktivität die Bank erlaubt (3, 6, 12 oder 24 Monate - das variiert, 6 ist ein sicherer Standard) und wie früh du gewarnt werden willst (14, 30 oder 60 Tage). Rückt die Frist näher, nennt ein Banner auf Brücke und Schulden-Tab die Karte und ihr Nutzen-bis-Datum, und eine dezente Benachrichtigung stupst dich an - auf dem Sperrbildschirm erscheinen nie Kartenname oder Betrag. Nach einem Kauf tippst du auf der Karte auf Benutzt, um die Uhr zurückzusetzen; oder du verknüpfst die Karte mit einer Bankverbindung, und das Datum der letzten Nutzung stempelt sich aus deinen synchronisierten Umsätzen selbst. Später im Banner schlummert eine Karte für den laufenden Monat. Karte absichtlich gekündigt? Schalte ihre Wache einfach aus.",
        location: "Schulden-Tab → auf eine Karte tippen → Bearbeiten (nur Kreditkarten)",
        keywords: "aktiv halten, karten-wache, kreditkarte, inaktivität, gekündigt, kündigung, bonität, schufa, ungenutzt, ruhend, benachrichtigung, benutzt, wache, frist",
      },
      "debts-strategy": {
        title: "Tilgungsstrategie wählen",
        body: "Wähle Lawine (höchster Zinssatz zuerst), Schneeball (kleinster Saldo zuerst) oder behalte deine eigene Reihenfolge. Deine Strategie steuert die Tilgungsprognosen hier und in den Werkzeugen im Karten-Tab.",
        detail: "Lawine zahlt rechnerisch die wenigsten Zinsen, weil sie den höchsten Zinssatz zuerst angreift; Schneeball kauft Motivation, indem sie die kleinsten Salden zuerst räumt; Eigene behält die Reihenfolge, die du festlegst. Die gewählte Strategie bestimmt, welche Schuld dein Fokus ist (ihre Karte startet aufgeklappt), formt die Schuldenfrei-Prognosen und ist das, womit das Was-wäre-wenn-Werkzeug im Karten-Tab rechnet, wenn es zeigt, wie umgelenkte Ausgaben deine Tilgung beschleunigen. Hypotheken werden getrennt behandelt, damit ein Haus den Plan nicht erdrückt.",
        location: "Schulden-Tab (Strategiezeile unter der Übersicht)",
        keywords: "lawine, schneeball, strategie, reihenfolge, zinsen, fokus, prognose",
      },
      "debts-milestones": {
        title: "Meilensteine: Baue deine Arche",
        body: "Tippe auf die Meilenstein-Karte, um Ziele für die 7 finanziellen Meilensteine zu setzen - erstes Polster, schuldenfrei, Notgroschen, Altersvorsorge und darüber hinaus.",
        detail: "Baue deine Arche ist BudgetArks finanzieller Weg Schritt für Schritt: Kiel (erstes Polster), Rumpf (teure Schulden), Deck (voller Notgroschen), Vorräte (Ansparposten), Tiere sammeln (Altersvorsorge und Ausbildung), Anker (Hypothek) und Segel (Vermögen aufbauen). Tippe auf die Leiste, um den Planer zu öffnen, setze deine eigenen Zielbeträge und verfolge den Fortschritt je Etappe - die App liest deine echten Salden, Ersparnisse und Schulden, um die Balken zu füllen. Deine aktuelle Etappe stimmt auch Ratschläge anderswo ab, etwa ob eine Anschaffung im Werkzeug Anschaffung planen gerade passt.",
        location: "Schulden-Tab → Leiste Baue deine Arche",
        keywords: "meilensteine, arche, kiel, rumpf, notgroschen, etappen, schritte, plan, baby steps",
      },
    },
  },
  Budget: {
    intro: "Budget - was reinkommt, was rausgeht",
    steps: {
      "budget-summary": {
        title: "Einnahmen gegen Ausgaben",
        body: "Die oberste Karte zeigt Einnahmen, Ausgaben und Netto dieses Monats. Mit den Pfeilen < > darüber blätterst du in vergangene Monate - ein ganzes Jahr Verlauf bleibt erhalten.",
        detail: "Die Monatskarte summiert Einnahmen, Ausgaben und den Netto-Unterschied, mit W-2- / 1099-Markierungen auf Einnahmezeilen, einer Zeile für 401(k)-Beiträge, wenn du sie erfasst, und einer Zeile 1099-Steuerrücklage, die zeigt, was du diesen Monat für Steuern zurücklegen solltest. Mit den Pfeilen < > blätterst du durch vergangene Monate - abgeschlossene Monate zeigen genau, was damals war, und schreiben sich nie um, wenn du heute Einstellungen änderst. Der Monatsrückblick am Monatsende fasst zusammen, wie es lief.",
        location: "Budget-Tab (oberste Karte)",
        keywords: "einnahmen, ausgaben, netto, monat, verlauf, übersicht, monatsrückblick, pfeile",
      },
      "budget-cashflow": {
        title: "Cashflow - was verfügbar ist",
        body: "Sag BudgetArk zum Monatsanfang, was auf deinem Girokonto liegt. Die Cashflow-Karte rechnet vor, wo der Monat endet - Einnahmen rein, geplante Rechnungen und Mindestraten raus - und zeigt einen verfügbaren Betrag, der sich mit jeder Buchung live aktualisiert.",
        detail: "Die Cashflow-Karte verankert dein Budget in der Realität: eine echte Zahl, dein Girokontostand, einmal im Monat eingegeben (ein Hinweis fragt danach; überspringst du ihn, bleibt eine Taste Festlegen auf der Karte). Daraus rechnet sie das Monatsende vor - Einnahmen rein, Ausgaben raus, geplante Rechnungen und Mindestraten inklusive - und zeigt Verfügbar, das sich live bewegt, während du buchst. Ein neuer Monatsstand gleicht außerdem die Realität mit dem Plan des Vormonats ab (\"150 $ unter Plan gestartet\"), sodass Abweichungen sofort sichtbar werden. Hast du genau ein Girokonto auf deiner Brücke, aktualisiert der Monatsstand auch dieses. Der Verlauf der Kontostände synchronisiert sich mit deinem Partner und wandert in deine Sicherungen.",
        location: "Budget-Tab → Cashflow-Karte",
        keywords: "cashflow, verfügbar, girokonto, kontostand, prognose, monatsanfang, abgleich, übrig",
      },
      "budget-spending": {
        title: "Aufschlüsselung nach Kategorie",
        body: "Das Ringdiagramm schlüsselt die Ausgaben nach Kategorie auf. Tippe auf eine Kategorie, um die Buchungen darin zu sehen oder ein Monatslimit zu setzen.",
        detail: "Jede Ausgabe landet in einer Kategorie, und der Ring zeigt, wohin der Monat ging. Tippe auf ein Segment oder eine Zeile, um die Kategorie aufzuklappen: jede Buchung darin, mit Bearbeiten und Löschen, plus ein Monatslimit je Kategorie - Limits gelten Monat für Monat weiter und wissen im laufenden Monat, welcher Tag ist: Eine kleine Marke auf jedem Balken zeigt, wo eine gleichmäßige Verteilung heute stünde, der Balken wird bernsteinfarben, wenn du schneller ausgibst, und eine Karte Ausgabentempo oben im Tab nennt jede Kategorie, die über dem Limit liegt oder darauf zusteuert. Kategorien sind in die Töpfe Bedürfnisse, Wünsche und Sparen gruppiert (unter Profil → Kategorien umsortierbar), und du kannst eigene Kategorien für alles anlegen, was die eingebauten nicht abdecken.",
        location: "Budget-Tab → Ausgabenring",
        keywords: "kategorie, kategorien, ring, diagramm, limit, budgetlimit, tempo, auf kurs, ausgabentempo, bedürfnisse, wünsche, eigene kategorie",
      },
      "budget-fab": {
        title: "Buchung hinzufügen mit +",
        body: "Einnahme, Ausgabe oder Sparbuchung. Markiere alles, was sich wiederholt, als wiederkehrend, und es füllt sich jeden Monat von selbst aus. Einnahmen lassen sich als W-2- oder 1099-Gehalt kennzeichnen, und jede Buchung kann als 🔒 privat markiert werden, damit sie nie auf das Gerät deines Partners synchronisiert wird.",
        detail: "Buchungen sind das Herz des Budgets: Art (Einnahme / Ausgabe), Kategorie, Betrag, Datum (wähle den Tag, an dem es passiert ist - Standard ist heute, mit einer Heute-Abkürzung) und optional eine Beschreibung. Wiederkehrende Buchungen tragen sich jeden Monat selbst ein, bis du sie stoppst - perfekt für Miete, Abos und Gehalt. Einnahmen lassen sich als W-2 kennzeichnen (du gibst den Nettobetrag ein und kannst die einbehaltenen 401(k)-Dollar festhalten, damit die Altersvorsorge trotzdem zählt) oder als 1099 / Honorar (nichts wird einbehalten, also zeigt BudgetArk, wie viel du zu einem Prozentsatz deiner Wahl für Steuern zurücklegen solltest). Ausgaben können bis zu drei verschlüsselte Belegfotos und eine Geschäftszuordnung tragen. Der Schalter 🔒 Privat hält eine Buchung komplett vom Gerät deines gekoppelten Partners fern - für Geschenke, Überraschungen oder Ausgaben, die einfach deine sind - während sie in deinem eigenen Budget, in Sicherungen und Exporten weiter zählt (markiere sie beim Anlegen als privat; eine schon synchronisierte Kopie bleibt beim Partner). Die mehrzeilige Schnellerfassung lässt dich mehrere Einkäufe in einem Rutsch eingeben. Rechnungen, die monatlich schwanken (Strom, Wasser, Gas), funktionieren am besten als wiederkehrende Schätzung plus die echte Abbuchung: Tippe in der Zeile der Rechnung auf Ist-Betrag buchen oder wähle die Rechnung unter Gehört zu Rechnung, wenn du die Ausgabe anlegst oder im Prüfposteingang freigibst - in diesem Monat ersetzt der Ist-Betrag dann überall die Schätzung, statt sich obendrauf zu stapeln. Beim Bearbeiten einer Rechnung siehst du den Durchschnitt der letzten Ist-Beträge, mit Aktualisierung per Tipp.",
        location: "Budget-Tab → Taste +",
        keywords: "buchung hinzufügen, einnahme, ausgabe, wiederkehrend, abo, w-2, w2, 1099, gehalt, 401k, altersvorsorge, steuern, rücklage, privat, geschenk, verbergen, geheim, rechnung, ist-betrag, nebenkosten, strom, wasser, schätzung, gehört zu rechnung",
      },
      "budget-widget": {
        title: "Schnelleingabe vom Startbildschirm (Android)",
        body: "Füge das BudgetArk-Widget über die Widget-Auswahl deines Launchers hinzu und buche eine Ausgabe mit einem Tipp - wähle eine Kategorie, und das Formular Buchung hinzufügen öffnet sich mit dieser Kategorie vorausgewählt.",
        detail: "Halte deinen Android-Startbildschirm gedrückt, öffne die Widget-Auswahl und füge Schnelleingabe hinzu. Das Widget ist ein kleines Raster alltäglicher Kategorien - Lebensmittel, Restaurant, Verkehr, Einkaufen, Unterhaltung, Sonstiges - und ein Tipp darauf springt direkt ins Formular Buchung hinzufügen mit vorausgewählter Kategorie, sodass ein Einkauf in Sekunden gebucht ist. Das Widget zeigt nichts über deine Finanzen - keine Salden, keine Summen - und ist damit auf jedem Startbildschirm sicher. (Für iOS gibt es das Widget noch nicht.)",
        location: "Android-Startbildschirm → gedrückt halten → Widgets → BudgetArk",
        keywords: "widget, startbildschirm, homescreen, schnelleingabe, schnell hinzufügen, verknüpfung, android, launcher",
      },
      "budget-inbox": {
        title: "Prüfposteingang für Bankimporte",
        body: "Bank im Profil verbunden? Neue Umsätze warten hinter dem Ablage-Symbol oben auf diesem Bildschirm - nichts kommt ins Budget, bevor du es freigibst. Hake beim Freigeben oder Überspringen Immer so machen an, um BudgetArk eine Händlerregel beizubringen, und ändere jede gespeicherte Regel später über die Taste Regeln.",
        detail: "Der Prüfposteingang ist das Tor zwischen deiner Bank und deinem Budget: Jeder importierte Umsatz wartet dort, bis du ihn freigibst, bearbeitest oder überspringst - nichts wird je still hinzugefügt. Hakst du beim Freigeben Immer so machen an, kommen künftige Abbuchungen dieses Händlers vorkategorisiert an, bereit zur Sammelfreigabe mit einem Tipp; hakst du es beim Überspringen an, wird der Händler (eine Kreditkartenzahlung, eine Umbuchung) nie wieder importiert. Die Taste Regeln im Kopf des Posteingangs listet jede gespeicherte Regel, damit du einen Händler zwischen Überspringen und Kategorisieren umschalten, eine andere Kategorie wählen oder die Regel löschen kannst - Änderungen gelten für künftige Importe und alles, was noch im Posteingang wartet. Wahrscheinliche Umbuchungen und wahrscheinliche Duplikate von Hand eingetragener Buchungen werden markiert und beiseitegelegt, damit nichts doppelt zählt, und Entscheidungen bleiben dauerhaft gespeichert - ein neuer Sync oder eine wiederhergestellte Sicherung fragt nie erneut.",
        location: "Budget-Tab → Ablage-Symbol (oben)",
        keywords: "prüfposteingang, posteingang, bank, import, umsätze, transaktionen, freigeben, überspringen, händler, regeln, immer, ignorieren, umbuchung, überweisung, duplikat, sync",
      },
      "budget-receipts": {
        title: "Belege und Geschäftsausgaben",
        body: "Hänge bis zu drei Belegfotos an jede Buchung - sie sind verschlüsselt und verlassen dieses Handy nie. Ordne eine Ausgabe einem Unternehmen zu (Unternehmen legst du im Profil an), und sie bekommt ein 💼-Abzeichen; ein Bericht zur Steuerzeit mit CSV- und Belegexport wartet unter Profil → Geschäftsausgaben.",
        detail: "Knipse oder wähle bis zu drei Belegfotos im Formular zum Anlegen und Bearbeiten - Fotos werden verkleinert, mit demselben Schlüssel wie alles andere verschlüsselt und nur auf diesem Handy gespeichert (ein gekoppelter Partner sieht einen Platzhalter, Sicherungen lassen sie aus, und nichts wird je hochgeladen). Lege unter Profil → Geschäftsausgaben Unternehmen an und ordne ihnen Ausgaben zu; zugeordnete Buchungen zählen weiter in deinem normalen Budget - getrennt wird erst zur Steuerzeit, wenn der Geschäftsausgaben-Bericht Summen je Unternehmen nach Kategorie liefert, eine CSV für die Steuerberatung und optional ein Zip mit den Belegfotos des Jahres, benannt passend zu den CSV-Zeilen. Exporte passieren nur, wenn du sie ausdrücklich bestätigst.",
        location: "Budget-Tab → + / Buchung bearbeiten · Profil → Geschäftsausgaben",
        keywords: "beleg, quittung, foto, kamera, anhang, unternehmen, geschäftlich, steuer, bericht, csv, export, steuerberater, zip",
      },
    },
  },
  Bridge: {
    intro: "Brücke - dein Nettovermögen",
    steps: {
      "bridge-history": {
        title: "Dein Nettovermögen",
        body: "Nettovermögen = alles, was du besitzt, minus alles, was du schuldest. Die große Zahl fasst Schulden, Ersparnisse, Altersvorsorge, Investitionen und verfolgte Konten zusammen. Das Diagramm darunter zeichnet das Nettovermögen über die Zeit - Momentaufnahmen speichern sich automatisch, wenn sich Salden ändern.",
        detail: "Die Brücke ist deine finanzielle Kommandozentrale und der Start-Tab der App. Die Kopfzahl ist Vermögen (Konten, Ersparnisse, bewertete Investitionen) minus Verbindlichkeiten (deine verfolgten Schulden), und das Diagramm zeichnet sie über die Zeit aus Momentaufnahmen, die die App automatisch aufnimmt, sobald sich Salden ändern - keine Buchführung von Hand. Ein Cashflow-Diagramm darunter vergleicht Einnahmen und Ausgaben der letzten Monate auf einen Blick. Alles auf diesem Bildschirm wird auf deinem Handy aus deinen eigenen Daten berechnet.",
        location: "Brücke-Tab (oberes Diagramm)",
        keywords: "nettovermögen, vermögen, verbindlichkeiten, diagramm, verlauf, momentaufnahme, cashflow",
      },
      "bridge-accounts": {
        title: "Konten verwalten",
        body: "Füge Spar-, Altersvorsorge-, Depot- oder jedes andere Konto hinzu, das zum Nettovermögen zählen soll. Tippe auf eine Zeile, um den Saldo jederzeit zu aktualisieren - die Änderungen fließen zurück in die Brücke. Konten mit Bankverbindung halten ihre Salden nach jedem Sync automatisch aktuell.",
        detail: "Die Konten-Karte enthält alles, was du besitzt: Giro, Sparen, Notgroschen, Altersvorsorgekonten, Depots, HSAs - nach Kategorie gruppiert, mit Summen je Kategorie. Tippe auf + Hinzufügen, um eines anzulegen, und auf eine Zeile, um den Saldo zu aktualisieren oder es zu bearbeiten. Konten, die einer Bankverbindung zugeordnet sind (Profil → Bankverbindungen), aktualisieren sich nach jedem Sync selbst, sodass ihre Salden - und dein Nettovermögen - ohne Tippen aktuell bleiben. Anlagekonten können statt über einen eingetippten Saldo über ihre Live-Wertpapiere bewertet werden.",
        location: "Brücke-Tab → Konten-Karte",
        keywords: "konten, sparen, giro, altersvorsorge, hsa, depot, saldo, konto hinzufügen, verknüpft",
      },
      "bridge-changes": {
        title: "Konten steigen und fallen sehen",
        body: "Jede Kontozeile und jede Kategorieüberschrift zeigt, wie viel sie hoch oder runter ging - mit dem Schalter 1T / 7T / 30T / 90T änderst du den Zeitraum. Der Verlauf dahinter wird privat auf diesem Handy aufgezeichnet, während du die App nutzt, also erscheinen die Zahlen ab deinem zweiten Tag.",
        detail: "Unter jeder Kontozeile und Kategorieüberschrift zeigt eine Auf/Ab-Zeile die Veränderung im gewählten Zeitraum - ein Tag, eine Woche, ein Monat oder ein Quartal - grün für aufwärts, rot für abwärts, in Betrag und Prozent. Geldkonten folgen deinen Saldoänderungen; Depot- und Altersvorsorgekonten bewegen sich mit den Kursen ihrer Wertpapiere. Der tägliche Wertverlauf dahinter wird privat auf diesem Handy erfasst, während du die App nutzt - er synchronisiert nie und verlässt das Gerät nie -, sodass jedes Gerät ab dem Tag nach der ersten Nutzung dieser Version eigene Ausgangswerte aufbaut.",
        location: "Brücke-Tab → Schalter 1T / 7T / 30T / 90T",
        keywords: "anstieg, rückgang, veränderung, hoch, runter, delta, zeitraum, tracker, gewinn, verlust",
      },
      "bridge-plans": {
        title: "Anschaffungspläne",
        body: "Ansparposten, die du im Karten-Tab mit Anschaffung planen startest, werden hier verfolgt: ein Fortschrittsbalken je Plan, das Monatstempo, das ein Zieldatum braucht, und Einzahlen per Tipp. Gespartes Geld zählt zu deinem Nettovermögen, und ein voll finanzierter Plan meldet, dass er kaufbereit ist.",
        detail: "Jeder Anschaffungsplan, den du im Karten-Tab startest, lebt hier als Ansparposten: ein Fortschrittsbalken bis zum Preis, das nötige Monatstempo, wenn du ein Bis-wann-Datum gesetzt hast, und Einzahlen per Tipp, um Gespartes hinzuzufügen (oder zu korrigieren). Ein voll finanzierter Plan markiert sich selbst als kaufbereit. Pläne zählen wie jedes andere Sparen zu deinem Nettovermögen, synchronisieren sich mit deinem gekoppelten Partner und wandern in deine Sicherungen. Pläne der Kategorie Ausbildung speisen außerdem automatisch den Ausbildungs-Meilenstein der Arche.",
        location: "Brücke-Tab → Karte Anschaffungspläne",
        keywords: "anschaffung, pläne, ansparposten, ansparen, ziel, einzahlen, kaufbereit",
      },
      "bridge-holdings": {
        title: "Aktien und ETFs je Broker verfolgen (Live-Wertpapiere)",
        body: "Schalte Live-Wertpapiere ein, um Aktien und ETFs nach Broker geordnet zu verfolgen. Jeder Broker (z. B. Fidelity) liegt im Bereich Investitionen deiner Konten - tippe darauf, um seine Positionen aufzuklappen, mit einer Summe je Broker und einer Gesamtsumme über alle. Füge eine Position per Ticker und Stückzahl hinzu, und ihr Marktwert zählt zu deinem Nettovermögen. Kurse aktualisieren sich nur, wenn du auf Kurse aktualisieren tippst - füge also erst alle Ticker hinzu und hole die Kurse dann einmal. Die Funktion bleibt aus, bis du sie hier oder im Profil einschaltest, und beim ersten Mal siehst du genau, was dein Gerät verlässt. Nur deine Tickersymbole werden je gesendet, um Kurse nachzuschlagen - nie Stückzahlen, Salden oder wer du bist.",
        detail: "Live-Wertpapiere ist strikt freiwillig. Einmal eingeschaltet, klappt jedes Brokerkonto im Bereich Investitionen seine Positionen auf - füge eine per Tickersymbol und Stückzahl hinzu, und ihr Marktwert (Stück × letzter Kurs) fließt in die Summe des Brokers und dein Nettovermögen. Kurse aktualisieren sich nur, wenn du auf Kurse aktualisieren tippst; große Depots werden in Paketen geholt, und die Taste sagt dir, wenn einige Ticker noch ausstehen. Der Datenschutzvertrag ist präzise: Nur Tickersymbole verlassen dein Handy, um Kurse nachzuschlagen - nie Stückzahlen, Salden oder etwas, das dich identifiziert - und vor der ersten Anfrage siehst du einen Hinweis in Klartext.",
        location: "Brücke-Tab → Anlagekonten (freiwillig)",
        keywords: "aktien, etf, wertpapiere, ticker, anteile, stück, broker, fidelity, kurse, investieren, depot, portfolio",
      },
    },
  },
  Utilities: {
    intro: "Karten - Lektionen, Rechner und Prognosen",
    steps: {
      "charts-course": {
        title: "Der Kurs des Kapitäns",
        body: "Ein kostenloser Finanzkurs in 5 Kapiteln und 24 kurzen Lektionen - Budgetgrundlagen, Schulden loswerden, Sparen, Investieren und langfristiger Vermögensaufbau. Dein Fortschritt wird gespeichert, und du kannst die Lektionen in beliebiger Reihenfolge lesen.",
        detail: "Fünf Kapitel, 24 kurze Lektionen, komplett kostenlos und in beliebiger Reihenfolge lesbar: Segel setzen (Budgetgrundlagen), Den Rumpf flicken (Schulden), Die Kombüse füllen (Notgroschen, Tagesgeld, Ansparposten), Wind fangen (Zinseszins, Indexfonds, 401(k)/IRA/Roth, typische Fehler) und Ferne Gewässer kartieren (Nettovermögen, Kaufen oder Mieten, Versicherungen, Nachlass-Grundlagen). Lektionen, die das Eröffnen eines Kontos vorschlagen, nennen echte, etablierte Anbieter und wofür jeder gut ist - niemand bezahlt BudgetArk dafür. Dein Lesefortschritt wird gespeichert, damit du dort weitermachen kannst, wo du aufgehört hast. Die Lektionen selbst sind derzeit auf Englisch.",
        location: "Karten-Tab (oberste Karte)",
        keywords: "kurs, lektionen, lernen, bildung, investieren, indexfonds, kapitän, kapitel",
      },
      "utilities-tool": {
        title: "Finanzrechner",
        body: "Tippe auf einen Werkzeugkopf, um ihn aufzuklappen: Zinseszins, ein Kreditrechner mit exportierbarem Tilgungsplan, eine Umschuldungs-Break-even-Prüfung, ein Notgroschen-Planer, ein Währungsrechner und ein US-Nettogehaltsrechner, der zeigt, was ein Gehalt pro Zahlung wirklich auf dem Konto lässt. Diese Werkzeuge schreiben nie in deine Daten.",
        detail: "Sechs Sandkasten-Rechner, jeder hinter einem aufklappbaren Kopf: Zinseszins mit einer S&P-500-Voreinstellung als realistische Langfrist-Basis; ein Kreditrechner mit vollständigem Tilgungsplan (exportierbar); ein Umschuldungswerkzeug, das den Break-even-Monat zwischen Abschlusskosten und niedrigerem Zins findet; ein Notgroschen-Planer, bemessen an deinen echten monatlichen Grundkosten; ein Währungsrechner (USD, EUR, GBP, CAD, JPY, SEK), der genau zeigt, wie frisch seine Kurse sind, und auch offline antwortet; und ein Nettogehaltsrechner - gib ein US-Gehalt, Steuerklasse und Bundesstaat ein und sieh Bundessteuer, Staatssteuer, Social Security und Medicare, deinen effektiven und Grenzsteuersatz, optionale 401(k)-/HSA-/Beitragsabzüge und was dasselbe Gehalt in einem anderen Bundesstaat behält. Das Steuerwerkzeug rechnet komplett aus gebündelten IRS- und Staatstabellen - nichts, was du tippst, verlässt das Handy. Das sind reine Sandkästen - sie lesen nichts Privates und schreiben nichts in deine Daten.",
        location: "Karten-Tab → Werkzeugköpfe",
        keywords: "rechner, zinseszins, kredit, tilgungsplan, umschuldung, refinanzierung, notgroschen, werkzeuge, regler, währung, wechselkurs, umrechnen, fx, nettogehalt, netto, gehalt, steuer, lohn, bundesstaat, abzug",
      },
      "charts-what-if": {
        title: "Was wäre, wenn ich nichts mehr ausgebe für …",
        body: "Wähle eine deiner Ausgabenkategorien und sieh zwei Zukünfte nebeneinander: wie viel früher du schuldenfrei wärst (und welche Zinsen du dir sparst) oder was aus dem Geld nach 1, 5 und 10 Jahren wird. Berechnet aus deiner eigenen Budgethistorie, komplett auf diesem Handy.",
        detail: "Das Werkzeug liest deinen echten Durchschnitt je Ausgabenkategorie über die letzten sechs erfassten Monate und lässt dich einstellen, wie viel davon du umlenken würdest. Die Schuldenseite rechnet deinen tatsächlichen Tilgungsplan (Schneeball oder Lawine, deine Wahl) mit dem zusätzlichen Geld neu durch und zeigt gesparte Monate plus über die Laufzeit gesparte Zinsen; die Sparseite zeigt, was derselbe Monatsbetrag nach 1, 5 und 10 Jahren bei einer angenommenen Rendite von 7 % wird. Alles wird aus deinen eigenen Buchungen berechnet, auf deinem Handy - ein Spiegel, keine Vermutung.",
        location: "Karten-Tab → Werkzeug Was-wäre-wenn",
        keywords: "was wäre wenn, was-wäre-wenn, ausgaben stoppen, umlenken, prognose, früher, gesparte zinsen, wachstum",
      },
      "charts-purchase": {
        title: "Anschaffung planen",
        body: "Sparst du auf etwas? Nenn es, setz den Preis und wähle einen Monatsbetrag - das Werkzeug zeigt, wann es so weit ist, ob das Tempo zu deinem echten Cashflow passt, und Rat passend zu deiner Etappe in Baue deine Arche, damit die Anschaffung deine größeren Ziele nie aus der Bahn wirft. Gestartete Pläne leben in der Karte Anschaffungspläne auf deiner Brücke, wo sie verfolgt werden und zum Nettovermögen zählen.",
        detail: "Nenn den Gegenstand, setz Preis und schon Gespartes und wähle am Regler einen Monatsbetrag - das Werkzeug zeigt den Monat, in dem alles finanziert ist, den nötigen Monatsbetrag, wenn du ein Bis-wann-Datum setzt, und ein ehrliches Urteil, ob dieses Tempo zu deinem echten Cashflow passt (berechnet aus Einnahmen und Ausgaben der letzten sechs Monate). Der Rat passt sich deiner Etappe in Baue deine Arche an: erst das Startpolster fertigstellen, was der Sparbetrag deine Tilgung kostet, oder grünes Licht zum Ansparen und Barzahlen. Einen Plan zu starten legt einen verfolgten Ansparposten auf der Brücke an.",
        location: "Karten-Tab → Anschaffung planen",
        keywords: "plan, anschaffung, ansparen, ansparposten, leisten, cashflow, zieldatum",
      },
    },
  },
  Profile: {
    intro: "Profil - deine Einstellungen",
    steps: {
      "profile-appearance": {
        title: "Design, Layout und Währung",
        body: "Wähle eine Farbpalette, einen Designstil und eine Dichte (Kompakt, Bequem, Großzügig) - die Dichte passt Abstände und Schriftgrößen in der ganzen App an, und Ambiente-Designs bringen einen lebendigen Hintergrund. Auch deine Anzeigewährung stellst du hier ein.",
        detail: "Darstellung steuert den ganzen Look: Farbpaletten (darunter Ambiente-Designs wie Deep Space, Deep Forest und Deep Sea mit lebendig animierten Hintergründen, helle Designs wie Harbor Dawn und Rose sowie Lighthouse - ein Design mit maximalem Kontrast, bei dem jede Farbe auf Lesbarkeit abgestimmt ist), einen Designstil (feste Karten oder Glas), eine Dichte, die Abstände und Text in der ganzen App skaliert, und die Textgröße. Auch deine Anzeigewährung lebt hier - beim Wechsel kannst du deine bestehenden Beträge umrechnen oder nur das Symbol tauschen, wie du willst. Ambiente-Hintergründe lassen sich jederzeit abschalten, wenn du es ruhiger magst.",
        location: "Profil-Tab → Darstellung",
        keywords: "design, theme, dunkelmodus, hellmodus, darstellung, farben, glas, dichte, textgröße, währung, ambiente, hintergrund, hoher kontrast, barrierefreiheit, lighthouse",
      },
      "profile-connections": {
        title: "Bankverbindungen (optional)",
        body: "Verbinde deine Bank, Karten oder dein Depot über Konten, die DIR gehören - per SimpleFIN Bridge oder Teller - und lass Umsätze und Salden von selbst hereinkommen. Eine eingebaute Einrichtungsanleitung führt dich durch Kosten, Anmeldung und Datenschutz je Anbieter. Zugangsdaten bleiben verschlüsselt auf diesem Gerät; BudgetArk hat keinen Server.",
        detail: "Bank-Sync läuft mit deinen eigenen Zugängen: Du verbindest dich über SimpleFIN Bridge (ein eingefügter Token, deckt tausende US-Banken ab, ca. 1,50 $ im Monat direkt an den Anbieter) oder Teller (kostenlose Stufe über dein eigenes Entwicklerkonto) - BudgetArk betreibt keinen Aggregator und steht nie zwischen dir und deiner Bank. Eine eingebaute Anleitung geht vor dem Start Kosten, Anmeldung und Datenschutz je Anbieter durch. Importierte Umsätze warten im Prüfposteingang des Budget-Tabs; zugeordnete Konten halten die Brücke-Salden aktuell; eine verknüpfte Kreditkarte kann die Karten-Wache speisen. Zugangsdaten sind nur auf diesem Gerät verschlüsselt - sie synchronisieren nie zu einem Partner, wandern nie in Sicherungen und berühren nie einen Server, weil es keinen gibt.",
        location: "Profil-Tab → Bankverbindungen",
        keywords: "bank, verbindung, simplefin, teller, sync, import, verknüpfen, zugangsdaten, einrichtungsanleitung",
      },
      "profile-sync-data": {
        title: "Partner-Sync und Sicherungen",
        body: "Kopple das Handy deines Partners und synchronisiere über euer WLAN zu Hause - von Gerät zu Gerät, ohne Cloud. Die Daten-Karte kümmert sich um verschlüsselte Sicherungen, Tabellen-Export/-Import und Alle Daten zurücksetzen (das dich zurück zur Ersteinrichtung bringt).",
        detail: "Partner-Sync koppelt zwei Handys mit einem Code und synchronisiert dann direkt über euer WLAN zu Hause - von Handy zu Handy, verschlüsselt, ohne Cloud dazwischen. Beide Partner sehen gemeinsame Schulden, Budgets und Konten; Gerätespezifisches wie Bankzugangsdaten und Belegfotos bleibt absichtlich, wo es ist. Die Daten-Karte deckt passwortgeschützte, verschlüsselte Sicherungen ab (Datei exportieren, per Zusammenführen oder Ersetzen wiederherstellen), Tabellen-Export/-Import (CSV und xlsx) für Excel oder Sheets und Alle Daten zurücksetzen, das dieses Gerät leert und dich zurück zur Ersteinrichtung bringt.",
        location: "Profil-Tab → Partner-Sync · Daten",
        keywords: "partner, sync, koppeln, wlan, sicherung, backup, wiederherstellen, export, import, tabelle, excel, csv, zurücksetzen",
      },
      "profile-extras": {
        title: "Erfolge, Kategorien und mehr",
        body: "Das Logbuch sammelt Erfolge, während du die App nutzt. Du kannst außerdem eigene Budgetkategorien anlegen, Unternehmen für Ausgabenberichte verwalten, sanfte Erinnerungen einschalten, den Privatsphäre-Modus gegen Screenshots aktivieren, die App hinter einer PIN sperren und ein optionales Trinkgeld dalassen, wenn BudgetArk dir geholfen hat.",
        detail: "Das Logbuch sammelt Erfolge, wenn du echte Meilensteine erreichst. Unter Kategorien legst du eigene Budgetkategorien an und sortierst jede Kategorie zwischen Bedürfnisse, Wünsche und Sparen um. Geschäftsausgaben verwaltet die Unternehmen, denen du Ausgaben zuordnest, und enthält den Bericht zur Steuerzeit. Erinnerungen sind freiwillige Anstupser - ein Check-in, wenn du länger keine Ausgaben gebucht hast, und eine Planungserinnerung zum Monatsstart - komplett auf deinem Handy geplant, ohne etwas Sensibles auf dem Sperrbildschirm. Der Privatsphäre-Modus blockiert Screenshots und Bildschirmaufnahmen deiner Finanzdaten. Die App-Sperre (Einstellungen) fragt bei jedem Öffnen nach einer 4- bis 8-stelligen PIN, damit niemand, der dein Handy ausleiht, in deinen Finanzen stöbert - die PIN bleibt auf diesem Gerät, wird nie gesichert oder synchronisiert, also wähle eine, die du dir merkst. Und die Trinkgeldkasse nimmt ein kleines, freiwilliges Trinkgeld an, das nichts freischaltet, weil schon alles kostenlos ist.",
        location: "Profil-Tab → Logbuch · Kategorien · Einstellungen",
        keywords: "erfolge, logbuch, eigene kategorien, erinnerungen, benachrichtigungen, privatsphäre-modus, screenshot, trinkgeldkasse, app-sperre, pin, sperre, code, sicherheit",
      },
      "profile-help": {
        title: "Hilfe und Onboarding",
        body: "Öffne Onboarding unter Hilfe jederzeit - es ist dieser ganze Leitfaden an einem durchsuchbaren Ort, plus eine Taste Onboarding wiederholen, die den kompletten Erststart erneut abspielt. Deine Daten bleiben immer erhalten.",
        detail: "Die Zeile Onboarding unter Hilfe öffnet diesen ganzen Leitfaden als durchsuchbares Nachschlagewerk: Blättere nach Tab oder tippe ein Stichwort (\"Beleg\", \"Kreditkarte\", \"Sicherung\"), um direkt dorthin zu springen, wie etwas funktioniert und wo du es findest. Die Taste Onboarding wiederholen darin spielt den kompletten Erststart erneut ab - Design, Begrüßung, Name, dann die geführten Tipps Tab für Tab - ohne deine Daten anzurühren. Jeder Spotlight-Tipp während der Tour hat außerdem einen Schalter Mehr erfahren mit derselben Tiefe, die du gerade liest.",
        location: "Profil-Tab → Hilfe → Onboarding",
        keywords: "hilfe, leitfaden, anleitung, suche, onboarding, wiederholen, wie geht, tutorial, rundgang, tipps",
      },
    },
  },
};
