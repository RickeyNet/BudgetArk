#!/usr/bin/env node
/**
 * Emit the top RELEASE_NOTES entry as a JSON string suitable for
 * `eas update --message`, with each highlight cut down to its headline and
 * only as many headlines as fit in eas-cli's 1024-character message limit.
 * The running (older) bundle parses this payload out of the manifest so the
 * OTA prompt can show highlights for the incoming version even though that
 * version isn't in the user's baked-in RELEASE_NOTES list yet.
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

// Headlines only: the Update Ready dialog is a nudge to install, not the
// changelog. Summarizing here (not just in the app) means bundles already in
// the field - which print each highlight verbatim - get the short form too.
// The full text ships inside the update and shows on the Release Notes
// screen once it installs.
//
// Mirror of summarizeHighlight in src/utils/updateReleaseNotes.ts (this
// script can't import TypeScript). releaseNotes.test.ts fails if they drift.
const HIGHLIGHT_SUMMARY_MAX = 100;
const summarizeHighlight = (highlight) => {
  const text = highlight.trim().replace(/\s+/g, " ");
  const sentence = text.match(/^.*?[.!?](?=\s+[A-Z0-9'"(]|$)/)?.[0] ?? text;
  if (sentence.length <= HIGHLIGHT_SUMMARY_MAX) return sentence;
  const cut = sentence.slice(0, HIGHLIGHT_SUMMARY_MAX - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const head = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-]+$/, "");
  return `${head}\u2026`;
};

// eas-cli cuts --message to 1024 characters, and a cut payload is no longer
// JSON - the app would show no highlights at all. So stamp the headlines that
// fit and say how many there are in total (the dialog's "+N more" counts from
// `total`). Mirror of OTA_MESSAGE_MAX in src/utils/updateReleaseNotes.ts.
const OTA_MESSAGE_MAX = 1024;
const payload = { version, title, releasedAt, highlights: [], total: highlights.length };
for (const headline of highlights.map(summarizeHighlight)) {
  payload.highlights.push(headline);
  if (JSON.stringify(payload).length > OTA_MESSAGE_MAX) {
    payload.highlights.pop();
    break;
  }
}
if (payload.highlights.length === 0) {
  console.error(`No highlight fits in the ${OTA_MESSAGE_MAX}-character update message`);
  process.exit(1);
}
process.stdout.write(JSON.stringify(payload));
