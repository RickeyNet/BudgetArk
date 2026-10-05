/**
 * BudgetArk - Norske tekster: felles modaler (data)
 * File: src/i18n/locales/nb/modalsData.ts
 *
 * Norwegian (Bokmål) counterpart of en/modalsData.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Sheet titles ("Budget Entries") and column names ("MonthlyLimit") are
 * file identifiers the importer matches verbatim - they stay English here
 * and only the explanations are translated.
 */

import type { Localized } from "../types";
import type { modalsData as en } from "../en/modalsData";

export const modalsData: Localized<typeof en> = {
  rules: {
    title: "Forhandlerregler",
    subtitleEmpty:
      "Regler husker hva som skal skje når transaksjoner fra en forhandler importeres.",
    subtitleCount_one:
      "{{count}} lagret regel. Endringer gjelder fremtidige importer og alt som fortsatt ligger i innboksen - transaksjoner du allerede har hoppet over, forblir hoppet over.",
    subtitleCount_other:
      "{{count}} lagrede regler. Endringer gjelder fremtidige importer og alt som fortsatt ligger i innboksen - transaksjoner du allerede har hoppet over, forblir hoppet over.",
    emptyBody:
      "Ingen regler ennå. Huk av «Gjør alltid dette» i gjennomgangsinnboksen når du godkjenner eller hopper over en transaksjon - regelen vises da her, der du kan endre eller slette den når som helst.",
    errors: {
      load: "Kunne ikke laste inn reglene dine.",
      save: "Kunne ikke lagre regelen.",
      delete: "Kunne ikke slette regelen.",
    },
    billOption: "{{name}} · ca. {{amount}}",
    debtOption: "{{name}} · min. {{amount}}",
    behavior: {
      alwaysSkip: "Hopp alltid over - importeres aldri",
      logsDebtPayment: "Logger en betaling på 💳 {{name}}",
      suggestsDebtPayment: "Foreslår en betaling på 💳 {{name}}",
      autoApproves: "Autogodkjenner {{icon}} {{category}}",
      suggests: "Foreslår {{icon}} {{category}}",
      renameAs: "som «{{name}}»",
      usedCount: "brukt {{count}}×",
      deletedDebt: "(slettet gjeldspost)",
      deletedBusiness: "(slettet bedrift)",
      deletedPerson: "(slettet person)",
      deletedBill: "(slettet regning)",
    },
    editor: {
      whenImports: "NÅR DENNE FORHANDLEREN IMPORTERES",
      alwaysSkipPill: "🚫 Hopp alltid over",
      autoApproveHelp:
        "Autogodkjenn uten gjennomgang - importer som matcher går rett inn i budsjettet med valgene i denne regelen. Uten avhuking venter de i innboksen med kategorien som forslag.",
      renameLabel: "GI NYTT NAVN (VALGFRITT)",
      renamePlaceholder: "Behold bankens beskrivelse",
      businessLabel: "BEDRIFT",
      personalPill: "Privat",
      peopleLabel: "PERSONER",
      unassignedPill: "Ikke tildelt",
      billLabel: "GJELDER REGNINGEN",
      notABillPill: "Ikke en regning",
      debtHelp:
        "Betalinger til denne forhandleren logges på gjeldsposten (saldo og historikk i Gjeld-fanen) i stedet for å bokføres som utgift. Kategorien over brukes ikke.",
      deleteRule: "Slett regel",
      saving: "Lagrer...",
    },
    confirmDelete: {
      title: "Slette denne regelen?",
      bodyIgnore:
        "Fremtidige transaksjoner fra «{{merchant}}» importeres til gjennomgangsinnboksen igjen. De du allerede har hoppet over, kommer ikke tilbake.",
      bodyApprove:
        "Fremtidige transaksjoner fra «{{merchant}}» venter i gjennomgangsinnboksen på manuell godkjenning. Poster som allerede er opprettet, endres ikke.",
      bodySuggest:
        "Fremtidige transaksjoner fra «{{merchant}}» kommer uten kategoriforslag. Godkjente poster endres ikke.",
      keep: "Behold",
      deleting: "Sletter...",
    },
  },
  import: {
    title: "Importer kontoutskrift",
    subtitle:
      "Fortell BudgetArk hvilke kolonner som skal leses. Appen har gjettet - sjekk forhåndsvisningen under og rett opp det som ser feil ut.",
    accountLabelSection: "KONTOETIKETT",
    accountLabelPlaceholder: "Kontoutskrift",
    accountLabelHint:
      "Vises på hver rad i gjennomgangsinnboksen så du kan skille denne importen fra banksynken din. Behold samme etikett når du importerer en fil fra denne banken igjen - med samme etikett hopper BudgetArk over rader du allerede har importert.",
    columnsSection: "KOLONNER",
    headerlessHint:
      "Filen har ingen overskriftsrad, så kolonnene er nummerert. Koble dem sammen ved hjelp av forhåndsvisningen.",
    field: {
      date: "Dato",
      description: "Beskrivelse",
      amount: "Beløp",
      debit: "Penger ut (debet)",
      credit: "Penger inn (kredit)",
    },
    chooseColumn: "Velg kolonne",
    fieldA11y: "{{label}}: {{value}}",
    fieldA11yEmpty: "{{label}}: velg en kolonne",
    layout: {
      signed: "Én beløpskolonne",
      split: "Separat debet / kredit",
    },
    positiveIsOutflow: "Positive tall er belastninger (vanlig for kredittkort)",
    previewSection: "FORHÅNDSVISNING",
    noDescription: "(ingen beskrivelse)",
    previewReady_one: "{{count}} transaksjon klar",
    previewReady_other: "{{count}} transaksjoner klare",
    previewSkipped_one: " · {{count}} uleselig rad hoppet over",
    previewSkipped_other: " · {{count}} uleselige rader hoppet over",
    noPreviewComplete:
      "Ingen transaksjoner er lest med disse kolonnene ennå. Prøv en annen dato- eller beløpskolonne.",
    noPreviewIncomplete:
      "Velg en dato-, en beskrivelses- og en beløpskolonne for å se en forhåndsvisning.",
    remember: "Husk disse kolonnene til neste gang (denne banken)",
    importButton: "Importer",
    importing: "Importerer…",
    pickerTitle: "Velg kolonnen",
    errors: {
      noneRead:
        "Ingen transaksjoner kunne leses med disse kolonnene. Sjekk at dato- og beløpskolonnene stemmer.",
      generic: "Noe gikk galt under importen av kontoutskriften.",
    },
    summary: {
      added_one: "{{count}} lagt til i gjennomgangsinnboksen",
      added_other: "{{count}} lagt til i gjennomgangsinnboksen",
      autoApproved_one: "{{count}} autogodkjent av reglene dine",
      autoApproved_other: "{{count}} autogodkjent av reglene dine",
      autoDismissed_one: "{{count}} hoppet over av reglene dine",
      autoDismissed_other: "{{count}} hoppet over av reglene dine",
      alreadyKnown_one: "{{count}} allerede importert",
      alreadyKnown_other: "{{count}} allerede importert",
      withParts: "{{label}}: {{parts}}.",
      nothingNew: "{{label}}: ingenting nytt å importere - hver rad var her allerede.",
      flaggedDuplicates_one:
        "{{count}} ser ut som en transaksjon du allerede har - den er flagget i innboksen så du kan hoppe over den.",
      flaggedDuplicates_other:
        "{{count}} ser ut som transaksjoner du allerede har - de er flagget i innboksen så du kan hoppe over dem.",
      deferred_one:
        "{{count}} fikk ikke plass (innboksen rommer 500 om gangen). Godkjenn eller fjern noen, og importer så filen igjen for å få med resten.",
      deferred_other:
        "{{count}} fikk ikke plass (innboksen rommer 500 om gangen). Godkjenn eller fjern noen, og importer så filen igjen for å få med resten.",
      rowsSkipped_one: "{{count}} rad hoppet over (uleselig dato eller beløp)",
      rowsSkipped_other: "{{count}} rader hoppet over (uleselig dato eller beløp)",
      zeroRows_one: "{{count}} rad med beløp 0 utelatt",
      zeroRows_other: "{{count}} rader med beløp 0 utelatt",
    },
  },
  schema: {
    title: "Regnearkformat",
    subtitle:
      "Overskrifter matches uavhengig av store og små bokstaver. CSV-filer inneholder bare arket Budget Entries. Excel-filer kan inneholde hvilke som helst av arkene under.",
    tipLabel: "TIPS",
    tipBefore: "Enkleste måten å lære formatet: trykk på ",
    tipAction: "Eksporter → Regneark",
    tipAfter:
      " (XLSX), åpne filen i Excel eller Google Regneark, rediger og importer igjen. ID-er følger med frem og tilbake, så eksisterende rader oppdateres på plass. Selv med en tom app er eksporten en ferdig tom mal - hvert ark har riktige overskrifter, bare ingen rader ennå.",
    presets: {
      title: "Kommer du fra YNAB, Mint eller Monarch?",
      body: "Importer transaksjons-CSV-en deres som den er. BudgetArk kjenner igjen filen på overskriftene og knytter kolonnene for deg.",
      ynab: "• YNAB: Payee, Outflow, Inflow (Category, Memo)",
      mint: "• Mint: Description, Amount, Transaction Type (Category, Notes)",
      monarch: "• Monarch: Merchant, Amount, Original Statement (Category, Notes)",
      categories:
        "• Kategorier knyttes til BudgetArks via nøkkelord (Groceries → Grocery); alt annet kommer inn som en egen kategori under sitt eget navn.",
      transfers:
        "• Overføringer mellom dine egne kontoer utelates - de er verken inntekt eller forbruk. Importsammendraget sier hvor mange.",
    },
    limits: {
      title: "Begrensninger",
      fileSize: "• Filstørrelse: maks 5 MB",
      rowsPerSheet: "• Opptil 5 000 rader per ark",
      recordsTotal: "• Opptil 6 000 oppføringer totalt per import",
      skipped:
        "• Rader som mangler obligatoriske felt hoppes over i stillhet (du ser antallet etter importen).",
    },
    allowedCategories: {
      title: "Tillatte kategorier",
      body: "Brukes for både Budget Entries og Budget Limits. Må matche nøyaktig.",
    },
    required: "Obligatorisk",
    optional: "Valgfri",
    csvTag: "CSV",
    excelOnlyTag: "Bare Excel",
    sheets: {
      entries: {
        description:
          "Kjernearket - obligatorisk for både CSV- og Excel-import. CSV-filer inneholder bare dette arket.",
        footer:
          "Kvitteringsbilder følger aldri med gjennom regneark - bildefilene blir på enheten som tok dem.",
        columns: {
          id: "UUID genereres automatisk hvis den mangler. Behold den for trygg reimport.",
          date: "ISO ÅÅÅÅ-MM-DD, fullstendig ISO-tidsstempel, amerikansk M/D/ÅÅÅÅ eller Excels eget datoformat.",
          type: "Må være income eller expense (uavhengig av store og små bokstaver).",
          category: "Må matche en tillatt kategori nøyaktig (se listen under).",
          amount: "Positivt tall. Fjerner $ og komma. Tolker (50.00) som -50.00.",
          description: "Valgfritt notat. Opptil 220 tegn.",
          recurring: "yes / no / true / false / 1 / 0.",
          linkedAccountId: "Eiendelskontoens UUID for spareposter.",
          businessId:
            "UUID fra arket Businesses for bedriftsmerkede utgifter. Følger med ved reimport.",
          business: "Lesbart bedriftsnavn. Bare ved eksport - ignoreres ved import.",
          personId:
            "UUID fra arket People for utgifter tildelt en person (den første av dem når delt). Følger med ved reimport.",
          personIds:
            "Alle personer en delt utgift er tildelt, som UUID-er atskilt med ;. Følger med ved reimport.",
          person: "Lesbare personnavn. Bare ved eksport - ignoreres ved import.",
          private: "yes markerer en privat post som aldri synkes til partneren din. Følger med ved reimport.",
        },
      },
      limits: {
        description:
          "Månedlige forbruksgrenser per kategori. Importerte grenser lander i gjeldende måned.",
        columns: {
          category: "En av de tillatte kategoriene.",
          monthlyLimit: "Positivt tall.",
        },
      },
      debts: {
        description: "Eksisterende gjeldsposter (kort, lån osv.).",
        columns: {
          id: "Genereres automatisk hvis den mangler.",
          name: "Opptil 80 tegn.",
          balance: "Gjenstående saldo nå, ≥ 0.",
          originalBalance: "Inngående saldo, ≥ 0,01.",
          rate: "Effektiv rente i prosent, 0-200.",
          minPayment: "Månedlig minstebetaling, ≥ 0.",
          owner: "mine / partner / joint. Standard: mine.",
          debtClass:
            "personal_credit / car / house. (Eldre car_house blir house når navnet nevner et boliglån, ellers car.)",
          debtClassSource: "manual / inferred.",
          goalDate: "Valgfri måldato for nedbetaling.",
          createdAt: "ISO-tidsstempel; standard: nå.",
        },
      },
      payments: {
        description: "Enkeltbetalinger på en gjeldspost.",
        columns: {
          id: "Genereres automatisk hvis den mangler.",
          debtId: "Må matche en rads ID i arket Debts.",
          amount: "Positivt tall, ≥ 0,01.",
          date: "ISO-dato eller amerikansk M/D/ÅÅÅÅ.",
        },
      },
      savingsGoals: {
        description: "Sparemål som følges opp.",
        columns: {
          id: "Genereres automatisk hvis den mangler.",
          name: "Opptil 80 tegn.",
          category: "emergency_fund / travel / home / car / education / other.",
          targetAmount: "Positivt tall.",
          currentAmount: "Tall, ≥ 0.",
          targetDate: "Valgfri måldato.",
          priority:
            "Rangering i kjøpsplanleggerens «Min rekkefølge» (0 = først). Tom hvis aldri rangert. Følger med ved reimport.",
          usesPerMonth:
            "Inndata for kostnad per bruk: forventet antall bruk per måned (1-10 000). Tom hvis ikke sporet.",
          usefulLifeYears:
            "Inndata for kostnad per bruk: år du regner med å beholde den (opptil 100). Tom hvis ikke sporet.",
          createdAt: "ISO-tidsstempel; standard: nå.",
          updatedAt:
            "ISO-tidsstempel for siste endring. Følger med så partnersynken beholder den nyeste kopien.",
        },
      },
      assetAccounts: {
        description:
          "Varige kontosaldoer (sparing, pensjon, HSA, investering).",
        columns: {
          id: "Genereres automatisk hvis den mangler.",
          name: "Opptil 80 tegn.",
          category: "savings / retirement / hsa / investment / other.",
          balance: "Tall, ≥ 0.",
          emergencyFund:
            "yes markerer en sparekonto som bufferen din. Følger med ved reimport.",
          createdAt: "ISO-tidsstempel; standard: nå.",
        },
      },
      businesses: {
        description:
          "Bedrifter som utgiftsposter kan merkes med (via BusinessId). Bare aktive bedrifter eksporteres.",
        columns: {
          id: "Genereres automatisk hvis den mangler. Budsjettposter viser hit via BusinessId.",
          name: "Opptil 40 tegn.",
          createdAt: "ISO-tidsstempel; standard: nå.",
        },
      },
      people: {
        description:
          "Personer som forbruk kan tildeles (via PersonId). Bare aktive personer eksporteres.",
        columns: {
          id: "Genereres automatisk hvis den mangler. Budsjettposter viser hit via PersonId.",
          name: "Opptil 40 tegn.",
          createdAt: "ISO-tidsstempel; standard: nå.",
        },
      },
      holdings: {
        description:
          "Aksje-/ETF-posisjoner. Kurser hentes på enheten og importeres aldri - bare posisjonen.",
        columns: {
          id: "Genereres automatisk hvis den mangler.",
          symbol: "Ticker, f.eks. AAPL eller VTI. Opptil 12 tegn (bokstaver, sifre, . og -).",
          shares: "Positivt tall. Brøkdeler av aksjer er tillatt.",
          costBasis: "Totalt investert beløp i dollar, ≥ 0. Brukes til gevinst/tap.",
          createdAt: "ISO-tidsstempel; standard: nå.",
        },
      },
    },
  },
  categories: {
    title: "Egne kategorier",
    subtitle:
      "Legg til dine egne budsjettkategorier. De fungerer overalt der de innebygde gjør det - poster, grenser, diagrammer og rapporter.",
    nameLabel: "NAVN",
    namePlaceholder: "f.eks. Hobbyer, Kjæledyr, Barnepass",
    iconLabel: "IKON",
    pickIconA11y: "Velg ikon {{glyph}}",
    bucketLabel: "50/30/20-BØTTE",
    addButton: "Legg til kategori",
    adding: "Legger til…",
    yourCategories: "DINE KATEGORIER ({{count}})",
    emptyCustom: "Ingen egne kategorier ennå. Legg til en over.",
    deleteA11y: "Slett {{name}}",
    builtInLabel: "INNEBYGDE KATEGORIER",
    builtInHelp:
      "Skjul dem du aldri bruker. Skjulte kategorier forsvinner fra valgene på denne telefonen; eksisterende poster beholder dem.",
    alwaysShown: "Vises alltid",
    restore: "Gjenopprett",
    restoreA11y: "Gjenopprett {{name}}",
    hide: "Skjul",
    hideA11y: "Skjul {{name}}",
    confirmDelete: {
      title: "Slette kategorien?",
      body: "«{{name}}» fjernes fra valgene. Eksisterende poster beholder kategorien, de mister bare det egne ikonet.",
    },
    confirmHide: {
      title: "Skjule kategorien?",
      body: "«{{name}}» forsvinner fra valgene, Grenser-panelet og masseverktøyene på denne telefonen. Poster som allerede ligger under den, beholder den og vises fortsatt der de har forbruk. Gjenopprett den her når som helst.",
    },
  },
};
