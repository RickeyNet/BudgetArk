/**
 * Jest configuration for BudgetArk unit tests.
 *
 * Scope: pure logic only (src/utils, src/data, src/sync, src/storage,
 * src/crypto, src/services, src/hooks, src/notifications). These modules
 * have no React Native dependencies
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
  // load (they intermittently time out even though the logic is fine). That
  // used to be a blanket 15s here for every suite in the project; it now
  // lives as a per-suite `jest.setTimeout(15000)` at the top of just the
  // suites that need the headroom, so a genuinely hung test in any other
  // suite still fails fast at the 5s default.
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
    // Hooks with pure-logic tests (useSliderValueEditor) and the notification
    // schedulers (rule 11: no financial data in notification content).
    "src/hooks/**/*.ts",
    "src/notifications/**/*.ts",
    "!src/**/*.d.ts",
  ],
  // Ratchet gate: set just below measured coverage so it blocks regressions
  // without demanding new tests up front. Raise these as coverage grows;
  // never lower them to get a red build green. Re-based 2026-07 when the
  // measured scope grew to include storage/crypto/services (measured
  // L61.8/S60.5/B59.7/F53.7) - the % dropped because the denominator got
  // honest, not because coverage regressed. Raised 2026-08-28 after the
  // Tier 4 test pass (storage/services/screen-math suites; scope widened
  // to hooks + notifications): measured L81.8/S80.9/B77.8/F76.3.
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 79,
      branches: 76,
      functions: 75,
    },
  },
  // Note: `isolatedModules: true` lives in tsconfig.json so ts-jest transpiles
  // each file independently (fast; no project-wide type-check on every run).
};
