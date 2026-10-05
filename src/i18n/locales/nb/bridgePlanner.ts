/**
 * BudgetArk - Norske tekster: Broen-fanen (planner)
 * File: src/i18n/locales/nb/bridgePlanner.ts
 *
 * Norwegian (Bokmål) counterpart of en/bridgePlanner.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Ranking-method and
 * allocation-mode labels are keyed by the ids from utils/purchasePlanner.
 */

import type { Localized } from "../types";
import type { bridgePlanner as en } from "../en/bridgePlanner";

export const bridgePlanner: Localized<typeof en> = {
  summary: {
    saved: "SPART",
    stillToGo: "IGJEN",
    total: "TOTALT",
    plans_one: "{{count}} plan",
    plans_other: "{{count}} planer",
    funded: " · {{count}} finansiert",
    allFundedNow: " · alle finansiert",
    allFundedBy: " · alle finansiert senest {{date}}",
    notFundedInHorizon: " · ikke alle finansiert innen 20 år i dette tempoet",
    setAmountToSee: " · angi et månedsbeløp nedenfor for å se når",
    late_one: "{{count}} plan ville bomme på behovsdatoen sin i dette tempoet.",
    late_other: "{{count}} planer ville bomme på behovsdatoene sine i dette tempoet.",
  },
  order: {
    label: "REKKEFØLGE",
    methods: {
      snowball: "Minste først",
      soonest: "Trengs snarest",
      custom: "Min rekkefølge",
    },
    hints: {
      snowball: "Fullfør de billigste planene først for raske seire - snøballen.",
      soonest: "Planer med nærmeste behovsdato kommer først; udaterte etterpå.",
      custom: "Ranger dem selv med pilene på hver plan.",
    },
  },
  setAside: {
    label: "Sett av til alle planer",
    perMonth: "{{amount}}/mnd",
    chartNow: "Nå",
  },
  fit: {
    trackFirst: "Følg en hel måned med inntekter og utgifter, så sier dette om beløpet passer.",
    fits: "Passer: omtrent {{amount}}/mnd er ledig etter gjennomsnittsforbruket ditt.",
    tight: "Trangt: dette tar det meste av de ~{{amount}}/mnd som er ledig etter gjennomsnittsforbruket ditt.",
    over: "For mye: mer enn de ~{{amount}}/mnd som er ledig etter gjennomsnittsforbruket ditt.",
    overNoFreeCash: "For mye: gjennomsnittsforbruket ditt overstiger allerede inntekten din, så alt du setter av kommer fra et annet sted.",
  },
  allocation: {
    modes: {
      rollover: "Én om gangen",
      parallel: "Del likt",
    },
    hints: {
      rollover: "Hele beløpet går til den første planen; når den er finansiert, ruller pengene videre til neste - som en gjeldssnøball.",
      parallel: "Beløpet deles likt mellom alle ufinansierte planer, og en ferdig plans andel går til de andre.",
    },
  },
  row: {
    a11yAddFunds: "Legg til penger i {{name}}",
    fundedMeta: "Finansiert - klar til å kjøpe 🎉",
    progressMeta: "{{current}} av {{target}}",
    requiredSuffix: " · {{amount}}/mnd for å nå {{date}}",
    ready: "Klar {{date}}",
    monthlyNow: " · {{amount}}/mnd nå",
    waitsTurn: " · venter på sin tur",
    misses: " · bommer på {{date}}",
    lateFor_one: " · {{count}} mnd for sent til {{date}}",
    lateFor_other: " · {{count}} mnd for sent til {{date}}",
    itsDate: "datoen sin",
    notFundedInHorizon: "Ikke finansiert innen 20 år i dette tempoet",
    moveUp: "Flytt {{name}} opp",
    moveDown: "Flytt {{name}} ned",
  },
  nudges: {
    makesItHappen: "gjør det mulig",
    sooner_one: "{{count}} mnd tidligere",
    sooner_other: "{{count}} mnd tidligere",
    extraMonthlyA11y: "Legg til {{amount}} i måneden til alle planer",
    extraMonthly: "+{{amount}}/mnd · {{sooner}}",
    lumpSumA11y: "Legg til {{amount}} i {{name}} nå",
    finishIt: "Fullfør: {{amount}} nå",
    lumpSumNow: "+{{amount}} nå · {{sooner}}",
  },
  contribute: {
    savedOf: "{{current}} av {{target}} spart.",
    amountPlaceholder: "Beløp å legge til",
    negativeHint: "Bruk et negativt beløp for å rette en feil.",
    costPerUseLabel: "KOSTNAD PER BRUK (VALGFRITT)",
    usesPlaceholder: "Antall bruk per måned",
    yearsPlaceholder: "År du beholder det",
    costPerUseHint: "Hvor ofte og hvor lenge du bruker det, gjør prisen om til en kostnad per bruk.",
    deleteLink: "Slett denne planen",
  },
  errors: {
    reorder: "Kunne ikke lagre den nye rekkefølgen.",
    save: "Kunne ikke lagre planen.",
    delete: "Kunne ikke slette planen.",
  },
  deleteDialog: {
    title: "Slette planen?",
    message: "«{{name}}» og de {{amount}} som er spart så langt fjernes. Pengene selv blir der du har dem.",
    keep: "Behold",
  },
};
