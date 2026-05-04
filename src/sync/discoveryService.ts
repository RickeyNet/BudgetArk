/**
 * BudgetArk - Zeroconf Discovery Service
 * File: src/sync/discoveryService.ts
 *
 * Wraps react-native-zeroconf for mDNS publish/browse.
 * Publishes a "_budgetark._tcp" service so paired partners
 * can find each other on the same LAN.
 */

import Zeroconf from "react-native-zeroconf";

const SERVICE_TYPE = "budgetark";
const PROTOCOL = "tcp";
const DOMAIN = "local.";
const DISCOVERY_TIMEOUT_MS = 15_000;

export interface DiscoveredPeer {
  host: string;
  port: number;
  userId: string;
}

let zeroconf: Zeroconf | null = null;
let publishedServiceName: string | null = null;

const getZeroconf = (): Zeroconf => {
  if (!zeroconf) {
    zeroconf = new Zeroconf();
  }
  return zeroconf;
};

/**
 * Publish this device as a sync service on the LAN.
 * The TXT record contains our userId so the partner can identify us.
 */
export const publish = (
  userId: string,
  port: number
): void => {
  const zc = getZeroconf();
  publishedServiceName = `BudgetArk-${userId.slice(0, 8)}`;
  zc.publishService(
    SERVICE_TYPE,
    PROTOCOL,
    DOMAIN,
    publishedServiceName,
    port,
    { userId, syncVersion: "1" }
  );
};

/**
 * Browse for a paired partner's service on the LAN.
 * Returns the first matching peer or null if not found within timeout.
 */
export const discoverPartner = (
  partnerId: string,
  timeoutMs: number = DISCOVERY_TIMEOUT_MS
): Promise<DiscoveredPeer | null> => {
  return new Promise((resolve) => {
    const zc = getZeroconf();
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      zc.removeAllListeners("resolved");
      zc.removeAllListeners("error");
      zc.stop();
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    zc.on("resolved", (service: any) => {
      const txt = service.txt || {};
      // During pairing partnerId is "" - accept any budgetark service.
      // During sync we match the specific partner.
      const isMatch =
        partnerId === ""
          ? !!txt.userId
          : txt.userId === partnerId;

      if (isMatch && service.host && service.port) {
        clearTimeout(timer);
        const peer: DiscoveredPeer = {
          host: service.host,
          port: service.port,
          userId: txt.userId,
        };
        cleanup();
        resolve(peer);
      }
    });

    zc.on("error", (_err: any) => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    });

    zc.scan(SERVICE_TYPE, PROTOCOL, DOMAIN);
  });
};

/**
 * Stop all publishing and scanning.
 */
export const stop = (): void => {
  if (zeroconf) {
    if (publishedServiceName) {
      zeroconf.unpublishService(publishedServiceName);
      publishedServiceName = null;
    }
    zeroconf.stop();
    zeroconf.removeAllListeners();
  }
};
