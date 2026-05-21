import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";
import { BudgetEntry, CategoryName, CustomCategory } from "../types";
import {
  BillsByDay,
  groupBillsByDay,
  nextBillFrom,
  splitPaidVsRemaining,
} from "../utils/billCalendar";
import { getCategoryIcon } from "../data/categoryIcons";
import { getRecurrenceTag } from "../utils/recurrence";

interface BillCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  entries: BudgetEntry[];
  monthKey: string;
  customCategories: CustomCategory[];
  colorForCategory: (category: CategoryName) => string;
  onEditEntry: (entry: BudgetEntry) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const monthLabel = (monthKey: string): string => {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

interface GridCell {
  day: number | null;
  total: number;
  categories: CategoryName[];
}

const buildGridCells = (monthKey: string, bills: BillsByDay): GridCell[] => {
  const [yStr, mStr] = monthKey.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const firstWeekday = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: GridCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, total: 0, categories: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const list = bills.byDay.get(d) ?? [];
    const total = list.reduce((s, e) => s + e.amount, 0);
    // Distinct category list, max 3 dots per cell so the row stays legible.
    const cats: CategoryName[] = [];
    for (const e of list) {
      if (!cats.includes(e.category)) cats.push(e.category);
      if (cats.length >= 3) break;
    }
    cells.push({ day: d, total, categories: cats });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, total: 0, categories: [] });
  }
  return cells;
};

const BillCalendarModal: React.FC<BillCalendarModalProps> = ({
  visible,
  onClose,
  entries,
  monthKey,
  customCategories,
  colorForCategory,
  onEditEntry,
}) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [includeOneOff, setIncludeOneOff] = useState(false);

  const bills = useMemo(
    () => groupBillsByDay(entries, monthKey, { includeOneOff }),
    [entries, monthKey, includeOneOff]
  );
  const cells = useMemo(() => buildGridCells(monthKey, bills), [monthKey, bills]);
  const { paid, remaining } = useMemo(
    () => splitPaidVsRemaining(bills, monthKey),
    [bills, monthKey]
  );
  const next = useMemo(() => nextBillFrom(entries), [entries]);

  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = nowKey === monthKey;
  const today = isCurrentMonth ? now.getDate() : -1;

  const selectedEntries = useMemo(() => {
    if (selectedDay == null) return [];
    return (bills.byDay.get(selectedDay) ?? []).slice().sort((a, b) => b.amount - a.amount);
  }, [bills, selectedDay]);

  const nextLabel = useMemo(() => {
    if (!next) return null;
    if (next.daysUntil === 0) return "today";
    if (next.daysUntil === 1) return "tomorrow";
    if (next.daysUntil < 0) return `${Math.abs(next.daysUntil)}d ago`;
    return `in ${next.daysUntil}d`;
  }, [next]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Bill Calendar</Text>
            <Text style={styles.subtitle}>{monthLabel(monthKey)}</Text>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 80 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.statsStrip}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Bills</Text>
                <Text style={styles.statValue}>{formatCurrency(bills.monthTotal)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Paid</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(paid)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Remaining</Text>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {formatCurrency(remaining)}
                </Text>
              </View>
            </View>

            {next && nextLabel && (
              <View style={styles.nextRow}>
                <Text style={styles.nextLabel}>NEXT</Text>
                <Text style={styles.nextText} numberOfLines={1}>
                  {next.entry.description || next.entry.category} ·{" "}
                  {formatCurrency(next.entry.amount)} · {nextLabel}
                </Text>
              </View>
            )}

            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map((label, idx) => (
                <Text key={`${label}-${idx}`} style={styles.weekLabel}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                const isToday = cell.day != null && cell.day === today;
                const isPast = cell.day != null && isCurrentMonth && cell.day < today;
                const hasBills = cell.total > 0;
                return (
                  <Pressable
                    key={idx}
                    style={[
                      styles.cell,
                      hasBills && styles.cellHasBills,
                      isToday && styles.cellToday,
                      isPast && styles.cellPast,
                      cell.day == null && styles.cellEmpty,
                    ]}
                    onPress={
                      cell.day != null && hasBills
                        ? () => setSelectedDay(cell.day)
                        : undefined
                    }
                    disabled={cell.day == null || !hasBills}
                  >
                    {cell.day != null && (
                      <>
                        <Text style={styles.cellDay}>{cell.day}</Text>
                        <View style={styles.cellDots}>
                          {cell.categories.map((cat, dotIdx) => (
                            <View
                              key={`${cat}-${dotIdx}`}
                              style={[
                                styles.cellDot,
                                { backgroundColor: colorForCategory(cat) },
                              ]}
                            />
                          ))}
                        </View>
                        {hasBills && (
                          <Text style={styles.cellAmount} numberOfLines={1}>
                            {formatCurrency(cell.total)}
                          </Text>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIncludeOneOff((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.toggleBox,
                  includeOneOff && {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  },
                ]}
              >
                {includeOneOff && <Text style={styles.toggleCheck}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>Show one-off expenses too</Text>
            </TouchableOpacity>

            {bills.byDay.size === 0 && (
              <Text style={styles.emptyHint}>
                No recurring bills land in this month. Add a recurring expense
                from the Add Entry sheet and set its day-of-month to see it
                here.
              </Text>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={selectedDay != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <Pressable
          style={styles.dayOverlay}
          onPress={() => setSelectedDay(null)}
        >
          <Pressable
            style={[styles.dayCard, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.dayCardTitle}>
              {selectedDay != null
                ? `${monthLabel(monthKey).split(" ")[0]} ${selectedDay}`
                : ""}
            </Text>
            <ScrollView style={styles.dayList}>
              {selectedEntries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.dayItem}
                  onPress={() => {
                    setSelectedDay(null);
                    onEditEntry(entry);
                  }}
                >
                  <View style={styles.dayItemLeft}>
                    <View
                      style={[
                        styles.dayItemDot,
                        { backgroundColor: colorForCategory(entry.category) },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayItemTitle} numberOfLines={1}>
                        {getCategoryIcon(entry.category, customCategories)}{" "}
                        {entry.description || entry.category}
                      </Text>
                      <Text style={styles.dayItemSub}>
                        {entry.category}
                        {entry.recurring ? ` · ${getRecurrenceTag(entry)}` : ""}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dayItemAmount}>
                    {formatCurrency(entry.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
    },
    sheet: {
      flex: 1,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 8,
      alignItems: "center",
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: colors.textDim,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 16,
    },
    statsStrip: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.bg,
      paddingVertical: 12,
    },
    statCol: {
      flex: 1,
      alignItems: "center",
    },
    statLabel: {
      fontSize: 10,
      letterSpacing: 0.5,
      color: colors.textDim,
      fontWeight: "600",
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.cardBorder,
    },
    nextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 4,
    },
    nextLabel: {
      fontSize: 10,
      letterSpacing: 0.5,
      fontWeight: "700",
      color: colors.accent,
    },
    nextText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: 2,
    },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "600",
      color: colors.textDim,
      letterSpacing: 0.5,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    cell: {
      width: "13.6%",
      aspectRatio: 0.9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      padding: 4,
      alignItems: "center",
      justifyContent: "flex-start",
    },
    cellEmpty: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    cellHasBills: {
      backgroundColor: `${colors.accent}15`,
      borderColor: `${colors.accent}55`,
    },
    cellToday: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    cellPast: {
      opacity: 0.55,
    },
    cellDay: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    cellDots: {
      flexDirection: "row",
      gap: 2,
      marginTop: 2,
      minHeight: 6,
    },
    cellDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    cellAmount: {
      marginTop: "auto",
      fontSize: 9,
      color: colors.textDim,
      fontVariant: ["tabular-nums"],
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 4,
    },
    toggleBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleCheck: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
    },
    toggleLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
    },
    emptyHint: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      paddingHorizontal: 4,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 24 : 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    closeButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },

    /* Day-detail sheet */
    dayOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "flex-end",
    },
    dayCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      padding: 20,
      maxHeight: "70%",
    },
    dayCardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    dayList: {
      maxHeight: 360,
      marginBottom: 12,
    },
    dayItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    dayItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    dayItemDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dayItemTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    dayItemSub: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    dayItemAmount: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
  });

export default React.memo(BillCalendarModal);
