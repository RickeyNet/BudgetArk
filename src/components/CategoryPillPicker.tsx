/**
 * BudgetArk - Category Pill Picker
 * File: src/components/CategoryPillPicker.tsx
 *
 * The category pill-wrap shared by the Add/Edit Entry sheet, the Review
 * Inbox, merchant rules and the Bank Connections wizard. Offers the
 * visible built-ins (utils/categoryVisibility - the user can hide
 * built-ins from Manage Categories) followed by the custom ones, and with
 * `allowCreate` a trailing "+ New" pill that expands an inline mini-form
 * (name, icon, 50/30/20 bucket) so a category can be created right where
 * the expense is being filed - no trip to Profile, and no second Modal
 * stacked on the sheet (the iOS silent-present failure). A created
 * category is selected immediately.
 */

import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BudgetBucket, BudgetCategory, CategoryName, CustomCategory } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { DEFAULT_CATEGORY_ICON, EMOJI_CHOICES, getCategoryIcon } from "../data/categoryIcons";
import {
  BUDGET_BUCKET_LABELS,
  BUDGET_BUCKET_ORDER,
  DEFAULT_CUSTOM_CATEGORY_BUCKET,
} from "../data/categoryBuckets";
import { MAX_CATEGORY_NAME_LENGTH } from "../storage/customCategoriesStorage";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import { SELECTABLE_BUILT_IN_CATEGORIES } from "../utils/categoryVisibility";
import { triggerHaptic } from "../utils/haptics";

/** Kept for existing importers; the canonical list lives in utils/categoryVisibility. */
export const SELECTABLE_BUDGET_CATEGORIES: BudgetCategory[] = [
  ...SELECTABLE_BUILT_IN_CATEGORIES,
];

interface CategoryPillPickerProps {
  value: CategoryName;
  onChange: (category: CategoryName) => void;
  customCategories?: CustomCategory[];
  /** Optional leading pill, e.g. "None"/"Skip", rendered before the categories. */
  leadingOption?: { label: string; selected: boolean; onPress: () => void };
  /**
   * Keep the current value selectable even when it's outside the normal
   * list - a legacy built-in (e.g. "Food"), a hidden built-in, or a deleted
   * custom category on an existing entry. Prepended when true and the
   * value isn't listed.
   */
  pinCurrentValue?: boolean;
  /** Show the "+ New" pill and its inline create form. */
  allowCreate?: boolean;
}

const CategoryPillPicker: React.FC<CategoryPillPickerProps> = ({
  value,
  onChange,
  customCategories = [],
  leadingOption,
  pinCurrentValue = false,
  allowCreate = false,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { visibleBuiltIns, add } = useCustomCategories();

  const selectableCategories = useMemo<CategoryName[]>(() => {
    const base: CategoryName[] = [
      ...visibleBuiltIns,
      ...customCategories.map((c) => c.name),
    ];
    if (pinCurrentValue && value && !base.includes(value)) {
      return [value, ...base];
    }
    return base;
  }, [customCategories, pinCurrentValue, value, visibleBuiltIns]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string>(DEFAULT_CATEGORY_ICON);
  const [newBucket, setNewBucket] = useState<BudgetBucket>(DEFAULT_CUSTOM_CATEGORY_BUCKET);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const closeCreate = useCallback(() => {
    setCreating(false);
    setNewName("");
    setNewIcon(DEFAULT_CATEGORY_ICON);
    setNewBucket(DEFAULT_CUSTOM_CATEGORY_BUCKET);
    setCreateError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setCreateError(null);
    const result = await add(newName, newIcon, newBucket);
    setSaving(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    // The store normalised the name (trim etc.); select what it saved.
    const created = result.categories.find(
      (c) => c.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    triggerHaptic("success");
    onChange(created?.name ?? newName.trim());
    closeCreate();
  }, [add, closeCreate, newBucket, newIcon, newName, onChange, saving]);

  return (
    <View>
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
        {allowCreate ? (
          <TouchableOpacity
            style={[styles.categoryPill, styles.createPill, creating && styles.categoryPillActive]}
            onPress={() => (creating ? closeCreate() : setCreating(true))}
            accessibilityRole="button"
            accessibilityLabel={creating ? "Cancel new category" : "Create a new category"}
          >
            <Text style={[styles.categoryPillText, styles.createPillText]}>
              {creating ? "× Cancel" : "+ New"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {allowCreate && creating ? (
        <View style={styles.createCard}>
          <Text style={styles.createLabel}>NEW CATEGORY</Text>
          <TextInput
            style={styles.createInput}
            placeholder="e.g. Pets, Childcare, Hobbies"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={(t) => {
              setNewName(t);
              if (createError) setCreateError(null);
            }}
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void handleCreate()}
          />
          <View style={styles.emojiGrid}>
            {EMOJI_CHOICES.map((glyph) => (
              <TouchableOpacity
                key={glyph}
                style={[styles.emojiCell, newIcon === glyph && styles.emojiCellActive]}
                onPress={() => setNewIcon(glyph)}
                accessibilityRole="button"
                accessibilityLabel={`Pick icon ${glyph}`}
              >
                <Text style={styles.emojiText}>{glyph}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.bucketRow}>
            {BUDGET_BUCKET_ORDER.map((bucket) => {
              const selected = newBucket === bucket;
              return (
                <TouchableOpacity
                  key={bucket}
                  style={[styles.categoryPill, selected && styles.categoryPillActive]}
                  onPress={() => setNewBucket(bucket)}
                >
                  <Text
                    style={[styles.categoryPillText, selected && styles.categoryPillTextActive]}
                  >
                    {BUDGET_BUCKET_LABELS[bucket]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {createError ? <Text style={styles.createError}>{createError}</Text> : null}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!newName.trim() || saving) && styles.createButtonDisabled,
            ]}
            onPress={() => void handleCreate()}
            disabled={!newName.trim() || saving}
          >
            <Text style={styles.createButtonText}>
              {saving ? "Adding…" : "Add & select"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    createPill: {
      borderStyle: "dashed",
      borderColor: colors.accent,
    },
    createPillText: {
      color: colors.accent,
      fontWeight: "700",
    },
    createCard: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.bg,
      padding: 12,
      gap: 10,
    },
    createLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    createInput: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 15,
      backgroundColor: colors.card,
    },
    emojiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    emojiCell: {
      width: 36,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    emojiCellActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    emojiText: { fontSize: 18 },
    bucketRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    createError: {
      color: colors.danger,
      fontSize: 12,
    },
    createButton: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    createButtonDisabled: { opacity: 0.4 },
    createButtonText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
  });

export default React.memo(CategoryPillPicker);
