/**
 * BudgetArk - Svenska texter: Sjökort-fliken (planning)
 * File: src/i18n/locales/sv/chartsPlanning.ts
 *
 * Swedish counterpart of en/chartsPlanning.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Amortization terms follow
 * Swedish bank usage: amortering (principal portion), ränta, restskuld.
 */

import type { Localized } from "../types";
import type { chartsPlanning as en } from "../en/chartsPlanning";

export const chartsPlanning: Localized<typeof en> = {
  plannerCard: {
    title: "Planera ett inköp",
    hint: "Målsparande som passar ihop med Arkens milstolpar",
    yourPlans: "Dina planer",
    yourPlansHint: "Tryck på en plan för att lägga till pengar. Planerna finns på Bryggan och räknas in i nettoförmögenheten.",
    newPlan: "+ Planera ett nytt inköp",
    form: {
      what: "Vad sparar du till?",
      namePlaceholder: "t.ex. Ny laptop",
      price: "Pris",
      alreadySaved: "Redan sparat",
      zeroPlaceholder: "0",
    },
    categories: {
      car: "Bil",
      home: "Hem",
      travel: "Resor",
      education: "Utbildning",
      other: "Övrigt",
      emergency_fund: "Buffert",
    },
    setAside: {
      label: "Sätt undan varje månad",
    },
    needBy: {
      label: "Behövs senast",
      none: "Inget datum - när det är fullfinansierat",
      pickerTitle: "Behövs senast",
      required: "Det datumet kräver {{required}}/mån.",
      requiredShort: "Det datumet kräver {{required}}/mån - dina nuvarande {{monthly}}/mån hinner inte i tid.",
    },
    timeline: {
      today: "Du skulle kunna köpa det idag",
      ready: "Klart {{date}} ({{duration}})",
      pickAmount: "Välj ett månadsbelopp för att se ett datum",
    },
    fit: {
      fits: "Ryms bra: ungefär {{amount}}/mån blir över efter dina genomsnittliga utgifter, och det här tar hälften eller mindre.",
      tight: "Snävt: det här tar det mesta av de ~{{amount}}/mån som blir över efter dina genomsnittliga utgifter. Görbart, men litet utrymme för överraskningar.",
      over: "Över budget: det här är mer än de ~{{amount}}/mån som blir över efter dina genomsnittliga utgifter - det KOMMER att äta av andra utgifter eller mål. Prova ett lägre belopp eller ett senare datum.",
      overNoFreeCash:
        "Dina genomsnittliga utgifter är redan lika stora som eller större än din inkomst, så allt du sätter undan tas från befintliga utgifter eller mål. Överväg att skära ner en kategori först (Tänk om-verktyget ovan kan hjälpa).",
      trackFirst:
        "Logga några månaders inkomster och utgifter i Budget-fliken, så kan det här verktyget stämma av takten mot ditt verkliga kassaflöde.",
    },
    cost: {
      title: "Vad det egentligen kostar",
      perUse: "Det blir {{description}}.",
      perUseHint: "Hur ofta kommer du att använda det? Dra upp från noll för att se priset per användning - ett bra test för önskemålskolumnen.",
      usesLabel: "Antal användningar per månad",
      notTracked: "inte angivet",
      usesValue: "{{count}}x",
      years_one: "{{count}} år",
      years_other: "{{count}} år",
    },
    hours: {
      title: "Arbetstimmar",
      line: "{{price}} är {{hours}} vid {{rate}}/tim netto.",
      lineFromIncome: "{{price}} är {{hours}} vid {{rate}}/tim netto (från din genomsnittliga inkomst på {{income}}/mån).",
      hint: "Logga din inkomst i Budget-fliken, eller skriv in din nettolön per timme nedan, för att se priset i arbetstimmar.",
      perWeekLabel: "Timmar du jobbar per vecka",
      perWeekValue: "{{count}} tim",
      overrideLabelWithIncome: "Eller skriv in din nettolön per timme (lämna tomt för att använda din inkomst)",
      overrideLabel: "Din nettolön per timme",
      overridePlaceholder: "t.ex. 28,50",
    },
    finance: {
      title: "Finansiera eller spara ihop?",
      aprLabel: "Effektiv ränta om du finansierar",
      aprValue: "{{rate}} %",
      termChip: "{{count}} mån",
      summary:
        "Finansiering av {{amount}} till {{rate}} % under {{months}} månader: {{payment}}/mån, {{interest}} i ränta ({{total}} totalt).",
      alreadyHave: "Du har redan pengarna - att spara vinner klart.",
      savingWins: "Sparar du i stället har du det {{date}}, {{later}} senare, och behåller {{interest}}{{perMonthClause}}.",
      perMonthClause: " - ungefär {{amount}} för varje månads väntan som lånet skulle hoppa över",
      extraClause: " Lånebetalningen är dessutom {{amount}}/mån mer än det du sätter undan, i {{months}} månader.",
      pickAmount: "Välj ett månadsbelopp ovan för att väga väntetiden mot räntan.",
      arkWarning: "Ett nytt lån medan du är på steget {{step}} för din ark bakåt - den räntan är pengar som steget behöver.",
      nothingToFinance: "Inget att finansiera - det du redan sparat täcker det.",
    },
    ark: {
      title: "Din ark: steget {{step}}",
      sinkingFund: "Tänk målsparande",
      tradeoff: "Avvägning: {{amount}}/mån till dina skulder i stället skulle göra dig skuldfri {{sooner}} tidigare{{interestClause}}.",
      interestClause: " och spara {{amount}} i ränta",
    },
    errors: {
      start: "Kunde inte starta sparandet. Försök igen.",
    },
    buttons: {
      start: "Starta sparandet",
    },
  },
  loan: {
    title: "Låne-/bolånekalkylator",
    hint: "Se din månadsbetalning och den totala räntan",
    sliders: {
      loanAmount: "Lånebelopp",
      loanRate: "Ränta (effektiv)",
      loanTerm: "Löptid",
      rateValue: "{{value}} %",
      termValue: "{{value}} år",
      preset: "{{count}} år",
    },
    result: {
      label: "MÅNADSBETALNING",
      sub_one: "{{amount}} lån · {{rate}} % ränta · {{count}} år",
      sub_other: "{{amount}} lån · {{rate}} % ränta · {{count}} år",
    },
    breakdown: {
      title: "Kostnadsfördelning",
      principal: "Lånebelopp",
      totalInterest: "Total ränta",
      totalPaid_one: "Du betalar totalt {{total}} under {{count}} år",
      totalPaid_other: "Du betalar totalt {{total}} under {{count}} år",
    },
    firstFive: {
      label: "RÄNTA DE FÖRSTA 5 ÅREN",
      share: "{{percent}} % av din totala ränta betalas under de första 60 månaderna.",
      shortLoan: "Lånet tar slut före år 5, så detta visar räntekostnaden för hela löptiden.",
      principal: "Amorterat under perioden: {{amount}}",
    },
    yearly: {
      title: "Årsöversikt",
      hint: "Grupperar var 12:e betalning från lånestarten. Sista året kan bli kortare.",
      meta: "{{count}} år",
      columns: {
        year: "År",
        payments: "Betalningar",
        principal: "Amortering",
        interest: "Ränta",
        endBalance: "Restskuld",
      },
    },
    schedule: {
      title: "Amorteringsplan",
      hint: "Betalning, amortering, ränta och restskuld månad för månad.",
      meta: "{{count}} mån",
      columns: {
        month: "Månad",
        payment: "Betalning",
        principal: "Amortering",
        interest: "Ränta",
        balance: "Restskuld",
      },
      showing: "Visar {{visible}} av {{total}} månader",
      exportCsv: "Exportera CSV",
      preparing: "Förbereder CSV...",
      showMore: "Visa {{count}} fler",
      showLess: "Visa färre",
      exportDialogTitle: "Exportera amorteringsplan",
      exportSuccess: "CSV-exporten är öppnad. Spara eller dela den från delningsmenyn.",
      exportFailed: "Exporten av amorteringsplanen misslyckades.",
    },
  },
};
