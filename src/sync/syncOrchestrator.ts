/**
 * BudgetArk — Sync Orchestrator
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
import { computeOutgoingDiff, applyIncomingDiff } from "./diffEngine";
import type { SyncResult, SyncStatus, SyncDiff } from "./types";

export type SyncStatusCallback = (status: SyncStatus) => void;

/**
 * Runs a full sync cycle as the server (waits for partner to connect).
 * Used when this device is discovered first.
 */
const syncAsServer = async (
  onStatus: SyncStatusCallback
): Promise<SyncResult> => {
  const pairing = await getPairingState();
  if (!pairing) throw new Error("Not paired");

  const user = await getOrCreateUser();
  const syncMeta = await getSyncMetadata();

  onStatus("connecting");

  // Start TCP server — publish via Zeroconf as soon as the port is assigned
  // (before any client connects) so the partner can discover us.
  const { connection, port } = await Transport.startServer(
    user.id,
    pairing.partnerId,
    pairing.sharedSecret,
    (listenPort) => {
      Discovery.publish(user.id, listenPort);
    }
  );

  return new Promise((resolve, reject) => {
    let partnerDiff: SyncDiff | null = null;
    const timeout = setTimeout(() => {
      connection.close();
      Discovery.stop();
      reject(new Error("Sync timed out waiting for partner"));
    }, 30_000);

    connection.onMessage(async (msg, payload) => {
      try {
        if (msg.type === "SYNC_REQUEST") {
          // Received partner's diff
          partnerDiff = JSON.parse(payload) as SyncDiff;

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

    // Partner not found — start server and advertise, but also keep
    // scanning in case the partner starts their server around the same time.
    // This avoids the deadlock where both devices become servers.
    const serverPromise = syncAsServer(onStatus);

    // Scan again — if partner also started a server we'll find them.
    const retryPeer = await Discovery.discoverPartner(pairing.partnerId, 8_000);
    if (retryPeer) {
      // Found partner's server — connect as client instead.
      // Let the abandoned server promise timeout silently.
      serverPromise.catch(() => {});
      return await syncAsClient(retryPeer.host, retryPeer.port, onStatus);
    }

    // No luck — wait for partner to connect to our server
    return await serverPromise;
  } catch (err) {
    onStatus("error");
    Discovery.stop();
    Transport.resetReplayProtection();
    return {
      success: false,
      recordsSent: 0,
      recordsReceived: 0,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
};

/** Count total diff entries for reporting */
const countDiffEntries = (diff: SyncDiff): number => {
  return (
    diff.debts.length +
    diff.payments.length +
    diff.budgetEntries.length +
    diff.savingsGoals.length +
    diff.budgetLimits.length +
    (diff.debtMilestonePlan ? 1 : 0) +
    (diff.payoffStrategy ? 1 : 0)
  );
};
