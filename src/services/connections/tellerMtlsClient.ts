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

    const socket = TcpSocket.connectTLS(
      {
        host: TELLER_API_HOST,
        port: 443,
        cert: options.certificatePem,
        key: options.privateKeyPem,
      },
      () => {
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
