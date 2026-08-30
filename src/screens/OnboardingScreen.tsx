/**
 * BudgetArk - Onboarding Screen
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

import { MISSION_STATEMENT } from "../data/missionStatement";
import React, { useState, useCallback, useMemo } from "react";
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import { ThemePreset } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import { completeOnboarding } from "../storage/userStorage";

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
 * Onboarding step enum for type safety. "mission" comes first on purpose:
 * before a single choice is asked of them, the user hears why the app
 * exists and what it promises (free, private, offline) - the same copy as
 * the Profile mission card, so the two never drift.
 */
type OnboardingStep = "mission" | "theme" | "welcome" | "template" | "reminders" | "name";

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

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors, presets, themeId, setThemeId } = useTheme();
  const { tokens } = useDensity();
  const [step, setStep] = useState<OnboardingStep>("mission");
  const [displayName, setDisplayName] = useState("");
  /** Guards the reminders step's button through the OS permission prompt. */
  const [remindersBusy, setRemindersBusy] = useState(false);
  /** Quick-start template (data/quickStartTemplates); null = start empty. */
  const [templateId, setTemplateId] = useState<QuickStartTemplateId | null>(null);
  const [incomeInput, setIncomeInput] = useState("");
  const [housingInput, setHousingInput] = useState("");

  /** Memoized styles based on current theme */
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);

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
    if (step === "mission") {
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
    if (step === "theme") {
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
          "Notifications are off",
          "Reminders stay off until notifications are allowed for BudgetArk " +
            "in your phone's Settings. You can turn them on any time from " +
            "Profile → Tracking Reminders."
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
  }, [remindersBusy]);

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
    async (name?: string, options?: { openArkSetup?: boolean }) => {
      const attempt = async (): Promise<void> => {
        try {
          await completeOnboarding(name);
        } catch (error) {
          if (__DEV__) console.error("Failed to save onboarding:", error);
          Alert.alert(
            "Couldn't Save Your Setup",
            "Your setup couldn't be saved to this device. This usually happens " +
              "when the phone is very low on free storage. Free up some space " +
              "and try again, or continue anyway - the app may ask you to set " +
              "up again next time it opens.",
            [
              { text: "Try Again", onPress: () => void attempt() },
              {
                text: "Continue Anyway",
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
            "Template not applied",
            "Your setup is saved, but the starter limits couldn't be written. " +
              "You can set limits any time from the Budget tab's Limits sheet."
          );
        }
        onComplete(options);
      };
      await attempt();
    },
    [onComplete, seedQuickStart]
  );

  /**
   * Complete onboarding and mark as done
   */
  const handleComplete = useCallback(
    (openArkSetup?: boolean) =>
      finishOnboarding(displayName, { openArkSetup: !!openArkSetup }),
    [displayName, finishOnboarding]
  );

  /**
   * Skip to the end (keeps current theme, default name)
   */
  const handleSkip = useCallback(() => finishOnboarding(), [finishOnboarding]);

  /** Render the mission step - why BudgetArk exists, before any setup. */
  const renderMissionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>STEP 1 OF 6</Text>
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
        <Text style={styles.missionFootnote}>
          Free, no ads, no account, and your data never leaves your phone.
          You can reread this anytime at the top of the Profile tab.
        </Text>
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

  /** Render theme selection step */
  const renderThemeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>STEP 2 OF 6</Text>
      <Text style={styles.heroEmoji}>🎨</Text>
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
      <Text style={styles.stepNumber}>STEP 3 OF 6</Text>
      <Text style={styles.heroEmoji}>💸</Text>
      <Text style={styles.stepTitle}>Welcome to BudgetArk</Text>
      <Text style={styles.stepSubtitle}>
        Your personal finance companion for tracking debt, managing budgets, and
        building wealth.
      </Text>

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
            <Text style={styles.featureTitle}>Debts</Text>
            <Text style={styles.featureDesc}>
              Track every debt, pick a payoff strategy, follow the Build Your
              Ark milestones - and keep idle credit cards from being closed
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>💰</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Budget</Text>
            <Text style={styles.featureDesc}>
              Log income and spending by category, set limits, automate
              recurring bills, and approve bank imports from the Review Inbox
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🧭</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Bridge</Text>
            <Text style={styles.featureDesc}>
              Your home tab: net worth over time, every account you own,
              purchase plans, and optional live stock tracking
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📈</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Charts</Text>
            <Text style={styles.featureDesc}>
              A free 24-lesson finance course, calculators, and what-if
              projections built from your own numbers
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⚙️</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Profile</Text>
            <Text style={styles.featureDesc}>
              Themes, bank connections, partner sync, backups - and the
              searchable onboarding guide whenever you need it
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🔒</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Private by design</Text>
            <Text style={styles.featureDesc}>
              Everything is encrypted on this phone. BudgetArk has no server -
              your financial data never leaves your device
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleBack}>
          <Text style={styles.skipBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip</Text>
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

  /**
   * Render the quick-start step: pick a template (or none) and optionally
   * the two numbers it is sized from. Nothing is written until the flow
   * finishes (seedQuickStart), so Back and Skip cost nothing.
   */
  const renderTemplateStep = () => {
    const selected = quickStartTemplateById(templateId);
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepNumber}>STEP 4 OF 6</Text>
        <Text style={styles.heroEmoji}>🗺️</Text>
        <Text style={styles.stepTitle}>Start from a template?</Text>
        <Text style={styles.stepSubtitle}>
          Pick the closest fit and BudgetArk sets category limits and your two
          biggest recurring lines for you. Every number stays editable - it's a
          first draft, not a lock.
        </Text>

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
              <Text style={styles.featureTitle}>Start empty</Text>
              <Text style={styles.templateTagline}>
                No limits or lines - build it as you go
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {selected ? (
          <View style={styles.templateInputs}>
            <Text style={styles.templateLabel}>MONTHLY TAKE-HOME PAY (HOUSEHOLD)</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. 4200"
              placeholderTextColor={colors.textMuted}
              value={incomeInput}
              onChangeText={setIncomeInput}
              keyboardType="decimal-pad"
              maxLength={12}
            />
            <Text style={styles.templateLabel}>RENT OR MORTGAGE</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. 1400"
              placeholderTextColor={colors.textMuted}
              value={housingInput}
              onChangeText={setHousingInput}
              keyboardType="decimal-pad"
              maxLength={12}
            />
            <Text style={styles.nameHint}>
              Both optional. Limits are set as a share of take-home pay; leave
              it blank and you can fill them in later from the Budget tab's
              Limits sheet. Stored only on this phone.
            </Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleBack}>
            <Text style={styles.skipBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.accent }]}
            onPress={handleNext}
          >
            <Text style={[styles.nextBtnText, { color: colors.white }]}>
              {selected ? "Next →" : "Start empty →"}
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
      <Text style={styles.stepNumber}>STEP 5 OF 6</Text>
      <Text style={styles.heroEmoji}>🔔</Text>
      <Text style={styles.stepTitle}>Want a nudge to keep tracking?</Text>
      <Text style={styles.stepSubtitle}>
        Budgets work when the logging habit sticks. BudgetArk can send two
        kinds of gentle reminders - and nothing else.
      </Text>

      <View style={styles.reminderList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📝</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Check-ins when you go quiet</Text>
            <Text style={styles.featureDesc}>
              A short "how's the week going?" if a few days pass without an
              entry. Log regularly and you never hear from it.
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📅</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>A heads-up on the 1st</Text>
            <Text style={styles.featureDesc}>
              One note at the start of each month to set goals and glance at
              last month.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
        <Text style={styles.privacyTitle}>🔒 Nothing about your money</Text>
        <Text style={styles.privacyText}>
          Reminders never include an amount, a balance, an account, or a bill
          - just a nudge to open the app. No payment-due alerts; your bank
          does those. Change the time and cadence, or turn them off, any time
          in Profile → Tracking Reminders.
        </Text>
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
          {remindersBusy ? "Asking your phone..." : "Turn on reminders"}
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
          Not now
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtnFull} onPress={handleBack} disabled={remindersBusy}>
        <Text style={styles.skipBtnText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  /** Render display name step */
  const renderNameStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepNumber}>STEP 6 OF 6</Text>
      <Text style={styles.heroEmoji}>⚓</Text>
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
          onChangeText={(text) => setDisplayName(sanitizeTextInput(text))}
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

      <TouchableOpacity style={styles.backBtnFull} onPress={handleBack}>
        <Text style={styles.skipBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.tourHint}>
        Next, onboarding continues with a guided look at each tab - each tip
        has a Learn more with the full detail, and you can go back a step or
        skip at any point. Reread and search all of it later in Profile →
        Help → Onboarding.
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === "mission" && renderMissionStep()}
        {step === "theme" && renderThemeStep()}
        {step === "welcome" && renderWelcomeStep()}
        {step === "template" && renderTemplateStep()}
        {step === "reminders" && renderRemindersStep()}
        {step === "name" && renderNameStep()}
      </ScrollView>
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
    tourHint: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 14,
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
