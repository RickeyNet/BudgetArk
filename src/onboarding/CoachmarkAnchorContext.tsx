import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { findNodeHandle, type View } from "react-native";

export type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CoachmarkScrollRef = React.RefObject<any>;

/** Returns a window-relative rect for a known-position element. */
export type AnchorRectProvider = () => AnchorRect | null;

type AnchorEntry = {
  ref: View | null;
  scrollRef: CoachmarkScrollRef | null;
  /**
   * Overrides measureInWindow when set. Use for elements whose on-screen
   * position is deterministic (FABs, fixed overlays) — measureInWindow on RN
   * sometimes returns bounds for the wrong native node when the ref sits on a
   * Touchable wrapper, so we compute the rect directly from layout constants
   * instead.
   */
  getRect: AnchorRectProvider | null;
};

type AnchorRegistry = Map<string, AnchorEntry>;

type CoachmarkAnchorContextValue = Readonly<{
  register: (
    id: string,
    view: View | null,
    scrollRef: CoachmarkScrollRef | null,
    getRect: AnchorRectProvider | null,
  ) => void;
  measure: (id: string) => Promise<AnchorRect | null>;
}>;

const CoachmarkAnchorContext = createContext<CoachmarkAnchorContextValue | null>(null);

/**
 * How much room to leave between the top of the screen and the scrolled-to
 * anchor. Big enough to clear safe-area + screen title section so the anchor
 * doesn't end up jammed against the status bar.
 */
const SCROLL_TOP_MARGIN = 110;
/**
 * Extra delay after firing the scroll command, to let the animation settle
 * before measureInWindow runs. RN's default scroll animation is ~250ms.
 */
const SCROLL_SETTLE_MS = 320;

const measureInWindowAsync = (view: View): Promise<AnchorRect | null> =>
  new Promise((resolve) => {
    try {
      view.measureInWindow((x, y, width, height) => {
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width <= 0 ||
          height <= 0
        ) {
          resolve(null);
          return;
        }
        resolve({ x, y, width, height });
      });
    } catch {
      resolve(null);
    }
  });

const measureLayoutAsync = (view: View, parentNodeHandle: number): Promise<number | null> =>
  new Promise((resolve) => {
    try {
      // RN's measureLayout is `(relativeToNativeNode, onSuccess, onFail)`.
      (view as unknown as {
        measureLayout?: (
          handle: number,
          onSuccess: (x: number, y: number) => void,
          onFail?: () => void,
        ) => void;
      }).measureLayout?.(
        parentNodeHandle,
        (_x, y) => {
          resolve(Number.isFinite(y) ? y : null);
        },
        () => resolve(null),
      );
    } catch {
      resolve(null);
    }
  });

const scrollAnchorIntoView = async (entry: AnchorEntry): Promise<void> => {
  const view = entry.ref;
  const scrollRef = entry.scrollRef?.current;
  if (!view || !scrollRef) return;

  // FlatList wraps an internal ScrollView; its native node lives behind
  // getScrollableNode/getNativeScrollRef. ScrollView refs already point at the
  // native node directly.
  const nativeScrollNode = (() => {
    if (typeof scrollRef.getScrollableNode === "function") {
      try {
        const node = scrollRef.getScrollableNode();
        if (node) return node;
      } catch {
        /* fall through */
      }
    }
    if (typeof scrollRef.getNativeScrollRef === "function") {
      try {
        const node = scrollRef.getNativeScrollRef();
        if (node) return node;
      } catch {
        /* fall through */
      }
    }
    return scrollRef;
  })();

  const handle = findNodeHandle(nativeScrollNode);
  if (handle == null) return;

  const layoutY = await measureLayoutAsync(view, handle);
  if (layoutY == null) return;

  const offset = Math.max(0, layoutY - SCROLL_TOP_MARGIN);

  try {
    if (typeof scrollRef.scrollToOffset === "function") {
      scrollRef.scrollToOffset({ offset, animated: true });
    } else if (typeof scrollRef.scrollTo === "function") {
      scrollRef.scrollTo({ y: offset, animated: true });
    }
  } catch {
    /* swallow — fall back to whatever measureInWindow returns */
  }

  await new Promise<void>((r) => setTimeout(r, SCROLL_SETTLE_MS));
};

export const CoachmarkAnchorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const registryRef = useRef<AnchorRegistry>(new Map());

  const register = useCallback(
    (
      id: string,
      view: View | null,
      scrollRef: CoachmarkScrollRef | null,
      getRect: AnchorRectProvider | null,
    ) => {
      if (view || getRect) {
        registryRef.current.set(id, { ref: view, scrollRef, getRect });
      } else {
        registryRef.current.delete(id);
      }
    },
    [],
  );

  const measure = useCallback(async (id: string): Promise<AnchorRect | null> => {
    const entry = registryRef.current.get(id);
    if (!entry) return null;
    if (entry.getRect) return entry.getRect();
    if (!entry.ref) return null;
    await scrollAnchorIntoView(entry);
    return measureInWindowAsync(entry.ref);
  }, []);

  const value = useMemo<CoachmarkAnchorContextValue>(
    () => ({ register, measure }),
    [register, measure]
  );

  return (
    <CoachmarkAnchorContext.Provider value={value}>{children}</CoachmarkAnchorContext.Provider>
  );
};

const useCoachmarkAnchorContext = (): CoachmarkAnchorContextValue => {
  const ctx = useContext(CoachmarkAnchorContext);
  if (!ctx) throw new Error("useCoachmarkAnchor() must be used inside <CoachmarkAnchorProvider>.");
  return ctx;
};

type AnchorOptions = {
  /**
   * Optional ref to the parent ScrollView/FlatList. When supplied, the
   * spotlight scrolls the anchor into view before measuring it.
   */
  scrollRef?: CoachmarkScrollRef;
};

/**
 * Returns a callback ref that registers a View as a coachmark anchor under the
 * given id. Pass it as `ref={...}` on the element you want the spotlight to
 * highlight.
 */
export const useCoachmarkAnchor = (
  id: string,
  options?: AnchorOptions,
): ((view: View | null) => void) => {
  const { register } = useCoachmarkAnchorContext();
  const scrollRef = options?.scrollRef ?? null;
  return useCallback(
    (view: View | null) => {
      register(id, view, scrollRef, null);
    },
    [id, register, scrollRef],
  );
};

/**
 * Registers a coachmark anchor whose on-screen rect is computed at measure
 * time rather than read from the rendered native view. Use this for elements
 * with a deterministic absolute position (FABs, fixed overlays) where putting
 * a ref on the rendered node returned wrong bounds.
 *
 * The provider runs on every measure, so it can read live values like
 * Dimensions.get("window") and any hook-derived constants captured in its
 * closure.
 */
export const useCoachmarkComputedAnchor = (
  id: string,
  getRect: AnchorRectProvider,
): void => {
  const { register } = useCoachmarkAnchorContext();
  // Hold the latest provider in a ref so re-renders that change `getRect`
  // identity don't trigger re-register churn. The wrapper we hand the registry
  // is stable; it forwards to the latest closure.
  const providerRef = useRef(getRect);
  providerRef.current = getRect;

  useEffect(() => {
    const stable: AnchorRectProvider = () => providerRef.current();
    register(id, null, null, stable);
    return () => {
      register(id, null, null, null);
    };
  }, [id, register]);
};

export const useMeasureAnchor = () => {
  const { measure } = useCoachmarkAnchorContext();
  return measure;
};
