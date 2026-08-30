/**
 * BudgetArk - TCP Transport Service
 * File: src/sync/transportService.ts
 *
 * Manages encrypted TCP connections between paired devices.
 * Messages are framed with a 4-byte length prefix, encrypted with AES-256,
 * and signed with HMAC-SHA256 for integrity.
 *
 * Trust model - deliberately pre-shared-key, NO forward secrecy: every
 * session encrypts with the single long-lived `sharedSecret` established at
 * pairing; there is no per-session ephemeral key exchange. If that secret
 * ever leaks (i.e. a paired device's storage is compromised), previously
 * captured LAN traffic becomes decryptable retroactively - accepted because
 * an attacker in that position already holds the live data outright, which
 * is strictly more than any recorded sync diff. Revisit only if sync ever
 * leaves the LAN. Full reasoning + upgrade path: docs/security.md. The
 * pairing server's 0.0.0.0 bind below is likewise deliberate (discovery
 * needs it) and documented there.
 */

import { Buffer } from "buffer";
import TcpSocket from "react-native-tcp-socket";
import CryptoJS from "crypto-js";
import { constantTimeEquals } from "../crypto/nativeCrypto";
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

/**
 * Hard ceiling on a single frame's declared length. The 4-byte prefix is
 * read BEFORE any authentication (HMAC verification needs the whole frame),
 * so without a cap any unauthenticated device on the LAN could declare a
 * 4 GB frame and stream data until the app OOMs. 16 MB is far above any
 * legitimate sync (a full first-sync diff with the 730-snapshot backlog is
 * hundreds of KB) while keeping the pre-auth buffer bounded.
 */
const MAX_FRAME_BYTES = 16 * 1024 * 1024;

/**
 * Incremental frame decoder shared by the server and client data handlers.
 *
 * Chunks accumulate in an array and are concatenated once per COMPLETE
 * frame - the previous `buffer = Buffer.concat([buffer, chunk])` per data
 * event re-copied the entire accumulated buffer per ~64 KB TCP chunk,
 * O(n²) on the JS thread during a large first sync.
 *
 * `onOversize` fires when a length prefix exceeds MAX_FRAME_BYTES; the
 * caller must treat the peer as hostile/broken and destroy the socket.
 * The reader drops its state and ignores all further data either way.
 */
const createFrameReader = (
  onFrame: (json: string) => void,
  onOversize: () => void
): ((data: string | Buffer) => void) => {
  let chunks: Buffer[] = [];
  let total = 0;
  let dead = false;

  return (data: string | Buffer): void => {
    if (dead) return;
    const chunk = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    chunks.push(chunk);
    total += chunk.length;

    while (total >= 4) {
      // The 4-byte header can straddle chunks; consolidate only then.
      if (chunks[0].length < 4) {
        chunks = [Buffer.concat(chunks)];
      }
      const messageLength = chunks[0].readUInt32BE(0);

      if (messageLength > MAX_FRAME_BYTES) {
        dead = true;
        chunks = [];
        total = 0;
        onOversize();
        return;
      }
      if (total < 4 + messageLength) return; // wait for more data - no copying

      const buf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
      const json = buf.slice(4, 4 + messageLength).toString("utf-8");
      const rest = buf.slice(4 + messageLength);
      chunks = rest.length > 0 ? [rest] : [];
      total = rest.length;

      onFrame(json);
      if (dead) return; // onFrame tore the connection down
    }
  };
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
  // Constant-time compare: a LAN peer measuring reply timing on forged
  // frames must not learn how many leading MAC characters were right.
  if (!constantTimeEquals(calculatedHmac, msg.hmac)) return null;

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
 * Start a TCP server and wait for the partner to connect AND authenticate.
 *
 * The partner slot is claimed by the first socket that delivers an
 * HMAC-valid frame, not by the first socket that merely connects. The old
 * connect-wins design let any device on the LAN occupy the slot during the
 * (user-visible, up to 60s) pairing/sync window - the real partner's frames
 * then went nowhere and the sync timed out. Unauthenticated connections now
 * just sit as candidates until the real partner proves itself; the losers
 * are destroyed at that moment.
 *
 * Because the promise resolves ON the first valid frame, that frame arrives
 * before the caller can register onMessage - it's buffered and replayed on
 * registration, so no SYNC_REQUEST / PAIR_OFFER is ever dropped.
 */
export const startServer = (
  senderId: string,
  expectedPartnerId: string,
  key: string,
  onListening?: (port: number, closeServer: () => void) => void
): Promise<{ connection: TransportConnection; port: number }> => {
  return new Promise((resolve, reject) => {
    let messageCallback: ((msg: SyncMessage, payload: string) => void) | null = null;
    let partnerSocket: any = null;
    let settled = false;
    const candidates: any[] = [];
    const pendingFrames: { msg: SyncMessage; payload: string }[] = [];

    const connection: TransportConnection = {
      send: (type, payload) => {
        if (partnerSocket) {
          buildAndSend(partnerSocket, senderId, key, type, payload);
        }
      },
      onMessage: (cb) => {
        messageCallback = cb;
        // Replay frames that arrived before registration (at minimum the
        // authenticating frame itself).
        while (pendingFrames.length > 0) {
          const frame = pendingFrames.shift()!;
          cb(frame.msg, frame.payload);
        }
      },
      close: () => {
        partnerSocket?.destroy();
        for (const candidate of candidates.splice(0)) candidate.destroy();
        server.close();
      },
    };

    const server = TcpSocket.createServer((socket: any) => {
      if (partnerSocket) {
        // Slot already claimed by an authenticated partner.
        socket.destroy();
        return;
      }
      candidates.push(socket);

      const dropCandidate = () => {
        const idx = candidates.indexOf(socket);
        if (idx >= 0) candidates.splice(idx, 1);
      };

      socket.on(
        "data",
        createFrameReader(
          (json) => {
            const result = validateAndDecrypt(json, expectedPartnerId, key);
            // Unauthenticated noise never claims the slot; the socket stays
            // a candidate and the real partner can still get through.
            if (!result) return;

            if (!partnerSocket) {
              partnerSocket = socket;
              dropCandidate();
              for (const other of candidates.splice(0)) other.destroy();
              if (!settled) {
                settled = true;
                resolve({ connection, port: (server.address() as any)?.port ?? 0 });
              }
            }
            if (socket !== partnerSocket) return; // losing candidate mid-teardown

            if (messageCallback) {
              messageCallback(result.msg, result.payload);
            } else {
              pendingFrames.push(result);
            }
          },
          () => {
            // Oversize length prefix from an unauthenticated peer - fail
            // closed at the framing layer (rule 15) before buffering
            // anything the HMAC hasn't vouched for.
            dropCandidate();
            socket.destroy();
          }
        )
      );

      socket.on("error", (_err: any) => {
        if (socket === partnerSocket) {
          // The authenticated session died - tear the server down (matches
          // the pre-candidate behavior for a live connection).
          server.close();
        } else {
          // A candidate failing must not kill the server while we're still
          // waiting for the real partner.
          dropCandidate();
          socket.destroy();
        }
      });
    });

    server.on("error", (err: any) => {
      if (!settled) reject(err);
    });

    // Reject the promise if the server is closed before a partner has
    // AUTHENTICATED (not merely connected). Lets callers cancel a pending
    // server-mode sync (e.g. when the fallback path discovers the partner
    // mid-wait and switches to client mode).
    server.on("close", () => {
      if (!settled) reject(new Error("Sync server closed before partner connected"));
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

    socket.on(
      "data",
      createFrameReader(
        (json) => {
          const result = validateAndDecrypt(json, expectedPartnerId, key);
          if (result && messageCallback) {
            messageCallback(result.msg, result.payload);
          }
        },
        () => {
          // Same fail-closed framing rule as the server path.
          socket.destroy();
        }
      )
    );

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
