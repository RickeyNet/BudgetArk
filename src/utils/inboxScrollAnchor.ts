/**
 * BudgetArk - Inbox Scroll Anchor
 * File: src/utils/inboxScrollAnchor.ts
 *
 * Where the Review Inbox list should sit after a card is approved or
 * skipped. The actioned card vanishes from the SectionList - together with
 * its tall expanded editor and, on iOS, the keyboard inset that let the
 * user scroll past the end - so the list content shrinks under a scroll
 * offset that was measured against the old content. Left alone, the next
 * card either lands somewhere above the viewport (the user had scrolled
 * down inside the expanded editor) or the native view clamps to the new
 * bottom: the "lost my spot" the user reported.
 *
 * The rule: the card that followed the actioned one should appear exactly
 * where the actioned card's top was. If that top was still on screen, the
 * offset stays put and the next card slides up into the gap on its own.
 * If the user had scrolled past it, snap to where the card began, so the
 * next card starts at the top of the viewport. Pure so it can be tested;
 * the modal supplies the two measurements.
 */

/**
 * @param scrollOffset The list's current content offset (from onScroll).
 * @param cardTopInViewport The actioned card's top edge relative to the
 *   list's viewport top (negative = scrolled up out of view).
 */
export const anchoredScrollOffset = (
  scrollOffset: number,
  cardTopInViewport: number,
): number => {
  const safeOffset = Number.isFinite(scrollOffset) ? Math.max(0, scrollOffset) : 0;
  if (!Number.isFinite(cardTopInViewport) || cardTopInViewport >= 0) {
    return safeOffset;
  }
  return Math.max(0, safeOffset + cardTopInViewport);
};
