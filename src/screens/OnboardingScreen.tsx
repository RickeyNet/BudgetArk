/**
 * BudgetArk — Onboarding Screen
 * File: src/screens/OnboardingScreen.tsx
 *
 * First-launch onboarding flow that guides users through:
 * 1. Theme selection (choose color scheme)
 * 2. Welcome message and app overview
 * 3. Optional display name setup
 *
 * Performance optimizations:
 * - Uses React.memo for theme preview cards to prevent unnecessary re-renders
 * - Callbacks are memoized with useCallback
 * - Minimal state updates during theme preview interactions
 *
 * Design:
 * - Full-screen experience with smooth transitions
 * - Interactive theme previews showing live color changes
 * - Skip option for users who want default settings
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { ThemePreset } from "../theme/themes";
import { completeOnboarding } from "../storage/userStorage";

const { width } = Dimensions.get("window");

type OnboardingStyles = ReturnType<typeof makeStyles>;

/** Onboarding step enum for type safety */
type OnboardingStep = "theme" | "welcome" | "name";

interface OnboardingScreenProps {
  /** Callback when onboarding is complete */
  onComplete: (options?: { openArkSetup?: boolean }) => void;
}

/**
 * Theme preview card component - memoized for performance
 */
const ThemePreviewCard = React.memo<{
  preset: ThemePreset;
  isSelected: boolean;
  onSelect: (id: string) => void;
  styles: OnboardingStyles;
}>(({ preset, isSelected, onSelect, styles }) => {
  const handlePress = useCallback(() => {
    onSelect(preset.id);
  }, [preset.id, onSelect]);

  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        {
          borderColor: isSelected ? preset.colors.accent : preset.colors.cardBorder,
          backgroundColor: preset.colors.card,
        },
        isSelected && styles.themeCardSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Color palette preview */}
      <View style={styles.colorPreview}>
        <View
          style={[styles.colorSwatch, { backgroundColor: preset.colors.bg }]}
        />
        <View
          style={[styles.colorSwatch, { backgroundColor: preset.colors.card }]}
        />
        <View
          style={[
            styles.colorSwatch,
            { backgroundColor: preset.colors.accent },
          ]}
        />
        <View
          style={[
            styles.colorSwatch,
            { backgroundColor: preset.colors.success },
          ]}
        />
      </View>

      {/* Theme name */}
      <Text
        style={[
          styles.themeName,
          { color: preset.colors.text },
        ]}
      >
        {preset.name}
      </Text>

      {/* Selection indicator */}
      {isSelected && (
        <View
          style={[
            styles.selectedBadge,
            { backgroundColor: preset.colors.accent },
          ]}
        >
          <Text style={[styles.selectedBadgeText, { color: preset.colors.white }]}>
            ✓
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

ThemePreviewCard.displayName = "ThemePreviewCard";

/**
 * Main onboarding screen component
 */
const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors, presets, themeId, setThemeId } = useTheme();
  const [step, setStep] = useState<OnboardingStep>("theme");
  const [displayName, setDisplayName] = useState("");

  /** Memoized styles based on current theme */
  const styles = useMemo(() => makeStyles(colors), [colors]);

  /**
   * Handle theme selection - updates theme immediately for preview
   */
  const handleThemeSelect = useCallback(
    async (id: string) => {
      await setThemeId(id);
    },
    [setThemeId]
  );

  /**
   * Advance to next step
   */
  const handleNext = useCallback(() => {
    if (step === "theme") {
      setStep("welcome");
    } else if (step === "welcome") {
      setStep("name");
    }
  }, [step]);

  /**
   * Complete onboarding and mark as done
   */
  const handleComplete = useCallback(async (openArkSetup?: boolean) => {
    await completeOnboarding(displayName);
    onComplete({ openArkSetup: !!openArkSetup });
  }, [displayName, onComplete]);

  /**
   * Skip to the end (keeps current theme, default name)
   */
  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    onComplete();
  }, [onComplete]);

  /** Render theme selection step */
  const renderThemeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>STEP 1 OF 3</Text>
      <Text style={styles.stepTitle}>Choose Your Theme</Text>
      <Text style={styles.stepSubtitle}>
        Select a color scheme that matches your style. You can change this
        later in settings.
      </Text>

      <ScrollView
        style={styles.themeGrid}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.themeGridContent}
      >
        {presets.map((preset) => (
          <ThemePreviewCard
            key={preset.id}
            preset={preset}
            isSelected={themeId === preset.id}
            onSelect={handleThemeSelect}
            styles={styles}
          />
        ))}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.white }]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /** Render welcome step */
  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>STEP 2 OF 3</Text>
      <Text style={styles.heroEmoji}>💸</Text>
      <Text style={styles.stepTitle}>Welcome to BudgetArk</Text>
      <Text style={styles.stepSubtitle}>
        Your personal finance companion for tracking debt, managing budgets, and
        planning investments.
      </Text>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⛓️</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Debt Tracking</Text>
            <Text style={styles.featureDesc}>
              Monitor your debts and celebrate progress as you pay them down
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>💰</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Budget Management</Text>
            <Text style={styles.featureDesc}>
              Set spending limits and track expenses by category
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📈</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Investment Planning</Text>
            <Text style={styles.featureDesc}>
              Project your wealth growth with interactive calculators
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.white }]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /** Render display name step */
  const renderNameStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>STEP 3 OF 3</Text>
      <Text style={styles.stepTitle}>What should we call you?</Text>
      <Text style={styles.stepSubtitle}>
        Choose a display name (optional). This is only stored on your device.
      </Text>

      <View style={styles.nameInputContainer}>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              color: colors.text,
            },
          ]}
          placeholder="Buddy"
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Text style={styles.nameHint}>
          Leave blank to use the default name "Buddy"
        </Text>
      </View>

      <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
        <Text style={styles.privacyTitle}>🔒 Privacy First</Text>
        <Text style={styles.privacyText}>
          No email, phone number, or personal data required. Your information
          is stored locally on your device and never sent to any server.
        </Text>
      </View>

      <View style={[styles.arkCard, { backgroundColor: colors.card }]}> 
        <Text style={styles.arkTitle}>Build Your Ark (Optional)</Text>
        <Text style={styles.arkText}>
          You can set milestone targets now, or skip for now and do it later from the Debt screen.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.completeBtn,
          { backgroundColor: colors.accent },
        ]}
        onPress={() => handleComplete(true)}
      >
        <Text style={[styles.completeBtnText, { color: colors.accentButtonText }]}>
          Finish + Build Your Ark
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.completeBtn,
          { backgroundColor: colors.success, marginTop: 10 },
        ]}
        onPress={() => handleComplete(false)}
      >
        <Text style={[styles.completeBtnText, { color: colors.bg }]}> 
          Skip for Now
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === "theme" && renderThemeStep()}
        {step === "welcome" && renderWelcomeStep()}
        {step === "name" && renderNameStep()}
      </ScrollView>
    </View>
  );
};

/**
 * Style factory function - creates styles based on current theme colors
 * Memoization happens at call site to prevent recreation on every render
 */
const makeStyles = (colors: ThemePreset["colors"]) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    stepContainer: {
      flex: 1,
      alignItems: "center",
    },
    stepNumber: {
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    stepTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: 15,
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    heroEmoji: {
      fontSize: 64,
      marginBottom: 16,
    },

    /* Theme selection */
    themeGrid: {
      flex: 1,
      width: "100%",
    },
    themeGridContent: {
      gap: 12,
      paddingBottom: 20,
    },
    themeCard: {
      backgroundColor: colors.card,
      borderWidth: 2,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      position: "relative",
    },
    themeCardSelected: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    colorPreview: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    colorSwatch: {
      width: 40,
      height: 40,
      borderRadius: 8,
    },
    themeName: {
      fontSize: 18,
      fontWeight: "600",
    },
    selectedBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    selectedBadgeText: {
      fontSize: 16,
      fontWeight: "700",
    },

    /* Feature list */
    featureList: {
      width: "100%",
      gap: 20,
      marginBottom: 32,
    },
    featureItem: {
      flexDirection: "row",
      gap: 16,
      alignItems: "flex-start",
    },
    featureIcon: {
      fontSize: 32,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    featureDesc: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },

    /* Name input */
    nameInputContainer: {
      width: "100%",
      marginBottom: 24,
    },
    nameInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      textAlign: "center",
      marginBottom: 8,
    },
    nameHint: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
    },

    /* Privacy card */
    privacyCard: {
      borderRadius: 12,
      padding: 20,
      marginBottom: 32,
      width: "100%",
    },
    privacyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    privacyText: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },
    arkCard: {
      borderRadius: 12,
      padding: 18,
      marginBottom: 20,
      width: "100%",
    },
    arkTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    arkText: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },

    /* Buttons */
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
      marginTop: "auto",
    },
    skipBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    skipBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textDim,
    },
    nextBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    nextBtnText: {
      fontSize: 15,
      fontWeight: "600",
    },
    completeBtn: {
      width: "100%",
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    completeBtnText: {
      fontSize: 16,
      fontWeight: "700",
    },
  });

export default OnboardingScreen;
