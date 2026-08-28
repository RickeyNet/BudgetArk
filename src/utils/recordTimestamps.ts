/**
 * BudgetArk - Record Timestamp Helpers
 * File: src/utils/recordTimestamps.ts
 *
 * `updatedAt` drives every last-write-wins decision (partner sync, JSON
 * import) and the outgoing-diff watermark filter. Records persisted before
 * a collection gained the field - or restored from such a backup - have no
 * `updatedAt`, and a naive `new Date(undefined).getTime()` is NaN: NaN never
 * compares greater than the watermark (never sent) and never compares >=
 * anything (never overwritten). Such records were invisible to sync in
 * BOTH directions while the UI still counted them as "received".
 *
 * Two tools, used together:
 *  - `ensureUpdatedAt` is the read-time normalizer every storage getter
 *    runs (and persists via its atomic repair path), falling back to
 *    `createdAt` - the honest "last modified" for a never-edited record -
 *    and only then to now. Same-ref when nothing is missing, so the
 *    steady-state read allocates nothing.
 *  - `timestampMs` is the NaN-safe comparison the merge/filter code uses
 *    as a belt-and-braces guard for records that arrive from a peer or an
 *    import without passing through a normalizing getter.
 */

export interface Timestamped {
  createdAt?: string;
  updatedAt?: string;
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

/**
 * Returns the record itself when `updatedAt` is present; otherwise a copy
 * stamped with `createdAt` (preferred) or `now`.
 */
export const ensureUpdatedAt = <T extends Timestamped>(
  record: T,
  now: () => string = () => new Date().toISOString()
): T => {
  if (isNonEmptyString(record.updatedAt)) return record;
  return {
    ...record,
    updatedAt: isNonEmptyString(record.createdAt) ? record.createdAt : now(),
  };
};

/**
 * Epoch milliseconds for an ISO timestamp; missing or unparseable values
 * map to 0 (the epoch) so a stamped record always wins against them and
 * a comparison never silently evaluates to false via NaN.
 */
export const timestampMs = (iso: unknown): number => {
  if (typeof iso !== "string") return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};
