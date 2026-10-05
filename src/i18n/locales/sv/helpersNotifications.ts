/**
 * BudgetArk - Svenska texter: rena hjälpfunktioner (notifications)
 * File: src/i18n/locales/sv/helpersNotifications.ts
 *
 * Swedish counterpart of en/helpersNotifications.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Security rule 11 applies here exactly as in English: lock-screen copy
 * stays free of amounts, account or card names, balances and counts.
 */

import type { Localized } from "../types";
import type { helpersNotifications as en } from "../en/helpersNotifications";

export const helpersNotifications: Localized<typeof en> = {
  tracking: {
    channel: {
      name: "Utgiftsavstämningar",
      description: "Vänliga påminnelser om att fortsätta logga dina utgifter",
    },
    checkIn: {
      quick: {
        title: "Dags för en snabb avstämning",
        body: "Har du en minut? Logga dina senaste utgifter medan de är färska.",
      },
      onCourse: {
        title: "Håll din ark på rätt kurs",
        body: "Skriv ner eventuella utgifter från de senaste dagarna.",
      },
      expense: {
        title: "Snabb utgiftsavstämning",
        body: "Några utgifter att logga? Det tar bara en stund.",
      },
      tidyLedger: {
        title: "En prydlig loggbok bygger en stadig ark",
        body: "Lägg till dina senaste utgifter så att din budget stämmer.",
      },
      drift: {
        title: "Låt inte utgifterna driva förbi",
        body: "Ta 30 sekunder och logga allt du spenderat.",
      },
    },
    monthStart: {
      newMonth: {
        title: "En ny månad börjar",
        body: "Sätt månadens budgetmål och se hur förra månaden gick.",
      },
      chartCourse: {
        title: "Sätt kursen för månaden",
        body: "Titta tillbaka på förra månadens utgifter och sätt dina mål för månaden framöver.",
      },
      freshStart: {
        title: "Ny månad, ny start",
        body: "Ta några minuter för att planera månadens budget och kolla förra månadens översikt.",
      },
    },
  },
  keepAlive: {
    channel: {
      name: "Kortaktivitetspåminnelser",
      description:
        "Vänliga påminnelser om att använda ett bevakat kreditkort innan utgivaren stänger det på grund av inaktivitet",
    },
    messages: {
      activity: {
        title: "Ett kort skulle behöva lite aktivitet",
        body: "Ett av dina kreditkort har inte använts på ett tag. Ett litet köp håller det aktivt.",
      },
      afloat: {
        title: "Håll din kredit flytande",
        body: "Ett oanvänt kort kan stängas av utgivaren. Öppna BudgetArk för att se vilket som behöver ett snabbt köp.",
      },
      quickCheck: {
        title: "Snabb kortkoll",
        body: "Ett kort du bevakar närmar sig sin inaktivitetsgräns. Ett köp i kaffestorlek nollställer klockan.",
      },
    },
  },
};
