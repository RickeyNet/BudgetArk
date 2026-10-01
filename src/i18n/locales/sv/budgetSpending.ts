/**
 * BudgetArk - Svenska texter: Budget-fliken (spending)
 * File: src/i18n/locales/sv/budgetSpending.ts
 *
 * Swedish counterpart of en/budgetSpending.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetSpending as en } from "../en/budgetSpending";

export const budgetSpending: Localized<typeof en> = {
  spendingCard: {
    title: "Utgifter",
    splitFood: "Dela upp Mat ({{count}})",
    limitsA11y: "Sätt månadsgränser för varje kategori",
    tapToExpand: "Tryck på raden för att fälla ut · ",
    limitsLink: "Gränser ›",
    tapToExpandHold: "Tryck för att fälla ut · Håll för gräns",
    businessOnlyA11y: "Visa bara företagsutgifter",
    businessOnlyChip: "💼 Bara företag",
    limitsHiddenFiltered: "Gränser dolda medan filter är på",
    total: "Totalt",
    emptyBusinessTitle: "Inga företagsutgifter den här månaden",
    emptyTitle: "Inga utgifter den här månaden",
    emptyBusinessSubtext: "Märk en utgift med ett företag för att se den här.",
    emptySubtext: "Lägg till poster för att se ditt utgiftsdiagram.",
    pace: {
      over: "{{amount}} över gränsen",
      atLimit: "Vid gränsen - inget kvar den här månaden",
      ahead: "Före takten - i fas hade varit {{amount}} idag",
      onPace: "I fas - {{amount}} väntat idag",
    },
    expandedHeader_one: "Utfälld - {{count}} post",
    expandedHeader_other: "Utfälld - {{count}} poster",
    loggedPayment: {
      title: "Loggad skuldbetalning",
      message:
        "Den här betalningen loggades på fliken Skulder. Öppna skuldens betalningshistorik där för att redigera eller ta bort den.",
    },
    deletedBusiness: "(borttaget)",
    owed: " · {{amount}} att få",
    paidBack: " · återbetalt",
    billFallback: "Räkning",
    billEstimate: " · ca {{amount}}",
    logActualA11y: "Logga faktiskt belopp för {{name}}",
    logActual: "Logga faktiskt belopp",
    auto: "Auto",
    showMoreA11y_one: "Visa {{count}} post till",
    showMoreA11y_other: "Visa {{count}} poster till",
    showMore_one: "Visa {{count}} post till",
    showMore_other: "Visa {{count}} poster till",
  },
  buckets: {
    title: "50/30/20",
    takeHome: "Nettolön den här månaden: {{amount}}",
    emptyTitle: "Lägg till inkomst för att se 50/30/20-fördelningen",
    emptySubtext: "Logga inkomst från Lön eller Frilans för den här månaden.",
    onTarget: "På målet för {{bucket}}",
    overTarget: "{{amount}} över målet för {{bucket}}",
    underTarget: "{{amount}} under målet för {{bucket}}",
    targetChip: "{{percent}} % mål",
    hide: "Dölj",
    show: "Visa",
    emptyBucket: "Inga utgifter i den här hinken den här månaden.",
    override: " (anpassad)",
    reassignHint: "Håll in en kategori för att byta hink.",
  },
  limits: {
    title: "Månadsgränser",
    subtitle:
      "{{month}}. En gräns du sätter här följer med till senare månader tills du ändrar den. Lämna ett fält tomt för ingen gräns.",
    loadFailed: "Kunde inte läsa in dina gränser.",
    saveFailed: "Kunde inte spara dina gränser.",
    saving: "Sparar...",
    copyLastMonth: "Kopiera förra månaden",
    useAverages: "Använd 3-månaderssnitt",
    spent: "Spenderat {{amount}}",
    avg: "snitt {{amount}}",
    lastMonth: "förra månaden {{amount}}",
    useAverageA11y: "Använd snittet för {{category}}",
    avgChip: "snitt",
    nonePlaceholder: "ingen",
    limitInputA11y: "Månadsgräns för {{category}}",
    loading: "Läser in...",
  },
  foodSplit: {
    title: "Dela upp matposter",
    subtitle: "Granska varje utgift i Mat och välj Matvaror eller Restaurang.",
    apply: "Tillämpa uppdelning",
  },
};
