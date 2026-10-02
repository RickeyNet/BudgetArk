/**
 * BudgetArk - Svenska texter: Budget-fliken (entry)
 * File: src/i18n/locales/sv/budgetEntry.ts
 *
 * Swedish counterpart of en/budgetEntry.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. W-2 / 1099 / 401(k) are
 * US tax terms with no Swedish equivalent and stay as-is.
 */

import type { Localized } from "../types";
import type { budgetEntry as en } from "../en/budgetEntry";

export const budgetEntry: Localized<typeof en> = {
  add: {
    title: "Lägg till budgetpost",
    subtitle: "Följ inkomster och utgifter per kategori.",
    submit_one: "Lägg till post",
    submit_other: "Lägg till {{count}} poster",
    saveAndAnother: "Spara + ny",
    saveAndAnotherA11y: "Spara och lägg till en post till",
  },
  edit: {
    title: "Redigera post",
    subtitle: "Uppdatera eller ta bort den här budgetposten.",
    loading: "Läser in...",
  },
  type: {
    label: "TYP AV POST",
    expense: "Utgift",
    income: "Inkomst",
  },
  incomeType: {
    label: "TYP AV INKOMST",
    hint: "W-2 följer din nettolön och 401(k). 1099 visar hur mycket av varje betalning du bör sätta undan till skatt.",
    options: {
      regular: "Vanlig",
      w2: "W-2-lön",
      "1099": "1099 / uppdragstagare",
    },
  },
  retirement: {
    label: "401(K) DENNA LÖN (VALFRITT)",
    hintEdit:
      "Beloppet nedan är din nettolön. Om en del av lönen gick till 401(k), ange det här - det följs separat och räknas inte som inkomst.",
    hintAdd:
      "Ange din nettolön som belopp nedan. Om en del av lönen gick till 401(k), ange det här - det följs separat och räknas inte som inkomst.",
    firstLineNote: "401(k)-beloppet kopplas till den första posten.",
  },
  taxSetAside: {
    label: "PROCENT ATT SÄTTA UNDAN TILL SKATT",
    hint: "Inget dras från 1099-inkomst, så sätt undan en del till skatten vid årets slut. 25-30 % är en vanlig utgångspunkt.",
    preview: "Sätt undan {{amount}} av detta till skatt.",
  },
  category: {
    label: "KATEGORI",
  },
  amount: {
    label: "BELOPP",
    placeholder: "0,00",
    descriptionLabel: "BESKRIVNING (VALFRITT)",
    descriptionPlaceholder: "t.ex. Matinköp, Netflix osv.",
    descriptionLinePlaceholder: "Beskrivning (valfritt)",
  },
  estimate: {
    hint: "Dina senaste {{count}} faktiska dragningar låg i snitt på {{average}}. Uppskattningen ändras bara om du trycker.",
    use: "Använd {{average}}",
    useA11y: "Uppdatera uppskattningen till {{average}}",
  },
  lines: {
    label: "POSTER",
    addA11y: "Lägg till en postrad till",
    hint: "Lägg till flera belopp för samma kategori (t.ex. flera matinköp från ett kontoutdrag).",
    lineTitle: "Post {{index}}",
    singleTitle: "Belopp",
    removeA11y: "Ta bort post {{index}}",
    photosFirstLine: "Foton kopplas till den första posten.",
  },
  suggestions: {
    useA11y: "Använd {{description}}",
    useInCategoryA11y: "Använd {{description}} i {{category}}",
  },
  date: {
    monthLabel: "MÅNAD",
    startMonthLabel: "STARTMÅNAD",
    dayLabel: "DAG",
    today: "Idag",
    todayA11y: "Sätt datumet till idag",
  },
  bill: {
    label: "GÄLLER RÄKNINGEN",
    option: "{{name}} · ca {{amount}}",
    none: "Ingen",
    hint: "Det här är den faktiska dragningen för en av månadens återkommande räkningar. Välj den så kliver räkningens uppskattning åt sidan för månaden, så att inget räknas dubbelt.",
  },
  recurring: {
    label: "Återkommande",
    hint: "Den här posten upprepas från startmånaden och framåt med den frekvens du väljer nedan.",
    frequencyLabel: "FREKVENS",
    frequency: {
      monthly: "Varje månad",
      quarterly: "Varje kvartal",
      semiannual: "Var 6:e månad",
      yearly: "Varje år",
    },
    payUrlLabel: "BETALLÄNK (VALFRITT)",
    payUrlHint: "Länk till betalsidan för den här räkningen. https:// läggs till om du utelämnar det.",
    payUrlPlaceholder: "t.ex. minrakning.example.com/pay",
    dayOfMonthLabel: "DAG I MÅNADEN",
    dayOfMonthHint: "Dagen då räkningen dras. Dag 29-31 faller tillbaka på sista dagen i kortare månader.",
  },
  privacy: {
    label: "🔒 Privat",
    hint: "Synkas aldrig till din partners enhet. Räknas fortfarande i din budget och följer med i dina egna säkerhetskopior och exporter.",
    alreadySyncedNote: " Om den här posten har synkats tidigare behåller din partner kopian de redan har.",
  },
  loan: {
    label: "UTLÅNAT TILL NÅGON? (VALFRITT)",
    hint: "Pengar du väntar dig tillbaka. Ange vem som har dem så visas posten under Profil → Personer → Att få tillbaka, där du loggar vad de betalar tillbaka. Den räknas ändå som utgift den här månaden.",
    clearNote: " Om du rensar namnet glöms också betalningarna som loggats mot det.",
    placeholder: "Vem är skyldig dig? Lämna tomt om ingen",
    chipA11y: "Utlånat till {{name}}",
  },
  account: {
    label: "KOPPLA TILL KONTO",
    hint: "Insättningar läggs till på det här kontots saldo.",
    none: "Inget",
  },
  business: {
    label: "FÖRETAG (VALFRITT)",
    hintEdit: "Märk den här utgiften med ett företag för deklarationsrapporten.",
    hintAdd: "Märk den här utgiften med ett företag för deklarationsrapporten. Den räknas fortfarande i din privata budget.",
    personal: "Privat",
    deleted: "💼 (borttaget företag)",
  },
  people: {
    label: "PERSONER (VALFRITT)",
    hint: "Vem var det här för? Välj en person, eller alla som delade på det - hela familjen för matvaror. Delade utgifter fördelas jämnt i rapporter per person.",
    unassigned: "Ej tilldelad",
    deleted: "👤 (borttagen person)",
  },
};
