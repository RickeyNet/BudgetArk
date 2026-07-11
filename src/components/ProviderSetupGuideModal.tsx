/**
 * BudgetArk - Provider Setup Guide
 * File: src/components/ProviderSetupGuideModal.tsx
 *
 * A plain-language, step-by-step setup guide plus a privacy-at-a-glance
 * summary for one connection provider. Content lives in
 * data/connectionGuides.ts; this is just the presentation + external links.
 * Launched from the Add Connection wizard so a first-timer has everything in
 * one place (steps, official links, privacy) before they start.
 */

import React, { useCallback, useMemo } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BankProvider } from "../types";
import { CONNECTION_GUIDES } from "../data/connectionGuides";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

interface ProviderSetupGuideModalProps {
  visible: boolean;
  provider: BankProvider;
  onClose: () => void;
  /** Proceed into the wizard's setup step for this provider. */
  onStartSetup: (provider: BankProvider) => void;
}

const ProviderSetupGuideModal: React.FC<ProviderSetupGuideModalProps> = ({
  visible,
  provider,
  onClose,
  onStartSetup,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const guide = CONNECTION_GUIDES[provider];

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url).catch(() => {
      // Best-effort: if no browser handles it, there's nothing to fall back to.
    });
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>
            {guide.glyph} {guide.name}
          </Text>
          <Text style={styles.tagline}>{guide.tagline}</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>COST</Text>
            <Text style={styles.infoValue}>{guide.cost}</Text>
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => openUrl(guide.siteUrl)}
          >
            <Text style={styles.linkButtonText}>Open {guide.siteLabel} ↗</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>STEP BY STEP</Text>
          {guide.steps.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.inlineLink}
            onPress={() => openUrl(guide.officialGuideUrl)}
          >
            <Text style={styles.inlineLinkText}>
              See {guide.name}'s official setup guide ↗
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>GOOD TO KNOW</Text>
          {guide.tips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>PRIVACY AT A GLANCE</Text>
          <View style={styles.privacyCard}>
            <Text style={styles.privacyHeadline}>{guide.privacy.headline}</Text>
            {guide.privacy.points.map((point) => (
              <View key={point} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{point}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.inlineLink}
              onPress={() => openUrl(guide.privacy.policyUrl)}
            >
              <Text style={styles.inlineLinkText}>
                Read {guide.name}'s full privacy policy ↗
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            This is a plain-language summary, not legal advice. Policies can
            change - the link above is always the authoritative version.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onStartSetup(provider)}
          >
            <Text style={styles.primaryButtonText}>Start setup →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 64,
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    tagline: {
      fontSize: 15,
      color: colors.textDim,
      lineHeight: 21,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 4,
      marginTop: 4,
    },
    infoLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    linkButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    linkButtonText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700",
    },
    sectionLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginTop: 12,
    },
    stepRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    stepNumber: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    stepNumberText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    stepBody: {
      flex: 1,
      gap: 3,
    },
    stepTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    stepDetail: {
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 19,
    },
    inlineLink: {
      paddingVertical: 6,
    },
    inlineLinkText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
    },
    tipRow: {
      flexDirection: "row",
      gap: 8,
    },
    tipBullet: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    tipText: {
      flex: 1,
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 20,
    },
    privacyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    privacyHeadline: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
    },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    primaryButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(ProviderSetupGuideModal);
