/**
 * BudgetArk - Sync Orchestrator
 * File: src/sync/syncOrchestrator.ts
 *
 * Coordinates the full P2P sync flow:
 * 1. Discover partner via Zeroconf
 * 2. Connect via TCP
 * 3. Exchange encrypted diffs
 * 4. Apply changes and update sync metadata
 */

import { getOrCreateUser } from "../storage/userStorage";
import { getPairingState, getSyncMetadata, updateSyncMetadata } from "./pairingStorage";
import * as Discovery from "./discoveryService";
import * as Transport from "./transportService";
import {
  computeOutgoingDiff,
  applyIncomingDiff,
  markBackfillSyncDone,
} from "./diffEngine";
import type { SyncResult, SyncStatus, SyncDiff } from "./types";

export type SyncStatusCallback = (status: SyncStatus) => void;

interface ServerSyncHandle {
  result: Promise<SyncResult>;
  cancel: () => void;
}

/**
 * Runs a full sync cycle as the server (waits for partner to connect).
 * Used when this device is discovered first.
 *
 * Returns a handle so the caller can cancel a pending server-mode sync -
 * e.g. when the fallback path in `syncNow` discovers the partner mid-wait
 * and switches to client mode. Cancelling tears down the TCP server and
 * stops Zeroconf advertising so they don't leak.
 */
const syncAsServer = (onStatus: SyncStatusCallback): ServerSyncHandle => {
  let cancelHandler: () => void = () => {
    Discovery.stop();
  };
  let cancelled = false;

  const result = (async (): Promise<SyncResult> => {
    const pairing = await getPairingState();
    if (!pairing) throw new Error("Not paired");

    const user = await getOrCreateUser();
    const syncMeta = await getSyncMetadata();

    onStatus("connecting");

    // Start TCP server - publish via Zeroconf as soon as the port is assigned
    // (before any client connects) so the partner can discover us.
    const { connection, port } = await Transport.startServer(
      user.id,
      pairing.partnerId,
      pairing.sharedSecret,
      (listenPort, closeServer) => {
        // While we're waiting for a partner, cancel = close the listening
        // server (which rejects the startServer promise) and stop discovery.
        cancelHandler = () => {
          closeServer();
          Discovery.stop();
        };
        if (cancelled) {
          cancelHandler();
          return;
        }
        Discovery.publish(user.id, listenPort);
      }
    );

    // After a partner has connected, cancel = tear down the live connection
    // (which also closes the underlying server) and stop discovery.
    cancelHandler = () => {
      connection.close();
      Discovery.stop();
    };

    return new Promise<SyncResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.close();
        Discovery.stop();
        reject(new Error("Sync timed out waiting for partner"));
      }, 30_000);

      connection.onMessage(async (msg, payload) => {
        try {
          if (msg.type === "SYNC_REQUEST") {
            // Received partner's diff
            const partnerDiff = JSON.parse(payload) as SyncDiff;

            onStatus("syncing");

            // Apply incoming diff
            const received = await applyIncomingDiff(partnerDiff);

            // Compute and send our diff
            const ourDiff = await computeOutgoingDiff(syncMeta.lastSyncTimestamp);
            connection.send("SYNC_RESPONSE", ourDiff);

            // Wait for ACK
            connection.onMessage(async (ackMsg) => {
              if (ackMsg.type === "SYNC_ACK") {
                clearTimeout(timeout);

                const now = new Date().toISOString();
                await updateSyncMetadata(now);
                // Full-history backlog (net worth, categories) has been
                // delivered - future diffs can go back to incremental.
                await markBackfillSyncDone();

                connection.close();
                Discovery.stop();
                Transport.resetReplayProtection();

                onStatus("complete");
                resolve({
                  success: true,
                  recordsSent: countDiffEntries(ourDiff),
                  recordsReceived: received,
                  timestamp: now,
                });
              }
            });
          }
        } catch (err) {
          clearTimeout(timeout);
          connection.close();
          Discovery.stop();
          reject(err);
        }
      });
    });
  })();

  return {
    result,
    cancel: () => {
      cancelled = true;
      cancelHandler();
    },
  };
};

/**
 * Runs a full sync cycle as the client (connects to partner's server).
 */
const syncAsClient = async (
  partnerHost: string,
  partnerPort: number,
  onStatus: SyncStatusCallback
): Promise<SyncResult> => {
  const pairing = await getPairingState();
  if (!pairing) throw new Error("Not paired");

  const user = await getOrCreateUser();
  const syncMeta = await getSyncMetadata();

  onStatus("connecting");

  const connection = await Transport.connectToHost(
    partnerHost,
    partnerPort,
    user.id,
    pairing.partnerId,
    pairing.sharedSecret
  );

  onStatus("syncing");

  // Compute and send our diff
  const ourDiff = await computeOutgoingDiff(syncMeta.lastSyncTimestamp);
  connection.send("SYNC_REQUEST", ourDiff);

  // Wait for partner's diff
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      connection.close();
      reject(new Error("Sync timed out waiting for response"));
    }, 30_000);

    connection.onMessage(async (msg, payload) => {
      try {
        if (msg.type === "SYNC_RESPONSE") {
          const partnerDiff = JSON.parse(payload) as SyncDiff;

          // Apply incoming diff
          const received = await applyIncomingDiff(partnerDiff);

          // Send ACK
          connection.send("SYNC_ACK", { ok: true });

          clearTimeout(timeout);

          const now = new Date().toISOString();
          await updateSyncMetadata(now);
          // Same backlog stamp as the server path.
          await markBackfillSyncDone();

          setTimeout(() => connection.close(), 500);
          Transport.resetReplayProtection();

          onStatus("complete");
          resolve({
            success: true,
            recordsSent: countDiffEntries(ourDiff),
            recordsReceived: received,
            timestamp: now,
          });
        }
      } catch (err) {
        clearTimeout(timeout);
        connection.close();
        reject(err);
      }
    });
  });
};

/**
 * Main entry point: discover partner and sync.
 * Tries to find the partner first (act as client), otherwise
 * advertises and waits (act as server).
 */
export const syncNow = async (
  onStatus: SyncStatusCallback = () => {}
): Promise<SyncResult> => {
  const pairing = await getPairingState();
  if (!pairing) {
    return {
      success: false,
      recordsSent: 0,
      recordsReceived: 0,
      timestamp: new Date().toISOString(),
      error: "Not paired with a partner",
    };
  }

  try {
    onStatus("discovering");

    // Try to find partner's service first (we become the client)
    let peer = await Discovery.discoverPartner(pairing.partnerId, 10_000);

    if (peer) {
      return await syncAsClient(peer.host, peer.port, onStatus);
    }

    // Partner not found - start server and advertise, but also keep
    // scanning in case the partner starts their server around the same time.
    // This avoids the deadlock where both devices become servers.
    const serverHandle = syncAsServer(onStatus);

    // Scan again - if partner also started a server we'll find them.
    const retryPeer = await Discovery.discoverPartner(pairing.partnerId, 8_000);
    if (retryPeer) {
      // Found partner's server - tear down our own server + advertising
      // before switching to client mode, so we don't leak a listening TCP
      // socket and a stale Zeroconf publish.
      serverHandle.cancel();
      serverHandle.result.catch(() => {});
      return await syncAsClient(retryPeer.host, retryPeer.port, onStatus);
    }

    // No luck - wait for partner to connect to our server
    return await serverHandle.result;
  } catch (err) {
    onStatus("error");
    // A frame from the partner with a missing/different protocol version
    // means "their app is on an incompatible version", not a network
    // problem - say so instead of the generic timeout it surfaces as.
    // (Read before `finally` runs resetReplayProtection, which clears it.)
    const versionMismatch = Transport.wasProtocolMismatchSeen();
    return {
      success: false,
      recordsSent: 0,
      recordsReceived: 0,
      timestamp: new Date().toISOString(),
      error: versionMismatch
        ? "Your partner's device is on an incompatible app version. Update BudgetArk on both devices, then sync again."
        : err instanceof Error
          ? err.message
          : "Sync failed",
    };
  } finally {
    // Always tear down discovery + the replay-protection nonce set so the
    // next sync starts from a clean slate. Inner happy paths also call
    // these - calling twice is idempotent. The finally form covers timeout
    // closures and other internal failures that don't bubble through the
    // outer catch.
    Discovery.stop();
    Transport.resetReplayProtection();
  }
};

/** Count total diff entries for reporting */
const countDiffEntries = (diff: SyncDiff): number => {
  return (
    diff.debts.length +
    diff.payments.length +
    diff.budgetEntries.length +
    diff.savingsGoals.length +
    (diff.assetAccounts?.length ?? 0) +
    diff.budgetLimits.length +
    // Optional-chained like assetAccounts: these fields were added after
    // launch, so a diff built by an older peer may omit them entirely.
    (diff.customCategories?.length ?? 0) +
    Object.keys(diff.categoryBucketOverrides ?? {}).length +
    (diff.netWorthSnapshots?.length ?? 0) +
    (diff.debtMilestonePlan ? 1 : 0) +
    (diff.payoffStrategy ? 1 : 0)
  );
};
