import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import type { View } from "react-native";

export type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnchorEntry = {
  ref: View | null;
};

type AnchorRegistry = Map<string, AnchorEntry>;

type CoachmarkAnchorContextValue = Readonly<{
  register: (id: string, view: View | null) => void;
  measure: (id: string) => Promise<AnchorRect | null>;
}>;

const CoachmarkAnchorContext = createContext<CoachmarkAnchorContextValue | null>(null);

export const CoachmarkAnchorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const registryRef = useRef<AnchorRegistry>(new Map());

  const register = useCallback((id: string, view: View | null) => {
    if (view) {
      registryRef.current.set(id, { ref: view });
    } else {
      registryRef.current.delete(id);
    }
  }, []);

  const measure = useCallback((id: string): Promise<AnchorRect | null> => {
    const entry = registryRef.current.get(id);
    if (!entry || !entry.ref) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        entry.ref?.measureInWindow((x, y, width, height) => {
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

/**
 * Returns a callback ref that registers a View as a coachmark anchor under the
 * given id. Pass it as `ref={...}` on the element you want the spotlight to
 * highlight.
 */
export const useCoachmarkAnchor = (id: string): ((view: View | null) => void) => {
  const { register } = useCoachmarkAnchorContext();
  return useCallback(
    (view: View | null) => {
      register(id, view);
    },
    [id, register]
  );
};

export const useMeasureAnchor = () => {
  const { measure } = useCoachmarkAnchorContext();
  return measure;
};
