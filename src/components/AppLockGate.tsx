/**
 * BudgetArk - App Lock Gate
 * File: src/components/AppLockGate.tsx
 *
 * Renders its children only once the optional app PIN has been entered.
 * Mounted in App.tsx around the main (post-onboarding) tree.
 *
 * Locking model:
 * - Cold start with a PIN set → locked before anything financial mounts.
 * - Returning from background after more than RELOCK_GRACE_MS → locked.
 *   The grace window keeps quick app switches (authenticator, messages)
 *   from demanding the PIN every time. iOS "inactive" (control center,
 *   app-switcher peek) deliberately never locks.
 * - While locked the children are NOT rendered at all - a lock overlay
 *   could be occluded by an open RN Modal (the iOS stacked-modal failure
 *   this codebase keeps hitting), so the tree is unmounted instead. The
 *   cost is that unlocking after a long background returns to the initial
 *   tab; accepted deliberately.
 * - The record is re-read on every foreground, so a PIN set, changed, or
 *   turned off in Profile is honored without an app restart.
 *
 * Wrong guesses feed the persisted escalating lockout in appLockStorage -
 * force-quitting the app does not reset the clock. The verify/lockout
 * machine itself is hooks/usePinVerifier, shared with AppLockSetupModal.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
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
import { formatLockoutRemaining } from "../utils/appLock";
import { getAppLockRecord } from "../storage/appLockStorage";
import { triggerHaptic } from "../utils/haptics";
import { usePinVerifier } from "../hooks/usePinVerifier";
import PinPad from "./PinPad";

const RELOCK_GRACE_MS = 15_000;

type GateStatus = "loading" | "unlocked" | "locked";

const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [status, setStatus] = useState<GateStatus>("loading");
  const [pin, setPin] = useState("");
  const {
    record,
    adoptRecord,
    lockoutMsLeft,
    lockedOut,
    verifying,
    error,
    setError,
    verify,
  } = usePinVerifier(status === "locked");

  const loadedRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);

  /** Cold start: resolve the lock state before rendering anything. */
  useEffect(() => {
    let cancelled = false;
    void getAppLockRecord().then((loaded) => {
      if (cancelled) return;
      loadedRef.current = true;
      adoptRecord(loaded);
      setStatus(loaded ? "locked" : "unlocked");
    });
    return () => {
      cancelled = true;
    };
  }, [adoptRecord]);

  /** Relock when returning from a long background stay. */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        if (backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now();
        }
        return;
      }
      if (state !== "active" || !loadedRef.current) return;
      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      void getAppLockRecord().then((loaded) => {
        // Adopting also re-syncs the lockout countdown with the clock.
        adoptRecord(loaded);
        if (!loaded) {
          // PIN was turned off (or the record became unreadable) - never
          // strand the user on a lock screen with nothing to verify against.
          setStatus("unlocked");
          return;
        }
        const awayMs =
          backgroundedAt === null ? 0 : Date.now() - backgroundedAt;
        if (awayMs > RELOCK_GRACE_MS) {
          setPin("");
          setError(null);
          setStatus("locked");
        }
      });
    });
    return () => subscription.remove();
  }, [adoptRecord, setError]);

  const handleChange = useCallback(
    (next: string) => {
      if (!record || verifying || lockedOut) return;
      setError(null);
      setPin(next);
      if (next.length === record.pinLength) {
        void verify(next).then((ok) => {
          setPin("");
          if (ok) {
            triggerHaptic("success");
            setStatus("unlocked");
          }
        });
      }
    },
    [lockedOut, record, setError, verify, verifying]
  );

  const handleForgotPin = useCallback(() => {
    Alert.alert(
      "Forgot your PIN?",
      "Your PIN is stored only on this phone and can't be recovered or reset from here.\n\nTo use BudgetArk again, delete the app and reinstall it. That erases the data on this phone, so afterwards restore from a backup file - or sync from your partner's device if you're paired.",
      [{ text: "OK" }]
    );
  }, []);

  if (status === "unlocked") {
    return <>{children}</>;
  }

  if (status === "loading") {
    // Plain background while the record loads - never flash financial data
    // ahead of the lock decision.
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  return (
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
      <View style={styles.header}>
        <Text style={styles.anchor}>⚓</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          BudgetArk is locked
        </Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          {lockedOut
            ? `Too many attempts - try again in ${formatLockoutRemaining(lockoutMsLeft)}`
            : "Enter your PIN"}
        </Text>
      </View>

      <PinPad
        value={pin}
        onChange={handleChange}
        expectedLength={record?.pinLength}
        disabled={verifying || lockedOut}
      />

      <View style={styles.footer}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {!lockedOut && error ? error : " "}
        </Text>
        <TouchableOpacity
          onPress={handleForgotPin}
          accessibilityRole="button"
          accessibilityLabel="Forgot PIN help"
        >
          <Text style={[styles.forgotText, { color: colors.textDim }]}>
            Forgot your PIN?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: tokens.pad * 2,
    },
    header: {
      alignItems: "center",
      marginBottom: tokens.gap * 2,
    },
    anchor: {
      fontSize: 44,
      marginBottom: tokens.gap,
    },
    title: {
      fontSize: 20 * tokens.fontScale,
      fontWeight: "700",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14 * tokens.fontScale,
      textAlign: "center",
    },
    footer: {
      alignItems: "center",
      marginTop: tokens.gap * 2,
    },
    errorText: {
      fontSize: 14 * tokens.fontScale,
      fontWeight: "600",
      marginBottom: tokens.gap,
      minHeight: 18,
    },
    forgotText: {
      fontSize: 13 * tokens.fontScale,
      textDecorationLine: "underline",
    },
  });

export default AppLockGate;
