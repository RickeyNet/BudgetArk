/**
 * BudgetArk - App Navigator
 * File: src/navigation/AppNavigator.tsx
 *
 * Sets up the bottom tab navigation for the app.
 * Contains 5 tabs:
 *   1. Debt Tracker (⛓️) - debt payoff planning
 *   2. Budget (💰)       - income & expense tracking
 *   3. Bridge (🧭)       - net worth, accounts, and progress
 *   4. Utilities (🧰)    - financial tools & calculators
 *   5. Profile (👤)      - anonymous account & settings
 *
 * Design decisions:
 * - Uses @react-navigation/bottom-tabs for native tab bar behavior
 * - Tab bar is styled to match the dark theme with a frosted glass effect
 * - Icons are emoji-based for now (swap for vector icons later if desired)
 * - headerShown: false on all screens - each screen manages its own header
 * - Bridge tab is centered and opens by default
 *
 * Performance:
 * - lazy: true (default) - screens only mount when first visited
 * - Tab bar uses dynamic theme colors that update when theme changes
 */

import React from "react";
import { Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_BASE_HEIGHT } from "./tabBarLayout";
import { RootTabParamList } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import SpaceBackground from "../components/SpaceBackground";

/* ── Screen Imports ── */
import DebtTrackerScreen from "../screens/DebtTrackerScreen";
import BudgetScreen from "../screens/BudgetScreen";
import BridgeScreen from "../screens/BridgeScreen";
import UtilitiesScreen from "../screens/UtilitiesScreen";
import ProfileScreen from "../screens/ProfileScreen";

/** Create the typed tab navigator */
const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Tab icon configuration.
 * Maps each route name to its emoji icon.
 * Using a lookup object is faster than a switch statement.
 */
const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  DebtTracker: "⛓️",
  Budget: "💰",
  Bridge: "🧭",
  Utilities: "🧰",
  Profile: "👤",
};

/**
 * Tab display labels.
 * Shortened versions of screen names for the tab bar.
 */
const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  DebtTracker: "Debts",
  Budget: "Budget",
  Bridge: "Bridge",
  Utilities: "Utilities",
  Profile: "Profile",
};

const AppNavigator: React.FC = () => {
  const { colors, themeId } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);
  const isDeepSpace = themeId === "deep_space";

  return (
    <>
      {isDeepSpace ? <SpaceBackground /> : null}
    <Tab.Navigator
      initialRouteName="Bridge"
      screenOptions={({ route }) => ({
        /** Hide the default header - each screen has its own */
        headerShown: false,

        /** Let the global SpaceBackground show through on the Deep Space theme */
        sceneStyle: isDeepSpace ? styles.transparentScene : undefined,

        /** Tab bar icon - emoji based */
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.icon, !focused && styles.iconInactive]}>
            {TAB_ICONS[route.name as keyof RootTabParamList]}
          </Text>
        ),

        /** Tab bar label */
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
            {TAB_LABELS[route.name as keyof RootTabParamList]}
          </Text>
        ),

        /** Tab bar styling - dark theme with subtle border */
        tabBarStyle: styles.tabBar,

        /** Active indicator color (used on some platforms) */
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen name="DebtTracker" component={DebtTrackerScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Bridge" component={BridgeScreen} />
      <Tab.Screen name="Utilities" component={UtilitiesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    </>
  );
};

const makeStyles = (colors: ThemeColors, bottomInset: number) =>
  StyleSheet.create({
    transparentScene: {
      backgroundColor: "transparent",
    },
    tabBar: {
      backgroundColor: colors.card,
      borderTopColor: colors.cardBorder,
      borderTopWidth: 1,
      height: TAB_BAR_BASE_HEIGHT + bottomInset,
      paddingTop: 8,
      paddingBottom: Math.max(8, bottomInset),
      position: "absolute",
      elevation: 0,
    },
    icon: {
      fontSize: 22,
    },
    iconInactive: {
      opacity: 0.4,
    },
    label: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.3,
      marginTop: 2,
    },
    labelActive: {
      color: colors.accent,
    },
    labelInactive: {
      color: colors.textMuted,
    },
  });

export default AppNavigator;
