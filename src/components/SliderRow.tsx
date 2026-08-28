/**
 * BudgetArk - Slider Row
 * File: src/components/SliderRow.tsx
 *
 * One labelled slider: header (label + value), the "-" / slider / "+" row,
 * and anything the caller wants beneath it (rate presets, a hint, the
 * need-by picker). The value is either plain text or, when `editor` is
 * given, the tap-to-type field driven by hooks/useSliderValueEditor. The
 * Charts calculators and the purchase planner had four hand-rolled copies
 * of this ~60-line block; the stepper's disabled-at-bounds rule and the
 * slider colours now live here once.
 */

import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import SmoothSlider from "./SmoothSlider";
import { useTheme } from "../theme/ThemeProvider";
import { useToolStyles } from "../theme/toolStyles";

export interface SliderRowEditor {
  /** True while the value is being typed (the TextInput is shown). */
  active: boolean;
  text: string;
  /** Decimal-pad keyboard (rate-style fields). */
  decimal?: boolean;
  onBegin: () => void;
  onChangeText: (text: string) => void;
  onCommit: () => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Already-formatted value ("$500", "7%", "20 yr"). */
  displayValue: string;
  /** Slider drag. */
  onValueChange: (value: number) => void;
  /** "-" / "+" tap; the caller decides what one tick means. */
  onAdjust: (delta: -1 | 1) => void;
  /** Tap-to-type support; omit for a read-only value label. */
  editor?: SliderRowEditor;
  children?: React.ReactNode;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onValueChange,
  onAdjust,
  editor,
  children,
}) => {
  const { colors } = useTheme();
  const tool = useToolStyles();
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={tool.sliderGroup}>
      <View style={tool.sliderHeader}>
        <Text style={tool.sliderLabel}>{label}</Text>
        {editor?.active ? (
          <TextInput
            style={[tool.sliderValue, tool.sliderValueInput, tool.sliderValueInputActive]}
            value={editor.text}
            onChangeText={editor.onChangeText}
            onBlur={editor.onCommit}
            onSubmitEditing={editor.onCommit}
            keyboardType={editor.decimal ? "decimal-pad" : "numeric"}
            returnKeyType="done"
            selectTextOnFocus
            autoFocus
            placeholderTextColor={colors.textMuted}
          />
        ) : editor ? (
          <TouchableOpacity style={tool.sliderValueDisplay} onPress={editor.onBegin}>
            <Text style={tool.sliderValue}>{displayValue}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={tool.sliderValue}>{displayValue}</Text>
        )}
      </View>
      <View style={tool.sliderRow}>
        <TouchableOpacity style={tool.sliderBtn} onPress={() => onAdjust(-1)} disabled={atMin}>
          <Text style={[tool.sliderBtnText, atMin && tool.sliderBtnDisabled]}>-</Text>
        </TouchableOpacity>
        <SmoothSlider
          value={value}
          min={min}
          max={max}
          step={step}
          onValueChange={onValueChange}
          trackColor={colors.bg}
          fillColor={colors.accent}
          thumbColor={colors.accent}
          thumbBorderColor={colors.card}
        />
        <TouchableOpacity style={tool.sliderBtn} onPress={() => onAdjust(1)} disabled={atMax}>
          <Text style={[tool.sliderBtnText, atMax && tool.sliderBtnDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
};

export default SliderRow;
