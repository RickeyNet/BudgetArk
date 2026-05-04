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

/** Set of nonces seen this session for replay protection */
const seenNonces = new Set<string>();

/** Max age of a message timestamp before it's rejected (5 minutes) */
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;

/* ─── Encryption helpers (mirrors encryptedStorage pattern) ─── */

const encryptPayload = (plaintext: string, key: string): { encrypted: string; hmac: string } => {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key).toString();
  const hmac = CryptoJS.HmacSHA256(encrypted, key).toString(CryptoJS.enc.Hex);
  return { encrypted, hmac };
};

const decryptPayload = (encrypted: string, hmac: string, key: string): string | null => {
  const calculatedHmac = CryptoJS.HmacSHA256(encrypted, key).toString(CryptoJS.enc.Hex);
  if (calculatedHmac !== hmac) return null;
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
  const { encrypted, hmac } = encryptPayload(plaintext, key);
  const message: SyncMessage = {
    type,
    senderId,
    timestamp: new Date().toISOString(),
    nonce: generateUUID(),
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

  // Verify sender (skip check during pairing when partner ID is unknown)
  if (expectedSenderId && msg.senderId !== expectedSenderId) return null;

  // Replay protection: reject seen nonces
  if (seenNonces.has(msg.nonce)) return null;
  seenNonces.add(msg.nonce);

  // Reject stale messages
  const age = Date.now() - new Date(msg.timestamp).getTime();
  if (Math.abs(age) > MAX_MESSAGE_AGE_MS) return null;

  // Decrypt and verify integrity
  const payload = decryptPayload(msg.payload, msg.hmac, key);
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
      reject(err);
    });
  });
};

/**
 * Clear seen nonces (call at end of sync session).
 */
export const resetReplayProtection = (): void => {
  seenNonces.clear();
};
