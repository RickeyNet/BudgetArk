/**
 * BudgetArk - Appearance Section
 * File: src/screens/profile/AppearanceSection.tsx
 *
 * The APPEARANCE card (theme, design style, ambient backgrounds, layout
 * density, text size) and its four OptionPickerModal pickers. The theme
 * picker's visibility stays in ProfileScreen because the feature spotlight
 * deep link (openSection: "theme") opens it from there; the other pickers
 * are local. Also registers the coachmark anchor for the appearance card.
 */

import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, type ScrollView } from "react-native";
import OptionPickerModal from "../../components/OptionPickerModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { useTheme } from "../../theme/ThemeProvider";
import { useBackgroundEffects } from "../../theme/BackgroundEffectsProvider";
import { useSurfaceStyle } from "../../theme/SurfaceStyleProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useCoachmarkAnchor } from "../../onboarding/CoachmarkAnchorContext";
import { useProfileStyles } from "./profileStyles";

type AppearanceSectionProps = {
  scrollRef: React.RefObject<ScrollView | null>;
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showThemeModal: boolean;
  onOpenThemeModal: () => void;
  onCloseThemeModal: () => void;
};

const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  scrollRef,
  newFeatureIds,
  onDismissNewBadge,
  showThemeModal,
  onOpenThemeModal,
  onCloseThemeModal,
}) => {
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

  return (
    <>
      {/* ── Appearance (Theme + Currency) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          APPEARANCE
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
                  Theme
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
                Design Style
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {currentSurfaceStyle?.name || "Solid"}
                {storedSurfaceStyleId == null &&
                (themeId === "deep_space" || themeId === "deep_sea")
                  ? " · theme default"
                  : ""}
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
                Ambient Backgrounds
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {backgroundEffectsEnabled
                  ? "Decorative themed backgrounds are enabled"
                  : "Plain backgrounds for reduced visual noise"}
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
              {backgroundEffectsEnabled ? "On" : "Off"}
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
                Layout Density
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {currentDensity?.name || "Comfortable"}
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
            accessibilityLabel={`Text Size, currently ${currentTextSize?.name || "Default"}`}
            accessibilityHint="Opens text size options for the whole app"
          >
            <View>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Text Size
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {currentTextSize?.name || "Default"}
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
        title="Choose Theme"
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
        title="Design Style"
        options={surfaceStylePresets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => surfaceStyleId === preset.id}
        onSelect={(preset) => handleSurfaceStyleSelect(preset.id)}
        onClose={() => setShowSurfaceStyleModal(false)}
        accessibilityLabelOf={(preset) => `${preset.name}. ${preset.description}`}
        header={
          storedSurfaceStyleId == null &&
          (themeId === "deep_space" || themeId === "deep_sea") ? (
            <Text
              style={[
                styles.settingsRowSubtext,
                { color: colors.textDim, marginBottom: 12 },
              ]}
            >
              {themeId === "deep_sea" ? "Deep Sea" : "Deep Space"} currently
              defaults to Glass. Pick a style here to keep it across all
              themes.
            </Text>
          ) : null
        }
        renderOption={(preset) => (
          <View style={{ flex: 1 }}>
            <Text style={[styles.themeOptionText, { color: colors.text }]}>
              {preset.name}
            </Text>
            <Text
              style={[
                styles.settingsRowSubtext,
                { color: colors.textDim, marginTop: 4 },
              ]}
            >
              {preset.description}
            </Text>
          </View>
        )}
      />

      {/* ── Density Selection Modal ── */}
      <OptionPickerModal
        visible={showDensityModal}
        title="Layout Density"
        options={densityPresets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => densityId === preset.id}
        onSelect={(preset) => handleDensitySelect(preset.id)}
        onClose={() => setShowDensityModal(false)}
        accessibilityLabelOf={(preset) => `${preset.name}. ${preset.description}`}
        renderOption={(preset) => (
          <View style={{ flex: 1 }}>
            <Text style={[styles.themeOptionText, { color: colors.text }]}>
              {preset.name}
            </Text>
            <Text
              style={[
                styles.settingsRowSubtext,
                { color: colors.textDim, marginTop: 4 },
              ]}
            >
              {preset.description}
            </Text>
          </View>
        )}
      />

      {/* ── Text Size Selection Modal ── */}
      <OptionPickerModal
        visible={showTextSizeModal}
        title="Text Size"
        options={textSizePresets}
        keyOf={(preset) => preset.id}
        isSelected={(preset) => textSizeId === preset.id}
        onSelect={(preset) => handleTextSizeSelect(preset.id)}
        onClose={() => setShowTextSizeModal(false)}
        accessibilityLabelOf={(preset) => `${preset.name}. ${preset.description}`}
        renderOption={(preset) => (
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
              {preset.name}
            </Text>
            <Text
              style={[
                styles.settingsRowSubtext,
                { color: colors.textDim, marginTop: 4 },
              ]}
            >
              {preset.description}
            </Text>
          </View>
        )}
      />
    </>
  );
};

export default AppearanceSection;
