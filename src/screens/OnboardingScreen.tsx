/**
 * BudgetArk - Onboarding Screen
 * File: src/screens/OnboardingScreen.tsx
 *
 * First-launch onboarding flow that guides users through:
 * 1. Language (so every later step is read in the right one)
 * 2. Mission statement
 * 3. Theme selection (choose color scheme)
 * 4. Welcome message and app overview
 * 5. Quick-start template
 * 6. Tracking reminders
 * 7. Optional display name setup + guided tour choice
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

import { MISSION_STATEMENT } from "../data/missionStatement";
import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../i18n/LanguageProvider";
import type { AppLanguageId } from "../i18n/pickLanguage";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { useAndroidKeyboardInputScroll } from "../hooks/useAndroidKeyboardInputScroll";
import { ThemePreset } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { completeOnboarding } from "../storage/userStorage";
import { totalCoachmarkSteps } from "../data/coachmarkContent";

/**
 * Main onboarding screen component
 */
import { sanitizeTextInput } from "../utils/sanitize";
import { DEFAULT_TRACKING_REMINDER_SETTINGS } from "../utils/trackingReminderPlanner";
import {
  QUICK_START_TEMPLATES,
  quickStartTemplateById,
  type QuickStartTemplateId,
} from "../data/quickStartTemplates";
import { buildQuickStartSeed, parseQuickStartAmount } from "../utils/quickStart";
import { addBudgetEntries, saveCategoryBudgetLimits } from "../storage/budgetStorage";
import { generateUUID } from "../utils/uuid";
import { localYearMonth } from "../utils/entryDate";
import type { BudgetEntry } from "../types";
import {
  markTrackingReminderOfferDismissed,
  setTrackingReminderSettings,
} from "../storage/trackingReminderSettingsStorage";
import {
  ensureTrackingReminderPermissions,
  rescheduleTrackingReminders,
} from "../notifications/trackingReminders";

type OnboardingStyles = ReturnType<typeof makeStyles>;

/**
 * Onboarding step enum for type safety. "language" comes first on purpose:
 * everything after it is prose, so the user must be able to fix a wrong
 * guess (phone in one language, reader in another) before reading any of
 * it. "mission" follows: before any other choice is asked of them, the
 * user hears why the app exists and what it promises (free, private,
 * offline) - the same copy as the Profile mission card, so the two never
 * drift.
 */
type OnboardingStep =
  | "language"
  | "mission"
  | "theme"
  | "welcome"
  | "template"
  | "reminders"
  | "name";

/** Shown in the "STEP n OF m" eyebrow of every step. */
const TOTAL_STEPS = 7;

interface OnboardingScreenProps {
  /** Callback when onboarding is complete */
  onComplete: (options?: OnboardingCompleteOptions) => void;
}

export interface OnboardingCompleteOptions {
  openArkSetup?: boolean;
  /**
   * false = the user declined the guided tour (or tapped Skip Setup), so
   * the host must not start it. Absent/true keeps the tour.
   */
  guidedTour?: boolean;
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
          <Text style={[styles.selectedBadgeText, { color: preset.colors.accentButtonText }]}>
            ✓
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

ThemePreviewCard.displayName = "ThemePreviewCard";

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors, presets, themeId, setThemeId } = useTheme();
  const { tokens } = useDensity();
  const { t } = useTranslation();
  const {
    languageId,
    resolvedLanguage,
    options: languageOptions,
    setLanguageId,
  } = useLanguage();
  const [step, setStep] = useState<OnboardingStep>("language");
  const [displayName, setDisplayName] = useState("");
  /** Guards the reminders step's button through the OS permission prompt. */
  const [remindersBusy, setRemindersBusy] = useState(false);
  /** Quick-start template (data/quickStartTemplates); null = start empty. */
  const [templateId, setTemplateId] = useState<QuickStartTemplateId | null>(null);
  const [incomeInput, setIncomeInput] = useState("");
  const [housingInput, setHousingInput] = useState("");
  /**
   * Whether setup hands over to the guided tab tour. Asked on the last
   * step rather than assumed: the tour is several times longer than setup
   * itself, so it is offered with its size stated instead of just starting.
   */
  const [wantsTour, setWantsTour] = useState(true);
  const tourTipCount = useMemo(() => totalCoachmarkSteps(), []);

  /** Memoized styles based on current theme */
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

  /**
   * Keep the template/name TextInputs visible above the keyboard: iOS via
   * the ScrollView's automaticallyAdjustKeyboardInsets, Android via the
   * shared measure-and-scroll hook + KeyboardAvoidingView (see
   * useAndroidKeyboardInputScroll for why both halves are needed).
   */
  const scrollRef = useRef<ScrollView>(null);
  const onKeyboardInputScroll = useAndroidKeyboardInputScroll(scrollRef);

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
   * Handle language selection - LanguageProvider switches i18next at once,
   * so this very step re-renders in the chosen language. The setting is
   * cosmetic and already applied for this session when the write runs, so
   * a failed save is not surfaced: the app stays readable now and Profile >
   * Settings > Language sets it again.
   */
  const handleLanguageSelect = useCallback(
    (id: AppLanguageId) => {
      setLanguageId(id).catch((error: unknown) => {
        if (__DEV__) console.warn("Failed to save language:", error);
      });
    },
    [setLanguageId]
  );

  /**
   * Advance to next step
   */
  const handleNext = useCallback(() => {
    if (step === "language") {
      setStep("mission");
    } else if (step === "mission") {
      setStep("theme");
    } else if (step === "theme") {
      setStep("welcome");
    } else if (step === "welcome") {
      setStep("template");
    } else if (step === "template") {
      setStep("reminders");
    } else if (step === "reminders") {
      setStep("name");
    }
  }, [step]);

  /**
   * Return to the previous step (no-op on the first step, which shows no
   * back button)
   */
  const handleBack = useCallback(() => {
    if (step === "mission") {
      setStep("language");
    } else if (step === "theme") {
      setStep("mission");
    } else if (step === "welcome") {
      setStep("theme");
    } else if (step === "template") {
      setStep("welcome");
    } else if (step === "reminders") {
      setStep("template");
    } else if (step === "name") {
      setStep("reminders");
    }
  }, [step]);

  /**
   * Apply the chosen quick-start template (utils/quickStart): category
   * limits for this month sized from take-home pay, plus recurring income
   * and housing lines when those were typed. Runs after the onboarding
   * flag is saved so a seed failure can never re-run onboarding; the
   * caller reports it and the user simply starts empty.
   */
  const seedQuickStart = useCallback(async () => {
    const template = quickStartTemplateById(templateId);
    if (!template) return;
    const now = new Date();
    const nowIso = now.toISOString();
    const seed = buildQuickStartSeed(template, {
      monthKey: localYearMonth(now),
      now: nowIso,
      income: parseQuickStartAmount(incomeInput),
      housing: parseQuickStartAmount(housingInput),
    });
    if (seed.entries.length > 0) {
      const entries: BudgetEntry[] = seed.entries.map((input) => ({
        ...input,
        id: generateUUID(),
        createdAt: nowIso,
        updatedAt: nowIso,
      }));
      await addBudgetEntries(entries);
    }
    if (seed.limits.length > 0) {
      await saveCategoryBudgetLimits(seed.limits, localYearMonth(now));
    }
  }, [housingInput, incomeInput, templateId]);

  /**
   * "Turn on reminders": ask the OS (this is the only place a first-run
   * install shows the notification permission prompt), persist the default
   * schedule when granted, and move on either way. Reminders stay opt-in
   * in storage - nothing is switched on behind the user's back, so a
   * declined prompt leaves the setting off and Profile > Tracking
   * Reminders remains the way back in.
   */
  const handleEnableReminders = useCallback(async () => {
    if (remindersBusy) return;
    setRemindersBusy(true);
    try {
      const permitted = await ensureTrackingReminderPermissions();
      if (permitted) {
        await setTrackingReminderSettings({
          ...DEFAULT_TRACKING_REMINDER_SETTINGS,
          enabled: true,
        });
        // The root host also reschedules on mount; this just means the
        // first check-in is booked even if that mount is delayed.
        void rescheduleTrackingReminders();
      } else {
        Alert.alert(
          t("onboarding.alerts.notificationsOff.title"),
          t("onboarding.alerts.notificationsOff.message")
        );
      }
    } catch (error) {
      if (__DEV__) console.warn("Failed to enable tracking reminders:", error);
    } finally {
      // Either answer counts as decided: the Budget tab's one-time offer
      // card (for installs that never saw this step) must not re-ask.
      void markTrackingReminderOfferDismissed().catch(() => {});
      setRemindersBusy(false);
      setStep("name");
    }
  }, [remindersBusy, t]);

  /** "Not now" on the reminders step: leave them off, never re-ask. */
  const handleDeclineReminders = useCallback(() => {
    void markTrackingReminderOfferDismissed().catch(() => {});
    setStep("name");
  }, []);

  /**
   * Persist the onboarding-complete flag, then leave the flow.
   *
   * The save is NOT fire-and-forget: if the write fails (full disk,
   * degraded flash tripping the storage timeout), silently continuing
   * means the flag never lands on disk and the user is walked through
   * onboarding again on every launch. Surface it and let them retry -
   * "Continue Anyway" keeps the old escape hatch for a genuinely broken
   * device, with the repeat-onboarding consequence stated up front.
   */
  const finishOnboarding = useCallback(
    async (name?: string, options?: OnboardingCompleteOptions) => {
      const attempt = async (): Promise<void> => {
        try {
          await completeOnboarding(name);
        } catch (error) {
          if (__DEV__) console.error("Failed to save onboarding:", error);
          Alert.alert(
            t("onboarding.alerts.saveFailed.title"),
            t("onboarding.alerts.saveFailed.message"),
            [
              { text: t("onboarding.alerts.saveFailed.tryAgain"), onPress: () => void attempt() },
              {
                text: t("onboarding.alerts.saveFailed.continueAnyway"),
                style: "cancel",
                onPress: () => onComplete(options),
              },
            ]
          );
          return;
        }
        try {
          await seedQuickStart();
        } catch (error) {
          if (__DEV__) console.warn("Quick-start template failed:", error);
          Alert.alert(
            t("onboarding.alerts.templateFailed.title"),
            t("onboarding.alerts.templateFailed.message")
          );
        }
        onComplete(options);
      };
      await attempt();
    },
    [onComplete, seedQuickStart, t]
  );

  /**
   * Complete onboarding and mark as done
   */
  const handleComplete = useCallback(
    (openArkSetup?: boolean) =>
      finishOnboarding(displayName, { openArkSetup: !!openArkSetup, guidedTour: wantsTour }),
    [displayName, finishOnboarding, wantsTour]
  );

  /**
   * Skip to the end (keeps current theme, default name). Skipping setup
   * also declines the guided tour: someone who would not sit through seven
   * setup steps did not ask for a tab-by-tab walkthrough either. The tips
   * stay in Profile > Help > Feature guide.
   */
  const handleSkip = useCallback(
    () => finishOnboarding(undefined, { guidedTour: false }),
    [finishOnboarding]
  );

  /**
   * Render the language step. Each language is listed under its OWN name
   * (never translated), so a reader who cannot follow the language the
   * phone picked still finds theirs; the name in the active language sits
   * underneath as a secondary line. "Automatic" keeps following the phone
   * and says what that currently resolves to.
   */
  const renderLanguageStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>
        {t("onboarding.stepOf", { step: 1, total: TOTAL_STEPS })}
      </Text>
      <Text style={styles.heroEmoji}>🌐</Text>
      <Text style={styles.stepTitle}>{t("onboarding.language.title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.language.subtitle")}</Text>

      <View style={styles.templateList} accessibilityRole="radiogroup">
        {languageOptions.map((option) => {
          const isSelected = languageId === option.id;
          const translated = t(
            `profile.settings.language.names.${option.id === "auto" ? resolvedLanguage : option.id}`
          );
          const title =
            option.nativeName ??
            t("profile.settings.language.autoWithResolved", { language: translated });
          const secondary = option.nativeName && translated !== title ? translated : "";
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.languageCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? colors.accent : colors.cardBorder,
                },
              ]}
              onPress={() => handleLanguageSelect(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={secondary ? `${title}. ${secondary}` : title}
            >
              <View style={styles.featureContent}>
                <Text style={styles.languageName}>{title}</Text>
                {secondary ? (
                  <Text style={styles.languageSecondary}>{secondary}</Text>
                ) : null}
              </View>
              {isSelected ? (
                <Text style={[styles.languageCheck, { color: colors.accent }]}>✓</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>{t("onboarding.skipSetup")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.accentButtonText }]}>
            {t("onboarding.next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /** Render the mission step - why BudgetArk exists, before any setup. */
  const renderMissionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>{t("onboarding.stepOf", { step: 2, total: TOTAL_STEPS })}</Text>
      <Text style={styles.heroEmoji}>⚓</Text>
      <Text style={styles.missionEyebrow}>{MISSION_STATEMENT.eyebrow}</Text>
      <Text style={styles.stepTitle}>{MISSION_STATEMENT.title}</Text>

      <ScrollView
        style={styles.featureScroll}
        contentContainerStyle={styles.missionScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.missionCard}>
          <Text style={styles.missionBody}>{MISSION_STATEMENT.body}</Text>
          <Text style={[styles.missionBody, styles.missionInvite]}>
            {MISSION_STATEMENT.invite}
          </Text>
        </View>
        <Text style={styles.missionFootnote}>{t("onboarding.mission.footnote")}</Text>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleBack}>
          <Text style={styles.skipBtnText}>{t("onboarding.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.accentButtonText }]}>
            {t("onboarding.next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /** Render theme selection step */
  const renderThemeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>{t("onboarding.stepOf", { step: 3, total: TOTAL_STEPS })}</Text>
      <Text style={styles.heroEmoji}>🎨</Text>
      <Text style={styles.stepTitle}>{t("onboarding.theme.title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.theme.subtitle")}</Text>

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
          <Text style={styles.skipBtnText}>{t("onboarding.skipSetup")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.accentButtonText }]}>
            {t("onboarding.next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /** Render welcome step */
  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>{t("onboarding.stepOf", { step: 4, total: TOTAL_STEPS })}</Text>
      <Text style={styles.heroEmoji}>💸</Text>
      <Text style={styles.stepTitle}>{t("onboarding.welcome.title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.welcome.subtitle")}</Text>

      {/* Scrollable so the five-tab overview + privacy note never push the
          buttons off a small screen. */}
      <ScrollView
        style={styles.featureScroll}
        contentContainerStyle={styles.featureList}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⛓️</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.welcome.features.debts.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.welcome.features.debts.desc")}</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>💰</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.welcome.features.budget.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.welcome.features.budget.desc")}</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🧭</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.welcome.features.bridge.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.welcome.features.bridge.desc")}</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📈</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.welcome.features.charts.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.welcome.features.charts.desc")}</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⚙️</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.welcome.features.profile.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.welcome.features.profile.desc")}</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🔒</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.welcome.features.privacy.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.welcome.features.privacy.desc")}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleBack}>
          <Text style={styles.skipBtnText}>{t("onboarding.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.accentButtonText }]}>
            {t("onboarding.next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render the quick-start step: pick a template (or none) and optionally
   * the two numbers it is sized from. Nothing is written until the flow
   * finishes (seedQuickStart), so Back and Skip cost nothing.
   */
  const renderTemplateStep = () => {
    const selected = quickStartTemplateById(templateId);
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepNumber}>{t("onboarding.stepOf", { step: 5, total: TOTAL_STEPS })}</Text>
        <Text style={styles.heroEmoji}>🗺️</Text>
        <Text style={styles.stepTitle}>{t("onboarding.template.title")}</Text>
        <Text style={styles.stepSubtitle}>{t("onboarding.template.subtitle")}</Text>

        <View style={styles.templateList}>
          {QUICK_START_TEMPLATES.map((template) => {
            const isSelected = templateId === template.id;
            return (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                  },
                ]}
                onPress={() => setTemplateId(isSelected ? null : template.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={styles.templateEmoji}>{template.emoji}</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{template.title}</Text>
                  <Text style={styles.templateTagline}>{template.tagline}</Text>
                  {isSelected ? (
                    <Text style={styles.featureDesc}>{template.description}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              styles.templateCard,
              {
                backgroundColor: colors.card,
                borderColor: templateId === null ? colors.accent : colors.cardBorder,
              },
            ]}
            onPress={() => setTemplateId(null)}
            accessibilityRole="radio"
            accessibilityState={{ selected: templateId === null }}
          >
            <Text style={styles.templateEmoji}>📄</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{t("onboarding.template.startEmpty.title")}</Text>
              <Text style={styles.templateTagline}>{t("onboarding.template.startEmpty.tagline")}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {selected ? (
          <View style={styles.templateInputs}>
            <Text style={styles.templateLabel}>{t("onboarding.template.incomeLabel")}</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                },
              ]}
              placeholder={t("onboarding.template.incomePlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={incomeInput}
              onChangeText={setIncomeInput}
              keyboardType="decimal-pad"
              maxLength={12}
            />
            <Text style={styles.templateLabel}>{t("onboarding.template.housingLabel")}</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                },
              ]}
              placeholder={t("onboarding.template.housingPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={housingInput}
              onChangeText={setHousingInput}
              keyboardType="decimal-pad"
              maxLength={12}
            />
            <Text style={styles.nameHint}>{t("onboarding.template.hint")}</Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleBack}>
            <Text style={styles.skipBtnText}>{t("onboarding.back")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.accent }]}
            onPress={handleNext}
          >
            <Text style={[styles.nextBtnText, { color: colors.accentButtonText }]}>
              {selected ? t("onboarding.next") : t("onboarding.template.startEmptyNext")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * Render the reminders step. Tracking reminders are opt-in per device
   * (see trackingReminderSettingsStorage); this is where a new install is
   * asked, instead of leaving the feature to be discovered in Profile.
   * The copy has to be exact about what a notification can contain: never
   * an amount, a balance, or a bill - see CLAUDE.md rule 11.
   */
  const renderRemindersStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>{t("onboarding.stepOf", { step: 6, total: TOTAL_STEPS })}</Text>
      <Text style={styles.heroEmoji}>🔔</Text>
      <Text style={styles.stepTitle}>{t("onboarding.reminders.title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.reminders.subtitle")}</Text>

      <View style={styles.reminderList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📝</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.reminders.checkins.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.reminders.checkins.desc")}</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📅</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t("onboarding.reminders.monthStart.title")}</Text>
            <Text style={styles.featureDesc}>{t("onboarding.reminders.monthStart.desc")}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
        <Text style={styles.privacyTitle}>{t("onboarding.reminders.privacyTitle")}</Text>
        <Text style={styles.privacyText}>{t("onboarding.reminders.privacyText")}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.completeBtn,
          { backgroundColor: colors.accent },
          remindersBusy && styles.btnDisabled,
        ]}
        onPress={() => void handleEnableReminders()}
        disabled={remindersBusy}
      >
        <Text style={[styles.completeBtnText, { color: colors.accentButtonText }]}>
          {remindersBusy ? t("onboarding.reminders.asking") : t("onboarding.reminders.enable")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.completeBtn,
          styles.quietBtn,
          { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 10 },
        ]}
        onPress={handleDeclineReminders}
        disabled={remindersBusy}
      >
        <Text style={[styles.completeBtnText, { color: colors.text }]}>
          {t("onboarding.reminders.notNow")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtnFull} onPress={handleBack} disabled={remindersBusy}>
        <Text style={styles.skipBtnText}>{t("onboarding.back")}</Text>
      </TouchableOpacity>
    </View>
  );

  /** Render display name step */
  const renderNameStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>{t("onboarding.stepOf", { step: 7, total: TOTAL_STEPS })}</Text>
      <Text style={styles.heroEmoji}>⚓</Text>
      <Text style={styles.stepTitle}>{t("onboarding.name.title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.name.subtitle")}</Text>

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
          placeholder={t("onboarding.name.placeholder")}
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={(text) => setDisplayName(sanitizeTextInput(text))}
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Text style={styles.nameHint}>{t("onboarding.name.hint")}</Text>
      </View>

      <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
        <Text style={styles.privacyTitle}>{t("onboarding.name.privacyTitle")}</Text>
        <Text style={styles.privacyText}>{t("onboarding.name.privacyText")}</Text>
      </View>

      <View style={[styles.arkCard, { backgroundColor: colors.card }]}> 
        <Text style={styles.arkTitle}>{t("onboarding.name.arkTitle")}</Text>
        <Text style={styles.arkText}>{t("onboarding.name.arkText")}</Text>
      </View>

      <View style={[styles.tourCard, { backgroundColor: colors.card }]}>
        <Text style={styles.arkTitle}>
          {t("onboarding.name.tourTitle", { total: tourTipCount })}
        </Text>
        <View style={styles.tourChoiceRow} accessibilityRole="radiogroup">
          {[true, false].map((choice) => {
            const selected = wantsTour === choice;
            return (
              <TouchableOpacity
                key={choice ? "on" : "off"}
                style={[
                  styles.tourChoice,
                  {
                    borderColor: selected ? colors.accent : colors.cardBorder,
                    backgroundColor: selected ? `${colors.accent}22` : "transparent",
                  },
                ]}
                onPress={() => setWantsTour(choice)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.tourChoiceText,
                    { color: selected ? colors.text : colors.textDim },
                  ]}
                >
                  {t(choice ? "onboarding.name.tourOn" : "onboarding.name.tourOff")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.tourHint}>
          {t(wantsTour ? "onboarding.name.tourHint" : "onboarding.name.tourHintOff")}
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
          {t("onboarding.name.finishBuildArk")}
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
          {t("onboarding.name.skipForNow")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtnFull} onPress={handleBack}>
        <Text style={styles.skipBtnText}>{t("onboarding.back")}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : undefined}
        style={styles.screen}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          onScroll={onKeyboardInputScroll}
          scrollEventThrottle={16}
        >
          {step === "language" && renderLanguageStep()}
          {step === "mission" && renderMissionStep()}
          {step === "theme" && renderThemeStep()}
          {step === "welcome" && renderWelcomeStep()}
          {step === "template" && renderTemplateStep()}
          {step === "reminders" && renderRemindersStep()}
          {step === "name" && renderNameStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

/**
 * Style factory function - creates styles based on current theme colors
 * Memoization happens at call site to prevent recreation on every render
 */
const makeStyles = (colors: ThemePreset["colors"], tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: tokens.padLg,
      paddingTop: 60,
      paddingBottom: 40,
    },
    stepContainer: {
      flex: 1,
      alignItems: "center",
    },
    stepNumber: {
      fontSize: scale(11),
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    stepTitle: {
      fontSize: scale(28),
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: scale(15),
      color: colors.textDim,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
      paddingHorizontal: tokens.pad,
    },
    heroEmoji: {
      fontSize: scale(64),
      marginBottom: 16,
    },

    /* Mission step */
    missionEyebrow: {
      fontSize: scale(11),
      fontWeight: "700",
      color: colors.accent,
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    missionScrollContent: {
      paddingBottom: 20,
      gap: tokens.gap,
    },
    missionCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.padLg,
      width: "100%",
    },
    missionBody: {
      fontSize: scale(16),
      lineHeight: scale(25),
      color: colors.text,
    },
    missionInvite: {
      marginTop: 14,
    },
    missionFootnote: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
      textAlign: "center",
      paddingHorizontal: tokens.pad,
    },

    /* Language step */
    languageCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      minHeight: 56,
      borderWidth: 2,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: 10,
    },
    languageName: {
      fontSize: scale(17),
      fontWeight: "600",
      color: colors.text,
    },
    languageSecondary: {
      fontSize: scale(13),
      color: colors.textDim,
      marginTop: 2,
    },
    languageCheck: {
      fontSize: scale(18),
      fontWeight: "700",
    },

    /* Theme selection */
    themeGrid: {
      flex: 1,
      width: "100%",
    },
    themeGridContent: {
      gap: tokens.gapSm,
      paddingBottom: 20,
    },
    themeCard: {
      backgroundColor: colors.card,
      borderWidth: 2,
      borderRadius: tokens.radius,
      padding: tokens.padLg,
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
      fontSize: scale(18),
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
    featureScroll: {
      flex: 1,
      width: "100%",
      marginBottom: 16,
    },
    featureList: {
      width: "100%",
      gap: 16,
      paddingBottom: 8,
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
      fontSize: scale(17),
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    featureDesc: {
      fontSize: scale(14),
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
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: 14,
      fontSize: scale(16),
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
      borderRadius: tokens.radiusSm,
      padding: tokens.padLg,
      marginBottom: 32,
      width: "100%",
    },
    /* Template step */
    templateList: {
      width: "100%",
      gap: 10,
      marginBottom: 20,
    },
    templateCard: {
      flexDirection: "row",
      gap: 14,
      alignItems: "flex-start",
      borderWidth: 2,
      borderRadius: tokens.radiusSm,
      padding: tokens.pad,
    },
    templateEmoji: {
      fontSize: 28,
    },
    templateTagline: {
      fontSize: scale(13),
      color: colors.textDim,
      marginTop: 2,
      marginBottom: 4,
    },
    templateInputs: {
      width: "100%",
      marginBottom: 20,
    },
    templateLabel: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 6,
    },
    /* Reminders step */
    reminderList: {
      width: "100%",
      gap: 14,
      marginBottom: 24,
    },
    quietBtn: {
      borderWidth: 1,
    },
    btnDisabled: {
      opacity: 0.6,
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
      borderRadius: tokens.radiusSm,
      padding: tokens.pad + 2,
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
    backBtnFull: {
      width: "100%",
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
      marginTop: 10,
    },
    tourCard: {
      borderRadius: tokens.radiusSm,
      padding: tokens.pad + 2,
      marginBottom: 20,
      width: "100%",
    },
    tourChoiceRow: {
      flexDirection: "row",
      gap: tokens.gap,
      marginTop: 4,
    },
    tourChoice: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: tokens.radiusSm,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    tourChoiceText: {
      fontSize: scale(14),
      fontWeight: "600",
      textAlign: "center",
    },
    tourHint: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginTop: 10,
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
      fontSize: scale(16),
      fontWeight: "700",
    },
  });
};

export default OnboardingScreen;
