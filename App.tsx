// File: App.tsx

import "react-native-get-random-values";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
// Side-effect: clamps the OS font-scale multiplier app-wide. Must run before
// any <Text>/<TextInput> renders, so keep it among the top imports.
import "./src/theme/fontScalingPolicy";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  AppState,
  InteractionManager,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  NativeModules,
  Platform,
} from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import AppLockGate from "./src/components/AppLockGate";
import DebtDueReminderHost from "./src/components/DebtDueReminderHost";
import TrackingReminderHost from "./src/components/TrackingReminderHost";
import CardKeepAliveReminderHost from "./src/components/CardKeepAliveReminderHost";
import QuickAddLinkHost from "./src/components/QuickAddLinkHost";
import SynthwaveGrid from "./src/components/SynthwaveGrid";
import { BackgroundEffectsProvider } from "./src/theme/BackgroundEffectsProvider";
import { SurfaceStyleProvider } from "./src/theme/SurfaceStyleProvider";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { DensityProvider } from "./src/theme/DensityProvider";
import { CurrencyProvider } from "./src/currency/CurrencyProvider";
import { CoachmarksProvider, useCoachmarks } from "./src/onboarding/CoachmarksProvider";
import { CoachmarkAnchorProvider } from "./src/onboarding/CoachmarkAnchorContext";
import { OnboardingGateProvider } from "./src/onboarding/OnboardingGateContext";
import { AchievementsProvider } from "./src/achievements/AchievementsProvider";
import { CustomCategoriesProvider } from "./src/categories/CustomCategoriesProvider";
import { ConnectionsProvider } from "./src/connections/ConnectionsProvider";
import { UndoProvider } from "./src/undo/UndoProvider";
import { getOrCreateUser } from "./src/storage/userStorage";
import { repairDuplicateMinimumDuePayments } from "./src/storage/debtStorage";
import { runAttachmentSweepIfDue } from "./src/services/attachments/attachmentSweepRunner";
import {
  getLastSeenReleaseNotesVersion,
  setLastSeenReleaseNotesVersion,
  setOtaUpdateInstalled,
  consumeOtaUpdateInstalled,
} from "./src/storage/releaseNotesStorage";
import {
  getSeenSpotlightIds,
  markSpotlightsSeen,
  seedAllFeatureDebutsSeen,
} from "./src/storage/featureSpotlightStorage";
import {
  FEATURE_SPOTLIGHTS,
  selectReplaySpotlights,
  selectUnseenSpotlights,
  type FeatureSpotlight,
} from "./src/data/featureSpotlights";
import FeatureSpotlightModal from "./src/components/FeatureSpotlightModal";
import { FeatureTourProvider } from "./src/components/FeatureTourContext";
import { CURRENT_APP_VERSION, RELEASE_NOTES, type ReleaseNote } from "./src/data/releaseNotes";
import type { RootTabParamList } from "./src/types";
import {
  getUpdatePreferences,
  setLastUpdateCheckAt,
} from "./src/storage/updatePreferencesStorage";
import { requestArkSetupPrompt } from "./src/storage/arkSetupStorage";
import { isUpdateSafe } from "./src/utils/versionGuard";
import { getPrivacyMode } from "./src/storage/privacyStorage";
import { resolveUpdateInfo } from "./src/utils/updateReleaseNotes";

const FlagSecureModule = Platform.OS === "android" ? NativeModules.FlagSecureModule : null;
const ScreenGuardModule = Platform.OS === "ios" ? NativeModules.ScreenGuardModule : null;

type UpdatePrompt = {
  message: string;
  createdAt?: string;
  runtimeVersion?: string;
  appVersion?: string;
  releaseNote?: ReleaseNote;
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
  const { colors, themeId, backgroundEffectsEnabled } = useTheme();
  const { startGuidedTour } = useCoachmarks();
  const navigationRef = useMemo(() => createNavigationContainerRef<RootTabParamList>(), []);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<UpdatePrompt | null>(null);
  const [showReleaseNotesPrompt, setShowReleaseNotesPrompt] = useState(false);
  const [spotlightQueue, setSpotlightQueue] = useState<FeatureSpotlight[] | null>(null);
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
        if (__DEV__) console.error("Failed to load user:", error);
        setIsOnboardingComplete(false);
      }
    };
    checkOnboarding();
  }, []);

  /**
   * Launch-time data repair: collapse duplicate minimum-due payment rows
   * created when both paired phones confirmed the same "minimum due"
   * prompt before syncing (see debtPaymentDedupe). Cheap no-op on healthy
   * data; deferred past first paint like the update check below because it
   * decrypts debts + payments.
   */
  useEffect(() => {
    if (isOnboardingComplete !== true) return;
    const task = InteractionManager.runAfterInteractions(() => {
      repairDuplicateMinimumDuePayments().catch((error) => {
        if (__DEV__) console.error("Duplicate payment repair failed:", error);
      });
      // Receipt-photo orphan sweep (throttled to once/24h internally) - the
      // ONLY garbage collector for attachment files; see attachmentSweep.ts.
      void runAttachmentSweepIfDue();
    });
    return () => task.cancel();
  }, [isOnboardingComplete]);

  /**
   * Re-shows the onboarding flow (used by Reset All Data and the Profile
   * screen's "Redo onboarding" row via OnboardingGateContext). Callers
   * persist the onboardingComplete=false flag themselves before invoking.
   */
  const restartOnboarding = useCallback(() => {
    setIsOnboardingComplete(false);
  }, []);

  const onboardingGate = useMemo(
    () => ({ restartOnboarding }),
    [restartOnboarding]
  );

  /** Handle onboarding completion */
  const handleOnboardingComplete = useCallback(async (options?: { openArkSetup?: boolean }) => {
    try {
      if (options?.openArkSetup) {
        await requestArkSetupPrompt();
      }
    } catch (error) {
      if (__DEV__) console.error("Failed to request ark setup:", error);
    }
    try {
      // A fresh install must never get a "NEW!" debut for features that were
      // always there for this user. Await it: the spotlight check effect
      // fires as soon as the flag below flips.
      await seedAllFeatureDebutsSeen();
    } catch (error) {
      if (__DEV__) console.error("Failed to seed feature debuts:", error);
    }
    // Onboarding flows straight into the guided walkthrough: the initial tab
    // (Bridge) fires its own tour on focus, and this queue chains the rest so
    // each tab auto-navigates after its last "Got it". Skipped when the user
    // chose Build Your Ark - the milestones modal owns the Debts tab's first
    // visit, and a spotlight presented over it would stack (the iOS
    // silent-present failure). Per-tab tips still fire as they explore.
    if (!options?.openArkSetup) {
      startGuidedTour(["DebtTracker", "Budget", "Utilities", "Profile"]);
    }
    setIsOnboardingComplete(true);
  }, [startGuidedTour]);

  const extractUpdatePrompt = useCallback(
    (manifest: unknown): UpdatePrompt => resolveUpdateInfo(manifest, CURRENT_APP_VERSION),
    []
  );

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
      const fetchObj = fetchResult as Record<string, unknown>;
      const checkObj = checkResult as Record<string, unknown>;
      const manifest = fetchObj.manifest || checkObj.manifest || null;
      const prompt = extractUpdatePrompt(manifest);

      const currentRuntime = Updates.runtimeVersion ?? undefined;
      if (!isUpdateSafe(currentRuntime, prompt.runtimeVersion)) {
        if (__DEV__) console.warn("Blocked OTA downgrade:", prompt.runtimeVersion, "<", currentRuntime);
        return;
      }

      setPendingUpdate(prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("not supported in development builds") && !message.includes("call to function")) {
        if (__DEV__) console.error("Auto update check failed:", error);
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [canCheckUpdates, extractUpdatePrompt, isCheckingUpdates, isOnboardingComplete]);

  useEffect(() => {
    if (isOnboardingComplete !== true || !canCheckUpdates) return;

    // Deferred past the first paint: the check (and a possible background
    // bundle download) is network + disk work that shouldn't compete with
    // the navigator's initial render. Foreground resumes stay immediate -
    // the app is already painted by then.
    const task = InteractionManager.runAfterInteractions(() => {
      void runAutoUpdateCheck();
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void runAutoUpdateCheck();
      }
    });

    return () => {
      task.cancel();
      subscription.remove();
    };
  }, [canCheckUpdates, isOnboardingComplete, runAutoUpdateCheck]);

  /** Apply screen-capture prevention based on privacy mode preference */
  useEffect(() => {
    const privacyModule = FlagSecureModule || ScreenGuardModule;
    if (!privacyModule) return;

    const applyPrivacyMode = async () => {
      const enabled = await getPrivacyMode();
      if (enabled) {
        privacyModule.enable();
      } else {
        privacyModule.disable();
      }
    };

    void applyPrivacyMode();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void applyPrivacyMode();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isOnboardingComplete !== true) return;

    const checkReleaseNotesPrompt = async () => {
      const ota = await consumeOtaUpdateInstalled();

      // Feature spotlights outrank the plain release-notes prompt: when a
      // debut is owed, the carousel IS this version's "what's new" moment
      // (its last slide links to the full notes, and dismissing it marks the
      // version seen). Checked per-feature rather than per-version because a
      // feature can debut later than its version - e.g. it shipped dormant
      // via OTA and only works once the store build with its native modules
      // arrives (see requiresRuntimeVersion in featureSpotlights.ts).
      const seenSpotlightIds = await getSeenSpotlightIds();
      const unseenSpotlights = selectUnseenSpotlights(
        FEATURE_SPOTLIGHTS,
        seenSpotlightIds,
        Updates.runtimeVersion ?? undefined
      );
      if (unseenSpotlights.length > 0) {
        setSpotlightQueue(unseenSpotlights);
        return;
      }

      if (ota.installed && ota.notesShown) {
        // OTA update was just applied AND the install dialog already showed
        // the notes for this version, so mark as seen and skip the prompt.
        await setLastSeenReleaseNotesVersion(CURRENT_APP_VERSION);
        return;
      }
      // Either a normal launch, or an OTA install whose pre-install dialog
      // could not resolve notes (published without the stamped message). In
      // the latter case we deliberately fall through: the prompt below sources
      // from the baked-in RELEASE_NOTES, so notes can never be missing here.
      const lastSeenVersion = await getLastSeenReleaseNotesVersion();
      if (lastSeenVersion !== CURRENT_APP_VERSION) {
        setShowReleaseNotesPrompt(true);
      }
    };

    void checkReleaseNotesPrompt();
  }, [isOnboardingComplete]);

  const handleInstallUpdate = useCallback(async () => {
    try {
      // Record whether this dialog actually showed the notes so the post-reload
      // prompt knows whether it still needs to surface them.
      await setOtaUpdateInstalled(!!pendingUpdate?.releaseNote);
      setPendingUpdate(null);
      await Updates.reloadAsync();
    } catch (error) {
      if (__DEV__) console.error("Failed to apply update:", error);
    }
  }, [pendingUpdate]);

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
      try {
        navigationRef.navigate("Profile", { openReleaseNotes: true });
      } catch (e) {
        if (__DEV__) console.warn("Navigation to Profile failed:", e);
      }
    } else if (__DEV__) {
      console.warn("Navigation not ready - could not open release notes");
    }
  }, [navigationRef]);

  /**
   * Close the debut carousel: every queued spotlight counts as seen (skip
   * included - re-showing a skipped tour reads as nagging), and the release
   * version is marked seen so the plain "what's new" prompt the carousel
   * replaced doesn't pop on the next launch.
   */
  const closeSpotlights = useCallback(async () => {
    const ids = (spotlightQueue ?? []).map((spotlight) => spotlight.id);
    setSpotlightQueue(null);
    await markSpotlightsSeen(ids);
    await setLastSeenReleaseNotesVersion(CURRENT_APP_VERSION);
  }, [spotlightQueue]);

  const handleSpotlightDone = useCallback(() => {
    void closeSpotlights();
  }, [closeSpotlights]);

  const handleSpotlightCta = useCallback(
    async (spotlight: FeatureSpotlight) => {
      const cta = spotlight.cta;
      await closeSpotlights();

      // Same deferral as handleOpenReleaseHistory: let the modal's fade-out
      // finish before navigating, or iOS can silently drop the presentation.
      await new Promise((resolve) => {
        setTimeout(resolve, 220);
      });

      if (!cta || !navigationRef.isReady()) return;
      try {
        if (cta.kind === "budget-add-entry") {
          navigationRef.navigate("Budget", { quickAdd: {} });
        } else if (cta.kind === "bridge") {
          navigationRef.navigate("Bridge");
        } else if (cta.kind === "charts") {
          // Route key stays "Utilities"; the tab displays as "Charts".
          navigationRef.navigate("Utilities");
        } else if (cta.kind === "debt-tracker") {
          navigationRef.navigate("DebtTracker", { openKeepAlive: true });
        } else {
          navigationRef.navigate("Profile", { openSection: cta.section });
        }
      } catch (e) {
        if (__DEV__) console.warn("Spotlight navigation failed:", e);
      }
    },
    [closeSpotlights, navigationRef]
  );

  const handleSpotlightOpenNotes = useCallback(async () => {
    await closeSpotlights();

    await new Promise((resolve) => {
      setTimeout(resolve, 220);
    });

    if (navigationRef.isReady()) {
      try {
        navigationRef.navigate("Profile", { openReleaseNotes: true });
      } catch (e) {
        if (__DEV__) console.warn("Navigation to Profile failed:", e);
      }
    }
  }, [closeSpotlights, navigationRef]);

  /**
   * Re-open the debut carousel on demand (Profile → Help → Feature tour).
   * Replays every carousel-worthy spotlight that works on this install,
   * seen or not; closing re-marks everything seen, a no-op for a replay.
   * An empty selection (older store build enables nothing) leaves the
   * queue null so the modal never mounts with zero slides.
   */
  const replayFeatureTour = useCallback(() => {
    const tour = selectReplaySpotlights(
      FEATURE_SPOTLIGHTS,
      Updates.runtimeVersion ?? undefined
    );
    if (tour.length > 0) setSpotlightQueue(tour);
  }, []);

  const featureTour = useMemo(
    () => ({ replayFeatureTour }),
    [replayFeatureTour]
  );

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

  const isSynthwave = themeId === "synthwave" && backgroundEffectsEnabled;

  /** Show main app navigation */
  return (
    <OnboardingGateProvider value={onboardingGate}>
    <FeatureTourProvider value={featureTour}>
    {/* Everything financial mounts behind the optional PIN gate. While
        locked the tree below is NOT rendered (see AppLockGate header). */}
    <AppLockGate>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
      {isSynthwave && <SynthwaveGrid color={colors.accent} />}

      {/* Surfaces the "minimum due today" prompt on app open over any tab.
          Paused while the update / release-notes dialogs own the screen so the
          fade modals never stack (one would end up hidden on iOS). */}
      <DebtDueReminderHost
        paused={
          pendingUpdate !== null ||
          showReleaseNotesPrompt ||
          spotlightQueue !== null
        }
      />

      {/* Keeps scheduled expense-tracking check-in notifications anchored to
          the user's latest entry, and routes taps to the Budget tab. */}
      <TrackingReminderHost navigationRef={navigationRef} />

      {/* Keeps card keep-alive "use it or lose it" nudges in sync with the
          debts' keep-alive state, and routes taps to the DebtTracker tab. */}
      <CardKeepAliveReminderHost navigationRef={navigationRef} />

      {/* Routes the home-screen Quick Entry widget's deep links
          (budgetark://quick-add) to the Budget tab's Add Entry modal. */}
      <QuickAddLinkHost navigationRef={navigationRef} />

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
            <ScrollView
              style={styles.dialogScroll}
              contentContainerStyle={styles.dialogScrollContent}
              showsVerticalScrollIndicator
            >
              {pendingUpdate?.appVersion ? (
                <View style={[styles.updateVersionBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.updateVersionText, { color: colors.white }]}>
                    v{pendingUpdate.appVersion}
                  </Text>
                </View>
              ) : null}
              {pendingUpdate?.releaseNote ? (
                <>
                  <Text style={[styles.updateReleaseTitle, { color: colors.accent }]}>
                    {pendingUpdate.releaseNote.title}
                  </Text>
                  {pendingUpdate.releaseNote.highlights.slice(0, 4).map((line, i) => (
                    <Text key={`${pendingUpdate.releaseNote?.version}-${i}`} style={[styles.dialogBullet, { color: colors.textDim }]}>
                      {"\u2022"} {line}
                    </Text>
                  ))}
                  {pendingUpdate.releaseNote.highlights.length > 4 ? (
                    <Text style={[styles.dialogBullet, { color: colors.textMuted }]}>
                      +{pendingUpdate.releaseNote.highlights.length - 4} more in Release Notes
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
                  {pendingUpdate?.message ?? "A new update is ready to install."}
                </Text>
              )}
              {pendingUpdate?.createdAt && (
                <Text style={[styles.updateMeta, { color: colors.textMuted }]}>
                  Published {formatDateTime(pendingUpdate.createdAt)}
                </Text>
              )}
            </ScrollView>
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

      {/* Mutually exclusive with the update prompt above: never stack the
          "what's new" prompt on top of (or under) the "Update Ready" dialog.
          The update prompt wins; this one shows once it clears. */}
      <Modal
        visible={showReleaseNotesPrompt && pendingUpdate === null}
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
            <Text style={[styles.dialogTitle, { color: colors.text }]}>New in v{latestRelease.version}</Text>
            <ScrollView
              style={styles.dialogScroll}
              contentContainerStyle={styles.dialogScrollContent}
              showsVerticalScrollIndicator
            >
              <Text style={[styles.featureTitle, { color: colors.accent }]}>{latestRelease.title}</Text>
              {latestRelease.highlights.slice(0, 3).map((line, i) => (
                <Text key={i} style={[styles.dialogBullet, { color: colors.textDim }]}>
                  {"\u2022"} {line}
                </Text>
              ))}
              {latestRelease.highlights.length > 3 && (
                <Text style={[styles.dialogBullet, { color: colors.textMuted }]}>
                  +{latestRelease.highlights.length - 3} more
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.dialogButton, { backgroundColor: colors.accent }]}
              onPress={handleOpenReleaseHistory}
            >
              <Text style={[styles.dialogButtonText, { color: colors.white }]}>See what's new</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, { backgroundColor: "transparent" }]}
              onPress={handleDismissReleaseNotesPrompt}
            >
              <Text style={[styles.dialogButtonText, { color: colors.textMuted }]}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Debut carousel for newly-arrived features. Replaces the plain
          release-notes prompt when a debut is owed (the check effect never
          sets both), and defers to the "Update Ready" dialog the same way
          the release-notes prompt does. */}
      <FeatureSpotlightModal
        visible={spotlightQueue !== null && pendingUpdate === null}
        spotlights={spotlightQueue ?? []}
        onDone={handleSpotlightDone}
        onCtaPress={handleSpotlightCta}
        onOpenReleaseNotes={handleSpotlightOpenNotes}
      />
    </View>
    </AppLockGate>
    </FeatureTourProvider>
    </OnboardingGateProvider>
  );
};

/**
 * Root app component with theme provider
 */
export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BackgroundEffectsProvider>
          <SurfaceStyleProvider>
            <ThemeProvider>
              <DensityProvider>
                <CurrencyProvider>
                  <CoachmarksProvider>
                    <CoachmarkAnchorProvider>
                      <AchievementsProvider>
                        <CustomCategoriesProvider>
                          <ConnectionsProvider>
                            <UndoProvider>
                              <AppContent />
                            </UndoProvider>
                          </ConnectionsProvider>
                        </CustomCategoriesProvider>
                      </AchievementsProvider>
                    </CoachmarkAnchorProvider>
                  </CoachmarksProvider>
                </CurrencyProvider>
              </DensityProvider>
            </ThemeProvider>
          </SurfaceStyleProvider>
        </BackgroundEffectsProvider>
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
    maxHeight: "85%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  dialogScroll: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  dialogScrollContent: {
    paddingBottom: 4,
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
  dialogBullet: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  updateVersionBadge: {
    alignSelf: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  updateVersionText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  updateReleaseTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  updateMeta: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
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
