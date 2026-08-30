// BudgetArk - Slider Value Editor tests
//
// Pins the pure parse/clamp/snap helpers behind useSliderValueEditor. Each
// commit mode reproduces one of the legacy inline ChartsScreen handlers
// byte-for-byte - including which modes deliberately skip the max clamp -
// so these tests guard against anyone "fixing" that asymmetry and changing
// on-screen numbers.

import {
  adjustSliderValue,
  commitSliderValue,
  sanitizeSliderText,
} from "../useSliderValueEditor";

describe("sanitizeSliderText", () => {
  it("keeps only digits for integer fields", () => {
    expect(sanitizeSliderText("1,200 yr", false)).toBe("1200");
    expect(sanitizeSliderText("12.5", false)).toBe("125");
    expect(sanitizeSliderText("", false)).toBe("");
  });

  it("also keeps dots for decimal fields (all of them, as legacy did)", () => {
    expect(sanitizeSliderText("6.5%", true)).toBe("6.5");
    expect(sanitizeSliderText("1.2.3", true)).toBe("1.2.3");
  });
});

describe("commitSliderValue", () => {
  it("rejects unparsable or below-min input (edit is discarded)", () => {
    const field = { min: 1, max: 30, step: 1, commitMode: "round-int" } as const;
    expect(commitSliderValue("", field)).toBeNull();
    expect(commitSliderValue(".", field)).toBeNull();
    expect(commitSliderValue("0", field)).toBeNull();
    expect(commitSliderValue("0.999", field)).toBeNull();
  });

  it("round-int: rounds to a whole number, floors at min, ignores max", () => {
    const field = { min: 1, max: 30, step: 1, commitMode: "round-int" } as const;
    expect(commitSliderValue("12.6", field)).toBe(13);
    expect(commitSliderValue("1", field)).toBe(1);
    // Typing past the slider max was always allowed for these fields.
    expect(commitSliderValue("45", field)).toBe(45);
  });

  it("raw-min: passes the parsed value through unrounded", () => {
    const field = { min: 50, max: 50000, step: 50, commitMode: "raw-min" } as const;
    expect(commitSliderValue("123.45", field)).toBe(123.45);
    expect(commitSliderValue("99999", field)).toBe(99999); // no max clamp
  });

  it("snap-step-2dp: snaps to the step and rounds to 2 decimals", () => {
    const field = { min: 1, max: 30, step: 0.5, commitMode: "snap-step-2dp" } as const;
    expect(commitSliderValue("7.3", field)).toBe(7.5);
    expect(commitSliderValue("7.24", field)).toBe(7);
    // 0.25-step loan rate: 6.7 snaps to 6.75.
    expect(
      commitSliderValue("6.7", { min: 0.5, max: 30, step: 0.25, commitMode: "snap-step-2dp" })
    ).toBe(6.75);
    // Above max is allowed here too (legacy behavior).
    expect(commitSliderValue("50", field)).toBe(50);
  });

  it("clamp-snap-3dp: clamps to [min, max] then snaps", () => {
    const rate = { min: 0.5, max: 30, step: 0.125, commitMode: "clamp-snap-3dp" } as const;
    expect(commitSliderValue("5.4", rate)).toBe(5.375); // snap to 0.125 grid
    expect(commitSliderValue("99", rate)).toBe(30); // max clamp applies here
    const years = { min: 1, max: 30, step: 1, commitMode: "clamp-snap-3dp" } as const;
    // step >= 1 rounds to a whole number instead of grid-snapping.
    expect(commitSliderValue("12.6", years)).toBe(13);
    expect(commitSliderValue("45", years)).toBe(30);
  });
});

describe("adjustSliderValue", () => {
  const field = { min: 1, max: 30, step: 0.5, adjustDecimals: 2 } as const;

  it("moves by one step per delta and clamps at both ends", () => {
    expect(adjustSliderValue(7, 1, field)).toBe(7.5);
    expect(adjustSliderValue(7, -1, field)).toBe(6.5);
    expect(adjustSliderValue(1.2, -1, field)).toBe(1); // floor at min
    expect(adjustSliderValue(29.8, 1, field)).toBe(30); // ceiling at max
  });

  it("sheds float noise at 2 decimals by default and 3 when configured", () => {
    // 0.1 + 0.2-style drift must not accumulate on repeated taps.
    expect(adjustSliderValue(0.9, 1, { min: 0.5, max: 30, step: 0.25 })).toBe(1.15);
    expect(
      adjustSliderValue(5.5, 1, { min: 0.5, max: 30, step: 0.125, adjustDecimals: 3 })
    ).toBe(5.625);
  });
});
