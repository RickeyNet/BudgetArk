/**
 * BudgetArk - Bill Calendar Modal
 * File: src/components/BillCalendarModal.tsx
 *
 * Month-grid view of when recurring expenses and debt payments land, from
 * utils/billCalendar + utils/debtDueCalendar. Read-only: it visualises
 * timing so the user can see cash-flow pinch points, and links out to the
 * device calendar for reminders (BudgetArk never pushes bill alerts).
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
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
import { useTranslation } from "react-i18next";
import { categoryLabel } from "../i18n/categoryLabel";
import { formatMonthKeyLabel } from "../utils/budgetMonths";
import { buildMonthDayGrid } from "../utils/entryDate";
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
import { isFulfillingEntry } from "../utils/billFulfillment";
import { normalizePaymentUrl } from "../utils/paymentUrl";

interface BillCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  entries: BudgetEntry[];
  monthKey: string;
  customCategories: CustomCategory[];
  colorForCategory: (category: CategoryName) => string;
  onEditEntry: (entry: BudgetEntry) => void;
}

/** Sunday-first, matching buildMonthDayGrid; labels come from the locale tree. */
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface GridCell {
  day: number | null;
  total: number;
  categories: CategoryName[];
}

const buildGridCells = (monthKey: string, bills: BillsByDay): GridCell[] => {
  // Same Sunday-first layout as the entry form's day picker
  // (utils/entryDate.buildMonthDayGrid), so a date sits in the same
  // column in both.
  const cells: GridCell[] = buildMonthDayGrid(monthKey).map((d) => {
    if (d == null) return { day: null, total: 0, categories: [] };
    const list = bills.byDay.get(d) ?? [];
    const total = list.reduce((s, e) => s + e.amount, 0);
    // Distinct category list, max 3 dots per cell so the row stays legible.
    const cats: CategoryName[] = [];
    for (const e of list) {
      if (!cats.includes(e.category)) cats.push(e.category);
      if (cats.length >= 3) break;
    }
    return { day: d, total, categories: cats };
  });
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
  const { t, i18n } = useTranslation();
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

  const openPaymentUrl = useCallback(async (raw: string | undefined) => {
    const url = normalizePaymentUrl(raw);
    if (!url) {
      Alert.alert(
        t("budget.tools.billCalendar.linkError.title"),
        t("budget.tools.billCalendar.linkError.invalid")
      );
      return;
    }
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert(
          t("budget.tools.billCalendar.linkError.title"),
          t("budget.tools.billCalendar.linkError.noBrowser")
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t("budget.tools.billCalendar.linkError.title"),
        t("budget.tools.billCalendar.linkError.failed")
      );
    }
  }, [t]);

  const nextLabel = useMemo((): string | null => {
    if (!next) return null;
    if (next.daysUntil === 0) return t("budget.tools.billCalendar.when.today");
    if (next.daysUntil === 1) return t("budget.tools.billCalendar.when.tomorrow");
    if (next.daysUntil < 0)
      return t("budget.tools.billCalendar.when.daysAgo", { count: Math.abs(next.daysUntil) });
    return t("budget.tools.billCalendar.when.inDays", { count: next.daysUntil });
  }, [next, t]);

  // Month title in the active app language (formatMonthKeyLabel follows the
  // device locale, which a fixed-language user may have set differently).
  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    try {
      return d.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
    } catch {
      return formatMonthKeyLabel(monthKey);
    }
  }, [monthKey, i18n.language]);
  const monthOnlyLabel = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    try {
      return d.toLocaleDateString(i18n.language, { month: "long" });
    } catch {
      return formatMonthKeyLabel(monthKey).split(" ")[0];
    }
  }, [monthKey, i18n.language]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("budget.tools.billCalendar.title")}</Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
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
                <Text style={styles.statLabel}>{t("budget.tools.billCalendar.stats.bills")}</Text>
                <Text style={styles.statValue}>{formatCurrency(bills.monthTotal)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t("budget.tools.billCalendar.stats.paid")}</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(paid)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t("budget.tools.billCalendar.stats.remaining")}</Text>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {formatCurrency(remaining)}
                </Text>
              </View>
            </View>

            {next && nextLabel && (
              <View style={styles.nextRow}>
                <Text style={styles.nextLabel}>{t("budget.tools.billCalendar.nextLabel")}</Text>
                <Text style={styles.nextText} numberOfLines={1}>
                  {t("budget.tools.billCalendar.nextRow", {
                    name: next.entry.description || categoryLabel(t, next.entry.category),
                    amount: formatCurrency(next.entry.amount),
                    when: nextLabel,
                  })}
                </Text>
              </View>
            )}

            <View style={styles.weekRow}>
              {WEEKDAY_KEYS.map((key) => (
                <Text key={key} style={styles.weekLabel}>
                  {t(`budget.tools.billCalendar.weekdays.${key}`)}
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
              <Text style={styles.toggleLabel}>{t("budget.tools.billCalendar.showOneOff")}</Text>
            </TouchableOpacity>

            {bills.byDay.size === 0 && (
              <Text style={styles.emptyHint}>{t("budget.tools.billCalendar.emptyHint")}</Text>
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
              <Text style={styles.closeText}>{t("common.close")}</Text>
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
              {selectedDay != null ? `${monthOnlyLabel} ${selectedDay}` : ""}
            </Text>
            <ScrollView style={styles.dayList}>
              {selectedEntries.map((entry) => (
                <View key={entry.id} style={styles.dayItem}>
                  <TouchableOpacity
                    style={styles.dayItemMain}
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
                          {entry.description || categoryLabel(t, entry.category)}
                        </Text>
                        <Text style={styles.dayItemSub}>
                          {categoryLabel(t, entry.category)}
                          {entry.recurring ? ` · ${getRecurrenceTag(entry)}` : ""}
                          {isFulfillingEntry(entry)
                            ? ` · ${t("budget.tools.billCalendar.paidActual")}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dayItemAmount}>
                      {formatCurrency(entry.amount)}
                    </Text>
                  </TouchableOpacity>
                  {entry.paymentUrl && (
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => openPaymentUrl(entry.paymentUrl)}
                      accessibilityRole="link"
                      accessibilityLabel={t("budget.tools.billCalendar.payA11y", {
                        name: entry.description || categoryLabel(t, entry.category),
                      })}
                    >
                      <Text style={styles.payBtnText}>{t("budget.tools.billCalendar.payButton")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={styles.closeText}>{t("common.close")}</Text>
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
      backgroundColor: colors.overlayStrong,
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
      backgroundColor: colors.overlay,
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
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    dayItemMain: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    payBtn: {
      alignSelf: "flex-start",
      marginTop: 6,
      marginLeft: 18,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: `${colors.accent}80`,
      backgroundColor: `${colors.accent}15`,
    },
    payBtnText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700",
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
