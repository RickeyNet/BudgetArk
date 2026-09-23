/**
 * BudgetArk - Deutsche Texte: gemeinsame Modals (connections)
 * File: src/i18n/locales/de/modalsConnections.ts
 *
 * German counterpart of en/modalsConnections.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Product names (SimpleFIN,
 * SimpleFIN Bridge, Teller, Teller Connect) and URLs stay as they are.
 */

import type { Localized } from "../types";
import type { modalsConnections as en } from "../en/modalsConnections";

export const modalsConnections: Localized<typeof en> = {
  teller: {
    title: "Über Teller verbinden",
    failure: "Teller Connect hat einen Fehler gemeldet.",
  },
  guide: {
    cost: "KOSTEN",
    openSite: "{{site}} öffnen ↗",
    stepByStep: "SCHRITT FÜR SCHRITT",
    officialGuide: "Offizielle Einrichtungsanleitung von {{name}} ↗",
    goodToKnow: "GUT ZU WISSEN",
    privacy: "DATENSCHUTZ AUF EINEN BLICK",
    policy: "Vollständige Datenschutzerklärung von {{name}} lesen ↗",
    disclaimer:
      "Das ist eine Zusammenfassung in einfacher Sprache, keine Rechtsberatung. Richtlinien können sich ändern - der Link oben ist immer die maßgebliche Version.",
    startSetup: "Einrichtung starten →",
  },
  mapping: {
    importTransactions: "Umsätze importieren",
    whoseCard: "Wessen Karte ist das?",
    noOne: "Niemand",
    balanceUpdates: "Kontostand aktualisiert",
    none: "Keins",
    newAccount: "+ Neues Konto",
    accountNamePlaceholder: "Kontoname",
    createAndMap: "Anlegen & zuordnen",
    savingsHint:
      "Sparkonten kannst du nach dem Anlegen auf der Brücke als Notgroschen markieren.",
    investmentHint:
      "Der Kontostand der Bank wird zum Wert dieses Kontos auf der Brücke. Wenn du dort auch Aktien oder Fonds hinzufügst, zählen sie zusätzlich.",
  },
  timeAgo: {
    never: "nie",
    justNow: "gerade eben",
    minutes: "vor {{count}} Min.",
    hours: "vor {{count}} Std.",
    days: "vor {{count}} T.",
  },
  status: {
    reconnectNeeded: "Neu verbinden nötig",
    lastSyncFailed: "Letzter Sync fehlgeschlagen",
    bridgeAttention: "Eine Bank auf deiner SimpleFIN Bridge braucht Aufmerksamkeit",
    lastSynced: "Zuletzt synchronisiert {{when}}",
  },
  list: {
    title: "Bankverbindungen",
    subtitle:
      "Verbindungen holen Umsätze und Kontostände direkt bei deinen Anbietern - mit Zugangsdaten, die auf diesem Gerät gespeichert sind.",
    empty:
      "Noch keine Verbindungen. Verbinde eine Bank, um Umsätze zu importieren und Kontostände automatisch aktuell zu halten.",
    addConnection: "+ Verbindung hinzufügen",
    syncAll: "Alle jetzt synchronisieren",
  },
  detail: {
    back: "‹ Alle Verbindungen",
    reauthBanner:
      "Diese Verbindung muss neu autorisiert werden. Entferne sie und füge sie erneut hinzu, um sie wieder zu verbinden.",
    bridgeWarningIntro:
      "Deine SimpleFIN Bridge meldet, dass eine Bank hinter dieser Verbindung eine neue Anmeldung braucht. Ihre Umsätze kommen nicht mehr an, bis du sie neu verbindest:",
    bridgeWarningOutro:
      "Melde dich auf beta-bridge.simplefin.org an und verbinde diese Bank neu. Sobald sie zurück ist, holt der nächste Sync die verpassten Umsätze von selbst nach.",
    unfinishedSetup:
      "Die Einrichtung wurde nicht abgeschlossen - noch sind keine Konten zugeordnet, also wird nichts importiert. Dein Setup-Token wurde bereits eingelöst, du kannst also ohne neuen Token weitermachen.",
    finishSetup: "Kontoeinrichtung abschließen",
    linkedAccounts: "VERKNÜPFTE KONTEN",
    noAccounts: "Keine Konten zugeordnet.",
    importsOn: "Importiert Umsätze",
    importsOff: "Import aus",
    updatesAccount: " · aktualisiert {{name}}",
    balanceFallback: "Kontostand",
    updatesDebtCard: " · aktualisiert eine Karte unter Schulden",
    balanceNotTracked: " · Kontostand nicht verfolgt",
    balanceValue: " · {{amount}}",
    addAnotherBank: "+ Weitere Bank hinzufügen",
    checkNewAccounts: "+ Nach neuen Konten suchen",
    syncNow: "Jetzt synchronisieren",
    reimport: "Die letzten {{count}} Tage neu importieren",
    reimportHint:
      "Nutze das, wenn eine Bank eine Weile getrennt war und ihre Umsätze fehlen. Alles, was du schon geprüft hast, bleibt wie es ist.",
    remove: "Verbindung entfernen",
    errors: {
      loadAccounts: "Die Konten dieser Verbindung konnten nicht geladen werden.",
      savePerson: "Konnte nicht speichern, wem diese Karte gehört.",
      savePreferences: "Die Einstellungen dieses Kontos konnten nicht gespeichert werden.",
      createAccount: "Das Brücken-Konto konnte nicht angelegt werden.",
    },
  },
  removeDialog: {
    title: "Diese Verbindung entfernen?",
    body:
      "Ihre Zugangsdaten werden von diesem Gerät gelöscht und der Sync stoppt. Buchungen, die du bereits bestätigt hast, bleiben. Ungeprüfte Einträge aus dieser Verbindung im Posteingang werden verworfen.",
    keep: "Behalten",
    remove: "Entfernen",
    removing: "Wird entfernt...",
  },
  wizard: {
    provider: {
      title: "Bank verbinden",
      subtitle:
        "Wähle einen Anbieter. Deine Zugangsdaten bleiben verschlüsselt auf diesem Gerät. Neu hier? Tippe auf „Einrichtungsanleitung & Datenschutz“ für Hilfe Schritt für Schritt.",
      simplefinTitle: "🏦 SimpleFIN Bridge (empfohlen)",
      simplefinDescription:
        "Ein Setup-Token deckt Chase und tausende US-Banken und Kreditkarten ab. Kostenpflichtig (ca. 1,50 $/Monat) mit offener Anmeldung - jeder kann heute loslegen.",
      simplefinGuide: "📖 SimpleFIN-Einrichtungsanleitung & Datenschutz",
      tellerTitle: "🔗 Teller",
      tellerDescription:
        "Nutze dein eigenes Teller-Entwicklerkonto (100 kostenlose Bankverbindungen). Ideal, wenn du schon eins hast: Teller hat derzeit keine öffentliche Anmeldung - neue Konten gibt es auf Anfrage über support@teller.io.",
      tellerGuide: "📖 Teller-Einrichtungsanleitung & Datenschutz",
    },
    fullGuide: "📖 Vollständige Anleitung, Links & Datenschutz",
    tellerSetup: {
      title: "Teller einrichten",
      subtitle: "Nutzt dein eigenes kostenloses Entwicklerkonto von teller.io.",
      step1:
        "1. Melde dich auf teller.io an - kein Konto? Anmeldungen gibt es derzeit nur auf Anfrage (E-Mail an support@teller.io), oder nutze stattdessen SimpleFIN",
      step2:
        "2. Lade die teller.zip aus deinem Dashboard herunter und entpacke sie (sie enthält certificate.pem und private_key.pem)",
      step3:
        "3. Kopiere deine Application ID aus dem Dashboard und importiere unten beide .pem-Dateien",
      applicationId: "APPLICATION ID",
      applicationIdPlaceholder: "app_...",
      environment: "UMGEBUNG",
      clientCertificate: "CLIENT-ZERTIFIKAT",
      certificateLoaded: "✓ certificate.pem geladen",
      importCertificate: "certificate.pem importieren",
      privateKey: "PRIVATER SCHLÜSSEL",
      keyLoaded: "✓ private_key.pem geladen",
      importKey: "private_key.pem importieren",
      hint:
        "Zertifikat und Schlüssel bleiben verschlüsselt auf diesem Gerät - damit prüft Teller, dass die Anfragen von deiner App kommen.",
      readFileError:
        "Die Datei konnte nicht gelesen werden. Entpacke teller.zip und wähle die .pem-Dateien direkt aus.",
    },
    tellerEnroll: {
      addBankTitle: "Weitere Bank hinzufügen",
      connectTitle: "Deine Bank verbinden",
      addBankSubtitle:
        "Melde dich über Teller Connect bei einer weiteren Bank an. Sie wird derselben Verbindung hinzugefügt - deine bestehenden Banken bleiben wie sie sind.",
      connectSubtitle:
        "Melde dich jetzt über Teller Connect bei deiner Bank an. Deine Bank-Zugangsdaten gehen an Teller, nie an BudgetArk.",
      openTitle: "🏦 Teller Connect öffnen",
      openDescription:
        "Öffnet die sichere Bank-Anmeldung von Teller. Danach erscheinen deine Konten hier zur Zuordnung.",
    },
    simplefin: {
      rediscoverTitle: "Nach neuen Konten suchen",
      rediscoverSubtitle:
        "Nach der Einrichtung eine Bank oder ein Konto auf deiner SimpleFIN Bridge hinzugefügt? Das listet die Konten deiner Bridge neu auf und bietet alle an, die noch nicht zugeordnet sind. Bereits zugeordnete Konten bleiben wie sie sind.",
      resumeTitle: "SimpleFIN-Einrichtung abschließen",
      resumeSubtitle:
        "Dein Setup-Token wurde bereits eingelöst und diese Verbindung ist auf diesem Gerät gespeichert - du brauchst keinen neuen Token.",
      resumeInstruction:
        "Das Auflisten deiner Konten ist fehlgeschlagen, meist weil SimpleFIN Bridge ein aktives Abo braucht. Prüfe deine Abrechnung auf beta-bridge.simplefin.org und lade dann deine Konten, um die Einrichtung abzuschließen.",
      title: "SimpleFIN einrichten",
      subtitle: "Drei Schritte auf der SimpleFIN-Seite, dann einen Token hier einfügen.",
      step1: "1. Erstelle ein Konto auf beta-bridge.simplefin.org",
      step2: "2. Verbinde dort deine Bank(en)",
      step3: "3. Wähle „New App“, kopiere den Setup-Token und füge ihn unten ein",
      setupToken: "SETUP-TOKEN",
      tokenPlaceholder: "SimpleFIN-Setup-Token hier einfügen",
      tokenHint:
        "Tokens sind nur einmal gültig: Sobald BudgetArk ihn eingelöst hat, kann er nirgendwo sonst eingefügt werden.",
    },
    map: {
      title: "Deine Konten",
      subtitle:
        "Wähle, was importiert wird und wo Kontostände landen. Nicht zugeordnete Konten importieren trotzdem Umsätze in den Prüfposteingang.",
      whoseCard: "WESSEN KARTE IST DAS?",
      personHint: "Aus diesem Konto importierte Ausgaben schlagen diese Person vor.",
      balanceUpdates: "KONTOSTAND AKTUALISIERT",
      saveError: "Die Kontozuordnung konnte nicht gespeichert werden. Versuch es noch einmal.",
    },
    done: {
      allSetTitle: "✅ Alles bereit",
      rediscoverNothing:
        "Keine neuen Konten gefunden - alles auf deiner Bridge ist bereits zugeordnet. Wenn du gerade eine Bank auf deiner SimpleFIN Bridge hinzugefügt hast, gib ihr ein paar Minuten zum Verknüpfen und such dann erneut.",
      addBankNothing:
        "Die Konten dieser Bank waren bereits verbunden, es hat sich also nichts geändert.",
      connectedTitle: "✅ Verbunden",
      summary_one:
        "{{count}} Konto importiert Umsätze in deinen Prüfposteingang. Neue Einträge erscheinen nach jedem Sync.",
      summary_other:
        "{{count}} Konten importieren Umsätze in deinen Prüfposteingang. Neue Einträge erscheinen nach jedem Sync.",
    },
    actions: {
      checking: "Wird gesucht...",
      checkNewAccounts: "Nach neuen Konten suchen",
      loadingAccounts: "Konten werden geladen...",
      loadAccounts: "Konten laden",
      connecting: "Wird verbunden...",
      connect: "Verbinden",
      saving: "Wird gespeichert...",
      openTellerConnect: "Teller Connect öffnen",
    },
  },
};
