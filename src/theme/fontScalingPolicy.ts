/**
 * BudgetArk - Global font-scaling policy
 * File: src/theme/fontScalingPolicy.ts
 *
 * Side-effect module: import once, early, from App.tsx.
 *
 * React Native's <Text>/<TextInput> default to allowFontScaling=true, so the
 * OS accessibility "Font size"/"Display size" setting multiplies every label
 * on top of whatever pixel size the style asked for. On Android that scale
 * can reach ~1.5-2.0x, which overflows fixed-height rows (the Moto G report).
 *
 * We deliberately KEEP OS font scaling on (accessibility + Play Store
 * expectations) but CLAMP it: the app already has its own in-app Text Size
 * axis (see textSize.ts) that scales type via explicit pixel math through
 * `tokens.fontScale` - that path is unaffected by this clamp, so the two
 * don't fight. This cap only bounds the *OS* multiplier.
 *
 * MAX_FONT_SCALE = 1.3 matches the app's own "Extra Large" multiplier, so a
 * user maxing the OS setting lands in the same ballpark the layouts were
 * already audited against, instead of an unbounded blow-up.
 */

import { Text, TextInput } from "react-native";

export const MAX_FONT_SCALE = 1.3;

type ScalableDefaults = {
  defaultProps?: { allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
};

const applyClamp = (Component: ScalableDefaults) => {
  Component.defaultProps = Component.defaultProps || {};
  // Leave allowFontScaling true (honor the OS setting) but bound it.
  Component.defaultProps.allowFontScaling = true;
  Component.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;
};

applyClamp(Text as unknown as ScalableDefaults);
applyClamp(TextInput as unknown as ScalableDefaults);
