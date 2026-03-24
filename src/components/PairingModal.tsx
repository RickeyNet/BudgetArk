/**
 * BudgetArk — Pairing Modal
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
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { generatePairingCode, startPairingAsInitiator, joinPairing } from "../sync/pairingService";
import type { PairingState, PairingRole } from "../sync/types";

interface PairingModalProps {
  visible: boolean;
  onClose: () => void;
  onPaired: (state: PairingState) => void;
}

const TIMEOUT_SECONDS = 60;

const PairingModal: React.FC<PairingModalProps> = ({ visible, onClose, onPaired }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [role, setRole] = useState<PairingRole | null>(null);
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [countdown, setCountdown] = useState(TIMEOUT_SECONDS);
  const [status, setStatus] = useState<"idle" | "waiting" | "connecting" | "error">("idle");
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setRole(null);
      setCode("");
      setJoinCode("");
      setCountdown(TIMEOUT_SECONDS);
      setStatus("idle");
      setError("");
      if (timerRef.current) clearInterval(timerRef.current);
    }
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
      const result = await startPairingAsInitiator(newCode, () => {
        setStatus("error");
        setError("Pairing timed out. Try again.");
      });
      if (timerRef.current) clearInterval(timerRef.current);
      onPaired(result);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Pairing failed");
    }
  }, [onPaired]);

  const startJoiner = useCallback(async () => {
    if (joinCode.length !== 6) {
      setError("Please enter the 6-digit code from your partner's device.");
      return;
    }

    setStatus("connecting");
    setError("");

    try {
      const result = await joinPairing(joinCode);
      onPaired(result);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [joinCode, onPaired]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.card}>
              <Text style={styles.title}>Pair with Partner</Text>
              <Text style={styles.subtitle}>
                Both devices must be on the same WiFi network.
              </Text>

              {/* Role selection */}
              {!role && (
                <View style={styles.roleContainer}>
                  <TouchableOpacity style={styles.roleButton} onPress={startInitiator}>
                    <Text style={styles.roleButtonTitle}>Show Code</Text>
                    <Text style={styles.roleButtonHint}>
                      Generate a code for your partner to enter
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => setRole("joiner")}
                  >
                    <Text style={styles.roleButtonTitle}>Enter Code</Text>
                    <Text style={styles.roleButtonHint}>
                      Enter the code from your partner's device
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Initiator: show code */}
              {role === "initiator" && (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeDisplay}>{code}</Text>
                  <Text style={styles.countdownText}>
                    {status === "waiting"
                      ? `Waiting for partner... ${countdown}s`
                      : status === "error"
                      ? ""
                      : "Connecting..."}
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
              {role === "joiner" && (
                <View style={styles.joinContainer}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="000000"
                    placeholderTextColor={colors.textMuted}
                    value={joinCode}
                    onChangeText={(text) => setJoinCode(text.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    editable={status !== "connecting"}
                  />
                  <TouchableOpacity
                    style={[
                      styles.connectButton,
                      (joinCode.length !== 6 || status === "connecting") &&
                        styles.connectButtonDisabled,
                    ]}
                    onPress={startJoiner}
                    disabled={joinCode.length !== 6 || status === "connecting"}
                  >
                    <Text style={styles.connectButtonText}>
                      {status === "connecting" ? "Connecting..." : "Connect"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Cancel */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
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
      fontSize: 48,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: 12,
    },
    countdownText: {
      fontSize: 14,
      color: colors.textDim,
      marginTop: 12,
    },
    joinContainer: {
      gap: 12,
    },
    codeInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      letterSpacing: 8,
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
