/**
 * BudgetArk - English strings: Profile > Appearance
 * File: src/i18n/locales/en/appearance.ts
 *
 * The APPEARANCE card and its pickers (theme, design style, ambient
 * backgrounds, density, text size, language). Preset names/descriptions
 * are keyed by the preset ID so the section can translate a preset it only
 * knows by id; theme names (The Ark, Forest Gold, ...) are proper nouns and
 * deliberately stay untranslated.
 */

export const appearance = {
  sectionTitle: "APPEARANCE",
  theme: {
    label: "Theme",
    pickerTitle: "Choose Theme",
  },
  surfaceStyle: {
    label: "Design Style",
    pickerTitle: "Design Style",
    themeDefaultSuffix: " · theme default",
    themeDefaultNote:
      "{{theme}} currently defaults to Glass. Pick a style here to keep it across all themes.",
    presets: {
      solid: { name: "Solid", description: "Classic opaque cards and windows." },
      glass: { name: "Glass", description: "Translucent frosted cards across the app." },
    },
  },
  backgroundEffects: {
    label: "Ambient Backgrounds",
    enabled: "Decorative themed backgrounds are enabled",
    disabled: "Plain backgrounds for reduced visual noise",
  },
  density: {
    label: "Layout Density",
    pickerTitle: "Layout Density",
    presets: {
      compact: { name: "Compact", description: "Tighter spacing, more content per screen." },
      comfortable: { name: "Comfortable", description: "Balanced spacing - the default look." },
      spacious: { name: "Spacious", description: "Larger touch targets and roomier text." },
    },
  },
  textSize: {
    label: "Text Size",
    pickerTitle: "Text Size",
    a11yLabel: "Text Size, currently {{current}}",
    a11yHint: "Opens text size options for the whole app",
    presets: {
      small: { name: "Small", description: "Slightly smaller text - fits a bit more on screen." },
      default: { name: "Default", description: "Standard text size." },
      large: { name: "Large", description: "Bigger text for easier reading." },
      xlarge: { name: "Extra Large", description: "Largest text - maximum readability." },
    },
  },
  language: {
    label: "Language",
    pickerTitle: "Language",
    a11yLabel: "Language, currently {{current}}",
    a11yHint: "Opens the app language options",
    /** Shown as the subtext when "Automatic" is selected. */
    autoWithResolved: "Automatic ({{language}})",
    options: {
      auto: {
        name: "Automatic",
        description: "Follow the phone's language. Falls back to English when the phone language isn't available yet.",
      },
    },
    note: "Some content - lessons, the US tax tools, and release notes - is still English only.",
  },
} as const;
