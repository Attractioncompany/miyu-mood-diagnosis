import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildV17 } from '../scripts/build-v17.mjs';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'source', '미유_무드분류_12type_v16.html');
const expectedSourceHash = '46f24a73ab0e624e029f1f58fe44f6ec311bfdeba84c7e7833d82c8f0ee2fa81';


function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}


function buildToTemporaryFile() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-'));
  const outputPath = path.join(tempDir, 'v17.html');
  buildV17({ rootDir: root, outputPath });
  return { outputPath, html: fs.readFileSync(outputPath, 'utf8') };
}


function extractCatInfo(html) {
  const match = html.match(/const CAT_INFO = (\{[\s\S]*?\n\});/);
  assert.ok(match, 'generated HTML must contain CAT_INFO');
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${match[1]})`)));
}


function extractDiagnosisAssets(html) {
  const match = html.match(/window\.MIYU_DIAGNOSIS_ASSETS = (\{.*\});\n/);
  assert.ok(match, 'generated HTML must contain embedded diagnosis assets');
  return JSON.parse(match[1]);
}


test('v16은 바꾸지 않고 진단이 포함된 단일 v17을 만든다', () => {
  const before = sha256(sourcePath);
  const { outputPath, html } = buildToTemporaryFile();

  assert.equal(before, sha256(sourcePath));
  assert.equal(before, expectedSourceHash);
  assert.match(html, /id="miyu-diagnosis-app"/);
  assert.match(html, /MIYU MOOD CHECKLIST/);
  assert.ok(fs.statSync(outputPath).size > fs.statSync(sourcePath).size);
});


test('로고와 PDF 이미지 46개를 외부 경로 없이 HTML 안에 포함한다', () => {
  const { html } = buildToTemporaryFile();
  const assets = extractDiagnosisAssets(html);

  assert.equal(Object.keys(assets).length, 47);
  assert.ok(Object.values(assets).every(value => value.startsWith('data:image/png;base64,')));
  assert.doesNotMatch(html, /src="assets\/diagnosis\//);
  assert.doesNotMatch(html, /src="assets\/로고\.png"/);
});


test('D타입 코드·이름·기존 해설 식별자를 PDF 기준으로 연결한다', () => {
  const { html } = buildToTemporaryFile();
  const catInfo = extractCatInfo(html);
  const dTypes = Object.entries(catInfo)
    .filter(([, value]) => value.newCode.startsWith('D-'))
    .sort((left, right) => left[1].newCode.localeCompare(right[1].newCode));

  assert.deepEqual(dTypes, [
    ['13', { newCode: 'D-1', name: '카리스마' }],
    ['08', { newCode: 'D-2', name: '클리어' }],
    ['17', { newCode: 'D-3', name: '샤프' }]
  ]);
});


test('기준 v16이 달라지면 불완전한 v17을 쓰기 전에 중단한다', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-source-'));
  fs.mkdirSync(path.join(tempRoot, 'source'), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, 'source', '미유_무드분류_12type_v16.html'),
    '<html></html>'
  );

  const outputPath = path.join(tempRoot, 'dist', 'v17.html');
  assert.throws(
    () => buildV17({ rootDir: tempRoot, outputPath }),
    /Unexpected v16 source hash/
  );
  assert.equal(fs.existsSync(outputPath), false);
});
