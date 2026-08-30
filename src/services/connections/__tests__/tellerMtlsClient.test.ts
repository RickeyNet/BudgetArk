/**
 * Peer-identity verification for the Teller mTLS transport.
 *
 * These cover the security gate that prevents the raw-socket TLS client from
 * handing a Teller access token to a man-in-the-middle: on Android the socket
 * validates the cert chain but not the hostname, so `peerIsTeller` must reject
 * any peer whose leaf certificate CN is not exactly api.teller.io.
 */

// The module under test imports react-native (Platform) and the native socket
// module at load time; neither resolves in the Node test env, so mock both.
// peerIsTeller itself touches neither - it only inspects the passed socket.
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("react-native-tcp-socket", () => ({ connectTLS: jest.fn() }));

// eslint-disable-next-line import/first -- must import after the jest.mock calls so the native-module mocks are registered before the module loads
import { peerIsTeller } from "../tellerMtlsClient";

const socketWithCert = (cert: unknown) => ({
  getPeerCertificate: () => cert,
});

describe("peerIsTeller", () => {
  it("accepts a leaf certificate whose CN is api.teller.io", async () => {
    await expect(
      peerIsTeller(socketWithCert({ subject: { CN: "api.teller.io" } })),
    ).resolves.toBe(true);
  });

  it("is case-insensitive and tolerates surrounding whitespace", async () => {
    await expect(
      peerIsTeller(socketWithCert({ subject: { CN: "  API.Teller.IO " } })),
    ).resolves.toBe(true);
  });

  it("awaits a promise-returning getPeerCertificate (the real native shape)", async () => {
    await expect(
      peerIsTeller({
        getPeerCertificate: async () => ({ subject: { CN: "api.teller.io" } }),
      }),
    ).resolves.toBe(true);
  });

  it("rejects an attacker-controlled hostname that still chained to a trusted CA", async () => {
    await expect(
      peerIsTeller(socketWithCert({ subject: { CN: "attacker.example" } })),
    ).resolves.toBe(false);
  });

  it("rejects a lookalike subdomain", async () => {
    await expect(
      peerIsTeller(socketWithCert({ subject: { CN: "evil.api.teller.io" } })),
    ).resolves.toBe(false);
  });

  it("fails closed when the certificate has no CN", async () => {
    await expect(
      peerIsTeller(socketWithCert({ subject: {} })),
    ).resolves.toBe(false);
    await expect(peerIsTeller(socketWithCert({}))).resolves.toBe(false);
    await expect(peerIsTeller(socketWithCert(null))).resolves.toBe(false);
  });

  it("fails closed when getPeerCertificate throws (no verifiable peer)", async () => {
    await expect(
      peerIsTeller({
        getPeerCertificate: () => {
          throw new Error("no peer certificate");
        },
      }),
    ).resolves.toBe(false);
  });
});
