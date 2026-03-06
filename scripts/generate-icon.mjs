/**
 * generate-icon.mjs
 * Generates all app icon PNGs from an inline SVG design.
 *
 * Slate grey background + dark orange boat icon.
 *
 * Usage: node scripts/generate-icon.mjs
 */

import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");

/* -- SVG design (1024x1024 viewBox) -- */

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="#6b747c"/>
      <stop offset="70%" stop-color="#5b646c"/>
      <stop offset="100%" stop-color="#4a535a"/>
    </radialGradient>

    <radialGradient id="halo" cx="50%" cy="52%" r="34%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="boatBody" x1="18%" y1="0%" x2="82%" y2="100%">
      <stop offset="0%" stop-color="#a5451f"/>
      <stop offset="52%" stop-color="#853816"/>
      <stop offset="100%" stop-color="#6a2d12"/>
    </linearGradient>

    <linearGradient id="boatSide" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7a3415"/>
      <stop offset="100%" stop-color="#59260f"/>
    </linearGradient>

    <filter id="shadow" x="-25%" y="-25%" width="170%" height="170%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur"/>
      <feOffset dx="0" dy="16" result="off"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.35"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="off"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="420" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="74"/>
  <circle cx="512" cy="540" r="320" fill="url(#halo)"/>

  <g filter="url(#shadow)">
    <path d="M276 502 C354 454 670 454 748 502 C678 536 346 540 276 502 Z"
      fill="#4a1f0e" opacity="0.95"/>

    <path d="M230 548 C326 468 698 468 794 548 C706 628 318 632 230 548 Z"
      fill="url(#boatBody)"/>

    <path d="M300 568 C390 536 636 536 726 568 C656 606 370 608 300 568 Z"
      fill="url(#boatSide)" opacity="0.82"/>

    <rect x="458" y="444" width="108" height="54" rx="12" fill="#b85a2a"/>
    <rect x="476" y="458" width="72" height="24" rx="7" fill="#6c2f15" opacity="0.75"/>

    <path d="M256 542 C338 482 686 482 768 542"
      fill="none" stroke="#d57a49" stroke-width="10" stroke-linecap="round" opacity="0.92"/>

    <path d="M278 550 C372 586 652 586 746 550"
      fill="none" stroke="#c86b3d" stroke-width="7" stroke-linecap="round" opacity="0.72"/>
  </g>
</svg>
`;

/* -- Generate PNGs -- */

async function generate() {
  const svgBuf = Buffer.from(svg);

  await sharp(svgBuf)
    .resize(1024, 1024)
    .png()
    .toFile(join(ASSETS, "icon.png"));
  console.log("  icon.png (1024x1024)");

  await sharp(svgBuf)
    .resize(1024, 1024)
    .png()
    .toFile(join(ASSETS, "adaptive-icon.png"));
  console.log("  adaptive-icon.png (1024x1024)");

  await sharp(svgBuf)
    .resize(48, 48)
    .png()
    .toFile(join(ASSETS, "favicon.png"));
  console.log("  favicon.png (48x48)");

  await sharp(svgBuf)
    .resize(512, 512)
    .png()
    .toFile(join(ASSETS, "splash-icon.png"));
  console.log("  splash-icon.png (512x512)");

  console.log("\nDone - all icons written to assets/");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
