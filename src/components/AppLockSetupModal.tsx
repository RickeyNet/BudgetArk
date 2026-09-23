/**
 * BudgetArk - App Lock Setup Modal
 * File: src/components/AppLockSetupModal.tsx
 *
 * Profile → Settings → App Lock. Set, change, or turn off the app-launch
 * PIN. Mounted only while open (TrackingRemindersModal pattern); the parent
 * re-reads the lock state on close.
 *
 * Changing or disabling always verifies the current PIN first, and wrong
 * guesses here feed the same persisted escalating lockout as the launch
 * gate (via the shared hooks/usePinVerifier) - otherwise this modal would
 * be an unthrottled oracle for someone holding an unlocked phone (PINs get
 * reused on other things).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  formatLockoutRemaining,
  isValidPin,
} from "../utils/appLock";
import {
  changeAppLockPin,
  disableAppLock,
  enableAppLock,
  getAppLockRecord,
} from "../storage/appLockStorage";
import { triggerHaptic } from "../utils/haptics";
import { usePinVerifier } from "../hooks/usePinVerifier";
import { waitForIosModalTeardown } from "../utils/iosNativeShare";
import PinPad from "./PinPad";

type Step = "loading" | "menu" | "verify" | "new" | "confirm" | "saving";
type Intent = "enable" | "change" | "disable";

type AppLockSetupModalProps = {
  onClose: () => void;
  /** Surface a result dialog via ProfileScreen's shared info modal. */
  showInfo: (info: { title: string; message: string }) => void;
};

const AppLockSetupModal: React.FC<AppLockSetupModalProps> = ({
  onClose,
  showInfo,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [step, setStep] = useState<Step>("loading");
  const [intent, setIntent] = useState<Intent>("enable");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    record,
    adoptRecord,
    refreshLockout,
    lockoutMsLeft,
    lockedOut,
    error,
    setError,
    verify,
  } = usePinVerifier(step === "verify");

  useEffect(() => {
    let cancelled = false;
    void getAppLockRecord().then((loaded) => {
      if (cancelled) return;
      adoptRecord(loaded);
      if (loaded) {
        setStep("menu");
      } else {
        setIntent("enable");
        setStep("new");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [adoptRecord]);

  const beginVerify = useCallback(
    (nextIntent: Intent) => {
      setIntent(nextIntent);
      setPin("");
      setError(null);
      refreshLockout();
      setStep("verify");
    },
    [refreshLockout, setError]
  );

  const finish = useCallback(
    (info: { title: string; message: string }) => {
      onClose();
      // This full-screen Modal is tearing down; presenting the shared info
      // dialog immediately would stack modals (the iOS silent-present
      // failure). Wait out the teardown first.
      void waitForIosModalTeardown(350).then(() => showInfo(info));
    },
    [onClose, showInfo]
  );

  const saveNewPin = useCallback(
    async (chosenPin: string) => {
      setStep("saving");
      setBusy(true);
      try {
        if (intent === "enable") {
          await enableAppLock(chosenPin);
          triggerHaptic("success");
          finish({
            title: t("modals.guard.lock.results.on.title"),
            message: t("modals.guard.lock.results.on.message"),
          });
        } else {
          await changeAppLockPin(chosenPin);
          triggerHaptic("success");
          finish({
            title: t("modals.guard.lock.results.changed.title"),
            message: t("modals.guard.lock.results.changed.message"),
          });
        }
      } catch {
        // EncryptionUnavailableError or a storage failure - nothing was
        // (fully) saved; let the user retry rather than pretending success.
        triggerHaptic("error");
        setBusy(false);
        setPin("");
        setFirstPin("");
        setError(t("modals.guard.lock.errors.savePin"));
        setStep("new");
      }
    },
    [finish, intent, setError, t]
  );

  const handleVerifySubmit = useCallback(
    async (candidate: string) => {
      if (!record || busy) return;
      setBusy(true);
      try {
        const ok = await verify(candidate);
        setPin("");
        if (!ok) return;
        if (intent === "disable") {
          try {
            await disableAppLock();
          } catch {
            // The PIN was right but the record couldn't be removed - the
            // lock is still on; say so instead of reporting "App Lock Off".
            triggerHaptic("error");
            setError(t("modals.guard.lock.errors.disable"));
            return;
          }
          triggerHaptic("success");
          finish({
            title: t("modals.guard.lock.results.off.title"),
            message: t("modals.guard.lock.results.off.message"),
          });
          return;
        }
        setStep("new");
      } finally {
        setBusy(false);
      }
    },
    [busy, finish, intent, record, setError, t, verify]
  );

  const handlePinChange = useCallback(
    (next: string) => {
      if (busy) return;
      setError(null);
      setPin(next);
      if (step === "verify" && record && next.length === record.pinLength) {
        void handleVerifySubmit(next);
      } else if (step === "confirm" && next.length === firstPin.length) {
        if (next === firstPin) {
          void saveNewPin(next);
        } else {
          triggerHaptic("error");
          setPin("");
          setFirstPin("");
          setError(t("modals.guard.lock.mismatch"));
          setStep("new");
        }
      }
    },
    [busy, firstPin, handleVerifySubmit, record, saveNewPin, setError, step, t]
  );

  const handleNewPinSubmit = useCallback(() => {
    if (!isValidPin(pin)) {
      setError(t("modals.guard.lock.digitsRange", { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH }));
      return;
    }
    setFirstPin(pin);
    setPin("");
    setError(null);
    setStep("confirm");
  }, [pin, setError, t]);

  const stepTitle =
    step === "menu"
      ? t("modals.guard.lock.title")
      : step === "verify"
        ? t("modals.guard.lock.steps.verify")
        : step === "confirm"
          ? t("modals.guard.lock.steps.confirm")
          : intent === "change"
            ? t("modals.guard.lock.steps.change")
            : t("modals.guard.lock.steps.choose");

  const subtitle =
    step === "verify" && lockedOut
      ? t("modals.guard.lock.lockedOut", { remaining: formatLockoutRemaining(lockoutMsLeft) })
      : step === "new"
        ? t("modals.guard.lock.newHint", { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH })
        : step === "confirm"
          ? t("modals.guard.lock.confirmHint")
          : null;

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.bg,
            paddingTop: insets.top + tokens.pad,
            paddingBottom: insets.bottom + tokens.pad,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("modals.guard.lock.closeA11y")}
          >
            <Text style={[styles.cancelText, { color: colors.textDim }]}>
              {t("common.cancel")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.lockGlyph}>🔒</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {stepTitle}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textDim }]}>
              {subtitle}
            </Text>
          ) : null}

          {step === "menu" && record ? (
            <View style={styles.menu}>
              <Text style={[styles.menuNote, { color: colors.textDim }]}>
                {t("modals.guard.lock.menuNote", { digits: record.pinLength })}
              </Text>
              <TouchableOpacity
                style={[
                  styles.menuButton,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
                onPress={() => beginVerify("change")}
              >
                <Text style={[styles.menuButtonText, { color: colors.text }]}>
                  {t("modals.guard.lock.changePin")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.menuButton,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
                onPress={() => beginVerify("disable")}
              >
                <Text style={[styles.menuButtonText, { color: colors.danger }]}>
                  {t("modals.guard.lock.turnOff")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {step === "verify" || step === "new" || step === "confirm" ? (
            <PinPad
              value={pin}
              onChange={handlePinChange}
              expectedLength={
                step === "verify"
                  ? record?.pinLength
                  : step === "confirm"
                    ? firstPin.length
                    : undefined
              }
              onSubmit={step === "new" ? handleNewPinSubmit : undefined}
              disabled={busy || (step === "verify" && lockedOut)}
            />
          ) : null}

          {step === "saving" ? (
            <Text style={[styles.subtitle, { color: colors.textDim }]}>
              {t("modals.guard.lock.saving")}
            </Text>
          ) : null}

          <Text style={[styles.errorText, { color: colors.danger }]}>
            {!lockedOut && error ? error : " "}
          </Text>

          {step === "new" && intent === "enable" ? (
            <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
              {t("modals.guard.lock.privacyNote")}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: tokens.pad * 1.5,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    cancelText: {
      fontSize: 15 * tokens.fontScale,
      fontWeight: "600",
      padding: 4,
    },
    body: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    lockGlyph: {
      fontSize: 40,
      marginBottom: tokens.gap,
    },
    title: {
      fontSize: 19 * tokens.fontScale,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13 * tokens.fontScale,
      textAlign: "center",
      marginBottom: tokens.gap * 1.5,
    },
    menu: {
      alignSelf: "stretch",
      gap: tokens.gap,
      marginTop: tokens.gap,
    },
    menuNote: {
      fontSize: 13 * tokens.fontScale,
      textAlign: "center",
      marginBottom: tokens.gap,
    },
    menuButton: {
      borderWidth: 1,
      borderRadius: tokens.radius,
      paddingVertical: 14,
      alignItems: "center",
    },
    menuButtonText: {
      fontSize: 15 * tokens.fontScale,
      fontWeight: "600",
    },
    errorText: {
      fontSize: 13 * tokens.fontScale,
      fontWeight: "600",
      textAlign: "center",
      marginTop: tokens.gap,
      minHeight: 18,
    },
    privacyNote: {
      fontSize: 12 * tokens.fontScale,
      textAlign: "center",
      lineHeight: 17 * tokens.fontScale,
      marginTop: tokens.gap,
      paddingHorizontal: tokens.pad,
    },
  });

export default AppLockSetupModal;
