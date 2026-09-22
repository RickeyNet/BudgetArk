/**
 * BudgetArk - Appearance Section
 * File: src/screens/profile/AppearanceSection.tsx
 *
 * The APPEARANCE card (theme, design style, ambient backgrounds, layout
 * density, text size) and its OptionPickerModal pickers. The
 * theme picker's visibility stays in ProfileScreen because the feature
 * spotlight deep link (openSection: "theme") opens it from there; the other
 * pickers are local. Also registers the coachmark anchor for the appearance
 * card.
 *
 * Preset names/descriptions are looked up by preset ID in the locale tree
 * (appearance.<axis>.presets.<id>) so they translate; the English `name`
 * on the preset object is the fallback for an id the tree doesn't know.
 * Theme names are proper nouns and render untranslated.
 */

import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, type ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import OptionPickerModal from "../../components/OptionPickerModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { useTheme } from "../../theme/ThemeProvider";
import { useBackgroundEffects } from "../../theme/BackgroundEffectsProvider";
import { useSurfaceStyle } from "../../theme/SurfaceStyleProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useCoachmarkAnchor } from "../../onboarding/CoachmarkAnchorContext";
import { en } from "../../i18n/locales/en";
import { useProfileStyles } from "./profileStyles";

type AppearanceSectionProps = {
  scrollRef: React.RefObject<ScrollView | null>;
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showThemeModal: boolean;
  onOpenThemeModal: () => void;
  onCloseThemeModal: () => void;
};

type PresetAxis = "surfaceStyle" | "density" | "textSize";
type PresetIdOf<A extends PresetAxis> = keyof (typeof en)["appearance"][A]["presets"];

const isKnownPresetId = <A extends PresetAxis>(axis: A, id: string): id is PresetIdOf<A> & string =>
  Object.prototype.hasOwnProperty.call(en.appearance[axis].presets, id);

const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  scrollRef,
  newFeatureIds,
  onDismissNewBadge,
  showThemeModal,
  onOpenThemeModal,
  onCloseThemeModal,
}) => {
  const { t } = useTranslation();
  const { colors, presets, themeId, surfaceStyleId, setThemeId } = useTheme();
  const { backgroundEffectsEnabled, setBackgroundEffectsEnabled } =
    useBackgroundEffects();
  const {
    surfaceStyleId: storedSurfaceStyleId,
    presets: surfaceStylePresets,
    setSurfaceStyleId,
  } = useSurfaceStyle();
  const {
    densityId,
    tokens,
    presets: densityPresets,
    setDensityId,
    textSizeId,
    textSizePresets,
    setTextSizeId,
  } = useDensity();
  const styles = useProfileStyles(tokens, colors);
  const anchorAppearance = useCoachmarkAnchor("profile-appearance-card", {
    scrollRef,
  });

  const [showSurfaceStyleModal, setShowSurfaceStyleModal] = useState(false);
  const [showDensityModal, setShowDensityModal] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);

  /** Translated preset name/description, English preset text as fallback. */
  const presetText = useCallback(
    <A extends PresetAxis>(
      axis: A,
      preset: { id: string; name: string; description: string },
    ): { name: string; description: string } => {
      if (!isKnownPresetId(axis, preset.id)) return preset;
      // Cast: the id is proven to be a key of this axis's preset table, but
      // i18next's key typing can't follow a generic axis + id through a
      // template literal.
      const base = `appearance.${axis}.presets.${preset.id}` as "appearance.density.presets.compact";
      return { name: t(`${base}.name`), description: t(`${base}.description`) };
    },
    [t],
  );

  /**
   * Handle theme selection
   */
  const handleThemeSelect = useCallback(
    async (id: string) => {
      await setThemeId(id);
    },
    [setThemeId],
  );

  const handleSurfaceStyleSelect = useCallback(
    async (id: "solid" | "glass") => {
      await setSurfaceStyleId(id);
    },
    [setSurfaceStyleId],
  );

  const handleToggleBackgroundEffects = useCallback(async () => {
    await setBackgroundEffectsEnabled(!backgroundEffectsEnabled);
  }, [backgroundEffectsEnabled, setBackgroundEffectsEnabled]);

  const handleDensitySelect = useCallback(
    async (id: string) => {
      await setDensityId(id);
    },
    [setDensityId],
  );

  const handleTextSizeSelect = useCallback(
    async (id: string) => {
      await setTextSizeId(id);
    },
    [setTextSizeId],
  );

  /** Get current theme display name */
  const currentTheme = presets.find((p) => p.id === themeId);
  const currentSurfaceStyle = surfaceStylePresets.find(
    (p) => p.id === surfaceStyleId,
  );
  const currentDensity = densityPresets.find((p) => p.id === densityId);
  const currentTextSize = textSizePresets.find((p) => p.id === textSizeId);

  const surfaceStyleName = currentSurfaceStyle
    ? presetText("surfaceStyle", currentSurfaceStyle).name
    : t("appearance.surfaceStyle.presets.solid.name");
  const densityName = currentDensity
    ? presetText("density", currentDensity).name
    : t("appearance.density.presets.comfortable.name");
  const textSizeName = currentTextSize
    ? presetText("textSize", currentTextSize).name
    : t("appearance.textSize.presets.default.name");
  const glassDefaultTheme =
    storedSurfaceStyleId == null &&
    (themeId === "deep_space" || themeId === "deep_sea")
      ? themeId === "deep_sea"
        ? "Deep Sea"
        : "Deep Space"
      : null;

  return (
    <>
      {/* ── Appearance (Theme + Currency) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("appearance.sectionTitle")}
        </Text>

        <View
          ref={anchorAppearance}
          collapsable={false}
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              onDismissNewBadge("deep-sea-theme");
              onOpenThemeModal();
            }}
          >
            <View>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("appearance.theme.label")}
                </Text>
                {newFeatureIds.has("deep-sea-theme") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {currentTheme?.name || "Forest Gold"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowSurfaceStyleModal(true)}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("appearance.surfaceStyle.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {surfaceStyleName}
                {glassDefaultTheme ? t("appearance.surfaceStyle.themeDefaultSuffix") : ""}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={handleToggleBackgroundEffects}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("appearance.backgroundEffects.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {backgroundEffectsEnabled
                  ? t("appearance.backgroundEffects.enabled")
                  : t("appearance.backgroundEffects.disabled")}
              </Text>
            </View>
            <Text
              style={[
                styles.settingsRowArrow,
                {
                  color: backgroundEffectsEnabled
                    ? colors.accent
                    : colors.textDim,
                },
              ]}
            >
              {backgroundEffectsEnabled ? t("common.on") : t("common.off")}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowDensityModal(true)}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("appearance.density.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {densityName}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowTextSizeModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t("appearance.textSize.a11yLabel", { current: textSizeName })}
            accessibilityHint={t("appearance.textSize.a11yHint")}
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("appearance.textSize.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {textSizeName}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* ── Theme Selection Modal ── */}
      <OptionPickerModal
        visible={showThemeModal}
        title={t("appearance.theme.pickerTitle")}
        options={presets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => themeId === preset.id}
        onSelect={(preset) => handleThemeSelect(preset.id)}
        onClose={onCloseThemeModal}
        accessibilityLabelOf={(preset) => preset.name}
        rowStyle={(preset, selected) => ({
          borderColor: selected ? preset.colors.accent : colors.cardBorder,
          backgroundColor: preset.colors.card,
        })}
        checkColors={(preset) => ({
          background: preset.colors.accent,
          text: preset.colors.white,
        })}
        renderOption={(preset) => (
          <>
            <View style={styles.themeColorRow}>
              <View
                style={[
                  styles.themeSwatch,
                  { backgroundColor: preset.colors.accent },
                ]}
              />
              <View
                style={[
                  styles.themeSwatch,
                  { backgroundColor: preset.colors.success },
                ]}
              />
              <View
                style={[
                  styles.themeSwatch,
                  { backgroundColor: preset.colors.text },
                ]}
              />
            </View>
            <Text
              style={[styles.themeOptionText, { color: preset.colors.text }]}
            >
              {preset.name}
            </Text>
          </>
        )}
      />

      {/* ── Design Style Selection Modal ── */}
      <OptionPickerModal
        visible={showSurfaceStyleModal}
        title={t("appearance.surfaceStyle.pickerTitle")}
        options={surfaceStylePresets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => surfaceStyleId === preset.id}
        onSelect={(preset) => handleSurfaceStyleSelect(preset.id)}
        onClose={() => setShowSurfaceStyleModal(false)}
        accessibilityLabelOf={(preset) => {
          const text = presetText("surfaceStyle", preset);
          return `${text.name}. ${text.description}`;
        }}
        header={
          glassDefaultTheme ? (
            <Text
              style={[
                styles.settingsRowSubtext,
                { color: colors.textDim, marginBottom: 12 },
              ]}
            >
              {t("appearance.surfaceStyle.themeDefaultNote", { theme: glassDefaultTheme })}
            </Text>
          ) : null
        }
        renderOption={(preset) => {
          const text = presetText("surfaceStyle", preset);
          return (
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionText, { color: colors.text }]}>
                {text.name}
              </Text>
              <Text
                style={[
                  styles.settingsRowSubtext,
                  { color: colors.textDim, marginTop: 4 },
                ]}
              >
                {text.description}
              </Text>
            </View>
          );
        }}
      />

      {/* ── Density Selection Modal ── */}
      <OptionPickerModal
        visible={showDensityModal}
        title={t("appearance.density.pickerTitle")}
        options={densityPresets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => densityId === preset.id}
        onSelect={(preset) => handleDensitySelect(preset.id)}
        onClose={() => setShowDensityModal(false)}
        accessibilityLabelOf={(preset) => {
          const text = presetText("density", preset);
          return `${text.name}. ${text.description}`;
        }}
        renderOption={(preset) => {
          const text = presetText("density", preset);
          return (
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionText, { color: colors.text }]}>
                {text.name}
              </Text>
              <Text
                style={[
                  styles.settingsRowSubtext,
                  { color: colors.textDim, marginTop: 4 },
                ]}
              >
                {text.description}
              </Text>
            </View>
          );
        }}
      />

      {/* ── Text Size Selection Modal ── */}
      <OptionPickerModal
        visible={showTextSizeModal}
        title={t("appearance.textSize.pickerTitle")}
        options={textSizePresets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => textSizeId === preset.id}
        onSelect={(preset) => handleTextSizeSelect(preset.id)}
        onClose={() => setShowTextSizeModal(false)}
        accessibilityLabelOf={(preset) => {
          const text = presetText("textSize", preset);
          return `${text.name}. ${text.description}`;
        }}
        renderOption={(preset) => {
          const text = presetText("textSize", preset);
          return (
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.themeOptionText,
                  {
                    color: colors.text,
                    // Preview the size right in its own row.
                    fontSize: Math.round(16 * preset.multiplier),
                  },
                ]}
              >
                {text.name}
              </Text>
              <Text
                style={[
                  styles.settingsRowSubtext,
                  { color: colors.textDim, marginTop: 4 },
                ]}
              >
                {text.description}
              </Text>
            </View>
          );
        }}
      />

    </>
  );
};

export default AppearanceSection;
