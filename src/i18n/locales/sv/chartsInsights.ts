/**
 * BudgetArk - Svenska texter: Sjökort-fliken (insights)
 * File: src/i18n/locales/sv/chartsInsights.ts
 *
 * Swedish counterpart of en/chartsInsights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { chartsInsights as en } from "../en/chartsInsights";

export const chartsInsights: Localized<typeof en> = {
  whatIf: {
    title: "Tänk om jag slutade lägga pengar på…",
    hint: "Styr om en kategori till skulder eller sparande",
    empty:
      "Logga några månaders utgifter i Budget-fliken och kom sedan tillbaka för att se vad det skulle ge att styra om en kategori.",
    pickCategory: "Välj en kategori",
    averagesHint: "Månadssnitt från dina poster de senaste {{months}} månaderna",
    perMonth: "{{amount}}/mån",
    sliderLabel: "Månadsbelopp att styra om",
    youAverage: "Du lägger i snitt {{amount}}/mån på {{category}}",
    towardDebt: "Lägg det på skulderna",
    methods: {
      avalanche: "Lavin",
      snowball: "Snöboll",
    },
    currentPlan: "Nuvarande plan",
    redirecting: "Med omstyrning",
    months: {
      notSolvable: "Går inte ihop",
      zero: "0 månader",
      mo: "{{count}} mån",
      yr: "{{count}} år",
      yrMo: "{{years}} år {{months}} mån",
    },
    unpayableFixed: "Den här extrabetalningen gör en obetalbar plan till ett riktigt slutdatum.",
    stillUnpayable: "Minimibetalningarna plus det här extra täcker fortfarande inte räntan - prova ett större belopp.",
    sooner: "Skuldfri {{duration}} tidigare",
    savesInterest: " · sparar {{amount}} i ränta",
    growSavingsOr: "…eller låt det växa i sparande",
    growSavings: "Låt det växa i sparande",
    noDebts: "Inga aktiva skulder att betala av - visar bara spartillväxt.",
    inYears_one: "Om {{count}} år",
    inYears_other: "Om {{count}} år",
    fromReturns: "+{{amount}} från avkastning",
    assumesReturn: "Antar {{rate}} % genomsnittlig årsavkastning med månadsvis ränta på ränta.",
    note: "Det här är uppskattningar, inte garantier - utgifter går sällan ner till noll, och marknadens avkastning varierar. Även att styra om halva kategorin kan flytta din tidslinje rejält.",
  },
  subscriptions: {
    title: "Prenumerationsdetektiven",
    hintCount: "{{count}} utan registrerad räkning · ~{{amount}}/år",
    hintIdle: "Hitta återkommande dragningar utan registrerad räkning",
    noBankHistory:
      "Prenumerationer hittas bland bankimporterade utgifter. Koppla en bank under Profil → Kopplingar och godkänn några månaders dragningar, kom sedan tillbaka.",
    nothingHiding:
      "Inget gömmer sig just nu: varje återkommande dragning har redan en återkommande räkning, eller så har du markerat den som inte en prenumeration.",
    resultLabel: "UTAN REGISTRERAD RÄKNING",
    perYear: "{{amount}}/år",
    summary_one:
      "ungefär {{monthly}} i månaden för {{count}} prenumeration. Gör den till en räkning så räknar budgeten med den varje {{cadence}} - eller dölj dem som inte är prenumerationer.",
    summary_other:
      "ungefär {{monthly}} i månaden för {{count}} prenumerationer. Gör var och en till en räkning så räknar budgeten med dem varje {{cadence}} - eller dölj dem som inte är prenumerationer.",
    cadenceWord: {
      month: "månad",
      year: "år",
      mixed: "månad eller år",
    },
    cadence: {
      monthly: "månadsvis",
      yearly: "årsvis",
    },
    rowMeta: "{{amount}} {{cadence}} · {{charges}} · {{category}}",
    charges_one: "{{count}} dragning",
    charges_other: "{{count}} dragningar",
    makeBill: "Gör till räkning",
    saving: "Sparar...",
    notSubscription: "Inte en prenumeration",
    a11yMakeBill: "Gör {{merchant}} till en återkommande räkning",
    a11yNotSubscription: "{{merchant}} är inte en prenumeration",
    errors: {
      createBill: "Kunde inte skapa den återkommande räkningen.",
      hideMerchant: "Kunde inte dölja den handlaren.",
    },
  },
  exchange: {
    title: "Valutaväxling",
    hint: "Omvandla ett belopp mellan valutor",
    resultLabel: "OMVANDLAT VÄRDE",
    amount: "Belopp",
    amountPlaceholder: "Belopp att omvandla",
    from: "Från",
    to: "Till",
    swap: "⇅ Byt",
    refresh: "↻ Uppdatera kurser",
    refreshing: "Uppdaterar…",
    loadFailed: "Kunde inte läsa in kurser - tryck på Uppdatera för att försöka igen.",
    refreshFailed: "Kunde inte uppdatera kurserna - visar de senast sparade kurserna.",
    privacyNote:
      "Kurserna kommer från en kostnadsfri offentlig växelkurstjänst och uppdateras normalt en gång om dagen. Bara förfrågan om dagens kurstabell lämnar din telefon - aldrig dina belopp.",
  },
  inflation: {
    title: "Personlig inflation",
    hintRates: "Dina priser {{rate}} mot {{headline}} officiellt",
    hintIdle: "Dina egna priser år för år mot officiell KPI",
    insufficient_one:
      "Det här kräver minst {{min}} loggade månader under vart och ett av de senaste två åren, i kategorier du haft utgifter i båda åren. Hittills: {{count}} månad de senaste {{window}}, {{prior}} under de {{window}} före. Fortsätt logga så fylls det i.",
    insufficient_other:
      "Det här kräver minst {{min}} loggade månader under vart och ett av de senaste två åren, i kategorier du haft utgifter i båda åren. Hittills: {{count}} månader de senaste {{window}}, {{prior}} under de {{window}} före. Fortsätt logga så fylls det i.",
    resultLabel: "DIN INFLATIONSTAKT",
    above: "Ligger över den officiella på {{headline}}",
    below: "Ligger under den officiella på {{headline}}",
    inLine: "I linje med den officiella på {{headline}}",
    basket_one: "{{prior}}/mån → {{current}}/mån i samma {{count}} kategori",
    basket_other: "{{prior}}/mån → {{current}}/mån i samma {{count}} kategorier",
    byCategory: "Per kategori",
    averageHint:
      "Snitt per loggad månad: senaste {{window}} månaderna ({{current}} loggade) mot de {{window}} före ({{prior}} loggade)",
    rowMeta: "{{prior}} → {{current}}/mån",
    newSpending:
      "Plus {{amount}}/mån i kategorier du inte hade förra året - nya utgifter, inte inflation, så de räknas inte in i takten.",
    note: "Officiell siffra: {{label}}, per {{asOf}}, medföljer appen - inget hämtas. Din takt blandar prisförändringar med hur mycket du köpt, så en kategori som stuckit i väg kan lika gärna vara en vaneförändring som en prishöjning. Skuldbetalningar och sparande är överföringar, inte priser, och lämnas utanför.",
  },
};
