/**
 * BudgetArk - Organize Section
 * File: src/screens/profile/OrganizeSection.tsx
 *
 * The ORGANIZE card: Custom Categories, People and Businesses as three rows
 * of one card. Each used to be a one-row card with its own section header
 * (CATEGORIES / PEOPLE / BUSINESS EXPENSES); they all answer "how do I tag
 * entries?", so one header covers them and the Profile tab reads two
 * headers shorter. The row components keep their own modal state and deep
 * link handles - this file is only the card around them. Dividers are
 * drawn here so a row component never has to know its neighbours.
 */

import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";
import CategoriesSection from "./CategoriesSection";
import BusinessSection from "./BusinessSection";
import PeopleSection, { type PeopleSectionHandle } from "./PeopleSection";

type OrganizeSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
  /** Forwarded to the People row for the openSection: "owedToYou" deep link. */
  peopleRef: React.Ref<PeopleSectionHandle>;
  showManagePeople: boolean;
  onOpenManagePeople: () => void;
  onCloseManagePeople: () => void;
  showManageBusinesses: boolean;
  onOpenManageBusinesses: () => void;
  onCloseManageBusinesses: () => void;
};

const OrganizeSection: React.FC<OrganizeSectionProps> = ({
  newFeatureIds,
  onDismissNewBadge,
  peopleRef,
  showManagePeople,
  onOpenManagePeople,
  onCloseManagePeople,
  showManageBusinesses,
  onOpenManageBusinesses,
  onCloseManageBusinesses,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const divider = (
    <View
      style={[styles.groupedDivider, { backgroundColor: colors.cardBorder }]}
    />
  );

  return (
    <View style={styles.settingsSection}>
      <Text style={[styles.settingsSectionTitle, { color: colors.textMuted }]}>
        {t("profile.info.organize.sectionTitle")}
      </Text>

      <View
        style={[
          styles.groupedCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <CategoriesSection />
        {divider}
        <PeopleSection
          ref={peopleRef}
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={onDismissNewBadge}
          showManagePeople={showManagePeople}
          onOpenManagePeople={onOpenManagePeople}
          onCloseManagePeople={onCloseManagePeople}
        />
        {divider}
        <BusinessSection
          newFeatureIds={newFeatureIds}
          onDismissNewBadge={onDismissNewBadge}
          showManageBusinesses={showManageBusinesses}
          onOpenManageBusinesses={onOpenManageBusinesses}
          onCloseManageBusinesses={onCloseManageBusinesses}
        />
      </View>
    </View>
  );
};

export default OrganizeSection;
