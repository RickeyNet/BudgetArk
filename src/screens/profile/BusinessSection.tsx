/**
 * BudgetArk - Business Expenses Section
 * File: src/screens/profile/BusinessSection.tsx
 *
 * The Businesses + Business Expense Report rows and their modals. The manage
 * modal's visibility stays in ProfileScreen because the feature spotlight
 * deep link (openSection: "businesses") opens it from there; the report
 * modal is purely local.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import ManageBusinessesModal from "../../components/ManageBusinessesModal";
import BusinessReportModal from "../../components/BusinessReportModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type BusinessSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  showManageBusinesses: boolean;
  onOpenManageBusinesses: () => void;
  onCloseManageBusinesses: () => void;
};

const BusinessSection: React.FC<BusinessSectionProps> = ({
  newFeatureIds,
  onDismissNewBadge,
  showManageBusinesses,
  onOpenManageBusinesses,
  onCloseManageBusinesses,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const [showBusinessReport, setShowBusinessReport] = useState(false);

  return (
    <>
      {/* ── Business expenses ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("profile.info.business.sectionTitle")}
        </Text>

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
              onDismissNewBadge("business-expenses");
              onOpenManageBusinesses();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.business.businesses.a11yLabel")}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {t("profile.info.business.businesses.label")}
                </Text>
                {newFeatureIds.has("business-expenses") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.business.businesses.description")}
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
            onPress={() => {
              triggerHaptic("selection");
              setShowBusinessReport(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.info.business.report.a11yLabel")}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.business.report.label")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.business.report.description")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ManageBusinessesModal
        visible={showManageBusinesses}
        onClose={onCloseManageBusinesses}
      />
      <BusinessReportModal
        visible={showBusinessReport}
        onClose={() => setShowBusinessReport(false)}
      />
    </>
  );
};

export default BusinessSection;
