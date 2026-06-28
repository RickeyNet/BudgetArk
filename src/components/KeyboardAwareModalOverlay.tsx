import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";

/**
 * Drop-in replacement for a centered modal's dim overlay <View>. Wrapping the
 * overlay in a KeyboardAvoidingView shifts the centered card up when the
 * on-screen keyboard appears, so the focused input is never hidden behind it.
 *
 * Usage: swap `<View style={styles.modalOverlay}>...</View>` for
 * `<KeyboardAwareModalOverlay style={styles.modalOverlay}>...</KeyboardAwareModalOverlay>`.
 * Pass the screen's existing overlay style (flex:1, centered, dim backdrop).
 *
 * On iOS we use `behavior="padding"`, matching the pattern already used by the
 * component modals (AddDebtModal, etc.).
 *
 * On Android we deliberately leave `behavior` undefined (KAV becomes a passive
 * wrapper). Android already resizes the window when the keyboard appears, and a
 * `behavior="height"` KAV animates its own container height on top of that -
 * the two fight each other, double-shifting the card and visibly glitching the
 * screen when the keyboard is dismissed (e.g. tapping the keyboard checkmark in
 * the holdings/ticker modal). Letting the native window resize handle it alone
 * is smooth.
 */
export function KeyboardAwareModalOverlay({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <KeyboardAvoidingView
      style={style}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
