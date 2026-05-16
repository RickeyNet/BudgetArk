/**
 * BudgetArk - Tab bar layout constants
 * File: src/navigation/tabBarLayout.ts
 *
 * Single source of truth for the bottom tab bar's intrinsic height so the
 * absolute-positioned tab bar (AppNavigator) and anything that must sit
 * clear of it (the per-screen FABs, their coachmark spotlight rects) stay
 * in sync. The on-screen tab bar height is `TAB_BAR_BASE_HEIGHT +
 * safeArea.bottom`; a FAB should clear that by `FAB_GAP`.
 */

/** Tab bar height excluding the bottom safe-area inset. */
export const TAB_BAR_BASE_HEIGHT = 58;

/** Breathing room between the FAB and the top edge of the tab bar. */
export const FAB_GAP = 16;

/**
 * Distance from the bottom of the screen the FAB should sit so it always
 * floats above the tab bar regardless of the device's nav-bar inset
 * (gesture pill vs. 3-button nav vary `bottomInset` a lot).
 */
export const fabBottomOffset = (bottomInset: number): number =>
  TAB_BAR_BASE_HEIGHT + bottomInset + FAB_GAP;
