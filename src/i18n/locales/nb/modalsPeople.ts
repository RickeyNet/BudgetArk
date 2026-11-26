/**
 * BudgetArk - Norske tekster: delte modaler (people)
 * File: src/i18n/locales/nb/modalsPeople.ts
 *
 * Norwegian (Bokmål) counterpart of en/modalsPeople.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsPeople as en } from "../en/modalsPeople";

export const modalsPeople: Localized<typeof en> = {
  loans: {
    title: "Til gode",
    subtitle:
      "Penger du har lånt ut. Merk en utgift som «utlånt til» noen når du logger den (eller i gjennomgangsinnboksen), og registrer så her hva de betaler tilbake.",
    errors: {
      load: "Kunne ikke laste inn lånene dine.",
      amountRequired: "Skriv inn beløpet de betalte.",
      overpay: "Det er mer enn de {{amount}} som gjenstår.",
      dateFormat: "Datoen må se slik ut: 2026-09-15.",
      recordFailedReopen: "Kunne ikke registrere betalingen - åpne igjen og prøv på nytt.",
      recordFailed: "Kunne ikke registrere betalingen.",
      removeFailed: "Kunne ikke fjerne betalingen.",
      removeLoanFailed: "Kunne ikke fjerne lånet.",
    },
    loanMeta: "{{date}} · utlånt {{amount}}",
    repaidBack: "{{amount}} tilbake",
    paidBack: "Tilbakebetalt",
    repaymentLine: "↳ {{date}} · {{amount}}",
    removeRepaymentA11y: "Fjern betalingen på {{amount}}",
    logPaymentA11y: "Logg en betaling fra {{name}}",
    borrowerFallback: "låntakeren",
    removeLoanA11y: "Fjern lånet «{{title}}»",
    removeConfirm: {
      title: "Fjerne dette lånet?",
      message: "«{{title}}» ({{amount}}) fjernes fra Til gode, sammen med betalingene som er registrert på det. Du kan også slette utgiften fra budsjettet, eller beholde den som en vanlig utgift.",
      keepExpense: "Behold utgiften",
      deleteExpense: "Slett utgiften",
    },
    logPayment: "Logg betaling",
    form: {
      amount: "BELØP",
      amountPlaceholder: "0,00",
      receivedOn: "MOTTATT DEN",
      datePlaceholder: "ÅÅÅÅ-MM-DD",
      note: "NOTAT (VALGFRITT)",
      notePlaceholder: "Kontant, Vipps, ...",
      saving: "Lagrer...",
      save: "Lagre betaling",
      paidInFullA11y: "Fyll inn hele det gjenstående beløpet",
      paidInFull: "Betalt i sin helhet · {{amount}}",
    },
    allPaidBack: "Alt tilbakebetalt",
    borrowerMeta_one: "{{lent}} utlånt i {{count}} lån",
    borrowerMeta_other: "{{lent}} utlånt i {{count}} lån",
    borrowerRepaid: "{{amount}} tilbakebetalt",
    stillOwed: "DU HAR FORTSATT TIL GODE",
    totalSub: "{{lent}} utlånt · {{repaid}} tilbakebetalt",
    loading: "Laster inn…",
    empty:
      "Ingenting utlånt enda. Når du legger til en utgift på Budsjett-fanen, fyller du inn «Utlånt til noen?» med personens navn, så vises den her.",
    hideSettled: "Skjul tilbakebetalte lån",
    showSettled_one: "Vis {{count}} tilbakebetalt lån",
    showSettled_other: "Vis {{count}} tilbakebetalte lån",
  },
  report: {
    previousYear: "Forrige år",
    nextYear: "Neste år",
    loading: "Laster inn…",
    deletedSuffix: "(slettet)",
    expenses_one: "{{count}} utgift",
    expenses_other: "{{count}} utgifter",
    exporting: "Eksporterer…",
    exportCsv: "Eksporter CSV",
    exportFailed: {
      title: "Eksport mislyktes",
      csv: "Kunne ikke opprette CSV-filen.",
      zip: "Kunne ikke opprette zip-filen.",
    },
  },
  businessReport: {
    title: "Bedriftsutgifter",
    subtitle:
      "Alt som er merket med en bedrift, per kalenderår. Gjentakende regninger telles én gang per måned de forfaller, akkurat som på Budsjett-skjermen.",
    shareTitle: "Eksporter bedriftsutgifter",
    grandTotal: "BEDRIFTSUTGIFTER TOTALT · {{year}}",
    empty:
      "Ingen bedriftsutgifter i {{year}}. Merk en utgift med en bedrift når du legger den til på Budsjett-fanen (opprett bedrifter under Profil → Bedrifter).",
    withReceipt: "{{count}} med kvittering",
    income: "Inntekter",
    expenses: "Utgifter",
    net: "Netto",
    receipts: {
      shareTitle: "Eksporter kvitteringsbilder",
      buttonA11y: "Eksporter kvitteringsbilder som et zip-arkiv",
      button: "🧾 Eksporter kvitteringsbilder (ZIP)",
      preparing: "Forbereder zip…",
      hint: "Filnavnene samsvarer med CSV-radene (dato_bedrift_beløp.jpg).",
      none: {
        title: "Ingen kvitteringer",
        message: "Ingen bedriftsutgifter i {{year}} har kvitteringsbilder.",
      },
      confirm: {
        title: "Eksportere kvitteringsbilder?",
        message_one:
          "Dette lager en ukryptert zip med opptil {{count}} kvitteringsbilde for {{year}}, navngitt slik at det samsvarer med CSV-radene, for deling (f.eks. med regnskapsføreren din). Den beskyttes ikke av BudgetArks kryptering når den først er delt.",
        message_other:
          "Dette lager en ukryptert zip med opptil {{count}} kvitteringsbilder for {{year}}, navngitt slik at de samsvarer med CSV-radene, for deling (f.eks. med regnskapsføreren din). Den beskyttes ikke av BudgetArks kryptering når den først er delt.",
        export: "Eksporter",
      },
      noneOnDevice: {
        title: "Ingen bilder på denne enheten",
        message:
          "Alle kvitteringsbildene for dette året ligger på partnerens enhet - bilder synkes aldri, så eksporter zip-filen derfra.",
      },
      skipped: {
        title: "Noen bilder ble hoppet over",
        message_one:
          "{{count}} bilde ligger på partnerens enhet (eller kunne ikke leses) og ble ikke tatt med.",
        message_other:
          "{{count}} bilder ligger på partnerens enhet (eller kunne ikke leses) og ble ikke tatt med.",
      },
    },
  },
  personReport: {
    title: "Forbruk per person",
    subtitle:
      "Alt som er tilordnet en person, per kalenderår, pluss hva hver inntektstaker tok inn. Gjentakende regninger telles én gang per måned de forfaller, og gjentakende inntekt blandes med lønningene som er koblet til den, akkurat som på Budsjett-skjermen.",
    shareTitle: "Eksporter forbruk per person",
    grandTotal: "TILORDNET FORBRUK TOTALT · {{year}}",
    grandIncome: "Inntekt per inntektstaker · {{amount}}",
    income_one: "💵 Inntekt · {{count}} post",
    income_other: "💵 Inntekt · {{count}} poster",
    net: "Netto (inntekt − forbruk)",
    empty:
      "Ingen tilordnede utgifter eller inntekter i {{year}}. Tilordne en utgift til en person når du legger den til på Budsjett-fanen, eller oppgi inntektstakeren på en gjentakende inntekt (legg til personer under Profil → Personer).",
  },
  manage: {
    name: "NAVN",
    saving: "Lagrer…",
    saveName: "Lagre navn",
    rename: "Gi nytt navn",
    renameA11y: "Gi {{name}} nytt navn",
    deleteA11y: "Slett {{name}}",
    errors: {
      save: "Kunne ikke lagre. Prøv igjen.",
    },
  },
  people: {
    title: "Personer",
    /** Shortcut rows at the top of the sheet - the report and loans live behind this one Profile row. */
    shortcuts: {
      report: "Forbruksrapport per person",
      reportSubtext: "Summer per person og år, med CSV-eksport",
      reportA11y: "Åpne rapporten over forbruk per person",
      owed: "Til gode 🤝",
      owedSubtext: "Penger du har lånt ut, og hva som er betalt tilbake",
      owedA11y: "Åpne Til gode",
    },
    subtitle:
      "Legg til personene i husholdningen din (eller hvem som helst du følger forbruket for). Tilordne utgifter til dem når du legger til poster eller godkjenner importerte transaksjoner, så det er tydelig hvem som brukte hva.",
    renameLabel: "GI PERSONEN NYTT NAVN",
    placeholder: "f.eks. Sam, Alex, barna",
    add: "Legg til person",
    listHeader: "PERSONENE DINE ({{count}})",
    empty: "Ingen personer enda. Legg til en ovenfor.",
    noEntries: "Ingen tilordnede poster",
    entries_one: "{{count}} tilordnet post",
    entries_other: "{{count}} tilordnede poster",
    deleteConfirm: {
      title: "Slette personen?",
      message: "«{{name}}» fjernes fra velgeren.",
      entryNote_one:
        "{{count}} post beholder tilordningen og vises som «(slettet person)».",
      entryNote_other:
        "{{count}} poster beholder tilordningen og vises som «(slettet person)».",
    },
    errors: {
      load: "Kunne ikke laste inn personene dine. Lukk og prøv igjen.",
      delete: "Kunne ikke slette personen. Prøv igjen.",
    },
  },
  businesses: {
    title: "Bedrifter",
    /** Shortcut row at the top of the sheet - the report lives behind this one Profile row. */
    shortcuts: {
      report: "Rapport over bedriftsutgifter",
      reportSubtext: "Summer per bedrift og år, med CSV-eksport",
      reportA11y: "Åpne rapporten over bedriftsutgifter",
    },
    subtitle:
      "Legg til bedriftene du har utgifter for (et selskap, en sidegeskjeft eller en frilanskunde). Merk utgifter med dem når du legger til poster, og hent så ut en rapport per bedrift når skatten skal leveres.",
    renameLabel: "GI BEDRIFTEN NYTT NAVN",
    placeholder: "f.eks. Acme AS, Etsy-butikk, Konsulentoppdrag",
    add: "Legg til bedrift",
    listHeader: "BEDRIFTENE DINE ({{count}})",
    empty: "Ingen bedrifter enda. Legg til en ovenfor.",
    noEntries: "Ingen merkede poster",
    rentalToggle: "Utleiebolig",
    rentalHint: "Legger til leietakere, skyldig leie og gebyrer for denne virksomheten.",
    tenantsLink: "Leietakere",
    tenantsOwed: "Leietakere skylder {{amount}}",
    tenantsA11y: "Åpne leietakere for {{name}}",
    entries_one: "{{count}} merket post",
    entries_other: "{{count}} merkede poster",
    deleteConfirm: {
      title: "Slette bedriften?",
      message: "«{{name}}» fjernes fra velgeren.",
      entryNote_one:
        "{{count}} post beholder merkingen og vises som «(slettet bedrift)» i rapporter.",
      entryNote_other:
        "{{count}} poster beholder merkingen og vises som «(slettet bedrift)» i rapporter.",
    },
    errors: {
      load: "Kunne ikke laste inn bedriftene dine. Lukk og prøv igjen.",
      delete: "Kunne ikke slette bedriften. Prøv igjen.",
    },
  },
  tenants: {
    back: "← Bedrifter",
    title: "Leietakere for {{name}}",
    subtitle: "Angi månedsleien for hver leietaker. Leien legges til det de skylder hver måned på forfallsdagen, og inntekt du merker med leietakeren teller som en betaling. En delbetaling lar resten stå som skyldig. Forsinkelsesgebyrer og engangskrav legges til samme saldo.",
    totalOwed: "UTESTÅENDE LEIE",
    totalSub: "{{rent}} forfaller hver måned",
    empty: "Ingen leietakere ennå. Legg til en nedenfor.",
    addTenant: "+ Legg til leietaker",
    rentMeta: "{{rent}}/md. · forfaller den {{day}}.",
    movedOut: "Flyttet ut · siste måned {{month}}",
    owes: "Skylder {{amount}}",
    paidUp: "Alt betalt",
    credit: "{{amount}} betalt på forskudd",
    unpaidMonths: "Måneder som ikke er fullt betalt: {{months}}",
    logPayment: "Registrer betaling",
    logPaymentA11y: "Registrer leiebetaling fra {{name}}",
    history: "Historikk",
    hideHistory: "Skjul historikk",
    monthPaid: "{{rent}} betalt",
    monthPartial: "{{paid}} betalt · {{owed}} skyldig",
    monthUnpaid: "{{owed}} skyldig",
    openingRow: "Skyldig før sporing",
    addCharge: "Legg til gebyr",
    addChargeA11y: "Legg til forsinkelsesgebyr eller annet krav for {{name}}",
    lateFee: "Forsinkelsesgebyr",
    chargeFallback: "Krav",
    chargesHeader: "GEBYRER OG KRAV",
    charge: {
      noteLabel: "HVA GJELDER DET",
      notePlaceholder: "f.eks. Forsinkelsesgebyr, vindusreparasjon",
      amountLabel: "BELØP",
      save: "Legg til gebyr",
    },
    pastPayments: "Legg til tidligere betalinger",
    pastPaymentsA11y: "Legg til tidligere leiebetalinger fra {{name}}",
    past: {
      throughLabel: "LEIE BETALT TIL OG MED",
      hint: "Legger til en betaling for hver måneds leie som ikke er betalt, fra første måned til og med denne, datert på forfallsdagen. De lagres som inntekt i de månedene. Et ubetalt gebyr eller en tidligere saldo betales før leien.",
      preview: "Betalinger som legges til: {{payments}} · {{total}} · {{from}} til {{to}}",
      nothing: "Leien er allerede betalt for hver måned fram til da.",
      save: "Legg til betalinger",
    },
    picker: {
      notSet: "Ikke angitt",
      clear: "Fjern",
    },
    paymentsHeader: "BETALINGER",
    noPayments: "Ingen betalinger registrert ennå.",
    paymentsHint: "Betalinger er inntektsposter i Budsjett-fanen. Rediger eller slett dem der. Et bankinnskudd kan tilordnes en leietaker i innboksen for gjennomgang.",
    paymentDescription: "Leie - {{name}}",
    form: {
      nameLabel: "LEIETAKERENS NAVN",
      namePlaceholder: "f.eks. Sam, Enhet 2",
      rentLabel: "MÅNEDSLEIE",
      rentPlaceholder: "f.eks. 1200",
      firstMonthLabel: "FØRSTE MÅNED MED LEIE",
      rentHistoryLabel: "LEIE",
      rentTerm: "{{rent}}/md. fra {{month}}",
      changeRentLabel: "ENDRE LEIE (VALGFRITT)",
      changeRentHint: "Angi den nye leien og måneden den gjelder fra. Tidligere måneder beholder den gamle leien.",
      fromMonthLabel: "NY LEIE GJELDER FRA",
      dueDayLabel: "LEIEN FORFALLER DAG",
      openingLabel: "SKYLDER ALLEREDE (VALGFRITT)",
      openingHint: "Ubetalt leie fra før den første måneden ovenfor.",
      paidThroughLabel: "LEIE BETALT TIL OG MED (VALGFRITT)",
      paidThroughHint: "Flyttet inn tidligere? Skriv inn den siste måneden som er betalt i sin helhet, så legges det til en betaling for hver måned fram til den. Sett første måned ovenfor til innflyttingsmåneden.",
      endMonthLabel: "FLYTTET UT (VALGFRITT)",
      endMonthHint: "Den siste måneden det beregnes leie for. Det som fortsatt skyldes, blir stående.",
      add: "Legg til leietaker",
      save: "Lagre leietaker",
    },
    payment: {
      amountLabel: "MOTTATT BELØP",
      dateLabel: "DATO",
      save: "Lagre betaling",
    },
    errors: {
      nameRequired: "Skriv inn leietakerens navn.",
      rentRequired: "Skriv inn månedsleien.",
      monthFormat: "Velg en måned.",
      dueDay: "Forfallsdagen må være mellom 1 og 31.",
      opening: "Skriv inn beløpet som allerede skyldes, eller la feltet stå tomt.",
      endBeforeStart: "Utflyttingsmåneden kan ikke være før den første måneden med leie.",
      limit: "En bedrift kan ha opptil {{max}} leietakere.",
      save: "Kunne ikke lagre leietakeren. Prøv igjen.",
      chargeAmount: "Skriv inn beløpet for kravet.",
      tooManyPast: "Det ville lagt til mer enn {{max}} betalinger. Velg en tidligere måned.",
      amountRequired: "Skriv inn mottatt beløp.",
      dateFormat: "Velg en dato.",
      paymentFailed: "Kunne ikke lagre betalingen. Prøv igjen.",
    },
    deleteConfirm: {
      title: "Fjerne leietaker?",
      message: "«{{name}}» og leiesaldoen fjernes. Betalinger du har registrert, blir værende i budsjettet som bedriftens inntekt.",
    },
  },
  attachments: {
    label: "KVITTERINGSBILDER ({{count}}/{{max}})",
    hint: "Bildene lagres kryptert kun på denne enheten - de synkes ikke til partneren din og følger ikke med i eksporter.",
    viewA11y: "Vis kvitteringsbilde",
    removeA11y: "Fjern kvitteringsbilde",
    onPartnerDevice: "På partnerens enhet",
    adding: "Legger til…",
    takePhoto: "📷 Ta bilde",
    choosePhoto: "🖼️ Velg bilde",
    cameraPermission: {
      title: "Kameratilgang kreves",
      message: "Tillat kameratilgang i enhetens innstillinger for å fotografere kvitteringer.",
    },
    secureStorage: {
      title: "Sikker lagring utilgjengelig",
      message:
        "BudgetArk får ikke tilgang til enhetens sikre nøkkellager, så kvitteringsbilder kan ikke lagres kryptert. Bilder er slått av i stedet for å lagres ubeskyttet.",
    },
    addFailed: {
      title: "Kunne ikke legge til bilde",
      message: "Noe gikk galt under behandlingen av bildet. Prøv igjen.",
    },
  },
  viewer: {
    counter: "{{current}} av {{total}}",
    closeA11y: "Lukk bildeviseren",
    missing:
      "Dette bildet ligger på enheten som tok det. Kvitteringsbilder overføres ikke ved synk.",
    removeA11y: "Fjern dette kvitteringsbildet",
    remove: "Fjern bilde",
  },
};
