/**
 * BudgetArk - Svenska texter: gemensamma modaler (data)
 * File: src/i18n/locales/sv/modalsData.ts
 *
 * Swedish counterpart of en/modalsData.ts. Informal "du" throughout; see
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
    title: "Handlarregler",
    subtitleEmpty:
      "Regler kommer ihåg vad som ska hända när en handlares transaktioner importeras.",
    subtitleCount_one:
      "{{count}} sparad regel. Ändringar gäller framtida importer och allt som ännu ligger i inkorgen - transaktioner du redan hoppat över förblir överhoppade.",
    subtitleCount_other:
      "{{count}} sparade regler. Ändringar gäller framtida importer och allt som ännu ligger i inkorgen - transaktioner du redan hoppat över förblir överhoppade.",
    emptyBody:
      "Inga regler än. Bocka för ”Gör alltid så” i granskningsinkorgen när du godkänner eller hoppar över en transaktion - regeln visas då här, där du kan ändra eller ta bort den när som helst.",
    errors: {
      load: "Kunde inte läsa in dina regler.",
      save: "Kunde inte spara regeln.",
      delete: "Kunde inte ta bort regeln.",
    },
    billOption: "{{name}} · ca {{amount}}",
    debtOption: "{{name}} · min {{amount}}",
    behavior: {
      alwaysSkip: "Hoppa alltid över - importeras aldrig",
      logsDebtPayment: "Loggar en betalning på 💳 {{name}}",
      suggestsDebtPayment: "Föreslår en betalning på 💳 {{name}}",
      autoApproves: "Autogodkänner {{icon}} {{category}}",
      suggests: "Föreslår {{icon}} {{category}}",
      renameAs: "som ”{{name}}”",
      usedCount: "använd {{count}}×",
      deletedDebt: "(borttagen skuld)",
      deletedBusiness: "(borttaget företag)",
      deletedPerson: "(borttagen person)",
      deletedBill: "(borttagen räkning)",
    },
    editor: {
      whenImports: "NÄR DEN HÄR HANDLAREN IMPORTERAS",
      alwaysSkipPill: "🚫 Hoppa alltid över",
      autoApproveHelp:
        "Autogodkänn utan granskning - matchande importer går direkt in i din budget med regelns val. Utan bock väntar de i inkorgen med kategorin som förslag.",
      renameLabel: "BYT NAMN TILL (VALFRITT)",
      renamePlaceholder: "Behåll bankens beskrivning",
      businessLabel: "FÖRETAG",
      personalPill: "Privat",
      peopleLabel: "PERSONER",
      unassignedPill: "Ej tilldelad",
      billLabel: "GÄLLER RÄKNINGEN",
      notABillPill: "Ingen räkning",
      debtHelp:
        "Betalningar till den här handlaren loggas på skulden (saldo och historik på fliken Skulder) i stället för att bokföras som utgift. Kategorin ovan används inte.",
      deleteRule: "Ta bort regel",
      saving: "Sparar...",
    },
    confirmDelete: {
      title: "Ta bort regeln?",
      bodyIgnore:
        "Framtida transaktioner från ”{{merchant}}” importeras till granskningsinkorgen igen. Redan överhoppade kommer inte tillbaka.",
      bodyApprove:
        "Framtida transaktioner från ”{{merchant}}” väntar i granskningsinkorgen på manuellt godkännande. Redan skapade poster ändras inte.",
      bodySuggest:
        "Framtida transaktioner från ”{{merchant}}” kommer utan kategoriförslag. Godkända poster ändras inte.",
      keep: "Behåll",
      deleting: "Tar bort...",
    },
  },
  import: {
    title: "Importera kontoutdrag",
    subtitle:
      "Tala om för BudgetArk vilka kolumner som ska läsas. Appen har gissat - kontrollera förhandsvisningen nedan och rätta det som ser fel ut.",
    accountLabelSection: "KONTOETIKETT",
    accountLabelPlaceholder: "Kontoutdrag",
    accountLabelHint:
      "Visas på varje rad i granskningsinkorgen så att du kan skilja den här importen från din banksynk. Behåll samma etikett när du importerar en fil från den här banken igen - med samma etikett hoppar BudgetArk över rader du redan importerat.",
    columnsSection: "KOLUMNER",
    headerlessHint:
      "Filen har ingen rubrikrad, så kolumnerna är numrerade. Matcha dem med hjälp av förhandsvisningen.",
    field: {
      date: "Datum",
      description: "Beskrivning",
      amount: "Belopp",
      debit: "Pengar ut (debet)",
      credit: "Pengar in (kredit)",
    },
    chooseColumn: "Välj kolumn",
    fieldA11y: "{{label}}: {{value}}",
    fieldA11yEmpty: "{{label}}: välj en kolumn",
    layout: {
      signed: "En beloppskolumn",
      split: "Separat debet / kredit",
    },
    positiveIsOutflow: "Positiva tal är debiteringar (vanligt för kreditkort)",
    previewSection: "FÖRHANDSVISNING",
    noDescription: "(ingen beskrivning)",
    previewReady_one: "{{count}} transaktion klar",
    previewReady_other: "{{count}} transaktioner klara",
    previewSkipped_one: " · {{count}} oläslig rad hoppades över",
    previewSkipped_other: " · {{count}} oläsliga rader hoppades över",
    noPreviewComplete:
      "Inga transaktioner har lästs med de här kolumnerna än. Prova en annan datum- eller beloppskolumn.",
    noPreviewIncomplete:
      "Välj en datum-, en beskrivnings- och en beloppskolumn för att se en förhandsvisning.",
    remember: "Kom ihåg kolumnerna till nästa gång (den här banken)",
    importButton: "Importera",
    importing: "Importerar…",
    pickerTitle: "Välj kolumn",
    errors: {
      noneRead:
        "Inga transaktioner kunde läsas med de här kolumnerna. Kontrollera att datum- och beloppskolumnerna stämmer.",
      generic: "Något gick fel vid importen av kontoutdraget.",
    },
    summary: {
      added_one: "{{count}} tillagd i granskningsinkorgen",
      added_other: "{{count}} tillagda i granskningsinkorgen",
      autoApproved_one: "{{count}} autogodkänd av dina regler",
      autoApproved_other: "{{count}} autogodkända av dina regler",
      autoDismissed_one: "{{count}} överhoppad av dina regler",
      autoDismissed_other: "{{count}} överhoppade av dina regler",
      alreadyKnown_one: "{{count}} redan importerad",
      alreadyKnown_other: "{{count}} redan importerade",
      withParts: "{{label}}: {{parts}}.",
      nothingNew: "{{label}}: inget nytt att importera - varje rad fanns redan här.",
      flaggedDuplicates_one:
        "{{count}} ser ut som en transaktion du redan har - den är flaggad i inkorgen så att du kan hoppa över den.",
      flaggedDuplicates_other:
        "{{count}} ser ut som transaktioner du redan har - de är flaggade i inkorgen så att du kan hoppa över dem.",
      deferred_one:
        "{{count}} fick inte plats (inkorgen rymmer 500 åt gången). Godkänn eller rensa några och importera sedan filen igen för att ta med resten.",
      deferred_other:
        "{{count}} fick inte plats (inkorgen rymmer 500 åt gången). Godkänn eller rensa några och importera sedan filen igen för att ta med resten.",
      rowsSkipped_one: "{{count}} rad hoppades över (oläsligt datum eller belopp)",
      rowsSkipped_other: "{{count}} rader hoppades över (oläsligt datum eller belopp)",
      zeroRows_one: "{{count}} rad med belopp 0 utelämnad",
      zeroRows_other: "{{count}} rader med belopp 0 utelämnade",
    },
  },
  schema: {
    title: "Kalkylbladsformat",
    subtitle:
      "Rubriker matchas oberoende av stora och små bokstäver. CSV-filer innehåller bara bladet Budget Entries. Excel-filer kan innehålla vilket som helst av bladen nedan.",
    tipLabel: "TIPS",
    tipBefore: "Enklaste sättet att lära sig formatet: tryck på ",
    tipAction: "Exportera → Kalkylblad",
    tipAfter:
      " (XLSX), öppna filen i Excel eller Google Kalkylark, redigera och importera igen. ID:n följer med fram och tillbaka, så befintliga rader uppdateras på plats. Även med en tom app är exporten en färdig tom mall - varje blad har rätt rubriker, bara inga rader än.",
    presets: {
      title: "Kommer du från YNAB, Mint eller Monarch?",
      body: "Importera deras transaktions-CSV som den är. BudgetArk känner igen filen på rubrikerna och matchar kolumnerna åt dig.",
      ynab: "• YNAB: Payee, Outflow, Inflow (Category, Memo)",
      mint: "• Mint: Description, Amount, Transaction Type (Category, Notes)",
      monarch: "• Monarch: Merchant, Amount, Original Statement (Category, Notes)",
      categories:
        "• Kategorier matchas mot BudgetArks via nyckelord (Groceries → Grocery); allt annat kommer in som en egen kategori under sitt eget namn.",
      transfers:
        "• Överföringar mellan dina egna konton utelämnas - de är varken inkomst eller utgift. Importsammanfattningen anger hur många.",
    },
    limits: {
      title: "Begränsningar",
      fileSize: "• Filstorlek: max 5 MB",
      rowsPerSheet: "• Upp till 5 000 rader per blad",
      recordsTotal: "• Upp till 6 000 dataposter totalt per import",
      skipped:
        "• Rader som saknar obligatoriska fält hoppas över i tysthet (du ser antalet efter importen).",
    },
    allowedCategories: {
      title: "Tillåtna kategorier",
      body: "Används för både Budget Entries och Budget Limits. Måste matcha exakt.",
    },
    required: "Obligatorisk",
    optional: "Valfri",
    csvTag: "CSV",
    excelOnlyTag: "Endast Excel",
    sheets: {
      entries: {
        description:
          "Kärnbladet - obligatoriskt för både CSV- och Excel-import. CSV-filer innehåller bara det här bladet.",
        footer:
          "Kvittofoton följer aldrig med genom kalkylblad - fotofilerna stannar på enheten som tog dem.",
        columns: {
          id: "UUID skapas automatiskt om det saknas. Behåll det för säker återimport.",
          date: "ISO ÅÅÅÅ-MM-DD, fullständig ISO-tidsstämpel, amerikanskt M/D/ÅÅÅÅ eller Excels eget datumformat.",
          type: "Måste vara income eller expense (oberoende av skiftläge).",
          category: "Måste exakt matcha en tillåten kategori (se listan nedan).",
          amount: "Positivt tal. $ och kommatecken tas bort. (50.00) tolkas som -50.00.",
          description: "Valfri anteckning. Upp till 220 tecken.",
          recurring: "yes / no / true / false / 1 / 0.",
          linkedAccountId: "Tillgångskontots UUID för sparposter.",
          businessId:
            "UUID från bladet Businesses för företagsmärkta utgifter. Följer med vid återimport.",
          business: "Läsbart företagsnamn. Endast vid export - ignoreras vid import.",
          personId:
            "UUID från bladet People för utgifter tilldelade en person (den första av dem vid delade). Följer med vid återimport.",
          personIds:
            "Varje person en delad utgift är tilldelad, som UUID:n separerade med ;. Följer med vid återimport.",
          person: "Läsbara personnamn. Endast vid export - ignoreras vid import.",
          private: "yes markerar en privat post som aldrig synkas till din partner. Följer med vid återimport.",
        },
      },
      limits: {
        description:
          "Månatliga utgiftsgränser per kategori. Importerade gränser hamnar i aktuell månad.",
        columns: {
          category: "En av de tillåtna kategorierna.",
          monthlyLimit: "Positivt tal.",
        },
      },
      debts: {
        description: "Befintliga skulder (kort, lån osv.).",
        columns: {
          id: "Skapas automatiskt om det saknas.",
          name: "Upp till 80 tecken.",
          balance: "Aktuellt återstående saldo, ≥ 0.",
          originalBalance: "Ingående saldo, ≥ 0,01.",
          rate: "Effektiv ränta i procent, 0-200.",
          minPayment: "Månatlig minimibetalning, ≥ 0.",
          owner: "mine / partner / joint. Standard: mine.",
          debtClass:
            "personal_credit / car / house. (Äldre car_house blir house när namnet nämner ett bolån, annars car.)",
          debtClassSource: "manual / inferred.",
          goalDate: "Valfritt måldatum för återbetalning.",
          createdAt: "ISO-tidsstämpel; standard: nu.",
        },
      },
      payments: {
        description: "Enskilda betalningar på en skuld.",
        columns: {
          id: "Skapas automatiskt om det saknas.",
          debtId: "Måste matcha en rads ID i bladet Debts.",
          amount: "Positivt tal, ≥ 0,01.",
          date: "ISO-datum eller amerikanskt M/D/ÅÅÅÅ.",
        },
      },
      savingsGoals: {
        description: "Sparmål som följs upp.",
        columns: {
          id: "Skapas automatiskt om det saknas.",
          name: "Upp till 80 tecken.",
          category: "emergency_fund / travel / home / car / education / other.",
          targetAmount: "Positivt tal.",
          currentAmount: "Tal, ≥ 0.",
          targetDate: "Valfritt måldatum.",
          priority:
            "Rangordning i inköpsplanerarens ”Min ordning” (0 = först). Tom om aldrig rangordnad. Följer med vid återimport.",
          usesPerMonth:
            "Indata för kostnad per användning: förväntade användningar per månad (1-10 000). Tom om ej spårad.",
          usefulLifeYears:
            "Indata för kostnad per användning: år du räknar med att behålla den (upp till 100). Tom om ej spårad.",
          createdAt: "ISO-tidsstämpel; standard: nu.",
          updatedAt:
            "ISO-tidsstämpel för senaste ändring. Följer med så att partnersynken behåller den nyare kopian.",
        },
      },
      assetAccounts: {
        description:
          "Bestående kontosaldon (sparande, pension, HSA, investeringar).",
        columns: {
          id: "Skapas automatiskt om det saknas.",
          name: "Upp till 80 tecken.",
          category: "savings / retirement / hsa / investment / other.",
          balance: "Tal, ≥ 0.",
          emergencyFund:
            "yes markerar ett sparkonto som din buffert. Följer med vid återimport.",
          createdAt: "ISO-tidsstämpel; standard: nu.",
        },
      },
      businesses: {
        description:
          "Företag som utgiftsposter kan märkas med (via BusinessId). Bara aktiva företag exporteras.",
        columns: {
          id: "Skapas automatiskt om det saknas. Budgetposter hänvisar hit via BusinessId.",
          name: "Upp till 40 tecken.",
          createdAt: "ISO-tidsstämpel; standard: nu.",
        },
      },
      people: {
        description:
          "Personer som utgifter kan tilldelas (via PersonId). Bara aktiva personer exporteras.",
        columns: {
          id: "Skapas automatiskt om det saknas. Budgetposter hänvisar hit via PersonId.",
          name: "Upp till 40 tecken.",
          createdAt: "ISO-tidsstämpel; standard: nu.",
        },
      },
      holdings: {
        description:
          "Aktie-/ETF-positioner. Kurser hämtas på enheten och importeras aldrig - bara positionen.",
        columns: {
          id: "Skapas automatiskt om det saknas.",
          symbol: "Ticker, t.ex. AAPL eller VTI. Upp till 12 tecken (bokstäver, siffror, . och -).",
          shares: "Positivt tal. Andelar av aktier tillåtna.",
          costBasis: "Totalt investerat belopp i dollar, ≥ 0. Används för vinst/förlust.",
          createdAt: "ISO-tidsstämpel; standard: nu.",
        },
      },
    },
  },
  categories: {
    title: "Egna kategorier",
    subtitle:
      "Lägg till egna budgetkategorier. De fungerar överallt där de inbyggda gör det - poster, gränser, diagram och rapporter.",
    nameLabel: "NAMN",
    namePlaceholder: "t.ex. Hobbyer, Husdjur, Barnomsorg",
    iconLabel: "IKON",
    pickIconA11y: "Välj ikon {{glyph}}",
    bucketLabel: "50/30/20-HINK",
    addButton: "Lägg till kategori",
    adding: "Lägger till…",
    yourCategories: "DINA KATEGORIER ({{count}})",
    emptyCustom: "Inga egna kategorier än. Lägg till en ovan.",
    deleteA11y: "Ta bort {{name}}",
    builtInLabel: "INBYGGDA KATEGORIER",
    builtInHelp:
      "Dölj dem du aldrig använder. Dolda kategorier försvinner från valen på den här telefonen; befintliga poster behåller dem.",
    alwaysShown: "Visas alltid",
    restore: "Återställ",
    restoreA11y: "Återställ {{name}}",
    hide: "Dölj",
    hideA11y: "Dölj {{name}}",
    confirmDelete: {
      title: "Ta bort kategorin?",
      body: "”{{name}}” tas bort från valen. Befintliga poster behåller kategorin, de förlorar bara den egna ikonen.",
    },
    confirmHide: {
      title: "Dölj kategorin?",
      body: "”{{name}}” försvinner från valen, panelen Gränser och massverktygen på den här telefonen. Poster som redan ligger under den behåller den och visas fortfarande där de har utgifter. Återställ den här när som helst.",
    },
  },
};
