/**
 * BudgetArk - Norske tekster: Sjøkart-fanen (planning)
 * File: src/i18n/locales/nb/chartsPlanning.ts
 *
 * Norwegian (Bokmål) counterpart of en/chartsPlanning.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 * Amortization terms follow Norwegian bank usage: avdrag (principal
 * portion), rente, restgjeld.
 */

import type { Localized } from "../types";
import type { chartsPlanning as en } from "../en/chartsPlanning";

export const chartsPlanning: Localized<typeof en> = {
  plannerCard: {
    title: "Planlegg et kjøp",
    hint: "Målsparing som passer inn med milepælene på arken din",
    yourPlans: "Planene dine",
    yourPlansHint: "Trykk på en plan for å legge til penger. Planene ligger på Broen og telles med i nettoformuen.",
    newPlan: "+ Planlegg et nytt kjøp",
    form: {
      what: "Hva sparer du til?",
      namePlaceholder: "f.eks. Ny laptop",
      price: "Pris",
      alreadySaved: "Allerede spart",
      zeroPlaceholder: "0",
    },
    categories: {
      car: "Bil",
      home: "Hjem",
      travel: "Reise",
      education: "Utdanning",
      other: "Annet",
      emergency_fund: "Buffer",
    },
    setAside: {
      label: "Sett av hver måned",
    },
    needBy: {
      label: "Trenger det innen",
      none: "Ingen dato - når det er fullfinansiert",
      pickerTitle: "Trenger det innen",
      required: "Den datoen krever {{required}}/mnd.",
      requiredShort: "Den datoen krever {{required}}/mnd - dine nåværende {{monthly}}/mnd rekker ikke i tide.",
    },
    timeline: {
      today: "Du kunne kjøpt dette i dag",
      ready: "Klart {{date}} ({{duration}})",
      pickAmount: "Velg et månedlig beløp for å se en dato",
    },
    fit: {
      fits: "Passer godt: omtrent {{amount}}/mnd blir til overs etter gjennomsnittsforbruket ditt, og dette bruker halvparten eller mindre.",
      tight: "Trangt: dette tar det meste av de ~{{amount}}/mnd som blir til overs etter gjennomsnittsforbruket ditt. Mulig, men lite rom for overraskelser.",
      over: "Over budsjett: dette er mer enn de ~{{amount}}/mnd som blir til overs etter gjennomsnittsforbruket ditt - det VIL gå på bekostning av annet forbruk eller andre mål. Prøv et lavere beløp eller en senere dato.",
      overNoFreeCash:
        "Gjennomsnittsforbruket ditt er allerede like stort som eller større enn inntekten din, så alt du setter av vil gå på bekostning av eksisterende forbruk eller mål. Vurder å kutte i en kategori først (Hva om-verktøyet over kan hjelpe).",
      trackFirst:
        "Logg noen måneder med inntekter og utgifter i Budsjett-fanen, så kan dette verktøyet sjekke tempoet mot den faktiske kontantstrømmen din.",
    },
    cost: {
      title: "Hva det egentlig koster",
      perUse: "Det blir {{description}}.",
      perUseHint: "Hvor ofte kommer du til å bruke det? Dra opp fra null for å se prisen per bruk - en god test for ønsker-kolonnen.",
      usesLabel: "Ganger du bruker det per måned",
      notTracked: "ikke angitt",
      usesValue: "{{count}}x",
      years_one: "{{count}} år",
      years_other: "{{count}} år",
    },
    hours: {
      title: "Arbeidstimer",
      line: "{{price}} er {{hours}} med {{rate}}/t netto.",
      lineFromIncome: "{{price}} er {{hours}} med {{rate}}/t netto (fra gjennomsnittsinntekten din på {{income}}/mnd).",
      hint: "Logg inntekten din i Budsjett-fanen, eller skriv inn nettolønnen din per time nedenfor, for å se prisen i arbeidstimer.",
      perWeekLabel: "Timer du jobber per uke",
      perWeekValue: "{{count}} t",
      overrideLabelWithIncome: "Eller skriv inn nettolønnen din per time (la stå tomt for å bruke inntekten din)",
      overrideLabel: "Nettolønnen din per time",
      overridePlaceholder: "f.eks. 28,50",
    },
    finance: {
      title: "Finansiere eller spare opp?",
      aprLabel: "Effektiv rente hvis du finansierer",
      aprValue: "{{rate}} %",
      termChip: "{{count}} mnd",
      summary:
        "Finansiering av {{amount}} til {{rate}} % over {{months}} måneder: {{payment}}/mnd, {{interest}} i rente ({{total}} totalt).",
      alreadyHave: "Du har allerede pengene - sparing vinner klart.",
      savingWins: "Sparer du i stedet, har du det {{date}}, {{later}} senere, og beholder {{interest}}{{perMonthClause}}.",
      perMonthClause: " - omtrent {{amount}} for hver måned med venting lånet ville hoppet over",
      extraClause: " Lånebetalingen er dessuten {{amount}}/mnd mer enn det du setter av, i {{months}} måneder.",
      pickAmount: "Velg et månedlig beløp over for å veie ventetiden mot renten.",
      arkWarning: "Et nytt lån mens du er på trinnet {{step}} flytter arken din bakover - den renten er penger trinnet trenger.",
      nothingToFinance: "Ingenting å finansiere - det du allerede har spart dekker det.",
    },
    ark: {
      title: "Arken din: trinnet {{step}}",
      sinkingFund: "Tenk målsparing",
      tradeoff: "Avveining: {{amount}}/mnd til gjelden din i stedet ville gjort deg gjeldfri {{sooner}} tidligere{{interestClause}}.",
      interestClause: " og spart {{amount}} i rente",
    },
    errors: {
      start: "Kunne ikke starte denne sparingen. Prøv igjen.",
    },
    buttons: {
      start: "Start denne sparingen",
    },
  },
  loan: {
    title: "Låne-/boliglånskalkulator",
    hint: "Se den månedlige betalingen din og total rente",
    sliders: {
      loanAmount: "Lånebeløp",
      loanRate: "Rente (effektiv)",
      loanTerm: "Løpetid",
      rateValue: "{{value}} %",
      termValue: "{{value}} år",
      preset: "{{count}} år",
    },
    result: {
      label: "MÅNEDLIG BETALING",
      sub_one: "{{amount}} lån · {{rate}} % rente · {{count}} år",
      sub_other: "{{amount}} lån · {{rate}} % rente · {{count}} år",
    },
    breakdown: {
      title: "Kostnadsfordeling",
      principal: "Lånebeløp",
      totalInterest: "Total rente",
      totalPaid_one: "Du betaler totalt {{total}} over {{count}} år",
      totalPaid_other: "Du betaler totalt {{total}} over {{count}} år",
    },
    firstFive: {
      label: "RENTE DE FØRSTE 5 ÅRENE",
      share: "{{percent}} % av den totale renten din betales i de første 60 månedene.",
      shortLoan: "Lånet er ferdig før år 5, så dette viser rentekostnaden for hele løpetiden.",
      principal: "Avdrag i perioden: {{amount}}",
    },
    yearly: {
      title: "Årsoversikt",
      hint: "Grupperer 12 og 12 betalinger fra lånestart. Siste år kan bli kortere.",
      meta: "{{count}} år",
      columns: {
        year: "År",
        payments: "Betalinger",
        principal: "Avdrag",
        interest: "Rente",
        endBalance: "Restgjeld",
      },
    },
    schedule: {
      title: "Nedbetalingsplan",
      hint: "Betaling, avdrag, rente og restgjeld måned for måned.",
      meta: "{{count}} mnd",
      columns: {
        month: "Måned",
        payment: "Betaling",
        principal: "Avdrag",
        interest: "Rente",
        balance: "Restgjeld",
      },
      showing: "Viser {{visible}} av {{total}} måneder",
      exportCsv: "Eksporter CSV",
      preparing: "Forbereder CSV...",
      showMore: "Vis {{count}} til",
      showLess: "Vis færre",
      exportDialogTitle: "Eksporter nedbetalingsplan",
      exportSuccess: "CSV-eksporten er åpnet. Lagre eller del den fra delingsmenyen.",
      exportFailed: "Eksporten av nedbetalingsplanen mislyktes.",
    },
  },
};
