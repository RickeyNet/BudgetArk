/**
 * BudgetArk - Norske tekster: rene hjelpefunksjoner (planlegging)
 * File: src/i18n/locales/nb/helpersPlanning.ts
 *
 * Norwegian (Bokmål) counterpart of en/helpersPlanning.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Milestone
 * names match the Debts tab intro (Kjøl, Skrog, Dekk, Forsyninger, Samle
 * dyrene, Anker, Seil).
 */

import type { Localized } from "../types";
import type { helpersPlanning as en } from "../en/helpersPlanning";

export const helpersPlanning: Localized<typeof en> = {
  milestones: {
    steps: {
      keel: {
        title: "Kjøl",
        description: "Spar opp en startbuffer så planen din står på stabil grunn.",
        nextAction: "Sett av det første buffermålet ditt før du satser hardere andre steder.",
      },
      hull: {
        title: "Skrog",
        description: "Betal ned all gjeld unntatt boliglånet med snøballmetoden.",
        nextAction:
          "Bruk neste ekstrabetaling på den første gjeldsposten i nedbetalingsrekkefølgen du har valgt.",
      },
      deck: {
        title: "Dekk",
        description:
          "Spar 3 til 6 måneders levekostnader så bufferen er fullt finansiert.",
        nextAction: "Bygg opp reservene mot 3-6 måneders nødvendige utgifter for stabilitet.",
      },
      supplies: {
        title: "Forsyninger",
        description: "Invester 15 % av husholdningens inntekt til pensjon.",
        nextAction: "Øk pensjonssparingen mot 15 % av husholdningens inntekt.",
      },
      gather_animals: {
        title: "Samle dyrene",
        description: "Spar til barnas utdanning.",
        nextAction: "Åpne en utdanningssparing for barna, eller fortsett å sette inn på den.",
      },
      moorings: {
        title: "Anker",
        description: "Betal ned boligen før tid med ekstra avdrag.",
        nextAction: "Betal ekstra avdrag på boliglånet når du kan.",
      },
      sail: {
        title: "Seil",
        description: "Bygg formue og gi raust.",
        nextAction: "Lev raust, invester utover pensjonen og bygg varig formue.",
      },
    },
    metric: {
      ratio: "{{current}} / {{target}}",
      ratioMonthly: "{{current}} / {{target}} /mnd",
      remaining: "{{amount}} igjen",
      addEducationGoal: "Legg til et sparemål for utdanning å følge",
      noMortgage: "Ingen boliglån registrert",
      targetMonthly: "Mål: {{amount}} /mnd",
      completed: "Fullført",
      notStarted: "Ikke påbegynt",
    },
  },
  ark: {
    noPlan:
      "Målsparing setter av penger hver måned så kjøpet betales kontant - det trenger aldri å bli gjeld.",
    stepComplete:
      "Steget {{step}} er fullført - å sette av penger til dette kjøpet får ikke arken ut av kurs. Hold månedsbeløpet innenfor den frie kontantstrømmen din og betal kontant.",
    steps: {
      keel: "Du bygger kjølen din - startbufferen. Fyll den først: uten buffer gjør én uventet utgift dette kjøpet til ny gjeld. Hold avsetningen liten, eller parker planen til kjølen er ferdig.",
      hull: "Du er på steget Skrog - nedbetaling av gjeld. Målsparing slår finansiering, men hver krone du setter av her er en krone som ikke reduserer en saldo. Sjekk gjeldsavveiningen nedenfor og prioriter behov foran ønsker.",
      deck: "Du bygger dekket - den fulle bufferen på 3-6 måneder. Å spare til et kjøp ved siden av er greit; bare la bufferen være den største delen til den er fylt opp.",
      supplies:
        "Du er forbi overlevelsesstegene i arken din - målsparing er akkurat riktig verktøy. La pensjonssparingen på 15 % gå først, sett av dette fra det som er igjen, og betal kontant.",
      gather_animals:
        "Arken din er godt i gang - sett av pengene månedlig og betal kontant så dette kjøpet aldri blir gjeld. Hold utdanningssparingen i rute ved siden av.",
      moorings:
        "Arken din er nesten ferdig - målsparing holder dette kjøpet unna fremdriften i nedbetalingen av boliglånet. Sett av månedlig og betal kontant.",
      sail: "Du seiler - å kjøpe med penger du har satt av med hensikt er nøyaktig det som gjør dette til en formuesvane i stedet for et tilbakeslag.",
    },
  },
  hoursOfWork: {
    underAnHour: "under en times arbeid",
    hours_one: "{{count}} times arbeid",
    hours_other: "{{count}} timers arbeid",
    withWeeks_one: "{{base}} - omtrent {{count}} uke",
    withWeeks_other: "{{base}} - omtrent {{count}} uker",
  },
  debtOpportunity: {
    lead: "{{amount}}/mnd på {{debt}} i stedet",
    neverClears: "{{lead}} ville gjøre at en gjeldspost minstebetalingen aldri får nedbetalt, faktisk blir nedbetalt.",
    sameMonthInterest:
      "{{lead}} ville spare {{interest}} i rente, selv om den blir nedbetalt samme måned.",
    barelyMoves: "{{lead}} ville knapt gjøre en forskjell - denne planen koster deg nesten ingenting der.",
    soonerWithInterest: "{{lead}} ville nedbetale den {{months}} og spare {{interest}} i rente.",
    sooner: "{{lead}} ville nedbetale den {{months}}.",
    monthsSooner_one: "{{count}} måned tidligere",
    monthsSooner_other: "{{count}} måneder tidligere",
  },
  costPerUse: {
    cents: "{{cents}} cent",
    sentence_one: "omtrent {{cost}} per bruk ({{uses}}× i måneden i {{count}} år)",
    sentence_other: "omtrent {{cost}} per bruk ({{uses}}× i måneden i {{count}} år)",
  },
  unsolvable: {
    capped:
      "Minstebetalingene er knapt større enn renten - å bli kvitt disse ville ta over {{years}} år. Legg til en ekstrabetaling så det går opp.",
    noMinimum:
      "{{name}} har ingen minstebetaling registrert, så den krymper aldri. Angi minstebetalingen eller legg til en ekstrabetaling.",
    underwater:
      "Minstebetalingen på {{minimum}} for {{name}} dekker ikke renten på ~{{interest}}/mnd, så den krymper aldri. Øk minstebetalingen eller legg til en ekstrabetaling.",
    several:
      "{{names}}: minstebetalingene deres dekker ikke månedsrenten, så de krymper aldri. Øk disse minstebetalingene eller legg til en ekstrabetaling.",
  },
  apy: {
    line: "{{apy}} årlig rente · ~{{amount}}/år",
    gap: "En typisk høyrentekonto på {{apy}} ville gitt omtrent {{amount}}/år mer",
  },
  daysSince: {
    none: "ingenting logget enda",
    today: "logget i dag",
    yesterday: "siste post i går",
    daysAgo: "siste post for {{days}} dager siden",
  },
  nextQuote: {
    hours: "Neste oppdatering om {{hours}} t",
    days: "Neste oppdatering om {{days}} d",
  },
  rates: {
    static: "Innebygde omtrentlige kurser - fikk ikke kontakt med kurstjenesten",
    justNow: "Kurser oppdatert akkurat nå",
    minutesAgo_one: "Kurser oppdatert for {{count}} minutt siden",
    minutesAgo_other: "Kurser oppdatert for {{count}} minutter siden",
    hoursAgo_one: "Kurser oppdatert for {{count}} time siden",
    hoursAgo_other: "Kurser oppdatert for {{count}} timer siden",
    daysAgo_one: "Kurser oppdatert for {{count}} dag siden",
    daysAgo_other: "Kurser oppdatert for {{count}} dager siden",
  },
  annualReport: {
    title: "⚓ Min BudgetArk-rapport {{year}}",
    debtPaid: "💳 Gjeld nedbetalt: {{amount}}",
    setAside: "🐖 Satt av: {{amount}}",
    netWorth: "📈 Nettoformue: {{amount}}",
    savingsRate: "💰 Sparerate: {{rate}} %",
    monthsUnderBudget: "🎯 Måneder under budsjett: {{under}}/{{total}}",
    topCategory: "🏷️ Største kategori: {{category}}",
    footer: "Logget offline med BudgetArk.",
  },
};
