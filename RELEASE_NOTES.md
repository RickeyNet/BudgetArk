# BudgetArk Release Notes

## v1.0.6 - Security & Encryption (2026-03-12)

- Added AES-256 encryption for all on-device data with HMAC-SHA256 integrity verification — your financial data is now encrypted at rest.
- Encryption keys are stored in the platform secure vault (iOS Keychain / Android Keystore) and cleared from memory when the app is backgrounded.
- Existing data from previous versions is automatically migrated to the encrypted format on first launch — no action needed.
- Added privacy mode toggle in Profile settings to mask sensitive balances on screen.
- Added version guard to prevent downgrade attacks via OTA updates.
- Upgraded to cryptographically strong UUID generation for all identifiers.
- Improved data import validation with stricter schema checks and encrypted storage support.

## v1.0.5 - Build Your Ark Planning Hub (2026-03-10)

- Added Build Your Ark, a unified planning hub that combines Hull (payoff), Deck (emergency coverage), and Supplies (savings goals) in one modal.
- Added side-by-side Avalanche vs Snowball what-if comparisons with extra-payment scenarios, payoff speed, total-interest impact, and strategy recommendations.
- Payoff strategy preference now persists across app restarts instead of resetting to Custom each launch.
- Added savings goals with on-device persistence, quick contribution chips, progress bars, and inline create/delete management.
- Added Deck tracking (formerly runway) with monthly essentials input, coverage status (Deck at risk -> Storm-ready deck), and progress guidance.
- Added Ark phase progress framing (Keel, Hull, Deck, Supplies, Sail) to tie payoff, safety cushion, and goals into one guided journey.
- Added compact Debt Tracker summary chips for Deck and active Supplies goal to keep key planning context visible without screen clutter.
- Improved Debt Milestones readability with a full-screen modal, larger typography, and safe-area-aware spacing on Android and iOS.
- Added recurring budget entries so fixed monthly items can automatically appear in future months while one-off imports remain month-specific.
- Improved theme contrast across dark themes and The Ark, including milestone action buttons and theme selector card readability.

## v1.0.4 - Debt Milestones and UX Polish (2026-03-09)

- Added a new Debt Milestones planner with progress tracking, current-step focus, and completion management.
- Added editable milestone targets with quick adjust chips (+100, +250, +500, -100).
- Completed milestones now collapse into concise cards with congratulatory messages; future steps are collapsed by default and expandable on tap.
- Improved debt and budget modal button visibility on Android devices with bottom navigation bars to avoid keyboard overlap.
- Updated budget category options by adding Fitness and removing Food from add/edit selection bubbles.
- Improved theme selector readability by forcing black theme-name text in onboarding and profile theme pickers.

## v1.0.3 - Shared Debt Planning and Budget Workflow Upgrades (2026-03-08)

- Added debt ownership tracking (Mine, Partner, Joint) with filters and balance summaries for couples.
- Added explicit debt types (Credit/Personal vs Car/House) for Snowball ordering, plus bulk classification tools and review badges for inferred types.
- Added month/year pickers to debt and budget add/edit flows to replace manual date typing.
- Expanded budget categories with Grocery, Restaurant, Tech, Giving, Retirement, and Investing.
- Added a one-time Food split helper to migrate older Food entries into Grocery or Restaurant.

## v1.0.2 - Payment History & Localization (2026-03-07)

- Added Payment History view accessible from the Debt Tracker summary card, showing all recorded payments grouped by month with totals.
- Added "The Ark" theme — a warm cream and brown parchment-inspired color scheme.
- Added multiple currency and locale presets in Settings (USD, EUR, GBP, CAD, JPY).
- Applied locale-aware money formatting across Debt, Budget, Investment, and Payment History screens.
- Persisted currency preference in user profile and included it in data export/import backups.

## v1.0.1 - Debt Payoff Tools (2026-02-20)

- Added debt editing directly from each debt card.
- Added payoff strategies with Avalanche and Snowball prioritization modes.
- Added optional payoff goal dates with required monthly payment guidance.

## v1.0.0 - Initial Release (2026-02-10)

- Launched debt tracking with progress insights.
- Launched budget management with category views.
- Launched investment projections and theme selection.
