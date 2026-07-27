import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const EXPECTED_SOURCE_HASH = '46f24a73ab0e624e029f1f58fe44f6ec311bfdeba84c7e7833d82c8f0ee2fa81';


function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}


function dataUri(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
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
  const assets = {
    logo: dataUri(path.join(rootDir, 'assets', '로고.png'))
  };
  for (const folder of ['questions', 'types']) {
    const folderPath = path.join(rootDir, 'assets', 'diagnosis', folder);
    const filenames = fs.readdirSync(folderPath)
      .filter(name => name.endsWith('.png'))
      .sort();
    for (const filename of filenames) {
      assets[`${folder}/${filename}`] = dataUri(path.join(folderPath, filename));
    }
  }
  if (Object.keys(assets).length !== 47) {
    throw new Error(`Expected logo + 46 diagnosis images, found ${Object.keys(assets).length}`);
  }
  return assets;
}


export function buildV17({ rootDir, outputPath }) {
  const sourcePath = path.join(rootDir, 'source', '미유_무드분류_12type_v16.html');
  const sourceBuffer = fs.readFileSync(sourcePath);
  const sourceHash = sha256Buffer(sourceBuffer);
  if (sourceHash !== EXPECTED_SOURCE_HASH) {
    throw new Error(`Unexpected v16 source hash: ${sourceHash}`);
  }

  const css = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis.css'), 'utf8');
  const core = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis-core.js'), 'utf8');
  const ui = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis-ui.js'), 'utf8');
  const assets = collectAssets(rootDir);
  let html = sourceBuffer.toString('utf8');

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
    `  const breadcrumb = document.getElementById('navBreadcrumb');
  
  if (parts[0] === '' || hash === '#/') {
    // Lv1 인덱스`,
    `  const breadcrumb = document.getElementById('navBreadcrumb');
  const topNav = document.getElementById('topNav');
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
    <div class="miyu-image-modal" role="dialog" aria-modal="true" aria-label="이미지 크게 보기">
      <button type="button" data-action="close-image" aria-label="이미지 닫기">×</button>
      <img alt="">
    </div>
  </section>`,
    'body start'
  );

  const diagnosisScript = [
    `window.MIYU_DIAGNOSIS_ASSETS = ${JSON.stringify(assets)};`,
    core,
    ui
  ].join('\n');
  html = replaceOnce(
    html,
    '// 뒤로가기 버튼',
    `${diagnosisScript}\n// 뒤로가기 버튼`,
    'diagnosis script marker'
  );

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
    outputPath: path.join(rootDir, 'dist', '미유_무드진단_12type_v17.html')
  });
  console.log(`${result.outputPath}\n${result.outputBytes} bytes\nsha256 ${result.outputHash}`);
}
