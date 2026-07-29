/**
 * BudgetArk - Android keyboard input scroll
 * File: src/hooks/useAndroidKeyboardInputScroll.ts
 *
 * Keyboard strategy for SCREEN-level ScrollViews with inline text inputs
 * (Charts tools, Profile). iOS is covered by the ScrollView's
 * automaticallyAdjustKeyboardInsets, which also scrolls the focused field
 * into view; Android has no equivalent - nothing auto-scrolls a ScrollView
 * to a focused input - so when the keyboard opens over an input in the
 * lower half of the screen the box stays hidden behind it.
 *
 * On Android this hook listens for keyboardDidShow, measures whichever
 * TextInput is focused (TextInput.State - no per-input wiring, which
 * matters on Charts where inputs are nested inside embedded card
 * components), and scrolls the delta so the input clears the keyboard.
 * The caller wraps its ScrollView in a KeyboardAvoidingView
 * (behavior="padding", Android-only) so the viewport actually ends above
 * the keyboard, and attaches the returned onScroll handler - the scroll
 * offset must be tracked to turn the measured window delta into an
 * absolute scrollTo target.
 *
 * Modals don't use this: bottom sheets use SheetKeyboardAvoider and
 * centered cards use KeyboardAwareModalOverlay. The debt list's inline
 * pay input has its own FlatList scrollToIndex handling (whole-card
 * alignment, which measures better for card UIs than input-edge math).
 */

import { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

/** Gap kept between the focused input's bottom edge and the keyboard. */
const KEYBOARD_MARGIN = 12;

export function useAndroidKeyboardInputScroll(
  scrollRef: React.RefObject<ScrollView | null>
): (event: NativeSyntheticEvent<NativeScrollEvent>) => void {
  const scrollOffsetY = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = Keyboard.addListener("keyboardDidShow", (event) => {
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;
      // One frame so the KeyboardAvoidingView's shrunken layout lands
      // before the input's on-screen position is measured.
      requestAnimationFrame(() => {
        input.measureInWindow((_x, y, _width, height) => {
          const keyboardTop = event.endCoordinates.screenY;
          const overlap = y + height + KEYBOARD_MARGIN - keyboardTop;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({
              y: scrollOffsetY.current + overlap,
              animated: true,
            });
          }
        });
      });
    });
    return () => sub.remove();
  }, [scrollRef]);

  return onScroll;
}
