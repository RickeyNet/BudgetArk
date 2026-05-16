/**
 * BudgetArk - Manage Custom Categories
 * File: src/components/ManageCategoriesModal.tsx
 *
 * Modal-as-sub-screen (visible/onClose) for adding and deleting user-defined
 * budget categories. v1 is additive only — built-in categories are fixed and
 * not listed here. Reads/writes via useCustomCategories().
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useCustomCategories } from "../categories/CustomCategoriesProvider";
import {
  EMOJI_CHOICES,
  DEFAULT_CATEGORY_ICON,
} from "../data/categoryIcons";
import { MAX_CATEGORY_NAME_LENGTH } from "../storage/customCategoriesStorage";

interface ManageCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { customCategories, add, remove } = useCustomCategories();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_CATEGORY_ICON);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setIcon(DEFAULT_CATEGORY_ICON);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleAdd = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await add(name, icon);
    setSaving(false);
    if (result.ok) {
      resetForm();
    } else {
      setError(result.error);
    }
  }, [add, icon, name, resetForm, saving]);

  const handleDelete = useCallback(
    (id: string, label: string) => {
      Alert.alert(
        "Delete category?",
        `"${label}" will be removed from the picker. Existing entries keep this category — they just lose the custom icon.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void remove(id);
            },
          },
        ]
      );
    },
    [remove]
  );

  const canAdd = name.trim().length > 0 && !saving;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Custom Categories</Text>
            <Text style={styles.subtitle}>
              Add your own budget categories. They work everywhere built-in
              ones do — entries, limits, charts, and reports.
            </Text>

            {/* ── Add form ── */}
            <View style={styles.field}>
              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hobbies, Pets, Childcare"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
                maxLength={MAX_CATEGORY_NAME_LENGTH}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ICON</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_CHOICES.map((glyph) => (
                  <TouchableOpacity
                    key={glyph}
                    style={[
                      styles.emojiCell,
                      icon === glyph && styles.emojiCellActive,
                    ]}
                    onPress={() => setIcon(glyph)}
                    accessibilityRole="button"
                    accessibilityLabel={`Pick icon ${glyph}`}
                  >
                    <Text style={styles.emojiText}>{glyph}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={styles.addButtonText}>
                {saving ? "Adding…" : "Add Category"}
              </Text>
            </TouchableOpacity>

            {/* ── Existing list ── */}
            <Text style={[styles.label, styles.listHeader]}>
              YOUR CATEGORIES ({customCategories.length})
            </Text>
            {customCategories.length === 0 ? (
              <Text style={styles.emptyText}>
                No custom categories yet. Add one above.
              </Text>
            ) : (
              customCategories.map((cat) => (
                <View key={cat.id} style={styles.row}>
                  <Text style={styles.rowIcon}>{cat.icon}</Text>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(cat.id, cat.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${cat.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.rowDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleClose}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 24, gap: 14 },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 8,
    },
    field: { gap: 8 },
    label: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    listHeader: { marginTop: 12 },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    emojiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    emojiCell: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    emojiCellActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
      borderWidth: 2,
    },
    emojiText: { fontSize: 20 },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "600",
    },
    addButton: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    addButtonDisabled: { opacity: 0.4 },
    addButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: "italic",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    rowIcon: { fontSize: 20 },
    rowName: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    rowDelete: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "600",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    doneButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    doneText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(ManageCategoriesModal);
