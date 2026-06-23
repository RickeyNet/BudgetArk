// The real `uuid` package is ESM-only (no CJS build), which Jest won't
// transpile from node_modules. generateUUID is a thin pass-through, so we mock
// the package and assert the delegation contract instead of re-testing uuid.
const mockV4 = jest.fn(() => "11111111-1111-4111-8111-111111111111");
jest.mock("uuid", () => ({ v4: () => mockV4() }));

import { generateUUID } from "../uuid";

describe("generateUUID", () => {
  it("returns the value produced by uuid.v4", () => {
    expect(generateUUID()).toBe("11111111-1111-4111-8111-111111111111");
    expect(mockV4).toHaveBeenCalledTimes(1);
  });

  it("produces a v4-shaped string", () => {
    // sanity-check the contract against a real-looking value from the generator
    mockV4.mockReturnValueOnce("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    expect(generateUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
