/**
 * BudgetArk - Norske tekster: Budsjett-fanen (inbox)
 * File: src/i18n/locales/nb/budgetInbox.ts
 *
 * Norwegian (Bokmål) counterpart of en/budgetInbox.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetInbox as en } from "../en/budgetInbox";

export const budgetInbox: Localized<typeof en> = {
  title: "Gjennomgangsinnboks",
  subtitle: {
    waiting_one: "{{count}} importert transaksjon venter på godkjenning",
    waiting_other: "{{count}} importerte transaksjoner venter på godkjenning",
    empty: "Ingenting å gå gjennom",
  },
  header: {
    rules: "Regler",
    sync: "Synk",
  },
  groupBy: {
    label: "Grupper etter",
    date: "Dato",
    vendor: "Forhandler",
  },
  bulk: {
    approving: "Godkjenner...",
    approveSuggested: "Godkjenn {{count}} med foreslåtte kategorier",
    skipAll: "Hopp over alle",
    categorizeAll: "Kategoriser alle",
    close: "Lukk",
    alwaysFileVendor: "Legg alltid denne forhandleren her",
    working: "Jobber...",
    approveGroupAs: "Godkjenn {{count}} som {{category}}",
  },
  empty: "Innboksen er tom. Nye transaksjoner lander her etter en synk.",
  row: {
    noDescription: "(ingen beskrivelse)",
    pending: "venter",
    suggested: "forslag: {{category}}",
    deletedBusiness: "(slettet bedrift)",
    deletedPerson: "(slettet person)",
    deletedDebt: "(slettet gjeldspost)",
  },
  form: {
    nameLabel: "NAVN",
    namePlaceholder: "Gi transaksjonen et navn",
    categoryLabel: "KATEGORI",
    appliesToBill: "GJELDER REGNINGEN",
    notABill: "Ikke en regning",
    billOption: "{{name}} · ca. {{amount}}",
    debtOption: "{{name}} · min {{amount}}",
    debtHint:
      "Logges som en betaling på denne gjeldsposten - saldoen og betalingshistorikken oppdateres på Gjeld-fanen, og budsjettet teller den under Gjeldsbetalinger. Ingen separat utgift opprettes, og kategorien over brukes ikke. Huk av «Gjør alltid dette» nedenfor, så logges fremtidige betalinger til denne forhandleren på gjeldsposten uten å stoppe her.",
    businessLabel: "BEDRIFT",
    personal: "Personlig",
    peopleLabel: "PERSONER",
    unassigned: "Ikke tilordnet",
    lentToLabel: "UTLÅNT TIL NOEN?",
    lentToHint:
      "Penger du venter å få tilbake? Oppgi hvem som har dem, og følg hva de betaler tilbake under Profil → Personer → Til gode.",
    lentToPlaceholder: "La stå tomt hvis dette ikke er et lån",
    lentToChip: "Utlånt til {{name}}",
    planLabel: "LEGG TIL I EN KJØPSPLAN",
    planHint:
      "Flyttet du pengene til sparing for en av planene dine? Trykk på planen, så lander beløpet på saldoen dens i stedet for å legges inn som en utgift.",
    planChipA11y: "Legg til {{amount}} i {{plan}}",
    planToGo: " · {{amount}} igjen",
    planFunded: " · fullfinansiert",
    rememberRule:
      "Gjør alltid dette for «{{merchant}}» - ved Godkjenn godkjennes matchende transaksjoner her og i fremtidige importer automatisk med disse valgene; ved Hopp over importeres den aldri igjen",
  },
  billSuggest: {
    title: "🧾 Ser ut som en månedlig regning",
    body_one:
      "{{label}} har blitt trukket én gang i måneden i {{count}} måned, i snitt {{amount}}. Gjør den til en gjentakende regning, så legges dette trekket - og fremtidige - mot den i stedet for å stables på estimatet.",
    body_other:
      "{{label}} har blitt trukket én gang i måneden i {{count}} måneder, i snitt {{amount}}. Gjør den til en gjentakende regning, så legges dette trekket - og fremtidige - mot den i stedet for å stables på estimatet.",
    creating: "Oppretter...",
    create: "Gjør til gjentakende regning · {{amount}}/mnd",
  },
  ruleNudge: {
    title: "🔁 Du har gjort dette før",
    body_one:
      "Du har godkjent «{{merchant}}» som {{category}} {{count}} gang. Gjør det til en regel, så godkjenner fremtidige importer fra denne forhandleren seg selv med samme kategori.",
    body_other:
      "Du har godkjent «{{merchant}}» som {{category}} {{count}} ganger. Gjør det til en regel, så godkjenner fremtidige importer fra denne forhandleren seg selv med samme kategori.",
    saving: "Lagrer...",
    alwaysApproveAs: "Godkjenn alltid som {{category}}",
  },
  actions: {
    skip: "Hopp over",
    alwaysSkip: "Hopp alltid over",
    saving: "Lagrer...",
    logPayment: "Logg betaling",
    alwaysLogPayment: "Logg alltid betaling",
    approve: "Godkjenn",
    alwaysApprove: "Godkjenn alltid",
  },
  skipped: {
    toggle: "Nylig hoppet over · {{count}}",
    title: "Nylig hoppet over",
    subtitle:
      "Transaksjoner som forlot innboksen uten å bli godkjent de siste {{days}} dagene - hoppet over av deg, av en regel, av partnerens telefon eller gjennom en match under synk. Gjenopprett en, så kommer den tilbake i innboksen; en gjenopprettet transaksjon hoppes aldri over automatisk igjen.",
    back: "Tilbake til innboksen",
    restore: "Gjenopprett",
    restoring: "Gjenoppretter...",
    empty: "Ingenting hoppet over nylig.",
    when: "Hoppet over {{date}}",
    reason: {
      user: "Du hoppet over den",
      rule: "Hoppet over av en Hopp alltid over-regel",
      partner: "Hoppet over på partnerens telefon",
      duplicate: "Matchet en transaksjon som allerede er gjennomgått",
      stale: "Banken rapporterer ikke lenger denne ventende transaksjonen",
    },
  },
  notices: {
    syncSkipped_one:
      "{{count}} transaksjon ble hoppet over under denne synken - se Nylig hoppet over nedenfor.",
    syncSkipped_other:
      "{{count}} transaksjoner ble hoppet over under denne synken - se Nylig hoppet over nedenfor.",
    syncAutoApproved_one: "{{count}} transaksjon ble automatisk godkjent av reglene dine.",
    syncAutoApproved_other: "{{count}} transaksjoner ble automatisk godkjent av reglene dine.",
    alreadyLogged:
      "Finnes allerede på Gjeld-fanen - matchet mot betalingen på {{amount}} som ble logget {{date}}. Ingenting ble telt dobbelt.",
  },
  errors: {
    restore: "Kunne ikke gjenopprette denne transaksjonen.",
    load: "Kunne ikke laste inn innboksen.",
    approve: "Kunne ikke godkjenne denne transaksjonen.",
    skip: "Kunne ikke hoppe over denne transaksjonen.",
    addToPlan: "Kunne ikke legge dette til i planen.",
    logDebtPayment: "Kunne ikke logge denne gjeldsbetalingen.",
    skipMany: "Kunne ikke hoppe over de transaksjonene.",
    createBill: "Kunne ikke opprette den gjentakende regningen.",
    categorizeVendor: "Kunne ikke kategorisere transaksjonene til denne forhandleren.",
    bulkApprove: "Kunne ikke godkjenne alle de foreslåtte transaksjonene.",
  },
};
