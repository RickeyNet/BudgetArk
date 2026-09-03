/**
 * BudgetArk - Profile Screen
 * File: src/screens/ProfileScreen.tsx
 *
 * Displays the anonymous user's profile and app settings.
 * Features:
 * - Shows the auto-generated anonymous user ID (truncated)
 * - Editable display name
 * - Theme selection in settings
 * - Data management (export, reset)
 * - App info and version
 *
 * Privacy-first design:
 * - No email, phone, or personal data is collected
 * - User ID is a random UUID shown only for reference
 * - All data is stored locally on the device
 *
 * The screen itself is a thin orchestrator: each settings card lives in a
 * section component under src/screens/profile/. This file keeps only the
 * genuinely shared state - the user account, pairing/sync, the deep-link
 * targeted modal visibilities, the NEW-badge set, and the app-wide info
 * dialog - plus the deep-link effects that need them.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  InteractionManager,
  Platform,
} from "react-native";
import * as Updates from "expo-updates";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CurrencyPreferenceId,
  DEFAULT_CURRENCY_PREFERENCE_ID,
  RootTabParamList,
  UserAccount,
} from "../types";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";
import { getOrCreateUser, deleteAccount } from "../storage/userStorage";
import { clearAllData } from "../storage/debtStorage";
import { clearAllAttachments } from "../services/attachments/attachmentStore";
import { clearAllAutoBackups } from "../services/autoBackup/autoBackupStore";
import {
  getBackupReminderState,
  type BackupReminderState,
} from "../storage/backupReminderStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useTabCoachmark } from "../onboarding/useTabCoachmark";
import { useAndroidKeyboardInputScroll } from "../hooks/useAndroidKeyboardInputScroll";
import { useCoachmarks } from "../onboarding/CoachmarksProvider";
import { useOnboardingGate } from "../onboarding/OnboardingGateContext";
import { useCurrency } from "../currency/CurrencyProvider";
import {
  getPairingState,
  clearPairingState,
  getSyncMetadata,
  updateHomeSSID,
  setAutoSyncEnabled,
} from "../sync/pairingStorage";
import { syncNow } from "../sync/syncOrchestrator";
import { recordSyncActivity } from "../storage/syncActivityStorage";
import {
  getCurrentSSID,
  startMonitoring,
  stopMonitoring,
  requestLocationPermission,
} from "../sync/autoSyncManager";
import type { PairingState, SyncResult, SyncStatus } from "../sync/types";
import { triggerHaptic } from "../utils/haptics";
import { getTrackingReminderSettings } from "../storage/trackingReminderSettingsStorage";
import { cancelAllTrackingReminders } from "../notifications/trackingReminders";
import { cancelAllCardKeepAliveReminders } from "../notifications/cardKeepAliveReminders";
import type { TrackingReminderSettings } from "../utils/trackingReminderPlanner";
import {
  FEATURE_SPOTLIGHTS,
  selectNewBadgeIds,
  type ProfileSpotlightSection,
} from "../data/featureSpotlights";
import {
  ackFeatureBadge,
  getAckedFeatureBadgeIds,
} from "../storage/featureSpotlightStorage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "../navigation/tabBarLayout";

import { useProfileStyles } from "./profile/profileStyles";
import BackupReminderBanner from "./profile/BackupReminderBanner";
import MissionCard from "./profile/MissionCard";
import ProfileCard from "./profile/ProfileCard";
import SupportSection from "./profile/SupportSection";
import AppearanceSection from "./profile/AppearanceSection";
import PartnerSyncSection from "./profile/PartnerSyncSection";
import ProgressSection from "./profile/ProgressSection";
import CategoriesSection from "./profile/CategoriesSection";
import BusinessSection from "./profile/BusinessSection";
import PeopleSection from "./profile/PeopleSection";
import DataSection, { type DataSectionHandle } from "./profile/DataSection";
import ConnectionsSection, {
  type ConnectionsSectionHandle,
} from "./profile/ConnectionsSection";
import SettingsSection, {
  type SettingsSectionHandle,
} from "./profile/SettingsSection";
import HelpSection from "./profile/HelpSection";
import AboutSection from "./profile/AboutSection";

/**
 * Appends a successful sync to the device-local activity log (counts per
 * collection only - see sync/syncActivity). Best-effort: the log must
 * never turn a finished sync into an error, and a result from an older
 * orchestrator without counts is simply not logged.
 */
const noteSyncActivity = async (result: SyncResult): Promise<void> => {
  if (!result.success || !result.receivedCounts) return;
  try {
    const pairing = await getPairingState();
    if (!pairing) return;
    await recordSyncActivity({
      partnerName: pairing.partnerName,
      received: result.receivedCounts,
      sent: result.recordsSent,
      at: result.timestamp,
    });
  } catch {
    // Display-only log; nothing to recover.
  }
};

/** Which feature's NEW badge each openSection deep-link target clears. */
const SECTION_FEATURE_IDS: Record<ProfileSpotlightSection, string> = {
  connections: "bank-connections",
  businesses: "business-expenses",
  people: "people-assignment",
  tipJar: "tip-jar",
  trackingReminders: "tracking-reminders",
  theme: "deep-sea-theme",
  appLock: "app-lock",
};

const ProfileScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, "Profile">>();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const insets = useSafeAreaInsets();

  /** Current theme context */
  const { colors, showAmbientBackground } = useTheme();
  const { tokens } = useDensity();
  const coachmark = useTabCoachmark("Profile");
  const { replay: replayCoachmarks } = useCoachmarks();
  const { restartOnboarding } = useOnboardingGate();
  const scrollRef = useRef<ScrollView>(null);
  // Keeps inline inputs (display-name editor) visible above the keyboard on
  // Android; iOS uses the ScrollView's automaticallyAdjustKeyboardInsets.
  const onKeyboardInputScroll = useAndroidKeyboardInputScroll(scrollRef);
  const styles = useProfileStyles(tokens, colors);
  const { setPreferenceId } = useCurrency();

  /** Imperative handles into sections for the banner + deep links. */
  const dataSectionRef = useRef<DataSectionHandle>(null);
  const connectionsSectionRef = useRef<ConnectionsSectionHandle>(null);
  const settingsSectionRef = useRef<SettingsSectionHandle>(null);

  /** Feature ids whose settings rows currently show a NEW badge. */
  const [newFeatureIds, setNewFeatureIds] = useState<ReadonlySet<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;
    void getAckedFeatureBadgeIds().then((acked) => {
      if (cancelled) return;
      setNewFeatureIds(
        new Set(
          selectNewBadgeIds(
            FEATURE_SPOTLIGHTS,
            acked,
            Updates.runtimeVersion ?? undefined
          )
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Clear a row's NEW badge on first open (no-op once acked). */
  const dismissNewBadge = useCallback(
    (featureId: string) => {
      if (!newFeatureIds.has(featureId)) return;
      setNewFeatureIds((prev) => {
        const next = new Set(prev);
        next.delete(featureId);
        return next;
      });
      void ackFeatureBadge(featureId);
    },
    [newFeatureIds]
  );

  /** Current user account state */
  const [user, setUser] = useState<UserAccount | null>(null);

  /** Deep-link targeted modal visibilities (openSection / openReleaseNotes) */
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showManageBusinesses, setShowManageBusinesses] = useState(false);
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  /** Tip Jar sheet - mounted only while open so the store connection
   *  (expo-iap) is established on demand, not at app start. */
  const [showTipJar, setShowTipJar] = useState(false);

  /** Expense-tracking check-in settings (row subtext + sheet). */
  const [showTrackingReminders, setShowTrackingReminders] = useState(false);
  const [reminderSettings, setReminderSettings] =
    useState<TrackingReminderSettings | null>(null);

  /** Generic themed info/alert modal (replaces all Alert.alert) */
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  /** Partner sync state */
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  /** Backup reminder banner state */
  const [backupState, setBackupState] = useState<BackupReminderState>({});

  const refreshBackupState = useCallback(async () => {
    const state = await getBackupReminderState();
    setBackupState(state);
  }, []);

  /**
   * True while the auto-sync NetInfo/AppState monitor is registered.
   * Component-level (not effect-local) because BOTH the mount effect and
   * the auto-sync toggle can start monitoring - the unmount cleanup must
   * stop it regardless of which path started it, or the listener (and its
   * setLastSyncTime against a torn-down component) leaks.
   */
  const monitoringActiveRef = useRef(false);

  /**
   * True when the mount-time user read failed (DecryptionError, storage
   * timeout). Without this the screen sat on "Loading profile..." forever
   * when any of the mount reads threw - now only the user record is
   * required, everything else degrades to its default.
   */
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  /** Load user on mount (re-runs when Try Again bumps loadAttempt) */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [u, pairState, syncMeta, backup, reminders] =
        await Promise.allSettled([
          getOrCreateUser(),
          getPairingState(),
          getSyncMetadata(),
          getBackupReminderState(),
          getTrackingReminderSettings(),
        ]);
      if (cancelled) return;
      if (u.status === "rejected") {
        if (__DEV__) console.error("Failed to load profile:", u.reason);
        setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      setUser(u.value);
      if (reminders.status === "fulfilled") {
        setReminderSettings(reminders.value);
      }
      if (syncMeta.status === "fulfilled") {
        // Display timestamp survives the post-import watermark reset;
        // older metadata only has the watermark itself.
        setLastSyncTime(
          syncMeta.value.lastSyncCompletedAt ?? syncMeta.value.lastSyncTimestamp
        );
      }
      if (backup.status === "fulfilled") {
        setBackupState(backup.value);
      }
      if (pairState.status === "fulfilled") {
        setPairing(pairState.value);
        if (pairState.value?.autoSyncEnabled) {
          startMonitoring((result) => {
            if (result.success) {
              void noteSyncActivity(result).then(() => setLastSyncTime(result.timestamp));
            }
          });
          monitoringActiveRef.current = true;
        }
      }
      if (__DEV__) {
        [pairState, syncMeta, backup, reminders].forEach((r) => {
          if (r.status === "rejected") {
            console.error("Profile secondary read failed:", r.reason);
          }
        });
      }
    };
    load();
    return () => {
      cancelled = true;
      if (monitoringActiveRef.current) {
        stopMonitoring();
        monitoringActiveRef.current = false;
      }
    };
  }, [loadAttempt]);

  // "What's new" deep-link navigates here with openReleaseNotes set.
  // Deferred past the tab-switch transition: presenting a Modal
  // mid-navigation is the iOS silent-present failure this codebase keeps
  // hitting, and it also keeps the setState out of the effect's synchronous
  // body.
  useEffect(() => {
    if (!route.params?.openReleaseNotes) return;
    const task = InteractionManager.runAfterInteractions(() => {
      setShowReleaseNotesModal(true);
      navigation.setParams({ openReleaseNotes: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.openReleaseNotes]);

  // Feature-spotlight CTAs deep-link here with openSection set. Same
  // deferral rationale as the openReleaseNotes effect above: never present
  // a Modal mid-tab-transition. Opening the surface also clears its NEW
  // badge - the user has now seen the feature.
  useEffect(() => {
    const section = route.params?.openSection;
    if (!section) return;
    const task = InteractionManager.runAfterInteractions(() => {
      switch (section) {
        case "connections":
          connectionsSectionRef.current?.openConnections();
          break;
        case "businesses":
          setShowManageBusinesses(true);
          break;
        case "people":
          setShowManagePeople(true);
          break;
        case "tipJar":
          setShowTipJar(true);
          break;
        case "trackingReminders":
          setShowTrackingReminders(true);
          break;
        case "theme":
          setShowThemeModal(true);
          break;
        case "appLock":
          settingsSectionRef.current?.openAppLock();
          break;
      }
      dismissNewBadge(SECTION_FEATURE_IDS[section]);
      navigation.setParams({ openSection: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.openSection, dismissNewBadge]);

  /** Mirror a saved currency change onto the user account (SettingsSection). */
  const handleCurrencyApplied = useCallback((id: CurrencyPreferenceId) => {
    setUser((current) =>
      current ? { ...current, currencyPreferenceId: id } : current,
    );
  }, []);

  /* ─── Partner Sync Handlers ─── */

  const handlePaired = useCallback((state: PairingState) => {
    setPairing(state);
    setInfoModal({
      title: "Paired!",
      message: `You're now paired with ${state.partnerName}. Tap "Sync Now" anytime to share data.`,
    });
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (
      syncStatus === "syncing" ||
      syncStatus === "discovering" ||
      syncStatus === "connecting"
    )
      return;
    try {
      const result = await syncNow((status) => setSyncStatus(status));
      if (result.success) {
        await noteSyncActivity(result);
        setLastSyncTime(result.timestamp);
        setInfoModal({
          title: "Sync Complete",
          message: `Sent ${result.recordsSent} records, received ${result.recordsReceived} records.`,
        });
      } else {
        setInfoModal({
          title: "Sync Failed",
          message: result.error || "Could not connect to partner.",
        });
      }
    } catch {
      setSyncStatus("error");
    }
    setSyncStatus("idle");
  }, [syncStatus]);

  const handleUnpair = useCallback(async () => {
    await clearPairingState();
    stopMonitoring();
    monitoringActiveRef.current = false;
    setPairing(null);
    setLastSyncTime(null);
    setInfoModal({
      title: "Unpaired",
      message:
        "Partner sync has been disconnected. Your data is still on this device.",
    });
  }, []);

  const handleSetHomeNetwork = useCallback(async () => {
    if (Platform.OS === "android") {
      const granted = await requestLocationPermission();
      if (!granted) {
        setInfoModal({
          title: "Permission Required",
          message:
            "Location permission is needed to read the WiFi network name for auto-sync. Your location is never stored or shared.",
        });
        return;
      }
    }
    const ssid = await getCurrentSSID();
    if (!ssid) {
      setInfoModal({
        title: "No WiFi Detected",
        message:
          Platform.OS === "ios"
            ? 'Unable to read your WiFi network name. Make sure you are connected to WiFi, then check:\n\n1. Settings > Privacy & Security > Location Services - turn on for BudgetArk ("While Using")\n2. Settings > Privacy & Security > Local Network - turn on for BudgetArk\n\niOS requires location access to read the WiFi name. Your location is never stored or shared.'
            : "Connect to your home WiFi first, then try again.",
      });
      return;
    }
    try {
      await updateHomeSSID(ssid);
    } catch (error) {
      // savePairingState is fail-closed (the sync key must never be written
      // in plaintext); tell the user rather than pretend the toggle took.
      if (__DEV__) console.error("Failed to save home network:", error);
      setInfoModal({
        title: "Couldn't Save Home Network",
        message:
          "BudgetArk couldn't write the pairing settings securely on this device. Nothing was changed - please try again.",
      });
      return;
    }
    setPairing((prev) => (prev ? { ...prev, homeSSID: ssid } : null));
    setInfoModal({
      title: "Home Network Set",
      message: `Auto-sync will trigger when both devices are on "${ssid}".`,
    });
  }, []);

  const handleToggleAutoSync = useCallback(async () => {
    if (!pairing) return;
    const next = !pairing.autoSyncEnabled;
    try {
      await setAutoSyncEnabled(next);
    } catch (error) {
      // Same fail-closed write as the home-network toggle.
      if (__DEV__) console.error("Failed to save auto-sync setting:", error);
      setInfoModal({
        title: "Couldn't Save Setting",
        message:
          "BudgetArk couldn't write the pairing settings securely on this device. Nothing was changed - please try again.",
      });
      return;
    }
    setPairing((prev) => (prev ? { ...prev, autoSyncEnabled: next } : null));
    if (next) {
      startMonitoring((result) => {
        if (result.success) {
          void noteSyncActivity(result).then(() => setLastSyncTime(result.timestamp));
        }
      });
      monitoringActiveRef.current = true;
    } else {
      stopMonitoring();
      monitoringActiveRef.current = false;
    }
  }, [pairing]);

  /**
   * Resets all app data after user confirmation (DataSection's confirm
   * modal calls this). Clears debts, payments, and user account, creates a
   * fresh anonymous account, and drops back into first-launch onboarding.
   */
  const confirmReset = useCallback(async () => {
    triggerHaptic("warning");
    try {
      await clearAllData();
    } catch (err) {
      // `clearAllData` throws `ResetIncompleteError` when a non-atomic
      // multi-key clear leaves some keys behind. Surface that to the user
      // instead of pretending the reset succeeded - the leftover keys could
      // make the next session look corrupt or partially-onboarded.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Some data could not be cleared. Try again or reinstall the app to complete the reset.";
      setInfoModal({
        title: "Reset incomplete",
        message: `${message} Please try Reset All Data again.`,
      });
      return;
    }
    await clearPairingState();
    stopMonitoring();
    monitoringActiveRef.current = false;
    // RESET_KEYS only clears AsyncStorage - receipt photo files live in the
    // document directory and must be wiped separately or a fresh account
    // inherits the previous user's encrypted receipts on disk.
    await clearAllAttachments();
    // Same for auto-backup files: a reset means "erase my data", and a
    // fresh account must not be able to restore the previous user's world.
    await clearAllAutoBackups();
    // The reminder settings key was just wiped (disabled by default), so any
    // pending check-in notifications are orphaned - cancel them now. Same
    // for keep-alive nudges: the debts they were planned from are gone.
    await cancelAllTrackingReminders();
    await cancelAllCardKeepAliveReminders();
    setReminderSettings(null);
    await deleteAccount();
    // The fresh account starts with onboardingComplete=false, so the gate
    // below relaunches straight into the first-launch flow.
    const freshUser = await getOrCreateUser();
    await setPreferenceId(DEFAULT_CURRENCY_PREFERENCE_ID);
    // Storage was wiped but the coachmarks provider still holds "seen" state
    // in memory - reset it so the fresh account gets the first-launch tour.
    await replayCoachmarks();
    setUser(freshUser);
    setPairing(null);
    setLastSyncTime(null);
    // No "Done" modal here: restarting onboarding unmounts this screen (and
    // any modal it would present) immediately.
    restartOnboarding();
  }, [replayCoachmarks, restartOnboarding, setPreferenceId]);

  const closeTrackingReminders = useCallback(() => {
    setShowTrackingReminders(false);
    // Refresh the settings-row subtext with whatever was saved.
    void getTrackingReminderSettings().then(setReminderSettings);
  }, []);

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: showAmbientBackground ? "transparent" : colors.bg,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        {loadFailed ? (
          <>
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Couldn't load your profile
            </Text>
            <Text
              style={{
                color: colors.textDim,
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              BudgetArk couldn't read its saved data on this device. This can
              happen when the phone is very low on free storage. Your data has
              not been changed.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.accent,
                paddingHorizontal: 28,
                paddingVertical: 10,
                borderRadius: 10,
              }}
              onPress={() => setLoadAttempt((n) => n + 1)}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={{ color: colors.bg, fontSize: 15, fontWeight: "600" }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ color: colors.textDim, fontSize: 14 }}>
            Loading profile...
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : undefined}
        style={styles.screen}
      >
      <ScrollView
        ref={scrollRef}
        style={[
          styles.screen,
          {
            backgroundColor: showAmbientBackground ? "transparent" : colors.bg,
          },
        ]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
        ]}
        automaticallyAdjustKeyboardInsets
        onScroll={onKeyboardInputScroll}
        scrollEventThrottle={16}
      >
        {/* ── Backup reminder banner ── */}
        <BackupReminderBanner
          backupState={backupState}
          onBackUpNow={() => dataSectionRef.current?.openExport()}
          onRefreshBackupState={refreshBackupState}
        />

        {/* ── Header ── */}
        <View style={styles.titleSection}>
          <Text style={[styles.appLabel, { color: colors.textDim }]}>
            BudgetArk
          </Text>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Profile
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
            Your anonymous account settings.
          </Text>
        </View>

        {/* ── Mission Statement ── */}
        <MissionCard />

        {/* ── Profile Card ── */}
        <ProfileCard user={user} onUserUpdated={setUser} />

        {/* ── Send Feedback + Tip Jar ── */}
        <SupportSection
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={dismissNewBadge}
          showTipJar={showTipJar}
          onOpenTipJar={() => setShowTipJar(true)}
          onCloseTipJar={() => setShowTipJar(false)}
          showInfo={setInfoModal}
        />

        {/* ── Appearance (Theme + Currency) ── */}
        <AppearanceSection
          scrollRef={scrollRef}
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={dismissNewBadge}
          showThemeModal={showThemeModal}
          onOpenThemeModal={() => setShowThemeModal(true)}
          onCloseThemeModal={() => setShowThemeModal(false)}
        />

        {/* ── Partner Sync ── */}
        <PartnerSyncSection
          pairing={pairing}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          onPaired={handlePaired}
          onSyncNow={handleSyncNow}
          onSetHomeNetwork={handleSetHomeNetwork}
          onToggleAutoSync={handleToggleAutoSync}
          onUnpair={handleUnpair}
        />

        {/* ── Progress (Ship's Log achievements) ── */}
        <ProgressSection />

        {/* ── Categories ── */}
        <CategoriesSection />

        {/* ── Business expenses ── */}
        <BusinessSection
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={dismissNewBadge}
          showManageBusinesses={showManageBusinesses}
          onOpenManageBusinesses={() => setShowManageBusinesses(true)}
          onCloseManageBusinesses={() => setShowManageBusinesses(false)}
        />

        {/* ── People ── */}
        <PeopleSection
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={dismissNewBadge}
          showManagePeople={showManagePeople}
          onOpenManagePeople={() => setShowManagePeople(true)}
          onCloseManagePeople={() => setShowManagePeople(false)}
        />

        {/* ── Data (Export, Import, Reset) ── */}
        <DataSection
          ref={dataSectionRef}
          showInfo={setInfoModal}
          onRefreshBackupState={refreshBackupState}
          onConfirmReset={confirmReset}
        />

        {/* ── Bank Connections (BYO API) ── */}
        <ConnectionsSection
          ref={connectionsSectionRef}
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={dismissNewBadge}
        />

        {/* ── Settings (privacy, updates) ── */}
        <SettingsSection
          ref={settingsSectionRef}
          pairing={pairing}
          showInfo={setInfoModal}
          onCurrencyApplied={handleCurrencyApplied}
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={dismissNewBadge}
          reminderSettings={reminderSettings}
          showTrackingReminders={showTrackingReminders}
          onOpenTrackingReminders={() => setShowTrackingReminders(true)}
          onCloseTrackingReminders={closeTrackingReminders}
        />

        {/* ── Help (how-to + replay onboarding) ── */}
        <HelpSection scrollRef={scrollRef} />

        {/* ── About (release notes, github) ── */}
        <AboutSection
          showReleaseNotesModal={showReleaseNotesModal}
          onOpenReleaseNotes={() => setShowReleaseNotesModal(true)}
          onCloseReleaseNotes={() => setShowReleaseNotesModal(false)}
        />

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            {`BudgetArk v${CURRENT_APP_VERSION || "?"}`}
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Generic Info/Alert Modal ── */}
      <Modal
        visible={infoModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {infoModal?.title}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {infoModal?.message}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={() => setInfoModal(null)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {coachmark}
    </>
  );
};

export default ProfileScreen;
