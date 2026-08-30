/**
 * Jest-only shim: maps `react-native-quick-crypto` to Node's built-in crypto.
 *
 * Both are OpenSSL-backed implementations of the same node `crypto` API, so
 * unit tests exercise the real math (PBKDF2, AES-256-CBC, HMAC, MD5) without
 * loading native Nitro modules. Wired up via moduleNameMapper in
 * jest.config.js; never imported by app code.
 */
module.exports = require("crypto");
