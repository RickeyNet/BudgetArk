/**
 * Tests for lesson → Charts-tool route parsing, plus the curriculum guard:
 * every authored lesson whose CTA (or tool resource) points at the Charts
 * tab must name a real calculator. A bare "charts" route only closes the
 * lesson - the dead "Open the calculator" button this guards against.
 */

import { CHAPTERS } from "../../data/lessonChapters";
import { getLessonById } from "../../data/lessonIndex";
import { CHARTS_TOOL_KEYS, parseChartsToolRoute } from "../lessonRoutes";

describe("parseChartsToolRoute", () => {
  it("resolves every known tool key", () => {
    for (const key of CHARTS_TOOL_KEYS) {
      expect(parseChartsToolRoute(`charts/tools/${key}`)).toBe(key);
    }
  });

  it("rejects anything that is not exactly charts/tools/<known key>", () => {
    for (const route of [
      "",
      "charts",
      "charts/tools",
      "charts/tools/",
      "charts/tools/unknown",
      "charts/tools/loan/extra",
      "charts/loan",
      "budget/tools/loan",
      "Charts/tools/loan",
    ]) {
      expect(parseChartsToolRoute(route)).toBeNull();
    }
  });
});

describe("authored lessons", () => {
  const chartsRoutes: { lessonId: string; route: string }[] = [];
  for (const chapter of CHAPTERS) {
    for (const stub of chapter.lessons) {
      const lesson = getLessonById(stub.id);
      if (!lesson) continue;
      const routes = [
        lesson.action?.route,
        ...(lesson.resources ?? []).map((r) =>
          r.type === "tool" ? r.route : undefined
        ),
      ];
      for (const route of routes) {
        if (route?.split("/")[0] === "charts") {
          chartsRoutes.push({ lessonId: stub.id, route });
        }
      }
    }
  }

  it("has lessons that route into the Charts tab", () => {
    expect(chartsRoutes.length).toBeGreaterThan(0);
  });

  it("every Charts-tab route names a calculator (no dead CTA)", () => {
    for (const { lessonId, route } of chartsRoutes) {
      expect({ lessonId, tool: parseChartsToolRoute(route) }).not.toEqual({
        lessonId,
        tool: null,
      });
    }
  });
});
