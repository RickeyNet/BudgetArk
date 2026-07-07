/**
 * BudgetArk - Category Pill Picker
 * File: src/components/CategoryPillPicker.tsx
 *
 * The category pill-wrap extracted from Add/EditBudgetEntryModal so the Bank
 * Connections wizard and Review Inbox can reuse it. Behavior-preserving:
 * same SELECTABLE_BUDGET_CATEGORIES filter (Freelance/Debt Payments/Food are
 * hidden from manual selection), same custom-category append, same icons and
 * pill styling.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BUDGET_CATEGORIES,
  BudgetCategory,
  CategoryName,
  CustomCategory,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { getCategoryIcon } from "../data/categoryIcons";

export const SELECTABLE_BUDGET_CATEGORIES: BudgetCategory[] =
  BUDGET_CATEGORIES.filter(
    (category) =>
      category !== "Freelance" &&
      category !== "Debt Payments" &&
      category !== "Food",
  ) as BudgetCategory[];

interface CategoryPillPickerProps {
  value: CategoryName;
  onChange: (category: CategoryName) => void;
  customCategories?: CustomCategory[];
  /** Optional leading pill, e.g. "None"/"Skip", rendered before the categories. */
  leadingOption?: { label: string; selected: boolean; onPress: () => void };
  /**
   * Keep the current value selectable even when it's outside the normal
   * list - a legacy built-in (e.g. "Food") or a deleted custom category on
   * an existing entry. Prepended when true and the value isn't listed.
   */
  pinCurrentValue?: boolean;
}

const CategoryPillPicker: React.FC<CategoryPillPickerProps> = ({
  value,
  onChange,
  customCategories = [],
  leadingOption,
  pinCurrentValue = false,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const selectableCategories = useMemo<CategoryName[]>(() => {
    const base: CategoryName[] = [
      ...SELECTABLE_BUDGET_CATEGORIES,
      ...customCategories.map((c) => c.name),
    ];
    if (pinCurrentValue && value && !base.includes(value)) {
      return [value, ...base];
    }
    return base;
  }, [customCategories, pinCurrentValue, value]);

  return (
    <View style={styles.categoryWrap}>
      {leadingOption ? (
        <TouchableOpacity
          style={[
            styles.categoryPill,
            leadingOption.selected && styles.categoryPillActive,
          ]}
          onPress={leadingOption.onPress}
        >
          <Text
            style={[
              styles.categoryPillText,
              leadingOption.selected && styles.categoryPillTextActive,
            ]}
          >
            {leadingOption.label}
          </Text>
        </TouchableOpacity>
      ) : null}
      {selectableCategories.map((item) => {
        const selected = !leadingOption?.selected && value === item;
        return (
          <TouchableOpacity
            key={item}
            style={[styles.categoryPill, selected && styles.categoryPillActive]}
            onPress={() => onChange(item)}
          >
            <Text
              style={[
                styles.categoryPillText,
                selected && styles.categoryPillTextActive,
              ]}
            >
              {getCategoryIcon(item, customCategories)} {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    categoryWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryPill: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    categoryPillActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    categoryPillText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "500",
    },
    categoryPillTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
  });

export default React.memo(CategoryPillPicker);
