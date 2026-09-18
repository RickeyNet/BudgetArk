/**
 * BudgetArk - Locale consistency tests
 * File: src/i18n/__tests__/locales.test.ts
 *
 * The type system already forces German to have exactly the English key
 * tree. These tests cover what types cannot: every leaf is a non-empty
 * string, every `{{placeholder}}` in an English string appears in its
 * German twin (a dropped placeholder renders "Text Size, currently " with
 * nothing after it), and plural-form keys stay paired. Imports only the
 * locale objects - never src/i18n/index.ts (native expo-localization).
 */

import { en } from "../locales/en";
import { de } from "../locales/de";

type Tree = { readonly [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
};

const placeholders = (s: string): string[] =>
  Array.from(s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1]).sort();

const LOCALES: Record<string, Tree> = { en, de };
const enFlat = flatten(en);

describe.each(Object.entries(LOCALES))("locale %s", (_name, tree) => {
  const flat = flatten(tree);

  it("has the same key set as English", () => {
    expect(Object.keys(flat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it("has no empty or whitespace-only strings", () => {
    const empty = Object.entries(flat).filter(([, v]) => v.trim() === "");
    expect(empty).toEqual([]);
  });

  it("keeps every interpolation placeholder English uses", () => {
    const mismatched = Object.keys(enFlat).filter(
      (key) => JSON.stringify(placeholders(enFlat[key])) !== JSON.stringify(placeholders(flat[key])),
    );
    expect(mismatched).toEqual([]);
  });

  it("pairs every plural form (_one needs _other and vice versa)", () => {
    const keys = new Set(Object.keys(flat));
    const unpaired = Object.keys(flat).filter((key) => {
      if (key.endsWith("_one")) return !keys.has(key.replace(/_one$/, "_other"));
      if (key.endsWith("_other")) return !keys.has(key.replace(/_other$/, "_one"));
      return false;
    });
    expect(unpaired).toEqual([]);
  });
});

it("German differs from English somewhere (a copied-over fragment is a bug)", () => {
  const deFlat = flatten(de);
  const identical = Object.keys(enFlat).filter((key) => enFlat[key] === deFlat[key]);
  // Proper nouns and shared words (OK, Budget) legitimately match; the
  // bulk must not.
  expect(identical.length).toBeLessThan(Object.keys(enFlat).length / 4);
});
