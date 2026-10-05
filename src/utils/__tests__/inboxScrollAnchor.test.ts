/**
 * Tests for anchoredScrollOffset - where the Review Inbox list sits after
 * a card is approved or skipped so the next card takes the actioned card's
 * place instead of the list jumping.
 */

import { anchoredScrollOffset } from "../inboxScrollAnchor";

describe("anchoredScrollOffset", () => {
  it("keeps the offset when the actioned card's top is still on screen", () => {
    expect(anchoredScrollOffset(400, 0)).toBe(400);
    expect(anchoredScrollOffset(400, 120)).toBe(400);
  });

  it("snaps to the card's top when the user scrolled down inside it", () => {
    // Offset 900, card top 350px above the viewport → the card began at 550.
    expect(anchoredScrollOffset(900, -350)).toBe(550);
  });

  it("never goes negative", () => {
    expect(anchoredScrollOffset(100, -250)).toBe(0);
    expect(anchoredScrollOffset(-20, 10)).toBe(0);
  });

  it("falls back to the plain offset on an unusable measurement", () => {
    expect(anchoredScrollOffset(300, Number.NaN)).toBe(300);
    expect(anchoredScrollOffset(Number.NaN, -50)).toBe(0);
  });
});
