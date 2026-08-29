/**
 * BudgetArk - attachment file store tests
 * File: src/services/attachments/__tests__/attachmentStore.test.ts
 *
 * Guards the on-disk lifecycle of receipt photos: every photo is written
 * ONLY through encryptStringWithMasterKey (never a plaintext file), a failed
 * thumbnail write cleans up its already-written full image rather than
 * leaving a half-pair, a vault-unavailable encrypt call surfaces
 * AttachmentEncryptionUnavailableError instead of degrading to plaintext,
 * and the orphan sweep only deletes files that are both unreferenced AND
 * past the min-age gate (planAttachmentSweep itself is unit-tested
 * separately in attachmentSweep.test.ts - this covers the store wiring:
 * directory listing in, delete calls out, cache invalidation).
 *
 * expo-file-system, expo-image-manipulator, and the master-key encrypt/
 * decrypt helpers are mocked; the fake filesystem is a real in-memory
 * Map so the store's own Directory/File usage runs unmodified.
 */
import {
  AttachmentEncryptionUnavailableError,
  clearAllAttachments,
  deleteAttachmentFiles,
  getAttachmentDataUri,
  getThumbnailDataUri,
  hasAttachmentFile,
  importAttachment,
  sweepOrphanedAttachments,
} from "../attachmentStore";

// "mock"-prefixed per jest's out-of-scope-variable naming rule for factories.
let mockUuidCounter = 0;
jest.mock("../../../utils/uuid", () => ({
  generateUUID: () => `attach-${++mockUuidCounter}`,
}));

const mockEncrypt = jest.fn(
  async (plaintext: string): Promise<string | null> => `ENC(${plaintext})`
);
const mockDecrypt = jest.fn(
  async (blob: string): Promise<string | null> =>
    blob.startsWith("ENC(") && blob.endsWith(")") ? blob.slice(4, -1) : null
);
jest.mock("../../../storage/encryptedStorage", () => ({
  encryptStringWithMasterKey: (plaintext: string) => mockEncrypt(plaintext),
  decryptStringWithMasterKey: (blob: string) => mockDecrypt(blob),
}));

/* ── Fake expo-file-system: a tiny in-memory filesystem ──
 * Mirrors just the surface attachmentStore.ts uses: Directory/File with
 * exists/create/write/text/delete/list, plus Paths.document. mtimes come
 * from Date.now() at create/write time so tests can control aging via
 * jest.spyOn(Date, "now") without touching unrelated code paths.
 */
jest.mock("expo-file-system", () => {
  const files = new Map<string, { content: string; mtimeMs: number }>();
  const dirs = new Set<string>();

  class FakeFile {
    uri: string;
    name: string;
    constructor(parent: { uri: string } | string, name?: string) {
      // Two forms: (dirLike, name) - a child of a directory - or (fullUri)
      // alone, as attachmentStore's temp-file cleanup uses. Dispatch on
      // whether `name` was passed, not on the type of `parent`: a Directory's
      // own `.uri` is itself a string, so `new FakeFile(dir.uri, "x.enc")`
      // must still be treated as the two-arg form.
      if (name !== undefined) {
        const parentUri = typeof parent === "string" ? parent : parent.uri;
        this.uri = `${parentUri}/${name}`;
        this.name = name;
      } else {
        this.uri = parent as string;
        this.name = (parent as string).split("/").pop() ?? (parent as string);
      }
    }
    get exists() {
      return files.has(this.uri);
    }
    create(opts?: { overwrite?: boolean }) {
      if (!files.has(this.uri) || opts?.overwrite) {
        files.set(this.uri, { content: "", mtimeMs: Date.now() });
      }
    }
    write(content: string) {
      const rec = files.get(this.uri) ?? { content: "", mtimeMs: Date.now() };
      rec.content = content;
      rec.mtimeMs = Date.now();
      files.set(this.uri, rec);
    }
    async text(): Promise<string> {
      const rec = files.get(this.uri);
      if (!rec) throw new Error(`ENOENT: ${this.uri}`);
      return rec.content;
    }
    delete() {
      if (!files.has(this.uri)) throw new Error(`ENOENT: ${this.uri}`);
      files.delete(this.uri);
    }
    get lastModified() {
      return files.get(this.uri)?.mtimeMs;
    }
  }

  class FakeDirectory {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      this.uri = typeof parent === "string" && name === undefined
        ? parent
        : `${typeof parent === "string" ? parent : parent.uri}/${name}`;
    }
    get exists() {
      return dirs.has(this.uri);
    }
    create() {
      dirs.add(this.uri);
    }
    list(): FakeFile[] {
      const prefix = this.uri + "/";
      const out: FakeFile[] = [];
      for (const uri of files.keys()) {
        if (uri.startsWith(prefix) && !uri.slice(prefix.length).includes("/")) {
          out.push(new FakeFile(this.uri, uri.slice(prefix.length)));
        }
      }
      return out;
    }
    delete() {
      dirs.delete(this.uri);
      for (const uri of Array.from(files.keys())) {
        if (uri.startsWith(this.uri + "/")) files.delete(uri);
      }
    }
  }

  return {
    Paths: { document: "file:///document" },
    Directory: FakeDirectory,
    File: FakeFile,
    __reset: () => {
      files.clear();
      dirs.clear();
    },
    __files: files,
  };
});

/* ── Fake expo-image-manipulator ──
 * manipulate(uri) starts a fresh chain each call (matching real usage: the
 * source calls manipulate() again, not resize() on the same context, when a
 * downscale is needed). Source dimensions per uri default to 800x600 and are
 * overridable per test via mockSourceDims.
 */
const mockSourceDims = new Map<string, { width: number; height: number }>();
let saveCounter = 0;
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: (uri: string) => {
      let pendingResize: { width?: number; height?: number } | null = null;
      return {
        resize: (opts: { width?: number; height?: number }) => {
          pendingResize = opts;
        },
        renderAsync: async () => {
          const source = mockSourceDimsRef().get(uri) ?? { width: 800, height: 600 };
          let { width, height } = source;
          if (pendingResize) {
            if (pendingResize.width) {
              const scale = pendingResize.width / width;
              width = pendingResize.width;
              height = Math.round(height * scale);
            } else if (pendingResize.height) {
              const scale = pendingResize.height / height;
              height = pendingResize.height;
              width = Math.round(width * scale);
            }
          }
          return {
            width,
            height,
            saveAsync: async (saveOpts: { base64?: boolean }) => ({
              uri: `file:///cache/rendered-${++saveCounter}.jpg`,
              width,
              height,
              base64: saveOpts.base64 ? `b64(${uri}@${width}x${height})` : undefined,
            }),
          };
        },
      };
    },
  },
}));
// jest.mock factories can't close over outer `let`/`const` bindings unless
// the identifier is prefixed with "mock" - route through a prefixed getter.
function mockSourceDimsRef() {
  return mockSourceDims;
}

const FS = jest.requireMock("expo-file-system") as {
  __reset: () => void;
  __files: Map<string, { content: string; mtimeMs: number }>;
};

beforeEach(async () => {
  // Clears attachmentStore's own module-level LRU decrypt caches (fullCache/
  // thumbCache), which otherwise persist across tests and can serve a stale
  // hit for an id reused by a later test's uuid counter.
  await clearAllAttachments();
  FS.__reset();
  mockSourceDims.clear();
  mockEncrypt.mockClear();
  mockEncrypt.mockImplementation(async (plaintext: string) => `ENC(${plaintext})`);
  mockDecrypt.mockClear();
  saveCounter = 0;
  mockUuidCounter = 0;
});

describe("importAttachment", () => {
  it("downscales the thumbnail but not a full image already under the cap, and encrypts both", async () => {
    const attachment = await importAttachment("photo1");
    expect(attachment.id).toBe("attach-1");
    expect(attachment.width).toBe(800); // full image: 800x600 is under the 1600 cap, untouched
    expect(attachment.height).toBe(600);
    expect(Number.isNaN(Date.parse(attachment.createdAt))).toBe(false);

    const fullUri = "file:///document/attachments/attach-1.jpg.enc";
    const thumbUri = "file:///document/attachments/attach-1.thumb.jpg.enc";
    expect(FS.__files.get(fullUri)?.content).toBe("ENC(b64(photo1@800x600))");
    // Thumbnail: 800x600 has a longer edge than the 240 cap, so it's resized
    // width-first (800 >= 600) to 240x180 before saving.
    expect(FS.__files.get(thumbUri)?.content).toBe("ENC(b64(photo1@240x180))");
  });

  it("never upscales a source image smaller than the caps", async () => {
    mockSourceDims.set("tiny", { width: 100, height: 80 });
    const attachment = await importAttachment("tiny");
    expect(attachment.width).toBe(100);
    expect(attachment.height).toBe(80);
    const thumbUri = "file:///document/attachments/attach-1.thumb.jpg.enc";
    // Still under the 240 thumbnail cap - no resize, dimensions unchanged.
    expect(FS.__files.get(thumbUri)?.content).toBe("ENC(b64(tiny@100x80))");
  });

  it("resizes by height when the source is taller than it is wide", async () => {
    mockSourceDims.set("portrait", { width: 600, height: 1000 });
    await importAttachment("portrait");
    const fullUri = "file:///document/attachments/attach-1.jpg.enc";
    // Long edge (1000) exceeds MAX_FULL_EDGE (1600)? No - 1000 < 1600, so the
    // full image is untouched; only the thumbnail (240 cap) resizes by height.
    expect(FS.__files.get(fullUri)?.content).toBe("ENC(b64(portrait@600x1000))");
    const thumbUri = "file:///document/attachments/attach-1.thumb.jpg.enc";
    expect(FS.__files.get(thumbUri)?.content).toBe("ENC(b64(portrait@144x240))");
  });

  it("throws AttachmentEncryptionUnavailableError and writes nothing when the vault is down", async () => {
    mockEncrypt.mockResolvedValueOnce(null);
    await expect(importAttachment("photo1")).rejects.toBeInstanceOf(
      AttachmentEncryptionUnavailableError
    );
    expect(FS.__files.size).toBe(0);
  });

  it("deletes the already-written full image when the thumbnail write fails", async () => {
    mockEncrypt
      .mockResolvedValueOnce("ENC(full-ok)") // full image write succeeds
      .mockResolvedValueOnce(null); // thumbnail write fails
    await expect(importAttachment("photo1")).rejects.toBeInstanceOf(
      AttachmentEncryptionUnavailableError
    );
    // Neither file is left behind - the half-pair cleanup ran.
    expect(FS.__files.size).toBe(0);
  });
});

describe("reading back attachments", () => {
  it("round-trips the full image and thumbnail as data URIs", async () => {
    await importAttachment("photo1");
    const full = await getAttachmentDataUri("attach-1");
    const thumb = await getThumbnailDataUri("attach-1");
    expect(full).toBe("data:image/jpeg;base64,b64(photo1@800x600)");
    expect(thumb).toBe("data:image/jpeg;base64,b64(photo1@240x180)");
  });

  it("caches a decrypted image so a second read doesn't decrypt again", async () => {
    await importAttachment("photo1");
    mockDecrypt.mockClear();
    await getAttachmentDataUri("attach-1");
    await getAttachmentDataUri("attach-1");
    expect(mockDecrypt).toHaveBeenCalledTimes(1);
  });

  it("returns null for an id with no file on this device", async () => {
    expect(await getAttachmentDataUri("nope")).toBeNull();
    expect(await getThumbnailDataUri("nope")).toBeNull();
  });

  it("returns null when the stored blob fails decryption (tampered/corrupt)", async () => {
    await importAttachment("photo1");
    mockDecrypt.mockResolvedValueOnce(null);
    expect(await getAttachmentDataUri("attach-1")).toBeNull();
  });

  it("hasAttachmentFile reflects whether the full image exists on this device", async () => {
    await importAttachment("photo1");
    expect(hasAttachmentFile("attach-1")).toBe(true);
    expect(hasAttachmentFile("nope")).toBe(false);
  });
});

describe("deleteAttachmentFiles", () => {
  it("removes both files for the given ids and clears their caches", async () => {
    await importAttachment("photo1");
    await getAttachmentDataUri("attach-1"); // warm the cache
    await deleteAttachmentFiles(["attach-1"]);
    expect(hasAttachmentFile("attach-1")).toBe(false);
    expect(FS.__files.size).toBe(0);
    // A subsequent read must hit disk again (returns null - no crash from a
    // stale cache entry pointing at a deleted file).
    expect(await getAttachmentDataUri("attach-1")).toBeNull();
  });

  it("is a no-op for ids with no files, not a throw", async () => {
    await expect(deleteAttachmentFiles(["never-existed"])).resolves.toBeUndefined();
  });
});

describe("sweepOrphanedAttachments", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("returns 0 when the attachments directory doesn't exist yet", async () => {
    expect(await sweepOrphanedAttachments(new Set())).toBe(0);
  });

  it("deletes unreferenced files past the min-age gate, keeps a referenced one regardless of age", async () => {
    const createdAt = 1_700_000_000_000;
    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(createdAt);
    await importAttachment("keep"); // -> attach-1 (referenced)
    await importAttachment("old-orphan"); // -> attach-2 (unreferenced, old)
    dateSpy.mockRestore();

    const now = createdAt + 3 * DAY_MS; // well past the 48h min-age gate
    const removed = await sweepOrphanedAttachments(new Set(["attach-1"]), {
      nowMs: now,
    });

    // attach-2 (old, unreferenced): both files removed.
    // attach-1 (referenced): kept regardless of age.
    expect(removed).toBe(2);
    expect(hasAttachmentFile("attach-1")).toBe(true);
    expect(hasAttachmentFile("attach-2")).toBe(false);
  });

  it("leaves an unreferenced file alone while it's younger than the min-age gate", async () => {
    const createdAt = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(createdAt);
    await importAttachment("just-staged"); // attach-1, unreferenced
    jest.spyOn(Date, "now").mockRestore();

    const removed = await sweepOrphanedAttachments(new Set(), {
      nowMs: createdAt + 60_000, // 1 minute later - well under the 48h gate
    });
    expect(removed).toBe(0);
    expect(hasAttachmentFile("attach-1")).toBe(true);
  });

  it("clears the in-memory caches only when something was actually removed", async () => {
    const createdAt = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(createdAt);
    await importAttachment("orphan");
    jest.spyOn(Date, "now").mockRestore();
    await getAttachmentDataUri("attach-1"); // warm the full-image cache

    const removedNone = await sweepOrphanedAttachments(new Set(["attach-1"]), {
      nowMs: createdAt + 3 * DAY_MS,
    });
    expect(removedNone).toBe(0);
    mockDecrypt.mockClear();
    await getAttachmentDataUri("attach-1");
    expect(mockDecrypt).not.toHaveBeenCalled(); // cache survived - nothing removed

    const removedSome = await sweepOrphanedAttachments(new Set(), {
      nowMs: createdAt + 3 * DAY_MS,
    });
    expect(removedSome).toBe(2);
    mockDecrypt.mockClear();
    expect(await getAttachmentDataUri("attach-1")).toBeNull(); // file AND cache gone
  });
});

describe("clearAllAttachments", () => {
  it("removes the entire attachments directory", async () => {
    await importAttachment("photo1");
    await clearAllAttachments();
    expect(FS.__files.size).toBe(0);
    expect(hasAttachmentFile("attach-1")).toBe(false);
  });
});
