/**
 * BudgetArk - Lesson Resource Card
 * File: src/lessons/ResourceCard.tsx
 *
 * Renders a single `LessonResource` (youtube / book / article / tool) as
 * the "Go deeper" cards at the bottom of a lesson.
 *
 * v1 affiliate posture: book cards never expose an Amazon CTA. The
 * `amazonUrl` and `affiliate` fields on `BookResource` stay optional in the
 * type, but rendering reads `showAffiliateLinks` on `LearningProgress`
 * (default `false`) AND requires a populated `amazonUrl` before any
 * affiliate-style button can appear. Until both light up, book cards are
 * info-only.
 */

import React, { useCallback } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";
import type { LessonResource } from "../types";

interface ResourceCardProps {
  resource: LessonResource;
  /** When true, book cards may show their Amazon link. v1 default: false. */
  showAffiliateLinks?: boolean;
  /** Invoked when an in-app tool resource is tapped. */
  onOpenTool?: (route: string) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  showAffiliateLinks = false,
  onOpenTool,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = React.useMemo(
    () => makeStyles(colors, tokens),
    [colors, tokens]
  );

  const handleExternalUrl = useCallback(async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("URL not openable");
      await Linking.openURL(url);
    } catch (err) {
      if (__DEV__) console.warn("[ResourceCard] open url failed", err);
      Alert.alert(
        "Couldn't open link",
        "Your device doesn't have an app that can open that link."
      );
    }
  }, []);

  switch (resource.type) {
    case "youtube":
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleExternalUrl(resource.url)}
          activeOpacity={0.7}
        >
          <View style={styles.iconBubbleYoutube}>
            <Text style={styles.iconBubbleGlyph}>▶</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>
            <Text style={styles.subtitle}>
              {resource.channel}
              {resource.duration ? ` · ${resource.duration}` : ""}
            </Text>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </TouchableOpacity>
      );

    case "book": {
      const canShowAmazon =
        showAffiliateLinks && !!resource.amazonUrl && !!resource.affiliate;
      const onPress = canShowAmazon
        ? () => handleExternalUrl(resource.amazonUrl!)
        : undefined;
      const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;
      return (
        <Wrapper
          style={styles.card}
          {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
        >
          <View style={styles.iconBubbleBook}>
            <Text style={styles.iconBubbleGlyph}>📕</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>
            <Text style={styles.subtitle}>{resource.author}</Text>
          </View>
          {canShowAmazon ? (
            <Text style={styles.chevron}>↗</Text>
          ) : null}
        </Wrapper>
      );
    }

    case "article":
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleExternalUrl(resource.url)}
          activeOpacity={0.7}
        >
          <View style={styles.iconBubbleArticle}>
            <Text style={styles.iconBubbleGlyph}>📄</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>
            <Text style={styles.subtitle}>{resource.source}</Text>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </TouchableOpacity>
      );

    case "tool":
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onOpenTool?.(resource.route)}
          activeOpacity={0.7}
        >
          <View style={styles.iconBubbleTool}>
            <Text style={styles.iconBubbleGlyph}>🛠️</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>
            <Text style={styles.subtitle}>Open in this app</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      );

    default:
      return null;
  }
};

const makeStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: tokens.radius,
      paddingVertical: tokens.padSm,
      paddingHorizontal: tokens.pad,
      gap: 10,
    },
    iconBubbleYoutube: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "#FF000022",
      alignItems: "center",
      justifyContent: "center",
    },
    iconBubbleBook: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${colors.accent}1A`,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBubbleArticle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.cardBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBubbleTool: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${colors.accent}1A`,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBubbleGlyph: {
      fontSize: scale(16),
    },
    body: {
      flex: 1,
    },
    title: {
      fontSize: scale(14),
      fontWeight: "600",
      color: colors.text,
    },
    subtitle: {
      fontSize: scale(12),
      color: colors.textMuted,
      marginTop: 2,
    },
    chevron: {
      fontSize: scale(16),
      color: colors.textDim,
      fontWeight: "600",
      marginLeft: 4,
    },
  });
};

export default ResourceCard;
