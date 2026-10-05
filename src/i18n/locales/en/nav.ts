/**
 * BudgetArk - English strings: navigation
 * File: src/i18n/locales/en/nav.ts
 *
 * Bottom-tab labels. Keys are the ROUTE names from RootTabParamList
 * (`Utilities` is displayed as "Charts" - the route key never changes, see
 * AppNavigator), so the navigator can look a label up by `route.name`.
 */

export const nav = {
  tabs: {
    DebtTracker: "Debts",
    Budget: "Budget",
    Bridge: "Bridge",
    Utilities: "Charts",
    Profile: "Profile",
  },
} as const;
