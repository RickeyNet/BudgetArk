/**
 * Jest configuration for BudgetArk unit tests.
 *
 * Scope: pure logic only (src/utils, src/data, src/sync, src/storage,
 * src/crypto, src/services). These modules have no React Native dependencies
 * (native edges are mocked per-test), so we use the lightweight ts-jest
 * transform on a Node environment instead of the heavy `jest-expo` preset.
 * If/when component or hook tests are added, introduce a separate
 * `jest-expo`-based project.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  moduleNameMapper: {
    // quick-crypto is a native (Nitro) module; Node's crypto implements the
    // same OpenSSL-backed API, so tests run the real math. See the shim.
    "^react-native-quick-crypto$": "<rootDir>/src/crypto/quickCryptoNodeShim.js",
  },
  // A few sync/pairing tests drive real-timer async handshakes; jest's 5s
  // default is too tight for them under coverage instrumentation + parallel
  // load (they intermittently time out even though the logic is fine). 15s
  // gives real headroom without masking a genuinely hung test.
  testTimeout: 15000,
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/data/**/*.ts",
    "src/sync/**/*.ts",
    // Security-critical layers whose tests existed but whose coverage was
    // invisible to the ratchet: bank-response parsers, storage crypto,
    // attachments. A regression here must move the needle.
    "src/storage/**/*.ts",
    "src/crypto/**/*.ts",
    "src/services/**/*.ts",
    "!src/**/*.d.ts",
  ],
  // Ratchet gate: set just below measured coverage so it blocks regressions
  // without demanding new tests up front. Raise these as coverage grows;
  // never lower them to get a red build green. Re-based 2026-07 when the
  // measured scope grew to include storage/crypto/services (measured
  // L61.8/S60.5/B59.7/F53.7) - the % dropped because the denominator got
  // honest, not because coverage regressed (utils/data/sync alone measured
  // L81.8 at the old scope).
  coverageThreshold: {
    global: {
      lines: 61,
      statements: 60,
      branches: 59,
      functions: 53,
    },
  },
  // Note: `isolatedModules: true` lives in tsconfig.json so ts-jest transpiles
  // each file independently (fast; no project-wide type-check on every run).
};
