/**
 * BudgetArk - Lesson Body Renderer
 * File: src/lessons/LessonRenderer.tsx
 *
 * Walks the typed `LessonSection[]` array on a lesson and dispatches each
 * section to its visual component. The discriminated union keeps lesson
 * content tightly bounded - no free-form markdown means no parse surprises
 * and no XSS surface from authored content.
 *
 * Unknown section types fail closed (rendered as nothing) so a future
 * additive section type can ship in lesson data before the renderer is
 * updated without crashing existing lessons.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type {
  BulletListSection,
  CalculatorEmbedSection,
  CalloutSection,
  CalloutTone,
  LessonSection,
  ParagraphSection,
} from "../types";

interface LessonRendererProps {
  sections: readonly LessonSection[];
}

const LessonRenderer: React.FC<LessonRendererProps> = ({ sections }) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = React.useMemo(
    () => makeStyles(colors, tokens),
    [colors, tokens]
  );

  return (
    <View style={styles.container}>
      {sections.map((section, idx) => {
        switch (section.type) {
          case "paragraph":
            return <Paragraph key={idx} section={section} styles={styles} />;
          case "bullet-list":
            return <BulletList key={idx} section={section} styles={styles} />;
          case "callout":
            return (
              <Callout
                key={idx}
                section={section}
                styles={styles}
                colors={colors}
              />
            );
          case "calculator-embed":
            return (
              <CalculatorEmbed key={idx} section={section} styles={styles} />
            );
          default:
            // Forward-compat: unknown section types render as nothing so
            // lesson data can ship a new section variant before the
            // renderer knows about it.
            return null;
        }
      })}
    </View>
  );
};

/* ── Section sub-components ── */

interface SectionStyleProps {
  styles: ReturnType<typeof makeStyles>;
}

const Paragraph: React.FC<
  SectionStyleProps & { section: ParagraphSection }
> = ({ section, styles }) => (
  <Text style={styles.paragraph}>{section.text}</Text>
);

const BulletList: React.FC<
  SectionStyleProps & { section: BulletListSection }
> = ({ section, styles }) => (
  <View style={styles.bulletList}>
    {section.title ? (
      <Text style={styles.bulletListTitle}>{section.title}</Text>
    ) : null}
    {section.items.map((item, idx) => (
      <View key={idx} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

const Callout: React.FC<
  SectionStyleProps & {
    section: CalloutSection;
    colors: ThemeColors;
  }
> = ({ section, styles, colors }) => {
  const toneColor = pickToneColor(section.tone, colors);
  return (
    <View
      style={[
        styles.callout,
        { borderLeftColor: toneColor, backgroundColor: `${toneColor}14` },
      ]}
    >
      {section.title ? (
        <Text style={[styles.calloutTitle, { color: toneColor }]}>
          {section.title}
        </Text>
      ) : null}
      <Text style={styles.calloutText}>{section.text}</Text>
    </View>
  );
};

/**
 * Inline calculator embed. v1 placeholder: shows a labelled card pointing
 * the reader at the matching tool in the TOOLS section of the Charts tab.
 * A future pass can swap this for an actual inline calculator view.
 */
const CalculatorEmbed: React.FC<
  SectionStyleProps & { section: CalculatorEmbedSection }
> = ({ section, styles }) => {
  const label = CALCULATOR_LABELS[section.calc] ?? "Calculator";
  return (
    <View style={styles.calcEmbed}>
      <Text style={styles.calcEmbedEyebrow}>TRY IT</Text>
      <Text style={styles.calcEmbedLabel}>{label}</Text>
      <Text style={styles.calcEmbedHint}>
        Open the matching tool under TOOLS on the Charts tab.
      </Text>
    </View>
  );
};

const CALCULATOR_LABELS: Record<string, string> = {
  "loan-amortization": "Loan / Mortgage Calculator",
  "compound-interest": "Compound Interest Calculator",
  "refinance-break-even": "Refinance Break-Even Calculator",
  "emergency-fund": "Emergency Fund Calculator",
  "payoff-comparison": "Debt Payoff Strategy",
};

const pickToneColor = (tone: CalloutTone, colors: ThemeColors): string => {
  switch (tone) {
    case "warn":
      return colors.warning;
    case "success":
      return colors.success;
    case "info":
    default:
      return colors.accent;
  }
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    container: {
      gap: tokens.gap,
    },
    paragraph: {
      fontSize: scale(15),
      lineHeight: scale(22),
      color: colors.text,
    },
    bulletList: {
      gap: 6,
    },
    bulletListTitle: {
      fontSize: scale(14),
      fontWeight: "700",
      color: colors.accent,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    bulletDot: {
      fontSize: scale(15),
      color: colors.accent,
      lineHeight: scale(22),
      width: 12,
      textAlign: "center",
    },
    bulletText: {
      flex: 1,
      fontSize: scale(15),
      lineHeight: scale(22),
      color: colors.text,
    },
    callout: {
      borderLeftWidth: 3,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
      gap: 4,
    },
    calloutTitle: {
      fontSize: scale(12),
      fontWeight: "700",
      letterSpacing: 1.2,
    },
    calloutText: {
      fontSize: scale(14),
      lineHeight: scale(20),
      color: colors.text,
    },
    calcEmbed: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: `${colors.accent}40`,
      borderRadius: tokens.radius,
      padding: tokens.pad,
      gap: 4,
    },
    calcEmbedEyebrow: {
      fontSize: scale(11),
      color: colors.accent,
      letterSpacing: 1.5,
      fontWeight: "700",
    },
    calcEmbedLabel: {
      fontSize: scale(15),
      fontWeight: "700",
      color: colors.text,
    },
    calcEmbedHint: {
      fontSize: scale(12),
      color: colors.textMuted,
    },
  });
};

export default LessonRenderer;
