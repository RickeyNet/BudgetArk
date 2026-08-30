/**
 * BudgetArk - Quick Entry widget target config (iOS)
 * File: targets/quickentry/expo-target.config.js
 *
 * Declares the WidgetKit app-extension target for @bacons/apple-targets.
 * The plugin discovers every targets/<name>/expo-target.config.js at
 * `expo prebuild` and injects the target (Swift sources in this directory,
 * generated Info.plist) into the Xcode project. Widget code lives in
 * index.swift next to this file.
 */

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  name: "QuickEntry",
  displayName: "Quick Entry",
  // Relative id -> appended to the app's bundleIdentifier:
  // com.budgetark.app.quickentry (extension ids must prefix the app id).
  bundleIdentifier: ".quickentry",
  // v1 needs no iOS 17 API (containerBackground is availability-guarded in
  // index.swift), so match the lowest OS the app itself supports.
  deploymentTarget: "15.1",
};
