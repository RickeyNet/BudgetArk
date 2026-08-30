/**
 * BudgetArk - auto-backup file store tests
 * File: src/services/autoBackup/__tests__/autoBackupStore.test.ts
 *
 * Guards the on-disk lifecycle of scheduled local backups: every write goes
 * through encryptStringWithMasterKey (never a plaintext file), a vault-down
 * encrypt surfaces AutoBackupEncryptionUnavailableError instead of
 * degrading to plaintext, a successful write prunes down to AUTO_BACKUP_KEEP
 * (oldest first, and only AFTER the new write lands), and reads are
 * fail-closed for names that aren't ours, missing files, and
 * tampered/undecryptable blobs. (Naming/prune/due-check math itself is
 * covered separately in autoBackupPlan.test.ts.) expo-file-system and the
 * master-key encrypt/decrypt helpers are mocked with a real in-memory
 * filesystem so the store's own Directory/File usage runs unmodified.
 */
import { Directory, File, Paths } from "expo-file-system";
import { AUTO_BACKUP_KEEP, autoBackupFileName } from "../autoBackupPlan";
import {
  AutoBackupEncryptionUnavailableError,
  clearAllAutoBackups,
  listAutoBackups,
  readAutoBackupJson,
  writeAutoBackup,
} from "../autoBackupStore";

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
 * Mirrors just the surface autoBackupStore.ts uses: Directory/File with
 * exists/create/write/text/delete/list/size, plus Paths.document.
 */
jest.mock("expo-file-system", () => {
  const files = new Map<string, { content: string }>();
  const dirs = new Set<string>();

  class FakeFile {
    uri: string;
    name: string;
    constructor(parent: { uri: string } | string, name?: string) {
      // Two forms: (dirLike, name) - a child of a directory - or (fullUri)
      // alone. Dispatch on whether `name` was passed, not on the type of
      // `parent`: a Directory's own `.uri` is itself a string.
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
        files.set(this.uri, { content: "" });
      }
    }
    write(content: string) {
      files.set(this.uri, { content });
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
    get size() {
      return files.get(this.uri)?.content.length;
    }
  }

  class FakeDirectory {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      this.uri =
        typeof parent === "string" && name === undefined
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

const FS = jest.requireMock("expo-file-system") as {
  __reset: () => void;
  __files: Map<string, { content: string }>;
};

// "autobackups", mirroring autoBackupStore.ts's own private AUTO_BACKUP_DIR_NAME -
// tests that need to seed a non-backup file directly duplicate the literal.
const AUTO_BACKUP_DIR_NAME = "autobackups";

const BASE_MS = 1_700_000_000_000;

beforeEach(() => {
  FS.__reset();
  mockEncrypt.mockClear();
  mockEncrypt.mockImplementation(async (plaintext: string) => `ENC(${plaintext})`);
  mockDecrypt.mockClear();
  jest.spyOn(Date, "now").mockRestore();
});

describe("listAutoBackups", () => {
  it("returns [] when the backups directory doesn't exist yet", async () => {
    expect(await listAutoBackups()).toEqual([]);
  });

  it("lists a written backup with its name, timestamp, and size", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const info = await writeAutoBackup('{"debts":[]}');
    expect(info.name).toBe(autoBackupFileName(1_700_000_000_000));
    expect(info.timestampMs).toBe(1_700_000_000_000);
    expect(info.sizeBytes).toBe("ENC({\"debts\":[]})".length);

    const listed = await listAutoBackups();
    expect(listed).toEqual([info]);
  });

  it("ignores files that don't match the backup naming pattern", async () => {
    const dir = new Directory(Paths.document, AUTO_BACKUP_DIR_NAME);
    dir.create({ intermediates: true, idempotent: true });
    const junk = new File(dir, "notes.txt");
    junk.create();
    junk.write("hello", { encoding: "utf8" });

    expect(await listAutoBackups()).toEqual([]);
  });

  it("sorts multiple backups newest first", async () => {
    // parseAutoBackupFileName requires a 10-16 digit timestamp (real epoch
    // ms is always 13 digits) - small ints like 1000 would fail to parse
    // and be silently filtered out as "not one of ours".
    jest.spyOn(Date, "now").mockReturnValue(BASE_MS);
    const older = await writeAutoBackup("a");
    jest.spyOn(Date, "now").mockReturnValue(BASE_MS + 1_000);
    const newer = await writeAutoBackup("b");

    expect((await listAutoBackups()).map((f) => f.name)).toEqual([
      newer.name,
      older.name,
    ]);
  });
});

describe("writeAutoBackup", () => {
  it("encrypts the export JSON before writing", async () => {
    jest.spyOn(Date, "now").mockReturnValue(BASE_MS);
    await writeAutoBackup('{"secret":"value"}');
    const stored = Array.from(FS.__files.values())[0]?.content;
    // Our mock encrypt is a transparent wrapper (real AES obscures the
    // content; asserting that here would just be re-testing the crypto
    // layer). What this guards is that the store passes the plaintext
    // through encryptStringWithMasterKey - never file.write(plaintext, ...).
    expect(stored).toBe('ENC({"secret":"value"})');
    expect(mockEncrypt).toHaveBeenCalledWith('{"secret":"value"}');
  });

  it("throws AutoBackupEncryptionUnavailableError and writes nothing when the vault is down", async () => {
    mockEncrypt.mockResolvedValueOnce(null);
    await expect(writeAutoBackup("{}")).rejects.toBeInstanceOf(
      AutoBackupEncryptionUnavailableError
    );
    expect(FS.__files.size).toBe(0);
  });

  it("prunes older backups down to AUTO_BACKUP_KEEP only after the new write succeeds", async () => {
    for (let i = 0; i < AUTO_BACKUP_KEEP; i++) {
      jest.spyOn(Date, "now").mockReturnValue(BASE_MS + i);
      await writeAutoBackup(`backup-${i}`);
    }
    expect(await listAutoBackups()).toHaveLength(AUTO_BACKUP_KEEP);

    jest.spyOn(Date, "now").mockReturnValue(BASE_MS + AUTO_BACKUP_KEEP); // newest
    const newest = await writeAutoBackup("backup-newest");

    const remaining = await listAutoBackups();
    expect(remaining).toHaveLength(AUTO_BACKUP_KEEP);
    // The newest write survives; the very oldest is pruned.
    expect(remaining.map((f) => f.name)).toContain(newest.name);
    expect(remaining.map((f) => f.timestampMs)).not.toContain(BASE_MS);
  });

  it("never prunes below the keep count when a write fails to encrypt", async () => {
    jest.spyOn(Date, "now").mockReturnValue(BASE_MS);
    await writeAutoBackup("a");
    mockEncrypt.mockResolvedValueOnce(null);
    await expect(writeAutoBackup("b")).rejects.toBeInstanceOf(
      AutoBackupEncryptionUnavailableError
    );
    // The failed write never landed, so the original backup is untouched.
    expect(await listAutoBackups()).toHaveLength(1);
  });
});

describe("readAutoBackupJson", () => {
  it("decrypts a valid backup back to the original JSON", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const info = await writeAutoBackup('{"a":1}');
    expect(await readAutoBackupJson(info.name)).toBe('{"a":1}');
  });

  it("returns null for a name that doesn't parse as one of ours (fail-closed)", async () => {
    expect(await readAutoBackupJson("not-a-backup.enc")).toBeNull();
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it("returns null for a missing file", async () => {
    expect(await readAutoBackupJson(autoBackupFileName(123))).toBeNull();
  });

  it("returns null for a tampered/undecryptable blob", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const info = await writeAutoBackup('{"a":1}');
    mockDecrypt.mockResolvedValueOnce(null);
    expect(await readAutoBackupJson(info.name)).toBeNull();
  });
});

describe("clearAllAutoBackups", () => {
  it("removes every backup and the directory itself", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    await writeAutoBackup("a");
    await clearAllAutoBackups();
    expect(await listAutoBackups()).toEqual([]);
    expect(FS.__files.size).toBe(0);
  });

  it("is a no-op (not a throw) when nothing was ever written", async () => {
    await expect(clearAllAutoBackups()).resolves.toBeUndefined();
  });
});
