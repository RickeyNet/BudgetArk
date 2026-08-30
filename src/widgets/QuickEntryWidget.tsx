/**
 * BudgetArk - Quick Entry home-screen widget (Android)
 * File: src/widgets/QuickEntryWidget.tsx
 *
 * A 4x2 launcher grid of common expense categories. Each button carries an
 * OPEN_URI click action with a `budgetark://quick-add?category=<name>` deep
 * link, so a tap opens the app directly into the Add Entry modal with that
 * category preselected - no JS runs on the widget side for clicks.
 *
 * Rendered headless (no app context), so colors are a fixed dark palette
 * rather than the user's theme, and the category set is the static built-in
 * list. Everything category-related derives from CATEGORY_ICONS /
 * buildQuickAddUri so the widget can't drift from the app.
 *
 * IMPORTANT: the iOS WidgetKit counterpart (targets/quickentry/index.swift)
 * hardcodes a copy of WIDGET_CATEGORIES, the emoji, and the palette - Swift
 * can't import from TS. Update BOTH files when any of those change.
 */

import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { BudgetCategory } from "../types";
import { CATEGORY_ICONS } from "../data/categoryIcons";
import { buildQuickAddUri } from "../utils/quickAddLink";

/** Expense categories surfaced on the widget - the everyday-spend set. */
const WIDGET_CATEGORIES: readonly BudgetCategory[] = [
  "Grocery",
  "Restaurant",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Other",
];

/** Fixed dark palette - widgets render without the app's ThemeProvider. */
const PALETTE = {
  bg: "#1a1915",
  button: "#2b2a26",
  text: "#F2E6D0",
  dim: "#9b9689",
  accent: "#da7756",
} as const;

interface CategoryButtonProps {
  category: BudgetCategory;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ category }) => (
  <FlexWidget
    clickAction="OPEN_URI"
    clickActionData={{ uri: buildQuickAddUri(category) }}
    style={{
      flex: 1,
      height: "match_parent",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: PALETTE.button,
      borderRadius: 12,
      marginHorizontal: 3,
    }}
  >
    <TextWidget
      text={CATEGORY_ICONS[category]}
      style={{ fontSize: 20, color: PALETTE.text }}
    />
    <TextWidget
      text={category}
      truncate="END"
      maxLines={1}
      style={{ fontSize: 10, color: PALETTE.dim, marginTop: 2 }}
    />
  </FlexWidget>
);

export const QuickEntryWidget: React.FC = () => (
  <FlexWidget
    style={{
      height: "match_parent",
      width: "match_parent",
      flexDirection: "column",
      backgroundColor: PALETTE.bg,
      borderRadius: 16,
      padding: 8,
    }}
  >
    {/* Header - tapping it opens quick-add with no category preselected. */}
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: buildQuickAddUri() }}
      style={{
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        marginBottom: 6,
      }}
    >
      <TextWidget
        text="⚓ Quick Entry"
        style={{ fontSize: 12, fontWeight: "bold", color: PALETTE.accent }}
      />
      <TextWidget
        text="  ·  log an expense"
        style={{ fontSize: 11, color: PALETTE.dim }}
      />
    </FlexWidget>

    <FlexWidget
      style={{
        flex: 1,
        width: "match_parent",
        flexDirection: "row",
        marginBottom: 6,
      }}
    >
      {WIDGET_CATEGORIES.slice(0, 3).map((category) => (
        <CategoryButton key={category} category={category} />
      ))}
    </FlexWidget>
    <FlexWidget
      style={{ flex: 1, width: "match_parent", flexDirection: "row" }}
    >
      {WIDGET_CATEGORIES.slice(3).map((category) => (
        <CategoryButton key={category} category={category} />
      ))}
    </FlexWidget>
  </FlexWidget>
);
