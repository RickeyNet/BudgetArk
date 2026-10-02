/**
 * BudgetArk - Svenska texter: Skulder-fliken (form)
 * File: src/i18n/locales/sv/debtsForm.ts
 *
 * Swedish counterpart of en/debtsForm.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Owner and debt-type
 * labels are keyed by their ids from src/types - the ids never change.
 */

import type { Localized } from "../types";
import type { debtsForm as en } from "../en/debtsForm";

export const debtsForm: Localized<typeof en> = {
  title: {
    add: "Lägg till ny skuld",
    edit: "Redigera skuld",
  },
  subtitle: {
    add: "Fyll i uppgifterna för skulden du vill följa",
    edit: "Uppdatera uppgifterna för den här skulden",
  },
  name: {
    label: "SKULDENS NAMN",
    placeholder: "t.ex. Visa-kort, studielån",
  },
  balance: {
    label: "TOTALT SALDO",
    placeholder: "0,00",
    asOf: " · per {{date}}",
    fromBank:
      "Från {{account}}{{asOf}}. Uppdateras efter varje banksynk - stäng av ”Saldo från banken” nedan för att skriva in det själv.",
  },
  owner: {
    label: "ÄGARE",
    options: {
      mine: "Mina",
      partner: "Partnerns",
      joint: "Gemensamma",
    },
  },
  type: {
    label: "TYP AV SKULD",
    options: {
      personal_credit: "Kredit / privat",
      car: "Bil",
      house: "Hus / bolån",
    },
  },
  apr: {
    label: "EFFEKTIV RÄNTA (%)",
    placeholder: "0,0",
  },
  minPayment: {
    label: "MINIMIBETALNING",
    placeholder: "0,00",
  },
  dueDay: {
    label: "FÖRFALLODAG FÖR MINIMIBETALNING",
    hint: "Dag i månaden då din minimibetalning förfaller. Dag 29-31 blir sista dagen i kortare månader.",
    useDefault: "Använd standard (dag {{day}})",
    custom: "Välj egen dag",
  },
  goal: {
    label: "MÅLDATUM FÖR AVBETALNING (VALFRITT)",
    selectMonth: "Välj månad",
    clear: "Rensa målmånad",
    payHint_one: "Betala {{amount}}/mån för att bli skuldfri på {{count}} månad",
    payHint_other: "Betala {{amount}}/mån för att bli skuldfri på {{count}} månader",
    tooSoon: "Måldatumet är för nära - går inte att nå",
    pickerTitle: "Välj måldatum för avbetalning",
  },
  bank: {
    label: "KOPPLAT BANKKONTO (VALFRITT)",
    emptyHint:
      "Koppla din bank (Profil → Bankkopplingar) så kan det här kortet hålla sitt saldo aktuellt självt - och med aktivitetsbevakningen på stämpla senaste användning från dina köp.",
    pickHint:
      "Välj det bankkonto som är det här kortet. Saldot landar här efter varje synk, och med aktivitetsbevakningen på stämplar köpen senaste användningsdatum åt dig.",
    notConnected: "Inte kopplat",
    updatesLabel: "SALDOUPPDATERINGAR",
    balanceOn: "Saldo från banken: På",
    balanceOff: "Saldo från banken: Av",
  },
  keepAlive: {
    label: "AKTIVITETSBEVAKNING (VALFRITT)",
    hint: "Kortutgivare kan stänga ett kort som inte används. Bli varnad innan kortets inaktivitetsfönster tar slut. Har du stängt kortet med avsikt? Stäng bara av bevakningen.",
    on: "Aktivitetsbevakning: På",
    off: "Aktivitetsbevakning: Av",
    windowLabel: "TILLÅTEN INAKTIVITET (VARIERAR MELLAN UTGIVARE)",
    windowChip: "{{count}} mån",
    leadLabel: "BÖRJA VARNA MIG",
    leadChip: "{{count}} dagar före",
    lastUsedLabel: "SENASTE ANVÄNDNING",
    lastUsedLinked:
      "Stämplas automatiskt från köp på {{account}}. Tryck på ”Jag använde det” på kortet när som helst för att stämpla för hand.",
    lastUsedWithLinks:
      "Tryck på ”Jag använde det” på kortet efter ett köp - eller välj ett kopplat konto ovan så stämplas det automatiskt.",
    lastUsedNoLinks:
      "Tryck på ”Jag använde det” på kortet efter ett köp. Sätt upp en bankkoppling (Profil → Bankkopplingar) så stämplas datumet automatiskt från dina transaktioner.",
  },
  alerts: {
    notificationsOff: {
      title: "Aviseringar är av",
      message:
        "Aktivitetsbevakningen fungerar ändå - du ser varningar i appen. För att också få påminnelser som aviseringar, slå på dem i telefonens inställningar.",
      openSettings: "Öppna inställningar",
    },
  },
  buttons: {
    saveChanges: "Spara ändringar",
    addDebt: "Lägg till skuld",
  },
};
