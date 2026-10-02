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

## Russian and Ukrainian

Both use CLDR plurals one / few / many / other: every English `x_one` needs
`x_one`, `x_few`, `x_many` AND `x_other` (typed `LocalizedPlural<typeof en>`
in `locales/types.ts`; the parity test checks it). `_one` = 1, 21, 31...;
`_few` = 2-4, 22-24...; `_many` = 0, 5-20, 25-30...; `_other` = fractions.
Write all four even when two coincide.

Tone: informal **ты** / **ти**, matching the German "du". Imperatives for
buttons. Ukrainian is written as Ukrainian, never as transliterated Russian:
use рахунок / картка / витрати / застосунок / налаштування, apostrophes
(зв'язати), і/ї/є correctly. Keep both short - Cyrillic runs long on chips
and tab labels. Product names (SimpleFIN, Teller, YNAB, Mint, Monarch,
Robinhood, Amazon, BudgetArk), theme names and category ids never change.
Currency and number formatting come from the code; only words move.

| English | Russian | Ukrainian |
| --- | --- | --- |
| Debts (tab) | Долги | Борги |
| Budget (tab) | Бюджет | Бюджет |
| Bridge (tab, the ship's bridge) | Мостик | Місток |
| Charts (tab, nautical charts) | Карты | Карти |
| Profile (tab) | Профиль | Профіль |
| Ark (the app metaphor) | Ковчег | Ковчег |
| debt / debts | долг / долги | борг / борги |
| payment | платёж | платіж |
| budget entry / entry | запись | запис |
| expense / income | расход / доход | витрата / дохід |
| recurring (bill) | регулярный (регулярный счёт) | регулярний (регулярний рахунок) |
| bill | счёт | рахунок |
| category | категория | категорія |
| spending limit / limit | лимит расходов / лимит | ліміт витрат / ліміт |
| account | счёт | рахунок |
| asset account | счёт активов | рахунок активів |
| checking / savings account | текущий / сберегательный счёт | поточний / ощадний рахунок |
| credit card | кредитная карта | кредитна картка |
| balance | баланс | баланс |
| net worth | чистые активы | чисті активи |
| emergency fund | резервный фонд | резервний фонд |
| savings goal | цель накоплений | ціль заощаджень |
| milestone | этап | етап |
| payoff strategy (avalanche / snowball) | стратегия погашения (лавина / снежный ком) | стратегія погашення (лавина / снігова куля) |
| interest rate / APR | процентная ставка / годовая ставка | відсоткова ставка / річна ставка |
| minimum payment | минимальный платёж | мінімальний платіж |
| partner sync | синхронизация с партнёром | синхронізація з партнером |
| pair / paired / unpair | связать / связано / отвязать | зв'язати / зв'язано / від'єднати |
| sync now | Синхронизировать | Синхронізувати |
| backup / back up | резервная копия / создать копию | резервна копія / створити копію |
| restore | восстановить | відновити |
| export / import | экспорт / импорт | експорт / імпорт |
| reset all data | Сбросить все данные | Скинути всі дані |
| receipt (photo) | чек | чек |
| business expense | деловой расход | бізнес-витрата |
| bank connection | подключение банка | підключення банку |
| review inbox | Входящие на проверку | Вхідні на перевірку |
| merchant | продавец | продавець |
| achievement / badge | достижение / значок | досягнення / значок |
| lesson | урок | урок |
| streak | серия | серія |
| privacy mode | режим приватности | режим приватності |
| app lock / PIN | блокировка приложения / PIN | блокування застосунку / PIN |
| notifications / reminder | уведомления / напоминание | сповіщення / нагадування |
| release notes / what's new | что нового | що нового |
| update (OTA) | обновление | оновлення |
| tip jar | копилка для чаевых | скарбничка на чайові |
| currency / exchange rate | валюта / курс валют | валюта / курс валют |
| holdings (stocks) | ценные бумаги | цінні папери |
| purchase planner / sinking fund | планировщик покупок / накопление на цель | планувальник покупок / накопичення на ціль |
| take-home pay | зарплата на руки | зарплата на руки |
| person / people | человек / люди | людина / люди |
| safe to spend | Можно потратить | Можна витратити |
| carry over / rollover | перенести / перенос | перенести / перенесення |
| Done / Cancel / Save / Delete | Готово / Отмена / Сохранить / Удалить | Готово / Скасувати / Зберегти / Видалити |
| On / Off | Вкл. / Выкл. | Увімк. / Вимк. |
| Learn more / Got it | Подробнее / Понятно | Докладніше / Зрозуміло |
| Keel / Hull / Deck / Supplies / Gather the animals / Anchor / Sail (milestones) | Киль / Корпус / Палуба / Припасы / Собрать животных / Якорь / Парус | Кіль / Корпус / Палуба / Припаси / Зібрати тварин / Якір / Вітрило |
| Build Your Ark | Построй свой Ковчег | Побудуй свій Ковчег |
| Ship's Log | Судовой журнал | Судновий журнал |
| Debt Tracker | Учёт долгов | Облік боргів |
| Live Holdings | Живые котировки | Живі котирування |
| Quick Entry (widget) | Быстрая запись | Швидкий запис |
| Owed to You / loan / lent | Тебе должны / заём / одолжено | Тобі винні / позика / позичено |
| business / businesses | бизнес / Бизнесы | бізнес / Бізнеси |
| custom category / built-in | своя категория / встроенная | власна категорія / вбудована |
| bucket (50/30/20 group) | корзина | кошик |
| Needs / Wants / Savings | Нужды / Желания / Сбережения | Потреби / Бажання / Заощадження |
| transaction (bank) | операция | операція |
| connection / provider | подключение / провайдер | підключення / провайдер |
| map / mapping (accounts) | привязать / привязка | прив'язати / прив'язка |
| merchant rule / auto-approve | правило продавца / автоодобрение | правило продавця / автосхвалення |
| Approve / Skip (inbox) | Подтвердить / Пропустить | Підтвердити / Пропустити |
| Insights | Аналитика | Аналітика |
| Cash Flow / Monthly Review / Until Payday | Денежный поток / Итоги месяца / До зарплаты | Грошовий потік / Підсумки місяця / До зарплати |
| Tracking reminders | Напоминания об учёте | Нагадування про облік |
| automatic backups / Merge / Replace | автоматические копии / Объединить / Заменить | автоматичні копії / Об'єднати / Замінити |
| Onboarding (guide) / feature tour | Знакомство / Тур по функциям | Знайомство / Тур функціями |
| tip tiers (small / medium / generous) | Небольшие / Средние / Щедрые чаевые | Невеликі / Середні / Щедрі чайові |
| NEW badge / Keep going | НОВОЕ / Продолжить | НОВЕ / Продовжити |
| keep-alive watch (cards) | контроль активности | контроль активності |
| Captain's Course / chapter | Курс капитана / глава | Курс капітана / розділ |
| Subscription Detective / Personal Inflation | Детектив подписок / Личная инфляция | Детектив підписок / Особиста інфляція |
| What-If tool | «А что, если» | «А що, якби» |
| break-even / closing costs / lifetime interest | точка окупаемости / расходы на оформление / проценты за весь срок | точка окупності / витрати на оформлення / відсотки за весь термін |
| filing status / head of household | статус подачи / глава семьи | статус подання / голова сім'ї |
| Ambient backgrounds / Solid / Glass | Фоновые эффекты / Сплошной / Стекло | Фонові ефекти / Суцільний / Скло |
| density Compact / Comfortable / Spacious | Компактная / Обычная / Просторная | Компактна / Звичайна / Простора |
| categories: Grocery / Utilities / Giving / Other / Debt Payments | Продукты / Коммунальные / Пожертвования / Прочее / Платежи по долгам | Продукти / Комунальні / Пожертви / Інше / Платежі за боргами |
| units: yr / mo / min / hr / ago | г. / мес / мин / ч / назад | р. / міс / хв / год / тому |
| APR (card lines) / est. | % годовых / ≈ | % річних / ≈ |
| Spending Pace | Темп трат | Темп витрат |
| Purchase Plans / Plan a Purchase | Планы покупок / Планирование покупки | Плани покупок / Планування покупки |
| Mine / Partner / Joint (debt owner) | Мои / Партнёра / Общие | Мої / Партнера / Спільні |
| starter cushion | стартовая подушка | стартова подушка |
| Log actual / Applies to bill / Always do this | Записать факт / Относится к счёту / Всегда так | Записати факт / Стосується рахунку / Завжди так |
| net worth snapshot / starting balance | снимок чистых активов / начальный баланс | знімок чистих активів / початковий баланс |
| high-yield (savings) account | накопительный счёт | накопичувальний рахунок |

## Swedish

Swedish plurals are one / other, exactly like English and German: fragments
are typed `Localized<typeof en>` in `locales/sv/`. Tone: informal **du**
(the only register in Swedish consumer apps), imperatives for buttons
("Spara", not "Du sparar"). Sentence case everywhere - Swedish never
capitalises title words ("Bygg din ark", not "Bygg Din Ark"). Compounds are
written as one word (särskrivning is a spelling error: "sparkonto", never
"spar konto"). Keep it short: Swedish runs ~15% longer than English. Use
the ASCII hyphen "-" as a dash like the other locales, plain "..." never "…"
unless English has it, and keep product names (SimpleFIN, Teller, YNAB,
Mint, Monarch, Robinhood, Amazon, BudgetArk), theme names and category ids
unchanged. Currency and number formatting come from the code.

| English | Swedish |
| --- | --- |
| Debts (tab) | Skulder |
| Budget (tab) | Budget |
| Bridge (tab, the ship's bridge) | Bryggan |
| Charts (tab, nautical charts) | Sjökort |
| Profile (tab) | Profil |
| Ark (the app metaphor) | Arken (din ark) |
| debt / debts | skuld / skulder |
| payment | betalning |
| budget entry / entry | post (plural: poster) |
| expense / income | utgift / inkomst |
| recurring (bill) | återkommande (återkommande post) |
| bill | räkning |
| category | kategori |
| spending limit / limit | utgiftsgräns / gräns |
| account | konto |
| asset account | tillgångskonto |
| checking / savings account | lönekonto / sparkonto |
| credit card | kreditkort |
| balance | saldo |
| net worth | nettoförmögenhet |
| emergency fund | buffert |
| savings goal | sparmål |
| milestone | milstolpe |
| payoff strategy (avalanche / snowball) | återbetalningsstrategi (lavin / snöboll) |
| interest rate / APR | ränta / effektiv ränta |
| minimum payment | minimibetalning |
| partner sync | partnersynk |
| pair / paired / unpair | koppla ihop / ihopkopplad / koppla från |
| sync now | Synka nu |
| backup / back up | säkerhetskopia / säkerhetskopiera |
| restore | återställ |
| export / import | exportera / importera |
| reset all data | Nollställ all data |
| receipt (photo) | kvitto |
| business expense | företagsutgift |
| bank connection | bankkoppling |
| review inbox | granskningsinkorg (short: inkorg) |
| merchant | handlare |
| achievement / badge | utmärkelse / märke |
| lesson | lektion |
| streak | svit |
| privacy mode | sekretessläge |
| app lock / PIN | applås / PIN-kod |
| notifications / reminder | aviseringar / påminnelse |
| release notes / what's new | versionsinformation / nyheter |
| update (OTA) | uppdatering |
| tip jar | dricksburk |
| currency / exchange rate | valuta / växelkurs |
| holdings (stocks) | innehav |
| purchase planner / sinking fund | inköpsplanerare / målsparande |
| take-home pay | nettolön |
| person / people | person / personer |
| safe to spend | Kvar att spendera |
| carry over / rollover | för över / överföring |
| Done / Cancel / Save / Delete | Klar / Avbryt / Spara / Ta bort |
| On / Off | På / Av |
| Learn more / Got it | Läs mer / Uppfattat |
| Keel / Hull / Deck / Supplies / Gather the animals / Anchor / Sail (milestones) | Köl / Skrov / Däck / Förråd / Samla djuren / Ankare / Segel |
| Build Your Ark | Bygg din ark |
| Ship's Log | Loggbok |
| Debt Tracker | Skuldkoll |
| Live Holdings | Innehav i realtid |
| Quick Entry (widget) | Snabbregistrering |
| Owed to You / loan / lent | Att få tillbaka / lån / utlånat |
| business / businesses | företag / Företag |
| custom category / built-in | egen kategori / inbyggd |
| bucket (50/30/20 group) | hink |
| Needs / Wants / Savings | Behov / Önskemål / Sparande |
| transaction (bank) | transaktion |
| connection / provider | koppling / leverantör |
| map / mapping (accounts) | matcha / matchning |
| merchant rule / auto-approve | handlarregel / autogodkänn |
| Approve / Skip (inbox) | Godkänn / Hoppa över |
| Insights | Insikter |
| Cash Flow / Monthly Review / Until Payday | Kassaflöde / Månadsöversikt / Till lönen |
| Tracking reminders | Loggpåminnelser |
| automatic backups / Merge / Replace | automatiska säkerhetskopior / Slå ihop / Ersätt |
| Onboarding (guide) / feature tour | Introduktion / Funktionsrundtur |
| tip tiers (small / medium / generous) | Liten / Mellan / Generös dricks |
| NEW badge / Keep going | NYTT / Fortsätt |
| keep-alive watch (cards) | aktivitetsbevakning |
| Captain's Course / chapter | Kaptenskursen / kapitel |
| Subscription Detective / Personal Inflation | Prenumerationsdetektiven / Personlig inflation |
| What-If tool | Tänk om |
| break-even / closing costs / lifetime interest | brytpunkt / uppläggningskostnader / total ränta över löptiden |
| filing status / head of household | deklarationsstatus / familjeförsörjare |
| Ambient backgrounds / Solid / Glass | Bakgrundseffekter / Enfärgad / Glas |
| density Compact / Comfortable / Spacious | Kompakt / Bekväm / Luftig |
| categories: Grocery / Utilities / Giving / Other / Debt Payments | Matvaror / El & vatten / Gåvor / Övrigt / Skuldbetalningar |
| units: yr / mo / min / hr / ago | år / mån / min / tim / sedan |
| APR (card lines) / est. | % ränta / ca |
| Spending Pace | Utgiftstakt |
| Purchase Plans / Plan a Purchase | Inköpsplaner / Planera ett inköp |
| Mine / Partner / Joint (debt owner) | Mina / Partnerns / Gemensamma |
| starter cushion | startbuffert |
| Log actual / Applies to bill / Always do this | Logga faktiskt belopp / Gäller räkningen / Gör alltid så |
| net worth snapshot / starting balance | ögonblicksbild av nettoförmögenheten / ingående saldo |
| high-yield (savings) account | sparkonto med hög ränta |

## Norwegian (Bokmål)

Locale id `nb`. Plurals are one / other like English, German and Swedish,
so fragments are typed `Localized<typeof en>` in `locales/nb/`. Device
tags `nb-NO`, `nn-NO` and the legacy `no` all resolve to it (pickLanguage
aliases nn/no → nb). Tone: informal **du**, imperatives for buttons
("Lagre", not "Du lagrer"). Sentence case everywhere, compounds written as
one word ("sparekonto", never "spare konto"). Norwegian quotation marks are
«…»; percent takes a space ("15 %"); decimal comma in numeric placeholders
("0,00"). Keep the ASCII hyphen "-" as a dash like the other locales and
keep strings roughly as short as the English. Product names, theme names
and category ids never change. Swedish is the closest shipped locale - use
it as a second reference for meaning and length, but translate from the
English and never leave Swedish spellings behind (ikke "och", "är", "på
svenska").

| English | Norwegian |
| --- | --- |
| Debts (tab) | Gjeld |
| Budget (tab) | Budsjett |
| Bridge (tab, the ship's bridge) | Broen |
| Charts (tab, nautical charts) | Sjøkart |
| Profile (tab) | Profil |
| Ark (the app metaphor) | Arken (arken din) |
| debt / a debt / debts | gjeld / en gjeldspost / gjeldsposter |
| payment | betaling |
| budget entry / entry | post (plural: poster) |
| expense / income | utgift / inntekt |
| recurring (bill) | gjentakende (gjentakende post) |
| bill | regning |
| category | kategori |
| spending limit / limit | forbruksgrense / grense |
| account | konto |
| asset account | eiendelskonto |
| checking / savings account | brukskonto / sparekonto |
| credit card | kredittkort |
| balance | saldo |
| net worth | nettoformue |
| emergency fund | buffer |
| savings goal | sparemål |
| milestone | milepæl |
| payoff strategy (avalanche / snowball) | nedbetalingsstrategi (snøskred / snøball) |
| interest rate / APR | rente / effektiv rente |
| minimum payment | minstebetaling |
| partner sync | partnersynk |
| pair / paired / unpair | koble sammen / sammenkoblet / koble fra |
| sync now | Synk nå |
| backup / back up | sikkerhetskopi / ta sikkerhetskopi |
| restore | gjenopprett |
| export / import | eksporter / importer |
| reset all data | Nullstill alle data |
| receipt (photo) | kvittering |
| business expense | bedriftsutgift |
| bank connection | banktilkobling |
| review inbox | gjennomgangsinnboks (short: innboks) |
| merchant | forhandler |
| achievement / badge | prestasjon / merke |
| lesson | leksjon |
| streak | rekke |
| privacy mode | personvernmodus |
| app lock / PIN | applås / PIN-kode |
| notifications / reminder | varsler / påminnelse |
| release notes / what's new | versjonsinformasjon / nyheter |
| update (OTA) | oppdatering |
| tip jar | tipsboks |
| currency / exchange rate | valuta / valutakurs |
| holdings (stocks) | beholdning |
| purchase planner / sinking fund | kjøpsplanlegger / målsparing |
| take-home pay | nettolønn |
| person / people | person / personer |
| safe to spend | Igjen å bruke |
| carry over / rollover | overfør / overføring |
| Done / Cancel / Save / Delete | Ferdig / Avbryt / Lagre / Slett |
| On / Off | På / Av |
| Learn more / Got it | Les mer / Skjønner |
| Keel / Hull / Deck / Supplies / Gather the animals / Anchor / Sail (milestones) | Kjøl / Skrog / Dekk / Forsyninger / Samle dyrene / Anker / Seil |
| Build Your Ark | Bygg arken din |
| Ship's Log | Loggbok |
| Debt Tracker | Gjeldsoversikt |
| Live Holdings | Beholdning i sanntid |
| Quick Entry (widget) | Hurtigregistrering |
| Owed to You / loan / lent | Til gode / lån / utlånt |
| business / businesses | bedrift / Bedrifter |
| custom category / built-in | egen kategori / innebygd |
| bucket (50/30/20 group) | bøtte |
| Needs / Wants / Savings | Behov / Ønsker / Sparing |
| transaction (bank) | transaksjon |
| connection / provider | tilkobling / leverandør |
| map / mapping (accounts) | knytt til / tilknytning |
| merchant rule / auto-approve | forhandlerregel / autogodkjenn |
| Approve / Skip (inbox) | Godkjenn / Hopp over |
| Insights | Innsikt |
| Cash Flow / Monthly Review / Until Payday | Kontantstrøm / Månedsoversikt / Til lønning |
| Tracking reminders | Loggpåminnelser |
| automatic backups / Merge / Replace | automatiske sikkerhetskopier / Slå sammen / Erstatt |
| Onboarding (guide) / feature tour | Introduksjon / Funksjonsomvisning |
| tip tiers (small / medium / generous) | Lite / Middels / Raust tips |
| NEW badge / Keep going | NYTT / Fortsett |
| keep-alive watch (cards) | aktivitetsovervåking |
| Captain's Course / chapter | Kapteinskurset / kapittel |
| Subscription Detective / Personal Inflation | Abonnementsdetektiven / Personlig inflasjon |
| What-If tool | Hva om |
| break-even / closing costs / lifetime interest | nullpunkt / etableringskostnader / samlet rente over løpetiden |
| filing status / head of household | skattestatus / husholdningsforsørger |
| Ambient backgrounds / Solid / Glass | Bakgrunnseffekter / Ensfarget / Glass |
| density Compact / Comfortable / Spacious | Kompakt / Komfortabel / Luftig |
| categories: Grocery / Utilities / Giving / Other / Debt Payments | Dagligvarer / Strøm og vann / Gaver / Annet / Gjeldsbetalinger |
| units: yr / mo / min / hr / ago | år / mnd / min / t / siden |
| APR (card lines) / est. | % rente / ca. |
| Spending Pace | Forbrukstempo |
| Purchase Plans / Plan a Purchase | Kjøpsplaner / Planlegg et kjøp |
| Mine / Partner / Joint (debt owner) | Mine / Partnerens / Felles |
| starter cushion | startbuffer |
| Log actual / Applies to bill / Always do this | Logg faktisk beløp / Gjelder regningen / Gjør alltid dette |
| net worth snapshot / starting balance | øyeblikksbilde av nettoformuen / inngående saldo |
| high-yield (savings) account | høyrentekonto |
| check-in (reminders) / credentials / Edit | avstemming / innloggingsopplysninger / Rediger |
| Not solvable / today / tomorrow | Går ikke opp / i dag / i morgen |
