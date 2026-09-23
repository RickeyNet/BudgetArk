# BudgetArk localization: conventions and German glossary

Read this before extracting strings or translating. The rules keep the key
tree consistent across parallel work and the German consistent across
screens.

## How strings are wired

- English is the source tree: `src/i18n/locales/en/<fragment>.ts`, one
  fragment per surface, exported `as const`, composed in `en/index.ts`.
- German twins live in `locales/de/<fragment>.ts` typed
  `Localized<typeof en>` - a missing or extra key is a typecheck error.
- Components: `const { t } = useTranslation();` from `react-i18next`, then
  `t("profile.data.exportTitle")`. Never `i18n.t` in a component (it would
  not re-render on a language change).
- Interpolation: `{{name}}` in the string, `t(key, { name })` at the call.
  Keep every placeholder in the German string (a Jest test checks this).
- Plurals: `count` option with `_one` / `_other` key suffixes:
  `entries_one: "{{count}} entry"`, `entries_other: "{{count}} entries"`,
  called as `t("x.entries", { count })`.
- Key names: camelCase, nested by surface, named for MEANING not the
  English words (`confirmReset.title`, not `areYouSure`). Reuse
  `common.*` for Done / Cancel / Save / Delete / OK / On / Off / Yes / No.
- Text inside `if (__DEV__)` console calls stays English (rule 14 - it is
  developer output, never shown to users).
- Plain modules (src/utils, src/sync, src/services, src/notifications,
  src/data) cannot use hooks: they import `t` / `currentLanguage()` from
  `src/i18n/translate.ts` (the global instance). Never evaluate `t` at
  module load - export a function or an object getter so the language is
  read at call time. A component that memoizes such a helper's output must
  list its own `t` in the dependency array (with a justified
  `react-hooks/exhaustive-deps` disable, since the linter cannot see the
  dependency). Jest initialises the global instance with the English tree
  (`src/i18n/jestSetup.ts`), so util tests keep asserting English text.

## Never translate

- Storage keys (`@budgetark_*`), route names (`Utilities`), feature ids,
  achievement ids, `BUDGET_CATEGORIES` values (persisted + synced; add a
  display-name lookup instead), theme names (The Ark, Forest Gold, ...),
  language names (shown in their own language), product names (SimpleFIN,
  Teller, Robinhood, YNAB, Mint, Monarch, Amazon), "BudgetArk" itself.
- OTA release-note messages (`tryParseReleaseNoteFromMessage` is a wire
  contract).

## German tone

Informal **du** everywhere (the DACH consumer-finance norm: N26, Finanzguru).
Never mix in "Sie". Imperatives for buttons ("Speichern", not "Du speicherst").
Keep it short: German runs ~30% longer and the layouts were sized for
English - prefer "Sichern" over "Sicherung erstellen" where meaning
survives.

## German glossary (use these, don't improvise)

| English | German |
| --- | --- |
| Debts (tab) | Schulden |
| Budget (tab) | Budget |
| Bridge (tab, the ship's bridge) | Brücke |
| Charts (tab, nautical charts) | Karten |
| Profile (tab) | Profil |
| Ark (the app metaphor) | Arche |
| debt / a debt | Schuld / eine Schuld (plural: Schulden) |
| payment | Zahlung |
| budget entry / entry | Buchung |
| expense | Ausgabe |
| income | Einnahme |
| recurring (bill) | wiederkehrend (wiederkehrende Buchung) |
| bill | Rechnung |
| category | Kategorie |
| spending limit / limit | Ausgabenlimit / Limit |
| account | Konto |
| asset account | Vermögenskonto |
| checking account | Girokonto |
| savings account | Sparkonto |
| credit card | Kreditkarte |
| balance | Kontostand (bank) / Saldo (debt) |
| net worth | Nettovermögen |
| emergency fund | Notgroschen |
| savings goal | Sparziel |
| milestone | Meilenstein |
| payoff strategy (avalanche / snowball) | Tilgungsstrategie (Lawine / Schneeball) |
| interest rate / APR | Zinssatz / effektiver Jahreszins |
| minimum payment | Mindestrate |
| partner sync | Partner-Sync |
| pair / paired / unpair | koppeln / gekoppelt / entkoppeln |
| sync now | Jetzt synchronisieren |
| backup / back up | Sicherung / sichern |
| restore | wiederherstellen |
| export / import | exportieren / importieren |
| reset all data | Alle Daten zurücksetzen |
| receipt (photo) | Beleg |
| business expense | Geschäftsausgabe |
| bank connection | Bankverbindung |
| review inbox | Prüfposteingang |
| merchant | Händler |
| achievement / badge | Erfolg / Abzeichen |
| lesson | Lektion |
| streak | Serie |
| privacy mode | Privatsphäre-Modus |
| app lock / PIN | App-Sperre / PIN |
| notifications / reminder | Benachrichtigungen / Erinnerung |
| release notes / what's new | Versionshinweise / Neuigkeiten |
| update (OTA) | Update |
| tip jar | Trinkgeldkasse |
| currency | Währung |
| exchange rate | Wechselkurs |
| holdings (stocks) | Wertpapiere |
| purchase planner / sinking fund | Anschaffungsplaner / Ansparposten |
| take-home pay | Nettogehalt |
| person / people ("who spent this") | Person / Personen |
| safe to spend | Verfügbar |
| carry over / rollover | übertragen / Übertrag |
| Done / Cancel / Save / Delete | Fertig / Abbrechen / Speichern / Löschen |
| On / Off | Ein / Aus |
| Learn more | Mehr erfahren |
| Got it | Verstanden |
