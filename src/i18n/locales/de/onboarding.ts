/**
 * BudgetArk - Deutsche Texte: Einrichtung (Onboarding)
 * File: src/i18n/locales/de/onboarding.ts
 *
 * German counterpart of en/onboarding.ts. Informal "du"; glossary terms
 * from src/i18n/GLOSSARY.md.
 */

import type { Localized } from "../types";
import type { onboarding as en } from "../en/onboarding";

export const onboarding: Localized<typeof en> = {
  stepOf: "SCHRITT {{step}} VON {{total}}",
  skipSetup: "Einrichtung überspringen",
  next: "Weiter →",
  back: "← Zurück",
  skip: "Überspringen",
  mission: {
    footnote:
      "Kostenlos, ohne Werbung, ohne Konto - und deine Daten verlassen nie dein Telefon. Du kannst das jederzeit oben im Profil-Tab nachlesen.",
  },
  theme: {
    title: "Wähle dein Farbschema",
    subtitle: "Such dir ein Farbschema aus, das zu dir passt. Du kannst es später in den Einstellungen ändern.",
  },
  welcome: {
    title: "Willkommen bei BudgetArk",
    subtitle: "Dein Begleiter für Schulden, Budget und Vermögensaufbau.",
    features: {
      debts: {
        title: "Schulden",
        desc: "Erfasse jede Schuld, wähle eine Tilgungsstrategie, folge den Meilensteinen von „Baue deine Arche“ - und verhindere, dass ungenutzte Kreditkarten gekündigt werden",
      },
      budget: {
        title: "Budget",
        desc: "Erfasse Einnahmen und Ausgaben nach Kategorie, setze Limits, automatisiere wiederkehrende Rechnungen und bestätige Bankimporte im Prüfposteingang",
      },
      bridge: {
        title: "Brücke",
        desc: "Dein Start-Tab: Nettovermögen im Zeitverlauf, alle deine Konten, Anschaffungspläne und optional Live-Aktienkurse",
      },
      charts: {
        title: "Karten",
        desc: "Ein kostenloser Finanzkurs mit 24 Lektionen, Rechner und Was-wäre-wenn-Projektionen aus deinen eigenen Zahlen",
      },
      profile: {
        title: "Profil",
        desc: "Farbschemata, Bankverbindungen, Partner-Sync, Sicherungen - und die durchsuchbare Einführung, wann immer du sie brauchst",
      },
      privacy: {
        title: "Privat von Grund auf",
        desc: "Alles wird auf diesem Telefon verschlüsselt. BudgetArk hat keinen Server - deine Finanzdaten verlassen nie dein Gerät",
      },
    },
  },
  template: {
    title: "Mit einer Vorlage starten?",
    subtitle:
      "Wähle die passendste Vorlage, und BudgetArk legt Kategorie-Limits und deine zwei größten wiederkehrenden Posten für dich an. Jede Zahl bleibt änderbar - ein erster Entwurf, keine Festlegung.",
    startEmpty: {
      title: "Leer starten",
      tagline: "Keine Limits, keine Posten - bau es nach und nach auf",
    },
    incomeLabel: "MONATLICHES NETTOGEHALT (HAUSHALT)",
    incomePlaceholder: "z. B. 4200",
    housingLabel: "MIETE ODER HYPOTHEK",
    housingPlaceholder: "z. B. 1400",
    hint: "Beides optional. Limits werden als Anteil vom Nettogehalt gesetzt; lässt du es leer, kannst du sie später im Budget-Tab unter Limits eintragen. Wird nur auf diesem Telefon gespeichert.",
    startEmptyNext: "Leer starten →",
  },
  reminders: {
    title: "Möchtest du einen Anstupser zum Dranbleiben?",
    subtitle: "Budgets funktionieren, wenn das Erfassen zur Gewohnheit wird. BudgetArk kann dir zwei Arten sanfter Erinnerungen schicken - und sonst nichts.",
    checkins: {
      title: "Nachfragen, wenn es still wird",
      desc: "Ein kurzes „Wie läuft die Woche?“, wenn ein paar Tage ohne Buchung vergehen. Erfasst du regelmäßig, hörst du nie davon.",
    },
    monthStart: {
      title: "Ein Hinweis am 1.",
      desc: "Eine Notiz zum Monatsanfang, um Ziele zu setzen und auf den letzten Monat zu schauen.",
    },
    privacyTitle: "🔒 Nichts über dein Geld",
    privacyText:
      "Erinnerungen enthalten nie einen Betrag, einen Kontostand, ein Konto oder eine Rechnung - nur einen Anstupser, die App zu öffnen. Keine Fälligkeitsalarme; das macht deine Bank. Zeit und Rhythmus änderst du jederzeit unter Profil → Erinnerungen, oder du schaltest sie aus.",
    enable: "Erinnerungen einschalten",
    asking: "Frage dein Telefon...",
    notNow: "Jetzt nicht",
  },
  name: {
    title: "Wie sollen wir dich nennen?",
    subtitle: "Wähle einen Anzeigenamen (optional). Er wird nur auf deinem Gerät gespeichert.",
    placeholder: "Buddy",
    hint: "Leer lassen, um den Standardnamen „Buddy“ zu verwenden",
    privacyTitle: "🔒 Privatsphäre zuerst",
    privacyText:
      "Keine E-Mail, keine Telefonnummer, keine persönlichen Daten nötig. Deine Informationen bleiben lokal auf deinem Gerät und gehen nie an einen Server.",
    arkTitle: "Baue deine Arche (optional)",
    arkText: "Du kannst jetzt Meilensteinziele setzen oder das später im Schulden-Tab nachholen.",
    finishBuildArk: "Fertig + Arche bauen",
    skipForNow: "Vorerst überspringen",
    tourHint:
      "Als Nächstes führt dich die Einrichtung durch jeden Tab - jeder Tipp hat ein „Mehr erfahren“ mit allen Details, und du kannst jederzeit einen Schritt zurück oder überspringen. Später kannst du alles unter Profil → Hilfe → Einführung nachlesen und durchsuchen.",
  },
  alerts: {
    notificationsOff: {
      title: "Benachrichtigungen sind aus",
      message:
        "Erinnerungen bleiben aus, bis du BudgetArk in den Einstellungen deines Telefons Benachrichtigungen erlaubst. Du kannst sie jederzeit unter Profil → Erinnerungen einschalten.",
    },
    saveFailed: {
      title: "Einrichtung konnte nicht gespeichert werden",
      message:
        "Deine Einrichtung konnte nicht auf diesem Gerät gespeichert werden. Das passiert meist, wenn kaum noch freier Speicher da ist. Schaffe etwas Platz und versuch es erneut - oder fahre trotzdem fort; die App fragt dich dann beim nächsten Öffnen womöglich erneut nach der Einrichtung.",
      tryAgain: "Erneut versuchen",
      continueAnyway: "Trotzdem fortfahren",
    },
    templateFailed: {
      title: "Vorlage nicht übernommen",
      message:
        "Deine Einrichtung ist gespeichert, aber die Start-Limits konnten nicht geschrieben werden. Limits kannst du jederzeit im Budget-Tab unter Limits setzen.",
    },
  },
};
