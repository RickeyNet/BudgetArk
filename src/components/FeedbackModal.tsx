/**
 * BudgetArk - Feedback Modal
 * File: src/components/FeedbackModal.tsx
 *
 * In-app form for bug reports and feature suggestions.
 * Collects the user's message, attaches device context,
 * and opens their email client with everything pre-filled.
 * Also offers a link to GitHub Issues for public tracking.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import { openComposer } from "react-native-email-link";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";
import { useValueChanged } from "../hooks/useValueChanged";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (result: { title: string; message: string }) => void;
}

type FeedbackType = "bug" | "feature";

const GITHUB_ISSUES_URL = "https://github.com/RickeyNet/BudgetArk/issues";
const SUPPORT_EMAIL = "budgetark.support@gmail.com";

const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose, onResult }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");

  // Reset the form when the sheet closes (render-time adjustment - see
  // useValueChanged for why this beats a setState-in-effect).
  if (useValueChanged(visible) && !visible) {
    setFeedbackType("bug");
    setMessage("");
  }

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
            t("modals.guard.feedback.template.bug.whatHappened"),
            trimmed,
            "",
            t("modals.guard.feedback.template.bug.steps"),
            "1. ",
            "2. ",
            "3. ",
            "",
            t("modals.guard.feedback.template.bug.expected"),
            "",
            "",
            t("modals.guard.feedback.template.bug.howOften"),
            "",
            "",
            t("modals.guard.feedback.template.bug.screenshots"),
            "",
            "",
            "---",
            deviceInfo,
          ].join("\n")
        : [
            t("modals.guard.feedback.template.feature.idea"),
            trimmed,
            "",
            t("modals.guard.feedback.template.feature.problem"),
            "",
            "",
            t("modals.guard.feedback.template.feature.howItWorks"),
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
        title: t("modals.guard.feedback.chooseApp"),
        removeText: true,
      });
      onClose();
      onResult({
        title: t("modals.guard.feedback.thanks.title"),
        message: t("modals.guard.feedback.thanks.message"),
      });
    } catch {
      // No email app found - fall back to mailto: link
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(mailto);
        onClose();
        onResult({
          title: t("modals.guard.feedback.thanks.title"),
          message: t("modals.guard.feedback.thanks.message"),
        });
      } catch {
        onResult({
          title: t("modals.guard.feedback.noEmailApp.title"),
          message: t("modals.guard.feedback.noEmailApp.message", { email: SUPPORT_EMAIL }),
        });
      }
    }
  }, [message, feedbackType, deviceInfo, onClose, onResult, t]);

  const handleOpenGitHub = useCallback(async () => {
    try {
      await Linking.openURL(GITHUB_ISSUES_URL);
    } catch {
      onResult({
        title: t("modals.guard.feedback.linkFailed.title"),
        message: t("modals.guard.feedback.linkFailed.message", { url: GITHUB_ISSUES_URL }),
      });
    }
  }, [onResult, t]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SheetKeyboardAvoider style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <ScrollView
              style={styles.card}
              contentContainerStyle={styles.cardContent}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              <Text style={styles.title}>{t("modals.guard.feedback.title")}</Text>
              <Text style={styles.subtitle}>{t("modals.guard.feedback.subtitle")}</Text>

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
                    {t("modals.guard.feedback.types.bug")}
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
                    {t("modals.guard.feedback.types.feature")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message input */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  {t(`modals.guard.feedback.prompt.${feedbackType}`)}
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={t(`modals.guard.feedback.placeholder.${feedbackType}`)}
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
                <Text style={styles.infoLabel}>{t("modals.guard.feedback.autoAttached")}</Text>
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
                <Text style={styles.sendButtonText}>{t("modals.guard.feedback.sendEmail")}</Text>
              </TouchableOpacity>

              {/* GitHub link */}
              <TouchableOpacity style={styles.githubButton} onPress={handleOpenGitHub}>
                <Text style={styles.githubButtonText}>{t("modals.guard.feedback.openGithub")}</Text>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </SheetKeyboardAvoider>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, bottomInset: number) =>
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
