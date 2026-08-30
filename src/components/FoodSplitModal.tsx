/**
 * BudgetArk - Food Split Modal
 * File: src/components/FoodSplitModal.tsx
 *
 * Budget tab → "Split Food (n)". The legacy "Food" category was split into
 * Grocery and Restaurant; this sheet lists every remaining Food expense
 * with a guessed target (description keywords) the user can flip before
 * applying. Owns only the draft mapping - the screen persists it via
 * setBudgetEntryCategories. Mounted only while open so the draft starts
 * fresh from the current entries every time. Extracted from BudgetScreen.
 */

import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BudgetCategory, BudgetEntry } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";

export type FoodSplitCategory = Extract<BudgetCategory, "Grocery" | "Restaurant">;

export const inferFoodSplitCategory = (entry: BudgetEntry): FoodSplitCategory => {
  const text = `${entry.description || ""} ${entry.category}`.toLowerCase();
  const restaurantHints = [
    "restaurant",
    "dine",
    "dinner",
    "lunch",
    "breakfast",
    "takeout",
    "delivery",
    "uber eats",
    "doordash",
    "grubhub",
    "cafe",
    "coffee",
    "bar",
    "pizza",
  ];
  return restaurantHints.some((hint) => text.includes(hint))
    ? "Restaurant"
    : "Grocery";
};

interface FoodSplitModalProps {
  /** The "Food" expenses to split. */
  entries: BudgetEntry[];
  onClose: () => void;
  onApply: (categoryById: Record<string, FoodSplitCategory>) => void;
}

const FoodSplitModal: React.FC<FoodSplitModalProps> = ({ entries, onClose, onApply }) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [draft, setDraft] = useState<Record<string, FoodSplitCategory>>(() => {
    const initial: Record<string, FoodSplitCategory> = {};
    entries.forEach((entry) => {
      initial[entry.id] = inferFoodSplitCategory(entry);
    });
    return initial;
  });

  const setCategoryFor = useCallback((entryId: string, category: FoodSplitCategory) => {
    setDraft((current) => ({ ...current, [entryId]: category }));
  }, []);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Split Food Entries</Text>
          <Text style={styles.subtitle}>Review each Food expense and assign Grocery or Restaurant.</Text>

          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selected = draft[item.id] || "Grocery";
              return (
                <View style={[styles.row, { borderColor: colors.cardBorder }]}>
                  <View style={styles.info}>
                    <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                    <Text style={styles.desc} numberOfLines={1}>
                      {item.description || new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <View style={styles.options}>
                    {(["Grocery", "Restaurant"] as const).map((option) => {
                      const isSelected = selected === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.option,
                            {
                              borderColor: isSelected ? colors.accent : colors.cardBorder,
                              backgroundColor: isSelected ? `${colors.accent}20` : colors.bg,
                            },
                          ]}
                          onPress={() => setCategoryFor(item.id, option)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: isSelected ? colors.accent : colors.textDim },
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onApply(draft)}>
              <Text style={styles.saveText}>Apply Split</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 18,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 12,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    cancelText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
    saveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    saveText: {
      color: colors.accentButtonText,
      fontSize: 14,
      fontWeight: "700",
    },
    list: {
      maxHeight: 320,
    },
    listContent: {
      gap: 8,
    },
    row: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      gap: 8,
      backgroundColor: colors.bg,
    },
    info: {
      gap: 2,
    },
    amount: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    desc: {
      color: colors.textDim,
      fontSize: 12,
    },
    options: {
      flexDirection: "row",
      gap: 8,
    },
    option: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center",
    },
    optionText: {
      fontSize: 12,
      fontWeight: "600",
    },
  });

export default FoodSplitModal;
