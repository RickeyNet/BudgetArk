/**
 * BudgetArk - Slider value editor hook
 * File: src/hooks/useSliderValueEditor.ts
 *
 * Consolidates the Charts-screen pattern of a slider paired with a
 * tap-to-type value: tapping the value swaps in a TextInput holding a temp
 * string, keystrokes are sanitized to digits (plus "." for decimal fields),
 * and blur/submit parses the text and commits it through a per-field
 * clamp/snap rule. Also owns the +/- stepper math and the plain
 * slider-drag setter, since those repeated per calculator too.
 *
 * The commit rules intentionally reproduce the three legacy inline
 * handlers byte-for-byte (including which ones skip the max clamp) so
 * extraction changes zero user-visible numbers - see SliderCommitMode.
 * The pure helpers are exported for unit tests.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/**
 * How a typed value is turned into the committed slider value. Each mode
 * matches one of the legacy inline submit handlers:
 *
 * - "round-int":    Math.max(min, Math.round(v)). Intentionally NOT clamped
 *                   to max - typing above the slider's max was always
 *                   allowed for whole-number fields (years, loan amount).
 * - "raw-min":      Math.max(min, v) - no rounding at all (contribution).
 * - "snap-step-2dp": snap to step, round to 2 decimals, floor at min.
 *                   Also intentionally not max-clamped (rate fields).
 * - "clamp-snap-3dp": clamp to [min, max] first, then round to a whole
 *                   number when step >= 1 (else snap to step), then round
 *                   to 3 decimals (the refi fields).
 */
export type SliderCommitMode =
  | "round-int"
  | "raw-min"
  | "snap-step-2dp"
  | "clamp-snap-3dp";

export type SliderEditorField = {
  min: number;
  max: number;
  step: number;
  /** State setter for the field's numeric value. */
  set: Dispatch<SetStateAction<number>>;
  /** Allow "." while typing (rate-style fields use decimal-pad input). */
  decimal?: boolean;
  commitMode: SliderCommitMode;
  /** Decimal places the +/- steppers round to. Legacy handlers used 2
   * everywhere except the refi calculator's 3. Defaults to 2. */
  adjustDecimals?: 2 | 3;
};

/** Strips characters the field can't contain while the user types. */
export const sanitizeSliderText = (text: string, decimal?: boolean): string =>
  decimal ? text.replace(/[^0-9.]/g, "") : text.replace(/[^0-9]/g, "");

/**
 * Parses + clamps a typed value per the field's commit rule. Returns null
 * when the text doesn't parse or is below min - the legacy handlers
 * discarded the edit (kept the previous value) in that case.
 */
export const commitSliderValue = (
  text: string,
  field: Pick<SliderEditorField, "min" | "max" | "step" | "commitMode">
): number | null => {
  const parsed = parseFloat(text);
  if (isNaN(parsed) || parsed < field.min) return null;
  switch (field.commitMode) {
    case "round-int":
      return Math.max(field.min, Math.round(parsed));
    case "raw-min":
      return Math.max(field.min, parsed);
    case "snap-step-2dp": {
      const snapped = Math.round(parsed / field.step) * field.step;
      return Math.max(field.min, Math.round(snapped * 100) / 100);
    }
    case "clamp-snap-3dp": {
      const clamped = Math.max(field.min, Math.min(field.max, parsed));
      const snapped =
        field.step >= 1
          ? Math.round(clamped)
          : Math.round(clamped / field.step) * field.step;
      return Math.round(snapped * 1000) / 1000;
    }
  }
};

/** One +/- stepper tick: move by step, shed float noise, clamp to range. */
export const adjustSliderValue = (
  prev: number,
  delta: number,
  field: Pick<SliderEditorField, "min" | "max" | "step" | "adjustDecimals">
): number => {
  const factor = field.adjustDecimals === 3 ? 1000 : 100;
  const next = Math.round((prev + delta * field.step) * factor) / factor;
  return Math.max(field.min, Math.min(field.max, next));
};

export const useSliderValueEditor = <K extends string>(
  fields: Record<K, SliderEditorField>
) => {
  const [editingKey, setEditingKey] = useState<K | null>(null);
  const [editingText, setEditingText] = useState("");

  // Callers build `fields` inline every render (the config is a literal
  // around state setters), so keying the callbacks on it made every one a
  // fresh function each render and the memoization was void. The handlers
  // only run from user events, after commit, so a ref refreshed in an
  // effect always sees the current config - and the callbacks stay stable.
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  });

  /** Tap-to-type: open the text editor seeded with the current value. */
  const beginEditing = useCallback((key: K, value: number) => {
    setEditingKey(key);
    setEditingText(String(value));
  }, []);

  const changeEditingText = useCallback((key: K, text: string) => {
    setEditingText(sanitizeSliderText(text, fieldsRef.current[key].decimal));
  }, []);

  /** Blur/submit: parse + clamp, apply when valid, close the editor. */
  const commitEditing = useCallback(
    (key: K) => {
      const field = fieldsRef.current[key];
      const next = commitSliderValue(editingText, field);
      if (next !== null) field.set(next);
      setEditingKey(null);
    },
    [editingText]
  );

  const adjustBy = useCallback((key: K, delta: number) => {
    const field = fieldsRef.current[key];
    field.set((prev) => adjustSliderValue(prev, delta, field));
  }, []);

  /** Slider-drag passthrough (SmoothSlider already steps/clamps). */
  const setValue = useCallback((key: K, value: number) => {
    fieldsRef.current[key].set(value);
  }, []);

  return {
    editingKey,
    editingText,
    beginEditing,
    changeEditingText,
    commitEditing,
    adjustBy,
    setValue,
  };
};
