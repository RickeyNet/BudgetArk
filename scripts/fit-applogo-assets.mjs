import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");
const SOURCE = join(ASSETS, "applogo.png");

async function createContainedSquare({
  size,
  scale,
  background,
  output,
}) {
  const inner = Math.round(size * scale);

  const fitted = await sharp(SOURCE)
    .trim()
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: fitted, gravity: "center" }])
    .png()
    .toFile(join(ASSETS, output));

  console.log(`  ${output} (${size}x${size})`);
}

async function main() {
  // iOS app icon: full square, padded slightly for visual breathing room.
  await createContainedSquare({
    size: 1024,
    scale: 1.0,
    background: "#5b646c",
    output: "icon.png",
  });

  // Android adaptive foreground: transparent canvas, tighter safe area.
  await createContainedSquare({
    size: 1024,
    scale: 0.74,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    output: "adaptive-icon.png",
  });

  // Splash symbol: centered asset with comfortable margins.
  await createContainedSquare({
    size: 512,
    scale: 0.82,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    output: "splash-icon.png",
  });

  // Web favicon: full mark for legibility.
  await createContainedSquare({
    size: 48,
    scale: 1,
    background: "#5b646c",
    output: "favicon.png",
  });

  console.log("\nDone - all logo variants generated from assets/applogo.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
