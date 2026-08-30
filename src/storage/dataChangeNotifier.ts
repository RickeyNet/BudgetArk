/**
 * BudgetArk - Data Change Notifier
 * File: src/storage/dataChangeNotifier.ts
 *
 * In-process pub/sub for "storage changed behind the screens' backs". The
 * tab screens load on focus and otherwise trust their own state, which is
 * fine for the user's own taps but not for the two writers that land on
 * app foreground while a tab is already mounted: an incoming partner sync
 * (`applyIncomingDiff`) and a bank sync (balance refresh + auto-approved
 * Review Inbox items). Those publish here; mounted screens subscribe and
 * re-run their focus loader so the merged records show up immediately
 * instead of on the next tab switch.
 *
 * Deliberately tiny and dependency-free (no React Native imports) so the
 * sync and services layers can publish from inside Jest's Node
 * environment. Listeners are fired synchronously and exceptions in one
 * listener never block the others or the publisher.
 */

export type DataChangeSource = "partner-sync" | "bank-sync" | "import";

type Listener = (source: DataChangeSource) => void;

const listeners = new Set<Listener>();

/** Subscribe; returns the unsubscribe function (call it on unmount). */
export const subscribeDataChanged = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Publish. Safe to call with no subscribers. */
export const notifyDataChanged = (source: DataChangeSource): void => {
  for (const listener of Array.from(listeners)) {
    try {
      listener(source);
    } catch (error) {
      // `typeof` guard: this module also runs under Jest/Node, where the
      // RN `__DEV__` global isn't defined.
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("dataChangeNotifier listener threw", error);
      }
    }
  }
};

/** Test-only reset so suites don't leak subscriptions into each other. */
export const __resetDataChangeListenersForTests = (): void => {
  listeners.clear();
};
