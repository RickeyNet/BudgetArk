/**
 * BudgetArk - Onboarding guide content (single source of truth).
 *
 * Every step here renders on TWO surfaces: the spotlight cards of the
 * guided onboarding tour (Spotlight.tsx via useTabCoachmark) and the
 * searchable Onboarding guide sheet (OnboardingGuideModal). The field
 * split is deliberate:
 *   - `body`   - concise (~40-55 words), what the spotlight card shows at
 *                a glance. Keep it short: it renders inside a tooltip.
 *   - `detail` - the long-form explanation shown in the guide and behind
 *                the card's "Learn more" toggle. This is where depth goes.
 *   - `location` - a where-to-find breadcrumb ("Debts tab → + button"),
 *                shown in the guide and in search results.
 *   - `keywords` - search-only synonyms a user might type ("credit card",
 *                "dark mode", "csv"). Lowercase; never rendered.
 * guideSearch.ts searches title + body + detail + location + keywords;
 * coachmarkContent.test.ts enforces that every step ships detail +
 * location, so new features can't land here half-documented.
 */

export type CoachmarkStep = {
  id: string;
  /** Anchor id that the spotlight should focus on. If missing or unmeasurable, falls back to a centered card. */
  anchorId?: string;
  /** Hero emoji, feature-spotlight style - big on the tour card, inline in the guide. */
  emoji?: string;
  title: string;
  body: string;
  /** Long-form explanation for the guide + the card's "Learn more" toggle. */
  detail?: string;
  /** Where-to-find breadcrumb, e.g. "Debts tab → + button". */
  location?: string;
  /** Search-only synonyms (lowercase). Never rendered. */
  keywords?: string[];
};

export type CoachmarkTour = {
  tabId: string;
  /** Tab emoji for the guide's accordion headers and search-result eyebrows. */
  emoji: string;
  intro: string;
  steps: CoachmarkStep[];
};

export const COACHMARK_TAB_IDS = ["DebtTracker", "Budget", "Bridge", "Utilities", "Profile"] as const;

export type CoachmarkTabId = (typeof COACHMARK_TAB_IDS)[number];

export const COACHMARKS: Record<CoachmarkTabId, CoachmarkTour> = {
  DebtTracker: {
    tabId: "DebtTracker",
    emoji: "⛓️",
    intro: "Debts - your payoff plan",
    steps: [
      {
        id: "debts-summary",
        anchorId: "debts-summary-card",
        emoji: "📊",
        title: "Your debt at a glance",
        body:
          "Total balance, total paid, and overall progress live here. The ring on the right tracks your % paid off across every debt, and the countdown below projects your debt-free date from your actual payment pace.",
        detail:
          "The summary card totals every debt you track: what you still owe, what you've already paid off, and the progress ring showing the percentage cleared. Below it, the Mine / Partner / Joint filter narrows the list to one owner - totals follow the filter, so a couple can check either side's picture in one tap. Paid-off debts stay in the list at $0 (with their history intact) so your progress never loses what you already accomplished. Right under the summary, the Debt-Free Countdown shows the years, months, and days until you're projected to owe nothing - computed from your real payment pace over the last six months of logged payments (or your minimums until there's history), so logging a bigger payment visibly pulls the date closer.",
        location: "Debts tab (top card)",
        keywords: ["total", "summary", "progress", "paid off", "owner", "partner", "joint", "ring", "countdown", "debt-free", "debt free date", "payoff date"],
      },
      {
        id: "debts-fab",
        anchorId: "debts-fab",
        emoji: "➕",
        title: "Add a debt with +",
        body:
          "Tap the + button to add a credit card, loan, or mortgage. You set the balance, APR, and minimum payment - payments you record reduce the balance.",
        detail:
          "Each debt gets a name, current balance, APR, and minimum monthly payment, plus a type (Credit / Personal, Car, or House - the type drives payoff ordering), an owner, an optional payment due day for reminders, and an optional payoff goal date that shows the monthly payment needed to hit it. Credit cards can be added at $0 balance - useful when you keep a paid-off card just to watch it with the keep-alive feature. Everything is editable later from the card's Edit button.",
        location: "Debts tab → + button",
        keywords: ["add", "new debt", "loan", "mortgage", "credit card", "apr", "interest rate", "minimum payment", "goal date", "due day"],
      },
      {
        id: "debts-payments",
        emoji: "💵",
        title: "Log payments as you go",
        body:
          "Tap a debt card to record a payment or open its payment history - every payment lowers the balance and counts toward your progress. Give a debt a due day and BudgetArk reminds you in-app when it's coming up, with a one-tap prompt to log the minimum on the day it's due.",
        detail:
          "Expand any debt card and use Pay to log a payment - overpayments are clamped so display rounding can never leave a stray cent behind, and clearing a balance triggers a payoff celebration. Payment history (with per-payment delete and undo) lives behind the card too. Set a payment due day when adding or editing a debt and a reminder banner appears above the list as the day approaches; on the day itself, an app-open prompt offers to log the minimum in one tap. Dismissing a reminder silences it for that month only. Logged payments also appear on the Budget tab's Debt Payments category, so both tabs always agree.",
        location: "Debts tab → tap a debt card",
        keywords: ["payment", "pay", "log", "history", "due date", "reminder", "banner", "minimum", "undo", "payoff"],
      },
      {
        id: "debts-keepalive",
        emoji: "💳",
        title: "Keep idle credit cards alive",
        body:
          "Banks can close a credit card that sits unused - and your credit score takes the hit. Turn on the keep-alive watch for any card and BudgetArk warns you before its inactivity window runs out.",
        detail:
          "Edit any credit-card debt and switch on Card keep-alive. Tell it how much inactivity the issuer allows (3, 6, 12, or 24 months - issuers vary, 6 is a safe default) and how far ahead you want warning (14, 30, or 60 days). As the deadline nears, a banner names the card and its use-by date on both the Bridge and Debts tabs, and a gentle notification nudges you - it never shows the card's name or any amount on your lock screen. After a purchase, tap 'I used it' on the card to reset the clock; or link the card to a bank connection and the last-used date stamps itself from your own synced transactions. 'Later' on the banner snoozes a card for the current month. Closed a card on purpose? Just turn its watch off.",
        location: "Debts tab → tap a card → Edit (credit cards only)",
        keywords: ["keep alive", "credit card", "inactivity", "closed", "closure", "credit score", "unused", "idle", "notification", "i used it", "watch", "deadline"],
      },
      {
        id: "debts-strategy",
        emoji: "🎯",
        title: "Pick a payoff strategy",
        body:
          "Choose Avalanche (highest interest rate first), Snowball (smallest balance first), or keep your own custom order. Your strategy drives the payoff projections here and in the Charts tools.",
        detail:
          "Avalanche pays the mathematically least interest by attacking the highest APR first; Snowball buys motivation by clearing the smallest balances first; Custom keeps whatever order you arrange. The chosen strategy decides which debt is your 'focus' (its card starts expanded), shapes the debt-free timeline projections, and is what the Charts tab's What-If tool uses when it shows how redirecting spending would speed up your payoff. Mortgages are handled separately so a house doesn't bury the plan.",
        location: "Debts tab (strategy row below the summary)",
        keywords: ["avalanche", "snowball", "strategy", "order", "interest", "focus", "projection"],
      },
      {
        id: "debts-milestones",
        anchorId: "debts-milestones-card",
        emoji: "🚢",
        title: "Build Your Ark milestones",
        body:
          "Tap the milestones card to set targets for the 7 financial milestones - starter cushion, debt-free, emergency fund, retirement, and beyond.",
        detail:
          "Build Your Ark is BudgetArk's step-by-step financial path: Keel (starter cushion), Hull (high-interest debt), Deck (full emergency fund), Supplies (sinking funds), Gather Animals (retirement and college), Moorings (mortgage), and Sail (build wealth). Tap the bar to open the planner, set your own target amounts, and track progress per step - the app reads your real balances, savings, and debts to fill the bars. Your current step also tunes advice elsewhere, like the Plan a Purchase tool's guidance on whether a purchase fits right now.",
        location: "Debts tab → Build Your Ark bar",
        keywords: ["milestones", "ark", "keel", "hull", "emergency fund", "steps", "plan", "baby steps"],
      },
    ],
  },
  Budget: {
    tabId: "Budget",
    emoji: "💰",
    intro: "Budget - what comes in, what goes out",
    steps: [
      {
        id: "budget-summary",
        anchorId: "budget-summary-card",
        emoji: "⚖️",
        title: "Income vs expense",
        body:
          "Top card shows this month's income, expenses, and net. Use the < > arrows above it to look at past months - a full year of history is kept.",
        detail:
          "The month card totals income, expenses, and the net between them, with W-2 / 1099 paycheck tags on income rows, a 401(k) contributions line when you track them, and a '1099 tax set-aside' line totaling what to reserve for taxes this month. The < > arrows page through past months - closed months show exactly what happened then and never rewrite themselves when today's settings change. The Monthly Review prompt at month end sums up how it went.",
        location: "Budget tab (top card)",
        keywords: ["income", "expense", "net", "month", "history", "summary", "monthly review", "arrows"],
      },
      {
        id: "budget-spending",
        anchorId: "budget-spending-card",
        emoji: "🍩",
        title: "Category breakdown",
        body:
          "The donut chart breaks down spending by category. Tap any category to see the entries inside or set a monthly limit.",
        detail:
          "Every expense lands in a category, and the donut shows where the month went. Tap a slice or row to expand the category: every entry inside, with edit and delete, plus a monthly limit you can set per category - limits track how close you are and carry month to month. Categories are grouped into Needs, Wants, and Savings buckets (reassignable in Profile → Categories), and you can create custom categories of your own for anything the built-ins don't cover.",
        location: "Budget tab → spending donut",
        keywords: ["category", "categories", "donut", "chart", "limit", "budget limit", "needs", "wants", "custom category"],
      },
      {
        id: "budget-fab",
        anchorId: "budget-fab",
        emoji: "✏️",
        title: "Add an entry with +",
        body:
          "Income, expense, or savings entry. Mark anything that repeats as Recurring and it auto-fills every month. Income entries can be tagged as W-2 or 1099 paychecks to track 401(k) contributions and how much to set aside for taxes.",
        detail:
          "Entries are the heart of the budget: type (income / expense), category, amount, date, and an optional description. Recurring entries fill themselves in every month until you stop them - perfect for rent, subscriptions, and paychecks. Income can be tagged W-2 (enter your take-home amount, optionally recording the 401(k) dollars withheld so retirement savings still get credit) or 1099 / contractor (nothing is withheld, so BudgetArk shows how much to set aside for taxes at a percentage you pick). Expenses can carry up to three encrypted receipt photos and a business tag. Multi-line quick-add lets you enter several purchases in one visit.",
        location: "Budget tab → + button",
        keywords: ["add entry", "income", "expense", "recurring", "subscription", "w-2", "w2", "1099", "paycheck", "401k", "retirement", "taxes", "set aside"],
      },
      {
        id: "budget-widget",
        emoji: "📱",
        title: "Quick Entry from your home screen (Android)",
        body:
          "Add BudgetArk's widget from your launcher's widget picker and log an expense in one tap - hit a category and the Add Entry form opens with it already picked.",
        detail:
          "Long-press your Android home screen, open the widget picker, and add Quick Entry. The widget is a small grid of everyday categories - Grocery, Restaurant, Transportation, Shopping, Entertainment, Other - and tapping one launches straight into the Add Entry form with that category preselected, so logging a purchase takes seconds. The widget shows nothing about your finances - no balances, no totals - so it's safe on any home screen. (iOS doesn't have the widget yet.)",
        location: "Android home screen → long-press → Widgets → BudgetArk",
        keywords: ["widget", "home screen", "quick entry", "quick add", "shortcut", "android", "launcher"],
      },
      {
        id: "budget-inbox",
        emoji: "📥",
        title: "Review Inbox for bank imports",
        body:
          "Connected a bank in Profile? New transactions wait in the tray icon at the top of this screen - nothing enters your budget until you approve it. Confirm or change each category, edit, or skip; approve a merchant with 'always use this category' and its future charges arrive pre-suggested. Transfers between your own accounts are set aside automatically.",
        detail:
          "The Review Inbox is the gate between your bank and your budget: every imported transaction waits there until you approve, edit, or skip it - nothing is ever added silently. Each item arrives with a suggested category; tick 'always use this category' while approving and that merchant's future charges come pre-filled, ready for one-tap bulk approval. Likely transfers between your own accounts and likely duplicates of entries you typed by hand are flagged and set aside so they don't double-count. Decisions are remembered permanently - re-syncing, restoring a backup, or partner sync will never re-ask about a transaction you've already handled.",
        location: "Budget tab → tray icon (top of screen)",
        keywords: ["review inbox", "bank", "import", "transactions", "approve", "skip", "merchant", "transfer", "duplicate", "sync"],
      },
      {
        id: "budget-receipts",
        emoji: "🧾",
        title: "Receipts and business expenses",
        body:
          "Attach up to three receipt photos to any entry - they're encrypted and never leave this phone. Tag an expense to a business (set businesses up in Profile) and it gets a 💼 badge; a tax-time report with CSV and receipt export lives in Profile → Business Expenses.",
        detail:
          "Snap or pick up to three receipt photos in the Add and Edit entry forms - photos are shrunk, encrypted with the same key that protects everything else, and stored only on this phone (a paired partner sees a placeholder, backups skip them, and nothing is ever uploaded). Create businesses under Profile → Business Expenses, then tag any expense to one; tagged entries still count in your normal budget - the separation happens at tax time, when the Business Expense Report gives per-business totals by category, an accountant-ready CSV, and an optional zip of the year's receipt photos named to match the CSV rows. Exports only happen when you explicitly confirm them.",
        location: "Budget tab → + / edit an entry · Profile → Business Expenses",
        keywords: ["receipt", "photo", "camera", "attachment", "business", "tax", "report", "csv", "export", "accountant", "zip"],
      },
    ],
  },
  Bridge: {
    tabId: "Bridge",
    emoji: "🧭",
    intro: "Bridge - your net worth",
    steps: [
      {
        id: "bridge-history",
        anchorId: "bridge-history-card",
        emoji: "📈",
        title: "Your Net Worth",
        body:
          "Net Worth = everything you own minus everything you owe. The big number rolls up debts, savings, retirement, investments, and tracked accounts. The chart below it plots Net Worth over time - snapshots save automatically when balances change.",
        detail:
          "The Bridge is your financial command deck and the app's home tab. The headline number is assets (accounts, savings, priced investments) minus liabilities (your tracked debts), and the chart plots it over time from snapshots the app records automatically whenever balances change - no manual bookkeeping. A cash-flow chart below compares recent months' income and spending at a glance. Everything on this screen is computed on your phone from your own data.",
        location: "Bridge tab (top chart)",
        keywords: ["net worth", "assets", "liabilities", "chart", "history", "snapshot", "cash flow"],
      },
      {
        id: "bridge-accounts",
        anchorId: "bridge-accounts-card",
        emoji: "🏦",
        title: "Manage your accounts",
        body:
          "Add savings, retirement, brokerage, or any account you want counted toward Net Worth. Tap a row to update its balance any time - the changes flow back into the Bridge view. Accounts linked to a bank connection keep their balances current automatically after every sync.",
        detail:
          "The Accounts card holds everything you own: checking, savings, emergency fund, retirement accounts, brokerages, HSAs - grouped by category with per-category totals. Tap + Add to create one, tap a row to update its balance or edit it. Accounts mapped to a bank connection (Profile → Bank Connections) update themselves after every sync, so their balances - and your net worth - stay current without typing. Investment-type accounts can be valued by their live holdings instead of a typed balance.",
        location: "Bridge tab → Accounts card",
        keywords: ["accounts", "savings", "checking", "retirement", "hsa", "brokerage", "balance", "add account", "linked"],
      },
      {
        id: "bridge-changes",
        emoji: "🌊",
        title: "Watch accounts rise and fall",
        body:
          "Every account row and category header shows how much it's up or down - use the 1D / 7D / 30D / 90D switch to change the window. The history behind it is recorded privately on this phone as you use the app, so the numbers appear from your second day on.",
        detail:
          "Under each account row and category header, a rise/drop line shows the change over the window you pick - a day, a week, a month, or a quarter - green for up, red for down, with both dollars and percent. Cash accounts follow your balance changes; brokerage and retirement accounts move with their holdings' prices. The daily value history powering it is captured privately on this phone as you use the app - it never syncs and never leaves the device - so each device builds its own baselines starting the day after you first use this version.",
        location: "Bridge tab → 1D / 7D / 30D / 90D switch",
        keywords: ["rise", "drop", "change", "up", "down", "delta", "window", "tracker", "gain", "loss"],
      },
      {
        id: "bridge-plans",
        emoji: "🛍️",
        title: "Purchase Plans",
        body:
          "Sinking funds you start with the Charts tab's Plan a Purchase tool are tracked here: a progress bar per plan, the monthly pace a target date needs, and tap-to-add funds. Saved money counts toward your net worth, and a funded plan tells you it's ready to buy.",
        detail:
          "Every purchase plan you start on the Charts tab lives here as a sinking fund: a progress bar toward the price, the monthly pace required when you've set a need-by date, and tap-to-contribute for adding (or correcting) saved money. A fully funded plan flags itself ready to buy. Plans count toward your net worth like any other savings, sync with your paired partner, and ride your backups. Education-category plans also feed the Ark's college milestone automatically.",
        location: "Bridge tab → Purchase Plans card",
        keywords: ["purchase", "plans", "sinking fund", "saving up", "goal", "contribute", "ready to buy"],
      },
      {
        id: "bridge-holdings",
        emoji: "💹",
        title: "Track stocks and ETFs by broker (Live Holdings)",
        body:
          "Turn on Live Holdings to track stocks and ETFs, organized by broker. Each broker (like Fidelity) lives in the Investment section of your accounts - tap it to expand its holdings, with a total for that broker and a combined total across all of them. Add a position by ticker and share count, and its market value counts toward your Net Worth. Prices only update when you tap Update prices, so add all your tickers first and then pull prices once. It stays off until you switch it on here or in Profile, and the first time you will see exactly what leaves your device. Only your ticker symbols are ever sent out to look up prices, never your share counts, balances, or who you are.",
        detail:
          "Live Holdings is strictly opt-in. Once on, each broker account in the Investment section expands to show its positions - add one by ticker symbol and share count, and its market value (shares × latest price) rolls into that broker's total and your net worth. Prices refresh only when you tap Update prices; big portfolios fetch in batches, and the button tells you if some tickers are still coming. The privacy contract is precise: only ticker symbols leave your phone to look up prices - never share counts, balances, or anything identifying you - and you see a plain-language disclosure before the first request.",
        location: "Bridge tab → Investment accounts (opt-in)",
        keywords: ["stocks", "etf", "holdings", "ticker", "shares", "broker", "fidelity", "prices", "investing", "portfolio"],
      },
    ],
  },
  Utilities: {
    tabId: "Utilities",
    emoji: "📈",
    intro: "Charts - lessons, calculators, and projections",
    steps: [
      {
        id: "charts-course",
        emoji: "🎓",
        title: "The Captain's Course",
        body:
          "A free personal-finance course in 5 chapters and 24 short lessons - budgeting basics, killing debt, saving, investing, and long-term wealth. Your progress is tracked, and you can read the lessons in any order.",
        detail:
          "Five chapters, 24 short lessons, entirely free and readable in any order: Setting Sail (budgeting basics), Patching the Hull (debt), Stocking the Galley (emergency funds, high-yield savings, sinking funds), Catching Wind (compounding, index funds, 401(k)/IRA/Roth, common mistakes), and Charting Far Waters (net worth, buy vs rent, insurance, estate basics). Lessons that suggest opening an account name real, established institutions with what each is good for - nobody pays BudgetArk to appear. Your reading progress is tracked so you can pick up where you left off.",
        location: "Charts tab (top card)",
        keywords: ["course", "lessons", "learn", "education", "investing", "index funds", "captain", "chapters"],
      },
      {
        id: "utilities-tool",
        anchorId: "utilities-tool-header",
        emoji: "🧮",
        title: "Financial calculators",
        body:
          "Tap a tool header to expand it: compound interest (the S&P 500 preset gives a realistic 7% baseline), a loan calculator with a full payment schedule you can export, a refinance break-even check, an emergency fund planner, and a currency exchange converter with up-to-date rates. Use the sliders to explore 'what if' scenarios - these tools never write to your data.",
        detail:
          "Five sandbox calculators, each behind a tap-to-expand header: compound interest with an S&P 500 preset for a realistic long-term baseline; a loan calculator producing the full amortization schedule (exportable); a refinance tool that finds the break-even month between closing costs and the lower rate; an emergency fund planner sized from your real monthly essentials; and a currency exchange converter (USD, EUR, GBP, CAD, JPY, SEK) that shows exactly how fresh its rates are and still answers offline. Sliders can also be tapped to type an exact number. These are pure sandboxes - they read nothing private and write nothing to your data; the currency converter fetches only a public rate table, never your amounts.",
        location: "Charts tab → tool headers",
        keywords: ["calculator", "compound interest", "loan", "amortization", "refinance", "emergency fund", "tools", "slider", "currency", "exchange rate", "convert", "fx"],
      },
      {
        id: "charts-what-if",
        emoji: "🔮",
        title: "What if I stopped spending on…",
        body:
          "Pick one of your spending categories and see two futures side by side: how much sooner you'd be debt-free (and the interest you'd skip), or what that money would grow into after 1, 5, and 10 years. Computed from your own budget history, entirely on this phone.",
        detail:
          "The tool reads your real average for each spending category over the last six tracked months, then lets you dial how much of it you'd redirect. The debt side re-runs your actual payoff plan (snowball or avalanche, your pick) with the extra money and shows months saved plus lifetime interest skipped; the savings side shows what the same monthly amount grows into after 1, 5, and 10 years at a stated 7% assumption. Everything computes from your own entries, on your phone - it's a mirror, not a guess.",
        location: "Charts tab → What If tool",
        keywords: ["what if", "stop spending", "redirect", "projection", "sooner", "interest saved", "growth"],
      },
      {
        id: "charts-purchase",
        emoji: "🛒",
        title: "Plan a purchase",
        body:
          "Saving up for something? Name it, set the price, and pick a monthly set-aside - the tool shows when it's ready, whether the pace fits your real cash flow, and advice tuned to your Build Your Ark step so the purchase never derails your bigger goals. Started plans live in the Purchase Plans card on your Bridge, where they're tracked and count toward net worth.",
        detail:
          "Name the item, set its price and anything already saved, then pick a monthly set-aside on the slider - the tool shows the month it'll be fully funded, the required monthly amount if you set a need-by date, and an honest verdict on whether that pace fits your real cash flow (computed from your last six months of income and spending). Advice adapts to your Build Your Ark step: finish the starter cushion first, what the set-aside costs your debt payoff, or a green light to save up and pay cash. Starting a plan creates a tracked sinking fund on the Bridge.",
        location: "Charts tab → Plan a Purchase",
        keywords: ["plan", "purchase", "save up", "sinking fund", "afford", "cash flow", "target date"],
      },
    ],
  },
  Profile: {
    tabId: "Profile",
    emoji: "⚙️",
    intro: "Profile - your settings",
    steps: [
      {
        id: "profile-appearance",
        anchorId: "profile-appearance-card",
        emoji: "🎨",
        title: "Theme, layout, and currency",
        body:
          "Pick a theme palette, a design style, and a density preset (Compact, Comfortable, Spacious) - density resizes padding and font sizes app-wide, and ambient themes bring a living background. Your display currency is set here too.",
        detail:
          "Appearance controls the whole look: theme palettes (including ambient themes like Deep Space, Deep Forest, and Deep Sea with living animated backgrounds), a design style (solid cards or glass), a density preset that resizes padding and text app-wide, and text size. Your display currency lives here too - switching it can convert your existing amounts or just change the symbol, your choice. Ambient backgrounds can be switched off any time if you prefer calm.",
        location: "Profile tab → Appearance",
        keywords: ["theme", "dark mode", "appearance", "colors", "glass", "density", "text size", "currency", "ambient", "background"],
      },
      {
        id: "profile-connections",
        emoji: "🔗",
        title: "Bank connections (optional)",
        body:
          "Link your bank, cards, or brokerage using accounts YOU own - via SimpleFIN Bridge or Teller - and let transactions and balances import themselves. A built-in setup guide walks you through cost, sign-up, and privacy for each provider. Credentials stay encrypted on this device; BudgetArk has no server.",
        detail:
          "Bank syncing is bring-your-own: you connect through SimpleFIN Bridge (one pasted token, covers thousands of US banks, ~$1.50/month paid to them directly) or Teller (free tier via your own developer account) - BudgetArk operates no aggregator and never sits between you and your bank. A built-in guide walks through each provider's cost, sign-up, and privacy before you start. Imported transactions wait in the Budget tab's Review Inbox; mapped accounts keep Bridge balances current; a linked credit card can feed the keep-alive watch. Credentials are encrypted on this device only - they never sync to a partner, never ride backups, and never touch a server, because there isn't one.",
        location: "Profile tab → Bank Connections",
        keywords: ["bank", "connection", "simplefin", "teller", "sync", "import", "link", "credentials", "setup guide"],
      },
      {
        id: "profile-sync-data",
        emoji: "🔄",
        title: "Partner sync and backups",
        body:
          "Pair with a partner's phone and sync over your home Wi-Fi - device to device, no cloud involved. The Data card handles encrypted backups, spreadsheet export/import, and Reset All Data (which starts you over at the first-launch setup).",
        detail:
          "Partner Sync pairs two phones with a code, then syncs directly over your home Wi-Fi - phone to phone, encrypted, no cloud in the middle. Both partners see shared debts, budgets, and accounts; per-device things like bank credentials and receipt photos deliberately stay put. The Data card covers password-protected encrypted backups (export a file, restore by merge or replace), spreadsheet export/import (CSV and xlsx) for working in Excel or Sheets, and Reset All Data, which wipes this device and returns you to first-launch onboarding.",
        location: "Profile tab → Partner Sync · Data",
        keywords: ["partner", "sync", "pair", "wifi", "backup", "restore", "export", "import", "spreadsheet", "excel", "csv", "reset"],
      },
      {
        id: "profile-extras",
        emoji: "🏆",
        title: "Achievements, categories, and more",
        body:
          "The Ship's Log tracks achievements as you use the app. You can also add custom budget categories, manage businesses for expense reports, turn on gentle tracking reminders, flip on privacy mode to block screenshots, and leave an optional tip if BudgetArk has helped you.",
        detail:
          "The Ship's Log collects achievements as you hit real milestones. Categories lets you add custom budget categories and re-bucket any category between Needs, Wants, and Savings. Business Expenses manages the businesses you tag expenses to and hosts the tax-time report. Tracking Reminders are opt-in nudges - a check-in when you haven't logged spending in a while and a fresh-month planning reminder - scheduled entirely on your phone with nothing sensitive on the lock screen. Privacy mode blocks screenshots and screen recording of your financial data. And the Tip Jar takes a small optional tip that unlocks nothing, because everything is already free.",
        location: "Profile tab → Ship's Log · Categories · Settings",
        keywords: ["achievements", "ship's log", "custom categories", "tracking reminders", "notifications", "privacy mode", "screenshot", "tip jar"],
      },
      {
        id: "profile-help",
        anchorId: "profile-help-card",
        emoji: "🗺️",
        title: "Help and onboarding",
        body:
          "Open Onboarding under Help any time - it's this whole guide in one searchable place, plus a Redo onboarding button that reruns the full first-launch flow. Your data is always kept.",
        detail:
          "The Onboarding row under Help opens this entire guide as a browsable, searchable reference: browse by tab, or type a keyword ('receipt', 'credit card', 'backup') to jump straight to how something works and where to find it. The Redo onboarding button inside reruns the complete first-launch flow - theme, welcome, name, then the guided tab-by-tab tips - without touching any of your data. Every spotlight tip during the tour also has a Learn more toggle with the same depth you're reading now.",
        location: "Profile tab → Help → Onboarding",
        keywords: ["help", "guide", "search", "onboarding", "redo", "how to", "tutorial", "walkthrough", "tips"],
      },
    ],
  },
};
