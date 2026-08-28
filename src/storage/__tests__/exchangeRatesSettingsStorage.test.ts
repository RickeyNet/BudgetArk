/**
 * The exchange-rate disclosure gate must fail closed: only a persisted
 * literal `true` counts as "already shown", so a missing, corrupt, or
 * truthy-but-wrong record re-prompts before the first network fetch.
 */
import {
  acknowledgeExchangeRatesDisclosure,
  getExchangeRatesSettings,
} from "../exchangeRatesSettingsStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
}));

const KEY = "@budgetark_exchange_rates_settings";

beforeEach(() => {
  mockStore = new Map();
});

describe("exchangeRatesSettingsStorage", () => {
  it("defaults to not acknowledged", async () => {
    await expect(getExchangeRatesSettings()).resolves.toEqual({
      disclosureAcknowledged: false,
    });
  });

  it("persists the acknowledgement and reads it back", async () => {
    await acknowledgeExchangeRatesDisclosure();
    await expect(getExchangeRatesSettings()).resolves.toEqual({
      disclosureAcknowledged: true,
    });
  });

  it.each([
    ["corrupt JSON", "{not json"],
    ["wrong type", JSON.stringify({ disclosureAcknowledged: "yes" })],
    ["truthy number", JSON.stringify({ disclosureAcknowledged: 1 })],
    ["missing field", JSON.stringify({})],
  ])("treats %s as not acknowledged", async (_label, raw) => {
    mockStore.set(KEY, raw);
    await expect(getExchangeRatesSettings()).resolves.toEqual({
      disclosureAcknowledged: false,
    });
  });
});
