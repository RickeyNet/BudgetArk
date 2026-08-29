/**
 * BudgetArk - Tip Jar Nudge Card
 * File: src/components/TipJarNudgeCard.tsx
 *
 * The small "if this is helping, there's a Tip Jar" card that follows an
 * occasional win (utils/tipJarNudge decides which). One look, two homes:
 * "inline" sits inside an already-open sheet (the payment / payoff
 * celebrations, the Review Inbox) so no second Modal is ever stacked;
 * "floating" is the root toast the TipJarProvider slides up when a win
 * happens with nothing else on screen. Never a Modal of its own - that is
 * the iOS silent-present failure this codebase keeps hitting.
 */

import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { TipNudgeCopy } from "../utils/tipJarNudge";

interface TipJarNudgeCardProps {
  copy: TipNudgeCopy;
  /** Opens the Tip Jar sheet (the host closes its own Modal first). */
  onTip: () => void;
  /** Present on the floating toast; inline cards ride their sheet's close. */
  onDismiss?: () => void;
  variant?: "inline" | "floating";
  style?: StyleProp<ViewStyle>;
}

const TipJarNudgeCard: React.FC<TipJarNudgeCardProps> = ({
  copy,
  onTip,
  onDismiss,
  variant = "inline",
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View
      style={[styles.card, variant === "floating" ? styles.floating : styles.inline, style]}
      accessibilityRole="summary"
      accessibilityLabel={`Tip Jar. ${copy.title}. ${copy.body}`}
    >
      <Text style={styles.eyebrow}>TIP JAR 💛</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onTip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Open the Tip Jar"
        >
          <Text style={styles.tipAction}>Leave a tip ›</Text>
        </TouchableOpacity>
        {onDismiss ? (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Text style={styles.dismissAction}>Not now</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      alignSelf: "stretch",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 4,
    },
    inline: {
      backgroundColor: colors.bg,
    },
    floating: {
      backgroundColor: colors.card,
      elevation: 6,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: colors.accent,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 19,
    },
    body: {
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 17,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      marginTop: 6,
    },
    tipAction: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.accent,
    },
    dismissAction: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
  });

export default React.memo(TipJarNudgeCard);
