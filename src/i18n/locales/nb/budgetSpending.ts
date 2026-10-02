/**
 * BudgetArk - Norske tekster: Budsjett-fanen (spending)
 * File: src/i18n/locales/nb/budgetSpending.ts
 *
 * Norwegian (Bokmål) counterpart of en/budgetSpending.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetSpending as en } from "../en/budgetSpending";

export const budgetSpending: Localized<typeof en> = {
  spendingCard: {
    title: "Forbruk",
    splitFood: "Del opp Mat ({{count}})",
    limitsA11y: "Sett månedsgrenser for hver kategori",
    tapToExpand: "Trykk på raden for å utvide · ",
    limitsLink: "Grenser ›",
    tapToExpandHold: "Trykk for å utvide · Hold for grense",
    businessOnlyA11y: "Vis bare bedriftsutgifter",
    businessOnlyChip: "💼 Bare bedrift",
    limitsHiddenFiltered: "Grenser skjult mens filteret er på",
    total: "Totalt",
    emptyBusinessTitle: "Ingen bedriftsutgifter denne måneden",
    emptyTitle: "Ingen utgifter denne måneden",
    emptyBusinessSubtext: "Merk en utgift med en bedrift for å se den her.",
    emptySubtext: "Legg til poster for å se forbruksdiagrammet ditt.",
    pace: {
      over: "{{amount}} over grensen",
      atLimit: "På grensen - ingenting igjen denne måneden",
      ahead: "Foran tempoet - i rute ville vært {{amount}} i dag",
      onPace: "I rute - {{amount}} forventet i dag",
    },
    expandedHeader_one: "Utvidet - {{count}} post",
    expandedHeader_other: "Utvidet - {{count}} poster",
    loggedPayment: {
      title: "Logget gjeldsbetaling",
      message:
        "Denne betalingen ble logget på Gjeld-fanen. Åpne betalingshistorikken til gjeldsposten der for å redigere eller slette den.",
    },
    deletedBusiness: "(slettet)",
    owed: " · {{amount}} til gode",
    paidBack: " · tilbakebetalt",
    billFallback: "Regning",
    billEstimate: " · ca. {{amount}}",
    logActualA11y: "Logg faktisk beløp for {{name}}",
    logActual: "Logg faktisk beløp",
    auto: "Auto",
    showMoreA11y_one: "Vis {{count}} post til",
    showMoreA11y_other: "Vis {{count}} poster til",
    showMore_one: "Vis {{count}} post til",
    showMore_other: "Vis {{count}} poster til",
  },
  buckets: {
    title: "50/30/20",
    takeHome: "Nettolønn denne måneden: {{amount}}",
    emptyTitle: "Legg til inntekt for å se 50/30/20-fordelingen",
    emptySubtext: "Logg inntekt fra Lønn eller Frilans for denne måneden.",
    onTarget: "På målet for {{bucket}}",
    overTarget: "{{amount}} over målet for {{bucket}}",
    underTarget: "{{amount}} under målet for {{bucket}}",
    targetChip: "{{percent}} % mål",
    hide: "Skjul",
    show: "Vis",
    emptyBucket: "Ingen utgifter i denne bøtten denne måneden.",
    override: " (tilpasset)",
    reassignHint: "Hold inne en kategori for å bytte bøtte.",
  },
  limits: {
    title: "Månedsgrenser",
    subtitle:
      "{{month}}. En grense du setter her følger med til senere måneder til du endrer den. La et felt stå tomt for ingen grense.",
    loadFailed: "Kunne ikke laste inn grensene dine.",
    saveFailed: "Kunne ikke lagre grensene dine.",
    saving: "Lagrer...",
    copyLastMonth: "Kopier forrige måned",
    useAverages: "Bruk 3-månederssnitt",
    spent: "Brukt {{amount}}",
    avg: "snitt {{amount}}",
    lastMonth: "forrige måned {{amount}}",
    useAverageA11y: "Bruk snittet for {{category}}",
    avgChip: "snitt",
    nonePlaceholder: "ingen",
    limitInputA11y: "Månedsgrense for {{category}}",
    loading: "Laster inn...",
  },
  foodSplit: {
    title: "Del opp matposter",
    subtitle: "Gå gjennom hver utgift i Mat og velg Dagligvarer eller Restaurant.",
    apply: "Bruk oppdelingen",
  },
};
