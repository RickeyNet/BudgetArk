/**
 * BudgetArk - Manage Businesses
 * File: src/components/ManageBusinessesModal.tsx
 *
 * Modal-as-sub-screen (visible/onClose) for adding, renaming, and deleting
 * the businesses expense entries can be tagged with. Mirrors
 * ManageCategoriesModal, but self-contained: loads its own data on open
 * (there's no provider for businesses) and reports mutations via
 * onChanged so screens holding a businesses list can refresh.
 *
 * Deletes are soft (tombstones) so they propagate through P2P sync;
 * entries tagged with a deleted business keep their tag and surface as
 * "(deleted business)" in the report and edit modal.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { describeError } from "../utils/errorMessage";
import { useDensity } from "../theme/DensityProvider";
import type { DensityTokens } from "../theme/density";
import SheetModal, { useSheetStyles } from "./SheetModal";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { Business } from "../types";
import { MAX_BUSINESS_NAME_LENGTH } from "../types";
import {
  addBusiness,
  deleteBusiness,
  getBusinesses,
  updateBusiness,
} from "../storage/businessStorage";
import { getBudgetEntries } from "../storage/budgetStorage";

interface ManageBusinessesModalProps {
  visible: boolean;
  onClose: () => void;
  /** Fired after any successful add/rename/delete so parents can refresh. */
  onChanged?: () => void;
}

const ManageBusinessesModal: React.FC<ManageBusinessesModalProps> = ({
  visible,
  onClose,
  onChanged,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  /** Business id being renamed; null = the form adds a new business. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      try {
        const [list, entries] = await Promise.all([
          getBusinesses(),
          getBudgetEntries(),
        ]);
        if (cancelled) return;
        setBusinesses(list);
        const counts: Record<string, number> = {};
        for (const entry of entries) {
          if (entry.businessId) {
            counts[entry.businessId] = (counts[entry.businessId] ?? 0) + 1;
          }
        }
        setEntryCounts(counts);
      } catch (error) {
        if (cancelled) return;
        setError(describeError(error, "Couldn't load your businesses. Close and try again."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const resetForm = useCallback(() => {
    setName("");
    setEditingId(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = editingId
        ? await updateBusiness(editingId, { name })
        : await addBusiness(name);
      if (result.ok) {
        setBusinesses(result.businesses);
        resetForm();
        onChanged?.();
      } else {
        setError(result.error);
      }
    } catch (error) {
      // A storage failure must not leave the button stuck on "Saving...".
      setError(describeError(error, "Couldn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  }, [editingId, name, onChanged, resetForm, saving]);

  const handleStartRename = useCallback((business: Business) => {
    setEditingId(business.id);
    setName(business.name);
    setError(null);
  }, []);

  const handleDelete = useCallback(
    (id: string, label: string) => {
      const count = entryCounts[id] ?? 0;
      const entryNote =
        count > 0
          ? ` ${count} ${count === 1 ? "entry keeps" : "entries keep"} the tag and will show as "(deleted business)" in reports.`
          : "";
      Alert.alert(
        "Delete business?",
        `"${label}" will be removed from the picker.${entryNote}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  const next = await deleteBusiness(id);
                  setBusinesses(next);
                  if (editingId === id) resetForm();
                  onChanged?.();
                } catch (error) {
                  setError(
                    describeError(error, "Couldn't delete this business. Please try again."),
                  );
                }
              })();
            },
          },
        ],
      );
    },
    [editingId, entryCounts, onChanged, resetForm],
  );

  const canSubmit = name.trim().length > 0 && !saving;

  return (
    <SheetModal
      visible={visible}
      onRequestClose={handleClose}
      keyboardAvoiding
      contentContainerStyle={styles.sheetContent}
      footer={
        <>
          <TouchableOpacity style={sheet.doneButton} onPress={handleClose}>
            <Text style={sheet.doneText}>Done</Text>
          </TouchableOpacity>
        </>
      }
    >
            <Text style={sheet.title}>Businesses</Text>
            <Text style={sheet.subtitle}>
              Add the businesses you spend for (a company, side gig, or
              freelance client). Tag expenses to them when adding entries, then
              pull a per-business report at tax time.
            </Text>

            {/* ── Add / rename form ── */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {editingId ? "RENAME BUSINESS" : "NAME"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme LLC, Etsy shop, Consulting"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
                maxLength={MAX_BUSINESS_NAME_LENGTH}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.formButtons}>
              {editingId && (
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.addButton, !canSubmit && styles.addButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.addButtonText}>
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save Name"
                      : "Add Business"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Existing list ── */}
            <Text style={[styles.label, styles.listHeader]}>
              YOUR BUSINESSES ({businesses.length})
            </Text>
            {businesses.length === 0 ? (
              <Text style={styles.emptyText}>
                No businesses yet. Add one above.
              </Text>
            ) : (
              businesses.map((business) => {
                const count = entryCounts[business.id] ?? 0;
                return (
                  <View key={business.id} style={styles.row}>
                    <Text style={styles.rowIcon}>💼</Text>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {business.name}
                      </Text>
                      <Text style={styles.rowCount}>
                        {count === 0
                          ? "No tagged entries"
                          : `${count} tagged ${count === 1 ? "entry" : "entries"}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleStartRename(business)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${business.name}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.rowRename}>Rename</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(business.id, business.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${business.name}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.rowDelete}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    sheetContent: { gap: tokens.gap },
    field: { gap: tokens.gapSm },
    label: {
      fontSize: scale(11),
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    listHeader: { marginTop: tokens.gap },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      color: colors.text,
      fontSize: scale(15),
    },
    errorText: {
      color: colors.danger,
      fontSize: scale(13),
      fontWeight: "600",
    },
    formButtons: {
      flexDirection: "row",
      gap: tokens.gap,
    },
    cancelEditButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    cancelEditText: {
      color: colors.textDim,
      fontSize: scale(15),
      fontWeight: "600",
    },
    addButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: tokens.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    addButtonDisabled: { opacity: 0.4 },
    addButtonText: {
      color: colors.accentButtonText,
      fontSize: scale(15),
      fontWeight: "700",
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: scale(13),
      fontStyle: "italic",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gap,
      paddingVertical: tokens.padSm,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    rowIcon: { fontSize: scale(18) },
    rowTextWrap: { flex: 1 },
    rowName: {
      color: colors.text,
      fontSize: scale(15),
      fontWeight: "600",
    },
    rowCount: {
      color: colors.textMuted,
      fontSize: scale(12),
      marginTop: 2,
    },
    rowRename: {
      color: colors.accent,
      fontSize: scale(14),
      fontWeight: "600",
      marginRight: 4,
    },
    rowDelete: {
      color: colors.danger,
      fontSize: scale(14),
      fontWeight: "600",
    },
  });
};

export default React.memo(ManageBusinessesModal);
