/**
 * Jest configuration for BudgetArk unit tests.
 *
 * Scope: pure logic only (src/utils, src/data, src/types). These modules have
 * no React Native dependencies, so we use the lightweight ts-jest transform on
 * a Node environment instead of the heavy `jest-expo` preset. If/when component
 * or hook tests are added, introduce a separate `jest-expo`-based project.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  // A few sync/pairing tests drive real-timer async handshakes; jest's 5s
  // default is too tight for them under coverage instrumentation + parallel
  // load (they intermittently time out even though the logic is fine). 15s
  // gives real headroom without masking a genuinely hung test.
  testTimeout: 15000,
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/data/**/*.ts",
    "src/sync/**/*.ts",
    "!src/**/*.d.ts",
  ],
  // Ratchet gate: set just below measured coverage (2026-07, with src/sync
  // included: L81.8/S80.3/B68.9/F77.0) so it blocks regressions without
  // demanding new tests up front. Raise these as coverage grows; never lower
  // them to get a red build green.
  coverageThreshold: {
    global: {
      lines: 79,
      statements: 78,
      branches: 66,
      functions: 74,
    },
  },
  // Note: `isolatedModules: true` lives in tsconfig.json so ts-jest transpiles
  // each file independently (fast; no project-wide type-check on every run).
};
