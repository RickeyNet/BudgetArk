/**
 * BudgetArk — Pairing Service
 * File: src/sync/pairingService.ts
 *
 * Handles the one-time pairing flow between two devices.
 * Uses a 6-digit code for mutual authentication and establishes
 * a shared secret for all future sync communication.
 */

import CryptoJS from "crypto-js";
import { generateUUID } from "../utils/uuid";
import { getOrCreateUser } from "../storage/userStorage";
import { savePairingState } from "./pairingStorage";
import * as Discovery from "./discoveryService";
import * as Transport from "./transportService";
import type { PairingState, PairOfferPayload, PairAcceptPayload } from "./types";

/** Generate a random 6-digit pairing code */
export const generatePairingCode = (): string => {
  const array = new Uint32Array(1);
  // Use crypto-js random as a fallback-safe source
  const random = CryptoJS.lib.WordArray.random(4);
  const num = parseInt(random.toString(CryptoJS.enc.Hex).slice(0, 8), 16);
  return String(num % 1_000_000).padStart(6, "0");
};

/** Derive a temporary key from the 6-digit code using PBKDF2 */
const deriveKeyFromCode = (code: string): string => {
  const key = CryptoJS.PBKDF2(code, "budgetark-pairing-salt", {
    keySize: 256 / 32,
    iterations: 100_000,
  });
  return key.toString(CryptoJS.enc.Hex);
};

/** Generate a 256-bit shared secret for future sync encryption */
const generateSharedSecret = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
};

const PAIRING_TIMEOUT_MS = 60_000;

/**
 * Initiator flow: generate code, advertise, wait for partner to connect.
 * Returns the established PairingState.
 */
export const startPairingAsInitiator = (
  code: string,
  onTimeout?: () => void
): Promise<PairingState> => {
  return new Promise(async (resolve, reject) => {
    const user = await getOrCreateUser();
    const tempKey = deriveKeyFromCode(code);
    const sharedSecret = generateSharedSecret();

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        Discovery.stop();
        onTimeout?.();
        reject(new Error("Pairing timed out"));
      }
    }, PAIRING_TIMEOUT_MS);

    try {
      // Start TCP server
      const { connection, port } = await Transport.startServer(
        user.id,
        "", // We don't know the partner ID yet during pairing
        tempKey
      );

      // Advertise via Zeroconf
      Discovery.publish(user.id, port);

      // Wait for PAIR_OFFER from joiner
      connection.onMessage(async (msg, decryptedPayload) => {
        if (settled) return;

        if (msg.type === "PAIR_OFFER") {
          try {
            const offer: PairOfferPayload = JSON.parse(decryptedPayload);

            // Send PAIR_ACCEPT
            const accept: PairAcceptPayload = {
              userId: user.id,
              displayName: user.displayName,
              confirmed: true,
            };
            connection.send("PAIR_ACCEPT", accept);

            // Save pairing state
            const pairingState: PairingState = {
              partnerId: offer.userId,
              partnerName: offer.displayName,
              sharedSecret: offer.sharedSecret,
              pairedAt: new Date().toISOString(),
              autoSyncEnabled: false,
            };
            await savePairingState(pairingState);

            clearTimeout(timer);
            settled = true;

            // Cleanup after a short delay to let the ACK send
            setTimeout(() => {
              connection.close();
              Discovery.stop();
            }, 500);

            resolve(pairingState);
          } catch (err) {
            // Invalid offer payload
          }
        }
      });
    } catch (err) {
      clearTimeout(timer);
      settled = true;
      Discovery.stop();
      reject(err);
    }
  });
};

/**
 * Joiner flow: enter code, discover partner, connect and exchange keys.
 * Returns the established PairingState.
 */
export const joinPairing = async (code: string): Promise<PairingState> => {
  const user = await getOrCreateUser();
  const tempKey = deriveKeyFromCode(code);
  const sharedSecret = generateSharedSecret();

  // Discover the initiator on the LAN
  // During pairing we look for any budgetark service (we don't know partner ID yet)
  const peer = await Discovery.discoverPartner("", PAIRING_TIMEOUT_MS);
  // Since we can't filter by partnerId during pairing, we'll accept the first service found
  // The code verification provides mutual authentication

  if (!peer) {
    throw new Error("Could not find partner on the network. Make sure both devices are on the same WiFi.");
  }

  // Connect via TCP
  const connection = await Transport.connectToHost(
    peer.host,
    peer.port,
    user.id,
    "", // Don't know partner ID yet
    tempKey
  );

  // Send PAIR_OFFER
  const offer: PairOfferPayload = {
    userId: user.id,
    displayName: user.displayName,
    sharedSecret,
  };
  connection.send("PAIR_OFFER", offer);

  // Wait for PAIR_ACCEPT
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      connection.close();
      reject(new Error("Pairing response timed out"));
    }, 15_000);

    connection.onMessage(async (msg, decryptedPayload) => {
      if (msg.type === "PAIR_ACCEPT") {
        clearTimeout(timer);

        try {
          const accept: PairAcceptPayload = JSON.parse(decryptedPayload);

          const pairingState: PairingState = {
            partnerId: accept.userId,
            partnerName: accept.displayName,
            sharedSecret,
            pairedAt: new Date().toISOString(),
            autoSyncEnabled: false,
          };
          await savePairingState(pairingState);

          setTimeout(() => connection.close(), 500);
          resolve(pairingState);
        } catch (err) {
          connection.close();
          reject(new Error("Invalid pairing response"));
        }
      }
    });
  });
};
