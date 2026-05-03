import React, { useCallback, useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { CoachmarkContent } from "../data/coachmarkContent";

type CoachmarkProps = {
  visible: boolean;
  content: CoachmarkContent;
  onDismiss: () => void;
  onSkipAll: () => void;
};

const Coachmark: React.FC<CoachmarkProps> = ({ visible, content, onDismiss, onSkipAll }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const handleSkipAll = useCallback(() => {
    onSkipAll();
    onDismiss();
  }, [onDismiss, onSkipAll]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.flex} />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>WALKTHROUGH</Text>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.body}>{content.body}</Text>
          {content.tip ? (
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>TIP</Text>
              <Text style={styles.tipText}>{content.tip}</Text>
            </View>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipAll}>
              <Text style={styles.skipBtnText}>Skip all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={onDismiss}>
              <Text style={styles.nextBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.78)",
    },
    flex: { flex: 1 },
    card: {
      backgroundColor: colors.card,
      borderTopLeftRadius: tokens.radius + 8,
      borderTopRightRadius: tokens.radius + 8,
      borderTopWidth: 1,
      borderColor: `${colors.accent}40`,
      padding: tokens.padLg,
      paddingBottom: tokens.padLg + 16,
      gap: tokens.gapSm,
    },
    eyebrow: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 1.5,
      color: colors.accent,
    },
    title: {
      fontSize: scale(20),
      fontWeight: "700",
      color: colors.text,
    },
    body: {
      fontSize: scale(14),
      lineHeight: scale(20),
      color: colors.textDim,
    },
    tipBox: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      padding: tokens.padSm,
      backgroundColor: colors.bg,
      gap: 4,
    },
    tipLabel: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 1,
      color: colors.success,
    },
    tipText: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: colors.textDim,
    },
    buttonRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
      marginTop: tokens.gap,
    },
    skipBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    skipBtnText: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.textDim,
    },
    nextBtn: {
      flex: 2,
      borderRadius: tokens.radiusSm,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.accent,
    },
    nextBtnText: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.accentButtonText,
    },
  });
};

export default Coachmark;
