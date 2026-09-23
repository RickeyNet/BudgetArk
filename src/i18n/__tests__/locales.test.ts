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
import { ru } from "../locales/ru";
import { uk } from "../locales/uk";

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

const LOCALES: Record<string, Tree> = { en, de, ru, uk };
const enFlat = flatten(en);

/** CLDR cardinal categories i18next resolves per language (besides `other`). */
const PLURAL_FORMS: Record<string, readonly string[]> = {
  en: ["one"],
  de: ["one"],
  ru: ["one", "few", "many"],
  uk: ["one", "few", "many"],
};

/** English key set expanded to the plural forms `lang` needs. */
const expectedKeys = (lang: string): string[] => {
  const forms = PLURAL_FORMS[lang];
  const out: string[] = [];
  for (const key of Object.keys(enFlat)) {
    if (key.endsWith("_one")) {
      const base = key.slice(0, -"_one".length);
      for (const form of forms) out.push(`${base}_${form}`);
    } else {
      out.push(key);
    }
  }
  return out.sort();
};

/**
 * English placeholder sets a translated key may use. `_few` / `_many` forms
 * (Russian, Ukrainian) may follow either the English `_one` or `_other`
 * form: "After a quiet day" has no count but "After {{count}} quiet days"
 * does, and the Slavic 2-20 forms rightly carry the number.
 */
const allowedPlaceholders = (key: string): string[] => {
  const m = /^(.*)_(few|many)$/.exec(key);
  if (!m) return [JSON.stringify(placeholders(enFlat[key] ?? ""))];
  return [`${m[1]}_one`, `${m[1]}_other`].map((k) => JSON.stringify(placeholders(enFlat[k] ?? "")));
};

describe.each(Object.entries(LOCALES))("locale %s", (name, tree) => {
  const flat = flatten(tree);

  it("has the same key set as English (with its own plural forms)", () => {
    expect(Object.keys(flat).sort()).toEqual(expectedKeys(name));
  });

  it("has no empty or whitespace-only strings", () => {
    const empty = Object.entries(flat).filter(([, v]) => v.trim() === "");
    expect(empty).toEqual([]);
  });

  it("keeps every interpolation placeholder English uses", () => {
    const mismatched = Object.keys(flat).filter(
      (key) => !allowedPlaceholders(key).includes(JSON.stringify(placeholders(flat[key]))),
    );
    expect(mismatched).toEqual([]);
  });

  it("pairs every plural form (each _one/_few/_many needs _other and vice versa)", () => {
    const keys = new Set(Object.keys(flat));
    const forms = PLURAL_FORMS[name];
    const unpaired = Object.keys(flat).filter((key) => {
      const m = /^(.*)_(one|few|many|other)$/.exec(key);
      if (!m) return false;
      const [, base, form] = m;
      if (form === "other") return forms.some((f) => !keys.has(`${base}_${f}`));
      return !keys.has(`${base}_other`);
    });
    expect(unpaired).toEqual([]);
  });
});

describe.each(Object.entries(LOCALES).filter(([name]) => name !== "en"))(
  "locale %s differs from English (a copied-over fragment is a bug)",
  (_name, tree) => {
    it("differs in the bulk of keys", () => {
      const flat = flatten(tree);
      const identical = Object.keys(enFlat).filter((key) => enFlat[key] === flat[key]);
      // Proper nouns and shared words (OK, Budget) legitimately match; the
      // bulk must not.
      expect(identical.length).toBeLessThan(Object.keys(enFlat).length / 4);
    });
  },
);

