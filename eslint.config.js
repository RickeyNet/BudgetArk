// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', '.expo/**', 'screenshots/**'],
  },
  {
    rules: {
      // The react-hooks v6 compiler-era rules flag the long-standing RN
      // `useRef(new Animated.Value(0)).current` idiom and setState-in-effect
      // patterns used throughout this codebase. Keep them visible as warnings
      // so new code can improve, without blocking CI on ~60 legacy hits.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react/display-name': 'warn',
      // Literal apostrophes in JSX copy are fine.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Node-run tooling (screenshot/icon generators, release scripts).
    files: ['scripts/**', '*.config.js', 'babel.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
