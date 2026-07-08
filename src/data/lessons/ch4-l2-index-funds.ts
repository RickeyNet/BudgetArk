import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch4-l2-index-funds",
  chapterId: "ch4",
  number: 2,
  title: "Index funds in one page",
  readMin: 6,
  topics: ["investing"],
  glyph: "🧺",
  summary:
    "Instead of guessing which companies win, buy a tiny slice of all of them for nearly free. Boring, and it beats most professionals.",
  whyItMatters:
    "Picking stocks is the hard, risky, expensive way to invest. Index funds are the easy, diversified, cheap way - and over decades, the cheap way usually finishes ahead.",
  body: [
    {
      type: "paragraph",
      text: "An index fund is a basket that holds every stock in a market list, automatically. An S&P 500 fund holds America's 500 biggest companies; a total-market fund holds thousands. Buy one share and you own a sliver of all of them at once. No one has to guess which company wins the next decade - you own the winners by default, because you own everything.",
    },
    {
      type: "bullet-list",
      title: "Why this boring idea wins",
      items: [
        "Diversification: one company failing barely dents you",
        "Cost: good index funds charge an expense ratio of 0.03-0.10% a year, versus ~1% for actively managed funds",
        "Track record: over 15-year periods, index funds have historically beaten around 90% of professional stock pickers",
        "Simplicity: nothing to research, monitor, or second-guess weekly",
      ],
    },
    {
      type: "paragraph",
      text: "That annual fee has an official name: the expense ratio - the percentage of your balance the fund keeps each year, deducted automatically before you ever see it. A 1% expense ratio versus 0.05% doesn't sound like much, but compounded over 40 years it can consume a quarter of your final balance - paid to a manager who, most likely, didn't beat the basket anyway. Every fund prints its expense ratio right on its listing page, and it's the most reliable predictor of long-term performance: lower wins.",
    },
    {
      type: "callout",
      tone: "info",
      title: "FUND VS ETF",
      text: "You'll see index funds sold two ways: mutual funds and ETFs (exchange-traded funds). They hold the same stocks and both work fine for long-term investing. Don't let the acronym stall you - the fund's index and its expense ratio matter far more than the wrapper.",
    },
    {
      type: "paragraph",
      text: "The mechanical difference: a mutual fund trades once per day - every buyer that day gets the same closing price - and it usually lives only at its home brokerage, so buying a Fidelity fund through Schwab often triggers a transaction fee. An ETF is listed on the stock exchange like any share: it has a live price all day and any brokerage can trade it. That portability is why VOO costs the same 0.03% whether you hold it at Vanguard, Fidelity, Schwab, Robinhood, or SoFi - and why ETFs are how you buy the basket at app-first brokers that don't run funds of their own. For a buy-every-month investor, neither difference changes the outcome; it only changes where you can shop.",
    },
    {
      type: "bullet-list",
      title: "Real funds, real expense ratios",
      items: [
        "Fidelity: FXAIX (S&P 500 mutual fund, 0.015%) or FSKAX (total-market mutual fund, 0.015%) - FZROX is a 0.00% total-market mutual fund, though it can only live at Fidelity",
        "Charles Schwab: SWPPX (S&P 500 mutual fund, 0.02%) or SWTSX (total-market mutual fund, 0.03%)",
        "Vanguard: VOO (S&P 500 ETF, 0.03%) or VTI (total market ETF, 0.03%)",
        "On Robinhood or SoFi: buy the ETFs - VOO, VTI, or SPLG (S&P 500, 0.02%) trade at any brokerage",
      ],
    },
    {
      type: "paragraph",
      text: "Expense ratios drift over time (usually downward - the price war works in your favor), so treat those numbers as a snapshot and check the fund's page for the current figure. The pattern to remember: anything at 0.10% or below is in the good neighborhood; anything near 1% deserves a hard question.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "OWNING SINGLE STOCKS",
      text: "It's fine to hold a few individual companies with money you can afford to see cut in half - some people learn a lot that way. Just keep it a small slice, not the foundation. The foundation is the basket.",
    },
    {
      type: "callout",
      tone: "info",
      title: "WHERE TO BUY THE BASKET",
      text: "Any major brokerage sells index funds commission-free. Fidelity, Charles Schwab, and Vanguard are the long-standing trio (Vanguard invented the index fund), while Robinhood and SoFi offer app-first accounts that hold the same ETFs. All are fine - the fund's expense ratio matters far more than whose logo is on the app. Not sponsored; nobody here pays BudgetArk.",
    },
    {
      type: "paragraph",
      text: "If you track investment accounts in BudgetArk, add your funds under Holdings and the balance flows into your net worth on the Bridge. Watching the whole-market line drift upward over years - through the dips - is the best cure for the itch to tinker.",
    },
    {
      type: "callout",
      tone: "info",
      title: "FROM THE BOOKSHELF",
      text: "Unshakeable by Tony Robbins covers this lesson's ground in book form: why low-cost index funds beat most professionals, how seemingly small fees quietly drain a portfolio over decades, and why market corrections are normal weather rather than a reason to sell. Short, plain-English, and worth the read before you invest your first dollar.",
    },
  ],
  keyTakeaway:
    "Own the whole market through a low-cost index fund. You'll beat most professionals by refusing to compete with them.",
  action: {
    label: "Track holdings on Bridge",
    route: "bridge",
  },
  resources: [
    {
      type: "book",
      title: "Unshakeable: Your Financial Freedom Playbook",
      author: "Tony Robbins with Peter Mallouk",
    },
  ],
};

export default lesson;
