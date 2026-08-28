/**
 * BudgetArk - Profile Styles
 * File: src/screens/profile/profileStyles.ts
 *
 * The density-aware style factory for the Profile screen and its section
 * components. Moved verbatim out of ProfileScreen.tsx when the screen was
 * decomposed into src/screens/profile/ sections; kept as a single shared
 * sheet so every section renders exactly the styles the original monolithic
 * screen did.
 */

import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { DensityTokens } from "../../theme/density";
import type { ThemeColors } from "../../theme/themes";

export const makeProfileStyles = (tokens: DensityTokens, colors: ThemeColors) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: tokens.pad,
    },
    titleSection: {
      paddingTop: 56,
      paddingBottom: tokens.gap,
      alignItems: "center",
    },
    appLabel: {
      fontSize: scale(12),
      letterSpacing: 2,
      marginBottom: 4,
      textAlign: "center",
    },
    screenTitle: {
      fontSize: scale(28),
      fontWeight: "700",
      marginBottom: 4,
      textAlign: "center",
    },
    screenSubtitle: {
      fontSize: scale(14),
      textAlign: "center",
    },

    missionCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginBottom: tokens.gap,
      gap: 8,
    },
    missionEyebrow: {
      fontSize: scale(11),
      fontWeight: "700",
      letterSpacing: 1.5,
      textAlign: "center",
    },
    missionTitle: {
      fontSize: scale(17),
      fontWeight: "700",
      textAlign: "center",
    },
    missionBody: {
      fontSize: scale(14),
      lineHeight: scale(21),
      textAlign: "center",
    },
    missionChevron: {
      fontSize: scale(14),
      textAlign: "center",
      marginTop: 2,
    },

    /* Backup reminder banner */
    backupBanner: {
      marginTop: 56,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    backupBannerTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    backupBannerBody: {
      fontSize: 13,
      lineHeight: 18,
    },
    backupBannerActions: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 12,
    },
    backupBannerPrimary: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    backupBannerPrimaryText: {
      fontSize: 14,
      fontWeight: "700",
    },
    backupBannerSecondary: {
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    backupBannerSecondaryText: {
      fontSize: 13,
      fontWeight: "600",
    },

    /* Profile Card */
    profileCard: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginTop: 4,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    profileInfo: {
      flex: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "700",
    },
    displayName: {
      fontSize: 17,
      fontWeight: "700",
    },
    editHint: {
      fontSize: 11,
      marginTop: 2,
    },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      minWidth: 160,
      textAlign: "center",
    },
    saveBtn: {
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    saveBtnText: {
      fontWeight: "700",
      fontSize: 14,
    },

    /* Settings */
    settingsSection: {
      marginTop: 24,
    },
    settingsSectionTitle: {
      fontSize: 11,
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    settingsRow: {
      borderWidth: 1,
      borderRadius: tokens.radiusSm,
      paddingHorizontal: tokens.pad,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      minHeight: tokens.rowHeight,
    },
    /** Text column of a settings row - fills the space left of the chevron/toggle. */
    rowTextWrap: {
      flex: 1,
    },
    settingsRowText: {
      fontSize: scale(15),
      fontWeight: "500",
    },
    settingsRowSubtext: {
      fontSize: scale(13),
      marginTop: 2,
    },
    rowTitleWithBadge: {
      flexDirection: "row",
      alignItems: "center",
    },
    settingsRowArrow: {
      fontSize: 16,
    },
    dangerRow: {
      borderColor: "#ff525220",
    },

    /* Grouped Card */
    groupedCard: {
      borderWidth: 1,
      borderRadius: tokens.radius - 2,
      overflow: "hidden",
    },
    groupedRow: {
      paddingHorizontal: tokens.pad,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: tokens.rowHeight,
    },
    groupedDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 16,
    },

    /* How To Docs */
    faqList: {
      gap: 8,
      marginBottom: 14,
    },
    faqItem: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    faqHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    faqQuestion: {
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },
    faqArrow: {
      fontSize: 16,
    },
    faqAnswer: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },

    /* What's New */
    newsCard: {
      borderWidth: 1,
      borderRadius: tokens.radius,
      overflow: "hidden",
    },
    newsItem: {
      padding: tokens.pad,
    },
    newsBadge: {
      alignSelf: "flex-start",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 8,
    },
    newsBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    newsTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 6,
    },
    newsBody: {
      fontSize: 13,
      lineHeight: 19,
    },
    newsDivider: {
      height: 1,
      marginHorizontal: 16,
    },
    newsHistoryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    newsHistoryBtnText: {
      fontSize: 14,
      fontWeight: "600",
    },

    /* App Info */
    appInfo: {
      alignItems: "center",
      marginTop: 32,
      gap: 4,
    },
    appInfoText: {
      fontSize: 12,
    },

    /* Theme Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-end",
    },
    modalTitle: {
      fontSize: scale(22),
      fontWeight: "700",
      marginBottom: tokens.gap,
      textAlign: "center",
    },
    // The picker-modal scaffold styles (overlay list rows, checkmark, sheet)
    // moved into components/OptionPickerModal.tsx; only the row-body styles
    // its renderOption callbacks use remain here.
    themeColorRow: {
      flexDirection: "row",
      gap: 6,
    },
    themeSwatch: {
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    themeOptionText: {
      fontSize: scale(16),
      fontWeight: "600",
      flex: 1,
    },
    currencyOptionTextWrap: {
      flex: 1,
      gap: 4,
    },
    closeBtn: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    closeBtnText: {
      fontSize: 16,
      fontWeight: "700",
    },

    /* Paste Import Modal */
    pasteModalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-start",
    },
    pasteModalContent: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 0,
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
    },
    pasteHint: {
      fontSize: 13,
      lineHeight: 19,
      textAlign: "left",
      marginBottom: 16,
    },
    pasteInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 13,
      fontFamily: "monospace",
      marginBottom: 16,
    },
    pasteActions: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },
    pasteBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    pasteBtnText: {
      fontSize: 15,
      fontWeight: "700",
    },

    /* Themed Dialog (replaces Alert.alert) */
    dialogOverlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    dialogBox: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 20,
      padding: 24,
    },
    dialogTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 10,
      textAlign: "center",
    },
    dialogMessage: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 20,
    },
    dialogTip: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      marginTop: -10,
      marginBottom: 14,
      fontStyle: "italic",
    },
    dialogLinkRow: {
      alignItems: "center",
      marginBottom: 16,
    },
    dialogLinkText: {
      fontSize: 14,
      fontWeight: "600",
    },
    /* Update modal */
    updateVersionBadge: {
      alignSelf: "center",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 12,
    },
    updateVersionText: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    updateReleaseTitle: {
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 12,
    },
    updateHighlightsList: {
      maxHeight: 240,
      marginBottom: 12,
    },
    updateHighlight: {
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 6,
    },
    updateMeta: {
      fontSize: 11,
      textAlign: "center",
      marginBottom: 16,
    },

    dialogActions: {
      gap: 10,
    },
    dialogBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    dialogBtnText: {
      fontSize: scale(15),
      fontWeight: "700",
    },
  });
};

export type ProfileStyles = ReturnType<typeof makeProfileStyles>;

/** Memoized profile stylesheet, keyed on the density tokens + theme scrims. */
export const useProfileStyles = (
  tokens: DensityTokens,
  colors: ThemeColors,
): ProfileStyles => useMemo(() => makeProfileStyles(tokens, colors), [tokens, colors]);
