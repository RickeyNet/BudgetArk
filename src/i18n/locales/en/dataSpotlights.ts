/**
 * BudgetArk - English strings: bundled data (spotlights)
 * File: src/i18n/locales/en/dataSpotlights.ts
 *
 * Covers: featureSpotlights.ts debut carousel copy (title, blurb, cta
 * label) AND the feature guide's per-feature how-to (`guide`: a
 * where-to-find breadcrumb plus numbered `step1`..`stepN`, two to five
 * steps, read in order by getSpotlightGuide), keyed by spotlight id.
 * Resolved lazily from src/data via src/i18n/translate.ts.
 */

export const dataSpotlights = {
  "feature-guide": {
    title: "Every feature, one tap away",
    blurb: "The new Feature guide lists everything BudgetArk can do, grouped by tab, with where to find each feature and how to use it in a few steps. Search for a word, read the steps, then jump straight in.",
    cta: "Open the Feature guide",
    guide: {
      where: "Profile tab → Help → Feature guide",
      step1: "Open the Profile tab and scroll to the Help card.",
      step2: "Tap Feature guide, then browse by tab or type a word like \"receipt\" or \"payday\".",
      step3: "Tap a feature to see where it lives and the steps to use it. The button under the steps jumps you straight there.",
    },
  },
  languages: {
    title: "BudgetArk speaks your language",
    blurb: "Every tab, sheet and reminder now comes in five more languages: German, Russian, Ukrainian, Swedish and Norwegian. It follows your phone's language automatically, or pick one yourself under Profile, right beside Currency.",
    cta: "Choose a language",
    guide: {
      where: "Profile tab → Settings → Language",
      step1: "Open the Profile tab and find Language, right beside Currency.",
      step2: "Leave it on Automatic to follow your phone, or pick a language yourself.",
      step3: "Every tab switches immediately. Check-in reminders and the home-screen widget follow too.",
    },
  },
  "bill-fulfillment": {
    title: "Bills that settle themselves",
    blurb: "Set a bill up once with your best estimate. When the real electric or water charge arrives - from your bank or typed in - file it against the bill and the actual replaces the estimate for that month, everywhere. No double counting, no editing the plan.",
    cta: "Log a bill's actual charge",
    guide: {
      where: "Budget tab → + Add entry → Applies to bill",
      step1: "Add a recurring expense once, with your best estimate as the amount.",
      step2: "When the real charge arrives, add it as an expense and pick the bill under Applies to bill. In the Review Inbox, imported charges offer the same list.",
      step3: "The actual amount replaces the estimate for that month everywhere - the budget, the calendar and the cash-flow card.",
    },
  },
  "bank-card-balances": {
    title: "Credit cards that track themselves",
    blurb: "Link a card on the Debts tab to the bank account behind it and its balance updates after every sync - the same link that stamps the card's last use for the keep-alive watch. One pick per card, and debt tracking mostly runs itself.",
    cta: "Link a card",
    guide: {
      where: "Debts tab → tap a card → Edit → Connected bank account",
      step1: "Connect your bank first under Profile → Bank Connections.",
      step2: "Open the card on the Debts tab, tap Edit and pick the bank account that is this card under Connected bank account.",
      step3: "After every sync the card's balance lands here on its own; with the keep-alive watch on, purchases stamp its last use too.",
    },
  },
  "cash-flow-budget": {
    title: "Know what's safe to spend",
    blurb: "Tell BudgetArk what's in checking at the start of the month, and the Budget tab projects where the month ends - income in, bills and debt minimums out - with a real safe-to-spend number instead of a guess.",
    guide: {
      where: "Budget tab → cash-flow card at the top",
      step1: "At the start of a month, answer the Starting balance prompt with what is in checking (or tap the cash-flow card to enter it later).",
      step2: "The card projects the month's end: income in, bills and debt minimums out.",
      step3: "Read the safe-to-spend number before a purchase - it already accounts for what is still due.",
    },
  },
  "private-entries": {
    title: "Some spending is just yours",
    blurb: "Mark any budget entry Private and it never syncs to your partner's device - perfect for gifts and surprises. It still counts in your own budget and rides your backups; only the sharing changes.",
    cta: "Add a private entry",
    guide: {
      where: "Budget tab → + Add entry → 🔒 Private",
      step1: "Add or edit an entry and turn on the 🔒 Private toggle.",
      step2: "The entry stays in your own budget and your backups, but never leaves for your partner's device during sync.",
      step3: "Turning it off later lets it sync on the next pass; a copy that already synced is not retracted.",
    },
  },
  "card-keep-alive": {
    title: "Don't let a quiet card get closed",
    blurb: "Issuers can close a credit card that sits unused - and your credit score takes the hit. Turn on the keep-alive watch for any card and BudgetArk warns you before its inactivity window runs out, right on your Bridge.",
    cta: "Set up a card watch",
    guide: {
      where: "Debts tab → tap a card → Edit → Card keep-alive",
      step1: "Open a credit card on the Debts tab and tap Edit.",
      step2: "Turn the keep-alive watch on and set the allowed inactivity window - issuers vary, 6 to 12 months is typical.",
      step3: "Log a purchase on the card (or let a linked bank account stamp it) to reset the clock. A banner on the Bridge warns before the window runs out.",
    },
  },
  "income-types": {
    title: "W-2 or 1099? Tag your paychecks",
    blurb: "Mark income as a W-2 paycheck or 1099 contractor pay. W-2 entries can track the 401(k) withheld from each check, and 1099 entries show exactly how much to set aside for taxes - totaled monthly on your Budget.",
    cta: "Log a paycheck",
    guide: {
      where: "Budget tab → + Add entry → Income → income type",
      step1: "Add an income entry and pick W-2 paycheck or 1099 / contractor.",
      step2: "For W-2, enter the 401(k) withheld from the check; for 1099, set the share to put aside for taxes (25-30% is a common start).",
      step3: "The Budget tab totals the withholding and set-aside each month, and 1099 income feeds the Quarterly Taxes tool on Charts.",
    },
  },
  "bank-connections": {
    title: "Your bank, on autopilot",
    blurb: "Connect your bank and let transactions import themselves - nothing enters your budget until you approve it in the Review Inbox. Your credentials stay encrypted on this device; BudgetArk has no server and never sits between you and your bank.",
    cta: "Set up a connection",
    guide: {
      where: "Profile tab → Bank Connections",
      step1: "Open Profile → Bank Connections and add a connection. The setup guide walks you through SimpleFIN or Teller - your own account with them.",
      step2: "Pick which accounts to import and where their balances land on the Bridge.",
      step3: "New transactions wait in the Budget tab's Review Inbox until you approve, categorize or skip them. Nothing enters your budget on its own.",
    },
  },
  "business-expenses": {
    title: "Business expenses, sorted",
    blurb: "Tag any expense to a company or side gig, then pull a tax-time report with per-business totals and a CSV for your accountant. Tagged entries still count in your regular budget - the separation happens in the report.",
    cta: "Create a business",
    guide: {
      where: "Profile tab → Businesses",
      step1: "Create a business under Profile → Businesses.",
      step2: "When adding an expense on the Budget tab, tag it to that business. It still counts in your personal budget.",
      step3: "Back under Profile → Businesses, open the report for per-business totals by year and a CSV for your accountant.",
    },
  },
  "people-assignment": {
    title: "Who spent that?",
    blurb: "Add the people in your household and assign any expense to them - when adding entries or approving imported bank transactions. Every entry shows who it belongs to, so shared spending finally has names on it.",
    cta: "Add your people",
    guide: {
      where: "Profile tab → People",
      step1: "Add the people in your household under Profile → People.",
      step2: "When adding an expense, or approving one in the Review Inbox, pick who it was for - one person, or everyone it was shared by.",
      step3: "Each entry shows its names; shared spending splits evenly in the per-person reports.",
    },
  },
  "receipt-photos": {
    title: "Attach the receipt",
    blurb: "Snap up to three receipt photos onto any entry, right from the Add and Edit forms. Photos are encrypted before they touch storage and never leave your phone unless you export them yourself.",
    cta: "Add an entry",
    guide: {
      where: "Budget tab → + Add entry → Receipt photos",
      step1: "Add or edit an expense and scroll to Receipt photos.",
      step2: "Take a photo or pick one from your library - up to three per entry.",
      step3: "Photos are encrypted on this phone and stay out of partner sync and backups. Exporting them is a separate, explicit action.",
    },
  },
  "tracking-reminders": {
    title: "Gentle tracking nudges",
    blurb: "Opt in to a check-in when you haven't logged spending in a while, or a fresh-month reminder to set your goals. Scheduled entirely on your phone - nothing about your finances ever appears on your lock screen.",
    cta: "Set up reminders",
    guide: {
      where: "Profile tab → Settings → Tracking Reminders",
      step1: "Open Profile → Tracking Reminders and turn on the nudges you want: a check-in after a quiet stretch, or a fresh-month reminder.",
      step2: "Allow notifications when your phone asks.",
      step3: "Reminders are scheduled on this phone only and never mention amounts or accounts.",
    },
  },
  "account-change-tracker": {
    title: "Watch your accounts rise and fall",
    blurb: "Every account and category on the Bridge now shows how much it's up or down over the window you pick - a day, a week, a month, or a quarter. Tracked privately on this phone from your own balances and prices; nothing leaves the device.",
    cta: "See your Bridge",
    guide: {
      where: "Bridge tab → Change chips above your accounts",
      step1: "Open the Bridge and pick a window with the Change chips: a day, a week, a month or a quarter.",
      step2: "Every account and category shows how much it is up or down over that window.",
      step3: "History builds from a daily snapshot taken on this phone, so the first few days show less than a full window.",
    },
  },
  "what-if-spending": {
    title: "What if you stopped spending on…?",
    blurb: "Pick a spending category and see what redirecting that money could do: how much sooner you'd be debt-free, the interest you'd skip, or what it grows into over 1, 5, and 10 years. Find it under Tools on the Charts tab.",
    cta: "Run a what-if",
    guide: {
      where: "Charts tab → Tools → What If I Stopped Spending on…",
      step1: "Open the Charts tab, scroll to Tools and tap What If I Stopped Spending on….",
      step2: "Pick a category; BudgetArk uses your real monthly average for it.",
      step3: "Compare the outcomes: debt-free sooner and interest skipped, or what the money grows into over 1, 5 and 10 years.",
    },
  },
  "purchase-planner": {
    title: "Plan a purchase, keep your goals",
    blurb: "Name the thing you're saving for and BudgetArk builds the sinking fund around it: a monthly amount that fits your real cash flow, the month it's ready, and advice tuned to your Build Your Ark step so the purchase never derails the plan.",
    cta: "Plan a purchase",
    guide: {
      where: "Charts tab → Tools → Plan a Purchase",
      step1: "Open Charts → Tools → Plan a Purchase and name what you are saving for, its price and when you want it.",
      step2: "BudgetArk proposes a monthly amount that fits your cash flow and tells you the month it is ready.",
      step3: "Saved plans appear on the Bridge's Purchase Plans card, where you log what you have put aside.",
    },
  },
  "take-home-pay": {
    title: "What actually hits your account",
    blurb: "Enter a salary, filing status, and state and see your real per-paycheck take-home - federal, state, Social Security, and Medicare, all from bundled tax tables that never phone home. Tap another state to see what the same salary keeps there.",
    cta: "Estimate your take-home",
    guide: {
      where: "Charts tab → Tools → Take-Home Pay",
      step1: "Open Charts → Tools → Take-Home Pay and enter a salary, filing status and state.",
      step2: "Read the per-paycheck take-home with federal, state, Social Security and Medicare broken out.",
      step3: "Tap another state to compare what the same salary keeps there. US tax tables only, bundled with the app - nothing is sent anywhere.",
    },
  },
  "app-lock": {
    title: "Lock the app behind a PIN",
    blurb: "Turn on App Lock and BudgetArk asks for a 4-8 digit PIN whenever it opens, so someone borrowing your phone can't browse your finances. The PIN stays on this device - never synced, exported, or backed up.",
    cta: "Set up App Lock",
    guide: {
      where: "Profile tab → Settings → App Lock",
      step1: "Open Profile → App Lock and turn it on.",
      step2: "Choose a 4-8 digit PIN and confirm it.",
      step3: "BudgetArk asks for the PIN every time it opens. It stays on this device - never synced, exported or backed up - so keep it somewhere safe.",
    },
  },
  "theme-fleet": {
    title: "Seven new themes for your Ark",
    blurb: "Deep Sea, Slate, Classic, Lighthouse, Chart Room, Harbor Dawn and Ledger have joined the fleet - from abyssal blues with a bioluminescent glow to a high-contrast theme audited for readability, a nautical chart, a peach sunrise and classic green accounting paper. Try them all under Appearance.",
    cta: "Browse themes",
    guide: {
      where: "Profile tab → Appearance → Theme",
      step1: "Open Profile → Appearance and tap Theme.",
      step2: "Pick a theme; the whole app changes as you tap.",
      step3: "Design Style and Ambient Backgrounds on the same card adjust glass cards and the moving backdrop.",
    },
  },
  "subscription-detective": {
    title: "Subscription Detective",
    blurb: "A new Charts-tab tool finds bank-imported charges that repeat like a subscription - monthly or yearly - with no bill on file, adds up what they cost a year, and makes each one a recurring bill in a tap.",
    cta: "Run the detective",
    guide: {
      where: "Charts tab → Tools → Subscription Detective",
      step1: "Connect a bank or import a statement first - the detective reads imported charges.",
      step2: "Open Charts → Tools → Subscription Detective to see charges that repeat monthly or yearly with no bill on file, and what they cost a year.",
      step3: "Tap one to make it a recurring bill; future charges file against it automatically.",
    },
  },
  "owed-to-you": {
    title: "Owed to You",
    blurb: "Lent someone money? Name them on the expense when you log it (or in the Review Inbox), then track what they still owe and log each payment they make under Profile → People → Owed to You.",
    cta: "Open Owed to You",
    guide: {
      where: "Profile tab → People → Owed to You",
      step1: "When logging an expense you expect back, turn on Lent to and name the person.",
      step2: "Open Profile → People → Owed to You to see what each person still owes.",
      step3: "Log each repayment there; the balance shrinks until it is settled.",
    },
  },
  "net-worth-goal": {
    title: "Where your net worth is heading",
    blurb: "The Bridge now carries your net worth line forward from your budget's monthly surplus and your debts at their minimums. Set a goal - an amount by a month - and see on track or off, what it would take per month, and when today's pace gets there.",
    cta: "See the projection",
    guide: {
      where: "Bridge tab → net worth outlook card",
      step1: "Open the Bridge and find the net worth outlook chart below your accounts.",
      step2: "Tap Set a net worth goal and enter an amount and a month.",
      step3: "The card says on track or off, what it would take per month, and when today's pace gets there.",
    },
  },
  "paycheck-cycle": {
    title: "Until Payday",
    blurb: "Budget by pay period, not calendar month: tell BudgetArk when you're paid and the Budget tab shows what's due before your next check and what's safe to spend until then.",
    cta: "Set up pay periods",
    guide: {
      where: "Budget tab → Until Payday card",
      step1: "On the Budget tab, tap Set up pay periods on the Until Payday card.",
      step2: "Enter when you get paid and how often.",
      step3: "The card shows what is due before your next check and, with a starting balance recorded, what is safe to spend until payday.",
    },
  },
  "quarterly-taxes": {
    title: "Quarterly Taxes",
    blurb: "Log 1099 income and the new Charts tool shows each IRS quarter: what you earned, what you set aside, the estimated payment and its due date - with a Mark paid per quarter.",
    cta: "See my quarters",
    guide: {
      where: "Charts tab → Tools → Quarterly Taxes",
      step1: "Log income as 1099 / contractor with a tax set-aside share.",
      step2: "Open Charts → Tools → Quarterly Taxes to see each IRS quarter: earned, set aside, the estimated payment and its due date.",
      step3: "Tap Mark paid once you have sent a quarter's payment.",
    },
  },
  "purchase-plan-priorities": {
    title: "Purchase plans, in order",
    blurb: "Your Purchase Plans card now adds everything up - saved, still to go, and when it's all funded - and lets you rank the plans smallest-first, soonest-needed, or in your own order. Set one monthly amount and it flows down the list like a debt snowball, each plan rolling into the next.",
    cta: "See your plans",
    guide: {
      where: "Bridge tab → Purchase Plans card → Order",
      step1: "Save two or more plans with Plan a Purchase on the Charts tab.",
      step2: "On the Bridge's Purchase Plans card, pick an Order: smallest first, soonest needed, or your own.",
      step3: "Set one monthly amount; it funds the first plan, then rolls into the next like a debt snowball.",
    },
  },
  "bank-statement-import": {
    title: "Import a bank statement",
    blurb: "Download a CSV from your bank's website and BudgetArk reads it: confirm which columns are the date, description and amount once, and every transaction lands in the Review Inbox for you to approve. For the months before you connected a bank - or a bank you never will.",
    cta: "Import a statement",
    guide: {
      where: "Profile tab → Data → Import → Bank Statement",
      step1: "Download a transaction CSV from your bank's website.",
      step2: "Open Profile → Data → Import → Bank Statement and pick the file; confirm which columns hold the date, description and amount.",
      step3: "Every row lands in the Budget tab's Review Inbox to approve, categorize or skip. The layout is remembered per bank, and re-importing never doubles anything.",
    },
  },
  "tip-jar": {
    title: "Tip Jar",
    blurb: "Optional one-time tips, handled entirely by the app store. Unlocks nothing - every feature is already free.",
    guide: {
      where: "Profile tab → Tip Jar",
      step1: "Open Profile → Tip Jar.",
      step2: "Pick an amount; the app store handles the payment. It unlocks nothing - every feature is already free.",
    },
  },
} as const;
