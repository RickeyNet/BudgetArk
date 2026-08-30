/**
 * BudgetArk - Code Chip Grid
 * File: src/components/CodeChipGrid.tsx
 *
 * Memoized wrap-grid of short-code chips (US states, currency codes). The
 * tax calculator and the currency converter each render two ~50-chip grids
 * beside a text input, so without memoization every keystroke rebuilt
 * around a hundred TouchableOpacity trees. Each chip is memoized on its own
 * `active` flag, so changing the selection re-renders exactly two chips,
 * and the grid re-renders only when the option list, selection, handler,
 * or styles change. Callers must pass a stable `onSelect` (a state setter
 * or useCallback) and a memoized `styles` bundle - a fresh object on every
 * render defeats the memo.
 */

import React, { memo, useCallback } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export interface CodeChipOption {
  code: string;
}

export interface CodeChipStyles {
  wrap: StyleProp<ViewStyle>;
  chip: StyleProp<ViewStyle>;
  chipActive: StyleProp<ViewStyle>;
  text: StyleProp<TextStyle>;
  textActive: StyleProp<TextStyle>;
}

interface ChipProps {
  code: string;
  active: boolean;
  onSelect: (code: string) => void;
  styles: CodeChipStyles;
}

const Chip = memo(({ code, active, onSelect, styles }: ChipProps) => {
  const handlePress = useCallback(() => onSelect(code), [code, onSelect]);
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active && styles.textActive]}>{code}</Text>
    </TouchableOpacity>
  );
});
Chip.displayName = "CodeChip";

interface CodeChipGridProps {
  options: readonly CodeChipOption[];
  selected: string;
  onSelect: (code: string) => void;
  styles: CodeChipStyles;
  /** Disambiguates keys when two grids share one option list. */
  keyPrefix?: string;
}

const CodeChipGrid = ({
  options,
  selected,
  onSelect,
  styles,
  keyPrefix = "",
}: CodeChipGridProps) => (
  <View style={styles.wrap}>
    {options.map((option) => (
      <Chip
        key={keyPrefix + option.code}
        code={option.code}
        active={option.code === selected}
        onSelect={onSelect}
        styles={styles}
      />
    ))}
  </View>
);

export default memo(CodeChipGrid);
