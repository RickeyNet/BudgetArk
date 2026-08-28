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
 * gate - otherwise this modal would be an unthrottled oracle for someone
 * holding an unlocked phone (PINs get reused on other things).
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
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  type AppLockRecord,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  formatLockoutRemaining,
  isValidPin,
  lockoutRemainingMs,
  verifyPinAgainstRecord,
} from "../utils/appLock";
import {
  changeAppLockPin,
  disableAppLock,
  enableAppLock,
  getAppLockRecord,
  recordFailedAttempt,
  recordSuccessfulUnlock,
} from "../storage/appLockStorage";
import { triggerHaptic } from "../utils/haptics";
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
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [record, setRecord] = useState<AppLockRecord | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [intent, setIntent] = useState<Intent>("enable");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockoutMsLeft, setLockoutMsLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getAppLockRecord().then((loaded) => {
      if (cancelled) return;
      setRecord(loaded);
      if (loaded) {
        setLockoutMsLeft(lockoutRemainingMs(loaded, Date.now()));
        setStep("menu");
      } else {
        setIntent("enable");
        setStep("new");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lockedOut = lockoutMsLeft > 0;
  useEffect(() => {
    if (step !== "verify" || !lockedOut) return;
    const id = setInterval(() => {
      setLockoutMsLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [step, lockedOut]);

  const beginVerify = useCallback(
    (nextIntent: Intent) => {
      setIntent(nextIntent);
      setPin("");
      setError(null);
      if (record) setLockoutMsLeft(lockoutRemainingMs(record, Date.now()));
      setStep("verify");
    },
    [record]
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
            title: "App Lock On",
            message:
              "BudgetArk will ask for your PIN when it opens. Your PIN stays on this phone only - if you forget it, you'll need to reinstall the app and restore from a backup.",
          });
        } else {
          await changeAppLockPin(chosenPin);
          triggerHaptic("success");
          finish({
            title: "PIN Changed",
            message: "Your new PIN takes effect the next time the app locks.",
          });
        }
      } catch {
        // EncryptionUnavailableError or a storage failure - nothing was
        // (fully) saved; let the user retry rather than pretending success.
        triggerHaptic("error");
        setBusy(false);
        setPin("");
        setFirstPin("");
        setError("Couldn't save the PIN. Please try again.");
        setStep("new");
      }
    },
    [finish, intent]
  );

  const handleVerifySubmit = useCallback(
    async (candidate: string) => {
      if (!record || busy) return;
      setBusy(true);
      try {
        if (await verifyPinAgainstRecord(candidate, record)) {
          const cleared = await recordSuccessfulUnlock(record).catch(
            () => record
          );
          setRecord(cleared);
          setPin("");
          setError(null);
          if (intent === "disable") {
            try {
              await disableAppLock();
            } catch {
              // The PIN was right but the record couldn't be removed - the
              // lock is still on; say so instead of reporting "App Lock Off".
              triggerHaptic("error");
              setError("Couldn't turn off App Lock. Please try again.");
              return;
            }
            triggerHaptic("success");
            finish({
              title: "App Lock Off",
              message: "BudgetArk will open without asking for a PIN.",
            });
            return;
          }
          setStep("new");
          return;
        }
        triggerHaptic("error");
        let next = record;
        try {
          next = await recordFailedAttempt(record);
        } catch {
          next = { ...record, failedAttempts: record.failedAttempts + 1 };
        }
        setRecord(next);
        setPin("");
        setLockoutMsLeft(lockoutRemainingMs(next, Date.now()));
        setError("Incorrect PIN - try again");
      } finally {
        setBusy(false);
      }
    },
    [busy, finish, intent, record]
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
          setError("PINs didn't match - choose a PIN again");
          setStep("new");
        }
      }
    },
    [busy, firstPin, handleVerifySubmit, record, saveNewPin, step]
  );

  const handleNewPinSubmit = useCallback(() => {
    if (!isValidPin(pin)) {
      setError(`Use ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`);
      return;
    }
    setFirstPin(pin);
    setPin("");
    setError(null);
    setStep("confirm");
  }, [pin]);

  const stepTitle =
    step === "menu"
      ? "App Lock"
      : step === "verify"
        ? "Enter your current PIN"
        : step === "confirm"
          ? "Re-enter your new PIN"
          : intent === "change"
            ? "Choose a new PIN"
            : "Choose a PIN";

  const subtitle =
    step === "verify" && lockedOut
      ? `Too many attempts - try again in ${formatLockoutRemaining(lockoutMsLeft)}`
      : step === "new"
        ? `${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits, then tap ✓`
        : step === "confirm"
          ? "Same digits, one more time"
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
            accessibilityLabel="Close App Lock settings"
          >
            <Text style={[styles.cancelText, { color: colors.textDim }]}>
              Cancel
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
                App Lock is on - BudgetArk asks for your{" "}
                {record.pinLength}-digit PIN when it opens.
              </Text>
              <TouchableOpacity
                style={[
                  styles.menuButton,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
                onPress={() => beginVerify("change")}
              >
                <Text style={[styles.menuButtonText, { color: colors.text }]}>
                  Change PIN
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
                  Turn Off App Lock
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
              Saving...
            </Text>
          ) : null}

          <Text style={[styles.errorText, { color: colors.danger }]}>
            {!lockedOut && error ? error : " "}
          </Text>

          {step === "new" && intent === "enable" ? (
            <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
              Your PIN stays on this phone - it's never backed up, exported,
              or synced to your partner. If you forget it, you'll need to
              reinstall the app and restore from a backup.
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
