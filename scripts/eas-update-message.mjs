#!/usr/bin/env node
/**
 * Emit the top RELEASE_NOTES entry as a JSON string suitable for
 * `eas update --message`. The running (older) bundle parses this payload
 * out of the manifest so the OTA prompt can show highlights for the
 * incoming version even though that version isn't in the user's baked-in
 * RELEASE_NOTES list yet.
 *
 * Usage (bash / git-bash):
 *   eas update --branch production --message "$(node scripts/eas-update-message.mjs)"
 *
 * Usage (PowerShell - the subexpression is passed as one argument):
 *   eas update --branch production --message (node scripts/eas-update-message.mjs)
 *
 * Always publish through one of these so the running (older) bundle can show
 * highlights for the incoming version. If you forget, the app still surfaces
 * the notes from its baked-in list right after the update reloads - see the
 * post-install fallback in App.tsx checkReleaseNotesPrompt - so notes are
 * never silently lost, the preview just won't appear until after install.
 *
 * Or via npm (emits the message only):
 *   npm run update:message
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, "..", "src", "data", "releaseNotes.ts");
const src = readFileSync(file, "utf8");

const arrayStart = src.indexOf("RELEASE_NOTES");
if (arrayStart < 0) {
  console.error("RELEASE_NOTES not found in src/data/releaseNotes.ts");
  process.exit(1);
}

const firstBrace = src.indexOf("{", arrayStart);
if (firstBrace < 0) {
  console.error("Could not find first release-note entry");
  process.exit(1);
}

let depth = 0;
let end = -1;
for (let i = firstBrace; i < src.length; i++) {
  const ch = src[i];
  if (ch === "{") depth++;
  else if (ch === "}") {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end < 0) {
  console.error("Unbalanced braces parsing first release-note entry");
  process.exit(1);
}

const entryText = src.slice(firstBrace, end);

const pickString = (key) => {
  const re = new RegExp(`\\b${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = entryText.match(re);
  return m ? JSON.parse(`"${m[1]}"`) : undefined;
};

const version = pickString("version");
const title = pickString("title");
const releasedAt = pickString("releasedAt");

const hlMatch = entryText.match(/highlights\s*:\s*\[([\s\S]*?)\]/);
const highlights = [];
if (hlMatch) {
  const body = hlMatch[1];
  const strRe = /"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = strRe.exec(body)) !== null) {
    highlights.push(JSON.parse(`"${m[1]}"`));
  }
}

if (!version || !title || !releasedAt || highlights.length === 0) {
  console.error("Top RELEASE_NOTES entry missing required fields", {
    version,
    title,
    releasedAt,
    highlightCount: highlights.length,
  });
  process.exit(1);
}

const payload = { version, title, releasedAt, highlights };
process.stdout.write(JSON.stringify(payload));
