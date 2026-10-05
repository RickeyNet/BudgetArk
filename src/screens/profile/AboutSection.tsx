/**
 * BudgetArk - About Section
 * File: src/screens/profile/AboutSection.tsx
 *
 * The ABOUT card (current version + release notes, website + GitHub links) and the
 * release-notes browser modal. The modal's visibility stays in ProfileScreen
 * because the "What's new" deep link (openReleaseNotes) opens it from there;
 * the accordion state is local.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import { useTranslation } from "react-i18next";
import { RELEASE_NOTES, type ReleaseNote } from "../../data/releaseNotes";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

type ReleaseNoteKey = string;

type AboutSectionProps = {
  showReleaseNotesModal: boolean;
  onOpenReleaseNotes: () => void;
  onCloseReleaseNotes: () => void;
};

const AboutSection: React.FC<AboutSectionProps> = ({
  showReleaseNotesModal,
  onOpenReleaseNotes,
  onCloseReleaseNotes,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  /** Release notes accordion state */
  const [expandedReleaseNote, setExpandedReleaseNote] =
    useState<ReleaseNoteKey | null>(RELEASE_NOTES[0]?.version || null);

  const toggleReleaseNote = useCallback((version: string) => {
    setExpandedReleaseNote((current) => (current === version ? null : version));
  }, []);

  const latestRelease: ReleaseNote = RELEASE_NOTES[0];

  return (
    <>
      {/* ── About (release notes, website, github) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("profile.info.about.sectionTitle")}
        </Text>

        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={onOpenReleaseNotes}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.about.versionRow", {
                  version: latestRelease.version,
                  title: latestRelease.title,
                })}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {t("profile.info.about.tapForReleaseNotes")}
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
            onPress={() => Linking.openURL("https://budgetark.app")}
            accessibilityRole="link"
            accessibilityLabel={t("profile.info.about.websiteA11y")}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.about.websiteLabel")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                budgetark.app
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
            onPress={() => Linking.openURL("https://github.com/RickeyNet")}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.info.about.githubLabel")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                github.com/RickeyNet
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showReleaseNotesModal}
        animationType="fade"
        transparent
        onRequestClose={onCloseReleaseNotes}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                maxHeight: "80%",
              },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {t("profile.info.about.releaseNotes.title")}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {t("profile.info.about.releaseNotes.subtitle")}
            </Text>

            <ScrollView
              contentContainerStyle={styles.faqList}
              showsVerticalScrollIndicator={false}
            >
              {RELEASE_NOTES.map((release) => {
                const isExpanded = expandedReleaseNote === release.version;
                return (
                  <TouchableOpacity
                    key={release.version}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => toggleReleaseNote(release.version)}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={[styles.faqQuestion, { color: colors.text }]}>
                        {t("profile.info.about.versionRow", {
                          version: release.version,
                          title: release.title,
                        })}
                      </Text>
                      <Text style={[styles.faqArrow, { color: colors.textMuted }]}>
                        {isExpanded ? "v" : ">"}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <>
                        <Text
                          style={[styles.faqAnswer, { color: colors.textMuted }]}
                        >
                          {t("profile.info.about.releaseNotes.releasedOn", {
                            date: release.releasedAt,
                          })}
                        </Text>
                        {release.highlights.map((item) => (
                          <Text
                            key={`${release.version}-${item}`}
                            style={[styles.faqAnswer, { color: colors.textDim }]}
                          >
                            - {item}
                          </Text>
                        ))}
                      </>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
              onPress={onCloseReleaseNotes}
            >
              <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                {t("common.done")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AboutSection;
