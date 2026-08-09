import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'assets', 'diagnosis', 'male-image-manifest.json');
const maleDir = path.join(root, 'assets', 'diagnosis', 'questions', 'male');

const expectedOutputs = [
  'q01-a.png', 'q01-b.png', 'q01-c-1.png', 'q01-c-2.png', 'q01-d.png',
  'q02-a.png', 'q02-b.png', 'q02-c.png', 'q02-d.png',
  'q03-a.png', 'q03-b.png', 'q03-c.png', 'q03-d.png',
  'q04-a.png', 'q04-b.png', 'q04-c.png', 'q04-d.png',
  'q05-a.png', 'q05-b.png', 'q05-c.png', 'q05-d.png',
  'q06-a.png', 'q06-b.png', 'q06-c-1.png', 'q06-c-2.png', 'q06-d.png',
  'q07-a.png', 'q07-b.png', 'q07-c.png', 'q07-d.png',
  'q08-a.png', 'q08-b.png', 'q08-c.png', 'q08-d.png'
];

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function flattenOutputs(manifest) {
  return manifest.sheets.flatMap(sheet => sheet.outputs);
}

async function normalizedPixels(filePath) {
  const { data } = await sharp(filePath)
    .resize(32, 32, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function meanAbsoluteDifference(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += Math.abs(left[index] - right[index]);
  }
  return total / left.length;
}

test('남성 이미지 매니페스트는 정확한 순서로 34개 출력을 정의한다', () => {
  const manifest = readManifest();
  const outputs = flattenOutputs(manifest);

  assert.deepEqual(outputs, expectedOutputs);
  assert.equal(outputs.length, 34);
  assert.equal(new Set(outputs).size, 34);
  assert.deepEqual(
    manifest.sheets.map(({ input, columns, rows, outputs: sheetOutputs }) => ({
      input,
      columns,
      rows,
      count: sheetOutputs.length
    })),
    [
      { input: 'q01-sheet.png', columns: 3, rows: 2, count: 5 },
      { input: 'q02-sheet.png', columns: 2, rows: 2, count: 4 },
      { input: 'q03-sheet.png', columns: 2, rows: 2, count: 4 },
      { input: 'q04-sheet.png', columns: 2, rows: 2, count: 4 },
      { input: 'q05-sheet.png', columns: 2, rows: 2, count: 4 },
      { input: 'q06-sheet.png', columns: 3, rows: 2, count: 5 },
      { input: 'q07-sheet.png', columns: 2, rows: 2, count: 4 },
      { input: 'q08-sheet.png', columns: 2, rows: 2, count: 4 }
    ]
  );
});

test('남성 이미지 34개는 고유한 PNG이고 800×1000 진단 카드 크기다', async () => {
  const manifest = readManifest();
  const outputs = flattenOutputs(manifest);
  const actualFiles = fs.readdirSync(maleDir).filter(name => name.endsWith('.png')).sort();

  assert.deepEqual(actualFiles, [...expectedOutputs].sort());
  for (const output of outputs) {
    const metadata = await sharp(path.join(maleDir, output)).metadata();
    assert.equal(metadata.format, 'png', output);
    assert.equal(metadata.width, 800, output);
    assert.equal(metadata.height, 1000, output);
  }

  const pixels = await Promise.all(
    outputs.map(output => normalizedPixels(path.join(maleDir, output)))
  );
  for (let left = 0; left < outputs.length; left += 1) {
    for (let right = left + 1; right < outputs.length; right += 1) {
      const difference = meanAbsoluteDifference(pixels[left], pixels[right]);
      assert.ok(
        difference > 1,
        `${outputs[left]}와 ${outputs[right]}가 실질적으로 중복됩니다 (차이 ${difference.toFixed(3)})`
      );
    }
  }
});

test('분할기는 매니페스트 순서대로 패널을 800×1000 PNG로 정규화한다', async () => {
  const { splitSheets } = await import('../scripts/split-male-image-sheets.mjs');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-male-split-'));
  const sourceDir = path.join(tempRoot, 'source');
  const outputDir = path.join(tempRoot, 'output');
  const fixtureManifestPath = path.join(tempRoot, 'manifest.json');
  fs.mkdirSync(sourceDir, { recursive: true });

  const colors = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 }
  ];
  const quadrants = await Promise.all(colors.map(background => (
    sharp({ create: { width: 120, height: 100, channels: 3, background } }).png().toBuffer()
  )));
  await sharp({ create: { width: 240, height: 200, channels: 3, background: '#ffffff' } })
    .composite([
      { input: quadrants[0], left: 0, top: 0 },
      { input: quadrants[1], left: 120, top: 0 },
      { input: quadrants[2], left: 0, top: 100 },
      { input: quadrants[3], left: 120, top: 100 }
    ])
    .png()
    .toFile(path.join(sourceDir, 'fixture.png'));
  fs.writeFileSync(fixtureManifestPath, JSON.stringify({
    sheets: [{
      input: 'fixture.png', columns: 2, rows: 2,
      outputs: ['one.png', 'two.png', 'three.png', 'four.png']
    }]
  }));

  const written = await splitSheets({ sourceDir, outputDir, manifestPath: fixtureManifestPath });
  assert.deepEqual(written.map(filePath => path.basename(filePath)), [
    'one.png', 'two.png', 'three.png', 'four.png'
  ]);
  for (let index = 0; index < written.length; index += 1) {
    const metadata = await sharp(written[index]).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 1000);
    const pixel = await sharp(written[index]).extract({ left: 400, top: 500, width: 1, height: 1 }).raw().toBuffer();
    assert.deepEqual([...pixel.slice(0, 3)], Object.values(colors[index]));
  }
});
