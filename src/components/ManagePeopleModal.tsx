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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { describeError } from "../utils/errorMessage";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { Person } from "../types";
import { MAX_PERSON_NAME_LENGTH } from "../types";
import {
  addPerson,
  deletePerson,
  getPeople,
  updatePerson,
} from "../storage/personStorage";
import { getBudgetEntries } from "../storage/budgetStorage";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";

interface ManagePeopleModalProps {
  visible: boolean;
  onClose: () => void;
  /** Fired after any successful add/rename/delete so parents can refresh. */
  onChanged?: () => void;
}

const ManagePeopleModal: React.FC<ManagePeopleModalProps> = ({
  visible,
  onClose,
  onChanged,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [people, setPeople] = useState<Person[]>([]);
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
        const [list, entries] = await Promise.all([
          getPeople(),
          getBudgetEntries(),
        ]);
        if (cancelled) return;
        setPeople(list);
        const counts: Record<string, number> = {};
        for (const entry of entries) {
          if (entry.personId) {
            counts[entry.personId] = (counts[entry.personId] ?? 0) + 1;
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
        setPeople(result.people);
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
                  const next = await deletePerson(id);
                  setPeople(next);
                  if (editingId === id) resetForm();
                  onChanged?.();
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
    [editingId, entryCounts, onChanged, resetForm],
  );

  const canSubmit = name.trim().length > 0 && !saving;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <SheetKeyboardAvoider style={styles.overlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <Text style={styles.title}>People</Text>
            <Text style={styles.subtitle}>
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
          </ScrollView>

          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SheetKeyboardAvoider>
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
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "600",
    },
    formButtons: {
      flexDirection: "row",
      gap: 12,
    },
    cancelEditButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    cancelEditText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    addButton: {
      flex: 1,
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
    rowIcon: { fontSize: 18 },
    rowTextWrap: { flex: 1 },
    rowName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    rowCount: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    rowRename: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
      marginRight: 4,
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

export default React.memo(ManagePeopleModal);
