import { promises as fs } from "fs";
import { join, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_IPHONE_DIR = join(ROOT, "screenshots", "raw", "iphone");
const RAW_IPAD_DIR = join(ROOT, "screenshots", "raw", "ipad");
const OUTPUT_DIR = join(ROOT, "screenshots", "app-store");

const TARGETS = [
  { key: "iphone-6.9", width: 1320, height: 2868, source: "iphone" },
  { key: "iphone-6.5", width: 1242, height: 2688, source: "iphone" },
  { key: "ipad-13", width: 2064, height: 2752, source: "ipad" },
  { key: "ipad-12.9", width: 2048, height: 2732, source: "ipad" },
];

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

const ensureDir = async (path) => {
  await fs.mkdir(path, { recursive: true });
};

const listImages = async (path) => {
  try {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => ALLOWED_EXTENSIONS.has(extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

const formatOutputName = (index, sourceName) => {
  const numeric = String(index + 1).padStart(2, "0");
  const safeBase = basename(sourceName, extname(sourceName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${numeric}-${safeBase || "screen"}.png`;
};

const renderTarget = async (target, sourceFileNames, sourceDir) => {
  const targetDir = join(OUTPUT_DIR, target.key);
  await ensureDir(targetDir);

  for (let i = 0; i < sourceFileNames.length; i += 1) {
    const sourceName = sourceFileNames[i];
    const sourcePath = join(sourceDir, sourceName);
    const outputPath = join(targetDir, formatOutputName(i, sourceName));

    await sharp(sourcePath)
      .rotate()
      .resize(target.width, target.height, {
        fit: "cover",
        position: "centre",
      })
      .png({ quality: 100 })
      .toFile(outputPath);
  }

  return targetDir;
};

const main = async () => {
  const iphoneRaw = await listImages(RAW_IPHONE_DIR);
  const ipadRaw = await listImages(RAW_IPAD_DIR);

  if (iphoneRaw.length === 0) {
    throw new Error(
      "No iPhone source screenshots found. Add files to screenshots/raw/iphone/."
    );
  }

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await ensureDir(OUTPUT_DIR);

  for (const target of TARGETS) {
    const explicitSource = target.source === "ipad" ? ipadRaw : iphoneRaw;
    const fallbackSource = target.source === "ipad" ? iphoneRaw : [];
    const sourceFileNames = explicitSource.length > 0 ? explicitSource : fallbackSource;

    if (sourceFileNames.length === 0) {
      throw new Error(
        `No source screenshots available for ${target.key}. Add files to screenshots/raw/${target.source}/.`
      );
    }

    const sourceDir = explicitSource.length > 0 ? (target.source === "ipad" ? RAW_IPAD_DIR : RAW_IPHONE_DIR) : RAW_IPHONE_DIR;
    const outputPath = await renderTarget(target, sourceFileNames, sourceDir);
    console.log(`Generated ${target.key} -> ${outputPath}`);
  }

  console.log("\nDone. Upload each folder in screenshots/app-store/ to matching App Store Connect size buckets.");
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
