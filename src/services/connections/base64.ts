/**
 * BudgetArk - Bank Connections: Base64 Helpers
 * File: src/services/connections/base64.ts
 *
 * CryptoJS-backed UTF-8 <-> base64 conversion. Hermes does not provide
 * btoa/atob, and crypto-js is already a dependency (encryptedStorage,
 * transportService), so these helpers keep the provider clients free of new
 * polyfills. Pure - safe for node-run unit tests.
 */

import CryptoJS from "crypto-js";

export const utf8ToBase64 = (text: string): string =>
  CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));

/** Returns null when the input is not valid base64-encoded UTF-8. */
export const base64ToUtf8 = (base64: string): string | null => {
  try {
    const decoded = CryptoJS.enc.Base64.parse(base64.trim()).toString(
      CryptoJS.enc.Utf8,
    );
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
};

/** RFC 7617 Basic auth header value for the given credentials. */
export const basicAuthHeader = (user: string, password: string): string =>
  `Basic ${utf8ToBase64(`${user}:${password}`)}`;
