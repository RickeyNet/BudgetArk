/**
 * BudgetArk - Bank Connections: Minimal HTTP/1.1 Codec
 * File: src/services/connections/http1.ts
 *
 * Teller's API requires mutual-TLS client certificates, which React Native's
 * fetch cannot present. The app already ships react-native-tcp-socket (LAN
 * sync), whose TLSSocket accepts PEM client cert/key - so Teller requests
 * run as hand-rolled HTTP/1.1 over that TLS socket (tellerMtlsClient.ts).
 * This module is the pure codec half: request serialization and response
 * parsing (status line, headers, content-length and chunked bodies).
 * Node-testable; no socket or RN imports.
 */

import { Buffer } from "buffer";

const CRLF = "\r\n";

export interface HttpRequestSpec {
  method: "GET" | "POST" | "DELETE";
  path: string;
  host: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Serialize a request. Always sends Connection: close - one exchange per socket. */
export const buildHttpRequest = (spec: HttpRequestSpec): string => {
  const lines = [
    `${spec.method} ${spec.path} HTTP/1.1`,
    `Host: ${spec.host}`,
    "Connection: close",
    "Accept: application/json",
  ];
  for (const [name, value] of Object.entries(spec.headers ?? {})) {
    lines.push(`${name}: ${value}`);
  }
  const body = spec.body ?? "";
  if (body) {
    lines.push(`Content-Length: ${Buffer.byteLength(body, "utf-8")}`);
  }
  return lines.join(CRLF) + CRLF + CRLF + body;
};

export interface ParsedHttpResponse {
  statusCode: number;
  /** Header names lowercased. Later duplicates win (adequate for JSON APIs). */
  headers: Record<string, string>;
  body: string;
}

const HEADER_TERMINATOR = Buffer.from(CRLF + CRLF, "utf-8");

/** Decode a chunked transfer-encoding body. Returns null on malformed framing. */
const decodeChunked = (raw: Buffer): Buffer | null => {
  const parts: Buffer[] = [];
  let offset = 0;
  for (;;) {
    const lineEnd = raw.indexOf(CRLF, offset, "utf-8");
    if (lineEnd === -1) return null;
    const sizeLine = raw.subarray(offset, lineEnd).toString("utf-8");
    const size = parseInt(sizeLine.split(";")[0].trim(), 16);
    if (!Number.isFinite(size) || size < 0) return null;
    offset = lineEnd + 2;
    if (size === 0) break;
    if (offset + size > raw.length) return null;
    parts.push(raw.subarray(offset, offset + size));
    offset += size + 2; // skip chunk + trailing CRLF
  }
  return Buffer.concat(parts);
};

/**
 * Parse a complete response buffer (the socket reads until close). Returns
 * null when the buffer isn't a parseable HTTP/1.x response.
 */
export const parseHttpResponse = (raw: Buffer): ParsedHttpResponse | null => {
  const headerEnd = raw.indexOf(HEADER_TERMINATOR);
  if (headerEnd === -1) return null;

  const head = raw.subarray(0, headerEnd).toString("utf-8");
  const lines = head.split(CRLF);
  const statusMatch = /^HTTP\/1\.[01] (\d{3})/.exec(lines[0]);
  if (!statusMatch) return null;
  const statusCode = parseInt(statusMatch[1], 10);

  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    headers[line.slice(0, colon).trim().toLowerCase()] = line
      .slice(colon + 1)
      .trim();
  }

  let bodyBuffer = raw.subarray(headerEnd + HEADER_TERMINATOR.length);
  if ((headers["transfer-encoding"] ?? "").toLowerCase().includes("chunked")) {
    const decoded = decodeChunked(bodyBuffer);
    if (decoded === null) return null;
    bodyBuffer = decoded;
  } else if (headers["content-length"]) {
    const length = parseInt(headers["content-length"], 10);
    if (Number.isFinite(length) && length >= 0 && length <= bodyBuffer.length) {
      bodyBuffer = bodyBuffer.subarray(0, length);
    }
  }
  return { statusCode, headers, body: bodyBuffer.toString("utf-8") };
};
