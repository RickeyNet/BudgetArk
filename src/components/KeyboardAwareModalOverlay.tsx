/**
 * BudgetArk - Keyboard-Aware Modal Overlay
 * File: src/components/KeyboardAwareModalOverlay.tsx
 *
 * The dim overlay for centered dialog modals, wrapped in a
 * KeyboardAvoidingView so the card lifts above the keyboard. This is the
 * centered-card strategy; bottom sheets use SheetKeyboardAvoider instead -
 * the two are deliberately separate because their offsets differ.
 */

import React from "react";
import {
  KeyboardAvoidingView,
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
 * We use `behavior="padding"` on both platforms. RN Modals render in their own
 * Android window that the OS does NOT auto-resize for the keyboard, so the KAV
 * has to do the lift - without it the focused input sits behind the keyboard.
 * `padding` animates a bottom inset, which slides the card up smoothly. We avoid
 * `behavior="height"` on Android: it re-lays-out its whole subtree on every
 * keyboard frame, which visibly glitches the screen when the keyboard is
 * dismissed (e.g. the keyboard checkmark in the holdings/ticker modal).
 */
export function KeyboardAwareModalOverlay({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
