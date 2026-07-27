# 미유 무드 진단 v17 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 종이 체크, ABCD 수기 합산, 12타입 해설 검색을 하나의 태블릿용 진단 흐름으로 연결한 단일 HTML `dist/미유_무드진단_12type_v17.html`을 만든다.

**Architecture:** 기존 v16은 읽기 전용 기준 파일로 유지한다. 진단 데이터와 계산 로직, 화면 렌더러, 스타일, PDF 자산 추출기, v17 조립기를 작은 개발 파일로 분리해 테스트한 뒤 조립기가 모두 단일 HTML 안에 포함한다. 기존 해설 라우터에는 진단 주소와 기존 인덱스 주소만 최소 추가하고, 기존 12타입 해설·검색·무드북·출력 기능은 그대로 보존한다.

**Tech Stack:** HTML5, CSS, 브라우저 JavaScript, Node.js 내장 `node:test`, Python 3 + `pypdf` + Pillow, 브라우저 `sessionStorage`, 기존 해시 주소 라우터

## Global Constraints

- 기준 설계: `docs/superpowers/specs/2026-07-27-miyu-diagnosis-flow-design.md`
- 기존 원본: `source/미유_무드분류_12type_v16.html`은 수정하지 않는다.
- 최종 산출물: `dist/미유_무드진단_12type_v17.html` 단일 파일이며 외부 서버·외부 라이브러리에 의존하지 않는다.
- 진단은 PDF 순서의 10문항이며 문항별 최소 1개, 최대 2개를 선택한다.
- 선택한 A/B/C/D 항목마다 각각 1점을 더하고 각 그룹 점수 범위는 0~10점이다.
- 서로 다른 점수값을 기준으로 공동 1위·공동 2위를 계산한다.
- 12타입은 PDF 순서로 모두 표시하고 점수와 무관하게 하나를 최종 선택할 수 있다.
- D타입은 D-1 카리스마, D-2 클리어, D-3 샤프 순서로 고친다.
- 1순위 화면은 10~13인치 세로 태블릿이며 가로 태블릿도 정상 지원한다.
- 주요 터치 영역은 최소 44×44 CSS 픽셀이다.
- PDF에서 추출한 이미지는 비율 전체를 `contain` 방식으로 표시하고 강제로 자르지 않는다.
- 입력·답변·현재 문항·점수·최종 선택은 현재 탭의 `sessionStorage`에만 보관한다.
- 이름은 필수, 진단일은 오늘 날짜 기본값, 퍼스널컬러는 선택 입력이다.
- 모든 커밋 메시지는 `[code]`로 시작한다.
- 최종 완료 전 원본 v16의 SHA-256이 `46f24a73ab0e624e029f1f58fe44f6ec311bfdeba84c7e7833d82c8f0ee2fa81`인지 재확인한다.

## File Map

| 파일 | 책임 |
|---|---|
| `reference/무드 체크 리스트. ver2.pdf` | 문항 문구·이미지·12타입 순서의 기준 |
| `assets/로고.png` | 시작·문항·결과·진행표에 사용하는 브랜드 로고 |
| `scripts/extract-pdf-assets.py` | PDF의 34개 문항 이미지와 12개 타입 얼굴 이미지를 PNG로 추출 |
| `assets/diagnosis/questions/*.png` | 1~8번 답변 카드에 쓰는 PDF 원본 이미지 |
| `assets/diagnosis/types/*.png` | 결과 카드에 쓰는 PDF 표의 얼굴 이미지 |
| `src/diagnosis-core.js` | 문항·타입 데이터, 선택 제한, 점수·순위, 상태 복구, 주소 매핑 |
| `src/diagnosis-ui.js` | 시작·문항·진행표·결과 HTML 생성과 브라우저 상호작용 |
| `src/diagnosis.css` | 태블릿 세로 우선 화면, 가로 대응, 순위·선택·이미지 모달 스타일 |
| `scripts/build-v17.mjs` | v16과 진단 코드·이미지를 합치고 기존 D타입 연결을 수정해 v17 생성 |
| `tests/test_pdf_assets.py` | PDF 이미지 추출 수량·크기·파일명 검증 |
| `tests/diagnosis-core.test.js` | 선택, 점수, 공동순위, 상태 복구, 타입 주소 검증 |
| `tests/diagnosis-ui.test.js` | 화면 문자열, 접근성 속성, 진행표·결과·이미지 렌더링 검증 |
| `tests/build-v17.test.mjs` | 단일 HTML 조립, D타입 연결, 오프라인 자산, 원본 보존 검증 |
| `dist/미유_무드진단_12type_v17.html` | 컨설턴트가 실제 사용하는 최종 단일 파일 |

---

### Task 1: PDF 진단 이미지의 재현 가능한 추출

**Files:**
- Create: `tests/test_pdf_assets.py`
- Create: `scripts/extract-pdf-assets.py`
- Create: `assets/diagnosis/questions/*.png`
- Create: `assets/diagnosis/types/*.png`

**Interfaces:**
- Consumes: `reference/무드 체크 리스트. ver2.pdf`
- Produces: `extract_assets(pdf_path: Path, output_dir: Path) -> list[Path]`
- Produces: 문항 이미지 경로 `questions/qNN-x[-N].png`
- Produces: 타입 이미지 경로 `types/a-1.png`부터 `types/d-3.png`

- [ ] **Step 1: 추출 결과를 정의하는 실패 테스트 작성**

`tests/test_pdf_assets.py`에 임시 폴더로 추출한 뒤 다음 계약을 검증한다.

```python
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "extract-pdf-assets.py"
PDF = ROOT / "reference" / "무드 체크 리스트. ver2.pdf"


def load_extractor():
    spec = importlib.util.spec_from_file_location("extract_pdf_assets", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PdfAssetExtractionTest(unittest.TestCase):
    def test_extracts_34_question_images_and_12_type_faces(self):
        module = load_extractor()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            created = module.extract_assets(PDF, output)
            question_files = sorted((output / "questions").glob("*.png"))
            type_files = sorted((output / "types").glob("*.png"))
            self.assertEqual(46, len(created))
            self.assertEqual(34, len(question_files))
            self.assertEqual(12, len(type_files))

    def test_type_face_crops_exclude_table_lines_and_keep_expected_sizes(self):
        module = load_extractor()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            module.extract_assets(PDF, output)
            from PIL import Image
            self.assertEqual((72, 91), Image.open(output / "types" / "a-1.png").size)
            self.assertEqual((78, 93), Image.open(output / "types" / "d-3.png").size)

    def test_multi_image_answers_are_preserved(self):
        module = load_extractor()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            module.extract_assets(PDF, output)
            self.assertTrue((output / "questions" / "q01-c-1.png").is_file())
            self.assertTrue((output / "questions" / "q01-c-2.png").is_file())
            self.assertTrue((output / "questions" / "q06-c-1.png").is_file())
            self.assertTrue((output / "questions" / "q06-c-2.png").is_file())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 테스트가 추출기 부재로 실패하는지 확인**

Run:

```bash
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests/test_pdf_assets.py -v
```

Expected: `FileNotFoundError` 또는 `ModuleNotFoundError`로 FAIL하며, 실패 원인이 `scripts/extract-pdf-assets.py`가 아직 없기 때문이어야 한다.

- [ ] **Step 3: PDF 이미지 이름과 출력 경로를 고정한 최소 추출기 작성**

`scripts/extract-pdf-assets.py`에 다음 매핑과 크롭 좌표를 그대로 사용한다.

```python
from pathlib import Path
from pypdf import PdfReader

QUESTION_IMAGES = {
    "q01-a.png": "Im12.jp2",
    "q01-b.png": "Im29.jp2",
    "q01-c-1.png": "Im10.jp2",
    "q01-c-2.png": "Im13.jp2",
    "q01-d.png": "Im11.jp2",
    "q02-a.png": "Im14.jp2",
    "q02-b.png": "Im15.jp2",
    "q02-c.png": "Im34.jp2",
    "q02-d.png": "Im16.jp2",
    "q03-a.png": "Im17.jp2",
    "q03-b.png": "Im19.jp2",
    "q03-c.png": "Im20.jp2",
    "q03-d.png": "Im18.jp2",
    "q04-a.png": "Im26.jp2",
    "q04-b.png": "Im27.jp2",
    "q04-c.png": "Im25.jp2",
    "q04-d.png": "Im28.jp2",
    "q05-a.png": "Im6.jp2",
    "q05-b.png": "Im7.jp2",
    "q05-c.png": "Im8.jp2",
    "q05-d.png": "Im9.jp2",
    "q06-a.png": "Im21.jp2",
    "q06-b.png": "Im22.jp2",
    "q06-c-1.png": "Im23.jp2",
    "q06-c-2.png": "Im30.jp2",
    "q06-d.png": "Im24.jp2",
    "q07-a.png": "Im5.jp2",
    "q07-b.png": "Im32.jp2",
    "q07-c.png": "Im31.jp2",
    "q07-d.png": "Im33.jp2",
    "q08-a.png": "Im4.jp2",
    "q08-b.png": "Im2.jp2",
    "q08-c.png": "Im3.jp2",
    "q08-d.png": "Im1.jp2",
}

TYPE_CROPS = {
    "a-1.png": (27, 139, 99, 230),
    "a-2.png": (151, 139, 223, 230),
    "a-3.png": (275, 139, 353, 230),
    "b-1.png": (27, 278, 99, 374),
    "b-2.png": (151, 278, 223, 374),
    "b-3.png": (275, 278, 353, 374),
    "c-1.png": (27, 418, 99, 510),
    "c-2.png": (151, 418, 223, 510),
    "c-3.png": (275, 418, 353, 510),
    "d-1.png": (27, 553, 99, 646),
    "d-2.png": (151, 553, 223, 646),
    "d-3.png": (275, 553, 353, 646),
}


def extract_assets(pdf_path: Path, output_dir: Path) -> list[Path]:
    page = PdfReader(str(pdf_path)).pages[0]
    images = {image.name: image.image.convert("RGBA") for image in page.images}
    question_dir = output_dir / "questions"
    type_dir = output_dir / "types"
    question_dir.mkdir(parents=True, exist_ok=True)
    type_dir.mkdir(parents=True, exist_ok=True)
    created = []

    for filename, image_name in QUESTION_IMAGES.items():
        target = question_dir / filename
        images[image_name].save(target, "PNG")
        created.append(target)

    table_image = images["Im0.png"]
    for filename, crop_box in TYPE_CROPS.items():
        target = type_dir / filename
        table_image.crop(crop_box).save(target, "PNG")
        created.append(target)

    return created


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    extract_assets(
        project_root / "reference" / "무드 체크 리스트. ver2.pdf",
        project_root / "assets" / "diagnosis",
    )
```

- [ ] **Step 4: 추출 테스트 통과 확인**

Run:

```bash
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests/test_pdf_assets.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 5: 프로젝트 자산 폴더에 실제 PNG 생성**

Run:

```bash
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/extract-pdf-assets.py
```

Expected: `assets/diagnosis/questions`에 34개, `assets/diagnosis/types`에 12개 PNG가 생성된다.

- [ ] **Step 6: 눈·얼굴 이미지가 잘리지 않았는지 대표 자산 확인**

Open and inspect:

- `assets/diagnosis/questions/q05-a.png`
- `assets/diagnosis/questions/q06-c-1.png`
- `assets/diagnosis/types/a-1.png`
- `assets/diagnosis/types/d-3.png`

Expected: 질문 이미지는 PDF 원본 전체이고, 타입 이미지는 표의 선·글자가 없는 얼굴 부분만 보인다.

- [ ] **Step 7: 자산 추출 작업 커밋**

```bash
git add scripts/extract-pdf-assets.py tests/test_pdf_assets.py assets/diagnosis
git commit -m "[code] PDF 진단 이미지 자산 추출"
```

---

### Task 2: 진단 데이터·점수·공동순위·상태 로직

**Files:**
- Create: `tests/diagnosis-core.test.js`
- Create: `src/diagnosis-core.js`

**Interfaces:**
- Produces: `MiyuDiagnosisCore.QUESTIONS`
- Produces: `MiyuDiagnosisCore.TYPES`
- Produces: `createInitialState(today: string) -> DiagnosisState`
- Produces: `toggleAnswer(state, questionIndex, optionCode) -> { state, error }`
- Produces: `calculateScores(answers) -> { A, B, C, D }`
- Produces: `calculateDenseRanks(scores) -> { A, B, C, D }`
- Produces: `firstIncompleteQuestion(answers) -> number`
- Produces: `canVisitQuestion(answers, targetIndex) -> boolean`
- Produces: `restoreState(serialized, today) -> DiagnosisState`
- Produces: `explanationHash(typeCode) -> string`
- State shape:

```javascript
{
  version: 17,
  profile: { name: "", date: "YYYY-MM-DD", personalColor: "" },
  answers: [[], [], [], [], [], [], [], [], [], []],
  currentQuestion: 0,
  scores: { A: 0, B: 0, C: 0, D: 0 },
  selectedType: null
}
```

- [ ] **Step 1: 핵심 행동의 실패 테스트 작성**

`tests/diagnosis-core.test.js`에 Node 내장 테스트만 사용한다.

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/diagnosis-core.js');

test('PDF 순서의 10문항과 교정 문구를 제공한다', () => {
  assert.equal(core.QUESTIONS.length, 10);
  assert.equal(core.QUESTIONS[0].title, '얼굴형');
  assert.equal(core.QUESTIONS[9].title, '이목구비 강도');
  assert.match(core.QUESTIONS[4].options[3].label, /상향형/);
  assert.doesNotMatch(core.QUESTIONS[4].options[3].label, /샹향형/);
  assert.match(core.QUESTIONS[8].options[0].label, /웃상/);
});

test('한 문항에서 1개 또는 2개만 선택하고 세 번째는 거절한다', () => {
  const initial = core.createInitialState('2026-07-27');
  const one = core.toggleAnswer(initial, 0, 'A');
  const two = core.toggleAnswer(one.state, 0, 'B');
  const three = core.toggleAnswer(two.state, 0, 'C');
  assert.deepEqual(two.state.answers[0], ['A', 'B']);
  assert.equal(three.error, '최대 2개까지 선택할 수 있어요');
  assert.deepEqual(three.state.answers[0], ['A', 'B']);
});

test('선택한 답을 다시 누르면 해제한다', () => {
  const initial = core.createInitialState('2026-07-27');
  const selected = core.toggleAnswer(initial, 0, 'A');
  const deselected = core.toggleAnswer(selected.state, 0, 'A');
  assert.deepEqual(deselected.state.answers[0], []);
});

test('A와 B를 함께 선택하면 양쪽에 각각 1점을 더한다', () => {
  const answers = [['A', 'B'], ['A'], ['C'], ['D'], [], [], [], [], [], []];
  assert.deepEqual(core.calculateScores(answers), { A: 2, B: 1, C: 1, D: 1 });
});

test('동점 그룹은 공동순위이고 다음 서로 다른 점수가 2위다', () => {
  assert.deepEqual(
    core.calculateDenseRanks({ A: 8, B: 8, C: 6, D: 3 }),
    { A: 1, B: 1, C: 2, D: 3 }
  );
});

test('완료 문항과 현재 도달 문항만 진행표로 이동할 수 있다', () => {
  const answers = [['A'], ['B'], [], [], [], [], [], [], [], []];
  assert.equal(core.firstIncompleteQuestion(answers), 2);
  assert.equal(core.canVisitQuestion(answers, 0), true);
  assert.equal(core.canVisitQuestion(answers, 2), true);
  assert.equal(core.canVisitQuestion(answers, 3), false);
});

test('깨진 저장 데이터는 오늘 날짜의 초기 상태로 복구한다', () => {
  const restored = core.restoreState('{broken', '2026-07-27');
  assert.equal(restored.profile.date, '2026-07-27');
  assert.equal(restored.answers.length, 10);
  assert.equal(restored.selectedType, null);
});

test('12타입 순서와 기존 해설 주소가 PDF 기준으로 일치한다', () => {
  assert.deepEqual(core.TYPES.map(type => type.code), [
    'A-1', 'A-2', 'A-3', 'B-1', 'B-2', 'B-3',
    'C-1', 'C-2', 'C-3', 'D-1', 'D-2', 'D-3'
  ]);
  assert.equal(core.explanationHash('D-1'), '#/cat/13');
  assert.equal(core.explanationHash('D-2'), '#/cat/08');
  assert.equal(core.explanationHash('D-3'), '#/cat/17');
});
```

- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인**

Run:

```bash
node --test tests/diagnosis-core.test.js
```

Expected: `Cannot find module '../src/diagnosis-core.js'`로 FAIL.

- [ ] **Step 3: 문항과 타입의 정확한 데이터 작성**

`src/diagnosis-core.js`는 브라우저 전역과 Node `require`를 모두 지원하는 작은 UMD 모듈로 만든다.

```javascript
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuDiagnosisCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const OPTION_CODES = ['A', 'B', 'C', 'D'];
  const QUESTIONS = [
    {
      number: 1,
      title: '얼굴형',
      subtitle: 'Face Shape',
      options: [
        { code: 'A', label: '역삼각형', images: ['questions/q01-a.png'] },
        { code: 'B', label: '계란형', images: ['questions/q01-b.png'] },
        { code: 'C', label: '둥근형 / 긴형', images: ['questions/q01-c-1.png', 'questions/q01-c-2.png'] },
        { code: 'D', label: '각진형', images: ['questions/q01-d.png'] }
      ]
    },
    {
      number: 2,
      title: '턱선',
      subtitle: 'Jawline · 그림표',
      options: [
        { code: 'A', label: '짧은 턱 + 넓은 V', images: ['questions/q02-a.png'] },
        { code: 'B', label: '부드러운 U자 또는 부드러운 각진형 / 무턱', images: ['questions/q02-b.png'] },
        { code: 'C', label: '각진 느낌 + 끝이 평평', images: ['questions/q02-c.png'] },
        { code: 'D', label: '하악각이 발달해 각진 느낌이지만 끝이 뾰족한 V', images: ['questions/q02-d.png'] }
      ]
    },
    {
      number: 3,
      title: '이마',
      subtitle: 'Forehead',
      options: [
        { code: 'A', label: '볼록 나온 이마', images: ['questions/q03-a.png'] },
        { code: 'B', label: '예쁜 이마', images: ['questions/q03-b.png'] },
        { code: 'C', label: '좁은 이마', images: ['questions/q03-c.png'] },
        { code: 'D', label: '이마 눈썹뼈가 튀어나온 이마', images: ['questions/q03-d.png'] }
      ]
    },
    {
      number: 4,
      title: '눈썹',
      subtitle: 'Eyebrows',
      options: [
        { code: 'A', label: '가늘고 연한 눈썹', images: ['questions/q04-a.png'] },
        { code: 'B', label: '둥근 세미 아치 눈썹', images: ['questions/q04-b.png'] },
        { code: 'C', label: '산이 강한 아치 눈썹', images: ['questions/q04-c.png'] },
        { code: 'D', label: '두껍고 눈썹뼈가 발달한 눈썹 (없거나 있거나)', images: ['questions/q04-d.png'] }
      ]
    },
    {
      number: 5,
      title: '눈',
      subtitle: 'Eyes',
      options: [
        { code: 'A', label: '둥근 호 느낌이 강한 눈, 웃지 않을 때 둥근 느낌', images: ['questions/q05-a.png'] },
        { code: 'B', label: '아몬드 모양, 눈꼬리 하향', images: ['questions/q05-b.png'] },
        { code: 'C', label: '아몬드 모양, 눈꼬리 상향', images: ['questions/q05-c.png'] },
        { code: 'D', label: '상향형 날카롭고 뾰족한 각진 눈매', images: ['questions/q05-d.png'] }
      ]
    },
    {
      number: 6,
      title: '광대',
      subtitle: 'Cheekbones',
      options: [
        { code: 'A', label: '평면 / 웃을 때 볼살 생김', images: ['questions/q06-a.png'] },
        { code: 'B', label: '돌출 약함, 정돈됨', images: ['questions/q06-b.png'] },
        { code: 'C', label: '앞광대 평평, 옆광대 발달', images: ['questions/q06-c-1.png', 'questions/q06-c-2.png'] },
        { code: 'D', label: '앞광대 있는 편', images: ['questions/q06-d.png'] }
      ]
    },
    {
      number: 7,
      title: '코',
      subtitle: 'Nose',
      options: [
        { code: 'A', label: '콧볼 있는 둥근 코', images: ['questions/q07-a.png'] },
        { code: 'B', label: '여성스러운 코 (코가 강하게 부각되지 않음)', images: ['questions/q07-b.png'] },
        { code: 'C', label: '콧대가 두껍고 직선 콧대', images: ['questions/q07-c.png'] },
        { code: 'D', label: '콧대가 가늘고 긴 코 (코 길이감 있음)', images: ['questions/q07-d.png'] }
      ]
    },
    {
      number: 8,
      title: '입',
      subtitle: 'Lips',
      options: [
        { code: 'A', label: '입이 가로로 길고 입이 큼 + 큐피드 활 또렷 (무표정일 때 입이 작고, 웃을 때 가로로 길어짐)', images: ['questions/q08-a.png'] },
        { code: 'B', label: '입술이 작고 윗입술이 아랫입술 대비 얇음', images: ['questions/q08-b.png'] },
        { code: 'C', label: '입술산과 립라인이 또렷함', images: ['questions/q08-c.png'] },
        { code: 'D', label: '립라인이 흐리고 입술이 두꺼움', images: ['questions/q08-d.png'] }
      ]
    },
    {
      number: 9,
      title: '무드',
      subtitle: 'Mood · 추구미가 아닌 첫인상, 평소 표정 기준',
      options: [
        { code: 'A', label: '통통 튀는 · 발랄한 · 러블리한 · 동안 · 웃상', images: [] },
        { code: 'B', label: '정석미인 · 우아한 · 고급스러운 · 성숙한', images: [] },
        { code: 'C', label: '동양적인 · 이국적인 · 캐릭터 있는', images: [] },
        { code: 'D', label: '날카로운 · 선명한 · 카리스마 있는', images: [] }
      ]
    },
    {
      number: 10,
      title: '이목구비 강도',
      subtitle: '눈썹, 눈, 코, 입, 턱선, 광대',
      options: [
        { code: 'A', label: '매우 약함 (0~1개)', images: [] },
        { code: 'B', label: '약함 (2개)', images: [] },
        { code: 'C', label: '중간 (3개)', images: [] },
        { code: 'D', label: '강함 (4개 이상)', images: [] }
      ]
    }
  ];

  const TYPES = [
    { code: 'A-1', group: 'A', name: '판타지', image: 'types/a-1.png', hash: '#/cat/01' },
    { code: 'A-2', group: 'A', name: '프루티', image: 'types/a-2.png', hash: '#/cat/03' },
    { code: 'A-3', group: 'A', name: '소다', image: 'types/a-3.png', hash: '#/cat/07' },
    { code: 'B-1', group: 'B', name: '로맨틱', image: 'types/b-1.png', hash: '#/cat/05' },
    { code: 'B-2', group: 'B', name: '소프트', image: 'types/b-2.png', hash: '#/cat/06' },
    { code: 'B-3', group: 'B', name: '엘레강스', image: 'types/b-3.png', hash: '#/cat/09' },
    { code: 'C-1', group: 'C', name: '빈티지', image: 'types/c-1.png', hash: '#/cat/12' },
    { code: 'C-2', group: 'C', name: '세련', image: 'types/c-2.png', hash: '#/cat/16' },
    { code: 'C-3', group: 'C', name: '딥시크', image: 'types/c-3.png', hash: '#/cat/18' },
    { code: 'D-1', group: 'D', name: '카리스마', image: 'types/d-1.png', hash: '#/cat/13' },
    { code: 'D-2', group: 'D', name: '클리어', image: 'types/d-2.png', hash: '#/cat/08' },
    { code: 'D-3', group: 'D', name: '샤프', image: 'types/d-3.png', hash: '#/cat/17' }
  ];

  function createInitialState(today) {
    return {
      version: 17,
      profile: { name: '', date: today, personalColor: '' },
      answers: Array.from({ length: QUESTIONS.length }, () => []),
      currentQuestion: 0,
      scores: { A: 0, B: 0, C: 0, D: 0 },
      selectedType: null
    };
  }

  function calculateScores(answers) {
    const scores = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach(answer => answer.forEach(code => { scores[code] += 1; }));
    return scores;
  }

  function calculateDenseRanks(scores) {
    const values = Array.from(new Set(Object.values(scores))).sort((a, b) => b - a);
    return Object.fromEntries(
      OPTION_CODES.map(code => [code, values.indexOf(scores[code]) + 1])
    );
  }

  function toggleAnswer(state, questionIndex, optionCode) {
    const current = state.answers[questionIndex] || [];
    let next;
    if (current.includes(optionCode)) {
      next = current.filter(code => code !== optionCode);
    } else if (current.length >= 2) {
      return { state, error: '최대 2개까지 선택할 수 있어요' };
    } else {
      next = [...current, optionCode];
    }
    const answers = state.answers.map((answer, index) =>
      index === questionIndex ? next : [...answer]
    );
    return {
      state: { ...state, answers, scores: calculateScores(answers) },
      error: null
    };
  }

  function firstIncompleteQuestion(answers) {
    const index = answers.findIndex(answer => answer.length === 0);
    return index === -1 ? QUESTIONS.length : index;
  }

  function canVisitQuestion(answers, targetIndex) {
    return Number.isInteger(targetIndex)
      && targetIndex >= 0
      && targetIndex <= firstIncompleteQuestion(answers)
      && targetIndex < QUESTIONS.length;
  }

  function isValidAnswers(answers) {
    return Array.isArray(answers)
      && answers.length === QUESTIONS.length
      && answers.every(answer =>
        Array.isArray(answer)
        && answer.length <= 2
        && new Set(answer).size === answer.length
        && answer.every(code => OPTION_CODES.includes(code))
      );
  }

  function restoreState(serialized, today) {
    if (!serialized) return createInitialState(today);
    try {
      const parsed = JSON.parse(serialized);
      if (parsed.version !== 17 || !isValidAnswers(parsed.answers)) {
        return createInitialState(today);
      }
      const selectedType = parsed.selectedType === null
        || TYPES.some(type => type.code === parsed.selectedType)
        ? parsed.selectedType
        : null;
      return {
        version: 17,
        profile: {
          name: typeof parsed.profile?.name === 'string' ? parsed.profile.name : '',
          date: typeof parsed.profile?.date === 'string' ? parsed.profile.date : today,
          personalColor: typeof parsed.profile?.personalColor === 'string'
            ? parsed.profile.personalColor
            : ''
        },
        answers: parsed.answers.map(answer => [...answer]),
        currentQuestion: Number.isInteger(parsed.currentQuestion)
          ? Math.min(9, Math.max(0, parsed.currentQuestion))
          : 0,
        scores: calculateScores(parsed.answers),
        selectedType
      };
    } catch {
      return createInitialState(today);
    }
  }

  function explanationHash(typeCode) {
    return TYPES.find(type => type.code === typeCode)?.hash || '#/index';
  }

  return {
    OPTION_CODES,
    QUESTIONS,
    TYPES,
    createInitialState,
    toggleAnswer,
    calculateScores,
    calculateDenseRanks,
    firstIncompleteQuestion,
    canVisitQuestion,
    restoreState,
    explanationHash
  };
});
```

구현 규칙은 다음과 같이 고정한다.

- 모든 상태 변경은 원본 객체를 직접 바꾸지 않고 새 객체를 반환한다.
- `toggleAnswer`는 기존 선택 순서를 보존한다.
- `calculateDenseRanks`는 `Array.from(new Set(Object.values(scores))).sort((a,b) => b-a)`의 위치 + 1을 순위로 쓴다.
- `restoreState`는 JSON 파싱, `version === 17`, 답변 배열 10개, 허용 코드, 문항별 최대 2개를 검증하고 하나라도 어긋나면 초기 상태로 되돌린다.
- 타입을 찾지 못한 `explanationHash`는 `#/index`를 반환한다.

- [ ] **Step 4: 핵심 로직 테스트 통과 확인**

Run:

```bash
node --test tests/diagnosis-core.test.js
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 상태 경계 사례 테스트 추가**

다음 테스트를 추가한다.

```javascript
test('모든 그룹 점수가 같으면 모두 공동 1위이고 2위 그룹은 없다', () => {
  assert.deepEqual(
    core.calculateDenseRanks({ A: 5, B: 5, C: 5, D: 5 }),
    { A: 1, B: 1, C: 1, D: 1 }
  );
});

test('문항별 최대 점수는 10점을 넘지 않는다', () => {
  const answers = Array.from({ length: 10 }, () => ['A', 'B']);
  assert.deepEqual(core.calculateScores(answers), { A: 10, B: 10, C: 0, D: 0 });
});

test('저장 데이터의 세 번째 선택지는 안전한 초기 상태로 되돌린다', () => {
  const invalid = core.createInitialState('2026-07-27');
  invalid.answers[0] = ['A', 'B', 'C'];
  const restored = core.restoreState(JSON.stringify(invalid), '2026-07-27');
  assert.deepEqual(restored.answers[0], []);
});
```

Run:

```bash
node --test tests/diagnosis-core.test.js
```

Expected: 추가 경계 사례까지 모두 PASS.

- [ ] **Step 6: 진단 핵심 로직 커밋**

```bash
git add src/diagnosis-core.js tests/diagnosis-core.test.js
git commit -m "[code] 진단 점수와 공동순위 로직 구현"
```

---

### Task 3: 시작·문항·진행표·결과 화면 렌더러

**Files:**
- Create: `tests/diagnosis-ui.test.js`
- Create: `src/diagnosis-ui.js`
- Create: `src/diagnosis.css`

**Interfaces:**
- Consumes: `MiyuDiagnosisCore`
- Consumes: `window.MIYU_DIAGNOSIS_ASSETS[path] -> data URI`
- Produces: `renderStartView(state) -> string`
- Produces: `renderQuestionView(state, questionIndex) -> string`
- Produces: `renderProgressDrawer(state, questionIndex) -> string`
- Produces: `renderResultView(state) -> string`
- Produces: `mount(rootElement, browserAdapters) -> void`
- Produces: `renderRoute(hash) -> void`
- Storage key: `miyuDiagnosisV17`

- [ ] **Step 1: 화면 계약의 실패 테스트 작성**

`tests/diagnosis-ui.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/diagnosis-core.js');
const ui = require('../src/diagnosis-ui.js');

function answeredState() {
  const state = core.createInitialState('2026-07-27');
  state.profile = { name: '미유', date: '2026-07-27', personalColor: '여름 쿨' };
  state.answers = [
    ['A'], ['A', 'B'], ['B'], ['C'], ['D'],
    ['A'], ['B'], ['C'], ['D'], ['A']
  ];
  state.scores = core.calculateScores(state.answers);
  return state;
}

test('시작 화면은 이름 필수, 날짜, 퍼스널컬러와 로고를 표시한다', () => {
  const html = ui.renderStartView(core.createInitialState('2026-07-27'));
  assert.match(html, /name="clientName"/);
  assert.match(html, /required/);
  assert.match(html, /value="2026-07-27"/);
  assert.match(html, /name="personalColor"/);
  assert.match(html, /data-asset="logo"/);
});

test('문항 화면은 2×2 선택 카드, 진행표, 이전·다음 버튼을 표시한다', () => {
  const html = ui.renderQuestionView(core.createInitialState('2026-07-27'), 4);
  assert.equal((html.match(/class="miyu-answer-card/g) || []).length, 4);
  assert.match(html, /진행표 5\/10/);
  assert.match(html, /data-action="previous"/);
  assert.match(html, /data-action="next"/);
  assert.match(html, /q05-a\.png/);
});

test('진행표는 완료·현재·남은 문항을 구분하고 미래 문항을 비활성화한다', () => {
  const state = core.createInitialState('2026-07-27');
  state.answers[0] = ['A'];
  const html = ui.renderProgressDrawer(state, 1);
  assert.match(html, /data-status="complete"/);
  assert.match(html, /data-status="current"/);
  assert.match(html, /data-status="remaining"[^>]*disabled/);
});

test('결과는 네 점수와 PDF 순서의 12타입을 모두 표시한다', () => {
  const state = answeredState();
  const html = ui.renderResultView(state);
  assert.equal((html.match(/class="miyu-type-card/g) || []).length, 12);
  assert.ok(html.indexOf('D-1') < html.indexOf('D-2'));
  assert.ok(html.indexOf('D-2') < html.indexOf('D-3'));
  assert.match(html, /카리스마/);
  assert.match(html, /클리어/);
  assert.match(html, /샤프/);
});

test('1위와 2위 라벨은 카드 상단용 요소로 점수 숫자와 분리한다', () => {
  const state = answeredState();
  const html = ui.renderResultView(state);
  assert.match(html, /miyu-rank-badge/);
  assert.match(html, /data-rank="1"/);
  assert.match(html, /data-rank="2"/);
});

test('타입을 고르기 전 확정 버튼은 비활성화한다', () => {
  const html = ui.renderResultView(answeredState());
  assert.match(html, /data-action="confirm-type"[^>]*disabled/);
});
```

- [ ] **Step 2: 테스트가 UI 모듈 부재로 실패하는지 확인**

Run:

```bash
node --test tests/diagnosis-ui.test.js
```

Expected: `Cannot find module '../src/diagnosis-ui.js'`로 FAIL.

- [ ] **Step 3: 네 화면 렌더러를 최소 구현**

`src/diagnosis-ui.js`는 `src/diagnosis-core.js`와 같은 UMD 형태로 만들고 HTML 문자열에서 사용자 입력값을 반드시 이스케이프한다.

```javascript
(function (root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./diagnosis-core.js')
    : root.MiyuDiagnosisCore;
  const api = factory(core, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuDiagnosisUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core, root) {
  const STORAGE_KEY = 'miyuDiagnosisV17';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function asset(path) {
    const assets = root.MIYU_DIAGNOSIS_ASSETS || {};
    return assets[path] || '';
  }

  function renderAssetImages(paths, alt) {
    return paths.map((path, index) =>
      `<button class="miyu-image-zoom" type="button" data-action="open-image" data-image="${escapeHtml(path)}" aria-label="${escapeHtml(alt)} 이미지 ${index + 1} 크게 보기">` +
      `<img src="${asset(path)}" data-asset="${escapeHtml(path)}" alt="${escapeHtml(alt)}" loading="eager">` +
      `</button>`
    ).join('');
  }

  function renderStartView(state) {
    return `<div class="miyu-start-shell">
      <img class="miyu-start-logo" src="${asset('logo')}" data-asset="logo" alt="MIYU">
      <p class="miyu-eyebrow">MIYU MOOD CHECKLIST</p>
      <h1>무드 진단</h1>
      <form class="miyu-profile-form" data-action="start">
        <label>이름
          <input name="clientName" value="${escapeHtml(state.profile.name)}" required>
          <span class="miyu-field-error" data-profile-error aria-live="polite"></span>
        </label>
        <label>진단일
          <input name="diagnosisDate" type="date" value="${escapeHtml(state.profile.date)}">
        </label>
        <label>퍼스널컬러 <span class="miyu-optional">선택</span>
          <input name="personalColor" value="${escapeHtml(state.profile.personalColor)}">
        </label>
        <button class="miyu-button miyu-primary" type="submit">진단 시작</button>
      </form>
    </div>`;
  }

  function renderProgressDrawer(state, questionIndex) {
    const firstIncomplete = core.firstIncompleteQuestion(state.answers);
    const items = core.QUESTIONS.map((question, index) => {
      const status = index === questionIndex
        ? 'current'
        : index < firstIncomplete
          ? 'complete'
          : 'remaining';
      const disabled = core.canVisitQuestion(state.answers, index) ? '' : ' disabled';
      return `<button class="miyu-progress-item" type="button"
        data-action="goto-question" data-question="${index}"
        data-status="${status}"${disabled}>
        <span>${question.number}</span><strong>${escapeHtml(question.title)}</strong>
      </button>`;
    }).join('');
    return `<div class="miyu-drawer-backdrop" data-action="close-progress"></div>
      <aside class="miyu-progress-drawer" aria-label="진단 진행표">
        <div class="miyu-drawer-head">
          <img src="${asset('logo')}" data-asset="logo" alt="MIYU">
          <button type="button" data-action="close-progress" aria-label="진행표 닫기">×</button>
        </div>
        <p>${firstIncomplete}개 완료</p>
        <nav>${items}</nav>
      </aside>`;
  }

  function renderQuestionView(state, questionIndex) {
    const question = core.QUESTIONS[questionIndex];
    const selected = state.answers[questionIndex];
    const cards = question.options.map(option => {
      const pressed = selected.includes(option.code);
      const images = renderAssetImages(option.images, `${option.code}. ${option.label}`);
      return `<button class="miyu-answer-card" type="button"
        data-action="select-answer" data-option="${option.code}"
        aria-pressed="${pressed}">
        <span class="miyu-option-code">${option.code}</span>
        <span class="miyu-option-label">${escapeHtml(option.label)}</span>
        ${images ? `<span class="miyu-answer-image">${images}</span>` : ''}
      </button>`;
    }).join('');
    return `<div class="miyu-question-shell">
      ${renderProgressDrawer(state, questionIndex)}
      <header class="miyu-question-head">
        <button type="button" class="miyu-progress-trigger" data-action="open-progress">진행표 ${question.number}/10</button>
        <img src="${asset('logo')}" data-asset="logo" alt="MIYU">
      </header>
      <main>
        <p class="miyu-question-count">${question.number} / 10</p>
        <h1>${escapeHtml(question.title)}</h1>
        <p>${escapeHtml(question.subtitle)}</p>
        <div class="miyu-answer-grid">${cards}</div>
        <p class="miyu-selection-error" aria-live="polite"></p>
      </main>
      <footer class="miyu-question-footer">
        <button class="miyu-button" type="button" data-action="previous">이전</button>
        <button class="miyu-button miyu-primary" type="button" data-action="next"${selected.length ? '' : ' disabled'}>${questionIndex === 9 ? '결과 보기' : '다음'}</button>
      </footer>
    </div>`;
  }

  function renderResultView(state) {
    const scores = core.calculateScores(state.answers);
    const ranks = core.calculateDenseRanks(scores);
    const scoreCards = core.OPTION_CODES.map(group => {
      const rank = ranks[group];
      const badge = rank <= 2
        ? `<span class="miyu-rank-badge" data-rank="${rank}">${rank}위</span>`
        : '';
      return `<article class="miyu-score-card" data-group="${group}" data-rank="${rank}">
        ${badge}<span>${group}</span><strong>${scores[group]}</strong><small>/ 10</small>
      </article>`;
    }).join('');
    const typeCards = core.TYPES.map(type => {
      const rank = ranks[type.group];
      const selected = state.selectedType === type.code;
      const rankBadge = rank <= 2
        ? `<span class="miyu-rank-badge" data-rank="${rank}">${rank}위</span>`
        : '';
      return `<button class="miyu-type-card" type="button"
        data-action="select-type" data-type="${type.code}"
        data-group="${type.group}" data-rank="${rank}" data-selected="${selected}">
        ${rankBadge}
        ${selected ? '<span class="miyu-selected-badge">선택</span>' : ''}
        <span class="miyu-type-photo"><img src="${asset(type.image)}" data-asset="${type.image}" alt="${escapeHtml(type.name)}"></span>
        <span class="miyu-type-code">${type.code}</span>
        <strong>${escapeHtml(type.name)}</strong>
      </button>`;
    }).join('');
    const selected = core.TYPES.find(type => type.code === state.selectedType);
    const confirmLabel = selected
      ? `${selected.code} ${selected.name}으로 확정하고 해설 보기`
      : '최종 타입을 선택해 주세요';
    return `<div class="miyu-result-shell">
      <header><img src="${asset('logo')}" data-asset="logo" alt="MIYU"><h1>${escapeHtml(state.profile.name)}님의 진단 결과</h1></header>
      <section class="miyu-score-grid" aria-label="ABCD 점수">${scoreCards}</section>
      <section><h2>최종 세부타입 선택</h2><p>점수와 관계없이 컨설턴트가 최종 타입을 선택할 수 있어요.</p>
        <div class="miyu-type-grid">${typeCards}</div>
      </section>
      <div class="miyu-result-actions">
        <button class="miyu-button" type="button" data-action="new-diagnosis">새 진단 시작</button>
        <button class="miyu-button miyu-primary" type="button" data-action="confirm-type"${selected ? '' : ' disabled'}>${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
  }

  return {
    STORAGE_KEY,
    escapeHtml,
    renderStartView,
    renderProgressDrawer,
    renderQuestionView,
    renderResultView
  };
});
```

렌더링 규칙:

- 시작 화면은 큰 로고, 이름·날짜·퍼스널컬러, `진단 시작`을 표시한다.
- 문항 화면은 상단 중앙 작은 로고, 좌측 `진행표 N/10`, 질문 제목, 2×2 카드, 하단 이전·다음을 표시한다.
- 이미지가 두 개인 C 선택지는 같은 카드 안에서 2열로 나란히 표시한다.
- 이미지가 없는 9·10번도 카드 높이와 터치 영역을 유지한다.
- 선택 카드에는 `aria-pressed="true|false"`를 설정한다.
- 다음 버튼은 해당 문항 답이 없으면 `disabled`다.
- 결과 화면은 이름·날짜·퍼스널컬러, A/B/C/D 점수표, 12타입 카드, 별도 확정 버튼을 표시한다.
- 순위가 1 또는 2인 그룹과 그 그룹의 3개 타입 카드에 각각 `data-rank`와 독립된 `.miyu-rank-badge`를 넣는다.
- 선택 타입은 `data-selected="true"`와 `선택` 라벨을 사용하며 순위 라벨을 지우지 않는다.
- 얼굴 이미지는 `<img>`에 `object-fit: contain`이 적용되는 전용 프레임에 넣는다.

- [ ] **Step 4: 화면 계약 테스트 통과 확인**

Run:

```bash
node --test tests/diagnosis-ui.test.js
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 브라우저 동작을 이벤트 위임으로 연결**

`mount`는 `#miyu-diagnosis-app`에 한 번만 `click`, `input`, `submit` 이벤트를 연결한다. 각 행동은 다음과 같다.

| `data-action` | 동작 |
|---|---|
| `start` | 이름 검증 후 상태 저장, `#/diagnosis/question/1` 이동 |
| `select-answer` | `toggleAnswer` 실행, 세 번째 선택이면 안내문 표시 |
| `previous` | 1번이면 시작 화면, 나머지는 이전 문항 이동 |
| `next` | 답이 있으면 다음 문항, 10번이면 결과 이동 |
| `open-progress` | 왼쪽 진행표에 `open` 클래스와 배경막 표시 |
| `close-progress` | 진행표와 배경막 닫기 |
| `goto-question` | `canVisitQuestion`이 참일 때만 해당 문항 이동 |
| `open-image` | 전체 이미지를 `contain`으로 표시하는 모달 열기 |
| `close-image` | 이미지 모달 닫기 |
| `select-type` | 12타입 중 하나를 상태의 `selectedType`으로 저장 |
| `confirm-type` | `explanationHash`로 이동 |
| `new-diagnosis` | 진행 내용이 있으면 `confirm`, 승인 시 저장소 삭제 후 `#/` 이동 |

저장과 복원:

```javascript
function saveState(state) {
  root.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const today = new Date().toLocaleDateString('en-CA');
  return core.restoreState(root.sessionStorage.getItem(STORAGE_KEY), today);
}
```

`renderRoute`는 다음 주소만 처리한다.

- `#/`, `#/diagnosis`, `#/diagnosis/start`: 시작
- `#/diagnosis/question/1`부터 `#/diagnosis/question/10`: 문항
- `#/diagnosis/result`: 결과

미완료 미래 문항 주소를 직접 입력하면 `firstIncompleteQuestion + 1`로 이동한다. 결과 주소를 직접 입력했는데 미완료 문항이 있으면 첫 미완료 문항으로 이동한다.

브라우저에서는 UI 모듈이 기존 라우터보다 먼저 등록되도록 다음 초기화를 UMD factory 밖 마지막에 둔다.

```javascript
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    MiyuDiagnosisUI.normalizeLegacyTypeOrder();
    MiyuDiagnosisUI.mount(document.getElementById('miyu-diagnosis-app'), {
      storage: window.sessionStorage,
      location: window.location,
      confirm: window.confirm.bind(window)
    });
  });
}
```

`normalizeLegacyTypeOrder`는 직접 `#/cat/*` 주소로 처음 열어도 실행되므로, 진단 화면을 거치지 않아도 D타입 코드와 기존 해설 화면의 표시가 맞아야 한다. `mount`는 앱 루트의 `dataset.mounted`를 확인해 이벤트가 중복 등록되지 않게 한다.

- [ ] **Step 6: 태블릿 세로 우선 CSS 작성**

`src/diagnosis.css`에 아래 수치를 기준으로 작성한다.

```css
#miyu-diagnosis-app {
  --miyu-ink: #171717;
  --miyu-paper: #fbfaf8;
  --miyu-line: #dedad5;
  --miyu-rank-one: #d85d82;
  --miyu-rank-two: #5379bd;
  min-height: 100dvh;
  background: var(--miyu-paper);
  color: var(--miyu-ink);
}

.miyu-answer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.miyu-answer-card,
.miyu-button,
.miyu-progress-item,
.miyu-type-card {
  min-height: 44px;
}

.miyu-answer-image img,
.miyu-type-photo img,
.miyu-image-modal img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.miyu-progress-drawer {
  position: fixed;
  inset: 0 auto 0 0;
  width: min(78vw, 440px);
  transform: translateX(-100%);
}

.miyu-progress-drawer.open {
  transform: translateX(0);
}

@media (orientation: landscape) and (min-width: 900px) {
  .miyu-question-shell {
    max-width: 1180px;
  }
  .miyu-progress-drawer {
    width: min(42vw, 460px);
  }
}

@media (max-width: 560px) {
  .miyu-answer-grid {
    grid-template-columns: 1fr;
  }
}
```

순위 라벨은 카드 테두리 위쪽에 배치하고 점수 숫자 영역을 덮지 않는다. 타입 선택 라벨은 우측 상단에 두어 순위 라벨과 겹치지 않게 한다. 하단 이전·다음은 세로 태블릿에서 엄지로 누르기 쉬운 고정 영역으로 만들되, 콘텐츠 마지막 부분을 가리지 않도록 본문에 같은 높이의 여백을 둔다.

- [ ] **Step 7: 전체 Node 테스트 통과 확인**

Run:

```bash
node --test tests/diagnosis-core.test.js tests/diagnosis-ui.test.js
```

Expected: 모든 테스트 PASS, 경고 없음.

- [ ] **Step 8: 진단 UI 작업 커밋**

```bash
git add src/diagnosis-ui.js src/diagnosis.css tests/diagnosis-ui.test.js
git commit -m "[code] 태블릿 진단 화면과 진행표 구현"
```

---

### Task 4: v16 해설과 v17 진단의 단일 HTML 조립

**Files:**
- Create: `tests/build-v17.test.mjs`
- Create: `scripts/build-v17.mjs`
- Create: `dist/미유_무드진단_12type_v17.html`

**Interfaces:**
- Consumes: v16, logo, 46개 PDF PNG, core, UI, CSS
- Produces: `buildV17({ rootDir, outputPath }) -> { outputPath, sourceHash, outputHash }`
- Produces: 오프라인 단일 HTML

- [ ] **Step 1: 조립 결과의 실패 테스트 작성**

`tests/build-v17.test.mjs`:

```javascript
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

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function extractCatInfo(html) {
  const match = html.match(/const CAT_INFO = (\{[\s\S]*?\n\});/);
  assert.ok(match, 'generated HTML must contain CAT_INFO');
  return vm.runInNewContext(`(${match[1]})`);
}

test('v16은 바꾸지 않고 진단이 포함된 단일 v17을 만든다', () => {
  const before = sha256(sourcePath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-'));
  const outputPath = path.join(tempDir, 'v17.html');
  buildV17({ rootDir: root, outputPath });
  const html = fs.readFileSync(outputPath, 'utf8');
  assert.equal(before, sha256(sourcePath));
  assert.equal(before, '46f24a73ab0e624e029f1f58fe44f6ec311bfdeba84c7e7833d82c8f0ee2fa81');
  assert.match(html, /id="miyu-diagnosis-app"/);
  assert.match(html, /window\.MIYU_DIAGNOSIS_ASSETS/);
  assert.match(html, /data:image\/png;base64,/);
  assert.doesNotMatch(html, /src="assets\/diagnosis\//);
});

test('D타입 코드·이름·기존 해설 주소를 PDF 순서로 바로잡는다', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-'));
  const outputPath = path.join(tempDir, 'v17.html');
  buildV17({ rootDir: root, outputPath });
  const html = fs.readFileSync(outputPath, 'utf8');
  const catInfo = extractCatInfo(html);
  assert.deepEqual(
    Object.entries(catInfo)
      .filter(([, value]) => value.newCode.startsWith('D-'))
      .sort((left, right) => left[1].newCode.localeCompare(right[1].newCode)),
    [
      ['13', { newCode: 'D-1', name: '카리스마' }],
      ['08', { newCode: 'D-2', name: '클리어' }],
      ['17', { newCode: 'D-3', name: '샤프' }]
    ]
  );
});

test('기준 v16이 달라지면 불완전한 v17을 쓰기 전에 중단한다', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miyu-v17-source-'));
  fs.mkdirSync(path.join(tempRoot, 'source'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'source', '미유_무드분류_12type_v16.html'), '<html></html>');
  assert.throws(
    () => buildV17({ rootDir: tempRoot, outputPath: path.join(tempRoot, 'dist', 'v17.html') }),
    /Unexpected v16 source hash/
  );
  assert.equal(fs.existsSync(path.join(tempRoot, 'dist', 'v17.html')), false);
});
```

- [ ] **Step 2: 테스트가 조립기 부재로 실패하는지 확인**

Run:

```bash
node --test tests/build-v17.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND`로 FAIL.

- [ ] **Step 3: 입력 마커를 검증하는 조립기 작성**

`scripts/build-v17.mjs`는 다음 원칙으로 구현한다.

```javascript
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

export function buildV17({ rootDir, outputPath }) {
  const sourcePath = path.join(rootDir, 'source', '미유_무드분류_12type_v16.html');
  const sourceBuffer = fs.readFileSync(sourcePath);
  const sourceHash = sha256Buffer(sourceBuffer);
  if (sourceHash !== EXPECTED_SOURCE_HASH) {
    throw new Error(`Unexpected v16 source hash: ${sourceHash}`);
  }

  let html = sourceBuffer.toString('utf8');
  const css = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis.css'), 'utf8');
  const core = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis-core.js'), 'utf8');
  const ui = fs.readFileSync(path.join(rootDir, 'src', 'diagnosis-ui.js'), 'utf8');

  const assets = { logo: dataUri(path.join(rootDir, 'assets', '로고.png')) };
  for (const folder of ['questions', 'types']) {
    const folderPath = path.join(rootDir, 'assets', 'diagnosis', folder);
    for (const filename of fs.readdirSync(folderPath).filter(name => name.endsWith('.png')).sort()) {
      assets[`${folder}/${filename}`] = dataUri(path.join(folderPath, filename));
    }
  }
  if (Object.keys(assets).length !== 47) {
    throw new Error(`Expected logo + 46 diagnosis images, found ${Object.keys(assets).length}`);
  }

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

  html = html.replaceAll('href="#/"', 'href="#/index"');
  html = replaceOnce(
    html,
    `window.location.hash = '#/';`,
    `window.location.hash = '#/index';`,
    'unknown route fallback'
  );
  html = replaceOnce(
    html,
    `  if (parts[0] === '' || hash === '#/') {
    // Lv1 인덱스`,
    `  if (parts[0] === '' || hash === '#/' || parts[0] === 'diagnosis') {
    MiyuDiagnosisUI.renderRoute(hash);
    return;
  } else if (parts[0] === 'index') {
    // Lv1 인덱스`,
    'router diagnosis branch'
  );
  html = replaceOnce(
    html,
    `  const catsInMacro = Object.entries(CAT_INFO).filter(([oid, ci]) => ci.newCode.charAt(0) === macroCode);`,
    `  const catsInMacro = Object.entries(CAT_INFO)
    .filter(([oid, ci]) => ci.newCode.charAt(0) === macroCode)
    .sort((left, right) => left[1].newCode.localeCompare(right[1].newCode, 'en', { numeric: true }));`,
    'macro category order'
  );

  html = replaceOnce(html, '</style>', `${css}\n</style>`, 'style end');
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
  fs.writeFileSync(outputPath, html);
  return { outputPath, sourceHash, outputHash: sha256Buffer(fs.readFileSync(outputPath)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  buildV17({
    rootDir,
    outputPath: path.join(rootDir, 'dist', '미유_무드진단_12type_v17.html')
  });
}
```

주입 위치:

- `src/diagnosis.css`: 기존 마지막 `</style>` 바로 앞
- `<section id="miyu-diagnosis-app" class="page">`: `<body>` 바로 뒤
- `MIYU_DIAGNOSIS_ASSETS`, `diagnosis-core.js`, `diagnosis-ui.js`: 기존 `// 뒤로가기 버튼` 바로 앞

자산 객체의 키는 `logo`, `questions/*.png`, `types/*.png`이며 값은 조립기가 각 파일에서 읽은 완전한 `data:image/png;base64,` 문자열이다. 조립기는 로고 1개와 PDF 이미지 46개, 총 47개가 아니면 실패한다.

조립기는 `QUESTIONS`와 `TYPES`에서 참조하는 모든 이미지 경로를 수집하고, 파일이 하나라도 없으면 출력 전에 실패해야 한다.

- [ ] **Step 4: 기존 D타입 표시와 내부 순서를 안전하게 수정**

`CAT_INFO`의 마지막 3개 항목을 정확히 다음 순서로 교체한다.

```javascript
'13': { newCode: 'D-1', name: '카리스마' },
'08': { newCode: 'D-2', name: '클리어' },
'17': { newCode: 'D-3', name: '샤프' }
```

진단 UI 초기화 시 `normalizeLegacyTypeOrder()`를 한 번 실행한다.

```javascript
const orderedIds = ['01', '03', '07', '05', '06', '09', '12', '16', '18', '13', '08', '17'];
const sectionParent = document.querySelector('.category-section')?.parentElement;
orderedIds.forEach(id => {
  const section = document.querySelector(`.category-section[data-cat-id="${id}"]`);
  if (sectionParent && section) sectionParent.appendChild(section);
});
```

같은 함수에서 다음 요소를 `CAT_INFO` 기준으로 다시 표시한다.

- `.category-section[data-cat-id] .cat-code-new`
- D카드 안의 `.lv1-thumb-item`
- `.nav-menu-cat[data-cat]`

D카드와 메뉴의 DOM 순서는 13, 08, 17로 정렬한다. `CAT_AVG_IMG`의 기존 D 이미지 값은 임시 변수에 보관한 뒤 D-1←기존 D-3, D-2←기존 D-1, D-3←기존 D-2로 재배치한다.

JavaScript 객체는 `13`, `17` 같은 키를 숫자형 키로 먼저 열거할 수 있으므로 객체의 작성 순서를 화면 순서 근거로 쓰지 않는다. `renderLv2`의 `catsInMacro`는 `newCode`를 숫자 옵션으로 정렬해 B·C·D 모두 `-1`, `-2`, `-3` 순서를 보장한다.

- [ ] **Step 5: 기본 주소를 진단 시작으로, 기존 인덱스를 `#/index`로 분리**

기존 `router()`의 분기는 다음 순서가 된다.

```javascript
if (parts[0] === '' || hash === '#/' || parts[0] === 'diagnosis') {
  MiyuDiagnosisUI.renderRoute(hash);
  return;
} else if (parts[0] === 'index') {
  document.getElementById('page-lv1').style.display = 'block';
  backBtn.style.display = 'none';
  breadcrumb.innerHTML = '';
  document.title = 'MIYU 무드 분류';
} else if (parts[0] === 'macro' && parts[1]) {
  // 기존 코드 유지
}
```

기존 인덱스로 향하는 링크와 breadcrumb의 `href="#/"`는 `href="#/index"`로 바꾼다. 알 수 없는 해시는 `#/index`로 보낸다. `#/macro/*`, `#/cat/*`, `#/moodbook`은 기존 동작을 유지한다.

- [ ] **Step 6: 조립 테스트 통과 확인**

Run:

```bash
node --test tests/build-v17.test.mjs
```

Expected: 모든 테스트 PASS.

- [ ] **Step 7: 전체 자동 테스트와 실제 v17 생성**

Run:

```bash
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests/test_pdf_assets.py -v
node --test tests/diagnosis-core.test.js tests/diagnosis-ui.test.js tests/build-v17.test.mjs
node scripts/build-v17.mjs
```

Expected:

- Python 3 tests PASS
- Node 전체 테스트 PASS
- `dist/미유_무드진단_12type_v17.html` 생성
- v17 크기가 v16보다 크며 단일 파일

- [ ] **Step 8: 단일 HTML 조립 작업 커밋**

```bash
git add scripts/build-v17.mjs tests/build-v17.test.mjs dist/미유_무드진단_12type_v17.html
git commit -m "[code] 진단과 해설을 v17 단일 HTML로 통합"
```

---

### Task 5: 세로·가로 태블릿 실제 동작과 기존 기능 회귀 검증

**Files:**
- Modify if a defect is reproduced: `src/diagnosis-ui.js`
- Modify if a layout defect is reproduced: `src/diagnosis.css`
- Modify if an integration defect is reproduced: `scripts/build-v17.mjs`
- Test for every reproduced defect: corresponding `tests/*.test.*`
- Regenerate: `dist/미유_무드진단_12type_v17.html`

**Interfaces:**
- Consumes: 최종 v17
- Produces: 자동 테스트와 실제 브라우저 검증을 모두 통과한 배포 후보

- [ ] **Step 1: 로컬 서버에서 v17 열기**

Run:

```bash
python3 -m http.server 4181 --directory dist
```

Open:

```text
http://localhost:4181/미유_무드진단_12type_v17.html
```

- [ ] **Step 2: 세로 태블릿 834×1194 검증**

다음 순서로 직접 조작한다.

1. 시작 화면에서 이름 없이 시작이 차단되는지 확인
2. 이름·퍼스널컬러 입력 후 1번 이동
3. 한 답 선택, 해제, 두 답 선택, 세 번째 선택 차단 확인
4. 좌측 진행표 열기·닫기
5. 완료 문항 이동 가능, 미래 문항 이동 불가 확인
6. 이미지 확대 후 얼굴·눈·코가 잘리지 않는지 확인
7. 새로고침 후 같은 문항과 선택 복원 확인
8. 10문항 완료 후 결과 이동
9. 1·2위 라벨이 점수 숫자와 겹치지 않는지 확인
10. 12타입 전체가 PDF 순서인지 확인
11. 순위 밖 타입도 선택 가능한지 확인
12. 선택과 확정을 분리했는지 확인
13. 확정 후 정확한 해설로 이동하고 뒤로 가면 결과가 유지되는지 확인

Expected: 모든 터치 대상이 손가락으로 누르기 쉽고, 2×2 카드가 유지되며, 얼굴 이미지가 잘리지 않는다.

- [ ] **Step 3: 가로 태블릿 1194×834 검증**

세로 검증과 같은 핵심 흐름을 반복한다. 진행표는 최대 너비 안에서 왼쪽에서 열리고 질문 카드와 겹쳐 사용할 수 없는 상태가 되지 않아야 한다.

- [ ] **Step 4: 공동순위 시나리오 검증**

모든 문항에서 A+B를 선택해 A 10점, B 10점, C 0점, D 0점을 만든다.

Expected:

- A와 B는 공동 1위
- C와 D는 공동 2위
- A/B의 6개 타입은 1위 표시
- C/D의 6개 타입은 2위 표시
- 12타입 중 어느 것이든 선택 가능

- [ ] **Step 5: 기존 해설 회귀 검증**

다음 주소를 직접 열고 콘텐츠가 표시되는지 확인한다.

```text
#/index
#/macro/A
#/macro/B
#/macro/C
#/macro/D
#/cat/01
#/cat/13
#/cat/08
#/cat/17
#/moodbook
```

추가로 인물 검색, 무드북 카드 팝업, 출력 버튼을 한 번씩 실행한다.

Expected: v16의 기존 기능이 유지되고 D-1 카리스마, D-2 클리어, D-3 샤프로 표시된다.

- [ ] **Step 6: 발견된 결함마다 실패 테스트부터 추가**

결함이 있으면 먼저 다음 중 맞는 테스트 파일에 재현 테스트를 추가하고 FAIL을 확인한다.

- 점수·순위·저장: `tests/diagnosis-core.test.js`
- 화면 문자열·상태: `tests/diagnosis-ui.test.js`
- D매핑·주소·단일 파일: `tests/build-v17.test.mjs`
- PDF 이미지: `tests/test_pdf_assets.py`

그 뒤 최소 수정, 해당 테스트 PASS, 전체 테스트 PASS 순서로 고친다.

- [ ] **Step 7: 원본·산출물·Git 상태 최종 확인**

Run:

```bash
shasum -a 256 source/미유_무드분류_12type_v16.html dist/미유_무드진단_12type_v17.html
wc -c source/미유_무드분류_12type_v16.html dist/미유_무드진단_12type_v17.html
git status --short
```

Expected:

- v16 SHA-256가 Global Constraints 값과 일치
- v17 실제 경로·크기·SHA-256 출력
- 의도하지 않은 파일 없음

- [ ] **Step 8: 전체 검증 실행**

Run:

```bash
/Users/oeuvre/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest tests/test_pdf_assets.py -v
node --test tests/diagnosis-core.test.js tests/diagnosis-ui.test.js tests/build-v17.test.mjs
```

Expected: 모든 테스트 PASS, 오류·경고 없음.

- [ ] **Step 9: 최종 수정과 검증 기록 커밋**

```bash
git add src scripts tests assets/diagnosis dist/미유_무드진단_12type_v17.html
git commit -m "[code] 태블릿 진단 흐름과 기존 해설 회귀 검증"
```

- [ ] **Step 10: 마지막 커밋과 깨끗한 작업 상태 확인**

Run:

```bash
git log -5 --oneline --decorate
git status --short --branch
```

Expected: 마지막 커밋이 `[code]`이며 `git status`에 미커밋 변경이 없다.
