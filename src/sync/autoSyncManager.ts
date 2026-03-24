/**
 * BudgetArk — Auto-Sync Manager
 * File: src/sync/autoSyncManager.ts
 *
 * Monitors WiFi network changes and triggers automatic sync
 * when both devices are on the configured "home" network.
 * Only fires when the app is in the foreground.
 */

import { AppState, AppStateStatus, Platform, PermissionsAndroid } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { getPairingState } from "./pairingStorage";
import { syncNow } from "./syncOrchestrator";
import type { SyncResult } from "./types";

const COOLDOWN_MS = 30_000;

let configured = false;
let lastSyncAttempt = 0;
let unsubscribeNetInfo: (() => void) | null = null;
let appStateListener: any = null;
let isMonitoring = false;

type AutoSyncCallback = (result: SyncResult) => void;
let onSyncComplete: AutoSyncCallback | null = null;

/**
 * Configure NetInfo to fetch WiFi SSID.
 * Must be called once before any SSID reads.
 * On iOS this enables CNCopyCurrentNetworkInfo / NEHotspotNetwork.
 */
const ensureConfigured = () => {
  if (configured) return;
  configured = true;
  NetInfo.configure({
    shouldFetchWiFiSSID: true,
  });
};

/**
 * Request ACCESS_FINE_LOCATION on Android (required for SSID reads).
 * Returns true if permission is granted.
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message:
          "BudgetArk needs location access to read your WiFi network name for auto-sync. Your location is never stored or shared.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const attemptAutoSync = async (): Promise<void> => {
  // Rate limit
  const now = Date.now();
  if (now - lastSyncAttempt < COOLDOWN_MS) return;
  lastSyncAttempt = now;

  // Only sync in foreground
  if (AppState.currentState !== "active") return;

  const pairing = await getPairingState();
  if (!pairing?.autoSyncEnabled || !pairing.homeSSID) return;

  // Check current SSID
  const netState = await NetInfo.fetch();
  const currentSSID = getSSID(netState);
  if (!currentSSID || currentSSID !== pairing.homeSSID) return;

  // Attempt sync
  try {
    const result = await syncNow();
    onSyncComplete?.(result);
  } catch {
    // Silently fail for auto-sync — user didn't explicitly request it
  }
};

const getSSID = (state: NetInfoState): string | null => {
  if (state.type === "wifi" && state.isConnected) {
    return (state.details as any)?.ssid ?? null;
  }
  return null;
};

/**
 * Start monitoring network changes for auto-sync triggers.
 */
export const startMonitoring = (callback?: AutoSyncCallback): void => {
  if (isMonitoring) return;
  isMonitoring = true;
  onSyncComplete = callback ?? null;

  ensureConfigured();

  // Listen for network state changes
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.type === "wifi" && state.isConnected) {
      attemptAutoSync();
    }
  });

  // Listen for app coming to foreground
  appStateListener = AppState.addEventListener(
    "change",
    (nextState: AppStateStatus) => {
      if (nextState === "active") {
        attemptAutoSync();
      }
    }
  );
};

/**
 * Stop monitoring for auto-sync.
 */
export const stopMonitoring = (): void => {
  isMonitoring = false;
  onSyncComplete = null;

  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }

  if (appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
};

/**
 * Get the current WiFi SSID (requires location permission on Android).
 */
export const getCurrentSSID = async (): Promise<string | null> => {
  ensureConfigured();
  const state = await NetInfo.fetch();
  return getSSID(state);
};
