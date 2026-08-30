// BudgetArk - Quick Entry home-screen widget (iOS / WidgetKit)
// File: targets/quickentry/index.swift
//
// iOS counterpart to the Android Quick Entry widget: a static, data-free
// category grid whose buttons deep-link into the app's prefilled Add Entry
// modal via `budgetark://quick-add?category=<name>`. All app-side plumbing
// (scheme registration, fail-closed validation in quickAddLink.ts,
// QuickAddLinkHost navigation, modal preselect) is shared with Android -
// this extension only renders buttons and fires URLs.
//
// IMPORTANT: the category names + emoji below are a hardcoded copy of the
// six in src/widgets/QuickEntryWidget.tsx (WIDGET_CATEGORIES +
// CATEGORY_ICONS) - a widget extension has no JS runtime, so Swift can't
// import from TS. Keep the two files in sync when categories change. Drift
// is safe, not fatal: parseQuickAddUri fails closed, so an unknown name
// degrades to "open the modal with no preselection", never a crash.
//
// Deliberately shows NO financial data and uses NO App Groups: nothing is
// shared into the extension, nothing to snapshot or keep in sync, and the
// timeline is static (policy: .never) so the widget never refreshes.

import SwiftUI
import WidgetKit

// MARK: - Deep links (mirror buildQuickAddUri in src/utils/quickAddLink.ts)

private let quickAddBaseURL = URL(string: "budgetark://quick-add")!

private struct QuickAddCategory: Identifiable {
  let name: String
  let emoji: String
  var id: String { name }
  /// Names are static ASCII identifiers from the app's built-in category
  /// list, so no percent-encoding is needed.
  var url: URL { URL(string: "budgetark://quick-add?category=\(name)")! }
}

/// Everyday-spend set - keep identical to WIDGET_CATEGORIES in
/// src/widgets/QuickEntryWidget.tsx.
private let widgetCategories: [QuickAddCategory] = [
  QuickAddCategory(name: "Grocery", emoji: "🛒"),
  QuickAddCategory(name: "Restaurant", emoji: "🍴"),
  QuickAddCategory(name: "Transportation", emoji: "🚗"),
  QuickAddCategory(name: "Shopping", emoji: "🛍️"),
  QuickAddCategory(name: "Entertainment", emoji: "🎬"),
  QuickAddCategory(name: "Other", emoji: "🏷️"),
]

// MARK: - Palette (fixed dark - matches PALETTE in QuickEntryWidget.tsx;
// widgets render outside the app's ThemeProvider)

private enum Palette {
  static let bg = Color(red: 0x1A / 255, green: 0x19 / 255, blue: 0x15 / 255)
  static let button = Color(red: 0x2B / 255, green: 0x2A / 255, blue: 0x26 / 255)
  static let text = Color(red: 0xF2 / 255, green: 0xE6 / 255, blue: 0xD0 / 255)
  static let dim = Color(red: 0x9B / 255, green: 0x96 / 255, blue: 0x89 / 255)
  static let accent = Color(red: 0xDA / 255, green: 0x77 / 255, blue: 0x56 / 255)
}

// MARK: - Timeline (static - the widget has no data and never refreshes)

struct QuickEntryTimelineEntry: TimelineEntry {
  let date: Date
}

struct QuickEntryProvider: TimelineProvider {
  func placeholder(in context: Context) -> QuickEntryTimelineEntry {
    QuickEntryTimelineEntry(date: Date())
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (QuickEntryTimelineEntry) -> Void
  ) {
    completion(QuickEntryTimelineEntry(date: Date()))
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<QuickEntryTimelineEntry>) -> Void
  ) {
    completion(Timeline(entries: [QuickEntryTimelineEntry(date: Date())], policy: .never))
  }
}

// MARK: - Views

extension View {
  /// iOS 17 requires containerBackground(for: .widget); 15/16 use a plain
  /// background. One modifier so every family gets the right treatment.
  @ViewBuilder fileprivate func widgetBackground(_ color: Color) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(for: .widget) { color }
    } else {
      background(color)
    }
  }
}

private struct CategoryButton: View {
  let category: QuickAddCategory

  var body: some View {
    Link(destination: category.url) {
      VStack(spacing: 2) {
        Text(category.emoji)
          .font(.system(size: 20))
        Text(category.name)
          .font(.system(size: 10))
          .foregroundColor(Palette.dim)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Palette.button)
      .cornerRadius(12)
    }
  }
}

/// systemMedium: header + 2x3 category grid, mirroring the Android 4x2
/// layout. Header opens quick-add with no category preselected.
private struct MediumGridView: View {
  var body: some View {
    VStack(spacing: 6) {
      Link(destination: quickAddBaseURL) {
        HStack(spacing: 0) {
          Text("⚓ Quick Entry")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Palette.accent)
          Text("  ·  log an expense")
            .font(.system(size: 11))
            .foregroundColor(Palette.dim)
          Spacer(minLength: 0)
        }
        .padding(.horizontal, 6)
      }
      HStack(spacing: 6) {
        ForEach(widgetCategories[0..<3]) { CategoryButton(category: $0) }
      }
      HStack(spacing: 6) {
        ForEach(widgetCategories[3..<6]) { CategoryButton(category: $0) }
      }
    }
    .padding(10)
  }
}

/// systemSmall gets exactly ONE tap target (widgetURL - Links are ignored
/// in small widgets): the whole widget opens quick-add unpreselected.
private struct SmallView: View {
  var body: some View {
    VStack(spacing: 4) {
      Text("⚓")
        .font(.system(size: 30))
      Text("Quick Entry")
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(Palette.accent)
      Text("log an expense")
        .font(.system(size: 11))
        .foregroundColor(Palette.dim)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .widgetURL(quickAddBaseURL)
  }
}

struct QuickEntryWidgetView: View {
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      if family == .systemMedium {
        MediumGridView()
      } else {
        SmallView()
      }
    }
    .widgetBackground(Palette.bg)
  }
}

// MARK: - Widget definition

struct QuickEntryWidget: Widget {
  let kind = "QuickEntry"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: QuickEntryProvider()) { _ in
      QuickEntryWidgetView()
    }
    .configurationDisplayName("Quick Entry")
    .description(
      "Log an expense in one tap - pick a category and BudgetArk opens straight to the amount."
    )
    .supportedFamilies([.systemSmall, .systemMedium])
    // The widget draws its own padding (matching the Android layout), so
    // opt out of iOS 17's automatic content margins to avoid double insets.
    .contentMarginsDisabled()
  }
}

@main
struct QuickEntryWidgetBundle: WidgetBundle {
  var body: some Widget {
    QuickEntryWidget()
  }
}
