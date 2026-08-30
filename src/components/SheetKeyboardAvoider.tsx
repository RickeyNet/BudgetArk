/**
 * BudgetArk - Sheet Keyboard Avoider
 * File: src/components/SheetKeyboardAvoider.tsx
 *
 * The one keyboard strategy for bottom-sheet Modals whose body is a
 * ScrollView. Seven modals carried this exact KeyboardAvoidingView (and its
 * why-comment) inline, which is how the app ended up with divergent keyboard
 * handling in the first place - fixes landed in some copies and not others.
 *
 * The strategy, once: iOS leans on the ScrollView's
 * automaticallyAdjustKeyboardInsets (which also scrolls the focused field
 * into view), so the KAV stays off there. The RN Modal's Android window
 * isn't auto-resized for the keyboard, so Android needs the KAV to lift the
 * sheet - "padding" slides it up smoothly, while "height" re-lays-out the
 * subtree each frame and glitches on dismiss.
 *
 * Callers must still set keyboardShouldPersistTaps="handled" and
 * automaticallyAdjustKeyboardInsets on their ScrollView. Centered cards
 * without a ScrollView use KeyboardAwareModalOverlay instead (padding on
 * both platforms - deliberately a different strategy, not a missed
 * consolidation).
 */

import React from "react";
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from "react-native";

interface SheetKeyboardAvoiderProps {
  /** The sheet overlay style (flex: 1 + backdrop color + justify). */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const SheetKeyboardAvoider: React.FC<SheetKeyboardAvoiderProps> = ({
  style,
  children,
}) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === "android" ? "padding" : undefined}
    style={style}
  >
    {children}
  </KeyboardAvoidingView>
);

export default SheetKeyboardAvoider;
