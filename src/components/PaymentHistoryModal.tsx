/**
 * BudgetArk — Payment History Modal
 * File: src/components/PaymentHistoryModal.tsx
 *
 * Displays a scrollable list of all recorded payments, grouped by month.
 * Each entry shows the debt name, amount, and date.
 * Monthly totals are displayed at the bottom of each section.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Payment, Debt } from "../types";
import { getPayments } from "../storage/debtStorage";
import { useTheme } from "../theme/ThemeProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import type { ThemeColors } from "../theme/themes";

interface PaymentHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  debts: Debt[];
}

interface MonthSection {
  key: string;
  label: string;
  payments: Payment[];
  total: number;
}

/** Group payments by year-month, sorted newest first */
const groupByMonth = (payments: Payment[], locale: string): MonthSection[] => {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const groups = new Map<string, Payment[]>();
  for (const p of sorted) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const d = new Date(items[0].date);
    const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    return {
      key,
      label: label.toUpperCase(),
      payments: items,
      total: items.reduce((sum, p) => sum + p.amount, 0),
    };
  });
};

const formatDate = (iso: string, locale: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  visible,
  onClose,
  debts,
}) => {
  const { colors } = useTheme();
  const { formatCurrency, preference } = useCurrency();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [sections, setSections] = useState<MonthSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Build a debtId → name lookup map */
  const debtNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const d of debts) {
      map.set(d.id, d.name);
    }
    return map;
  }, [debts]);

  /** Load payments when modal becomes visible */
  useEffect(() => {
    if (!visible) return;
    setIsLoading(true);
    getPayments()
      .then((payments) => {
        setSections(groupByMonth(payments, preference.locale));
      })
      .catch(() => setSections([]))
      .finally(() => setIsLoading(false));
  }, [preference.locale, visible]);

  const totalAll = React.useMemo(
    () => sections.reduce((sum, s) => sum + s.total, 0),
    [sections]
  );

  /** Flatten sections into a renderable list with headers */
  type ListItem =
    | { type: "header"; label: string; total: number }
    | { type: "payment"; payment: Payment };

  const listData = React.useMemo(() => {
    const items: ListItem[] = [];
    for (const section of sections) {
      items.push({ type: "header", label: section.label, total: section.total });
      for (const payment of section.payments) {
        items.push({ type: "payment", payment });
      }
    }
    return items;
  }, [sections]);

  const keyExtractor = useCallback(
    (item: ListItem, index: number) =>
      item.type === "header" ? `h-${item.label}` : `p-${item.payment.id}`,
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "header") {
        return (
          <View style={styles.monthHeader}>
            <Text style={styles.monthLabel}>{item.label}</Text>
            <Text style={styles.monthTotal}>{formatCurrency(item.total)}</Text>
          </View>
        );
      }

      const { payment } = item;
      const debtName = debtNameMap.get(payment.debtId) ?? "Deleted Debt";

      return (
        <View style={styles.paymentRow}>
          <View style={styles.paymentLeft}>
            <Text style={styles.paymentDebtName}>{debtName}</Text>
            <Text style={styles.paymentDate}>{formatDate(payment.date, preference.locale)}</Text>
          </View>
          <Text style={styles.paymentAmount}>
            -{formatCurrency(payment.amount)}
          </Text>
        </View>
      );
    },
    [debtNameMap, formatCurrency, preference.locale, styles]
  );

  const emptyState = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No Payments Yet</Text>
      <Text style={styles.emptySub}>
        Payments you make will show up here.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Payment History</Text>
              {sections.length > 0 && (
                <Text style={styles.totalLabel}>
                  Total paid: {formatCurrency(totalAll)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Payment list */}
          <FlatList
            data={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={isLoading ? null : emptyState}
            contentContainerStyle={
              listData.length === 0 ? styles.emptyContainer : styles.listContent
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
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
    container: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
      minHeight: "50%",
    },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    totalLabel: {
      fontSize: 13,
      color: colors.success,
      fontWeight: "600",
      marginTop: 2,
    },
    closeBtn: {
      backgroundColor: `${colors.accent}20`,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    closeBtnText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
    },

    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    monthHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 20,
      paddingBottom: 10,
    },
    monthLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textDim,
      letterSpacing: 1,
    },
    monthTotal: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },

    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
    },
    paymentLeft: {
      flex: 1,
      marginRight: 12,
    },
    paymentDebtName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    paymentDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    paymentAmount: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.success,
      fontVariant: ["tabular-nums"],
    },

    emptyWrap: {
      alignItems: "center",
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
    },
  });

export default React.memo(PaymentHistoryModal);
