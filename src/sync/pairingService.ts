/**
 * BudgetArk - Pairing Service
 * File: src/sync/pairingService.ts
 *
 * Handles the one-time pairing flow between two devices.
 * Uses a 6-digit code for mutual authentication and establishes
 * a shared secret for all future sync communication.
 */

import { Platform, PermissionsAndroid } from "react-native";
import CryptoJS from "crypto-js";
import NetInfo from "@react-native-community/netinfo";

// Ensure SSID fetching is enabled before any NetInfo.fetch() call
NetInfo.configure({ shouldFetchWiFiSSID: true });
import { generateUUID } from "../utils/uuid";
import { getOrCreateUser } from "../storage/userStorage";
import { savePairingState } from "./pairingStorage";
import * as Discovery from "./discoveryService";
import * as Transport from "./transportService";
import type { PairingState, PairOfferPayload, PairAcceptPayload } from "./types";

/** Get this device's LAN IP address */
const getLocalIp = async (): Promise<string | null> => {
  // On Android, location permission may be needed for WiFi details (especially GrapheneOS)
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (!granted) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Network Permission",
            message:
              "BudgetArk needs this permission to display your device's IP address for pairing.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
          }
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return null;
        }
      }
    } catch {
      // Fall through - try NetInfo anyway
    }
  }

  const state = await NetInfo.fetch();
  if (state.type === "wifi" && state.isConnected) {
    return (state.details as any)?.ipAddress ?? null;
  }
  return null;
};

/**
 * Crockford base32 alphabet - 32 unambiguous chars (no I, L, O, U).
 * Codes are normalized before use so users typing "I" / "L" / "O" still
 * land on the canonical "1" / "1" / "0" sibling characters.
 */
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const CODE_RAW_LENGTH = 8; // 8 chars × 5 bits = 40 bits of entropy
const FINGERPRINT_RAW_LENGTH = 6; // 6 chars × 5 bits = 30 bits, ~1-in-1B coincidence

const wordArrayToCrockford = (random: CryptoJS.lib.WordArray, chars: number): string => {
  const hex = random.toString(CryptoJS.enc.Hex);
  let bits = "";
  for (let i = 0; i < chars; i++) {
    // 5 bits per char → need ceil(chars * 5 / 4) hex digits
    bits += parseInt(hex[i], 16).toString(2).padStart(4, "0");
  }
  // Pull additional hex if needed to cover the bit budget
  const neededHex = Math.ceil((chars * 5) / 4);
  for (let i = chars; i < neededHex; i++) {
    bits += parseInt(hex[i], 16).toString(2).padStart(4, "0");
  }
  let out = "";
  for (let i = 0; i < chars * 5; i += 5) {
    out += CROCKFORD_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
};

/**
 * Generate a random pairing code. Format: `XXXX-XXXX` (8 Crockford
 * base32 chars, ~40 bits of entropy). Earlier versions used a 6-digit
 * numeric code (~20 bits), which a passive LAN observer who captured
 * the encrypted PAIR_OFFER could brute-force offline against the
 * fixed-salt PBKDF2 in roughly a day on a single GPU. 40 bits raises
 * that to centuries on the same hardware.
 */
export const generatePairingCode = (): string => {
  const random = CryptoJS.lib.WordArray.random(5); // 40 bits raw
  const raw = wordArrayToCrockford(random, CODE_RAW_LENGTH);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
};

/**
 * Normalize a user-typed pairing code: uppercase, strip whitespace and
 * dashes, fold Crockford-confusable characters (I/L → 1, O → 0).
 * Returns the canonical 8-char form (or shorter if the user hasn't
 * finished typing).
 */
export const normalizePairingCode = (input: string): string => {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .slice(0, CODE_RAW_LENGTH);
};

/**
 * Compute the short fingerprint of an established sharedSecret. Both
 * devices display this after the key exchange so the user can verify
 * the secrets match - if a wrong code or a MITM produced two different
 * `sharedSecret` values, the fingerprints will differ and the user
 * cancels before the pairing is committed to storage.
 *
 * Format: `XXX-XXX` (6 Crockford chars = 30 bits).
 */
export const computeFingerprint = (sharedSecret: string): string => {
  const hash = CryptoJS.SHA256(sharedSecret);
  const raw = wordArrayToCrockford(hash, FINGERPRINT_RAW_LENGTH);
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
};

/**
 * Derive a temporary key from the pairing code using PBKDF2.
 * The salt label is bumped to v2 so any captured v1 (6-digit) frames
 * cannot be replayed against a v2 handshake - different keys, different
 * HMACs, validation rejects.
 */
const deriveKeyFromCode = (code: string): string => {
  const normalized = normalizePairingCode(code);
  const key = CryptoJS.PBKDF2(normalized, "budgetark-pairing-v2", {
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
 * Result of a successful key exchange. The pairing is *not* yet persisted -
 * the UI must show the fingerprint to the user, ask them to confirm it
 * matches the partner device, and then call `commit()`. If the user reports
 * a mismatch (or just dismisses), the caller drops the result and nothing
 * is written to storage.
 */
export interface PendingPairing {
  pairingState: PairingState;
  /** 6-char Crockford fingerprint, formatted `XXX-XXX`, displayed on both devices */
  fingerprint: string;
  /** Persist the pairing to encrypted storage */
  commit: () => Promise<void>;
}

/**
 * Initiator flow: generate code, advertise, wait for partner to connect.
 * Resolves with a PendingPairing once the key exchange completes; the
 * caller must call `commit()` after the user confirms the fingerprint.
 */
export const startPairingAsInitiator = (
  code: string,
  onTimeout?: () => void,
  onServerReady?: (ip: string | null, port: number, closeServer: (() => void) | null) => void
): Promise<PendingPairing> => {
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
      // Start TCP server - onListening fires as soon as the port is assigned,
      // BEFORE any client connects, so we can advertise and show the address.
      const { connection, port } = await Transport.startServer(
        user.id,
        "", // We don't know the partner ID yet during pairing
        tempKey,
        async (listenPort, closeServer) => {
          // Advertise via Zeroconf immediately
          Discovery.publish(user.id, listenPort);
          // Show IP:port to user
          const localIp = await getLocalIp();
          onServerReady?.(localIp, listenPort, closeServer);
        }
      );

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

            // Build the pending pairing - caller must call commit()
            // after the user confirms the fingerprint matches.
            const pairingState: PairingState = {
              partnerId: offer.userId,
              partnerName: offer.displayName,
              sharedSecret: offer.sharedSecret,
              pairedAt: new Date().toISOString(),
              autoSyncEnabled: false,
            };

            clearTimeout(timer);
            settled = true;

            // Cleanup after a short delay to let the ACK send
            setTimeout(() => {
              connection.close();
              Discovery.stop();
            }, 500);

            resolve({
              pairingState,
              fingerprint: computeFingerprint(offer.sharedSecret),
              commit: () => savePairingState(pairingState),
            });
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
 * Resolves with a PendingPairing; caller must call `commit()` after the
 * user confirms the fingerprint matches.
 */
export const joinPairing = async (
  code: string,
  manualAddress?: { host: string; port: number }
): Promise<PendingPairing> => {
  const user = await getOrCreateUser();
  const tempKey = deriveKeyFromCode(code);
  const sharedSecret = generateSharedSecret();

  let host: string;
  let port: number;

  if (manualAddress) {
    // Manual IP:port provided - skip mDNS discovery
    host = manualAddress.host;
    port = manualAddress.port;
  } else {
    // Discover the initiator on the LAN via mDNS
    const peer = await Discovery.discoverPartner("", PAIRING_TIMEOUT_MS);

    if (!peer) {
      throw new Error("Could not find partner on the network. Make sure both devices are on the same WiFi, or use manual IP.");
    }
    host = peer.host;
    port = peer.port;
  }

  // Connect via TCP
  const connection = await Transport.connectToHost(
    host,
    port,
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

          setTimeout(() => connection.close(), 500);
          resolve({
            pairingState,
            fingerprint: computeFingerprint(sharedSecret),
            commit: () => savePairingState(pairingState),
          });
        } catch (err) {
          connection.close();
          reject(new Error("Invalid pairing response"));
        }
      }
    });
  });
};
