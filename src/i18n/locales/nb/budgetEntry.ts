/**
 * BudgetArk - Norske tekster: Budsjett-fanen (entry)
 * File: src/i18n/locales/nb/budgetEntry.ts
 *
 * Norwegian (Bokmål) counterpart of en/budgetEntry.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. W-2 / 1099 / 401(k) are
 * US tax terms with no Norwegian equivalent and stay as-is.
 */

import type { Localized } from "../types";
import type { budgetEntry as en } from "../en/budgetEntry";

export const budgetEntry: Localized<typeof en> = {
  add: {
    title: "Legg til budsjettpost",
    subtitle: "Følg inntekter og utgifter per kategori.",
    submit_one: "Legg til post",
    submit_other: "Legg til {{count}} poster",
    saveAndAnother: "Lagre + ny",
    saveAndAnotherA11y: "Lagre og legg til en post til",
  },
  edit: {
    title: "Rediger post",
    subtitle: "Oppdater eller slett denne budsjettposten.",
    loading: "Laster inn...",
  },
  type: {
    label: "POSTTYPE",
    expense: "Utgift",
    income: "Inntekt",
  },
  incomeType: {
    label: "INNTEKTSTYPE",
    hint: "W-2 følger nettolønnen din og 401(k). 1099 viser hvor mye av hver betaling du bør sette av til skatt.",
    options: {
      regular: "Vanlig",
      w2: "W-2-lønn",
      "1099": "1099 / oppdragstaker",
    },
  },
  retirement: {
    label: "401(K) DENNE LØNNEN (VALGFRITT)",
    hintEdit:
      "Beløpet nedenfor er nettolønnen din. Hvis en del av lønnen gikk til 401(k), registrer det her - det følges separat og legges ikke til inntekten.",
    hintAdd:
      "Angi nettolønnen din som beløp nedenfor. Hvis en del av lønnen gikk til 401(k), registrer det her - det følges separat og legges ikke til inntekten.",
    firstLineNote: "401(k)-beløpet knyttes til den første posten.",
  },
  taxSetAside: {
    label: "PROSENT Å SETTE AV TIL SKATT",
    hint: "Ingenting trekkes fra 1099-inntekt, så sett av en del til skatten ved årets slutt. 25-30 % er et vanlig utgangspunkt.",
    preview: "Sett av {{amount}} av dette til skatt.",
  },
  category: {
    label: "KATEGORI",
  },
  amount: {
    label: "BELØP",
    placeholder: "0,00",
    descriptionLabel: "BESKRIVELSE (VALGFRITT)",
    descriptionPlaceholder: "f.eks. Dagligvarer, Netflix osv.",
    descriptionLinePlaceholder: "Beskrivelse (valgfritt)",
  },
  estimate: {
    hint: "De siste {{count}} faktiske trekkene dine lå i snitt på {{average}}. Estimatet endres bare hvis du trykker.",
    use: "Bruk {{average}}",
    useA11y: "Oppdater estimatet til {{average}}",
  },
  lines: {
    label: "POSTER",
    addA11y: "Legg til en postlinje til",
    hint: "Legg til flere beløp for samme kategori (f.eks. flere dagligvarekjøp fra en kontoutskrift).",
    lineTitle: "Post {{index}}",
    singleTitle: "Beløp",
    removeA11y: "Fjern post {{index}}",
    photosFirstLine: "Bilder knyttes til den første posten.",
  },
  suggestions: {
    useA11y: "Bruk {{description}}",
    useInCategoryA11y: "Bruk {{description}} i {{category}}",
  },
  date: {
    monthLabel: "MÅNED",
    startMonthLabel: "STARTMÅNED",
    dayLabel: "DAG",
    today: "I dag",
    todayA11y: "Sett datoen til i dag",
    weekdays: {
      sun: "Søn",
      mon: "Man",
      tue: "Tir",
      wed: "Ons",
      thu: "Tor",
      fri: "Fre",
      sat: "Lør",
    },
  },
  bill: {
    label: "GJELDER REGNINGEN",
    option: "{{name}} · ca. {{amount}}",
    none: "Ingen",
    hint: "Dette er det faktiske trekket for en av månedens gjentakende regninger. Velg den, så trer regningens estimat til side for måneden, slik at ingenting telles dobbelt.",
  },
  recurring: {
    label: "Gjentakende",
    hint: "Denne posten gjentas fra startmåneden og fremover med den frekvensen du velger nedenfor.",
    frequencyLabel: "FREKVENS",
    frequency: {
      monthly: "Hver måned",
      quarterly: "Hvert kvartal",
      semiannual: "Hver 6. måned",
      yearly: "Hvert år",
    },
    payUrlLabel: "BETALINGSLENKE (VALGFRITT)",
    payUrlHint: "Lenke til betalingssiden for denne regningen. https:// legges til hvis du utelater det.",
    payUrlPlaceholder: "f.eks. minregning.example.com/pay",
    dayOfMonthLabel: "DAG I MÅNEDEN",
    dayOfMonthHint: "Dagen regningen trekkes. Dag 29-31 faller tilbake på siste dag i kortere måneder.",
  },
  privacy: {
    label: "🔒 Privat",
    hint: "Synkes aldri til partnerens enhet. Teller fortsatt i budsjettet ditt og følger med i dine egne sikkerhetskopier og eksporter.",
    alreadySyncedNote: " Hvis denne posten har blitt synket tidligere, beholder partneren din kopien de allerede har.",
  },
  loan: {
    label: "UTLÅNT TIL NOEN? (VALGFRITT)",
    hint: "Penger du venter å få tilbake. Oppgi hvem som har dem, så vises posten under Profil → Personer → Til gode, der du logger hva de betaler tilbake. Den teller fortsatt som forbruk denne måneden.",
    clearNote: " Hvis du fjerner navnet, glemmes også betalingene som er logget mot det.",
    placeholder: "Hvem skylder deg? La stå tomt hvis ingen",
    chipA11y: "Utlånt til {{name}}",
  },
  account: {
    label: "KNYTT TIL KONTO",
    hint: "Innskudd legges til på saldoen til denne kontoen.",
    none: "Ingen",
  },
  business: {
    label: "BEDRIFT (VALGFRITT)",
    hintEdit: "Merk denne utgiften med en bedrift for skatterapporten.",
    hintAdd: "Merk denne utgiften med en bedrift for skatterapporten. Den teller fortsatt i det personlige budsjettet ditt.",
    personal: "Personlig",
    deleted: "💼 (slettet bedrift)",
  },
  people: {
    label: "PERSONER (VALGFRITT)",
    hint: "Hvem var dette for? Velg én person, eller alle som delte på det - hele familien for dagligvarer. Delte utgifter fordeles likt i rapporter per person.",
    unassigned: "Ikke tilordnet",
    deleted: "👤 (slettet person)",
  },
};
