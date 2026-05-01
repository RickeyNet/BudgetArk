# BudgetArk Release Notes

## v1.4.1 - Update Prompt Fix, Bridge Tab & Celebration (2026-04-30)

- Added **The Bridge**, a new default home tab centered in the navigation bar for net worth, account balances, and progress at a glance.
- Moved net worth history and the Accounts section out of Budget into The Bridge so the Budget screen stays focused on income, expenses, and monthly review.
- Fixed Budget spending chart colors so categories keep stable, distinct colors instead of starting to repeat after several slices.
- Fixed the OTA update prompt to show the correct incoming app version and matching release notes instead of falling back to the installed build version.
- Added a debt payoff celebration screen with confetti, payoff stats, and a quick shortcut to payment history when a balance reaches zero.
- Improved update metadata parsing so release notes resolve from update-specific version fields first.
- Added **Export Spreadsheet** and **Import Spreadsheet** in Profile → Data so you can move budget data to and from Google Sheets, Excel, or CSV files. CSV covers budget entries; Excel exports a full multi-sheet backup including debts, payments, savings goals, and asset accounts.
- Spreadsheet imports now also restore savings goals and asset accounts — the Excel format is a full round-trip backup.
- Added an in-app format reference for spreadsheet imports so you can see the required columns and allowed categories before importing.
- Backup export and import are now a complete round-trip — savings goals, asset accounts, milestone progress, payoff strategy, net worth history, and full per-month budget limit history are all preserved.
- **Reset All Data** now actually clears everything — asset accounts and milestone progress are no longer left behind.
- Fixed a quiet bug where lowering a tracked savings reserve created a correction entry that couldn't be re-imported from a backup. Backups now round-trip cleanly even after savings adjustments.
- Updated build-time dependencies (postcss and uuid) to address two security advisories. Build tooling only — no in-app behavior changes.

## v1.4.0 - Net Worth History & Monthly Insights (2026-04-30)

- Added net worth history to the top of the Budget screen with current net worth, assets, debt, and 7D / 30D / All timeline views.
- Net worth now saves daily snapshots automatically so your history graph starts building from current balances and keeps updating over time.
- Added a Monthly Insight spotlight card on the Budget screen so the biggest spending trend shows before opening the full review.
- Added Category Spending Comparison in Monthly Review to compare this month's category spend against the trailing 3-month average.
- Fixed linked account balances so deleting or editing linked budget entries properly reverses and reapplies account contributions.
- Fixed debt payment handling so recorded payments no longer risk double-applying balance changes.

## v1.3.3 - Utilities Hub & Asset Tracking (2026-04-01)

### Utilities Tab
- Replaced the Investments tab with a new Utilities hub containing collapsible financial tools.
- **Compound Interest Calculator** — now includes S&P 500 return presets (Savings 2%, Bonds 4%, S&P 500 7%, Aggressive 10%), a "Why 7%?" educational card explaining inflation-adjusted returns, and a Rule of 72 insight showing how quickly your money doubles.
- **Loan/Mortgage Calculator** — enter loan amount, interest rate, and term to see monthly payments with a principal vs interest breakdown and visual ratio bar. Includes 15, 20, and 30-year term presets.
- **Emergency Fund Calculator** — automatically pulls your average monthly expenses from the last 6 months of budget data. Shows progress toward 3-month and 6-month savings targets with a monthly savings slider and time-to-reach estimates.

### Asset Account Tracking
- Added asset accounts on the Budget screen for tracking savings, 401k/retirement, HSA, investment, and other account balances.
- Asset accounts are persistent balances that don't count as monthly budget entries but are included in net worth calculations.
- Asset accounts sync between paired devices via the existing peer-to-peer sync system.
- Emergency fund savings goal now appears automatically in the Accounts section on the Budget screen.
- Savings, Retirement, and Investing budget entries can now be linked to a specific asset account — contributions are added to the account balance on save.
- Recurring budget entries linked to an account automatically contribute to that account's balance each month.

### Bug Fixes & Polish
- Fixed scroll freeze when opening the edit budget entry modal — form rendering is now deferred until the modal animation completes.
- Centered page titles and subtitles across all screens (Debt Tracker, Budget, Utilities, Profile).
- Updated onboarding to reflect the new Utilities tab.

### Security & Reliability
- Added 5-second timeout protection on all storage operations to prevent app freezes from degraded flash storage or backed-up I/O queues.
- Hardened OTA update version guard — updates with missing version metadata are now blocked (fail-closed) to prevent downgrade attacks. Fresh installs without version metadata are still allowed.
- Importing a backup older than 30 days now shows a staleness warning so you know the data may be outdated. The import still proceeds — the warning is informational only.
- Added explicit bounds checks on all financial calculation inputs (balance capped at $1B, rate at 200%, payments at $1M, years at 100) to prevent Infinity/NaN from cascading into the UI.

## v1.2.2 - Bug Fixes & Ark Build Expansion (2026-03-31)

### Bug Fixes
- Fixed Keel savings not reflecting in the Budget screen total savings display.
- Fixed Build Your Ark plan requiring a long-press to open — now opens on a single tap.
- Fixed savings log only allowing additions — you can now set an exact savings amount or adjust down with -$50 / -$100 quick buttons.

### Ark Build Expansion
- Expanded Build Your Ark from 5 steps to 7, following a complete financial milestone journey:
  1. **Keel** — Save $1,000 for a starter emergency fund.
  2. **Hull** — Pay off all debt except the house using the debt snowball.
  3. **Deck** — Save 3 to 6 months of living expenses for a fully funded emergency fund.
  4. **Supplies** — Invest 15% of household income for retirement.
  5. **Gather Animals** — Save for your children's college education.
  6. **Moorings** — Pay off your home early.
  7. **Sail** — Build wealth and give.
- Moved payoff strategy comparison (Avalanche vs Snowball) into the Hull milestone step so planning and progress live in one place.
- Existing milestone progress is automatically preserved when upgrading — new steps are added without losing any data.
- Added monthly budget summary graph showing income vs expenses across recent months.
- Emergency fund balance now reflects consistently across Budget and Debt Tracker tabs.

## v1.2.1 - Bug Fixes & Polish (2026-03-28)

- Fixed edit budget modal scroll freeze after selecting a category pill.
- Fixed extra bottom padding in edit budget modal on devices without a navigation bar.
- Debt cards now collapse by default — only the priority payoff debt is expanded based on your chosen strategy.
- Income entries moved inline into the summary card for a cleaner budget layout.
- Spending section redesigned — donut chart and category rows in one card, tap any row to expand entries.
- Profile screen reorganized — Send Feedback at top, Data/Settings/About sections consolidated.
- Restored missing Auto Updates toggle in Profile settings.

## v1.2.0 - Minimalist UI Redesign (2026-03-28)

- Redesigned Debt Tracker — owner summary row now doubles as a filter (tap to filter and see amounts), milestone bar absorbs strategy label and Deck/Supplies chips into one row, and the progress ring opens payment history on tap.
- Redesigned Budget — donut chart and category list merged into one unified section with color-coded rows. Long-press any category to set a spending limit. Split Food action moved to a compact link in the section header instead of a full-width button.
- Redesigned Profile — grouped Theme, Currency, and Privacy Mode into a single Appearance card. Compressed Partner Sync from five rows to three (partner info, sync now, unpair). Consolidated Updates, Release Notes, Feedback, and Reset into an About card. Removed standalone How-To Docs, Feedback, Privacy, and What's New sections.
- Added floating action buttons (FAB) on Debt Tracker and Budget screens for quick access to adding entries, replacing the inline header buttons.
- OTA update prompt now shows the app version and what's new from the release notes instead of raw update metadata (ID, runtime version).
- Removed the standalone How-To Docs modal — help guidance will be added inline to Export, Import, and Sync flows in a future update.

## v1.1.0 - Partner Sync & Feedback (2026-03-23)

- Added peer-to-peer sync for couples — share budgets, debts, and savings goals directly between phones over WiFi with no server or account required.
- One-time device pairing with a 6-digit code and PBKDF2 key exchange. All sync traffic is AES-256 encrypted with HMAC integrity verification.
- Sync Now button for on-demand data exchange — both devices see the same debts, payments, budget entries, savings goals, and milestone progress.
- Optional auto-sync when both phones are on your home WiFi network. Set your home network once and syncing happens automatically in the foreground.
- Added in-app feedback — report bugs or suggest features directly from Profile. Your message is sent via your email app with device info auto-attached.
- Added a link to GitHub Issues for public bug tracking and feature requests.
- Added updatedAt timestamps to all record types for accurate conflict resolution using last-write-wins per record.
- Existing data is automatically migrated to include timestamps on first launch — no action needed.
- Squashed some bugs and improved overall stability.

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
