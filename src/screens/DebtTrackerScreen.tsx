/**
 * BudgetBuddy — Debt Tracker Screen
 * File: src/screens/DebtTrackerScreen.tsx
 *
 * The primary screen of the app. Displays:
 * 1. A summary card with total debt, total paid, and overall progress ring
 * 2. A scrollable list of individual debt cards
 * 3. An "Add Debt" button that opens the AddDebtModal
 * 4. An empty state when no debts exist
 *
 * Data flow:
 * - On mount, loads debts from AsyncStorage via debtStorage utility
 * - All mutations (add, delete, pay) update both local state and storage
 * - Uses useCallback extensively to prevent unnecessary child re-renders
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from "react-native";
import { generateUUID } from "../utils/uuid";
import { Debt, NewDebtInput } from "../types";
import { formatCurrency } from "../utils/calculations";
import { getDebts, saveDebts, recordPayment } from "../storage/debtStorage";
import DebtCard from "../components/DebtCard";
import AddDebtModal from "../components/AddDebtModal";
import ProgressRing from "../components/ProgressRing";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";


const DebtTrackerScreen: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { colors } = useTheme();

  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  /** Load debts from device storage on mount */
  useEffect(() => {
    const loadDebts = async () => {
      try {
        const stored = await getDebts();
        // Filter out any corrupted entries from earlier sessions
        const valid = stored.filter(
          (d) =>
            d &&
            typeof d.id === "string" &&
            typeof d.balance === "number" &&
            typeof d.originalBalance === "number" &&
            d.originalBalance > 0
        );
        if (valid.length !== stored.length) {
          // Clean up corrupted data
          await saveDebts(valid);
        }
        setDebts(valid);
      } catch (error) {
        console.error("Failed to load debts:", error);
        setDebts([]);
      }
      setIsLoading(false);
    };
    loadDebts();
  }, []);

  /** Derived summary values */
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalOriginal = debts.reduce((sum, d) => sum + d.originalBalance, 0);
  const totalPaid = totalOriginal - totalDebt;
  const overallPercent = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;

  /** Add a new debt */
  const handleAddDebt = useCallback(async (input: NewDebtInput) => {
    const newDebt: Debt = {
      ...input,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    setDebts((prev) => {
      const updated = [...prev, newDebt];
      saveDebts(updated);
      return updated;
    });
    setShowModal(false);
  }, []);

  /** Record a payment against a debt */
  const handlePayment = useCallback(async (debtId: string, amount: number) => {
    setDebts((prev) => {
      const updated = prev.map((d) =>
        d.id === debtId ? { ...d, balance: Math.max(0, d.balance - amount) } : d
      );
      saveDebts(updated);
      return updated;
    });
    await recordPayment({
      id: generateUUID(),
      debtId,
      amount,
      date: new Date().toISOString(),
    });
  }, []);

  /** Delete a debt */
  const handleDelete = useCallback(async (debtId: string) => {
    setDebts((prev) => {
      const updated = prev.filter((d) => d.id !== debtId);
      saveDebts(updated);
      return updated;
    });
  }, []);

  const keyExtractor = useCallback((item: Debt) => item.id, []);

  const renderDebtCard = useCallback(
    ({ item }: { item: Debt }) => (
      <DebtCard debt={item} onPayment={handlePayment} onDelete={handleDelete} />
    ),
    [handlePayment, handleDelete]
  );

  /** Summary + section header rendered above the debt list */
  const listHeader = (
    <View>
      <View style={styles.titleSection}>
        <Text style={styles.appLabel}>BUDGETBUDDY</Text>
        <Text style={styles.screenTitle}>Debt Tracker</Text>
        <Text style={styles.screenSubtitle}>
          Track your progress. Crush your debt.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>TOTAL REMAINING</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalDebt)}</Text>
            <Text style={styles.paidText}>{formatCurrency(totalPaid)} paid off</Text>
          </View>
          <View style={styles.summaryRingWrap}>
            <ProgressRing
              percent={overallPercent}
              size={80}
              strokeWidth={6}
              color={overallPercent >= 60 ? colors.success : colors.accent}
            />
            <Text
              style={[
                styles.summaryRingLabel,
                { color: overallPercent >= 60 ? colors.success : colors.accent },
              ]}
            >
              {overallPercent}%
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${colors.accent}20` }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              {debts.length} active {debts.length === 1 ? "debt" : "debts"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.successDim }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>
              {debts.filter((d) => d.balance === 0).length} paid off
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Debts</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Debt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /** Empty state when user has no debts */
  const emptyState = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyTitle}>Debt Free!</Text>
      <Text style={styles.emptySub}>
        Add a debt to start tracking your payoff journey.
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <FlatList
        data={debts}
        keyExtractor={keyExtractor}
        renderItem={renderDebtCard}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <AddDebtModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAddDebt}
      />
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },

    titleSection: { paddingTop: 56, paddingBottom: 20 },
    appLabel: { fontSize: 12, color: colors.textDim, letterSpacing: 2, marginBottom: 4 },
    screenTitle: { fontSize: 28, fontWeight: "700", color: colors.text, marginBottom: 4 },
    screenSubtitle: { fontSize: 14, color: colors.textMuted },

    summaryCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
    },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLeft: { flex: 1 },
  summaryLabel: { fontSize: 11, color: colors.textDim, letterSpacing: 1, marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  paidText: { fontSize: 14, color: colors.success, fontWeight: "600", marginTop: 4 },
  summaryRingWrap: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  summaryRingLabel: { position: "absolute", fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },

  badgeRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },

  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
});

export default DebtTrackerScreen;
