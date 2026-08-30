/**
 * Plaintext export files must not outlive the share sheet: the helper
 * deletes the file after a successful share AND after a failed one, and a
 * failing delete never masks the share result.
 */
import { deleteLocalFileQuietly, shareLocalFileThenDelete } from "../shareTempFile";

const mockShareLocalFile = jest.fn();
jest.mock("../iosNativeShare", () => ({
  shareLocalFile: (...args: unknown[]) => mockShareLocalFile(...args),
}));

const makeFile = (exists = true) => {
  const file = {
    uri: "file:///tmp/export.csv",
    exists,
    delete: jest.fn(() => {
      file.exists = false;
    }),
  };
  return file;
};

const options = { mimeType: "text/csv", dialogTitle: "t", UTI: "u" };

beforeEach(() => {
  mockShareLocalFile.mockReset();
});

describe("shareLocalFileThenDelete", () => {
  it("shares by uri, then deletes the file", async () => {
    mockShareLocalFile.mockResolvedValueOnce(undefined);
    const file = makeFile();
    await shareLocalFileThenDelete(file, options);
    expect(mockShareLocalFile).toHaveBeenCalledWith(file.uri, options);
    expect(file.delete).toHaveBeenCalledTimes(1);
    // Delete happens after the share resolved, not before.
    expect(mockShareLocalFile.mock.invocationCallOrder[0]).toBeLessThan(
      file.delete.mock.invocationCallOrder[0]
    );
  });

  it("still deletes the file when sharing throws, and re-throws", async () => {
    mockShareLocalFile.mockRejectedValueOnce(new Error("Sharing is not available on this device."));
    const file = makeFile();
    await expect(shareLocalFileThenDelete(file, options)).rejects.toThrow("not available");
    expect(file.delete).toHaveBeenCalledTimes(1);
  });

  it("skips delete when the file no longer exists", async () => {
    mockShareLocalFile.mockResolvedValueOnce(undefined);
    const file = makeFile(false);
    await shareLocalFileThenDelete(file, options);
    expect(file.delete).not.toHaveBeenCalled();
  });
});

describe("deleteLocalFileQuietly", () => {
  it("swallows a delete failure", () => {
    const file = {
      uri: "file:///tmp/x",
      exists: true,
      delete: jest.fn(() => {
        throw new Error("locked");
      }),
    };
    expect(() => deleteLocalFileQuietly(file)).not.toThrow();
  });
});
