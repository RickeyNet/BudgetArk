/**
 * BudgetArk - Achievements Screen
 * File: src/screens/AchievementsScreen.tsx
 *
 * Modal grid of every Ark badge. Re-evaluates on open so users see
 * retroactive unlocks immediately when this lands in an update.
 *
 * Tapping a medal opens a detail sheet with the title, description,
 * unlock date (or "How to earn" if still locked).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Medal from "../components/Medal";
import {
  ACHIEVEMENT_DEFS,
  TIER_ORDER,
  TOTAL_ACHIEVEMENTS,
  type AchievementDef,
  type AchievementProgress,
} from "../data/achievementDefs";
import { evaluateAchievements } from "../utils/achievements";
import { useCurrency } from "../currency/CurrencyProvider";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { useValueChanged } from "../hooks/useValueChanged";

interface AchievementsScreenProps {
  visible: boolean;
  onClose: () => void;
}

type FilterId = "all" | "earned" | "locked";

const FILTERS: readonly { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "locked", label: "Locked" },
];

const formatUnlockDate = (timestamp: number | undefined): string => {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const { formatCompactCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  const [unlocked, setUnlocked] = useState<Record<string, number>>({});
  const [progressMap, setProgressMap] = useState<
    Record<string, AchievementProgress>
  >({});
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Re-arm the loading state the moment the sheet opens - render-time
  // adjustment (see useValueChanged) so the evaluate effect below never sets
  // state synchronously.
  if (useValueChanged(visible) && visible) {
    setIsLoaded(false);
  }

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    evaluateAchievements()
      .then((result) => {
        if (cancelled) return;
        setUnlocked(result.unlocked);
        setProgressMap(result.progress);
        setIsLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (__DEV__) console.warn("Failed to evaluate achievements:", error);
        setUnlocked({});
        setProgressMap({});
        setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const formatProgress = useCallback(
    (p: AchievementProgress): string => {
      const cur = Math.max(0, Math.min(p.current, p.target));
      if (p.format) return p.format(cur, p.target);
      if (p.isCurrency) {
        return `${formatCompactCurrency(cur)} / ${formatCompactCurrency(p.target)}`;
      }
      return `${Math.floor(cur)} / ${p.target}`;
    },
    [formatCompactCurrency]
  );

  const sortedDefs = useMemo(() => {
    // Earned first, then by tier ascending, then by definition order.
    return [...ACHIEVEMENT_DEFS].sort((a, b) => {
      const aEarned = unlocked[a.id] !== undefined ? 0 : 1;
      const bEarned = unlocked[b.id] !== undefined ? 0 : 1;
      if (aEarned !== bEarned) return aEarned - bEarned;
      const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
      if (tierDiff !== 0) return tierDiff;
      return 0;
    });
  }, [unlocked]);

  const visibleDefs = useMemo(() => {
    if (filter === "all") return sortedDefs;
    if (filter === "earned") {
      return sortedDefs.filter((d) => unlocked[d.id] !== undefined);
    }
    return sortedDefs.filter((d) => unlocked[d.id] === undefined);
  }, [filter, sortedDefs, unlocked]);

  const earnedCount = useMemo(
    () => ACHIEVEMENT_DEFS.filter((d) => unlocked[d.id] !== undefined).length,
    [unlocked]
  );

  const handleClose = useCallback(() => {
    setSelected(null);
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: { item: AchievementDef }) => {
      const isEarned = unlocked[item.id] !== undefined;
      const prog = !isEarned ? progressMap[item.id] : undefined;
      const ratio =
        prog && prog.target > 0
          ? Math.max(0, Math.min(1, prog.current / prog.target))
          : undefined;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.cell,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setSelected(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${
            isEarned
              ? ", earned"
              : prog
                ? `, ${formatProgress(prog)}`
                : ", locked"
          }`}
        >
          <Medal
            tier={item.tier}
            glyph={item.glyph}
            locked={!isEarned}
            size={72}
            progress={ratio}
          />
          <Text
            style={[
              styles.cellTitle,
              !isEarned && { color: colors.textMuted },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {prog && (
            <Text style={styles.cellProgress} numberOfLines={1}>
              {formatProgress(prog)}
            </Text>
          )}
        </Pressable>
      );
    },
    [colors.textMuted, formatProgress, progressMap, styles, unlocked]
  );

  const detailEarned = selected ? unlocked[selected.id] : undefined;
  const detailProgress =
    selected && detailEarned === undefined
      ? progressMap[selected.id]
      : undefined;
  const detailRatio =
    detailProgress && detailProgress.target > 0
      ? Math.max(0, Math.min(1, detailProgress.current / detailProgress.target))
      : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.root,
          { backgroundColor: colors.bg, paddingTop: insets.top },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Ship's Log</Text>
            <Text style={styles.headerSubtitle}>
              {isLoaded
                ? `${earnedCount}/${TOTAL_ACHIEVEMENTS} earned`
                : "Tallying..."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close achievements"
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={visibleDefs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {filter === "earned"
                  ? "No badges earned yet - start tracking debts or savings to fill the log."
                  : "Nothing here."}
              </Text>
            </View>
          }
        />

        <Modal
          visible={selected !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setSelected(null)}
        >
          <Pressable
            style={styles.detailOverlay}
            onPress={() => setSelected(null)}
          >
            <Pressable
              style={[
                styles.detailCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {selected && (
                <>
                  <Medal
                    tier={selected.tier}
                    glyph={selected.glyph}
                    locked={detailEarned === undefined}
                    size={108}
                    progress={detailRatio}
                  />
                  <Text style={styles.detailTitle}>{selected.title}</Text>
                  <Text style={styles.detailTier}>
                    {selected.tier.charAt(0).toUpperCase() +
                      selected.tier.slice(1)}
                  </Text>
                  <Text style={styles.detailBody}>
                    {detailEarned !== undefined
                      ? selected.description
                      : selected.hint}
                  </Text>
                  {detailProgress && (
                    <Text style={styles.detailProgress}>
                      {formatProgress(detailProgress)}
                    </Text>
                  )}
                  {detailEarned !== undefined && (
                    <Text style={styles.detailDate}>
                      Earned {formatUnlockDate(detailEarned)}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => setSelected(null)}
                  >
                    <Text style={styles.detailButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: tokens.pad,
      paddingBottom: tokens.gap,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    closeButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: tokens.radiusPill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    closeButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: tokens.pad,
      gap: 8,
      marginBottom: tokens.gap,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: tokens.radiusPill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterChipText: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
    filterChipTextActive: {
      color: colors.white,
    },
    gridContent: {
      paddingHorizontal: tokens.pad,
      gap: tokens.gap,
    },
    gridRow: {
      gap: tokens.gap,
      marginBottom: tokens.gap,
    },
    cell: {
      flex: 1,
      alignItems: "center",
      padding: 12,
      borderRadius: tokens.radius,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cellTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 8,
    },
    cellProgress: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 4,
      fontVariant: ["tabular-nums"],
    },
    emptyContainer: {
      paddingHorizontal: 24,
      paddingVertical: 48,
      alignItems: "center",
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: "center",
      fontSize: 14,
      lineHeight: 20,
    },
    detailOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    detailCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 20,
      borderWidth: 1,
      padding: 24,
      alignItems: "center",
    },
    detailTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
      marginTop: 16,
      textAlign: "center",
    },
    detailTier: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.4,
      marginTop: 4,
      textTransform: "uppercase",
    },
    detailBody: {
      color: colors.textDim,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 12,
    },
    detailProgress: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 10,
      fontVariant: ["tabular-nums"],
    },
    detailDate: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 8,
    },
    detailButton: {
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    detailButtonText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 14,
    },
  });

export default AchievementsScreen;
