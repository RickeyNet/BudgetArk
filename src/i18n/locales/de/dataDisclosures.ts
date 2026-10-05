/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (disclosures)
 * File: src/i18n/locales/de/dataDisclosures.ts
 *
 * German counterpart of en/dataDisclosures.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. The three disclosures are
 * rule-4 consent copy: sentence for sentence the same meaning as the
 * English, no softer and no stronger. Re-check both files together when
 * either changes.
 */

import type { Localized } from "../types";
import type { dataDisclosures as en } from "../en/dataDisclosures";

export const dataDisclosures: Localized<typeof en> = {
  mission: {
    eyebrow: "UNSERE MISSION",
    title: "Warum ich BudgetArk gebaut habe",
    body: "Ich wollte meine Finanzen proaktiv angehen, sie in den Griff bekommen und anfangen, für die Zukunft vorzusorgen - ohne meine Privatsphäre aufzugeben oder noch ein Abo zu bezahlen. Ich brauchte Schuldenabbau, Monatsbudget und einen klaren Blick auf den Weg vor mir in einer Offline-App, die auf deinem Gerät bleibt und nirgendwo sonst hingeht. Ich habe BudgetArk gebaut, damit du dasselbe tun kannst - kostenlos für dich.",
    invite:
      "Die App soll sich wie deine anfühlen. Wenn du eine Idee hast - eine Funktion, eine Korrektur, sogar ein neues Design - melde dich über Feedback senden im Profil-Tab. Ich lese jede Nachricht.",
  },
  learningDisclaimer:
    "Die BudgetArk-Lektionen spiegeln den Ansatz einer einzelnen App zum Umgang mit Geld wider. Der Autor ist kein zugelassener Finanzberater, Steuerberater oder Anwalt. Das ist allgemeine Bildung und Meinung, keine Beratung für deine Situation. Sprich bei großen Entscheidungen mit einer qualifizierten Fachperson.",
  connections: {
    title: "Bevor du verbindest",
    intro:
      "Bankverbindungen sprechen direkt von diesem Gerät aus mit deinen Finanzanbietern. Das bedeutet genau Folgendes:",
    points: {
      credentials:
        "Deine Zugangsdaten (ein SimpleFIN-Token oder dein Teller-Zertifikat) werden nur auf diesem Gerät verschlüsselt gespeichert. Sie werden nie mit einem gekoppelten Partner synchronisiert und berühren nie einen BudgetArk-Server - BudgetArk hat keinen.",
      direct:
        "Um Kontostände und Umsätze abzurufen, verbindet sich dieses Gerät direkt mit SimpleFIN oder Teller. Diese Anbieter sehen, dass die Anfragen von dir kommen, nicht von BudgetArk.",
      inbox:
        'Importierte Umsätze warten in einem Prüfposteingang. Nichts landet in deinem Budget, bevor du es freigibst - es sei denn, du speicherst eine "Immer freigeben"-Regel für einen Händler, dem du vertraust; die kannst du jederzeit ändern oder löschen.',
      remove:
        "Du kannst eine Verbindung jederzeit entfernen. Ihre Zugangsdaten werden von diesem Gerät gelöscht, und Buchungen, die du bereits freigegeben hast, bleiben in deinem Budget.",
    },
  },
  exchangeRates: {
    title: "Bevor wir einen Kurs abrufen",
    intro:
      "Die Umrechnung deiner Beträge nutzt den heutigen Wechselkurs. Genau das verlässt dein Gerät:",
    points: {
      request:
        "Dieses Gerät fragt die öffentliche Kurstabelle des Tages bei einem kostenlosen Wechselkursdienst (open.er-api.com) ab. Die Anfrage enthält kein Konto, keinen Betrag und keine Identität - es ist dieselbe Tabelle, die alle bekommen.",
      onDevice:
        "Deine Kontostände und Buchungen werden auf diesem Gerät umgerechnet. Nichts über deine Finanzen wird irgendwohin gesendet.",
      fallback:
        "Ist der Dienst nicht erreichbar, greift BudgetArk auf die zuletzt gespeicherten Kurse zurück, dann auf eine eingebaute Schätzung - du siehst vor dem Bestätigen, welche verwendet wurde.",
    },
  },
  holdings: {
    title: "Bevor du das einschaltest",
    intro: "Live-Wertpapiere senden ein wenig Daten von deinem Gerät. Genau das:",
    points: {
      stored:
        "Deine Tickersymbole und Stückzahlen werden auf diesem Gerät gespeichert und mit deinem gekoppelten Partner synchronisiert, genau wie deine Konten.",
      symbolsOnly:
        "Um Kurse anzuzeigen, werden nur deine Tickersymbole etwa einmal täglich an den Kursdienst von BudgetArk gesendet. Deine Stückzahlen, Kontostände und Identität werden nie gesendet.",
      thirdParty: "Kurse stammen von einem externen Marktdatenanbieter.",
    },
  },
};
