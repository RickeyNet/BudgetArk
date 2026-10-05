/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (guides)
 * File: src/i18n/locales/de/dataGuides.ts
 *
 * German counterpart of en/dataGuides.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Provider UI labels
 * (Get Started, New Connection, Sign In, Development ...) stay in English
 * because that is what the user sees on the provider's site.
 */

import type { Localized } from "../types";
import type { dataGuides as en } from "../en/dataGuides";

export const dataGuides: Localized<typeof en> = {
  simplefin: {
    tagline:
      "Empfohlen: Ein eingefügter Token verbindet Chase und Tausende US-Banken und -Karten. Nur Lesezugriff, offene Registrierung.",
    cost: "Etwa 1,50 $/Monat oder 15 $/Jahr, abgerechnet von SimpleFIN - nicht von BudgetArk.",
    steps: {
      account: {
        title: "Erstelle dein SimpleFIN-Bridge-Konto",
        detail:
          "Öffne beta-bridge.simplefin.org, tippe auf Get Started und gib deine E-Mail-Adresse ein. SimpleFIN schickt dir einen Anmeldelink - öffne ihn und akzeptiere die Bedingungen.",
      },
      subscribe: {
        title: "Abonnieren",
        detail:
          "SimpleFIN ist ein kleiner kostenpflichtiger Dienst (etwa 1,50 $/Monat oder 15 $/Jahr). Du musst abonnieren, bevor du deine erste Bank hinzufügen kannst.",
      },
      connectBank: {
        title: "Verbinde deine Bank(en)",
        detail:
          "Öffne im Dashboard Financial Institutions, wähle New Connection, suche deine Bank und melde dich über ihre sichere Seite an. Füge so viele hinzu, wie du möchtest.",
      },
      token: {
        title: "Erstelle einen Setup-Token",
        detail:
          "Wähle New App (nenne sie 'BudgetArk', falls gefragt) und kopiere den angezeigten Setup-Token - eine lange Folge aus Buchstaben und Zahlen.",
      },
      paste: {
        title: "Füge ihn in BudgetArk ein",
        detail:
          "Komm hierher zurück, füge den Token in das Feld ein und tippe auf Verbinden. Den Rest erledigt BudgetArk.",
      },
    },
    tips: {
      singleUse:
        "Der Setup-Token ist nur einmal verwendbar: Sobald BudgetArk ihn eingelöst hat, kann er nirgendwo sonst eingefügt werden. Falls er je fehlschlägt, erzeuge einfach einen neuen.",
      readOnly:
        "SimpleFIN hat nur Lesezugriff - es sieht Kontostände und Umsätze, kann aber nie Geld bewegen.",
      daily:
        "Es aktualisiert etwa einmal täglich, ganz neue Umsätze können also bis zu 24 Stunden brauchen, bis sie auftauchen.",
    },
    privacy: {
      headline: "Nein - SimpleFIN verkauft deine Daten nicht und zeigt keine Werbung.",
      points: {
        noSell: "Verkauft deine Daten nicht und nutzt sie nicht für Werbung oder Marketing.",
        noCredentials:
          "Speichert nie deinen echten Bank-Benutzernamen oder dein Passwort - die bleiben zwischen dir und deiner Bank.",
        sharing:
          "Teilt Daten nur mit den Dienstleistern, die nötig sind, um deine Bank zu erreichen, plus die üblichen Ausnahmen, die jedes Unternehmen hat: wenn gesetzlich vorgeschrieben oder falls das Unternehmen je verkauft wird.",
      },
    },
  },
  teller: {
    tagline:
      "100 kostenlose Bankverbindungen - aber nur, wenn du bereits ein Teller-Entwicklerkonto hast (oder eines anfragen kannst).",
    cost: "Kostenlos für bis zu 100 Verbindungen (Tellers Development-Stufe). Neue Konten gibt es derzeit nur auf Anfrage.",
    steps: {
      account: {
        title: "Hol dir ein Teller-Entwicklerkonto",
        detail:
          "Teller hat derzeit keine öffentliche Registrierung - teller.io bietet nur Sign In. Wenn du noch kein Konto hast, schreib an support@teller.io und bitte um ein Entwicklerkonto für eine persönliche Budget-App, oder nutze stattdessen SimpleFIN (offene Registrierung, funktioniert sofort).",
      },
      certificate: {
        title: "Lade dein Zertifikat und deinen Schlüssel herunter",
        detail:
          "Sobald dein Konto angelegt ist, gibt dir Teller ein Zertifikat und einen privaten Schlüssel (zwei .pem-Dateien), die belegen, dass Anfragen von deiner App kommen. Lade sie aus dem Dashboard herunter und entpacke sie, falls sie gezippt ankommen.",
      },
      appId: {
        title: "Kopiere deine Application ID",
        detail: "Kopiere deine Application ID aus deinem Teller-Dashboard. Sie beginnt mit 'app_'.",
      },
      environment: {
        title: "Nutze die Development-Umgebung",
        detail:
          "Um echte Banken kostenlos zu verbinden, wähle Development (100 kostenlose Verbindungen). Sandbox enthält nur Testdaten; Production ist für bezahlte, große Apps.",
      },
      enterDetails: {
        title: "Gib deine Daten in BudgetArk ein",
        detail:
          "Füge deine Application ID ein, lass die Umgebung auf Development und importiere beide .pem-Dateien - das Zertifikat und den privaten Schlüssel.",
      },
      connectBank: {
        title: "Verbinde deine Bank",
        detail:
          "Tippe auf Teller Connect öffnen und melde dich in Tellers sicherem Fenster bei deiner Bank an. Deine Bank-Anmeldedaten gehen an Teller, nie an BudgetArk.",
      },
    },
    tips: {
      noAccount:
        "Kein Teller-Konto und keine Antwort vom Support? SimpleFIN ist der einfachere Weg - offene Registrierung, etwa 1,50 $/Monat, und es deckt Tausende US-Banken ab.",
      development:
        "Lass die Umgebung auf Development, außer Teller hat dir ausdrücklich etwas anderes gesagt - das ist die kostenlose Stufe für echte Banken.",
      storedLocally:
        "Dein Zertifikat und dein Schlüssel werden nur auf diesem Gerät verschlüsselt gespeichert und verlassen es nie.",
      readOnly:
        "Teller hat hier nur Lesezugriff - es liest Kontostände und Umsätze, kann aber kein Geld bewegen.",
    },
    privacy: {
      headline: "Nein - Tellers Richtlinie sagt ausdrücklich, dass deine Daten nicht verkauft werden.",
      points: {
        noSell:
          'Sagt klar: "We do not sell your End User Personal Data." (Wir verkaufen deine personenbezogenen Endnutzerdaten nicht.)',
        noMarketing:
          "Gibt deine Daten nicht für Marketing weiter - weder für eigenes noch für das von Partnerfirmen oder Dritten.",
        sharing:
          "Teilt deine Kontodaten mit der App, die du verbindest (das ist BudgetArk, auf deinem Handy), und den Dienstleistern, die für den Betrieb nötig sind, plus die üblichen Ausnahmen bei Gesetz / Unternehmensverkauf.",
      },
    },
  },
};
