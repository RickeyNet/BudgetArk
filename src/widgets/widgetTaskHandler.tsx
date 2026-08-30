/**
 * BudgetArk - Android widget task handler
 * File: src/widgets/widgetTaskHandler.tsx
 *
 * Runs in a headless JS context (no app providers) whenever Android asks a
 * widget to render. Clicks never reach here - every tappable element in the
 * Quick Entry widget uses the built-in OPEN_URI action, which Android
 * handles natively via the deep link.
 */

import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { QuickEntryWidget } from "./QuickEntryWidget";

const nameToWidget = {
  // Must match the widget `name` in app.json's react-native-android-widget
  // plugin config.
  QuickEntry: QuickEntryWidget,
} as const;

export async function widgetTaskHandler(
  props: WidgetTaskHandlerProps
): Promise<void> {
  const Widget =
    nameToWidget[props.widgetInfo.widgetName as keyof typeof nameToWidget];
  if (!Widget) return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      props.renderWidget(<Widget />);
      break;
    default:
      break;
  }
}
