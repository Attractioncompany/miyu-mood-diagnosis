import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '..');

export async function splitSheets({ sourceDir, outputDir, manifestPath }) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.mkdirSync(outputDir, { recursive: true });
  const written = [];

  for (const sheet of manifest.sheets) {
    const inputPath = path.join(sourceDir, sheet.input);
    const metadata = await sharp(inputPath).metadata();
    const panelWidth = Math.floor(metadata.width / sheet.columns);
    const panelHeight = Math.floor(metadata.height / sheet.rows);
    if (sheet.outputs.length > sheet.columns * sheet.rows) {
      throw new Error(`${sheet.input}: outputs exceed panel count`);
    }

    for (let index = 0; index < sheet.outputs.length; index += 1) {
      const column = index % sheet.columns;
      const row = Math.floor(index / sheet.columns);
      const outputPath = path.join(outputDir, sheet.outputs[index]);
      await sharp(inputPath)
        .extract({
          left: column * panelWidth,
          top: row * panelHeight,
          width: panelWidth,
          height: panelHeight
        })
        .resize(800, 1000, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ compressionLevel: 9 })
        .toFile(outputPath);
      written.push(outputPath);
    }
  }

  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const sourceDir = process.argv[2];
  const outputDir = process.argv[3];
  if (!sourceDir || !outputDir) {
    throw new Error('Usage: split-male-image-sheets.mjs <sourceDir> <outputDir>');
  }
  const written = await splitSheets({
    sourceDir: path.resolve(sourceDir),
    outputDir: path.resolve(outputDir),
    manifestPath: path.join(rootDir, 'assets', 'diagnosis', 'male-image-manifest.json')
  });
  console.log(`Wrote ${written.length} male diagnosis images to ${path.resolve(outputDir)}`);
}
