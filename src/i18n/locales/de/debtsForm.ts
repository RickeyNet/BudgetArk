/**
 * BudgetArk - Deutsche Texte: Schulden-Tab (form)
 * File: src/i18n/locales/de/debtsForm.ts
 *
 * German counterpart of en/debtsForm.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { debtsForm as en } from "../en/debtsForm";

export const debtsForm: Localized<typeof en> = {
  title: {
    add: "Neue Schuld hinzufügen",
    edit: "Schuld bearbeiten",
  },
  subtitle: {
    add: "Gib die Details der Schuld ein, die du verfolgen möchtest",
    edit: "Aktualisiere die Details dieser Schuld",
  },
  name: {
    label: "BEZEICHNUNG",
    placeholder: "z. B. Visa-Karte, Studienkredit",
  },
  balance: {
    label: "GESAMTSALDO",
    placeholder: "0,00",
    asOf: " · Stand {{date}}",
    fromBank:
      "Von {{account}}{{asOf}}. Wird nach jedem Bank-Sync aktualisiert - schalte unten „Saldo von der Bank“ aus, um ihn selbst einzugeben.",
  },
  owner: {
    label: "INHABER",
    options: {
      mine: "Ich",
      partner: "Partner",
      joint: "Gemeinsam",
    },
  },
  type: {
    label: "ART DER SCHULD",
    options: {
      personal_credit: "Kredit / Privat",
      car: "Auto",
      house: "Haus / Hypothek",
    },
  },
  apr: {
    label: "EFF. JAHRESZINS (%)",
    placeholder: "0,0",
  },
  minPayment: {
    label: "MINDESTRATE",
    placeholder: "0,00",
  },
  dueDay: {
    label: "FÄLLIGKEITSTAG DER MINDESTRATE",
    hint: "Tag im Monat, an dem deine Mindestrate fällig ist. Tag 29-31 fällt in kürzeren Monaten auf den letzten Tag.",
    useDefault: "Standard verwenden (Tag {{day}})",
    custom: "Eigenen Tag wählen",
  },
  goal: {
    label: "ZIELDATUM FÜR TILGUNG (OPTIONAL)",
    selectMonth: "Monat wählen",
    clear: "Zielmonat löschen",
    payHint_one: "Zahle {{amount}}/Monat, um in {{count}} Monat schuldenfrei zu sein",
    payHint_other: "Zahle {{amount}}/Monat, um in {{count}} Monaten schuldenfrei zu sein",
    tooSoon: "Zieldatum liegt zu nah - nicht erreichbar",
    pickerTitle: "Zieldatum für Tilgung wählen",
  },
  bank: {
    label: "VERBUNDENES BANKKONTO (OPTIONAL)",
    emptyHint:
      "Verbinde deine Bank (Profil → Bankverbindungen), dann hält diese Karte ihren Saldo selbst aktuell - und mit aktiver Keep-Alive-Überwachung stempelt sie die letzte Nutzung aus deinen Umsätzen.",
    pickHint:
      "Wähle das Bankkonto, das diese Karte ist. Sein Saldo landet nach jedem Sync hier, und mit aktiver Keep-Alive-Überwachung stempeln Umsätze das Datum der letzten Nutzung für dich.",
    notConnected: "Nicht verbunden",
    updatesLabel: "SALDO-AKTUALISIERUNG",
    balanceOn: "Saldo von der Bank: Ein",
    balanceOff: "Saldo von der Bank: Aus",
  },
  keepAlive: {
    label: "KARTEN-KEEP-ALIVE (OPTIONAL)",
    hint: "Banken können eine ungenutzte Karte kündigen. Lass dich warnen, bevor das Inaktivitätsfenster dieser Karte abläuft. Karte absichtlich gekündigt? Schalte die Überwachung einfach aus.",
    on: "Keep-Alive-Überwachung: Ein",
    off: "Keep-Alive-Überwachung: Aus",
    windowLabel: "ERLAUBTE INAKTIVITÄT (JE NACH BANK)",
    windowChip: "{{count}} Mon.",
    leadLabel: "WARNUNG AB",
    leadChip: "{{count}} Tage vorher",
    lastUsedLabel: "LETZTE NUTZUNG",
    lastUsedLinked:
      "Stempelt sich selbst aus Umsätzen von {{account}}. Tippe jederzeit auf „Benutzt“ auf der Karte, um von Hand zu stempeln.",
    lastUsedWithLinks:
      "Tippe nach einem Kauf auf „Benutzt“ auf der Karte - oder wähle oben ein verbundenes Konto, dann stempelt es sich selbst.",
    lastUsedNoLinks:
      "Tippe nach einem Kauf auf „Benutzt“ auf der Karte. Richte eine Bankverbindung ein (Profil → Bankverbindungen), dann stempelt sich das Datum aus deinen Umsätzen selbst.",
  },
  alerts: {
    notificationsOff: {
      title: "Benachrichtigungen sind aus",
      message:
        "Die Keep-Alive-Überwachung funktioniert trotzdem - du siehst Warnungen in der App. Für Erinnerungs-Benachrichtigungen schalte sie in den Einstellungen deines Telefons ein.",
      openSettings: "Einstellungen öffnen",
    },
  },
  buttons: {
    saveChanges: "Änderungen speichern",
    addDebt: "Schuld hinzufügen",
  },
};
