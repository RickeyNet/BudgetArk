/**
 * Custom entry point (replaces expo/AppEntry) so the Android home-screen
 * widget's headless task handler can be registered alongside the app.
 * See src/widgets/widgetTaskHandler.tsx.
 */

import { registerRootComponent } from "expo";
import { Platform } from "react-native";

import App from "./App";

registerRootComponent(App);

if (Platform.OS === "android") {
  // Inline requires keep the android-widget module (and the widget tree)
  // out of the iOS bundle entirely.
  const { registerWidgetTaskHandler } = require("react-native-android-widget");
  const { widgetTaskHandler } = require("./src/widgets/widgetTaskHandler");
  registerWidgetTaskHandler(widgetTaskHandler);
}
