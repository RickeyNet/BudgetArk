/**
 * BudgetArk - Tip Jar Section
 * File: src/screens/profile/TipJarSection.tsx
 *
 * A one-row, header-less card right under the name card: the Tip Jar. It
 * briefly lived as a row of the HELP card during the Profile-tab merges;
 * the user wants it back at the top of the tab, where the old SUPPORT card
 * sat, so this is deliberately its own card near the top rather than a Help
 * row. Send Feedback stayed in Help.
 *
 * The modal's visibility lives in ProfileScreen because the feature
 * spotlight deep link (openSection: "tipJar") opens it from there; this
 * file only renders the row and mounts the sheet on demand.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import TipJarModal from "../../components/TipJarModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type TipJarSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showTipJar: boolean;
  onOpenTipJar: () => void;
  onCloseTipJar: () => void;
};

const TipJarSection: React.FC<TipJarSectionProps> = ({
  newFeatureIds,
  onDismissNewBadge,
  showTipJar,
  onOpenTipJar,
  onCloseTipJar,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  return (
    <>
      <View style={styles.settingsSection}>
        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              triggerHaptic("selection");
              onDismissNewBadge("tip-jar");
              onOpenTipJar();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.tipJar.label")}
          >
            <View style={styles.rowTextWrap}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.info.tipJar.label")}
                </Text>
                {newFeatureIds.has("tip-jar") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.tipJar.description")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tip Jar Modal ── */}
      {/* Mounted on demand: useIAP inside opens the billing connection on
          mount and closes it on unmount. */}
      {showTipJar ? <TipJarModal onClose={onCloseTipJar} /> : null}
    </>
  );
};

export default TipJarSection;
