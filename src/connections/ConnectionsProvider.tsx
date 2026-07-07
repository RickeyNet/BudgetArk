/**
 * BudgetArk - Bank Connections Provider
 * File: src/connections/ConnectionsProvider.tsx
 *
 * Global context owning the connections list, the Review Inbox count, and
 * sync-in-progress state so the Profile section, Budget inbox badge, and tab
 * badge all read one reactive source. Mirrors CustomCategoriesProvider's
 * shape. Data itself stays in the per-device storage modules; this is a
 * read-through cache with explicit refresh points.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BankConnection, PendingTransaction } from "../types";
import { getConnections } from "../storage/connectionsStorage";
import { getPendingTransactions } from "../storage/reviewInboxStorage";
import {
  syncConnections,
  type ConnectionSyncResult,
} from "../services/connections/connectionsSyncService";

interface ConnectionsContextValue {
  connections: BankConnection[];
  pendingTransactions: PendingTransaction[];
  pendingCount: number;
  /** True when any connection needs re-auth or errored on its last sync. */
  needsAttention: boolean;
  isSyncing: boolean;
  isReady: boolean;
  /** Reload connections + inbox from storage (after wizard/approve/dismiss). */
  refresh: () => Promise<void>;
  /** Run a manual sync (all connections, or one), then refresh. */
  syncNow: (connectionId?: string) => Promise<ConnectionSyncResult[]>;
}

const ConnectionsContext = createContext<ConnectionsContextValue | null>(null);

export const ConnectionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextConnections, nextPending] = await Promise.all([
        getConnections(),
        getPendingTransactions(),
      ]);
      setConnections(nextConnections);
      setPendingTransactions(nextPending);
    } catch (error) {
      if (__DEV__) console.warn("Connections load failed:", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = useCallback(
    async (connectionId?: string): Promise<ConnectionSyncResult[]> => {
      setIsSyncing(true);
      try {
        const results = await syncConnections({ manual: true, connectionId });
        await refresh();
        return results;
      } finally {
        setIsSyncing(false);
      }
    },
    [refresh],
  );

  const needsAttention = useMemo(
    () => connections.some((c) => c.enabled && c.authStatus !== "ok"),
    [connections],
  );

  const value = useMemo<ConnectionsContextValue>(
    () => ({
      connections,
      pendingTransactions,
      pendingCount: pendingTransactions.length,
      needsAttention,
      isSyncing,
      isReady,
      refresh,
      syncNow,
    }),
    [
      connections,
      pendingTransactions,
      needsAttention,
      isSyncing,
      isReady,
      refresh,
      syncNow,
    ],
  );

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};

export const useConnections = (): ConnectionsContextValue => {
  const ctx = useContext(ConnectionsContext);
  if (!ctx) {
    throw new Error("useConnections must be used within ConnectionsProvider");
  }
  return ctx;
};
