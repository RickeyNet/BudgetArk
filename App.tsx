// File: App.tsx

import "react-native-reanimated";
import React, { useState, useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { getOrCreateUser } from "./src/storage/userStorage";

/**
 * App entry point.
 *
 * IMPORTANT:
 * - This file must have EXACTLY ONE default export.
 * - ThemeProvider wraps navigation so every screen/component can read the active theme.
 * - Conditionally shows onboarding on first launch
 */

/**
 * Inner app component that has access to theme context
 */
const AppContent: React.FC = () => {
  const { colors } = useTheme();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  /** Check onboarding status on mount */
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const user = await getOrCreateUser();
        setIsOnboardingComplete(user.onboardingComplete);
      } catch (error) {
        console.error("Failed to load user:", error);
        setIsOnboardingComplete(false);
      }
    };
    checkOnboarding();
  }, []);

  /** Handle onboarding completion */
  const handleOnboardingComplete = useCallback(() => {
    setIsOnboardingComplete(true);
  }, []);

  /** Show loading indicator while checking onboarding status */
  if (isOnboardingComplete === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  /** Show onboarding if not complete */
  if (!isOnboardingComplete) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  /** Show main app navigation */
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};

/**
 * Root app component with theme provider
 */
export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
