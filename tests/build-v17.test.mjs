import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { MAX_DIST_BYTES, buildV17, stripLegacyReviewNotes } from '../scripts/build-v17.mjs';


const require = createRequire(import.meta.url);
const celebrityNames = require('../src/celebrity-names.js');
const diagnosisCore = require('../src/diagnosis-core.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'source', '미유_무드분류_12type_v16.html');
const distPath = path.join(root, 'dist', '미유_무드진단_12type_v17.html');
const standaloneManifestPath = path.join(root, 'assets', 'diagnosis', 'standalone', 'manifest.json');
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


function expectedDiagnosisAssetKeys() {
  const questionPaths = diagnosisCore.QUESTIONS.flatMap(question =>
    question.options.flatMap(option => [
      ...option.images.female,
      ...option.images.male
    ])
  );
  const typePaths = diagnosisCore.TYPES.map(type => type.image);
  return ['logo', ...questionPaths, ...typePaths].sort();
}


function expectedReferenceAssetKeys() {
  const groups = ['a', 'b', 'c', 'd'];
  const types = ['a-1', 'a-2', 'a-3', 'b-1', 'b-2', 'b-3', 'c-1', 'c-2', 'c-3', 'd-1', 'd-2', 'd-3'];
  return [
    ...groups.map(group => `reference/intro/${group}.jpg`),
    ...types.map(type => `reference/average/female/${type}.jpg`),
    ...types.map(type => `reference/female/makeup/${type}.jpg`),
    ...groups.map(group => `reference/female/hair/${group}.jpg`),
    ...types.map(type => `reference/average/male/${type}.jpg`),
    ...groups.map(group => `reference/male/hair/${group}.jpg`)
  ].sort();
}


function extractLegacyCelebrityLabels(html) {
  const personNames = Array.from(
    html.matchAll(/<div class="person-name">([^<]+)<\/div>/g),
    match => match[1].trim()
  );
  const representatives = Array.from(
    html.matchAll(/<div class="cat-representative">대표 인물\s*·\s*([^<]+)<\/div>/g),
    match => match[1].trim()
  );
  return [...personNames, ...representatives];
}


test('모든 고객 노출 예시 연예인 이름은 공식 영문 매핑이 있다', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const labels = extractLegacyCelebrityLabels(source);

  assert.ok(labels.length > 0);
  for (const label of new Set(labels)) {
    const english = celebrityNames.getEnglishLabel(label);
    assert.ok(english, `missing celebrity mapping: ${label}`);
    assert.doesNotMatch(english, /[가-힣]/);
  }
});


test('연예인 이름 치환기는 공개 인터페이스를 제공하고 누락된 이름에서 중단한다', () => {
  assert.equal(celebrityNames.CELEBRITY_NAMES['블랙핑크 지수'], 'BLACKPINK · Jisoo');
  assert.equal(celebrityNames.getEnglishLabel('에스파 윈터'), 'Winter (aespa)');
  assert.equal(celebrityNames.getEnglishLabel('배우 김태리'), 'Kim Tae-ri (Actor)');
  assert.equal(celebrityNames.getEnglishLabel('가수 아이유'), 'IU (Solo Artist)');
  assert.throws(
    () => celebrityNames.replaceCelebrityNames('<div class="person-name">매핑 없는 이름</div>'),
    /Missing celebrity English label: 매핑 없는 이름/
  );
});

test('동적 CAT_PERSONS 이름도 공식 영문으로 바꾸고 누락된 매핑에서 중단한다', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transformed = celebrityNames.replaceDynamicCelebrityNames(source);
  const match = transformed.match(/const CAT_PERSONS = (\{[\s\S]*?\});/);

  assert.ok(match);
  const people = JSON.parse(match[1]);
  const labels = Object.values(people).flat().map(person => person.name);
  assert.equal(labels.length, 97);
  assert.match(labels.join('\n'), /Momo \(TWICE\)/);
  assert.doesNotMatch(labels.join('\n'), /[가-힣]/);
  assert.throws(
    () => celebrityNames.replaceDynamicCelebrityNames('const CAT_PERSONS = {"01":[{"name":"없는 인물"}]};'),
    /Missing celebrity English label: 없는 인물/
  );
});


test('생성 HTML의 카드와 대표 인물 표시 이름에는 한글이 남지 않는다', () => {
  const { html } = buildToTemporaryFile();
  const labels = extractLegacyCelebrityLabels(html);

  assert.ok(labels.length > 0);
  for (const label of labels) assert.doesNotMatch(label, /[가-힣]/, label);
});


test('v16은 바꾸지 않고 진단이 포함된 단일 v17을 만든다', () => {
  const before = sha256(sourcePath);
  const { outputPath, html } = buildToTemporaryFile();

  assert.equal(before, sha256(sourcePath));
  assert.equal(before, expectedSourceHash);
  assert.match(html, /id="miyu-diagnosis-app"/);
  assert.match(html, /MIYU MOOD CHECKLIST/);
  assert.ok(fs.statSync(outputPath).size > fs.statSync(sourcePath).size);
});


test('저장된 v17은 현재 소스의 두 번의 재생성 결과와 정확히 일치한다', () => {
  assert.ok(fs.existsSync(distPath), 'checked-in v17 dist must exist');

  const first = buildToTemporaryFile().outputPath;
  const second = buildToTemporaryFile().outputPath;
  const firstHash = sha256(first);
  const secondHash = sha256(second);

  assert.equal(firstHash, secondHash, 'the same sources must build deterministically');
  assert.equal(
    sha256(distPath),
    firstHash,
    'checked-in v17 is stale; run scripts/build-v17.mjs before committing'
  );
});

test('다국어 해설 데이터와 기존 카테고리 연결을 단일 HTML에 포함한다', () => {
  const { html } = buildToTemporaryFile();

  assert.match(html, /MiyuExplanationContent/);
  assert.match(html, /MiyuDiagnosisUI\.decorateExplanation\(catId\);/);
  assert.match(html, /miyu-explanation-panel/);
});


test('생성 HTML에는 원본 11개의 검토 메모가 하나도 남지 않는다', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const { html } = buildToTemporaryFile();

  assert.equal((source.match(/검토 메모/g) || []).length, 11);
  assert.equal((source.match(/class="match-note"/g) || []).length, 11);
  assert.doesNotMatch(html, /검토 메모/);
  assert.doesNotMatch(html, /class="match-note"/);
});


test('검토 메모 제거는 11개가 아니면 빌드를 중단한다', () => {
  const note = '<div class="meta-mini"><div class="meta-label">검토 메모</div><div class="match-note">확인</div></div>';

  assert.equal((stripLegacyReviewNotes(note.repeat(11)).match(/검토 메모/g) || []).length, 0);
  assert.throws(() => stripLegacyReviewNotes(note.repeat(10)), /expected 11, found 10/);
});


test('로고·진단·시각 해설 이미지를 외부 경로 없이 HTML 안에 포함한다', () => {
  const { html } = buildToTemporaryFile();
  const assets = extractDiagnosisAssets(html);
  const keys = Object.keys(assets).sort();
  const expectedKeys = [...expectedDiagnosisAssetKeys(), ...expectedReferenceAssetKeys()].sort();

  assert.equal(new Set(expectedKeys).size, 129);
  assert.equal(expectedKeys.filter(key => /^questions\/q\d/.test(key)).length, 34);
  assert.equal(expectedKeys.filter(key => key.startsWith('questions/male/')).length, 34);
  assert.equal(expectedKeys.filter(key => key.startsWith('types/')).length, 12);
  assert.deepEqual(keys, expectedKeys);
  assert.match(assets.logo, /^data:image\/png;base64,/);
  for (const [key, value] of Object.entries(assets)) {
    if (key !== 'logo') assert.match(value, /^data:image\/jpeg;base64/, key);
  }
  assert.equal(MAX_DIST_BYTES, 95 * 1024 * 1024);
  assert.ok(Buffer.byteLength(html, 'utf8') <= MAX_DIST_BYTES);
  assert.doesNotMatch(html, /src="assets\/diagnosis\//);
  assert.doesNotMatch(html, /src="assets\/로고\.png"/);
});


test('최적화 매니페스트는 80개 JPEG와 실제 크기를 고정한다', () => {
  assert.ok(fs.existsSync(standaloneManifestPath), 'optimized standalone manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(standaloneManifestPath, 'utf8'));
  const assets = Object.values(manifest.assets);

  assert.equal(manifest.version, 1);
  assert.equal(assets.length, 80);
  assert.ok(assets.every(asset => asset.mime === 'image/jpeg'));
  assert.ok(assets.every(asset => Number.isInteger(asset.width) && asset.width > 0));
  assert.ok(assets.every(asset => Number.isInteger(asset.height) && asset.height > 0));
  for (const asset of assets) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'diagnosis', 'standalone', asset.file)));
  }
});


test('최적화된 남성 진단 이미지가 하나라도 없으면 출력 폴더와 파일을 만들지 않는다', () => {
  const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-missing-'));
  const tempRoot = path.join(tempWorkspace, 'root');
  fs.cpSync(root, tempRoot, { recursive: true });
  fs.rmSync(
    path.join(tempRoot, 'assets', 'diagnosis', 'standalone', 'questions', 'male', 'q08-d.jpg')
  );
  fs.rmSync(path.join(tempRoot, 'dist'), { recursive: true });
  const outputPath = path.join(tempRoot, 'dist', 'v17.html');

  assert.throws(
    () => buildV17({ rootDir: tempRoot, outputPath }),
    /Missing diagnosis asset/
  );
  assert.equal(fs.existsSync(path.dirname(outputPath)), false);
  assert.equal(fs.existsSync(outputPath), false);
});


test('단일 파일이 배포 크기 제한을 넘으면 결과 파일을 쓰기 전에 빌드를 중단한다', () => {
  const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-too-large-'));
  const tempRoot = path.join(tempWorkspace, 'root');
  fs.cpSync(root, tempRoot, { recursive: true });
  fs.rmSync(path.join(tempRoot, 'dist'), { recursive: true });
  const uiPath = path.join(tempRoot, 'src', 'diagnosis-ui.js');
  fs.appendFileSync(uiPath, `\n/* ${'x'.repeat(MAX_DIST_BYTES)} */\n`, 'utf8');
  const outputPath = path.join(tempRoot, 'dist', 'v17.html');

  assert.throws(
    () => buildV17({ rootDir: tempRoot, outputPath }),
    /Generated standalone exceeds 95 MiB limit/
  );
  assert.equal(fs.existsSync(path.dirname(outputPath)), false);
  assert.equal(fs.existsSync(outputPath), false);
});


test('생성 HTML에는 진단 이미지 확대 기능이 없다', () => {
  const { html } = buildToTemporaryFile();

  assert.doesNotMatch(html, /검토 메모/);
  assert.doesNotMatch(html, /class="match-note"/);
  assert.doesNotMatch(html, /class="miyu-image-modal"/);
  assert.doesNotMatch(html, /data-action="open-image"/);
  assert.doesNotMatch(html, /data-action="close-image"/);
});


test('금지 문자열이 생성 내용에 들어오면 출력 폴더와 파일을 만들지 않는다', () => {
  const forbiddenValues = [
    '검토 메모',
    'class="match-note"',
    'data-action="open-image"',
    'miyu-image-modal'
  ];
  const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-forbidden-'));
  const tempRoot = path.join(tempWorkspace, 'root');
  fs.cpSync(root, tempRoot, { recursive: true });
  fs.rmSync(path.join(tempRoot, 'dist'), { recursive: true });
  const uiPath = path.join(tempRoot, 'src', 'diagnosis-ui.js');
  const cleanUi = fs.readFileSync(uiPath, 'utf8');

  for (const [index, forbidden] of forbiddenValues.entries()) {
    fs.writeFileSync(uiPath, `${cleanUi}\n/* ${forbidden} */\n`, 'utf8');
    const outputPath = path.join(tempRoot, 'dist', `forbidden-${index}.html`);
    assert.throws(
      () => buildV17({ rootDir: tempRoot, outputPath }),
      error => error.message === `Forbidden generated content: ${forbidden}`
    );
    assert.equal(fs.existsSync(path.dirname(outputPath)), false);
    assert.equal(fs.existsSync(outputPath), false);
  }
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

test('번역이 하나라도 비면 결과 파일을 쓰기 전에 빌드를 중단한다', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-content-'));
  fs.mkdirSync(path.join(tempRoot, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'src'), { recursive: true });
  fs.copyFileSync(
    path.join(root, 'scripts', 'build-v17.mjs'),
    path.join(tempRoot, 'scripts', 'build-v17.mjs')
  );
  fs.copyFileSync(
    path.join(root, 'src', 'explanation-content.js'),
    path.join(tempRoot, 'src', 'explanation-content.js')
  );
  fs.copyFileSync(
    path.join(root, 'src', 'celebrity-names.js'),
    path.join(tempRoot, 'src', 'celebrity-names.js')
  );
  fs.copyFileSync(
    path.join(root, 'src', 'diagnosis-core.js'),
    path.join(tempRoot, 'src', 'diagnosis-core.js')
  );
  const completeData = fs.readFileSync(
    path.join(root, 'src', 'explanation-data.js'),
    'utf8'
  );
  const incompleteData = `${completeData}
delete module.exports.SECTION_LABELS.details['zh-TW'];`;
  fs.writeFileSync(
    path.join(tempRoot, 'src', 'explanation-data.js'),
    incompleteData,
    'utf8'
  );

  const copiedBuildScript = path.join(tempRoot, 'scripts', 'build-v17.mjs');
  const outputPath = path.join(tempRoot, 'dist', '미유_무드진단_12type_v17.html');
  const runner = `import { buildV17 } from ${JSON.stringify(`file://${copiedBuildScript}`)};
    buildV17(${JSON.stringify({ rootDir: tempRoot, outputPath })});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', runner], {
    cwd: tempRoot,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing zh-TW/);
  assert.equal(fs.existsSync(outputPath), false);
});
