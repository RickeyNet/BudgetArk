/**
 * BudgetArk - Svenska texter: Bryggan-fliken (planner)
 * File: src/i18n/locales/sv/bridgePlanner.ts
 *
 * Swedish counterpart of en/bridgePlanner.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Ranking-method and
 * allocation-mode labels are keyed by the ids from utils/purchasePlanner.
 */

import type { Localized } from "../types";
import type { bridgePlanner as en } from "../en/bridgePlanner";

export const bridgePlanner: Localized<typeof en> = {
  summary: {
    saved: "SPARAT",
    stillToGo: "KVAR",
    total: "TOTALT",
    plans_one: "{{count}} plan",
    plans_other: "{{count}} planer",
    funded: " · {{count}} finansierade",
    allFundedNow: " · alla finansierade",
    allFundedBy: " · alla finansierade senast {{date}}",
    notFundedInHorizon: " · inte alla finansierade inom 20 år i den här takten",
    setAmountToSee: " · ange ett månadsbelopp nedan för att se när",
    late_one: "{{count}} plan skulle missa sitt behovsdatum i den här takten.",
    late_other: "{{count}} planer skulle missa sina behovsdatum i den här takten.",
  },
  order: {
    label: "ORDNING",
    methods: {
      snowball: "Minsta först",
      soonest: "Behövs snarast",
      custom: "Min ordning",
    },
    hints: {
      snowball: "Avsluta de billigaste planerna först för snabba vinster - snöbollen.",
      soonest: "Planer med närmast behovsdatum kommer först; odaterade efter.",
      custom: "Ordna dem själv med pilarna på varje plan.",
    },
  },
  setAside: {
    label: "Sätt undan för alla planer",
    perMonth: "{{amount}}/mån",
    chartNow: "Nu",
  },
  fit: {
    trackFirst: "Följ en hel månad av inkomster och utgifter så säger det här om beloppet passar.",
    fits: "Passar: ungefär {{amount}}/mån är fritt efter dina genomsnittliga utgifter.",
    tight: "Tajt: det här tar det mesta av de ~{{amount}}/mån som är fria efter dina genomsnittliga utgifter.",
    over: "För mycket: mer än de ~{{amount}}/mån som är fria efter dina genomsnittliga utgifter.",
    overNoFreeCash: "För mycket: dina genomsnittliga utgifter överstiger redan din inkomst, så allt du sätter undan kommer någon annanstans ifrån.",
  },
  allocation: {
    modes: {
      rollover: "En i taget",
      parallel: "Dela lika",
    },
    hints: {
      rollover: "Hela beloppet går till första planen; när den är finansierad rullar pengarna vidare till nästa - som en skuldsnöboll.",
      parallel: "Beloppet delas lika mellan alla ofinansierade planer, och en färdig plans andel går till de övriga.",
    },
  },
  row: {
    a11yAddFunds: "Lägg till pengar i {{name}}",
    fundedMeta: "Finansierad - redo att köpa 🎉",
    progressMeta: "{{current}} av {{target}}",
    requiredSuffix: " · {{amount}}/mån för att nå {{date}}",
    ready: "Klar {{date}}",
    monthlyNow: " · {{amount}}/mån nu",
    waitsTurn: " · väntar på sin tur",
    misses: " · missar {{date}}",
    lateFor_one: " · {{count}} mån sen till {{date}}",
    lateFor_other: " · {{count}} mån sen till {{date}}",
    itsDate: "sitt datum",
    notFundedInHorizon: "Inte finansierad inom 20 år i den här takten",
    moveUp: "Flytta {{name}} upp",
    moveDown: "Flytta {{name}} ned",
  },
  nudges: {
    makesItHappen: "gör det möjligt",
    sooner_one: "{{count}} mån tidigare",
    sooner_other: "{{count}} mån tidigare",
    extraMonthlyA11y: "Lägg till {{amount}} i månaden till alla planer",
    extraMonthly: "+{{amount}}/mån · {{sooner}}",
    lumpSumA11y: "Lägg till {{amount}} i {{name}} nu",
    finishIt: "Avsluta: {{amount}} nu",
    lumpSumNow: "+{{amount}} nu · {{sooner}}",
  },
  contribute: {
    savedOf: "{{current}} av {{target}} sparat.",
    amountPlaceholder: "Belopp att lägga till",
    negativeHint: "Använd ett negativt belopp för att rätta ett misstag.",
    costPerUseLabel: "KOSTNAD PER ANVÄNDNING (VALFRITT)",
    usesPlaceholder: "Användningar per månad",
    yearsPlaceholder: "År du behåller det",
    costPerUseHint: "Hur ofta och hur länge du använder det gör om priset till en kostnad per användning.",
    deleteLink: "Ta bort den här planen",
  },
  errors: {
    reorder: "Kunde inte spara den nya ordningen.",
    save: "Kunde inte spara planen.",
    delete: "Kunde inte ta bort planen.",
  },
  deleteDialog: {
    title: "Ta bort planen?",
    message: "”{{name}}” och de {{amount}} som sparats hittills tas bort. Pengarna själva stannar där du har dem.",
    keep: "Behåll",
  },
};
