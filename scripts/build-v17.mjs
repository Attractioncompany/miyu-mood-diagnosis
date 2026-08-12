import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const celebrityNamesApi = require('../src/celebrity-names.js');
const diagnosisCoreApi = require('../src/diagnosis-core.js');
const explanationApi = require('../src/explanation-content.js');

const EXPECTED_SOURCE_HASH = '46f24a73ab0e624e029f1f58fe44f6ec311bfdeba84c7e7833d82c8f0ee2fa81';
export const MAX_DIST_BYTES = 95 * 1024 * 1024;
export const FULL_V1_FILENAME = '미유_무드진단_Full_V1.html';
export const LEGACY_V17_FILENAME = '미유_무드진단_12type_v17.html';


function redirectPageHtml(targetFilename) {
  const targetPath = `./${targetFilename}`;
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MIYU 무드 진단</title>
  <script>
    const target = new URL('${targetPath}', window.location.href);
    target.hash = window.location.hash;
    window.location.replace(target.href);
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${targetPath}">
  </noscript>
</head>
<body>
  <p><a href="${targetPath}">MIYU 무드 진단 열기</a></p>
</body>
</html>
`;
}


export function writeEntryRedirects({ rootDir }) {
  const distDir = path.join(rootDir, 'dist');
  const html = redirectPageHtml(FULL_V1_FILENAME);
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(distDir, LEGACY_V17_FILENAME), html, 'utf8');
}


function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}


export function dataUri(filePath, mime) {
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}


function collectReferenceAssets(rootDir) {
  const referenceDir = path.join(rootDir, 'assets', 'diagnosis', 'reference');
  const manifestPath = path.join(referenceDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing MIYU reference manifest');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !manifest.assets || typeof manifest.assets !== 'object') {
    throw new Error('Invalid MIYU reference manifest');
  }
  const groups = ['a', 'b', 'c', 'd'];
  const types = ['a-1', 'a-2', 'a-3', 'b-1', 'b-2', 'b-3', 'c-1', 'c-2', 'c-3', 'd-1', 'd-2', 'd-3'];
  const expectedKeys = [
    ...groups.map(group => `reference/intro/${group}.jpg`),
    ...types.map(type => `reference/average/female/${type}.jpg`),
    ...types.map(type => `reference/female/makeup/${type}.jpg`),
    ...groups.map(group => `reference/female/hair/${group}.jpg`),
    ...types.map(type => `reference/average/male/${type}.jpg`),
    ...groups.map(group => `reference/male/hair/${group}.jpg`),
    ...groups.map(group => `reference/male/grooming/recommended/${group}.jpg`),
    ...groups.map(group => `reference/male/grooming/avoid/${group}.jpg`),
    ...groups.map(group => `reference/male/hair/recommended/${group}.jpg`),
    ...groups.map(group => `reference/male/hair/avoid/${group}.jpg`)
  ].sort();
  const manifestKeys = Object.keys(manifest.assets).sort();
  if (JSON.stringify(manifestKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`Expected ${expectedKeys.length} MIYU reference assets`);
  }
  return Object.fromEntries(expectedKeys.map(key => {
    const item = manifest.assets[key];
    if (!item || item.mime !== 'image/jpeg' || !item.file
      || !Number.isInteger(item.width) || !Number.isInteger(item.height)) {
      throw new Error(`Invalid MIYU reference asset: ${key}`);
    }
    const filePath = path.resolve(rootDir, 'assets', item.file);
    if (!filePath.startsWith(`${referenceDir}${path.sep}`)
      || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Missing MIYU reference asset: ${key}`);
    }
    return [key, dataUri(filePath, item.mime)];
  }));
}

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  const last = source.lastIndexOf(needle);
  if (first === -1 || first !== last) {
    throw new Error(`${label}: expected exactly one source marker`);
  }
  return source.replace(needle, replacement);
}


function replaceExpectedCount(source, needle, replacement, expectedCount, label) {
  const count = source.split(needle).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} source markers, found ${count}`);
  }
  return source.replaceAll(needle, replacement);
}


function collectAssets(rootDir) {
  const questionPaths = diagnosisCoreApi.QUESTIONS.flatMap(question =>
    question.options.flatMap(option => ({
      female: option.images.female,
      male: option.images.male
    }))
  );
  const femalePaths = questionPaths.flatMap(paths => paths.female);
  const malePaths = questionPaths.flatMap(paths => paths.male);
  const typePaths = diagnosisCoreApi.TYPES.map(type => type.image);

  if (femalePaths.length !== 34 || new Set(femalePaths).size !== 34) {
    throw new Error(`Expected 34 unique female diagnosis assets, found ${new Set(femalePaths).size}`);
  }
  if (malePaths.length !== 34 || new Set(malePaths).size !== 34) {
    throw new Error(`Expected 34 unique male diagnosis assets, found ${new Set(malePaths).size}`);
  }
  if (typePaths.length !== 12 || new Set(typePaths).size !== 12) {
    throw new Error(`Expected 12 unique type diagnosis assets, found ${new Set(typePaths).size}`);
  }

  const photoPaths = [...femalePaths, ...malePaths, ...typePaths];
  const expectedAssets = [
    ['logo', path.join(rootDir, 'assets', '로고.png'), 'image/png'],
    ...photoPaths.map(relativePath => [relativePath])
  ];
  if (new Set(expectedAssets.map(([key]) => key)).size !== 81) {
    throw new Error('Expected exactly 81 unique diagnosis asset keys');
  }

  const standaloneDir = path.join(rootDir, 'assets', 'diagnosis', 'standalone');
  const manifestPath = path.join(standaloneDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing optimized diagnosis manifest');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !manifest.assets || typeof manifest.assets !== 'object') {
    throw new Error('Invalid optimized diagnosis manifest');
  }
  const manifestKeys = Object.keys(manifest.assets).sort();
  if (JSON.stringify(manifestKeys) !== JSON.stringify([...photoPaths].sort())) {
    throw new Error('Optimized diagnosis manifest asset keys do not match diagnosis assets');
  }
  const assets = {
    logo: dataUri(expectedAssets[0][1], expectedAssets[0][2])
  };
  for (const key of photoPaths) {
    const item = manifest.assets[key];
    if (!item || item.mime !== 'image/jpeg' || !item.file || !Number.isInteger(item.width) || !Number.isInteger(item.height)) {
      throw new Error(`Invalid optimized diagnosis asset: ${key}`);
    }
    const filePath = path.resolve(standaloneDir, item.file);
    if (!filePath.startsWith(`${standaloneDir}${path.sep}`)
      || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Missing diagnosis asset: ${key}`);
    }
    assets[key] = dataUri(filePath, item.mime);
  }
  return assets;
}


export function stripLegacyReviewNotes(html) {
  const pattern = /<div class="meta-mini">\s*<div class="meta-label">검토 메모<\/div>\s*<div class="match-note">[\s\S]*?<\/div>\s*<\/div>/g;
  const matches = html.match(pattern) || [];
  if (matches.length !== 11) {
    throw new Error(`review notes: expected 11, found ${matches.length}`);
  }
  return html.replace(pattern, '');
}


export function replaceCelebrityNames(html) {
  return celebrityNamesApi.replaceCelebrityNames(html);
}


export function buildV17({ rootDir, outputPath }) {
  explanationApi.assertCompleteContent();
  const sourcePath = path.join(rootDir, 'source', '미유_무드분류_12type_v16.html');
  const sourceBuffer = fs.readFileSync(sourcePath);
  const sourceHash = sha256Buffer(sourceBuffer);
  if (sourceHash !== EXPECTED_SOURCE_HASH) {
    throw new Error(`Unexpected v16 source hash: ${sourceHash}`);
  }

  const css = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis.css'), 'utf8');
  const explanationData = fs.readFileSync(
    path.join(rootDir, 'src', 'explanation-data.js'),
    'utf8'
  );
  const explanationContent = fs.readFileSync(
    path.join(rootDir, 'src', 'explanation-content.js'),
    'utf8'
  );
  const core = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis-core.js'), 'utf8');
  const ui = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis-ui.js'), 'utf8');
  const assets = Object.assign(collectAssets(rootDir), collectReferenceAssets(rootDir));
  let html = stripLegacyReviewNotes(sourceBuffer.toString('utf8'));
  html = replaceCelebrityNames(html);

  html = replaceOnce(
    html,
    `  '08': { newCode: 'D-1', name: '클리어' },
  '17': { newCode: 'D-2', name: '샤프' },
  '13': { newCode: 'D-3', name: '카리스마' }`,
    `  '13': { newCode: 'D-1', name: '카리스마' },
  '08': { newCode: 'D-2', name: '클리어' },
  '17': { newCode: 'D-3', name: '샤프' }`,
    'CAT_INFO D mapping'
  );

  html = replaceExpectedCount(html, 'href="#/"', 'href="#/index"', 5, 'legacy index links');
  html = replaceOnce(
    html,
    `window.location.hash = '#/';`,
    `window.location.hash = '#/index';`,
    'unknown route fallback'
  );
  html = replaceOnce(
    html,
    `  const catsInMacro = Object.entries(CAT_INFO).filter(([oid, ci]) => ci.newCode.charAt(0) === macroCode);`,
    `  const catsInMacro = Object.entries(CAT_INFO)
    .filter(([oid, ci]) => ci.newCode.charAt(0) === macroCode)
    .sort((left, right) => left[1].newCode.localeCompare(right[1].newCode, 'en', { numeric: true }));`,
    'macro category order'
  );
  html = replaceOnce(
    html,
    `      const sid = s.getAttribute('data-cat-id');
      if (sid === catId) s.classList.remove('lv3-hidden');
    });`,
    `      const sid = s.getAttribute('data-cat-id');
      if (sid === catId) s.classList.remove('lv3-hidden');
    });
    MiyuDiagnosisUI.decorateExplanation(catId);`,
    'category explanation decorator'
  );
  html = replaceOnce(
    html,
    `  const breadcrumb = document.getElementById('navBreadcrumb');
  
  if (parts[0] === '' || hash === '#/') {
    // Lv1 인덱스`,
    `  const breadcrumb = document.getElementById('navBreadcrumb');
  const topNav = document.getElementById('topNav');
  if (MiyuDiagnosisUI.redirectMaleLegacyRoute(hash, MiyuDiagnosisUI.getMountedProfile(), window.location)) {
    return;
  }
  if (topNav) topNav.style.display = 'block';
  
  if (parts[0] === '' || hash === '#/' || parts[0] === 'diagnosis') {
    MiyuDiagnosisUI.renderRoute(hash);
    return;
  } else if (parts[0] === 'index') {
    // Lv1 인덱스`,
    'router diagnosis branch'
  );

  html = replaceOnce(
    html,
    '</style>',
    `${css}\n</style>`,
    'style end'
  );
  html = replaceOnce(
    html,
    '<body>',
    `<body>
  <section id="miyu-diagnosis-app" class="page" aria-live="polite">
    <div class="miyu-diagnosis-view"></div>
  </section>`,
    'body start'
  );

  const diagnosisScript = [
    `window.MIYU_DIAGNOSIS_ASSETS = ${JSON.stringify(assets)};`,
    explanationData,
    explanationContent,
    core,
    ui
  ].join('\n');
  html = replaceOnce(
    html,
    '// 뒤로가기 버튼',
    `${diagnosisScript}\n// 뒤로가기 버튼`,
    'diagnosis script marker'
  );
  html = html.replace(/[ \t]+(?=\r?\n)/g, '');

  for (const forbidden of [
    '검토 메모',
    'class="match-note"',
    'data-action="open-image"',
    'miyu-image-modal'
  ]) {
    if (html.includes(forbidden)) {
      throw new Error(`Forbidden generated content: ${forbidden}`);
    }
  }

  const outputBytes = Buffer.byteLength(html, 'utf8');
  if (outputBytes > MAX_DIST_BYTES) {
    throw new Error(`Generated standalone exceeds 95 MiB limit: ${outputBytes}`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  const outputHash = sha256Buffer(fs.readFileSync(outputPath));
  return {
    outputPath,
    sourceHash,
    outputHash,
    outputBytes: fs.statSync(outputPath).size
  };
}


const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const rootDir = path.resolve(path.dirname(currentFile), '..');
  const result = buildV17({
    rootDir,
    outputPath: path.join(rootDir, 'dist', FULL_V1_FILENAME)
  });
  writeEntryRedirects({ rootDir });
  console.log(`${result.outputPath}\n${result.outputBytes} bytes\nsha256 ${result.outputHash}`);
}
