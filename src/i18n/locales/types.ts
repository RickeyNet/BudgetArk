/**
 * BudgetArk - Locale Type Helpers
 * File: src/i18n/locales/types.ts
 *
 * English is the source of truth for the translation key tree. Every other
 * language declares its fragments as `Localized<typeof enFragment>`, so a
 * key that exists in English but is missing (or misspelled) in German is a
 * TYPE ERROR - `npm run typecheck` catches it before a raw
 * `profile.data.exportTitle` can ever render on a user's screen. Extra keys
 * in a translation that English lacks are errors too, which keeps the tree
 * from accumulating dead strings.
 */

/** Same shape as the English fragment, every leaf widened to `string`. */
export type Localized<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : Localized<T[K]>;
};

/**
 * Languages whose CLDR cardinal plurals are one / few / many / other
 * (Russian, Ukrainian). Every English `x_one` key expands to `x_one`,
 * `x_few` and `x_many` (and `x_other` stays), so a fragment that forgets a
 * form is a typecheck error, exactly like a missing key.
 */
export type LocalizedPlural<T> = {
  readonly [K in keyof T as K extends `${infer B}_one`
    ? `${B}_one` | `${B}_few` | `${B}_many`
    : K]: T[K] extends string ? string : LocalizedPlural<T[K]>;
};
