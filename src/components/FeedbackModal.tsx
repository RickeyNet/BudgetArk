/**
 * BudgetArk - Feedback Modal
 * File: src/components/FeedbackModal.tsx
 *
 * In-app form for bug reports and feature suggestions.
 * Collects the user's message, attaches device context,
 * and opens their email client with everything pre-filled.
 * Also offers a link to GitHub Issues for public tracking.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { openComposer } from "react-native-email-link";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (result: { title: string; message: string }) => void;
}

type FeedbackType = "bug" | "feature";

const GITHUB_ISSUES_URL = "https://github.com/RickeyNet/BudgetArk/issues";
const SUPPORT_EMAIL = "budgetark.support@gmail.com";

const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose, onResult }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!visible) {
      setFeedbackType("bug");
      setMessage("");
    }
  }, [visible]);

  const deviceInfo = useMemo(() => {
    const lines = [
      `App Version: ${CURRENT_APP_VERSION}`,
      `Platform: ${Platform.OS} ${Platform.Version}`,
    ];
    return lines.join("\n");
  }, []);

  const handleSendEmail = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const subjectPrefix = feedbackType === "bug" ? "[Bug Report]" : "[Feature Suggestion]";
    const subject = `${subjectPrefix} BudgetArk v${CURRENT_APP_VERSION}`;
    // Structured template so reports arrive with the context needed to act
    // on them - the in-app box only captures the first section; the rest
    // are prompts the user fills in (or deletes) in their email composer.
    const body =
      feedbackType === "bug"
        ? [
            "WHAT HAPPENED",
            trimmed,
            "",
            "STEPS TO REPRODUCE",
            "1. ",
            "2. ",
            "3. ",
            "",
            "WHAT I EXPECTED INSTEAD",
            "",
            "",
            "HOW OFTEN DOES IT HAPPEN? (every time / sometimes / once)",
            "",
            "",
            "SCREENSHOTS (attach below if you have any)",
            "",
            "",
            "---",
            deviceInfo,
          ].join("\n")
        : [
            "FEATURE IDEA",
            trimmed,
            "",
            "WHAT PROBLEM WOULD THIS SOLVE FOR YOU?",
            "",
            "",
            "HOW SHOULD IT WORK?",
            "",
            "",
            "---",
            deviceInfo,
          ].join("\n");

    try {
      await openComposer({
        to: SUPPORT_EMAIL,
        subject,
        body,
        title: "Choose email app",
        removeText: true,
      });
      onClose();
      onResult({
        title: "Thanks!",
        message: "Your feedback helps make BudgetArk better.",
      });
    } catch {
      // No email app found - fall back to mailto: link
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(mailto);
        onClose();
        onResult({
          title: "Thanks!",
          message: "Your feedback helps make BudgetArk better.",
        });
      } catch {
        onResult({
          title: "No Email App",
          message: `No email app found. You can send feedback to ${SUPPORT_EMAIL} or open an issue on GitHub.`,
        });
      }
    }
  }, [message, feedbackType, deviceInfo, onClose, onResult]);

  const handleOpenGitHub = useCallback(async () => {
    try {
      await Linking.openURL(GITHUB_ISSUES_URL);
    } catch {
      onResult({
        title: "Couldn't Open Link",
        message: `Visit ${GITHUB_ISSUES_URL} in your browser to submit an issue.`,
      });
    }
  }, [onResult]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        // iOS uses the ScrollView's automaticallyAdjustKeyboardInsets. Android
        // relies on the native window resize + the ScrollView; a "height" KAV
        // shifts on top of that resize and glitches the screen when the
        // keyboard is dismissed, so behavior stays undefined on both platforms.
        behavior={undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <ScrollView
              style={styles.card}
              contentContainerStyle={styles.cardContent}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              <Text style={styles.title}>Send Feedback</Text>
              <Text style={styles.subtitle}>
                Report a bug or suggest a feature.
              </Text>

              {/* Type toggle */}
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    feedbackType === "bug" && styles.typeButtonActive,
                    feedbackType === "bug" && { borderColor: colors.warning },
                  ]}
                  onPress={() => setFeedbackType("bug")}
                >
                  <Text
                    style={[
                      styles.typeText,
                      feedbackType === "bug" && { color: colors.warning },
                    ]}
                  >
                    Bug Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    feedbackType === "feature" && styles.typeButtonActive,
                    feedbackType === "feature" && { borderColor: colors.accent },
                  ]}
                  onPress={() => setFeedbackType("feature")}
                >
                  <Text
                    style={[
                      styles.typeText,
                      feedbackType === "feature" && { color: colors.accent },
                    ]}
                  >
                    Feature Idea
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message input */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  {feedbackType === "bug" ? "WHAT HAPPENED?" : "WHAT WOULD YOU LIKE TO SEE?"}
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={
                    feedbackType === "bug"
                      ? "Describe the bug - what you expected vs what happened..."
                      : "Describe the feature you'd like..."
                  }
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  maxLength={2000}
                  textAlignVertical="top"
                />
              </View>

              {/* Device info preview */}
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>AUTO-ATTACHED</Text>
                <Text style={styles.infoText}>{deviceInfo}</Text>
              </View>

              {/* Send via email */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !message.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSendEmail}
                disabled={!message.trim()}
              >
                <Text style={styles.sendButtonText}>Send via Email</Text>
              </TouchableOpacity>

              {/* GitHub link */}
              <TouchableOpacity style={styles.githubButton} onPress={handleOpenGitHub}>
                <Text style={styles.githubButtonText}>Open GitHub Issues</Text>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, bottomInset: number) =>
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
      maxHeight: "95%",
    },
    cardContent: {
      padding: 24,
      paddingBottom: Math.max(24, bottomInset),
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
    typeRow: {
      flexDirection: "row",
      gap: 10,
    },
    typeButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    typeButtonActive: {
      borderWidth: 2,
    },
    typeText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    textArea: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      minHeight: 120,
    },
    infoBox: {
      backgroundColor: colors.bg,
      borderRadius: 10,
      padding: 12,
      gap: 4,
    },
    infoLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    infoText: {
      fontSize: 12,
      color: colors.textDim,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    sendButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    sendButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    githubButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.accent,
    },
    githubButtonText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "600",
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

export default React.memo(FeedbackModal);
