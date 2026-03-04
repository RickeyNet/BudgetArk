/**
 * generate-icon.mjs
 * Generates all app icon PNGs from an inline SVG design.
 *
 * Deep forest background + electric arcs around a dollar sign.
 *
 * Usage:  node scripts/generate-icon.mjs
 */

import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");

/* ── SVG design (1024×1024 viewBox) ── */

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Deep forest radial background -->
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0f2618"/>
      <stop offset="60%" stop-color="#091a10"/>
      <stop offset="100%" stop-color="#040e08"/>
    </radialGradient>

    <!-- Subtle green glow behind the dollar sign -->
    <radialGradient id="glow" cx="50%" cy="50%" r="35%">
      <stop offset="0%" stop-color="#5eada5" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#5eada5" stop-opacity="0"/>
    </radialGradient>

    <!-- Electric arc gradient -->
    <linearGradient id="arc1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#89ddff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#5eada5" stop-opacity="1"/>
      <stop offset="100%" stop-color="#c3e88d" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="arc2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c3e88d" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#89ddff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#5eada5" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Outer glow filter for arcs -->
    <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Stronger glow for the dollar sign -->
    <filter id="dollarGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Fine glow for small sparks -->
    <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>

  <!-- Subtle vignette ring -->
  <circle cx="512" cy="512" r="420" fill="none" stroke="#5eada5" stroke-opacity="0.06" stroke-width="80"/>

  <!-- Centre glow -->
  <circle cx="512" cy="512" r="360" fill="url(#glow)"/>

  <!-- ══ Single lightning bolt, angled top-right to bottom-left ══ -->

  <!-- Outer glow layer -->
  <path d="
    M 700 80  L 560 300  L 700 315  L 420 580
    L 580 595  L 320 940
  " fill="none" stroke="#5eada5" stroke-width="30"
    stroke-linecap="round" stroke-linejoin="bevel"
    filter="url(#arcGlow)" opacity="0.4"/>

  <!-- Main bolt fill -->
  <polygon points="
    700,80  560,300  700,315  420,580  580,595  320,940
    420,905  550,625  400,610  660,355  540,340  740,110
  " fill="url(#arc1)" opacity="0.95"/>

  <!-- Bright edge highlight -->
  <path d="
    M 700 80  L 560 300  L 700 315  L 420 580
    L 580 595  L 320 940
  " fill="none" stroke="#ffffff" stroke-width="4"
    stroke-linecap="round" stroke-linejoin="bevel"
    filter="url(#arcGlow)" opacity="0.7"/>


</svg>
`;

/* ── Generate PNGs ── */

async function generate() {
  const svgBuf = Buffer.from(svg);

  // icon.png — 1024×1024
  await sharp(svgBuf)
    .resize(1024, 1024)
    .png()
    .toFile(join(ASSETS, "icon.png"));
  console.log("  icon.png (1024x1024)");

  // adaptive-icon.png — 1024×1024 (Android uses safe zone; same source is fine)
  await sharp(svgBuf)
    .resize(1024, 1024)
    .png()
    .toFile(join(ASSETS, "adaptive-icon.png"));
  console.log("  adaptive-icon.png (1024x1024)");

  // favicon.png — 48×48
  await sharp(svgBuf)
    .resize(48, 48)
    .png()
    .toFile(join(ASSETS, "favicon.png"));
  console.log("  favicon.png (48x48)");

  // splash-icon.png — 512×512
  await sharp(svgBuf)
    .resize(512, 512)
    .png()
    .toFile(join(ASSETS, "splash-icon.png"));
  console.log("  splash-icon.png (512x512)");

  console.log("\nDone — all icons written to assets/");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
