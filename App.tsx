// File: App.tsx

import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  AppState,
  Modal,
  Text,
  TouchableOpacity,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import SynthwaveGrid from "./src/components/SynthwaveGrid";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { CurrencyProvider } from "./src/currency/CurrencyProvider";
import { getOrCreateUser } from "./src/storage/userStorage";
import {
  getLastSeenReleaseNotesVersion,
  setLastSeenReleaseNotesVersion,
} from "./src/storage/releaseNotesStorage";
import { CURRENT_APP_VERSION, RELEASE_NOTES } from "./src/data/releaseNotes";
import type { RootTabParamList } from "./src/types";
import {
  getUpdatePreferences,
  setLastUpdateCheckAt,
} from "./src/storage/updatePreferencesStorage";

type UpdatePrompt = {
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
};

/**
 * App entry point.
 *
 * IMPORTANT:
 * - This file must have EXACTLY ONE default export.
 * - ThemeProvider wraps navigation so every screen/component can read the active theme.
 * - Conditionally shows onboarding on first launch
 */

/**
 * Inner app component that has access to theme context
 */
const AppContent: React.FC = () => {
  const { colors, themeId } = useTheme();
  const navigationRef = useMemo(() => createNavigationContainerRef<RootTabParamList>(), []);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<UpdatePrompt | null>(null);
  const [showReleaseNotesPrompt, setShowReleaseNotesPrompt] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const canCheckUpdates = !__DEV__ && Updates.isEnabled;
  const latestRelease = RELEASE_NOTES[0];

  /** Check onboarding status on mount */
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const user = await getOrCreateUser();
        setIsOnboardingComplete(user.onboardingComplete);
      } catch (error) {
        console.error("Failed to load user:", error);
        setIsOnboardingComplete(false);
      }
    };
    checkOnboarding();
  }, []);

  /** Handle onboarding completion */
  const handleOnboardingComplete = useCallback(() => {
    setIsOnboardingComplete(true);
  }, []);

  const extractUpdatePrompt = useCallback((manifest: unknown): UpdatePrompt => {
    const data = (manifest ?? {}) as any;
    const metadata = (data.metadata ?? {}) as any;
    const extras = (data.extra ?? {}) as any;
    const messageCandidates = [
      metadata.message,
      metadata.updateMessage,
      extras?.eas?.message,
      data.description,
      data.message,
    ];
    const message =
      messageCandidates.find((candidate) => typeof candidate === "string") ||
      "A new update is ready to install.";

    return {
      message,
      createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
      runtimeVersion:
        typeof data.runtimeVersion === "string" ? data.runtimeVersion : undefined,
    };
  }, []);

  const formatDateTime = useCallback((iso?: string) => {
    if (!iso) return "Unknown";
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return "Unknown";
    return new Date(parsed).toLocaleString();
  }, []);

  const runAutoUpdateCheck = useCallback(async () => {
    if (isCheckingUpdates || !canCheckUpdates || isOnboardingComplete !== true) return;
    setIsCheckingUpdates(true);

    try {
      const prefs = await getUpdatePreferences();
      if (prefs.manualUpdateMode) return;

      const lastChecked = prefs.lastCheckedAt ? Date.parse(prefs.lastCheckedAt) : 0;
      const thirtyMinutes = 30 * 60 * 1000;
      if (Date.now() - lastChecked < thirtyMinutes) return;

      const checkedAt = new Date().toISOString();
      const checkResult = await Updates.checkForUpdateAsync();
      await setLastUpdateCheckAt(checkedAt);

      if (!checkResult.isAvailable) return;

      const fetchResult = await Updates.fetchUpdateAsync();
      const manifest = (fetchResult as any).manifest || (checkResult as any).manifest || null;
      setPendingUpdate(extractUpdatePrompt(manifest));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("not supported in development builds")) {
        console.error("Auto update check failed:", error);
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [canCheckUpdates, extractUpdatePrompt, isCheckingUpdates, isOnboardingComplete]);

  useEffect(() => {
    if (isOnboardingComplete !== true || !canCheckUpdates) return;

    void runAutoUpdateCheck();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void runAutoUpdateCheck();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [canCheckUpdates, isOnboardingComplete, runAutoUpdateCheck]);

  useEffect(() => {
    if (isOnboardingComplete !== true) return;

    const checkReleaseNotesPrompt = async () => {
      const lastSeenVersion = await getLastSeenReleaseNotesVersion();
      if (lastSeenVersion !== CURRENT_APP_VERSION) {
        setShowReleaseNotesPrompt(true);
      }
    };

    void checkReleaseNotesPrompt();
  }, [isOnboardingComplete]);

  const handleInstallUpdate = useCallback(async () => {
    try {
      setPendingUpdate(null);
      await Updates.reloadAsync();
    } catch (error) {
      console.error("Failed to apply update:", error);
    }
  }, []);

  const handleDismissReleaseNotesPrompt = useCallback(async () => {
    setShowReleaseNotesPrompt(false);
    await setLastSeenReleaseNotesVersion(CURRENT_APP_VERSION);
  }, []);

  const handleOpenReleaseHistory = useCallback(async () => {
    setShowReleaseNotesPrompt(false);
    await setLastSeenReleaseNotesVersion(CURRENT_APP_VERSION);

    await new Promise((resolve) => {
      setTimeout(resolve, 220);
    });

    if (navigationRef.isReady()) {
      navigationRef.navigate("Profile", { openReleaseNotes: true });
    }
  }, [navigationRef]);

  /** Show loading indicator while checking onboarding status */
  if (isOnboardingComplete === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  /** Show onboarding if not complete */
  if (!isOnboardingComplete) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  const isSynthwave = themeId === "synthwave";

  /** Show main app navigation */
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
      {isSynthwave && <SynthwaveGrid color={colors.accent} />}

      <Modal
        visible={pendingUpdate !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPendingUpdate(null)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Update Ready</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Message: {pendingUpdate?.message}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Published: {formatDateTime(pendingUpdate?.createdAt)}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>Runtime: {pendingUpdate?.runtimeVersion || "Unknown"}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: colors.bg }]}
                onPress={() => setPendingUpdate(null)}
              >
                <Text style={[styles.dialogButtonText, { color: colors.text }]}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: colors.accent }]}
                onPress={handleInstallUpdate}
              >
                <Text style={[styles.dialogButtonText, { color: colors.white }]}>Install Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReleaseNotesPrompt}
        animationType="fade"
        transparent
        onRequestClose={handleDismissReleaseNotesPrompt}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>You're on v{CURRENT_APP_VERSION}</Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>What's new: {latestRelease?.title || "Latest updates are now available."}</Text>
            {latestRelease?.highlights?.[0] ? (
              <Text style={[styles.dialogMessage, { color: colors.textDim }]}>{latestRelease.highlights[0]}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.dialogButton, { backgroundColor: colors.accent }]}
              onPress={handleOpenReleaseHistory}
            >
              <Text style={[styles.dialogButtonText, { color: colors.white }]}>View release notes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, { backgroundColor: colors.bg }]}
              onPress={handleDismissReleaseNotesPrompt}
            >
              <Text style={[styles.dialogButtonText, { color: colors.text }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/**
 * Root app component with theme provider
 */
export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <AppContent />
          </CurrencyProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  dialogBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 10,
  },
  dialogActions: {
    gap: 10,
    marginTop: 8,
  },
  dialogButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dialogButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
