/**
 * BudgetArk - Svenska texter: Budget-fliken (cards)
 * File: src/i18n/locales/sv/budgetCards.ts
 *
 * Swedish counterpart of en/budgetCards.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Swedish ordinals are
 * "1:a", "2:a", "3:e", "4:e"... - the English plural-rule buckets map
 * cleanly (one/two → ":a", few/other → ":e").
 */

import type { Localized } from "../types";
import type { budgetCards as en } from "../en/budgetCards";

export const budgetCards: Localized<typeof en> = {
  paycheck: {
    title: "Till lönen",
    change: "Ändra",
    emptyIntro:
      "Berätta för BudgetArk när du får lön så visar den vad som ska betalas före nästa lön - och vad som är kvar att spendera tills dess.",
    setUp: "Ställ in löneperioder",
    noNextPayday: "Ditt löneschema gav ingen nästa lönedag - kontrollera det.",
    howOften: "Hur ofta får du lön?",
    frequency: {
      weekly: "Varje vecka",
      biweekly: "Varannan vecka",
      semimonthly: "Två gånger i månaden",
      monthly: "Varje månad",
    },
    recentPayday: "Din senaste lönedag",
    paydays: "Lönedagar",
    payday: "Lönedag",
    semimonthly: {
      "1-15": "1:a & 15:e",
      "15-last": "15:e & sista dagen",
    },
    lastDay: "Sista dagen",
    ordinalSuffix: { one: ":a", two: ":a", few: ":e", other: ":e" },
    dayOrdinal: "{{day}}{{suffix}}",
    pickPayday: "Välj först din senaste lönedag.",
    saveFailed: "Kunde inte spara ditt löneschema.",
    saveSchedule: "Spara schema",
    privacyHint: "Stannar på den här telefonen. Används bara för att dela upp din budget i löneperioder.",
    nextCheck: "Nästa lön {{date}} · {{when}}",
    tomorrow: "imorgon",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dagar",
    dueBefore: "Ska betalas innan dess",
    nothingDue: "Inget i kalendern före din nästa lön.",
    today: "idag",
    overdue: "försenad · {{date}}",
    showFewer: "Visa färre",
    showMore: "+{{count}} till",
    safeUntilPayday: "Kvar att spendera till lönen",
    shortBy: "Saknas före lönen",
    perDay: "Ungefär {{amount}} per dag. ",
    cashNow:
      "Kassa nu ≈ {{amount}}: ditt ingående saldo plus det som enligt posterna har kommit in hittills i månaden.",
    recordBalance:
      "Ange månadens ingående saldo på lönekontot så visar det här kortet också vad som är kvar att spendera till lönen. ",
    setIt: "Ange",
  },
  monthBalance: {
    promptTitle: "Ny månad - uppdatera ditt saldo",
    title: "Ingående saldo",
    subtitle:
      "Vad finns på lönekontot i början av {{month}}? BudgetArk använder det för att beräkna kassan vid månadens slut och vad som är kvar att spendera.",
    inputPlaceholder: "0,00",
    inputA11y: "Ingående saldo på lönekontot",
    usePrefill: "Använd Bryggans lönekontosumma: {{amount}}",
    alsoUpdates: "Uppdaterar också ”{{account}}” på Bryggan så att nettoförmögenheten hålls aktuell.",
    saveFailed: "Kunde inte spara ditt saldo. Försök igen.",
    notNow: "Inte nu",
    saving: "Sparar…",
  },
  cashFlow: {
    title: "Kassaflöde",
    emptyIntro:
      "Ange månadens ingående saldo på lönekontot så beräknar BudgetArk var månaden slutar - och vad som är kvar att spendera.",
    setStarting: "Ange ingående saldo",
    update: "Uppdatera",
    startingCash: "Ingående kassa",
    projectedEnd: "Beräknat vid månadens slut",
    safeToSpend: "Kvar att spendera",
    overPlanBy: "Över plan med",
    hint: "Inkomster minus utgifter den här månaden, inklusive planerade räkningar och minimibetalningar på skulder.",
    reconcileOnPlan: "Började exakt enligt förra månadens plan",
    reconcileAbove: "Började {{amount}} över förra månadens plan",
    reconcileBelow: "Började {{amount}} under förra månadens plan",
  },
  reminderOffer: {
    eyebrow: "LOGGPÅMINNELSER",
    title: "🔔 Vill du ha en knuff att fortsätta logga?",
    body:
      "En kort avstämning om några dagar går utan någon post, och en påminnelse den 1:a. Aldrig ett belopp, saldo, konto eller en räkning - bara ett tryck tillbaka in i appen. Justera eller stäng av när som helst under Profil → Loggpåminnelser.",
    turnOn: "Slå på",
    asking: "Frågar din telefon...",
    noThanks: "Nej tack",
    permissionTitle: "Aviseringar är av",
    permissionMessage:
      "BudgetArk behöver aviseringsbehörighet för att skicka påminnelser. Du kan slå på den i telefonens inställningar och sedan aktivera påminnelser under Profil → Loggpåminnelser.",
    notNow: "Inte nu",
    openSettings: "Öppna inställningar",
    failedTitle: "Kunde inte slå på påminnelser",
    failedMessage:
      "Något gick fel när inställningen sparades. Du kan försöka igen under Profil → Loggpåminnelser.",
  },
  debtDue: {
    eyebrow: "PÅMINNELSE OM SKULDBETALNING",
    summary_one: "{{count}} minimibetalning ska betalas inom {{days}} dagar",
    summary_other: "{{count}} minimibetalningar ska betalas inom {{days}} dagar",
    total: "{{amount}} minimibetalningar totalt (från fliken Skulder)",
    next: "Nästa: {{name}} · {{amount}} · {{when}}",
    today: "idag",
    tomorrow: "imorgon",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dagar",
  },
  dueDate: {
    eyebrow: "PÅMINNELSE OM FÖRFALLODAG",
    summary_one: "{{count}} räkning planerad inom {{days}} dagar",
    summary_other: "{{count}} räkningar planerade inom {{days}} dagar",
    total: "{{amount}} planerat totalt",
    next: "Nästa: {{name}} · {{amount}} · {{when}}",
    today: "idag",
    tomorrow: "imorgon",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dagar",
  },
  pace: {
    eyebrow: "UTGIFTSTAKT",
    overTitle: "{{category}} ligger {{overBy}} över gränsen på {{limit}}",
    overDetail: "Allt mer i den här kategorin den här månaden tas från planen.",
    aheadTitle: "{{category}} är {{percent}} % förbrukad och det är bara den {{dayOrdinal}}",
    aheadDetail:
      "I den här takten slutar månaden på {{projected}} mot en gräns på {{limit}} - {{expected}} hade varit i fas idag.",
    more_one: "+{{count}} kategori till ur takt: {{list}}",
    more_other: "+{{count}} kategorier till ur takt: {{list}}",
    listSeparator: ", ",
  },
};
