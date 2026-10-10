/**
 * BudgetArk - Norske tekster: Gjeld-fanen (form)
 * File: src/i18n/locales/nb/debtsForm.ts
 *
 * Norwegian (Bokmål) counterpart of en/debtsForm.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Owner and debt-type
 * labels are keyed by their ids from src/types - the ids never change.
 */

import type { Localized } from "../types";
import type { debtsForm as en } from "../en/debtsForm";

export const debtsForm: Localized<typeof en> = {
  title: {
    add: "Legg til ny gjeldspost",
    edit: "Rediger gjeldspost",
  },
  subtitle: {
    add: "Fyll inn detaljene for gjelden du vil følge",
    edit: "Oppdater detaljene for denne gjeldsposten",
  },
  name: {
    label: "NAVN PÅ GJELD",
    placeholder: "f.eks. Visa-kort, studielån",
  },
  balance: {
    label: "TOTAL SALDO",
    placeholder: "0,00",
    asOf: " · per {{date}}",
    fromBank:
      "Fra {{account}}{{asOf}}. Oppdateres etter hver banksynk - slå av «Saldo fra banken» nedenfor for å skrive den inn selv.",
  },
  owner: {
    label: "EIER",
    options: {
      mine: "Mine",
      partner: "Partnerens",
      joint: "Felles",
    },
  },
  type: {
    label: "GJELDSTYPE",
    options: {
      personal_credit: "Kreditt / privat",
      car: "Bil",
      house: "Bolig / boliglån",
    },
  },
  apr: {
    label: "EFFEKTIV RENTE (%)",
    placeholder: "0,0",
  },
  minPayment: {
    label: "MINSTEBETALING",
    placeholder: "0,00",
  },
  dueDay: {
    label: "FORFALLSDAG FOR MINSTEBETALING",
    hint: "Dagen i måneden minstebetalingen din forfaller. Dag 29-31 blir siste dag i kortere måneder.",
    useDefault: "Bruk standard (dag {{day}})",
    custom: "Velg egen dag",
  },
  goal: {
    label: "MÅLDATO FOR NEDBETALING (VALGFRITT)",
    selectMonth: "Velg måned",
    clear: "Fjern målmåned",
    payHint_one: "Betal {{amount}}/mnd for å bli gjeldfri på {{count}} måned",
    payHint_other: "Betal {{amount}}/mnd for å bli gjeldfri på {{count}} måneder",
    tooSoon: "Måldatoen er for nær - ikke oppnåelig",
    pickerTitle: "Velg måldato for nedbetaling",
  },
  bank: {
    label: "TILKOBLET BANKKONTO (VALGFRITT)",
    emptyHint:
      "Koble til banken din (Profil → Banktilkoblinger), så kan dette kortet holde saldoen sin oppdatert selv - og med aktivitetsovervåkingen på, stemple siste bruk fra kjøpene dine.",
    pickHint:
      "Velg bankkontoen som er dette kortet. Saldoen lander her etter hver synk, og med aktivitetsovervåkingen på stempler kjøpene sist-brukt-datoen for deg.",
    notConnected: "Ikke tilkoblet",
    updatesLabel: "SALDOOPPDATERINGER",
    balanceOn: "Saldo fra banken: På",
    balanceOff: "Saldo fra banken: Av",
  },
  keepAlive: {
    label: "AKTIVITETSOVERVÅKING (VALGFRITT)",
    hint: "Kortutstedere kan avslutte et kort som ikke brukes. Få varsel før kortets inaktivitetsvindu går ut. Har du avsluttet kortet med vilje? Bare slå av overvåkingen.",
    on: "Aktivitetsovervåking: På",
    off: "Aktivitetsovervåking: Av",
    windowLabel: "TILLATT INAKTIVITET (VARIERER MELLOM UTSTEDERE)",
    windowChip: "{{count}} mnd",
    leadLabel: "BEGYNN Å VARSLE MEG",
    leadChip: "{{count}} dager før",
    lastUsedLabel: "SIST BRUKT",
    lastUsedLinked:
      "Stemples automatisk fra kjøp på {{account}}. Trykk på «Jeg brukte det» på kortet når som helst for å stemple manuelt.",
    lastUsedWithLinks:
      "Trykk på «Jeg brukte det» på kortet etter et kjøp - eller velg en tilkoblet konto ovenfor, så stemples det automatisk.",
    lastUsedNoLinks:
      "Trykk på «Jeg brukte det» på kortet etter et kjøp. Sett opp en banktilkobling (Profil → Banktilkoblinger), så stemples datoen automatisk fra transaksjonene dine.",
    statusLine: "Sist brukt {{date}} · neste bruk innen {{deadline}}",
    statusStartsToday: "Starter i dag · neste bruk innen {{deadline}}",
  },
  alerts: {
    notificationsOff: {
      title: "Varsler er av",
      message:
        "Aktivitetsovervåkingen fungerer likevel - du ser advarsler i appen. For også å få påminnelser som varsler, slå dem på i telefonens innstillinger.",
      openSettings: "Åpne innstillinger",
    },
  },
  buttons: {
    saveChanges: "Lagre endringer",
    addDebt: "Legg til gjeldspost",
  },
};
