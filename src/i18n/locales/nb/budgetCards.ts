/**
 * BudgetArk - Norske tekster: Budsjett-fanen (cards)
 * File: src/i18n/locales/nb/budgetCards.ts
 *
 * Norwegian (Bokmål) counterpart of en/budgetCards.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Norwegian ordinals are
 * written with a period ("1.", "2.", "15."), so every English plural-rule
 * bucket (one/two/few/other) maps to the same "." suffix.
 */

import type { Localized } from "../types";
import type { budgetCards as en } from "../en/budgetCards";

export const budgetCards: Localized<typeof en> = {
  paycheck: {
    title: "Til lønning",
    change: "Endre",
    emptyIntro:
      "Fortell BudgetArk når du får lønn, så viser den hva som skal betales før neste lønning - og hva som er igjen å bruke til da.",
    setUp: "Sett opp lønnsperioder",
    noNextPayday: "Lønnsplanen din ga ingen neste lønningsdag - sjekk den.",
    howOften: "Hvor ofte får du lønn?",
    frequency: {
      weekly: "Hver uke",
      biweekly: "Annenhver uke",
      semimonthly: "To ganger i måneden",
      monthly: "Hver måned",
    },
    recentPayday: "Din siste lønningsdag",
    paydays: "Lønningsdager",
    payday: "Lønningsdag",
    semimonthly: {
      "1-15": "1. og 15.",
      "15-last": "15. og siste dag",
    },
    lastDay: "Siste dag",
    ordinalSuffix: { one: ".", two: ".", few: ".", other: "." },
    dayOrdinal: "{{day}}{{suffix}}",
    pickPayday: "Velg først en nylig lønningsdag.",
    saveFailed: "Kunne ikke lagre lønnsplanen din.",
    saveSchedule: "Lagre plan",
    privacyHint: "Blir på denne telefonen. Brukes bare til å dele budsjettet ditt inn i lønnsperioder.",
    nextCheck: "Neste lønn {{date}} · {{when}}",
    tomorrow: "i morgen",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dager",
    dueBefore: "Forfaller før det",
    nothingDue: "Ingenting i kalenderen før neste lønning.",
    today: "i dag",
    overdue: "forfalt · {{date}}",
    showFewer: "Vis færre",
    showMore: "+{{count}} til",
    safeUntilPayday: "Igjen å bruke til lønning",
    shortBy: "Mangler før lønning",
    perDay: "Omtrent {{amount}} per dag. ",
    cashNow:
      "Kontanter nå ≈ {{amount}}: inngående saldo pluss det som ifølge postene har kommet inn så langt denne måneden.",
    recordBalance:
      "Registrer månedens inngående saldo på brukskontoen, så viser dette kortet også hva som er igjen å bruke til lønning. ",
    setIt: "Angi",
  },
  monthBalance: {
    promptTitle: "Ny måned - oppdater saldoen din",
    title: "Inngående saldo",
    subtitle:
      "Hva står på brukskontoen ved starten av {{month}}? BudgetArk bruker det til å beregne kontantene ved månedens slutt og hva som er igjen å bruke.",
    inputPlaceholder: "0,00",
    inputA11y: "Inngående saldo på brukskontoen",
    usePrefill: "Bruk Broens brukskontosum: {{amount}}",
    alsoUpdates: "Oppdaterer også «{{account}}» på Broen, så nettoformuen holder seg oppdatert.",
    saveFailed: "Kunne ikke lagre saldoen din. Prøv igjen.",
    notNow: "Ikke nå",
    saving: "Lagrer…",
  },
  cashFlow: {
    title: "Kontantstrøm",
    emptyIntro:
      "Angi månedens inngående saldo på brukskontoen, så beregner BudgetArk hvor måneden ender - og hva som er igjen å bruke.",
    setStarting: "Angi inngående saldo",
    update: "Oppdater",
    startingCash: "Inngående kontanter",
    projectedEnd: "Beregnet ved månedens slutt",
    safeToSpend: "Igjen å bruke",
    overPlanBy: "Over plan med",
    hint: "Inntekter minus utgifter denne måneden, inkludert planlagte regninger og minstebetalinger på gjeld.",
    reconcileOnPlan: "Startet nøyaktig på forrige måneds plan",
    reconcileAbove: "Startet {{amount}} over forrige måneds plan",
    reconcileBelow: "Startet {{amount}} under forrige måneds plan",
  },
  reminderOffer: {
    eyebrow: "LOGGPÅMINNELSER",
    title: "🔔 Vil du ha et lite puff for å fortsette å logge?",
    body:
      "En kort avstemming hvis det går noen dager uten en post, og et hint den 1. Aldri et beløp, en saldo, en konto eller en regning - bare et trykk tilbake inn i appen. Juster eller slå av når som helst under Profil → Loggpåminnelser.",
    turnOn: "Slå på",
    asking: "Spør telefonen din...",
    noThanks: "Nei takk",
    permissionTitle: "Varsler er av",
    permissionMessage:
      "BudgetArk trenger varseltillatelse for å sende påminnelser om avstemming. Du kan slå det på i telefonens innstillinger og deretter aktivere påminnelser under Profil → Loggpåminnelser.",
    notNow: "Ikke nå",
    openSettings: "Åpne innstillinger",
    failedTitle: "Kunne ikke slå på påminnelser",
    failedMessage:
      "Noe gikk galt da innstillingen skulle lagres. Du kan prøve igjen under Profil → Loggpåminnelser.",
  },
  debtDue: {
    eyebrow: "PÅMINNELSE OM GJELDSBETALING",
    summary_one: "{{count}} minstebetaling forfaller innen {{days}} dager",
    summary_other: "{{count}} minstebetalinger forfaller innen {{days}} dager",
    total: "{{amount}} minstebetalinger totalt (fra Gjeld-fanen)",
    next: "Neste: {{name}} · {{amount}} · {{when}}",
    today: "i dag",
    tomorrow: "i morgen",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dager",
  },
  dueDate: {
    eyebrow: "PÅMINNELSE OM FORFALLSDATO",
    summary_one: "{{count}} regning planlagt innen {{days}} dager",
    summary_other: "{{count}} regninger planlagt innen {{days}} dager",
    total: "{{amount}} planlagt totalt",
    next: "Neste: {{name}} · {{amount}} · {{when}}",
    today: "i dag",
    tomorrow: "i morgen",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dager",
  },
  pace: {
    eyebrow: "FORBRUKSTEMPO",
    overTitle: "{{category}} ligger {{overBy}} over grensen på {{limit}}",
    overDetail: "Alt mer i denne kategorien denne måneden tas fra planen.",
    aheadTitle: "{{category}} er {{percent}} % brukt, og det er bare den {{dayOrdinal}}",
    aheadDetail:
      "I dette tempoet ender måneden på {{projected}} mot en grense på {{limit}} - {{expected}} ville vært i rute i dag.",
    more_one: "+{{count}} kategori til ute av tempo: {{list}}",
    more_other: "+{{count}} kategorier til ute av tempo: {{list}}",
    listSeparator: ", ",
  },
};
