/**
 * BudgetArk - Manage People
 * File: src/components/ManagePeopleModal.tsx
 *
 * Modal-as-sub-screen (visible/onClose) for adding, renaming, and deleting
 * the people spending can be assigned to ("who spent this"). A deliberate
 * mirror of ManageBusinessesModal: self-contained (loads its own data on
 * open; there's no provider for people) and reports mutations via onChanged
 * so screens holding a people list can refresh.
 *
 * Deletes are soft (tombstones) so they propagate through P2P sync; entries
 * assigned to a deleted person keep the assignment and surface as
 * "(deleted person)" on badges and pickers.
 */

import { entryPersonIds } from "../utils/entryPeople";
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
import SheetModal, { useSheetStyles } from "./SheetModal";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { Person } from "../types";
import { MAX_PERSON_NAME_LENGTH } from "../types";
import { usePeople } from "../people/PeopleProvider";
import { getBudgetEntries } from "../storage/budgetStorage";

interface ManagePeopleModalProps {
  visible: boolean;
  onClose: () => void;
}

const ManagePeopleModal: React.FC<ManagePeopleModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();

  const { people, addPerson, updatePerson, deletePerson } = usePeople();
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  /** Person id being renamed; null = the form adds a new person. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      try {
        const entries = await getBudgetEntries();
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const entry of entries) {
          for (const personId of entryPersonIds(entry)) {
            counts[personId] = (counts[personId] ?? 0) + 1;
          }
        }
        setEntryCounts(counts);
      } catch (error) {
        if (cancelled) return;
        setError(describeError(error, "Couldn't load your people. Close and try again."));
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
        ? await updatePerson(editingId, { name })
        : await addPerson(name);
      if (result.ok) {
        resetForm();
      } else {
        setError(result.error);
      }
    } catch (error) {
      // A storage failure must not leave the button stuck on "Saving...".
      setError(describeError(error, "Couldn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  }, [addPerson, editingId, name, resetForm, saving, updatePerson]);

  const handleStartRename = useCallback((person: Person) => {
    setEditingId(person.id);
    setName(person.name);
    setError(null);
  }, []);

  const handleDelete = useCallback(
    (id: string, label: string) => {
      const count = entryCounts[id] ?? 0;
      const entryNote =
        count > 0
          ? ` ${count} ${count === 1 ? "entry keeps" : "entries keep"} the assignment and will show as "(deleted person)".`
          : "";
      Alert.alert(
        "Delete person?",
        `"${label}" will be removed from the picker.${entryNote}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await deletePerson(id);
                  if (editingId === id) resetForm();
                } catch (error) {
                  setError(
                    describeError(error, "Couldn't delete this person. Please try again."),
                  );
                }
              })();
            },
          },
        ],
      );
    },
    [deletePerson, editingId, entryCounts, resetForm],
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
            <Text style={sheet.title}>People</Text>
            <Text style={sheet.subtitle}>
              Add the people in your household (or anyone you track spending
              for). Assign expenses to them when adding entries or approving
              imported transactions, so it's clear who spent what.
            </Text>

            {/* ── Add / rename form ── */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {editingId ? "RENAME PERSON" : "NAME"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sam, Alex, the kids"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
                maxLength={MAX_PERSON_NAME_LENGTH}
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
                      : "Add Person"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Existing list ── */}
            <Text style={[styles.label, styles.listHeader]}>
              YOUR PEOPLE ({people.length})
            </Text>
            {people.length === 0 ? (
              <Text style={styles.emptyText}>
                No people yet. Add one above.
              </Text>
            ) : (
              people.map((person) => {
                const count = entryCounts[person.id] ?? 0;
                return (
                  <View key={person.id} style={styles.row}>
                    <Text style={styles.rowIcon}>👤</Text>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {person.name}
                      </Text>
                      <Text style={styles.rowCount}>
                        {count === 0
                          ? "No assigned entries"
                          : `${count} assigned ${count === 1 ? "entry" : "entries"}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleStartRename(person)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${person.name}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.rowRename}>Rename</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(person.id, person.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${person.name}`}
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

export default React.memo(ManagePeopleModal);
