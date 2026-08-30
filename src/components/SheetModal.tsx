/**
 * BudgetArk - Sheet Modal
 * File: src/components/SheetModal.tsx
 *
 * The bottom-sheet skeleton every full-height picker/editor used to
 * copy-paste: dim scrim, card rising from the bottom with rounded top
 * corners, a scrolling body, and a pinned footer that clears the Android
 * navigation bar. Ten modals carried ~110 identical style lines each and
 * fourteen copies of the `insets.bottom + 12` footer fix; the layout,
 * scrim, corners, keyboard handling and safe-area footer now live here
 * once. Body content and footer buttons stay the caller's.
 *
 * `useSheetStyles()` exposes the shared title / subtitle / done / close
 * styles so a sheet's own makeStyles holds only what is unique to it.
 * Keyboard strategy: `keyboardAvoiding` wraps the scrim in
 * SheetKeyboardAvoider (sheets with text inputs); centered dialogs use
 * KeyboardAwareModalOverlay instead - deliberately separate strategies.
 */

import React, { useMemo } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import { useTheme } from "../theme/ThemeProvider";
import { useDensity } from "../theme/DensityProvider";
import type { ThemeColors } from "../theme/themes";
import type { DensityTokens } from "../theme/density";

export const makeSheetStyles = (colors: ThemeColors, tokens: DensityTokens) => {
  const scale = (n: number) => Math.round(n * tokens.fontScale);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      // Leaves the status bar / a sliver of the parent visible above the sheet.
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: tokens.radius + 8,
      borderTopRightRadius: tokens.radius + 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: tokens.padLg,
      paddingBottom: 40,
    },
    title: {
      fontSize: scale(22),
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: scale(14),
      color: colors.textDim,
      marginBottom: tokens.gap,
    },
    buttonRow: {
      flexDirection: "row",
      gap: tokens.gap,
      paddingHorizontal: tokens.padLg,
      paddingTop: tokens.padSm,
      // Home-indicator clearance on iOS; Android adds the nav-bar inset at render.
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    doneButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    doneText: {
      color: colors.accentButtonText,
      fontSize: scale(15),
      fontWeight: "700",
    },
    closeButton: {
      flex: 1,
      paddingVertical: tokens.pad,
      borderRadius: tokens.radius,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeText: {
      color: colors.textDim,
      fontSize: scale(15),
      fontWeight: "600",
    },
  });
};

export type SheetStyles = ReturnType<typeof makeSheetStyles>;

/** The shared sheet styles for the current theme + density. */
export const useSheetStyles = (): SheetStyles => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  return useMemo(() => makeSheetStyles(colors, tokens), [colors, tokens]);
};

interface SheetModalProps {
  visible: boolean;
  onRequestClose: () => void;
  /** Wrap in SheetKeyboardAvoider - for sheets that contain text inputs. */
  keyboardAvoiding?: boolean;
  /**
   * Render `children` inside the standard ScrollView (default). Pass false
   * for sheets that own their own list (FlatList) and render it directly.
   */
  scroll?: boolean;
  /** Extra ScrollView props (keyboardShouldPersistTaps etc. are already set). */
  scrollProps?: Omit<ScrollViewProps, "style" | "contentContainerStyle">;
  /** Extends the standard content padding (e.g. `{ gap: tokens.gap }`). */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Buttons for the pinned footer row; omit for no footer. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SheetModal: React.FC<SheetModalProps> = ({
  visible,
  onRequestClose,
  keyboardAvoiding = false,
  scroll = true,
  scrollProps,
  contentContainerStyle,
  footer,
  children,
}) => {
  const sheet = useSheetStyles();
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      style={sheet.scrollArea}
      contentContainerStyle={[sheet.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const inner = (
    <View style={sheet.modalSheet}>
      {body}
      {footer ? (
        <View
          style={[
            sheet.buttonRow,
            Platform.OS === "android" && insets.bottom > 0
              ? { paddingBottom: insets.bottom + 12 }
              : null,
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onRequestClose}>
      {keyboardAvoiding ? (
        <SheetKeyboardAvoider style={sheet.overlay}>{inner}</SheetKeyboardAvoider>
      ) : (
        <View style={sheet.overlay}>{inner}</View>
      )}
    </Modal>
  );
};

export default SheetModal;
