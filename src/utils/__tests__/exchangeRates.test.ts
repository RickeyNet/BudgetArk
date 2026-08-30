import {
  fetchLiveRates,
  getConverterRates,
  getCurrentRates,
  getStoredRates,
  type RatesSnapshot,
} from "../exchangeRates";
import { USD_EXCHANGE_RATES } from "../currencyConversion";

// In-memory stand-in for the encrypted storage layer (the cache the module
// reads/writes). `mock`-prefixed so jest's hoisting lets the factory close
// over it.
const mockStore = new Map<string, string>();
jest.mock("../../storage/encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
}));

const CACHE_KEY = "@budgetark_fx_rates";
const CONVERTER_CACHE_KEY = "@budgetark_fx_converter_rates";

/** A complete, trusted rates table (USD === 1, every supported code present). */
const validRates = (over: Record<string, number> = {}): Record<string, number> => ({
  ...USD_EXCHANGE_RATES,
  ...over,
});

/** Build a fetch() Response stand-in. */
const fetchResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => body,
});

const okFetch = (rates = validRates()) =>
  jest.fn().mockResolvedValue(fetchResponse({ result: "success", rates }));

/** Seed a cache key with a snapshot whose age we control via `ageMs`. */
const seedCacheKey = (key: string, ageMs: number, rates = validRates()) => {
  const snap: RatesSnapshot = {
    base: "USD",
    rates,
    fetchedAt: new Date(Date.now() - ageMs).toISOString(),
    source: "live",
  };
  mockStore.set(key, JSON.stringify(snap));
};

/** Seed the pinned display cache (the one getCurrentRates/getStoredRates use). */
const seedCache = (ageMs: number, rates = validRates()) =>
  seedCacheKey(CACHE_KEY, ageMs, rates);

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

beforeEach(() => {
  mockStore.clear();
  (global as any).fetch = jest.fn();
});

describe("fetchLiveRates", () => {
  it("returns the rates table from a successful response", async () => {
    (global as any).fetch = okFetch();
    await expect(fetchLiveRates()).resolves.toMatchObject({ USD: 1, EUR: 0.92 });
  });

  it("throws on a non-OK HTTP status", async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue(fetchResponse({}, { ok: false, status: 503 }));
    await expect(fetchLiveRates()).rejects.toThrow(/HTTP 503/);
  });

  it("throws when the provider reports a non-success result", async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue(fetchResponse({ result: "error", rates: validRates() }));
    await expect(fetchLiveRates()).rejects.toThrow(/invalid or incomplete/);
  });

  it("rejects a response missing a required currency", async () => {
    const incomplete = validRates();
    delete (incomplete as any).SEK;
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue(fetchResponse({ result: "success", rates: incomplete }));
    await expect(fetchLiveRates()).rejects.toThrow(/invalid or incomplete/);
  });

  it("rejects a response where USD is not the base unit", async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue(
        fetchResponse({ result: "success", rates: validRates({ USD: 1.01 }) })
      );
    await expect(fetchLiveRates()).rejects.toThrow(/invalid or incomplete/);
  });

  it("rejects a response with a non-positive rate", async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue(
        fetchResponse({ result: "success", rates: validRates({ EUR: 0 }) })
      );
    await expect(fetchLiveRates()).rejects.toThrow(/invalid or incomplete/);
  });
});

describe("getStoredRates", () => {
  it("returns the pinned cache regardless of age, without touching the network", async () => {
    seedCache(365 * 24 * 60 * 60 * 1000, validRates({ EUR: 0.5 })); // a year old
    const fetchMock = okFetch();
    (global as any).fetch = fetchMock;

    const snap = await getStoredRates();
    expect(snap.source).toBe("cache");
    expect(snap.rates.EUR).toBe(0.5);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the static table with no cache, still without the network", async () => {
    const fetchMock = okFetch();
    (global as any).fetch = fetchMock;

    const snap = await getStoredRates();
    expect(snap.source).toBe("static");
    expect(snap.rates).toMatchObject(USD_EXCHANGE_RATES);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getCurrentRates", () => {
  it("returns fresh cache without hitting the network", async () => {
    seedCache(TWELVE_HOURS - 60_000); // just under TTL
    const fetchMock = okFetch();
    (global as any).fetch = fetchMock;

    const snap = await getCurrentRates();
    expect(snap.source).toBe("cache");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches live when the cache is stale and caches the result", async () => {
    seedCache(TWELVE_HOURS + 60_000); // just over TTL
    (global as any).fetch = okFetch(validRates({ EUR: 0.9 }));

    const snap = await getCurrentRates();
    expect(snap.source).toBe("live");
    expect(snap.rates.EUR).toBe(0.9);

    // The fresh snapshot was written back to the cache.
    const cached = JSON.parse(mockStore.get(CACHE_KEY)!) as RatesSnapshot;
    expect(cached.source).toBe("live");
    expect(cached.rates.EUR).toBe(0.9);
  });

  it("fetches live with no cache at all", async () => {
    (global as any).fetch = okFetch();
    const snap = await getCurrentRates();
    expect(snap.source).toBe("live");
  });

  it("forceRefresh fetches live even when the cache is fresh", async () => {
    seedCache(60_000); // very fresh
    const fetchMock = okFetch(validRates({ GBP: 0.8 }));
    (global as any).fetch = fetchMock;

    const snap = await getCurrentRates({ forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snap.source).toBe("live");
    expect(snap.rates.GBP).toBe(0.8);
  });

  it("falls back to stale cache when the live fetch fails", async () => {
    seedCache(TWELVE_HOURS + 60_000, validRates({ JPY: 150 }));
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("offline"));

    const snap = await getCurrentRates({ forceRefresh: true });
    expect(snap.source).toBe("cache");
    expect(snap.rates.JPY).toBe(150);
  });

  it("falls back to the static table when fetch fails and no cache exists", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("offline"));
    const snap = await getCurrentRates();
    expect(snap.source).toBe("static");
    expect(snap.rates).toEqual(USD_EXCHANGE_RATES);
  });

  it("treats a corrupt cache entry as no cache", async () => {
    mockStore.set(CACHE_KEY, "{not valid json");
    (global as any).fetch = okFetch();
    const snap = await getCurrentRates();
    expect(snap.source).toBe("live"); // corrupt cache ignored, went to network
  });

  it("ignores a cache whose rates fail validation", async () => {
    const bad: RatesSnapshot = {
      base: "USD",
      rates: validRates({ USD: 2 }), // USD must be 1
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
    mockStore.set(CACHE_KEY, JSON.stringify(bad));
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("offline"));

    // Fresh-but-invalid cache is dropped, fetch fails -> static fallback.
    const snap = await getCurrentRates();
    expect(snap.source).toBe("static");
  });
});

describe("getConverterRates", () => {
  it("caches under its own key and NEVER writes the pinned display key", async () => {
    (global as any).fetch = okFetch(validRates({ EUR: 0.88 }));

    const snap = await getConverterRates();
    expect(snap.source).toBe("live");

    // The converter cache was written...
    const cached = JSON.parse(mockStore.get(CONVERTER_CACHE_KEY)!) as RatesSnapshot;
    expect(cached.rates.EUR).toBe(0.88);
    // ...and the pinned display snapshot was left alone (the rate-pinning
    // policy: only a currency change may move what balances display at).
    expect(mockStore.has(CACHE_KEY)).toBe(false);
  });

  it("a converter refresh does not disturb an existing pinned snapshot", async () => {
    seedCache(0, validRates({ EUR: 0.5 })); // the pin the app displays with
    (global as any).fetch = okFetch(validRates({ EUR: 0.88 }));

    await getConverterRates({ forceRefresh: true });

    const pinned = JSON.parse(mockStore.get(CACHE_KEY)!) as RatesSnapshot;
    expect(pinned.rates.EUR).toBe(0.5);
  });

  it("returns a fresh converter cache without hitting the network", async () => {
    seedCacheKey(CONVERTER_CACHE_KEY, 60_000);
    const fetchMock = okFetch();
    (global as any).fetch = fetchMock;

    const snap = await getConverterRates();
    expect(snap.source).toBe("cache");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forceRefresh fetches live even when the converter cache is fresh", async () => {
    seedCacheKey(CONVERTER_CACHE_KEY, 60_000);
    const fetchMock = okFetch(validRates({ GBP: 0.8 }));
    (global as any).fetch = fetchMock;

    const snap = await getConverterRates({ forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snap.rates.GBP).toBe(0.8);
  });

  it("falls back to a stale converter cache when the fetch fails", async () => {
    seedCacheKey(CONVERTER_CACHE_KEY, TWELVE_HOURS + 60_000, validRates({ JPY: 149 }));
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("offline"));

    const snap = await getConverterRates();
    expect(snap.source).toBe("cache");
    expect(snap.rates.JPY).toBe(149);
  });

  it("falls back to the pinned snapshot when offline with no converter cache", async () => {
    seedCache(0, validRates({ EUR: 0.5 }));
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("offline"));

    const snap = await getConverterRates();
    expect(snap.source).toBe("cache");
    expect(snap.rates.EUR).toBe(0.5);
  });

  it("falls back to the static table when offline with no cache at all", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("offline"));
    const snap = await getConverterRates();
    expect(snap.source).toBe("static");
    expect(snap.rates).toMatchObject(USD_EXCHANGE_RATES);
  });
});
