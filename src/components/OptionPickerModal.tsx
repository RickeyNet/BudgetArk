/**
 * BudgetArk - Option Picker Modal
 * File: src/components/OptionPickerModal.tsx
 *
 * The shared bottom-sheet "pick one of N" modal. ProfileScreen used to carry
 * five copy-pasted instances of this skeleton (Theme, Design Style, Density,
 * Text Size, Currency) - ~470 lines where only the row body differed, and
 * four of the five had lost their accessibility props in the copying. The
 * row body stays caller-owned via `renderOption`; the scaffold (overlay,
 * sheet, title, list, selected-checkmark, Done button) and the a11y
 * treatment live here exactly once.
 */

import React from "react";
import {
  Modal,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";

export interface OptionPickerModalProps<T> {
  visible: boolean;
  title: string;
  options: readonly T[];
  keyOf: (option: T) => string;
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  onClose: () => void;
  /** Row body, rendered left of the selection checkmark. */
  renderOption: (option: T, selected: boolean) => React.ReactNode;
  /** Optional note rendered between the title and the list. */
  header?: React.ReactNode;
  /**
   * Per-row border/background override (e.g. the Theme picker paints each
   * row in its preset's own colors). Defaults to accent-when-selected on
   * the screen background.
   */
  rowStyle?: (option: T, selected: boolean) => StyleProp<ViewStyle>;
  /** Checkmark colors per row; defaults to accent/white. */
  checkColors?: (option: T) => { background: string; text: string };
  /** Spoken row label; defaults to the option's key. */
  accessibilityLabelOf?: (option: T) => string;
}

function OptionPickerModal<T>({
  visible,
  title,
  options,
  keyOf,
  isSelected,
  onSelect,
  onClose,
  renderOption,
  header,
  rowStyle,
  checkColors,
  accessibilityLabelOf,
}: OptionPickerModalProps<T>): React.ReactElement {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = React.useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {title}
          </Text>
          {header}

          <ScrollView style={styles.optionList}>
            {options.map((option) => {
              const selected = isSelected(option);
              const check = checkColors?.(option) ?? {
                background: colors.accent,
                text: colors.white,
              };
              return (
                <TouchableOpacity
                  key={keyOf(option)}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: selected ? colors.accent : colors.cardBorder,
                      backgroundColor: colors.bg,
                    },
                    rowStyle?.(option, selected),
                  ]}
                  onPress={() => onSelect(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    accessibilityLabelOf?.(option) ?? keyOf(option)
                  }
                >
                  {renderOption(option, selected)}

                  {selected && (
                    <View
                      style={[
                        styles.checkMark,
                        { backgroundColor: check.background },
                      ]}
                    >
                      <Text
                        style={[styles.checkMarkText, { color: check.text }]}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.accent }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={[styles.closeBtnText, { color: colors.white }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default OptionPickerModal;

const makeStyles = (tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: tokens.radius + 8,
      borderTopRightRadius: tokens.radius + 8,
      borderWidth: 1,
      paddingTop: tokens.padLg,
      paddingBottom: 40,
      paddingHorizontal: tokens.padLg,
      maxHeight: "70%",
    },
    modalTitle: {
      fontSize: scale(22),
      fontWeight: "700",
      marginBottom: tokens.gap,
      textAlign: "center",
    },
    optionList: {
      marginBottom: 20,
    },
    optionRow: {
      borderWidth: 2,
      borderRadius: tokens.radiusSm,
      padding: tokens.pad,
      marginBottom: tokens.gapSm,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    checkMark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    checkMarkText: {
      fontSize: 14,
      fontWeight: "700",
    },
    closeBtn: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    closeBtnText: {
      fontSize: 16,
      fontWeight: "700",
    },
  });
};
