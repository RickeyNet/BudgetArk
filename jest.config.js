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
  // Note: `isolatedModules: true` lives in tsconfig.json so ts-jest transpiles
  // each file independently (fast; no project-wide type-check on every run).
};
