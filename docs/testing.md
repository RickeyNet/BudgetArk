# Testing

BudgetArk has a unit-test suite for its **pure business logic** — the math and
validation that power debt payoff, investing projections, net worth, currency
conversion, recurrence, and import/sync safety. Use it as a regression net:
run it before and after a change to confirm you didn't break an existing feature.

## Running

```bash
npm test            # run the whole suite once
npm run test:watch  # re-run affected tests as you edit
npm run test:coverage
```

## What's covered

Tests live next to the code under `src/utils/__tests__/`:

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `calculations.test.ts` | `calculations.ts` | Debt payoff timelines, total interest, investment growth, goal-date payments, currency formatting, multi-debt avalanche/snowball simulation |
| `currencyConversion.test.ts` | `currencyConversion.ts` | USD conversion table, milestone target localization, "convert my amounts" math |
| `netWorth.test.ts` | `netWorth.ts` | Net worth totals, reserve-category counting, linked-account double-count guard |
| `recurrence.test.ts` | `recurrence.ts` | Recurring-entry cadence, occurrence counting, spreadsheet month projection |
| `budgetBucketMath.test.ts` | `budgetBucketMath.ts` | 50/30/20 bucket totals, targets, variance, percentages |
| `recordValidators.test.ts` | `recordValidators.ts` | Import / LAN-sync trust-boundary validation of every record type |
| `paymentUrl.test.ts` | `paymentUrl.ts` | Payment-URL normalization and scheme rejection (security) |
| `sanitize.test.ts` | `sanitize.ts` | Control-character stripping on text input |

## Setup notes

- Runner: **Jest + ts-jest** on a Node environment (`jest.config.js`).
- These modules are plain TypeScript with **no React Native imports**, so the
  suite does **not** use `jest-expo` — it runs fast and offline with no native
  mocks. If you later add tests for components or hooks that import React Native,
  add a separate `jest-expo`-based Jest project rather than changing this one.
- `isolatedModules: true` (in `tsconfig.json`) makes ts-jest transpile each file
  on its own — quick, but it does **not** type-check. Run `tsc --noEmit`
  separately if you want full type checking.

## Adding tests

Drop a `*.test.ts` file under `src/utils/__tests__/` (or any `__tests__/`
folder beneath `src/`). Prefer testing pure functions — given inputs, assert
outputs. When a module pulls in React Native or storage, extract the pure logic
into a helper and test that, keeping the side-effecting shell thin.
