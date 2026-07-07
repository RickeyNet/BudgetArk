import { Buffer } from "buffer";
import { buildHttpRequest, parseHttpResponse } from "../http1";

describe("buildHttpRequest", () => {
  it("serializes a GET with host, connection-close, and custom headers", () => {
    const raw = buildHttpRequest({
      method: "GET",
      path: "/accounts?count=10",
      host: "api.teller.io",
      headers: { Authorization: "Basic abc" },
    });
    expect(raw).toBe(
      "GET /accounts?count=10 HTTP/1.1\r\n" +
        "Host: api.teller.io\r\n" +
        "Connection: close\r\n" +
        "Accept: application/json\r\n" +
        "Authorization: Basic abc\r\n" +
        "\r\n",
    );
  });

  it("adds Content-Length for bodies", () => {
    const raw = buildHttpRequest({
      method: "POST",
      path: "/x",
      host: "h",
      body: "{}",
    });
    expect(raw).toContain("Content-Length: 2\r\n");
    expect(raw.endsWith("\r\n\r\n{}")).toBe(true);
  });
});

const response = (text: string) => Buffer.from(text, "utf-8");

describe("parseHttpResponse", () => {
  it("parses status, lowercased headers, and a content-length body", () => {
    const parsed = parseHttpResponse(
      response(
        "HTTP/1.1 200 OK\r\n" +
          "Content-Type: application/json\r\n" +
          "Content-Length: 13\r\n" +
          "\r\n" +
          '{"ok":true}\r\n',
      ),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.statusCode).toBe(200);
    expect(parsed!.headers["content-type"]).toBe("application/json");
    // Content-Length 13 covers the JSON + CRLF-free prefix exactly
    expect(parsed!.body.startsWith('{"ok":true}')).toBe(true);
  });

  it("decodes a chunked body", () => {
    const parsed = parseHttpResponse(
      response(
        "HTTP/1.1 200 OK\r\n" +
          "Transfer-Encoding: chunked\r\n" +
          "\r\n" +
          "7\r\n" +
          '{"a":1,\r\n' +
          "6\r\n" +
          '"b":2}\r\n' +
          "0\r\n" +
          "\r\n",
      ),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.body).toBe('{"a":1,"b":2}');
    expect(JSON.parse(parsed!.body)).toEqual({ a: 1, b: 2 });
  });

  it("parses error statuses and read-to-close bodies", () => {
    const parsed = parseHttpResponse(
      response("HTTP/1.1 401 Unauthorized\r\nServer: teller\r\n\r\nnope"),
    );
    expect(parsed!.statusCode).toBe(401);
    expect(parsed!.body).toBe("nope");
  });

  it("returns null for malformed input", () => {
    expect(parseHttpResponse(response(""))).toBeNull();
    expect(parseHttpResponse(response("not http at all"))).toBeNull();
    expect(
      parseHttpResponse(response("HTTP/1.1 200 OK\r\nno terminator")),
    ).toBeNull();
    // Malformed chunk framing
    expect(
      parseHttpResponse(
        response(
          "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\nZZ\r\nbody",
        ),
      ),
    ).toBeNull();
  });
});
