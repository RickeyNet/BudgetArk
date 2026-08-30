/**
 * BudgetArk - PIN Pad
 * File: src/components/PinPad.tsx
 *
 * Shared numeric keypad + entry dots used by the app-lock gate
 * (AppLockGate) and the Profile App Lock setup flow (AppLockSetupModal).
 * A custom pad rather than a TextInput so no system keyboard (or its
 * autofill/clipboard surfaces) ever handles the PIN.
 *
 * Controlled component: the parent owns the pin string and decides when to
 * verify (auto-submit at a known length) or shows a ✓ key (onSubmit) when
 * the user picks their own length.
 */

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "../utils/appLock";
import { triggerHaptic } from "../utils/haptics";

type PinPadProps = {
  value: string;
  onChange: (next: string) => void;
  /**
   * When set (unlock/verify flows), the dot row shows exactly this many
   * slots and input stops there - the parent auto-submits on reaching it.
   */
  expectedLength?: number;
  /** When set (choose-a-new-PIN flow), a ✓ key appears on the pad. */
  onSubmit?: () => void;
  disabled?: boolean;
};

const KEY_ROWS: readonly (readonly string[])[] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["submit", "0", "backspace"],
];

const PinPad: React.FC<PinPadProps> = ({
  value,
  onChange,
  expectedLength,
  onSubmit,
  disabled,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const maxLength = expectedLength ?? PIN_MAX_LENGTH;
  const dotCount = expectedLength ?? Math.max(PIN_MIN_LENGTH, value.length);
  const canSubmit = !!onSubmit && value.length >= PIN_MIN_LENGTH;

  const pressDigit = (digit: string) => {
    if (disabled || value.length >= maxLength) return;
    triggerHaptic("selection");
    onChange(value + digit);
  };

  const pressBackspace = () => {
    if (disabled || value.length === 0) return;
    triggerHaptic("selection");
    onChange(value.slice(0, -1));
  };

  const pressSubmit = () => {
    if (disabled || !canSubmit || !onSubmit) return;
    triggerHaptic("selection");
    onSubmit();
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.dotsRow}
        accessibilityLabel={`${value.length} of ${dotCount} PIN digits entered`}
      >
        {Array.from({ length: dotCount }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < value.length ? colors.accent : "transparent",
                borderColor: i < value.length ? colors.accent : colors.textDim,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.pad}>
        {KEY_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.padRow}>
            {row.map((key) => {
              if (key === "submit") {
                if (!onSubmit) return <View key={key} style={styles.keySpacer} />;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.key,
                      {
                        backgroundColor: canSubmit
                          ? colors.accent
                          : colors.card,
                        borderColor: colors.cardBorder,
                      },
                      (disabled || !canSubmit) && styles.keyDim,
                    ]}
                    onPress={pressSubmit}
                    disabled={disabled || !canSubmit}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm PIN"
                  >
                    <Text
                      style={[
                        styles.keyText,
                        { color: canSubmit ? colors.white : colors.textDim },
                      ]}
                    >
                      ✓
                    </Text>
                  </TouchableOpacity>
                );
              }
              if (key === "backspace") {
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.key,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                      disabled && styles.keyDim,
                    ]}
                    onPress={pressBackspace}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel="Delete last digit"
                  >
                    <Text style={[styles.keyText, { color: colors.text }]}>
                      ⌫
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                    disabled && styles.keyDim,
                  ]}
                  onPress={() => pressDigit(key)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Digit ${key}`}
                >
                  <Text style={[styles.keyText, { color: colors.text }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
    },
    dotsRow: {
      flexDirection: "row",
      gap: tokens.gap,
      marginBottom: tokens.gap * 2,
      minHeight: 16,
      alignItems: "center",
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
    },
    pad: {
      gap: tokens.gap,
    },
    padRow: {
      flexDirection: "row",
      gap: tokens.gap,
      justifyContent: "center",
    },
    key: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    keySpacer: {
      width: 72,
      height: 72,
    },
    keyDim: {
      opacity: 0.45,
    },
    keyText: {
      fontSize: 24 * tokens.fontScale,
      fontWeight: "600",
    },
  });

export default PinPad;
