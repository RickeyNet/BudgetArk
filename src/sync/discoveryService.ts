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

// Separate Zeroconf instances for publish vs browse. Sharing a single
// instance meant `discoverPartner`'s cleanup `zc.stop()` also tore down the
// publish channel, so a fallback-mode device that started its own server +
// publish, then ran a second discovery scan, would silently lose its
// advertisement and the partner could never find it.
let publishZc: Zeroconf | null = null;
let browseZc: Zeroconf | null = null;
let publishedServiceName: string | null = null;

const getPublishZc = (): Zeroconf => {
  if (!publishZc) publishZc = new Zeroconf();
  return publishZc;
};

const getBrowseZc = (): Zeroconf => {
  if (!browseZc) browseZc = new Zeroconf();
  return browseZc;
};

/**
 * Publish this device as a sync service on the LAN.
 * The TXT record contains our userId so the partner can identify us.
 */
export const publish = (
  userId: string,
  port: number
): void => {
  const zc = getPublishZc();
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
    const zc = getBrowseZc();
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      zc.removeAllListeners("resolved");
      zc.removeAllListeners("error");
      // Only stop the browse instance - the publish instance keeps
      // advertising independently.
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
  if (publishZc) {
    if (publishedServiceName) {
      publishZc.unpublishService(publishedServiceName);
      publishedServiceName = null;
    }
    publishZc.stop();
    publishZc.removeAllListeners();
  }
  if (browseZc) {
    browseZc.stop();
    browseZc.removeAllListeners();
  }
};
