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
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/data/**/*.ts",
    "!src/**/*.d.ts",
  ],
  // Ratchet gate: set just below measured coverage (2026-07: L78/S77/B64/F73)
  // so it blocks regressions without demanding new tests up front. Raise these
  // as coverage grows; never lower them to get a red build green.
  coverageThreshold: {
    global: {
      lines: 75,
      statements: 74,
      branches: 61,
      functions: 70,
    },
  },
  // Note: `isolatedModules: true` lives in tsconfig.json so ts-jest transpiles
  // each file independently (fast; no project-wide type-check on every run).
};
