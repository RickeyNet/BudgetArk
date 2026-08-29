# Partner Sync - Security Model

Contributor notes on the deliberate security trade-offs in P2P LAN sync
(`src/sync/`). The hard invariants live in `CLAUDE.md` ("Security invariants -
never break these"); this file explains two decisions an auditor or new
contributor would otherwise flag as oversights. Both are considered choices -
don't "fix" them without reading the reasoning and the upgrade path first.

## Trust and key model (context)

Two devices pair once, in person, over the same Wi-Fi network:

1. One device shows a pairing code - 8 Crockford base32 characters, ~40 bits
   of entropy (`generatePairingCode` in `pairingService.ts`).
2. The code is typed into the other device and stretched with PBKDF2
   (100,000 iterations, versioned salt) into a temporary handshake key.
3. Under that temporary key, the devices exchange a freshly generated random
   256-bit `sharedSecret`, and both users confirm a ~30-bit fingerprint
   on-screen before anything is persisted.
4. Every future sync session encrypts its TCP frames with that same
   `sharedSecret`: AES-256 payloads, HMAC-SHA256 over the full protocol-v2
   envelope, 5-minute timestamp freshness, per-frame nonce replay protection
   (`transportService.ts`).

So sync is a **pre-shared-key protocol**: one long-lived symmetric secret per
pairing, established once, used for every session thereafter.

## No forward secrecy - deliberate

There is no per-session key exchange. A forward-secret protocol (TLS, Signal)
negotiates a throwaway key per session, so traffic recorded today stays
unreadable even if the long-term secret leaks later. BudgetArk's sync does not
have that property:

> If an attacker records encrypted sync traffic on the LAN and **later**
> obtains the `sharedSecret` (a compromised paired device, a leaked copy of
> the device's storage), they can retroactively decrypt every session they
> captured.

This is accepted because of what reaching that position already requires:

- The recording attacker must sit on the household LAN, capturing packets
  during the brief windows when two paired phones actually sync.
- Key compromise means compromising one of the paired phones' encrypted
  storage - at which point the attacker has the live financial data outright,
  which is a strict superset of anything in an old sync capture. The secret
  never leaves the paired devices: it is excluded from exports, backups, and
  the sync diff itself (CLAUDE.md rule 5's exclusion-list pattern).
- The payoff (stale diffs of data they already own) adds ~nothing over the
  compromise itself.

Per-session ephemeral key exchange (X25519 ECDH, or a ratchet) would close the
gap but is a poor fit today: crypto-js ships no curve25519 (sync deliberately
stays on crypto-js for cross-device byte-compat - see the migration notes in
`encryptedStorage.ts`), and a protocol change of that size needs cross-version
compat handling across the installed base for marginal gain.

**Revisit trigger:** if sync ever travels beyond the LAN (an internet relay,
cloud rendezvous, or any path where traffic capture becomes cheap and
persistent), add forward secrecy as part of that same protocol rev - that's
the point where the recorded-traffic threat stops being far-fetched.

## Pairing listens on 0.0.0.0 - deliberate

During the 60-second pairing window (`PAIRING_TIMEOUT_MS`), the TCP server
binds `0.0.0.0` on an OS-assigned port (`transportService.ts` -
`server.listen({ port: 0, host: "0.0.0.0" }, ...)`) and will accept a
connection from **any** host on the LAN. This is required, not sloppy: the
joining device's address isn't known in advance - it finds the listener via
mDNS discovery (or a manually typed IP), so the listener can't pre-bind to a
specific peer.

Why an open 60-second bind is acceptable:

- An attacker who connects still has to complete the handshake, which means
  knowing the 40-bit pairing code. Brute-forcing it offline against the
  100k-iteration PBKDF2 is a centuries-scale job on a single GPU (the 6-digit
  v1 code was upgraded for exactly this reason - see the comment on
  `generatePairingCode`).
- Even a successful code guess isn't a silent win: both users must confirm a
  matching ~30-bit fingerprint on-screen before the pairing persists, so the
  attacker also has to trick a human at the exact moment they're pairing.
- Outside the pairing window, the sync server grants its single partner slot
  only after a frame passes full-envelope HMAC validation with the
  established secret; unauthenticated frames are bounded by the 16 MB
  pre-auth frame cap and dropped.

**Don't tighten the bind** (e.g. to a discovered peer's address) without
re-verifying the discovery flow: mDNS resolution and manual-IP entry both
depend on accepting the first connection from an address the listener never
saw beforehand.
