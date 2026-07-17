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
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens);

  const [showBusinessReport, setShowBusinessReport] = useState(false);

  return (
    <>
      {/* ── Business expenses ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          BUSINESS EXPENSES
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
            accessibilityLabel="Manage businesses"
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Businesses 💼
                </Text>
                {newFeatureIds.has("business-expenses") && <NewFeatureBadge />}
              </View>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Tag expenses to a company or side gig
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
            accessibilityLabel="Open business expense report"
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Business Expense Report
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                Per-business totals by year, with CSV export
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
