/**
 * The notifier is how partner sync / bank sync / import tell mounted tabs
 * to re-run their focus loaders. Pins: unsubscribe works, a throwing
 * listener doesn't block the others or the publisher, and publishing with
 * nobody listening is fine.
 */
import {
  __resetDataChangeListenersForTests,
  notifyDataChanged,
  subscribeDataChanged,
} from "../dataChangeNotifier";

beforeEach(() => {
  __resetDataChangeListenersForTests();
});

describe("dataChangeNotifier", () => {
  it("delivers the source to every subscriber until they unsubscribe", () => {
    const a = jest.fn();
    const b = jest.fn();
    const offA = subscribeDataChanged(a);
    subscribeDataChanged(b);

    notifyDataChanged("partner-sync");
    expect(a).toHaveBeenCalledWith("partner-sync");
    expect(b).toHaveBeenCalledWith("partner-sync");

    offA();
    notifyDataChanged("bank-sync");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("isolates a throwing listener", () => {
    const bad = jest.fn(() => {
      throw new Error("boom");
    });
    const good = jest.fn();
    subscribeDataChanged(bad);
    subscribeDataChanged(good);
    expect(() => notifyDataChanged("import")).not.toThrow();
    expect(good).toHaveBeenCalledWith("import");
  });

  it("publishing with no subscribers is a no-op", () => {
    expect(() => notifyDataChanged("import")).not.toThrow();
  });
});
