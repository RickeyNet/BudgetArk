/**
 * BudgetArk - Bank Connections: Teller mTLS Transport
 * File: src/services/connections/tellerMtlsClient.ts
 *
 * HTTPS-with-client-certificate GETs against api.teller.io, built on
 * react-native-tcp-socket's TLSSocket (the same native module the LAN sync
 * feature ships). Teller requires mutual TLS for all real-data requests and
 * RN fetch can't present a client identity - this transport can:
 * TLSSocket accepts PEM `cert`/`key` strings on both platforms (Android
 * builds a KeyManagerFactory from the PEMs; iOS builds a SecIdentity).
 *
 * One request per socket (Connection: close); the response is parsed by the
 * pure http1.ts codec once the socket closes.
 */

import { Platform } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import { Buffer } from "buffer";
import { buildHttpRequest, parseHttpResponse, ParsedHttpResponse } from "./http1";
import { REQUEST_TIMEOUT_MS } from "./types";

export const TELLER_API_HOST = "api.teller.io";

export interface TellerRequestOptions {
  path: string;
  /** Teller access token - sent as Basic auth username with empty password. */
  accessToken: string;
  certificatePem: string;
  privateKeyPem: string;
  timeoutMs?: number;
}

export type TellerHttpResult =
  | { ok: true; response: ParsedHttpResponse }
  | { ok: false; reason: "network" | "tls" | "timeout" | "malformed" };

/** Basic auth per Teller: token as username, blank password. */
const authHeader = (accessToken: string): string =>
  `Basic ${Buffer.from(`${accessToken}:`, "utf-8").toString("base64")}`;

/**
 * Confirm the TLS peer is really api.teller.io before any credential is sent.
 *
 * Why this exists: react-native-tcp-socket's Android path validates the
 * server-certificate *chain* against the system trust store but performs NO
 * hostname verification (a raw SSLSocket doesn't unless
 * setEndpointIdentificationAlgorithm("HTTPS") is set, which the library never
 * does). Without this check a network MITM could present a validly-CA-signed
 * certificate for a domain THEY control, complete the handshake, and receive
 * the victim's Teller access token. iOS is unaffected - it sets
 * kCFStreamSSLPeerName and verifies the hostname natively - so we scope the
 * manual check to Android to avoid perturbing the already-safe iOS path.
 *
 * We pair this with rejectUnauthorized:true (chain validation) so the two
 * together give browser-grade assurance: the leaf must chain to a trusted CA
 * AND be issued for api.teller.io. A public CA won't issue an attacker a
 * trusted cert bearing CN=api.teller.io without domain control, so the CN
 * check is sound here and - unlike pinning the leaf key - survives Teller's
 * routine certificate rotation. (Teller's leaf currently carries
 * CN=api.teller.io; if they ever ship a SAN-only cert this fails closed, i.e.
 * the sync stops rather than leaking - safe, but would need a code update.)
 */
export const peerIsTeller = async (socket: {
  getPeerCertificate: () => unknown;
}): Promise<boolean> => {
  try {
    const peer = (await Promise.resolve(socket.getPeerCertificate())) as {
      subject?: { CN?: unknown };
    } | null;
    const cn =
      peer && peer.subject && typeof peer.subject.CN === "string"
        ? peer.subject.CN.trim().toLowerCase()
        : "";
    return cn === TELLER_API_HOST;
  } catch {
    // No verifiable peer certificate - treat as untrusted.
    return false;
  }
};

export const tellerGet = (
  options: TellerRequestOptions,
): Promise<TellerHttpResult> =>
  new Promise((resolve) => {
    let settled = false;
    let received = Buffer.alloc(0);

    const finish = (result: TellerHttpResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        // already closed
      }
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ ok: false, reason: "timeout" }),
      options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    );

    const sendRequest = () => {
      if (settled) return;
      const request = buildHttpRequest({
        method: "GET",
        path: options.path,
        host: TELLER_API_HOST,
        headers: {
          Authorization: authHeader(options.accessToken),
          "User-Agent": "BudgetArk",
        },
      });
      socket.write(request);
    };

    const socket = TcpSocket.connectTLS(
      // `rejectUnauthorized` isn't in the library's typings but is honored by
      // the native layer; it forces the server chain to validate against the
      // system trust store. Combined with the Android hostname check below,
      // this closes the MITM gap in the raw-socket TLS transport.
      {
        host: TELLER_API_HOST,
        port: 443,
        cert: options.certificatePem,
        key: options.privateKeyPem,
        rejectUnauthorized: true,
      } as Parameters<typeof TcpSocket.connectTLS>[0],
      () => {
        // iOS verifies the hostname natively; Android does not, so gate the
        // credential write on an explicit peer-identity check there.
        if (Platform.OS !== "android") {
          sendRequest();
          return;
        }
        void peerIsTeller(socket).then((trusted) => {
          if (trusted) {
            sendRequest();
          } else {
            finish({ ok: false, reason: "tls" });
          }
        });
      },
    );

    socket.on("data", (data: string | Buffer) => {
      const chunk =
        typeof data === "string" ? Buffer.from(data, "utf-8") : data;
      received = Buffer.concat([received, chunk]);
    });

    socket.on("error", () => finish({ ok: false, reason: "tls" }));

    socket.on("close", () => {
      const parsed = parseHttpResponse(received);
      if (!parsed) {
        finish({
          ok: false,
          reason: received.length === 0 ? "network" : "malformed",
        });
        return;
      }
      finish({ ok: true, response: parsed });
    });
  });
