/**
 * BudgetArk - Pairing Modal
 * File: src/components/PairingModal.tsx
 *
 * Two-mode modal for the one-time device pairing flow.
 * Mode A (Initiator): Shows a 6-digit code with countdown timer.
 * Mode B (Joiner): Text input for entering the partner's code.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import {
  generatePairingCode,
  normalizePairingCode,
  startPairingAsInitiator,
  joinPairing,
  type PendingPairing,
} from "../sync/pairingService";
import * as Discovery from "../sync/discoveryService";
import type { PairingState, PairingRole } from "../sync/types";
import { EncryptionUnavailableError } from "../storage/encryptedStorage";

const CODE_LENGTH = 8;

/** Parse "host:port" string, returns null if invalid */
const parseAddress = (input: string): { host: string; port: number } | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon === -1) return null;
  const host = trimmed.slice(0, lastColon);
  const port = parseInt(trimmed.slice(lastColon + 1), 10);
  if (!host || isNaN(port) || port < 1 || port > 65535) return null;
  return { host, port };
};

interface PairingModalProps {
  visible: boolean;
  onClose: () => void;
  onPaired: (state: PairingState) => void;
}

const TIMEOUT_SECONDS = 60;

const PairingModal: React.FC<PairingModalProps> = ({ visible, onClose, onPaired }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [role, setRole] = useState<PairingRole | null>(null);
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [countdown, setCountdown] = useState(TIMEOUT_SECONDS);
  const [status, setStatus] = useState<"idle" | "waiting" | "connecting" | "verify" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingPairing | null>(null);
  const [serverAddress, setServerAddress] = useState("");
  const [serverPort, setServerPort] = useState(0);
  const [manualIp, setManualIp] = useState("");
  const [showManualIp, setShowManualIp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverCloseRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);

  // Reset state when modal opens/closes. The teardown body lives in a single
  // function so it also runs on parent unmount via the effect's return -
  // without that, a parent that unmounts the modal while it's still `visible`
  // would leak the countdown interval, the listening TCP server, and the
  // Zeroconf publish. Fixes a bug where retry attempts wedged on the same
  // port because the prior session was still bound.
  useEffect(() => {
    const teardown = () => {
      cancelledRef.current = true;
      setRole(null);
      setCode("");
      setJoinCode("");
      setCountdown(TIMEOUT_SECONDS);
      setStatus("idle");
      setError("");
      setServerAddress("");
      setServerPort(0);
      setManualIp("");
      setShowManualIp(false);
      setPending(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (serverCloseRef.current) {
        serverCloseRef.current();
        serverCloseRef.current = null;
      }
      Discovery.stop();
    };

    if (!visible) {
      teardown();
    } else {
      cancelledRef.current = false;
    }

    return () => {
      teardown();
    };
  }, [visible]);

  const startInitiator = useCallback(async () => {
    const newCode = generatePairingCode();
    setCode(newCode);
    setRole("initiator");
    setStatus("waiting");
    setCountdown(TIMEOUT_SECONDS);

    // Start countdown
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const result = await startPairingAsInitiator(
        newCode,
        () => {
          if (cancelledRef.current) return;
          setStatus("error");
          setError(t("modals.guard.pairing.errors.timedOut"));
        },
        (ip, port, closeFn) => {
          serverCloseRef.current = closeFn;
          if (cancelledRef.current) return;
          setServerPort(port);
          if (ip) setServerAddress(`${ip}:${port}`);
        }
      );
      if (cancelledRef.current) return;
      if (timerRef.current) clearInterval(timerRef.current);
      setPending(result);
      setStatus("verify");
    } catch (err) {
      if (cancelledRef.current) return;
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus("error");
      setError(err instanceof Error ? err.message : t("modals.guard.pairing.errors.failed"));
    }
  }, [t]);

  const startJoiner = useCallback(async () => {
    const normalized = normalizePairingCode(joinCode);
    if (normalized.length !== CODE_LENGTH) {
      setError(t("modals.guard.pairing.errors.codeLength", { length: CODE_LENGTH }));
      return;
    }

    setStatus("connecting");
    setError("");

    try {
      const manual = showManualIp ? parseAddress(manualIp) : undefined;
      if (showManualIp && !manual) {
        setStatus("error");
        setError(t("modals.guard.pairing.errors.invalidAddress"));
        return;
      }
      const result = await joinPairing(normalized, manual ?? undefined);
      setPending(result);
      setStatus("verify");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("modals.guard.pairing.errors.connectFailed"));
    }
  }, [joinCode, showManualIp, manualIp, t]);

  const confirmFingerprint = useCallback(async () => {
    if (!pending) return;
    try {
      await pending.commit();
      onPaired(pending.pairingState);
    } catch (err) {
      setStatus("error");
      // savePairingState is fail-closed: the sync key is never written in
      // plaintext. Its error message names the storage key, so translate.
      setError(
        err instanceof EncryptionUnavailableError
          ? t("modals.guard.pairing.errors.keystoreUnavailable")
          : err instanceof Error
            ? err.message
            : t("modals.guard.pairing.errors.saveFailed")
      );
    }
  }, [pending, onPaired, t]);

  const rejectFingerprint = useCallback(() => {
    // No commit ran - nothing to undo. Close the modal so the user can
    // restart pairing from scratch with a fresh code.
    setPending(null);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        // padding on both platforms: the RN Modal's Android window isn't
        // auto-resized for the keyboard, so the KAV has to do the lift or the
        // input hides behind it. padding slides it up smoothly; "height" mode
        // re-lays-out the subtree each frame and glitches on dismiss.
        behavior="padding"
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <View onStartShouldSetResponder={() => true}>
            <View style={[
              styles.card,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 24 }
                : null,
            ]}>
              <Text style={styles.title}>{t("modals.guard.pairing.title")}</Text>
              <Text style={styles.subtitle}>{t("modals.guard.pairing.subtitle")}</Text>

              {/* Role selection */}
              {!role && (
                <View style={styles.roleContainer}>
                  <TouchableOpacity style={styles.roleButton} onPress={startInitiator}>
                    <Text style={styles.roleButtonTitle}>{t("modals.guard.pairing.roles.show.title")}</Text>
                    <Text style={styles.roleButtonHint}>{t("modals.guard.pairing.roles.show.hint")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => setRole("joiner")}
                  >
                    <Text style={styles.roleButtonTitle}>{t("modals.guard.pairing.roles.enter.title")}</Text>
                    <Text style={styles.roleButtonHint}>{t("modals.guard.pairing.roles.enter.hint")}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Initiator: show code */}
              {role === "initiator" && status !== "verify" && (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeDisplay}>{code}</Text>
                  {serverAddress ? (
                    <Text style={styles.addressText} selectable>
                      {serverAddress}
                    </Text>
                  ) : serverPort > 0 ? (
                    <Text style={styles.ipHintText}>
                      {t("modals.guard.pairing.portHint", { port: serverPort })}
                    </Text>
                  ) : null}
                  <Text style={styles.countdownText}>
                    {status === "waiting"
                      ? t("modals.guard.pairing.waiting", { seconds: countdown })
                      : status === "error"
                      ? ""
                      : t("modals.guard.pairing.connecting")}
                  </Text>
                  {status === "waiting" && (
                    <ActivityIndicator
                      size="small"
                      color={colors.accent}
                      style={{ marginTop: 12 }}
                    />
                  )}
                </View>
              )}

              {/* Joiner: enter code */}
              {role === "joiner" && status !== "verify" && (
                <View style={styles.joinContainer}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="XXXX-XXXX"
                    placeholderTextColor={colors.textMuted}
                    value={joinCode}
                    onChangeText={(text) => {
                      const norm = normalizePairingCode(text);
                      setJoinCode(
                        norm.length > 4 ? `${norm.slice(0, 4)}-${norm.slice(4)}` : norm
                      );
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={CODE_LENGTH + 1}
                    autoFocus
                    editable={status !== "connecting"}
                  />
                  <TouchableOpacity onPress={() => setShowManualIp((v) => !v)}>
                    <Text style={styles.manualToggle}>
                      {showManualIp ? t("modals.guard.pairing.discovery.useAutomatic") : t("modals.guard.pairing.discovery.enterManually")}
                    </Text>
                  </TouchableOpacity>
                  {showManualIp && (
                    <TextInput
                      style={styles.ipInput}
                      placeholder="192.168.1.5:12345"
                      placeholderTextColor={colors.textMuted}
                      value={manualIp}
                      onChangeText={setManualIp}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={status !== "connecting"}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.connectButton,
                      (normalizePairingCode(joinCode).length !== CODE_LENGTH ||
                        status === "connecting") &&
                        styles.connectButtonDisabled,
                    ]}
                    onPress={startJoiner}
                    disabled={
                      normalizePairingCode(joinCode).length !== CODE_LENGTH ||
                      status === "connecting"
                    }
                  >
                    <Text style={styles.connectButtonText}>
                      {status === "connecting" ? t("modals.guard.pairing.connecting") : t("modals.guard.pairing.connect")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Verify fingerprint - both devices land here after key exchange */}
              {status === "verify" && pending && (
                <View style={styles.verifyContainer}>
                  <Text style={styles.verifyHeading}>{t("modals.guard.pairing.verify.heading")}</Text>
                  <Text style={styles.verifyHint}>{t("modals.guard.pairing.verify.hint")}</Text>
                  <Text style={styles.fingerprintDisplay}>{pending.fingerprint}</Text>
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={confirmFingerprint}
                  >
                    <Text style={styles.connectButtonText}>{t("modals.guard.pairing.verify.match")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.verifyRejectButton}
                    onPress={rejectFingerprint}
                  >
                    <Text style={styles.verifyRejectText}>{t("modals.guard.pairing.verify.mismatch")}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Cancel */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-end",
    },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      padding: 24,
      gap: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
    },
    roleContainer: {
      gap: 12,
    },
    roleButton: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 16,
      backgroundColor: colors.bg,
    },
    roleButtonTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accent,
      marginBottom: 4,
    },
    roleButtonHint: {
      fontSize: 13,
      color: colors.textDim,
    },
    codeContainer: {
      alignItems: "center",
      paddingVertical: 16,
    },
    codeDisplay: {
      fontSize: 40,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: 6,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    addressText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textDim,
      marginTop: 8,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    ipHintText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: "center",
      lineHeight: 18,
    },
    countdownText: {
      fontSize: 14,
      color: colors.textDim,
      marginTop: 12,
    },
    joinContainer: {
      gap: 12,
    },
    manualToggle: {
      fontSize: 13,
      color: colors.accent,
      textAlign: "center",
    },
    ipInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      textAlign: "center",
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    codeInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      letterSpacing: 4,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    verifyContainer: {
      gap: 12,
      alignItems: "center",
      paddingVertical: 8,
    },
    verifyHeading: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    verifyHint: {
      fontSize: 13,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 18,
    },
    fingerprintDisplay: {
      fontSize: 36,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: 4,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      marginVertical: 8,
    },
    verifyRejectButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    verifyRejectText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "600",
    },
    connectButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    connectButtonDisabled: {
      opacity: 0.4,
    },
    connectButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      textAlign: "center",
    },
    cancelButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    cancelText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
  });

export default React.memo(PairingModal);
