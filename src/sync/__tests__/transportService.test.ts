/**
 * transportService is the wire-level security boundary: every incoming frame
 * is HMAC-authenticated over the full envelope, version-checked, age-checked,
 * and replay-checked before its payload is decrypted. The validation logic is
 * internal, so we exercise it through the exported connectToHost/startServer
 * with react-native-tcp-socket mocked as controllable in-memory sockets, and
 * REAL CryptoJS crafting both authentic and adversarial frames.
 */
import { Buffer } from "buffer";
import CryptoJS from "crypto-js";
import {
  connectToHost,
  startServer,
  resetReplayProtection,
  wasProtocolMismatchSeen,
  PROTOCOL_VERSION,
} from "../transportService";

// Deterministic nonces (and avoids the ESM-only uuid package breaking import).
let mockNonceSeq = 0;
jest.mock("../../utils/uuid", () => ({
  generateUUID: () => `uuid-${mockNonceSeq++}`,
}));

// Fake TCP layer: sockets record writes and let tests inject inbound data.
jest.mock("react-native-tcp-socket", () => {
  const make = () => {
    const handlers: Record<string, (arg?: any) => void> = {};
    return {
      handlers,
      written: [] as any[],
      on(event: string, cb: (arg?: any) => void) {
        handlers[event] = cb;
      },
      write(buf: any) {
        this.written.push(buf);
      },
      destroy() {
        handlers.close?.();
      },
      feed(buf: any) {
        handlers.data?.(buf);
      },
    };
  };
  const mod: any = {
    __sockets: [] as any[],
    __servers: [] as any[],
    __newSocket: make,
    createConnection(_opts: any, cb: () => void) {
      const s = make();
      mod.__sockets.push(s);
      cb();
      return s;
    },
    createServer(onConn: (s: any) => void) {
      const srv: any = {
        handlers: {} as Record<string, (arg?: any) => void>,
        _onConn: onConn,
        on(event: string, cb: (arg?: any) => void) {
          this.handlers[event] = cb;
        },
        listen(_opts: any, cb?: () => void) {
          cb?.();
        },
        address() {
          return { port: 54321 };
        },
        close() {
          this.handlers.close?.();
        },
      };
      mod.__servers.push(srv);
      return srv;
    },
  };
  return mod;
});

const TcpSocket = require("react-native-tcp-socket");

const KEY = "shared-secret-key-256";

// ── Frame builders (mirror transportService's envelope + framing) ──
const enc = (obj: unknown, key = KEY) =>
  CryptoJS.AES.encrypt(JSON.stringify(obj), key).toString();

const macOf = (
  type: string,
  senderId: string,
  ts: string,
  nonce: string,
  encrypted: string,
  key = KEY
) =>
  CryptoJS.HmacSHA256(
    `${PROTOCOL_VERSION}|${type}|${senderId}|${ts}|${nonce}|${encrypted}`,
    key
  ).toString(CryptoJS.enc.Hex);

const frame = (msg: unknown): Buffer => {
  const body = Buffer.from(JSON.stringify(msg), "utf-8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
};

const rawFrame = (str: string): Buffer => {
  const body = Buffer.from(str, "utf-8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
};

let seq = 0;
const signed = (over: Record<string, any> = {}) => {
  const type = over.type ?? "SYNC_REQUEST";
  const senderId = over.senderId ?? "partner";
  const timestamp = over.timestamp ?? new Date().toISOString();
  const nonce = over.nonce ?? `n-${seq++}`;
  const key = over.key ?? KEY;
  const encrypted = over.encrypted ?? enc(over.payloadObj ?? { hello: "world" }, key);
  const hmac = over.hmac ?? macOf(type, senderId, timestamp, nonce, encrypted, over.macKey ?? key);
  const msg: any = { v: over.v ?? PROTOCOL_VERSION, type, senderId, timestamp, nonce, payload: encrypted, hmac };
  for (const k of over.omit ?? []) delete msg[k];
  return msg;
};
const validFrame = (over: Record<string, any> = {}) => frame(signed(over));

const newClient = async (expectedPartnerId = "partner", key = KEY) => {
  const conn = await connectToHost("host", 1, "me", expectedPartnerId, key);
  const socket = TcpSocket.__sockets[TcpSocket.__sockets.length - 1];
  const received: { msg: any; payload: string }[] = [];
  conn.onMessage((msg, payload) => received.push({ msg, payload }));
  return { conn, socket, received };
};

beforeEach(() => {
  resetReplayProtection();
  TcpSocket.__sockets.length = 0;
  TcpSocket.__servers.length = 0;
  seq = 0;
  mockNonceSeq = 0;
});

describe("accepting authentic frames", () => {
  it("decrypts and delivers a valid frame", async () => {
    const { socket, received } = await newClient();
    socket.feed(validFrame({ payloadObj: { x: 42 } }));
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0].payload)).toEqual({ x: 42 });
  });

  it("round-trips a frame built by connection.send", async () => {
    // "sender" is the partner; it builds a real frame via buildAndSend.
    const sender = await connectToHost("host", 1, "partner", "me", KEY);
    const senderSocket = TcpSocket.__sockets[TcpSocket.__sockets.length - 1];
    sender.send("SYNC_REQUEST", { ping: true });
    const sentFrame = senderSocket.written[0];

    const { socket, received } = await newClient("partner");
    socket.feed(sentFrame);
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0].payload)).toEqual({ ping: true });
  });

  it("skips the sender check during pairing (empty expected id)", async () => {
    const { socket, received } = await newClient(""); // pairing: partner id unknown
    socket.feed(validFrame({ senderId: "whoever" }));
    expect(received).toHaveLength(1);
  });
});

describe("rejecting forged or malformed frames", () => {
  it("drops a frame whose envelope was tampered after signing", async () => {
    const { socket, received } = await newClient();
    const msg = signed({ type: "SYNC_REQUEST" });
    msg.type = "SYNC_RESPONSE"; // HMAC no longer covers this type
    socket.feed(frame(msg));
    expect(received).toHaveLength(0);
  });

  it("drops a frame signed with the wrong key", async () => {
    const { socket, received } = await newClient();
    socket.feed(validFrame({ macKey: "attacker-key" }));
    expect(received).toHaveLength(0);
  });

  it("drops a frame from an unexpected sender (HMAC valid)", async () => {
    const { socket, received } = await newClient("partner");
    socket.feed(validFrame({ senderId: "attacker" })); // self-consistent but wrong peer
    expect(received).toHaveLength(0);
  });

  it("drops malformed JSON and frames missing required fields", async () => {
    const { socket, received } = await newClient();
    socket.feed(rawFrame("{not valid json"));
    socket.feed(frame({ type: "SYNC_REQUEST" })); // missing senderId/hmac/etc
    expect(received).toHaveLength(0);
  });
});

describe("protocol version gate", () => {
  it("drops a wrong-version frame and flags a protocol mismatch", async () => {
    const { socket, received } = await newClient();
    expect(wasProtocolMismatchSeen()).toBe(false);
    socket.feed(validFrame({ v: 1 })); // legacy peer
    expect(received).toHaveLength(0);
    expect(wasProtocolMismatchSeen()).toBe(true);
  });

  it("treats a missing version as a mismatch", async () => {
    const { socket, received } = await newClient();
    socket.feed(frame(signed({ omit: ["v"] })));
    expect(received).toHaveLength(0);
    expect(wasProtocolMismatchSeen()).toBe(true);
  });
});

describe("age and replay protection", () => {
  it("drops a stale message", async () => {
    const { socket, received } = await newClient();
    socket.feed(validFrame({ timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString() }));
    expect(received).toHaveLength(0);
  });

  it("drops a message timestamped too far in the future", async () => {
    const { socket, received } = await newClient();
    socket.feed(validFrame({ timestamp: new Date(Date.now() + 6 * 60 * 1000).toISOString() }));
    expect(received).toHaveLength(0);
  });

  it("accepts a nonce once, then rejects the replay", async () => {
    const { socket, received } = await newClient();
    const f = validFrame({ nonce: "dup" });
    socket.feed(f);
    socket.feed(validFrame({ nonce: "dup", payloadObj: { again: true } }));
    expect(received).toHaveLength(1); // second dropped as replay
  });

  it("allows a previously-seen nonce again after resetReplayProtection", async () => {
    const first = await newClient();
    first.socket.feed(validFrame({ nonce: "shared" }));
    expect(first.received).toHaveLength(1);

    resetReplayProtection();

    const second = await newClient();
    second.socket.feed(validFrame({ nonce: "shared" }));
    expect(second.received).toHaveLength(1); // nonce table was cleared
  });

  it("clears the protocol-mismatch flag on reset", async () => {
    const { socket } = await newClient();
    socket.feed(validFrame({ v: 1 }));
    expect(wasProtocolMismatchSeen()).toBe(true);
    resetReplayProtection();
    expect(wasProtocolMismatchSeen()).toBe(false);
  });
});

describe("frame buffering", () => {
  it("reassembles a frame split across two data chunks", async () => {
    const { socket, received } = await newClient();
    const f = validFrame({ payloadObj: { split: 1 } });
    socket.feed(f.slice(0, 6)); // header + part of body
    expect(received).toHaveLength(0);
    socket.feed(f.slice(6)); // the rest
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0].payload)).toEqual({ split: 1 });
  });

  it("processes multiple frames arriving in one chunk", async () => {
    const { socket, received } = await newClient();
    const combined = Buffer.concat([
      validFrame({ nonce: "a", payloadObj: { i: 1 } }),
      validFrame({ nonce: "b", payloadObj: { i: 2 } }),
    ]);
    socket.feed(combined);
    expect(received.map((r) => JSON.parse(r.payload).i)).toEqual([1, 2]);
  });
});

describe("startServer", () => {
  it("reports the allocated port and delivers frames once a client connects", async () => {
    const onListening = jest.fn();
    const p = startServer("me", "partner", KEY, onListening);
    const srv = TcpSocket.__servers[TcpSocket.__servers.length - 1];

    expect(onListening).toHaveBeenCalledWith(54321, expect.any(Function));

    const sock = TcpSocket.__newSocket();
    srv._onConn(sock); // simulate a client connecting
    const { connection, port } = await p;
    expect(port).toBe(54321);

    const received: string[] = [];
    connection.onMessage((_m, payload) => received.push(payload));
    sock.feed(validFrame({ nonce: "srv-1", payloadObj: { ok: 1 } }));
    expect(received).toHaveLength(1);
  });

  it("rejects if the server is closed before a client connects", async () => {
    const p = startServer("me", "partner", KEY);
    const srv = TcpSocket.__servers[TcpSocket.__servers.length - 1];
    srv.close(); // close-before-connect
    await expect(p).rejects.toThrow(/closed before/);
  });
});
