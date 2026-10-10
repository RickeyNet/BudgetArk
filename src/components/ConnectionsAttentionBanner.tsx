/**
 * BudgetArk - bank connections attention banner.
 *
 * Before this, "a bank connection needs attention" (re-auth, a failed sync,
 * or the SimpleFIN Bridge reporting a bank that wants a fresh login) only
 * showed as a small label on Profile -> Bank Connections - easy to miss for
 * days while imports silently stopped. This banner surfaces the same
 * `needsAttention` flag on the Bridge and Budget tabs and deep-links into the
 * manager, where the details and the fix live.
 *
 * Deliberately generic copy: no bank names, account names or amounts (it
 * sits on everyday screens and stays shareable in a screenshot). "Later"
 * hides it for this app session only; the dismissal resets once the problem
 * clears, so a NEW problem shows the banner again.
 */

import React, { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useConnections } from "../connections/ConnectionsProvider";

interface ConnectionsAttentionBannerProps {
  /** Tap anywhere on the banner: open the Bank Connections manager. */
  onOpen: () => void;
  style?: StyleProp<ViewStyle>;
}

// Session-scoped dismissal shared by every mounted banner (Bridge + Budget
// are both kept alive by the tab navigator), so "Later" on one hides both.
let dismissedForSession = false;
const listeners = new Set<() => void>();

const setDismissedForSession = (value: boolean): void => {
  if (dismissedForSession === value) return;
  dismissedForSession = value;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): boolean => dismissedForSession;

const ConnectionsAttentionBanner: React.FC<ConnectionsAttentionBannerProps> = ({
  onOpen,
  style,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { needsAttention } = useConnections();
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Problem cleared -> forget the dismissal so the next problem shows again.
  useEffect(() => {
    if (!needsAttention) setDismissedForSession(false);
  }, [needsAttention]);

  if (!needsAttention || dismissed) return null;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onOpen}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("profile.connections.banner.title")}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
      <Text style={styles.body}>{t("profile.connections.banner.body")}</Text>
      <View style={styles.footerRow}>
        <Text style={styles.openAction}>{t("profile.connections.banner.open")}</Text>
        <TouchableOpacity
          onPress={() => setDismissedForSession(true)}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityRole="button"
        >
          <Text style={styles.laterAction}>{t("profile.connections.banner.later")}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 6,
      backgroundColor: `${colors.warning}12`,
      borderColor: `${colors.warning}35`,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 20,
    },
    body: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    openAction: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.warning,
    },
    laterAction: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textDim,
    },
    chevron: {
      fontSize: 22,
      color: colors.textDim,
      fontWeight: "600",
    },
  });

export default React.memo(ConnectionsAttentionBanner);
