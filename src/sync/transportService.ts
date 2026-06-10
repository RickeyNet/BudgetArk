/**
 * BudgetArk - TCP Transport Service
 * File: src/sync/transportService.ts
 *
 * Manages encrypted TCP connections between paired devices.
 * Messages are framed with a 4-byte length prefix, encrypted with AES-256,
 * and signed with HMAC-SHA256 for integrity.
 */

import { Buffer } from "buffer";
import TcpSocket from "react-native-tcp-socket";
import CryptoJS from "crypto-js";
import { generateUUID } from "../utils/uuid";
import type { SyncMessage, SyncMessageType } from "./types";

/** Max age of a message timestamp before it's rejected (5 minutes) */
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;

/**
 * Replay-protection map: nonce → timestamp the nonce was first seen.
 * A `Set<string>` would grow unboundedly as a peer sent more frames; this
 * map gets pruned on every insert so any nonce older than `MAX_MESSAGE_AGE_MS`
 * is dropped (the timestamp validator already rejects messages that old, so
 * those nonces can't be replayed successfully anyway).
 */
const seenNonces = new Map<string, number>();
const NONCE_PRUNE_THRESHOLD = 1024;

/**
 * Set when a frame that otherwise looks like a sync message carries a
 * missing or different protocol version (a v1 peer's frames have no `v` at
 * all). The frame is still dropped, but the orchestrator reads this flag
 * when the sync fails so it can say "partner needs the app update" instead
 * of a generic timeout. Only covers the direction where the outdated peer
 * sends first - a v1 *server* silently drops our v2 frames (its
 * ciphertext-only HMAC never matches) and we never see a frame to inspect.
 */
let protocolMismatchSeen = false;

export const wasProtocolMismatchSeen = (): boolean => protocolMismatchSeen;

const pruneSeenNonces = (now: number): void => {
  for (const [nonce, seenAt] of seenNonces) {
    if (now - seenAt > MAX_MESSAGE_AGE_MS) {
      seenNonces.delete(nonce);
    }
  }
};

/* ─── Encryption helpers (mirrors encryptedStorage pattern) ─── */

/**
 * Sync protocol version. v2 widened the HMAC to cover the full message
 * envelope - v1 signed only the ciphertext, which let anyone on the LAN
 * re-wrap a captured payload+hmac pair in a fresh envelope (new timestamp,
 * new nonce, any message type) that passed every check, defeating replay
 * protection. v1 frames are rejected outright: accepting them for
 * compatibility would let an attacker downgrade back to the broken scheme.
 * A peer still on v1 sees a sync timeout until it updates the app.
 */
export const PROTOCOL_VERSION = 2;

/**
 * Canonical byte string the envelope HMAC is computed over. Every field a
 * receiver acts on must be inside the MAC.
 */
const envelopeMacInput = (
  type: string,
  senderId: string,
  timestamp: string,
  nonce: string,
  encrypted: string
): string =>
  `${PROTOCOL_VERSION}|${type}|${senderId}|${timestamp}|${nonce}|${encrypted}`;

const decryptPayload = (encrypted: string, key: string): string | null => {
  const bytes = CryptoJS.AES.decrypt(encrypted, key);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  return plaintext || null;
};

/* ─── Message framing ─── */

/**
 * Frames a JSON string with a 4-byte big-endian length prefix.
 * This allows the receiver to know exactly how many bytes to expect.
 */
const frameMessage = (json: string): Buffer => {
  const body = Buffer.from(json, "utf-8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
};

/* ─── Public API ─── */

export interface TransportConnection {
  send: (type: SyncMessageType, payload: object) => void;
  onMessage: (callback: (msg: SyncMessage, decryptedPayload: string) => void) => void;
  close: () => void;
}

/**
 * Creates an encrypted SyncMessage and sends it over the socket.
 */
const buildAndSend = (
  socket: any,
  senderId: string,
  key: string,
  type: SyncMessageType,
  payload: object
): void => {
  const plaintext = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key).toString();
  const timestamp = new Date().toISOString();
  const nonce = generateUUID();
  const hmac = CryptoJS.HmacSHA256(
    envelopeMacInput(type, senderId, timestamp, nonce, encrypted),
    key
  ).toString(CryptoJS.enc.Hex);
  const message: SyncMessage = {
    v: PROTOCOL_VERSION,
    type,
    senderId,
    timestamp,
    nonce,
    payload: encrypted,
    hmac,
  };
  const frame = frameMessage(JSON.stringify(message));
  socket.write(frame);
};

/**
 * Validates and decrypts an incoming SyncMessage.
 * Returns the decrypted payload string or null if invalid.
 */
const validateAndDecrypt = (
  raw: string,
  expectedSenderId: string,
  key: string
): { msg: SyncMessage; payload: string } | null => {
  let msg: SyncMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    typeof msg.type !== "string" ||
    typeof msg.senderId !== "string" ||
    typeof msg.timestamp !== "string" ||
    typeof msg.nonce !== "string" ||
    typeof msg.payload !== "string" ||
    typeof msg.hmac !== "string"
  ) {
    return null;
  }

  if (msg.v !== PROTOCOL_VERSION) {
    // Shaped like a real sync frame but wrong (or pre-v2 absent) version -
    // almost certainly a peer on a different app version, not garbage.
    protocolMismatchSeen = true;
    return null;
  }

  // Authenticate the full envelope BEFORE trusting any field in it. The MAC
  // covers type/senderId/timestamp/nonce, so a forged or re-wrapped envelope
  // fails here and never reaches the replay/age checks below.
  const calculatedHmac = CryptoJS.HmacSHA256(
    envelopeMacInput(msg.type, msg.senderId, msg.timestamp, msg.nonce, msg.payload),
    key
  ).toString(CryptoJS.enc.Hex);
  if (calculatedHmac !== msg.hmac) return null;

  // Verify sender (skip check during pairing when partner ID is unknown)
  if (expectedSenderId && msg.senderId !== expectedSenderId) return null;

  // Reject stale messages first so we never insert nonces we'd just have to
  // prune anyway.
  const now = Date.now();
  const age = now - new Date(msg.timestamp).getTime();
  if (Math.abs(age) > MAX_MESSAGE_AGE_MS) return null;

  // Replay protection: reject seen nonces. Prune the map first if it's grown
  // past the threshold so the working set stays bounded.
  if (seenNonces.size > NONCE_PRUNE_THRESHOLD) pruneSeenNonces(now);
  if (seenNonces.has(msg.nonce)) return null;
  seenNonces.set(msg.nonce, now);

  const payload = decryptPayload(msg.payload, key);
  if (!payload) return null;

  return { msg, payload };
};

/**
 * Start a TCP server and wait for one connection.
 * Returns a promise that resolves with the connection and the allocated port.
 */
export const startServer = (
  senderId: string,
  expectedPartnerId: string,
  key: string,
  onListening?: (port: number, closeServer: () => void) => void
): Promise<{ connection: TransportConnection; port: number }> => {
  return new Promise((resolve, reject) => {
    let messageCallback: ((msg: SyncMessage, payload: string) => void) | null = null;
    let connected = false;

    const server = TcpSocket.createServer((socket: any) => {
      let buffer = Buffer.alloc(0);

      const connection: TransportConnection = {
        send: (type, payload) => buildAndSend(socket, senderId, key, type, payload),
        onMessage: (cb) => { messageCallback = cb; },
        close: () => {
          socket.destroy();
          server.close();
        },
      };

      socket.on("data", (data: string | Buffer) => {
        const chunk = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
        buffer = Buffer.concat([buffer, chunk]);

        // Process complete frames
        while (buffer.length >= 4) {
          const messageLength = buffer.readUInt32BE(0);
          if (buffer.length < 4 + messageLength) break;

          const json = buffer.slice(4, 4 + messageLength).toString("utf-8");
          buffer = buffer.slice(4 + messageLength);

          const result = validateAndDecrypt(json, expectedPartnerId, key);
          if (result && messageCallback) {
            messageCallback(result.msg, result.payload);
          }
        }
      });

      socket.on("error", (_err: any) => {
        server.close();
      });

      connected = true;
      resolve({ connection, port: (server.address() as any)?.port ?? 0 });
    });

    server.on("error", (err: any) => {
      if (!connected) reject(err);
    });

    // Reject the promise if the server is closed before any client connects.
    // Lets callers cancel a pending server-mode sync (e.g. when fallback path
    // discovers the partner mid-wait and switches to client mode).
    server.on("close", () => {
      if (!connected) reject(new Error("Sync server closed before partner connected"));
    });

    // Listen on port 0 to let the OS assign an available port.
    // Fire onListening as soon as the server is ready (before any client connects)
    // so the caller can advertise the address and show it to the user.
    server.listen({ port: 0, host: "0.0.0.0" }, () => {
      const assignedPort = (server.address() as any)?.port ?? 0;
      onListening?.(assignedPort, () => server.close());
    });
  });
};

/**
 * Connect to a remote TCP server as a client.
 */
export const connectToHost = (
  host: string,
  port: number,
  senderId: string,
  expectedPartnerId: string,
  key: string
): Promise<TransportConnection> => {
  return new Promise((resolve, reject) => {
    let messageCallback: ((msg: SyncMessage, payload: string) => void) | null = null;
    let buffer = Buffer.alloc(0);

    const socket = TcpSocket.createConnection(
      { host, port },
      () => {
        const connection: TransportConnection = {
          send: (type, payload) => buildAndSend(socket, senderId, key, type, payload),
          onMessage: (cb) => { messageCallback = cb; },
          close: () => { socket.destroy(); },
        };
        resolve(connection);
      }
    );

    socket.on("data", (data: string | Buffer) => {
      const chunk = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 4) {
        const messageLength = buffer.readUInt32BE(0);
        if (buffer.length < 4 + messageLength) break;

        const json = buffer.slice(4, 4 + messageLength).toString("utf-8");
        buffer = buffer.slice(4 + messageLength);

        const result = validateAndDecrypt(json, expectedPartnerId, key);
        if (result && messageCallback) {
          messageCallback(result.msg, result.payload);
        }
      }
    });

    socket.on("error", (err: any) => {
      // After the connect callback has resolved the promise, this reject is
      // a no-op - but the socket must still be torn down, or a mid-session
      // connection drop leaks it (and its data listener) until app restart.
      socket.destroy();
      reject(err);
    });
  });
};

/**
 * Clear seen nonces and the protocol-mismatch flag (call at end of sync
 * session). The orchestrator reads the mismatch flag in its error path
 * BEFORE its finally block calls this, so the reset never races the check.
 */
export const resetReplayProtection = (): void => {
  seenNonces.clear();
  protocolMismatchSeen = false;
};
