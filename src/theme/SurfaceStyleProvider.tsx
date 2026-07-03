import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as EncryptedStorage from "../storage/encryptedStorage";
import {
  SURFACE_STYLE_BY_ID,
  SURFACE_STYLE_PRESETS,
  type SurfaceStylePreset,
} from "./surfaceStyles";
import { SURFACE_STYLE_KEY, getAppearanceBoot } from "./appearanceBoot";

type SurfaceStyleContextValue = Readonly<{
  /** Raw persisted choice. Null means "use legacy/theme fallback". */
  surfaceStyleId: SurfaceStylePreset["id"] | null;
  presets: readonly SurfaceStylePreset[];
  setSurfaceStyleId: (id: SurfaceStylePreset["id"]) => Promise<void>;
}>;

const SurfaceStyleContext = createContext<SurfaceStyleContextValue | null>(null);

export const SurfaceStyleProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [surfaceStyleId, setSurfaceStyleIdState] = useState<SurfaceStylePreset["id"] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Shared boot read (see appearanceBoot.ts) - avoids a serialized
        // per-provider storage round-trip on the startup path.
        const stored = (await getAppearanceBoot()).surfaceStyle;
        if (cancelled) return;
        if (stored === "solid" || stored === "glass") {
          setSurfaceStyleIdState(stored);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSurfaceStyleId = useCallback(async (id: SurfaceStylePreset["id"]) => {
    if (!SURFACE_STYLE_BY_ID[id]) return;
    setSurfaceStyleIdState(id);
    await EncryptedStorage.setItem(SURFACE_STYLE_KEY, id);
  }, []);

  const value = useMemo<SurfaceStyleContextValue>(
    () => ({
      surfaceStyleId,
      presets: SURFACE_STYLE_PRESETS,
      setSurfaceStyleId,
    }),
    [surfaceStyleId, setSurfaceStyleId]
  );

  return (
    <SurfaceStyleContext.Provider value={value}>
      {ready ? children : null}
    </SurfaceStyleContext.Provider>
  );
};

export const useSurfaceStyle = (): SurfaceStyleContextValue => {
  const ctx = useContext(SurfaceStyleContext);
  if (!ctx) {
    throw new Error("useSurfaceStyle() must be used inside <SurfaceStyleProvider>.");
  }
  return ctx;
};
