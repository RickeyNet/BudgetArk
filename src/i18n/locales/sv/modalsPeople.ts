/**
 * BudgetArk - Svenska texter: gemensamma modaler (people)
 * File: src/i18n/locales/sv/modalsPeople.ts
 *
 * Swedish counterpart of en/modalsPeople.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsPeople as en } from "../en/modalsPeople";

export const modalsPeople: Localized<typeof en> = {
  loans: {
    title: "Att få tillbaka",
    subtitle:
      "Pengar du lånat ut. Markera en utgift som ”utlånad till” någon när du loggar den (eller i granskningsinkorgen) och registrera sedan här vad de betalar tillbaka.",
    errors: {
      load: "Kunde inte läsa in dina lån.",
      amountRequired: "Ange beloppet de betalade.",
      overpay: "Det är mer än de {{amount}} som återstår.",
      dateFormat: "Datumet måste se ut så här: 2026-09-15.",
      recordFailedReopen: "Kunde inte registrera betalningen - öppna igen och försök på nytt.",
      recordFailed: "Kunde inte registrera betalningen.",
      removeFailed: "Kunde inte ta bort betalningen.",
    },
    loanMeta: "{{date}} · utlånat {{amount}}",
    repaidBack: "{{amount}} tillbaka",
    paidBack: "Återbetalat",
    repaymentLine: "↳ {{date}} · {{amount}}",
    removeRepaymentA11y: "Ta bort betalningen på {{amount}}",
    logPaymentA11y: "Logga en betalning från {{name}}",
    borrowerFallback: "låntagaren",
    logPayment: "Logga betalning",
    form: {
      amount: "BELOPP",
      amountPlaceholder: "0,00",
      receivedOn: "MOTTAGEN DEN",
      datePlaceholder: "ÅÅÅÅ-MM-DD",
      note: "ANTECKNING (VALFRITT)",
      notePlaceholder: "Kontant, Swish, ...",
      saving: "Sparar...",
      save: "Spara betalning",
      paidInFullA11y: "Fyll i hela det återstående beloppet",
      paidInFull: "Helt betalt · {{amount}}",
    },
    allPaidBack: "Allt återbetalat",
    borrowerMeta_one: "{{lent}} utlånat i {{count}} lån",
    borrowerMeta_other: "{{lent}} utlånat i {{count}} lån",
    borrowerRepaid: "{{amount}} återbetalat",
    stillOwed: "KVAR ATT FÅ TILLBAKA",
    totalSub: "{{lent}} utlånat · {{repaid}} återbetalat",
    loading: "Läser in…",
    empty:
      "Inget utlånat än. När du lägger till en utgift på Budget-fliken, fyll i ”Utlånat till någon?” med personens namn så visas den här.",
    hideSettled: "Dölj återbetalda lån",
    showSettled_one: "Visa {{count}} återbetalt lån",
    showSettled_other: "Visa {{count}} återbetalda lån",
  },
  report: {
    previousYear: "Föregående år",
    nextYear: "Nästa år",
    loading: "Läser in…",
    deletedSuffix: "(borttagen)",
    expenses_one: "{{count}} utgift",
    expenses_other: "{{count}} utgifter",
    exporting: "Exporterar…",
    exportCsv: "Exportera CSV",
    exportFailed: {
      title: "Export misslyckades",
      csv: "Kunde inte skapa CSV-filen.",
      zip: "Kunde inte skapa zip-filen.",
    },
  },
  businessReport: {
    title: "Företagsutgifter",
    subtitle:
      "Allt som taggats till ett företag, per kalenderår. Återkommande räkningar räknas en gång per månad de infaller, precis som på Budget-skärmen.",
    shareTitle: "Exportera företagsutgifter",
    grandTotal: "FÖRETAGSUTGIFTER TOTALT · {{year}}",
    empty:
      "Inga företagsutgifter {{year}}. Tagga en utgift till ett företag när du lägger till den på Budget-fliken (skapa företag under Profil → Företag).",
    withReceipt: "{{count}} med kvitto",
    receipts: {
      shareTitle: "Exportera kvittofoton",
      buttonA11y: "Exportera kvittofoton som ett zip-arkiv",
      button: "🧾 Exportera kvittofoton (ZIP)",
      preparing: "Förbereder zip…",
      hint: "Filnamnen matchar CSV-raderna (datum_företag_belopp.jpg).",
      none: {
        title: "Inga kvitton",
        message: "Inga företagsutgifter {{year}} har kvittofoton.",
      },
      confirm: {
        title: "Exportera kvittofoton?",
        message_one:
          "Det här skapar en okrypterad zip med upp till {{count}} kvittofoto för {{year}}, namngivet så att det matchar CSV-raderna, för delning (t.ex. med din revisor). Den skyddas inte av BudgetArks kryptering när den väl delats.",
        message_other:
          "Det här skapar en okrypterad zip med upp till {{count}} kvittofoton för {{year}}, namngivna så att de matchar CSV-raderna, för delning (t.ex. med din revisor). Den skyddas inte av BudgetArks kryptering när den väl delats.",
        export: "Exportera",
      },
      noneOnDevice: {
        title: "Inga foton på den här enheten",
        message:
          "Alla kvittofoton för det här året finns på din partners enhet - foton synkas aldrig, så exportera zip-filen därifrån.",
      },
      skipped: {
        title: "Några foton hoppades över",
        message_one:
          "{{count}} foto finns på din partners enhet (eller kunde inte läsas) och togs inte med.",
        message_other:
          "{{count}} foton finns på din partners enhet (eller kunde inte läsas) och togs inte med.",
      },
    },
  },
  personReport: {
    title: "Utgifter per person",
    subtitle:
      "Allt som tilldelats en person, per kalenderår. Återkommande räkningar räknas en gång per månad de infaller, precis som på Budget-skärmen.",
    shareTitle: "Exportera utgifter per person",
    grandTotal: "TILLDELADE UTGIFTER TOTALT · {{year}}",
    empty:
      "Inga tilldelade utgifter {{year}}. Tilldela en utgift till en person när du lägger till den på Budget-fliken (lägg till personer under Profil → Personer).",
  },
  manage: {
    name: "NAMN",
    saving: "Sparar…",
    saveName: "Spara namn",
    rename: "Byt namn",
    renameA11y: "Byt namn på {{name}}",
    deleteA11y: "Ta bort {{name}}",
    errors: {
      save: "Kunde inte spara. Försök igen.",
    },
  },
  people: {
    title: "Personer",
    subtitle:
      "Lägg till personerna i ditt hushåll (eller vem som helst du följer utgifter för). Tilldela dem utgifter när du lägger till poster eller godkänner importerade transaktioner, så att det är tydligt vem som spenderat vad.",
    renameLabel: "BYT NAMN PÅ PERSON",
    placeholder: "t.ex. Sam, Alex, barnen",
    add: "Lägg till person",
    listHeader: "DINA PERSONER ({{count}})",
    empty: "Inga personer än. Lägg till en ovan.",
    noEntries: "Inga tilldelade poster",
    entries_one: "{{count}} tilldelad post",
    entries_other: "{{count}} tilldelade poster",
    deleteConfirm: {
      title: "Ta bort person?",
      message: "”{{name}}” tas bort från väljaren.",
      entryNote_one:
        "{{count}} post behåller tilldelningen och visas som ”(borttagen person)”.",
      entryNote_other:
        "{{count}} poster behåller tilldelningen och visas som ”(borttagen person)”.",
    },
    errors: {
      load: "Kunde inte läsa in dina personer. Stäng och försök igen.",
      delete: "Kunde inte ta bort personen. Försök igen.",
    },
  },
  businesses: {
    title: "Företag",
    subtitle:
      "Lägg till företagen du har utgifter för (ett bolag, en sidoverksamhet eller en frilanskund). Tagga utgifter till dem när du lägger till poster och ta sedan fram en rapport per företag när det är dags att deklarera.",
    renameLabel: "BYT NAMN PÅ FÖRETAG",
    placeholder: "t.ex. Acme AB, Etsy-butik, Konsultuppdrag",
    add: "Lägg till företag",
    listHeader: "DINA FÖRETAG ({{count}})",
    empty: "Inga företag än. Lägg till ett ovan.",
    noEntries: "Inga taggade poster",
    entries_one: "{{count}} taggad post",
    entries_other: "{{count}} taggade poster",
    deleteConfirm: {
      title: "Ta bort företag?",
      message: "”{{name}}” tas bort från väljaren.",
      entryNote_one:
        "{{count}} post behåller taggen och visas som ”(borttaget företag)” i rapporter.",
      entryNote_other:
        "{{count}} poster behåller taggen och visas som ”(borttaget företag)” i rapporter.",
    },
    errors: {
      load: "Kunde inte läsa in dina företag. Stäng och försök igen.",
      delete: "Kunde inte ta bort företaget. Försök igen.",
    },
  },
  attachments: {
    label: "KVITTOFOTON ({{count}}/{{max}})",
    hint: "Foton lagras krypterade enbart på den här enheten - de synkas inte till din partner och följer inte med i exporter.",
    viewA11y: "Visa kvittofoto",
    removeA11y: "Ta bort kvittofoto",
    onPartnerDevice: "På partnerns enhet",
    adding: "Lägger till…",
    takePhoto: "📷 Ta foto",
    choosePhoto: "🖼️ Välj foto",
    cameraPermission: {
      title: "Kameraåtkomst krävs",
      message: "Tillåt kameraåtkomst i enhetens inställningar för att fotografera kvitton.",
    },
    secureStorage: {
      title: "Säker lagring inte tillgänglig",
      message:
        "BudgetArk kommer inte åt enhetens säkra nyckellager, så kvittofoton kan inte lagras krypterade. Foton är avstängda istället för att sparas oskyddade.",
    },
    addFailed: {
      title: "Kunde inte lägga till foto",
      message: "Något gick fel när bilden bearbetades. Försök igen.",
    },
  },
  viewer: {
    counter: "{{current}} av {{total}}",
    closeA11y: "Stäng fotovisaren",
    missing:
      "Det här fotot finns på enheten som tog det. Kvittofoton överförs inte vid synk.",
    removeA11y: "Ta bort det här kvittofotot",
    remove: "Ta bort foto",
  },
};
