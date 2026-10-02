/**
 * BudgetArk - Feature guide modal.
 *
 * The browsable, searchable directory of every feature on this install:
 * FEATURE_SPOTLIGHTS grouped by the tab each feature lives on, with a
 * keyword search on top. Tapping a feature expands it in place - blurb,
 * where-to-find breadcrumb, numbered how-to steps and the same "Try it"
 * deep link the debut carousel offers. The carousel is the one-shot
 * "something new arrived" moment; this is the random-access reference a
 * user reaches for later (Profile → Help → Feature guide).
 *
 * Expanding in place rather than opening a detail sheet keeps this a
 * single Modal: a second one stacked on top is the iOS silent-present
 * failure family this codebase avoids. Rendered as a slide-up sheet
 * (SheetModal) because the search field needs the keyboard.
 */

import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import SheetModal, { useSheetStyles } from "./SheetModal";
import NewFeatureBadge from "./NewFeatureBadge";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import {
  FEATURE_SPOTLIGHTS,
  getSpotlightGuide,
  selectGuideGroups,
  spotlightArea,
  type FeatureArea,
  type FeatureSpotlight,
} from "../data/featureSpotlights";
import { searchFeatureGuide } from "../utils/featureGuideSearch";
import { sanitizeTextInput } from "../utils/sanitize";
import { triggerHaptic } from "../utils/haptics";

interface FeatureGuideModalProps {
  onClose: () => void;
  /**
   * "Try it" on an expanded feature. The parent owns closing this sheet
   * first, then following the CTA (the modal must finish dismissing before
   * a navigation that may present another Modal).
   */
  onTryFeature: (spotlight: FeatureSpotlight) => void;
  /** Ids still wearing a NEW badge; expanding one acks it via onFeatureOpened. */
  newFeatureIds?: ReadonlySet<string>;
  onFeatureOpened?: (featureId: string) => void;
}

const AREA_EMOJI: Record<FeatureArea, string> = {
  debts: "⛓️",
  budget: "💰",
  bridge: "⚓",
  charts: "📈",
  profile: "👤",
};

const FeatureRow: React.FC<{
  spotlight: FeatureSpotlight;
  expanded: boolean;
  isNew: boolean;
  /** Area eyebrow for search results, where rows are not under a group header. */
  eyebrow?: string;
  onToggle: () => void;
  onTry: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}> = ({ spotlight, expanded, isNew, eyebrow, onToggle, onTry, styles, colors }) => {
  const { t } = useTranslation();
  // Read during render, never memoized: the copy follows the active language.
  const guide = expanded ? getSpotlightGuide(spotlight) : undefined;
  return (
    <View style={styles.resultItem}>
      {eyebrow ? (
        <Text style={[styles.resultTab, { color: colors.accent }]}>{eyebrow}</Text>
      ) : null}
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t("modals.engage.featureGuide.collapseA11y", { title: spotlight.title })
            : t("modals.engage.featureGuide.expandA11y", { title: spotlight.title })
        }
      >
        <Text style={styles.rowIcon}>{spotlight.icon}</Text>
        <Text style={styles.accordionTitle} numberOfLines={expanded ? undefined : 2}>
          {spotlight.title}
        </Text>
        {isNew ? <NewFeatureBadge /> : null}
        <Text style={styles.accordionArrow}>{expanded ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.blurb}>{spotlight.blurb}</Text>
          {guide ? (
            <>
              <Text style={[styles.where, { color: colors.accent }]}>📍 {guide.where}</Text>
              <Text style={styles.howTo}>{t("modals.engage.featureGuide.howTo")}</Text>
              {guide.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{idx + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.newIn}>
              {t("modals.engage.featureGuide.newIn", { version: spotlight.sinceVersion })}
            </Text>
            {spotlight.cta ? (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={onTry}
                accessibilityRole="button"
                accessibilityLabel={spotlight.cta.label}
              >
                <Text style={styles.ctaText}>{spotlight.cta.label}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const FeatureGuideModal: React.FC<FeatureGuideModalProps> = ({
  onClose,
  onTryFeature,
  newFeatureIds,
  onFeatureOpened,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const sheet = useSheetStyles();

  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Only features this store build can run - "Try it" must never land on a
  // surface that is not there yet.
  const groups = useMemo(
    () => selectGuideGroups(FEATURE_SPOTLIGHTS, Updates.runtimeVersion ?? undefined),
    []
  );
  const available = useMemo(
    () => groups.flatMap((group) => group.spotlights),
    [groups]
  );

  const trimmed = query.trim();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t: spotlight copy is translated; re-run the search after a language switch
  const results = useMemo(() => searchFeatureGuide(trimmed, available), [trimmed, available, t]);

  const areaLabel = (area: FeatureArea) =>
    `${AREA_EMOJI[area]} ${t(`modals.engage.featureGuide.areas.${area}`)}`;

  const toggle = (spotlight: FeatureSpotlight) => {
    triggerHaptic("selection");
    const opening = expandedId !== spotlight.id;
    setExpandedId(opening ? spotlight.id : null);
    if (opening) onFeatureOpened?.(spotlight.id);
  };

  const renderRow = (spotlight: FeatureSpotlight, eyebrow?: string) => (
    <FeatureRow
      key={spotlight.id}
      spotlight={spotlight}
      expanded={expandedId === spotlight.id}
      isNew={newFeatureIds?.has(spotlight.id) ?? false}
      eyebrow={eyebrow}
      onToggle={() => toggle(spotlight)}
      onTry={() => {
        triggerHaptic("selection");
        onTryFeature(spotlight);
      }}
      styles={styles}
      colors={colors}
    />
  );

  return (
    <SheetModal
      visible
      onRequestClose={onClose}
      keyboardAvoiding
      footer={
        <TouchableOpacity style={sheet.doneButton} onPress={onClose}>
          <Text style={sheet.doneText}>{t("common.done")}</Text>
        </TouchableOpacity>
      }
    >
      <Text style={sheet.title}>{t("modals.engage.featureGuide.title")}</Text>
      <Text style={sheet.subtitle}>{t("modals.engage.featureGuide.intro")}</Text>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("modals.engage.featureGuide.searchPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(text) => setQuery(sanitizeTextInput(text))}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t("modals.engage.featureGuide.clearSearchA11y")}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {trimmed.length > 0 ? (
        /* ── Search results ── */
        results.length > 0 ? (
          <View style={styles.resultList}>
            {results.map((spotlight) =>
              renderRow(spotlight, areaLabel(spotlightArea(spotlight)).toUpperCase())
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {t("modals.engage.featureGuide.noMatches.title")}
            </Text>
            <Text style={styles.emptyBody}>
              {t("modals.engage.featureGuide.noMatches.body")}
            </Text>
          </View>
        )
      ) : (
        /* ── Browse by tab ── */
        groups.map((group) => (
          <View key={group.area} style={styles.group}>
            <Text style={styles.groupTitle}>{areaLabel(group.area)}</Text>
            <View style={styles.resultList}>
              {group.spotlights.map((spotlight) => renderRow(spotlight))}
            </View>
          </View>
        ))
      )}
    </SheetModal>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    /* Search */
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: tokens.gap,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.padSm,
      paddingVertical: tokens.padSm,
      paddingRight: 38,
      color: colors.text,
      fontSize: scale(15),
    },
    clearBtn: {
      position: "absolute",
      right: tokens.padSm,
    },
    clearBtnText: {
      fontSize: scale(14),
      color: colors.textMuted,
      fontWeight: "600",
    },

    /* Groups */
    group: {
      marginBottom: tokens.gapLg,
    },
    groupTitle: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      textTransform: "uppercase",
      marginBottom: tokens.gapSm,
    },

    /* Rows */
    resultList: {
      gap: tokens.gapSm,
    },
    resultItem: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      backgroundColor: colors.bg,
    },
    resultTab: {
      fontSize: scale(10),
      fontWeight: "700",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    accordionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.gapSm,
      minHeight: tokens.rowHeight - tokens.pad * 2,
    },
    rowIcon: {
      fontSize: scale(20),
    },
    accordionTitle: {
      flex: 1,
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    accordionArrow: {
      fontSize: scale(14),
      color: colors.textDim,
    },

    /* Expanded body */
    body: {
      marginTop: tokens.gap,
      gap: tokens.gapSm,
    },
    blurb: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
    },
    where: {
      fontSize: scale(12),
      fontWeight: "600",
    },
    howTo: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginTop: tokens.gapSm,
    },
    stepRow: {
      flexDirection: "row",
      gap: tokens.gapSm,
    },
    stepNumber: {
      width: scale(18),
      fontSize: scale(13),
      lineHeight: scale(19),
      fontWeight: "700",
      color: colors.text,
    },
    stepText: {
      flex: 1,
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.text,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: tokens.gapSm,
      marginTop: tokens.gapSm,
    },
    newIn: {
      fontSize: scale(11),
      fontWeight: "600",
      color: colors.textMuted,
    },
    ctaButton: {
      backgroundColor: colors.accent,
      borderRadius: tokens.radiusPill,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
    },
    ctaText: {
      color: colors.accentButtonText ?? colors.white,
      fontSize: scale(13),
      fontWeight: "700",
    },

    /* Empty state */
    emptyState: {
      alignItems: "center",
      paddingVertical: tokens.padLg,
      gap: tokens.gapSm,
    },
    emptyTitle: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    emptyBody: {
      fontSize: scale(13),
      lineHeight: scale(19),
      color: colors.textDim,
      textAlign: "center",
    },
  });
};

export default React.memo(FeatureGuideModal);
