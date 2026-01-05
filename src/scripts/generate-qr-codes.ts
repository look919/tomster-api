import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "https://tomsterr.vercel.app";
const OUTPUT_DIR = path.join(__dirname, "../../data/qr");

async function generateQRCodes() {
  // Read variants from JSON file
  const variantsPath = path.join(
    __dirname,
    "../../generated/all-possible-block-variants.json"
  );
  const variantsContent = await fs.readFile(variantsPath, "utf-8");
  const allVariants = JSON.parse(variantsContent);

  // Create output directory if it doesn't exist
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const variantKeys = Object.keys(allVariants);
  console.log(`Generating ${variantKeys.length} QR codes...`);

  // Generate PNG files
  for (const variantKey of variantKeys) {
    const url = `${BASE_URL}?variant=${variantKey}&playSong=true`;
    const filename = `${variantKey}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    try {
      await QRCode.toFile(filepath, url, {
        width: 720,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      console.log(`✓ Generated: ${filename}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${filename}:`, error);
    }
  }

  // Also generate SVG versions
  const svgDir = path.join(OUTPUT_DIR, "svg");
  await fs.mkdir(svgDir, { recursive: true });

  for (const variantKey of variantKeys) {
    const url = `${BASE_URL}?variant=${variantKey}&playSong=true`;
    const filename = `${variantKey}.svg`;
    const filepath = path.join(svgDir, filename);

    try {
      const svg = await QRCode.toString(url, { type: "svg", width: 720 });
      await fs.writeFile(filepath, svg);
    } catch (error) {
      console.error(`✗ Failed to generate SVG ${filename}:`, error);
    }
  }

  // Generate EMPTY QR code (just BASE_URL without variant)
  try {
    const emptyPngPath = path.join(OUTPUT_DIR, "EMPTY.png");
    await QRCode.toFile(emptyPngPath, `${BASE_URL}?playSong=true`, {
      width: 720,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    console.log(`✓ Generated: EMPTY.png`);

    const emptySvgPath = path.join(svgDir, "EMPTY.svg");
    const emptySvg = await QRCode.toString(`${BASE_URL}?playSong=true`, {
      type: "svg",
      width: 720,
    });
    await fs.writeFile(emptySvgPath, emptySvg);
    console.log(`✓ Generated: EMPTY.svg`);
  } catch (error) {
    console.error(`✗ Failed to generate EMPTY QR code:`, error);
  }

  console.log(
    `\n✅ Done! Generated ${variantKeys.length + 1} QR codes (PNG + SVG)`
  );
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

generateQRCodes();
