/**
 * BudgetArk - Encrypted receipt-photo store
 * File: src/services/attachments/attachmentStore.ts
 *
 * Owns the on-disk lifecycle of receipt photos attached to budget entries.
 * Every photo is downscaled + JPEG-compressed, then encrypted with the same
 * master key as the rest of the app's data (V3 envelope via
 * encryptedStorage's exported helpers) before it touches disk - the app
 * never persists a plaintext receipt. Per attachment id we keep two files
 * under <document>/attachments/:
 *
 *   <id>.jpg.enc        full image (max 1600px long edge, q0.7)
 *   <id>.thumb.jpg.enc  thumbnail (max 240px long edge, q0.6)
 *
 * Only EntryAttachment metadata rides the BudgetEntry through storage,
 * sync, and export; files are device-local in v1 (a partner device shows a
 * placeholder - see hasAttachmentFile).
 *
 * Deletion policy: files are eagerly deleted ONLY for cancelled staging
 * (photos imported this modal session that never made it onto a saved
 * entry). Everything else - entry deletes, edit-removals, sync tombstones,
 * imports - is handled by the age-gated orphan sweep, because the Undo
 * toast (and the 90-day sync tombstone window) must always be able to
 * restore an entry with its photos intact. See attachmentSweep.ts.
 */

import { Directory, File as ExpoFile, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import {
  encryptStringWithMasterKey,
  decryptStringWithMasterKey,
} from "../../storage/encryptedStorage";
import { generateUUID } from "../../utils/uuid";
import type { EntryAttachment } from "../../types";
import {
  planAttachmentSweep,
  DEFAULT_SWEEP_MIN_AGE_MS,
} from "./attachmentSweep";

const ATTACHMENTS_DIR_NAME = "attachments";

/** Long-edge cap for the stored full image (px). */
const MAX_FULL_EDGE = 1600;
const FULL_QUALITY = 0.7;
/** Long-edge cap for the list thumbnail (px). */
const MAX_THUMB_EDGE = 240;
const THUMB_QUALITY = 0.6;

/**
 * Thrown when the secure vault is unavailable - the caller must refuse the
 * photo (alert the user), never fall back to a plaintext file.
 */
export class AttachmentEncryptionUnavailableError extends Error {
  constructor() {
    super("Secure keystore unavailable; refusing to store a plaintext receipt");
    this.name = "AttachmentEncryptionUnavailableError";
  }
}

const attachmentsDir = (): Directory =>
  new Directory(Paths.document, ATTACHMENTS_DIR_NAME);

const ensureDir = (): Directory => {
  const dir = attachmentsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
};

const fullFileName = (id: string): string => `${id}.jpg.enc`;
const thumbFileName = (id: string): string => `${id}.thumb.jpg.enc`;

/* ── In-memory decrypt caches ──
 *
 * Decrypting a full image costs one native AES pass over ~a few hundred KB;
 * fine per view, wasteful per list render. Tiny LRUs (Map preserves
 * insertion order; re-insert on hit) keep the viewer's current neighbors
 * and the visible thumbnails warm without pinning megabytes forever.
 */
const makeLru = (capacity: number) => {
  const map = new Map<string, string>();
  return {
    get(key: string): string | undefined {
      const value = map.get(key);
      if (value !== undefined) {
        map.delete(key);
        map.set(key, value);
      }
      return value;
    },
    set(key: string, value: string): void {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      while (map.size > capacity) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    delete(key: string): void {
      map.delete(key);
    },
    clear(): void {
      map.clear();
    },
  };
};

const fullCache = makeLru(3);
const thumbCache = makeLru(30);

/**
 * Renders `sourceUri` capped to `maxEdge` (never upscales) and returns the
 * JPEG base64 plus final dimensions.
 */
const renderJpegBase64 = async (
  sourceUri: string,
  maxEdge: number,
  quality: number
): Promise<{ base64: string; width: number; height: number }> => {
  // First render to learn the source dimensions, then resize only when the
  // image is actually larger than the cap - resize({width}) would upscale.
  let image = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const longEdge = Math.max(image.width, image.height);
  if (longEdge > maxEdge) {
    const context = ImageManipulator.manipulate(sourceUri);
    if (image.width >= image.height) {
      context.resize({ width: maxEdge });
    } else {
      context.resize({ height: maxEdge });
    }
    image = await context.renderAsync();
  }
  const saved = await image.saveAsync({
    base64: true,
    compress: quality,
    format: SaveFormat.JPEG,
  });
  // The manipulator wrote a plaintext temp file to produce the base64 -
  // remove it so unencrypted image bytes don't linger in the cache dir.
  try {
    const temp = new ExpoFile(saved.uri);
    if (temp.exists) temp.delete();
  } catch {
    // Cache-dir cleanup is best-effort; the OS clears it eventually.
  }
  if (!saved.base64) {
    throw new Error("Image render produced no data");
  }
  return { base64: saved.base64, width: saved.width, height: saved.height };
};

const writeEncrypted = async (fileName: string, base64: string): Promise<void> => {
  const blob = await encryptStringWithMasterKey(base64);
  if (blob === null) {
    throw new AttachmentEncryptionUnavailableError();
  }
  const file = new ExpoFile(ensureDir(), fileName);
  file.create({ overwrite: true });
  file.write(blob, { encoding: "utf8" });
};

const readDecryptedDataUri = async (fileName: string): Promise<string | null> => {
  const file = new ExpoFile(attachmentsDir(), fileName);
  if (!file.exists) return null;
  let blob: string;
  try {
    blob = await file.text();
  } catch {
    return null;
  }
  const base64 = await decryptStringWithMasterKey(blob);
  if (base64 === null) return null;
  return `data:image/jpeg;base64,${base64}`;
};

/**
 * Imports a picked/captured photo: downscale, thumbnail, encrypt both,
 * write to the attachments directory, and return the metadata to put on
 * the entry. The files exist from this moment on - a cancelled Add modal
 * must call deleteAttachmentFiles for its staged ids (a crash is covered
 * by the orphan sweep's min-age gate).
 *
 * @throws AttachmentEncryptionUnavailableError when the vault is down.
 */
export const importAttachment = async (
  sourceUri: string
): Promise<EntryAttachment> => {
  const id = generateUUID();
  const full = await renderJpegBase64(sourceUri, MAX_FULL_EDGE, FULL_QUALITY);
  const thumb = await renderJpegBase64(sourceUri, MAX_THUMB_EDGE, THUMB_QUALITY);

  await writeEncrypted(fullFileName(id), full.base64);
  try {
    await writeEncrypted(thumbFileName(id), thumb.base64);
  } catch (error) {
    // Don't leave a half-pair behind if the thumbnail write fails.
    try {
      const file = new ExpoFile(attachmentsDir(), fullFileName(id));
      if (file.exists) file.delete();
    } catch {
      // Sweep will collect it.
    }
    throw error;
  }

  return {
    id,
    createdAt: new Date().toISOString(),
    width: full.width,
    height: full.height,
  };
};

/** Full-resolution image as a data URI, or null when missing/unreadable. */
export const getAttachmentDataUri = async (id: string): Promise<string | null> => {
  const cached = fullCache.get(id);
  if (cached) return cached;
  const dataUri = await readDecryptedDataUri(fullFileName(id));
  if (dataUri) fullCache.set(id, dataUri);
  return dataUri;
};

/** Thumbnail as a data URI, or null when missing/unreadable. */
export const getThumbnailDataUri = async (id: string): Promise<string | null> => {
  const cached = thumbCache.get(id);
  if (cached) return cached;
  const dataUri = await readDecryptedDataUri(thumbFileName(id));
  if (dataUri) thumbCache.set(id, dataUri);
  return dataUri;
};

/**
 * Whether this device holds the image file for the attachment. False on a
 * partner device that received the metadata via sync - the UI shows a
 * "photo on partner's device" placeholder.
 */
export const hasAttachmentFile = (id: string): boolean => {
  try {
    return new ExpoFile(attachmentsDir(), fullFileName(id)).exists;
  } catch {
    return false;
  }
};

/**
 * Eager delete for cancelled staging ONLY - see the header comment.
 * Missing files are a no-op.
 */
export const deleteAttachmentFiles = async (ids: readonly string[]): Promise<void> => {
  for (const id of ids) {
    fullCache.delete(id);
    thumbCache.delete(id);
    for (const name of [fullFileName(id), thumbFileName(id)]) {
      try {
        const file = new ExpoFile(attachmentsDir(), name);
        if (file.exists) file.delete();
      } catch {
        // Leave it for the sweep rather than surfacing a delete error.
      }
    }
  }
};

/**
 * Deletes attachment files no entry (live or tombstoned) references
 * anymore, respecting the min-age gate. Returns the number of files
 * removed. See attachmentSweep.ts for the decision rules.
 */
export const sweepOrphanedAttachments = async (
  referencedIds: ReadonlySet<string>,
  opts: { minAgeMs?: number; nowMs?: number } = {}
): Promise<number> => {
  const dir = attachmentsDir();
  if (!dir.exists) return 0;

  let listing: (ExpoFile | Directory)[];
  try {
    listing = dir.list();
  } catch {
    return 0;
  }
  const files = listing
    .filter((item): item is ExpoFile => item instanceof ExpoFile)
    .map((file) => ({
      name: file.name,
      // Epoch ms, null when unreadable (sweep keeps those - fail safe).
      modifiedAtMs: file.lastModified ?? null,
    }));

  const doomed = planAttachmentSweep(
    files,
    referencedIds,
    opts.nowMs ?? Date.now(),
    opts.minAgeMs ?? DEFAULT_SWEEP_MIN_AGE_MS
  );

  let removed = 0;
  for (const name of doomed) {
    try {
      const file = new ExpoFile(dir, name);
      if (file.exists) {
        file.delete();
        removed++;
      }
    } catch {
      // Try again on a future sweep.
    }
  }
  if (removed > 0) {
    fullCache.clear();
    thumbCache.clear();
  }
  return removed;
};

/** Reset All Data: remove every attachment file and the directory itself. */
export const clearAllAttachments = async (): Promise<void> => {
  fullCache.clear();
  thumbCache.clear();
  try {
    const dir = attachmentsDir();
    if (dir.exists) dir.delete();
  } catch {
    // Best-effort - a failed delete leaves only encrypted blobs behind.
  }
};
