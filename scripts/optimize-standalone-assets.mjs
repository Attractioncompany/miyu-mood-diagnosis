import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const diagnosisCore = require('../src/diagnosis-core.js');


function photoAssetKeys() {
  const questionKeys = diagnosisCore.QUESTIONS.flatMap(question =>
    question.options.flatMap(option => [
      ...option.images.female,
      ...option.images.male
    ])
  );
  const typeKeys = diagnosisCore.TYPES.map(type => type.image);
  const keys = [...questionKeys, ...typeKeys];
  if (keys.length !== 80 || new Set(keys).size !== 80) {
    throw new Error(`Expected 80 unique photo asset keys, found ${new Set(keys).size}`);
  }
  return keys;
}


function optimizedRelativePath(assetKey) {
  return assetKey.replace(/\.png$/i, '.jpg');
}


export async function optimizeStandaloneAssets({ rootDir }) {
  const sourceDir = path.join(rootDir, 'assets', 'diagnosis');
  const standaloneDir = path.join(sourceDir, 'standalone');
  const manifestPath = path.join(standaloneDir, 'manifest.json');
  const assets = {};

  for (const assetKey of photoAssetKeys()) {
    const sourcePath = path.join(sourceDir, assetKey);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`Missing diagnosis source asset: ${assetKey}`);
    }
    const file = optimizedRelativePath(assetKey);
    const outputPath = path.join(standaloneDir, file);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const metadata = await sharp(sourcePath)
      .rotate()
      .jpeg({ quality: 82, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(outputPath);
    assets[assetKey] = {
      file: file.split(path.sep).join('/'),
      mime: 'image/jpeg',
      width: metadata.width,
      height: metadata.height
    };
  }

  fs.mkdirSync(standaloneDir, { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ version: 1, assets }, null, 2)}\n`,
    'utf8'
  );
  return { manifestPath, assetCount: Object.keys(assets).length };
}


const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const rootDir = path.resolve(path.dirname(currentFile), '..');
  const result = await optimizeStandaloneAssets({ rootDir });
  console.log(`${result.assetCount} optimized assets\n${result.manifestPath}`);
}
