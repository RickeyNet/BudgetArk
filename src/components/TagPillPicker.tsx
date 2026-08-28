/**
 * BudgetArk - Tag Pill Picker
 * File: src/components/TagPillPicker.tsx
 *
 * The "which business / which person" pill row: a "none" pill, one pill per
 * option, and - when the stored id no longer matches any option - a single
 * highlighted "(deleted ...)" pill so the assignment stays visible and can
 * be cleared. The Review Inbox, Merchant Rules and Connections modals each
 * carried their own copy (~120 lines twice over); one component keeps the
 * deleted-tag behaviour and the long-name ellipsis rule identical.
 *
 * `value` may be undefined OR null (ExternalAccountLink.personId is
 * nullable); `onChange(undefined)` always means "none".
 */

import React, { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";

export interface TagPillOption {
  id: string;
  name: string;
}

interface TagPillPickerProps {
  options: readonly TagPillOption[];
  value: string | null | undefined;
  onChange: (id: string | undefined) => void;
  /** Label of the "none" pill: "Personal", "Unassigned", "No one". */
  noneLabel: string;
  /** Emoji prefixed to each option ("💼", "👤"); omit for plain names. */
  glyph?: string;
  /** Shown as a lone active pill when `value` matches no option. */
  deletedLabel?: string;
}

const TagPillPicker: React.FC<TagPillPickerProps> = ({
  options,
  value,
  onChange,
  noneLabel,
  glyph,
  deletedLabel,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useMemo(() => makeStyles(colors, tokens), [colors, tokens]);
  const prefix = glyph ? `${glyph} ` : "";
  const selected = value ?? undefined;
  const orphaned =
    selected !== undefined && !options.some((option) => option.id === selected);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.pill, selected === undefined && styles.pillActive]}
        onPress={() => onChange(undefined)}
      >
        <Text style={[styles.text, selected === undefined && styles.textActive]}>
          {noneLabel}
        </Text>
      </TouchableOpacity>
      {options.map((option) => {
        const active = selected === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(option.id)}
          >
            <Text numberOfLines={1} style={[styles.text, active && styles.textActive]}>
              {prefix}
              {option.name}
            </Text>
          </TouchableOpacity>
        );
      })}
      {orphaned && deletedLabel ? (
        <TouchableOpacity
          style={[styles.pill, styles.pillActive]}
          onPress={() => onChange(undefined)}
        >
          <Text style={[styles.text, styles.textActive]}>
            {prefix}
            {deletedLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.gapSm,
    },
    pill: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radiusPill,
      backgroundColor: colors.card,
      paddingHorizontal: tokens.padSm,
      paddingVertical: 7,
      // A long name must cap at the row width and ellipsize - without this
      // a single wide pill pushes the row past the card edge.
      maxWidth: "100%",
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    text: {
      color: colors.textDim,
      fontSize: scale(12),
      fontWeight: "600",
    },
    textActive: {
      color: colors.accentButtonText,
    },
  });
};

export default memo(TagPillPicker);
