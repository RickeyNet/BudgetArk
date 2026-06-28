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
 * `behavior="padding"` matches the pattern already used by the component modals
 * (AddDebtModal, etc.). On Android it's a light no-op for most cases - the
 * window's adjustResize handles the lift - but it's harmless to keep set.
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
