/**
 * BudgetArk - Svenska texter: rena hjälpfunktioner (planering)
 * File: src/i18n/locales/sv/helpersPlanning.ts
 *
 * Swedish counterpart of en/helpersPlanning.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Milestone names match the
 * Debts tab intro (Köl, Skrov, Däck, Förråd, Samla djuren, Ankare, Segel).
 */

import type { Localized } from "../types";
import type { helpersPlanning as en } from "../en/helpersPlanning";

export const helpersPlanning: Localized<typeof en> = {
  milestones: {
    steps: {
      keel: {
        title: "Köl",
        description: "Spara ihop en startbuffert så att din plan står på stabil grund.",
        nextAction: "Sätt undan din första buffert innan du satsar hårdare någon annanstans.",
      },
      hull: {
        title: "Skrov",
        description: "Betala av alla skulder utom bolånet med snöbollsmetoden.",
        nextAction:
          "Lägg din nästa extrabetalning på den första skulden i din valda återbetalningsordning.",
      },
      deck: {
        title: "Däck",
        description:
          "Spara 3 till 6 månaders levnadskostnader så att bufferten är fullt fylld.",
        nextAction: "Bygg upp reserven mot 3-6 månaders nödvändiga utgifter för stabilitet.",
      },
      supplies: {
        title: "Förråd",
        description: "Investera 15 % av hushållets inkomst till pensionen.",
        nextAction: "Öka ditt pensionssparande mot 15 % av hushållets inkomst.",
      },
      gather_animals: {
        title: "Samla djuren",
        description: "Spara till dina barns utbildning.",
        nextAction: "Öppna ett utbildningssparande för dina barn eller fortsätt sätta in.",
      },
      moorings: {
        title: "Ankare",
        description: "Betala av ditt hem i förtid med extra amorteringar.",
        nextAction: "Gör extra amorteringar på bolånet när du kan.",
      },
      sail: {
        title: "Segel",
        description: "Bygg förmögenhet och ge generöst.",
        nextAction: "Lev generöst, investera utöver pensionen och bygg bestående förmögenhet.",
      },
    },
    metric: {
      ratio: "{{current}} / {{target}}",
      ratioMonthly: "{{current}} / {{target}} /mån",
      remaining: "{{amount}} kvar",
      addEducationGoal: "Lägg till ett sparmål för utbildning att följa",
      noMortgage: "Inget bolån registrerat",
      targetMonthly: "Mål: {{amount}} /mån",
      completed: "Klart",
      notStarted: "Inte påbörjat",
    },
  },
  ark: {
    noPlan:
      "Ett målsparande sätter undan pengar varje månad så att inköpet betalas kontant - det behöver aldrig bli en skuld.",
    stepComplete:
      "Ditt steg {{step}} är klart - att sätta undan pengar till det här inköpet får inte arken ur kurs. Håll månadsbeloppet inom ditt fria kassaflöde och betala kontant.",
    steps: {
      keel: "Du bygger din köl - startbufferten. Fyll den först: utan buffert gör en enda oväntad utgift det här inköpet till ny skuld. Håll avsättningen liten, eller parkera planen tills kölen är klar.",
      hull: "Du är på steget Skrov - att betala av skulder. Ett målsparande slår finansiering, men varje krona du sätter undan här är en krona som inte minskar ett saldo. Kolla skuldavvägningen nedan och prioritera behov före önskemål.",
      deck: "Du bygger däcket - din fulla buffert på 3-6 månader. Att spara till ett inköp parallellt är okej; låt bara bufferten vara den större delen tills den är fylld.",
      supplies:
        "Du är förbi överlevnadsstegen i din ark - ett målsparande är precis rätt verktyg. Låt ditt pensionssparande på 15 % gå först, sätt undan det här från det som blir kvar och betala kontant.",
      gather_animals:
        "Din ark är på god väg - sätt undan pengarna varje månad och betala kontant så att inköpet aldrig blir en skuld. Håll utbildningssparandet i takt vid sidan av.",
      moorings:
        "Din ark är nästan färdig - ett målsparande håller inköpet borta från farten i din bolåneamortering. Sätt undan varje månad och betala kontant.",
      sail: "Du seglar - att köpa med pengar du medvetet satt undan är precis det som gör detta till en förmögenhetsvana i stället för ett bakslag.",
    },
  },
  hoursOfWork: {
    underAnHour: "under en timmes arbete",
    hours_one: "{{count}} timmes arbete",
    hours_other: "{{count}} timmars arbete",
    withWeeks_one: "{{base}} - ungefär {{count}} vecka",
    withWeeks_other: "{{base}} - ungefär {{count}} veckor",
  },
  debtOpportunity: {
    lead: "{{amount}}/mån på {{debt}} i stället",
    neverClears: "{{lead}} skulle göra att en skuld som minimibetalningen aldrig betalar av faktiskt blir betald.",
    sameMonthInterest:
      "{{lead}} skulle spara {{interest}} i ränta, även om den blir betald samma månad.",
    barelyMoves: "{{lead}} skulle knappt göra någon skillnad - den här planen kostar dig nästan inget där.",
    soonerWithInterest: "{{lead}} skulle betala av den {{months}} och spara {{interest}} i ränta.",
    sooner: "{{lead}} skulle betala av den {{months}}.",
    monthsSooner_one: "{{count}} månad tidigare",
    monthsSooner_other: "{{count}} månader tidigare",
  },
  costPerUse: {
    cents: "{{cents}} cent",
    sentence_one: "ungefär {{cost}} per användning ({{uses}}× i månaden i {{count}} år)",
    sentence_other: "ungefär {{cost}} per användning ({{uses}}× i månaden i {{count}} år)",
  },
  unsolvable: {
    capped:
      "Minimibetalningarna överstiger knappt räntan - att bli av med dessa skulle ta över {{years}} år. Lägg till en extrabetalning så att det går att lösa.",
    noMinimum:
      "{{name}} har ingen minimibetalning registrerad, så den minskar aldrig. Ange dess minimibetalning eller lägg till en extrabetalning.",
    underwater:
      "Minimibetalningen på {{minimum}} för {{name}} täcker inte räntan på ~{{interest}}/mån, så den minskar aldrig. Höj minimibetalningen eller lägg till en extrabetalning.",
    several:
      "{{names}}: deras minimibetalningar täcker inte månadsräntan, så de minskar aldrig. Höj de minimibetalningarna eller lägg till en extrabetalning.",
  },
  apy: {
    line: "{{apy}} årsränta · ~{{amount}}/år",
    gap: "Ett typiskt sparkonto med hög ränta på {{apy}} skulle ge ungefär {{amount}}/år mer",
  },
  daysSince: {
    none: "inget loggat än",
    today: "loggat idag",
    yesterday: "senaste post i går",
    daysAgo: "senaste post för {{days}} dagar sedan",
  },
  nextQuote: {
    hours: "Nästa uppdatering om {{hours}} tim",
    days: "Nästa uppdatering om {{days}} d",
  },
  rates: {
    static: "Inbyggda ungefärliga kurser - kunde inte nå kurstjänsten",
    justNow: "Kurser uppdaterade nyss",
    minutesAgo_one: "Kurser uppdaterade för {{count}} minut sedan",
    minutesAgo_other: "Kurser uppdaterade för {{count}} minuter sedan",
    hoursAgo_one: "Kurser uppdaterade för {{count}} timme sedan",
    hoursAgo_other: "Kurser uppdaterade för {{count}} timmar sedan",
    daysAgo_one: "Kurser uppdaterade för {{count}} dag sedan",
    daysAgo_other: "Kurser uppdaterade för {{count}} dagar sedan",
  },
  annualReport: {
    title: "⚓ Min BudgetArk-rapport {{year}}",
    debtPaid: "💳 Betalda skulder: {{amount}}",
    setAside: "🐖 Undansatt: {{amount}}",
    netWorth: "📈 Nettoförmögenhet: {{amount}}",
    savingsRate: "💰 Sparkvot: {{rate}} %",
    monthsUnderBudget: "🎯 Månader under budget: {{under}}/{{total}}",
    topCategory: "🏷️ Största kategori: {{category}}",
    footer: "Loggat offline med BudgetArk.",
  },
};
