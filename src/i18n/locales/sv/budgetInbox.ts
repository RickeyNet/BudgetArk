/**
 * BudgetArk - Svenska texter: Budget-fliken (inbox)
 * File: src/i18n/locales/sv/budgetInbox.ts
 *
 * Swedish counterpart of en/budgetInbox.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetInbox as en } from "../en/budgetInbox";

export const budgetInbox: Localized<typeof en> = {
  title: "Granskningsinkorg",
  subtitle: {
    waiting_one: "{{count}} importerad transaktion väntar på godkännande",
    waiting_other: "{{count}} importerade transaktioner väntar på godkännande",
    empty: "Inget att granska",
  },
  header: {
    rules: "Regler",
    sync: "Synka",
  },
  groupBy: {
    label: "Gruppera efter",
    date: "Datum",
    vendor: "Handlare",
  },
  bulk: {
    approving: "Godkänner...",
    approveSuggested: "Godkänn {{count}} med föreslagna kategorier",
    skipAll: "Hoppa över alla",
    categorizeAll: "Kategorisera alla",
    close: "Stäng",
    alwaysFileVendor: "Sortera alltid den här handlaren hit",
    working: "Arbetar...",
    approveGroupAs: "Godkänn {{count}} som {{category}}",
  },
  empty: "Inkorgen är tom. Nya transaktioner landar här efter en synk.",
  row: {
    noDescription: "(ingen beskrivning)",
    pending: "väntar",
    suggested: "förslag: {{category}}",
    deletedBusiness: "(borttaget företag)",
    deletedPerson: "(borttagen person)",
    deletedDebt: "(borttagen skuld)",
  },
  form: {
    nameLabel: "NAMN",
    namePlaceholder: "Namnge transaktionen",
    categoryLabel: "KATEGORI",
    appliesToBill: "GÄLLER RÄKNINGEN",
    notABill: "Ingen räkning",
    billOption: "{{name}} · ca {{amount}}",
    debtOption: "{{name}} · min {{amount}}",
    debtHint:
      "Loggas som en betalning på den här skulden - saldot och betalningshistoriken uppdateras på fliken Skulder, och budgeten räknar den under Skuldbetalningar. Ingen separat utgift skapas, och kategorin ovan används inte. Bocka i ”Gör alltid så” nedan så loggas framtida betalningar till den här handlaren på skulden utan att stanna här.",
    businessLabel: "FÖRETAG",
    personal: "Privat",
    peopleLabel: "PERSONER",
    unassigned: "Ej tilldelad",
    lentToLabel: "UTLÅNAT TILL NÅGON?",
    lentToHint:
      "Pengar du väntar dig tillbaka? Ange vem som har dem och följ vad de betalar tillbaka under Profil → Personer → Att få tillbaka.",
    lentToPlaceholder: "Lämna tomt om det inte är ett lån",
    lentToChip: "Utlånat till {{name}}",
    planLabel: "LÄGG TILL I EN INKÖPSPLAN",
    planHint:
      "Flyttade du pengarna till sparande för en av dina planer? Tryck på planen så landar beloppet på dess saldo i stället för att sorteras som en utgift.",
    planChipA11y: "Lägg till {{amount}} i {{plan}}",
    planToGo: " · {{amount}} kvar",
    planFunded: " · fullt sparat",
    rememberRule:
      "Gör alltid så för ”{{merchant}}” - vid Godkänn godkänns matchande transaktioner här och i framtida importer automatiskt med de här valen; vid Hoppa över importeras den aldrig igen",
  },
  billSuggest: {
    title: "🧾 Ser ut som en månadsräkning",
    body_one:
      "{{label}} har dragits en gång i månaden i {{count}} månad, i snitt {{amount}}. Gör den till en återkommande räkning så sorteras den här dragningen - och framtida - mot den i stället för att läggas ovanpå uppskattningen.",
    body_other:
      "{{label}} har dragits en gång i månaden i {{count}} månader, i snitt {{amount}}. Gör den till en återkommande räkning så sorteras den här dragningen - och framtida - mot den i stället för att läggas ovanpå uppskattningen.",
    creating: "Skapar...",
    create: "Gör till återkommande räkning · {{amount}}/mån",
  },
  ruleNudge: {
    title: "🔁 Du har gjort det här förut",
    body_one:
      "Du har godkänt ”{{merchant}}” som {{category}} {{count}} gång. Gör det till en regel så godkänner framtida importer från den här handlaren sig själva med samma kategori.",
    body_other:
      "Du har godkänt ”{{merchant}}” som {{category}} {{count}} gånger. Gör det till en regel så godkänner framtida importer från den här handlaren sig själva med samma kategori.",
    saving: "Sparar...",
    alwaysApproveAs: "Godkänn alltid som {{category}}",
  },
  actions: {
    skip: "Hoppa över",
    alwaysSkip: "Hoppa alltid över",
    saving: "Sparar...",
    logPayment: "Logga betalning",
    alwaysLogPayment: "Logga alltid betalning",
    approve: "Godkänn",
    alwaysApprove: "Godkänn alltid",
  },
  skipped: {
    toggle: "Nyligen överhoppade · {{count}}",
    title: "Nyligen överhoppade",
    subtitle:
      "Transaktioner som lämnat inkorgen utan att godkännas de senaste {{days}} dagarna - överhoppade av dig, av en regel, av din partners telefon eller genom en matchning vid synk. Återställ en så kommer den tillbaka till inkorgen; en återställd transaktion hoppas aldrig över automatiskt igen.",
    back: "Tillbaka till inkorgen",
    restore: "Återställ",
    restoring: "Återställer...",
    empty: "Inget överhoppat nyligen.",
    when: "Överhoppad {{date}}",
    reason: {
      user: "Du hoppade över den",
      rule: "Överhoppad av en Hoppa alltid över-regel",
      partner: "Överhoppad på din partners telefon",
      duplicate: "Matchade en redan granskad transaktion",
      stale: "Banken rapporterar inte längre den här väntande transaktionen",
    },
  },
  notices: {
    syncSkipped_one:
      "{{count}} transaktion hoppades över under den här synken - se Nyligen överhoppade nedan.",
    syncSkipped_other:
      "{{count}} transaktioner hoppades över under den här synken - se Nyligen överhoppade nedan.",
    syncAutoApproved_one: "{{count}} transaktion godkändes automatiskt av dina regler.",
    syncAutoApproved_other: "{{count}} transaktioner godkändes automatiskt av dina regler.",
    alreadyLogged:
      "Finns redan på fliken Skulder - matchad mot betalningen på {{amount}} som loggades {{date}}. Inget räknades dubbelt.",
  },
  errors: {
    restore: "Kunde inte återställa den här transaktionen.",
    load: "Kunde inte läsa in inkorgen.",
    approve: "Kunde inte godkänna den här transaktionen.",
    skip: "Kunde inte hoppa över den här transaktionen.",
    addToPlan: "Kunde inte lägga till detta i planen.",
    logDebtPayment: "Kunde inte logga den här skuldbetalningen.",
    skipMany: "Kunde inte hoppa över de transaktionerna.",
    createBill: "Kunde inte skapa den återkommande räkningen.",
    categorizeVendor: "Kunde inte kategorisera den här handlarens transaktioner.",
    bulkApprove: "Kunde inte godkänna alla föreslagna transaktioner.",
  },
};
