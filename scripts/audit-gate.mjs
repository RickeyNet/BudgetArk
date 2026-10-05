#!/usr/bin/env node
/**
 * BudgetArk - npm audit gate
 *
 * CI's SCA step (.github/workflows/security.yml) used to be a bare
 * `npm audit --audit-level=high`. That has no way to acknowledge an advisory
 * which has NO patched release yet: every PR goes red until the upstream
 * maintainer ships, and nothing can be merged in the meantime. This wrapper
 * keeps the same high/critical gate but tolerates advisories listed in
 * `.npm-audit-allowlist.json` - each with a reason and an `expires` date, so
 * an accepted risk is re-examined instead of forgotten.
 *
 * What stays strict:
 *   - Any high/critical advisory NOT on the allowlist fails the build.
 *   - An allowlisted advisory whose `expires` date has passed fails the build.
 *   - Only the exact GHSA ids are tolerated; a new advisory against the same
 *     package still fails.
 *   - Allowlist entries that no longer match anything are reported so they
 *     get removed (the fix shipped - take the upgrade, drop the exception).
 *
 * Usage:
 *   node scripts/audit-gate.mjs        # exit 1 on any unaccepted high+ finding
 *   npm run audit:gate
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const ALLOWLIST_PATH = resolve(root, ".npm-audit-allowlist.json");
const GATED = new Set(["high", "critical"]);
const GHSA_RE = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i;

/** Advisory id a `via` entry refers to (GHSA from the url, else its numeric source). */
export function advisoryId(via) {
  const m = GHSA_RE.exec(via.url ?? "");
  if (m) return m[0].toUpperCase();
  return via.source != null ? String(via.source) : via.name;
}

/**
 * Decide which vulnerable packages are fully explained by accepted advisories.
 * A package is accepted when every `via` entry is either an accepted advisory
 * or another package that is itself accepted. Pure so it can be unit tested.
 *
 * @param {Record<string, any>} vulnerabilities  `npm audit --json` .vulnerabilities
 * @param {Set<string>} accepted                  advisory ids still within their expiry
 * @returns {{ failing: string[], acceptedPackages: string[], seenAdvisories: Set<string> }}
 */
export function evaluate(vulnerabilities, accepted) {
  const memo = new Map();
  const seenAdvisories = new Set();

  const isAccepted = (name, stack = new Set()) => {
    if (memo.has(name)) return memo.get(name);
    if (stack.has(name)) return true; // cycle: let the other branch decide
    const v = vulnerabilities[name];
    if (!v) return false;
    stack.add(name);
    let ok = true;
    for (const via of v.via ?? []) {
      if (typeof via === "string") {
        if (!isAccepted(via, stack)) ok = false;
      } else {
        const id = advisoryId(via);
        seenAdvisories.add(id);
        if (!accepted.has(id)) ok = false;
      }
    }
    stack.delete(name);
    memo.set(name, ok);
    return ok;
  };

  const failing = [];
  const acceptedPackages = [];
  for (const [name, v] of Object.entries(vulnerabilities)) {
    if (!GATED.has(v.severity)) continue;
    if (isAccepted(name)) acceptedPackages.push(name);
    else failing.push(name);
  }
  return { failing, acceptedPackages, seenAdvisories };
}

/**
 * Split allowlist entries into live and expired, as of `today` (YYYY-MM-DD).
 * Ids are normalised to upper case to match `advisoryId` (GitHub prints GHSA
 * ids in lower-case hex; npm's urls sometimes don't).
 */
export function partitionAllowlist(entries, today) {
  const live = [];
  const expired = [];
  for (const e of entries) {
    if (!/^GHSA-/i.test(e.id ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(e.expires ?? "")) {
      throw new Error(`Malformed allowlist entry: ${JSON.stringify(e)}`);
    }
    const entry = { ...e, id: e.id.toUpperCase() };
    (entry.expires < today ? expired : live).push(entry);
  }
  return { live, expired };
}

function rootAdvisories(vulnerabilities, name, out = new Set(), stack = new Set()) {
  if (stack.has(name)) return out;
  stack.add(name);
  for (const via of vulnerabilities[name]?.via ?? []) {
    if (typeof via === "string") rootAdvisories(vulnerabilities, via, out, stack);
    else out.add(`${advisoryId(via)} (${via.name} ${via.range}: ${via.title})`);
  }
  return out;
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  const { live, expired } = partitionAllowlist(allowlist.advisories ?? [], today);
  const accepted = new Set(live.map((e) => e.id));

  // `npm audit --json` exits 1 whenever anything is found; the JSON is what
  // matters. Report the full tree (no --audit-level) so transitive chains
  // through moderate packages still resolve to their root advisories.
  const res = spawnSync("npm", ["audit", "--json"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(res.stdout);
  } catch {
    console.error("audit-gate: could not parse `npm audit --json` output");
    console.error(res.stdout?.slice(0, 2000));
    console.error(res.stderr?.slice(0, 2000));
    process.exit(2);
  }
  if (report.error) {
    console.error(`audit-gate: npm audit failed: ${report.error.summary ?? report.error.code}`);
    process.exit(2);
  }

  const vulnerabilities = report.vulnerabilities ?? {};
  const { failing, acceptedPackages, seenAdvisories } = evaluate(vulnerabilities, accepted);
  let exit = 0;

  if (expired.length) {
    exit = 1;
    console.error("audit-gate: EXPIRED allowlist entries - re-evaluate, then extend or drop them:");
    for (const e of expired) console.error(`  ${e.id} (${e.package}) expired ${e.expires}: ${e.reason}`);
  }

  if (failing.length) {
    exit = 1;
    console.error("audit-gate: high/critical advisories NOT covered by the allowlist:");
    for (const name of failing.sort()) {
      const v = vulnerabilities[name];
      console.error(`  ${name}@${v.range} [${v.severity}]`);
      for (const r of rootAdvisories(vulnerabilities, name)) console.error(`     <- ${r}`);
    }
  }

  const stale = live.filter((e) => !seenAdvisories.has(e.id));
  if (stale.length) {
    console.log("audit-gate: allowlist entries no longer reported (fix shipped? remove them):");
    for (const e of stale) console.log(`  ${e.id} (${e.package})`);
  }

  if (acceptedPackages.length) {
    console.log(
      `audit-gate: ${acceptedPackages.length} high/critical package(s) tolerated via allowlisted advisories: ` +
        [...new Set(live.map((e) => e.id))].join(", "),
    );
  }
  const meta = report.metadata?.vulnerabilities ?? {};
  console.log(
    `audit-gate: npm audit totals - critical ${meta.critical ?? 0}, high ${meta.high ?? 0}, ` +
      `moderate ${meta.moderate ?? 0}, low ${meta.low ?? 0}`,
  );
  console.log(exit ? "audit-gate: FAIL" : "audit-gate: PASS");
  process.exit(exit);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
