(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuExplanationCardManifest = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const languages = ['ko', 'ja', 'zh-CN', 'zh-TW'];

  function localized(ko, ja, zhCN, zhTW) {
    return { ko, ja, 'zh-CN': zhCN, 'zh-TW': zhTW };
  }

  function validateCaption(image, caption) {
    for (const language of languages) {
      if (!String(caption && caption[language] || '').trim()) {
        throw new Error('Missing ' + language + ' card caption: ' + image);
      }
    }
  }

  function card(image, source, layout, caption, cropPosition) {
    validateCaption(image, caption);
    return { image, source, layout, cropPosition: cropPosition || 'center', caption };
  }

  function indexedCards(directory, captions, source, layout) {
    return captions.map((caption, index) =>
      card(directory + '/' + (index + 1) + '.jpg', source, layout, caption)
    );
  }

  function captionFromGuide(value, index, section) {
    const fallback = section === 'hair-recommended'
      ? localized('헤어 스타일 참고 예시', 'ヘアスタイルの参考例', '发型参考示例', '髮型參考示例')
      : section === 'hair-avoid'
        ? localized('피하면 좋은 헤어 방향 예시', '避けたいヘアの参考例', '建议避免的发型示例', '建議避免的髮型示例')
        : section === 'makeup-avoid'
          ? localized('피하면 좋은 메이크업 방향 예시', '控えたいメイクの参考例', '建议避免的妆容示例', '建議避免的妝容示例')
          : localized('추천 메이크업 참고 예시', 'おすすめメイクの参考例', '推荐妆容参考示例', '推薦妝容參考示例');
    return localized(
      value && value.ko && value.ko[index] || fallback.ko,
      value && value.ja && value.ja[index] || fallback.ja,
      value && value['zh-CN'] && value['zh-CN'][index] || fallback['zh-CN'],
      value && value['zh-TW'] && value['zh-TW'][index] || fallback['zh-TW']
    );
  }

  function repeatedGuideCaptions(guide, count, section) {
    return Array.from({ length: count }, (_, index) =>
      captionFromGuide(guide, Math.min(index, Math.max(0, (guide && guide.ko || []).length - 1)), section)
    );
  }

  const TYPE_ASSET = Object.freeze({
    '판타지': 'fantasy', '프루티': 'fruity', '소다': 'soda',
    '로맨틱': 'romantic', '소프트': 'soft', '엘레강스': 'elegance',
    '빈티지': 'vintage', '세련': 'refined', '딥시크': 'deep-chic',
    '카리스마': 'charisma', '클리어': 'clear', '샤프': 'sharp'
  });

  const FASHION_CAPTIONS = Object.freeze({
    '판타지': [
      localized('화사한 색과 가벼운 실루엣 레퍼런스', '明るい色と軽やかなシルエットの参考', '明亮色彩与轻盈轮廓参考', '明亮色彩與輕盈輪廓參考'),
      localized('생기 있는 포인트를 더한 스타일 레퍼런스', '生き生きしたポイントを加えた参考', '加入活力亮点的风格参考', '加入活力亮點的風格參考'),
      localized('작고 섬세한 액세서리 활용 레퍼런스', '小さく繊細なアクセサリーの参考', '小巧精致配饰参考', '小巧精緻配飾參考')
    ],
    '프루티': [
      localized('선명한 포인트 컬러를 살린 캐주얼 룩', '鮮やかなポイントカラーを生かしたカジュアルルック', '突出鲜明点缀色的休闲造型', '突顯鮮明點綴色的休閒造型'),
      localized('간결한 아이템에 경쾌한 색을 더한 조합', 'シンプルなアイテムに軽快な色を足す組み合わせ', '在简洁单品中加入轻快色彩的搭配', '在簡潔單品中加入輕快色彩的搭配'),
      localized('작지만 발랄한 액세서리 포인트', '小さくても遊び心のあるアクセサリーポイント', '小巧但有活力的配饰重点', '小巧但有活力的配飾重點')
    ],
    '소다': [
      localized('맑고 시원한 컬러의 깨끗한 스타일', '澄んだ涼しげな色のクリーンスタイル', '清爽冷冽色彩的干净风格', '清爽冷冽色彩的乾淨風格'),
      localized('스포티한 요소를 정돈해 넣은 실루엣', 'スポーティーな要素を整えて取り入れたシルエット', '利落融入运动元素的轮廓', '俐落融入運動元素的輪廓'),
      localized('실버·투명 소재로 더하는 산뜻한 포인트', 'シルバー・透明素材で加える爽やかなポイント', '用银色与透明材质加入清爽亮点', '用銀色與透明材質加入清爽亮點')
    ],
    '로맨틱': [
      localized('부드러운 파스텔과 곡선이 만나는 룩', '柔らかなパステルと曲線を生かしたルック', '柔和粉彩与曲线结合的造型', '柔和粉彩與曲線結合的造型'),
      localized('여리게 흐르는 소재를 살린 페미닌 스타일', '繊細に流れる素材を生かしたフェミニンスタイル', '突出轻柔垂坠材质的柔美风格', '突顯輕柔垂墜材質的柔美風格'),
      localized('진주와 작은 리본의 섬세한 포인트', 'パールと小さなリボンの繊細なポイント', '珍珠与小蝴蝶结的精致亮点', '珍珠與小蝴蝶結的精緻亮點')
    ],
    '소프트': [
      localized('따뜻하고 낮은 채도의 편안한 톤온톤 룩', '温かく低彩度な心地よいトーンオントーンルック', '温暖低饱和的舒适同色系造型', '溫暖低飽和的舒適同色系造型'),
      localized('부드러운 니트와 자연스러운 곡선의 조합', '柔らかなニットと自然な曲線の組み合わせ', '柔软针织与自然曲线的搭配', '柔軟針織與自然曲線的搭配'),
      localized('작은 골드와 매트한 가죽의 차분한 마무리', '小さなゴールドとマットなレザーの穏やかな仕上げ', '小金饰与哑光皮革的沉静收尾', '小金飾與霧面皮革的沉靜收尾')
    ],
    '엘레강스': [
      localized('깊이 있는 컬러와 매끈한 소재의 우아한 룩', '深みのある色と滑らかな素材の上品なルック', '深邃色彩与顺滑材质的优雅造型', '深邃色彩與順滑材質的優雅造型'),
      localized('길고 정돈된 라인을 살린 드레스업 스타일', '長く整ったラインを生かしたドレスアップスタイル', '突出修长利落线条的正式风格', '突顯修長俐落線條的正式風格'),
      localized('작은 주얼리로 완성하는 고급스러운 균형', '小さなジュエリーで仕上げる上質なバランス', '以小巧珠宝完成高级平衡', '以小巧珠寶完成高級平衡')
    ],
    '빈티지': [
      localized('차분한 다크 톤과 질감이 있는 레이어드', '落ち着いたダークトーンと質感のあるレイヤード', '沉静深色与有纹理层搭的造型', '沉靜深色與有紋理層搭的造型'),
      localized('시간감 있는 패턴과 느슨한 실루엣', '時間を感じる柄とゆるやかなシルエット', '带有时间感的图案与宽松轮廓', '帶有時間感的圖案與寬鬆輪廓'),
      localized('앤티크 메탈과 가죽으로 더하는 무드', 'アンティークメタルとレザーで足すムード', '用复古金属与皮革增添氛围', '用復古金屬與皮革增添氛圍')
    ],
    '세련': [
      localized('낮은 대비 안에서 정돈된 테일러드 룩', '低コントラストの中で整えたテーラードルック', '低对比中利落的剪裁造型', '低對比中俐落的剪裁造型'),
      localized('절제된 컬러와 몸에 맞는 실루엣의 균형', '抑えた色と体に合うシルエットのバランス', '克制色彩与合身轮廓的平衡', '克制色彩與合身輪廓的平衡'),
      localized('작은 가죽·메탈 아이템의 조용한 포인트', '小さなレザー・メタルアイテムの控えめなポイント', '小巧皮革与金属单品的低调亮点', '小巧皮革與金屬單品的低調亮點')
    ],
    '딥시크': [
      localized('어두운 톤을 층으로 쌓은 감성적인 룩', 'ダークトーンを重ねた感性的なルック', '叠加深色调的氛围感造型', '疊加深色調的氛圍感造型'),
      localized('느슨하게 떨어지는 실루엣과 텍스처', 'ゆるく落ちるシルエットとテクスチャー', '自然垂落轮廓与纹理', '自然垂落輪廓與紋理'),
      localized('빈티지 실버로 완성하는 깊은 포인트', 'ヴィンテージシルバーで仕上げる深いポイント', '用复古银饰完成深邃亮点', '用復古銀飾完成深邃亮點')
    ],
    '카리스마': [
      localized('짙은 컬러와 강한 실루엣의 존재감 있는 룩', '濃い色と強いシルエットで存在感を出すルック', '深色与强轮廓营造存在感的造型', '深色與強輪廓營造存在感的造型'),
      localized('슬릭한 질감과 선명한 세로선을 살린 스타일', 'スリークな質感と明確な縦ラインを生かしたスタイル', '突出利落质感与清晰纵线的风格', '突顯俐落質感與清晰縱線的風格'),
      localized('작지만 대담한 메탈 액세서리 포인트', '小さくても大胆なメタルアクセサリーのポイント', '小巧但大胆的金属配饰重点', '小巧但大膽的金屬配飾重點')
    ],
    '클리어': [
      localized('깨끗한 뉴트럴과 직선이 만드는 미니멀 룩', 'クリーンなニュートラルと直線で作るミニマルルック', '干净中性色与直线构成的极简造型', '乾淨中性色與直線構成的極簡造型'),
      localized('간결한 구조와 또렷한 마감의 조합', '簡潔な構造と明確な仕上げの組み合わせ', '简洁结构与清晰收尾的搭配', '簡潔結構與清晰收尾的搭配'),
      localized('얇고 정돈된 메탈로 더하는 클린 포인트', '細く整ったメタルで加えるクリーンなポイント', '用纤细利落金属加入清爽亮点', '用纖細俐落金屬加入清爽亮點')
    ],
    '샤프': [
      localized('선명한 대비와 직선이 살아 있는 룩', '鮮明なコントラストと直線を生かしたルック', '突出鲜明对比与直线的造型', '突顯鮮明對比與直線的造型'),
      localized('기하학적인 구조와 날렵한 비율의 스타일', '幾何学的な構造とシャープな比率のスタイル', '几何结构与利落比例的风格', '幾何結構與俐落比例的風格'),
      localized('각진 메탈 액세서리로 완성하는 포인트', '角のあるメタルアクセサリーで仕上げるポイント', '用棱角金属配饰完成亮点', '用稜角金屬配飾完成亮點')
    ]
  });

  const DAILY = Object.freeze({
    female: {
      a: [
        ['가벼운 니트와 플레어 스커트', '코튼·가벼운 니트', '밝은 톤의 부드러운 A라인', '작은 펄·얇은 골드', '무거운 블랙과 과한 직선은 줄여요'],
        ['화사한 블라우스와 데님', '매끈한 블라우스·라이트 데님', '작은 플라워 또는 맑은 포인트 컬러', '작은 귀걸이·미니 백', '색 포인트는 한 가지면 충분해요'],
        ['약속 있는 날의 미디 드레스', '은은한 광택의 흐르는 소재', '허리선이 자연스럽게 드러나는 실루엣', '작은 진주·로즈 골드', '장식은 가볍게 한 곳만 더해요']
      ],
      b: [
        ['실키 블라우스와 롱스커트', '실크 느낌의 부드러운 소재', '곡선이 살아나는 롱 실루엣', '진주·작은 골드', '강한 대비보다 톤온톤이 좋아요'],
        ['차분한 니트와 슬림 팬츠', '캐시미어·매끈한 니트', '몸선을 따라 정돈되는 핏', '가느다란 체인·시계', '각진 장식과 과한 레이어는 줄여요'],
        ['우아한 원피스 셋업', '새틴·드레이프 소재', '부드러운 허리선과 미디 길이', '작은 드롭 이어링', '색은 두 가지 이내로 정리해요']
      ],
      c: [
        ['매트 셔츠와 와이드 팬츠', '린넨·매트한 코튼', '여유 있는 직선 실루엣', '빈티지 실버·가죽', '러블리한 장식은 과하지 않게 해요'],
        ['차분한 데님 레이어드', '워싱 데님·니트', '낮은 대비의 편안한 레이어', '작은 링·빈티지 백', '광택과 선명한 색을 한꺼번에 쓰지 않아요'],
        ['감성적인 다크 플로럴 룩', '잔잔한 패턴의 흐르는 소재', '길게 떨어지는 미디 실루엣', '앤티크 메탈', '패턴과 액세서리 중 하나만 강조해요']
      ],
      d: [
        ['구조적인 블레이저 룩', '탄탄한 울·매트한 수트 소재', '직선적인 숄더와 정돈된 핏', '메탈 시계·작은 이어링', '프릴과 잔장식은 덜어내요'],
        ['선명한 컬러의 미니멀 룩', '매끈한 니트·가죽 포인트', '단순하고 또렷한 라인', '기하학 메탈', '색은 강하게, 형태는 단순하게 해요'],
        ['저녁 약속의 슬릭 드레스', '새틴 또는 정돈된 크레이프', '길고 날렵한 세로 실루엣', '작은 클러치·선명한 메탈', '귀여운 디테일을 섞지 않아요']
      ]
    },
    male: {
      a: [
        ['밝은 셔츠와 가벼운 팬츠', '코튼·가벼운 니트', '깨끗한 셔츠와 여유 있는 핏', '얇은 시계·밝은 스니커즈', '무거운 올블랙은 줄여요'],
        ['생기 있는 컬러 포인트 룩', '부드러운 코튼·데님', '밝은 상의 한 가지를 살린 조합', '작은 실버·캔버스 백', '강한 색은 한 가지로 정리해요'],
        ['주말의 가벼운 재킷 룩', '가벼운 블루종·코튼', '단정하지만 답답하지 않은 실루엣', '얇은 체인·로퍼', '과한 광택과 장식은 피하세요']
      ],
      b: [
        ['매끈한 니트와 슬랙스', '파인 니트·드레이프 팬츠', '부드럽게 떨어지는 정돈된 핏', '얇은 체인·가죽 시계', '너무 각진 오버핏은 줄여요'],
        ['톤온톤 셔츠 레이어드', '매트한 셔츠·가벼운 가디건', '곡선이 부드러운 레이어', '작은 실버 링', '강한 대비보다 가까운 톤이 좋아요'],
        ['저녁 약속의 셋업', '매끈한 수트·은은한 광택', '허리선이 정돈된 슬림 실루엣', '작은 메탈 시계', '장식은 하나만 남겨요']
      ],
      c: [
        ['워싱 셔츠와 데님', '워싱 코튼·데님', '힘을 뺀 레이어드', '빈티지 가죽·실버', '너무 새것 같은 광택은 줄여요'],
        ['차분한 니트와 와이드 팬츠', '니트·매트한 울', '낮은 대비의 편안한 비율', '작은 링·캔버스', '강한 원색은 한 번에 쓰지 않아요'],
        ['텍스처가 있는 재킷 룩', '코듀로이·스웨이드 느낌', '길게 떨어지는 느슨한 실루엣', '가죽 스트랩 시계', '귀여운 그래픽은 과하지 않게 해요']
      ],
      d: [
        ['정돈된 블레이저와 슬랙스', '탄탄한 울·수트 소재', '직선적인 어깨와 날렵한 핏', '메탈 시계·로퍼', '불필요한 장식은 덜어내요'],
        ['블랙과 한 가지 포인트 컬러', '매끈한 니트·가죽', '간결하고 선명한 라인', '기하학 메탈', '색은 하나, 형태는 단순하게 해요'],
        ['저녁 약속의 모노톤 셋업', '크레이프·매트한 광택', '세로선이 또렷한 슬림 실루엣', '작은 클러치·메탈', '캐주얼한 귀여움은 섞지 않아요']
      ]
    }
  });

  function translateDaily(value, language) {
    const label = language === 'ja' ? 'スタイルのポイント：' : language === 'zh-CN' ? '造型重点：' : language === 'zh-TW' ? '造型重點：' : '';
    return label + value;
  }

  function dailyCards(context) {
    const group = String(context.group || '').toLowerCase();
    const gender = context.gender === 'male' ? 'male' : 'female';
    const looks = DAILY[gender][group];
    if (!looks) throw new Error('Missing daily outfit group: ' + gender + '.' + group);
    const directory = 'reference/' + gender + '/daily/' + group;
    return looks.map((look, index) => {
      const [name, material, design, accessory, note] = look;
      const localizedField = value => localized(value, translateDaily(value, 'ja'), translateDaily(value, 'zh-CN'), translateDaily(value, 'zh-TW'));
      return {
        image: directory + '/' + (index + 1) + '.jpg',
        source: 'generated',
        layout: 'portrait',
        name: localized('룩 ' + (index + 1) + ' · ' + name, 'LOOK ' + (index + 1) + ' · ' + name, 'LOOK ' + (index + 1) + ' · ' + name, 'LOOK ' + (index + 1) + ' · ' + name),
        material: localizedField(material),
        design: localizedField(design),
        accessory: localizedField(accessory),
        note: localizedField(note)
      };
    });
  }

  function getReferenceCards(context) {
    const gender = context.gender === 'male' ? 'male' : 'female';
    const group = String(context.group || '').toLowerCase();
    const typeAsset = TYPE_ASSET[context.typeName];
    const section = context.section;
    if (!typeAsset) throw new Error('Missing type asset: ' + context.typeName);
    if (section === 'fashion') {
      if (gender === 'male') return [];
      return indexedCards('reference/female/fashion/' + typeAsset, FASHION_CAPTIONS[context.typeName] || FASHION_CAPTIONS.default, 'ppt', 'natural');
    }
    const recommended = section === 'makeup-recommended' || section === 'hair-recommended';
    const isHair = section === 'hair-recommended' || section === 'hair-avoid';
    const count = gender === 'female' && section === 'makeup-recommended' ? 6 : 3;
    const captions = repeatedGuideCaptions(context.items, count, section);
    if (gender === 'female' && group === 'b' && section === 'hair-avoid') {
      return [
        card(
          'reference/female/semantic/hair-avoid/b/hime-cut.jpg',
          'generated',
          'portrait',
          localized('히메컷처럼 무겁고 끊기는 앞머리', '重く切れた前髪の姫カット', '厚重断层刘海的姬发式', '厚重斷層瀏海的姬髮式')
        ),
        card(
          'reference/female/semantic/hair-avoid/b/bleach.jpg',
          'generated',
          'portrait',
          localized('강한 탈색으로 생기는 거친 질감', '強いブリーチによる粗い質感', '强漂染造成的粗糙质感', '強漂染造成的粗糙質感')
        ),
        card(
          'reference/female/semantic/hair-avoid/b/shag.jpg',
          'generated',
          'portrait',
          localized('거칠고 과한 샤기 레이어', '荒く強すぎるシャギーレイヤー', '粗糙且过度的鲨鱼层次', '粗糙且過度的鯊魚層次')
        )
      ];
    }
    if (gender === 'female' && group === 'c' && section === 'hair-avoid') {
      return [
        card('reference/female/semantic/hair-avoid/c/twin-tail.jpg', 'generated', 'portrait', localized('양갈래처럼 지나치게 귀여운 스타일', 'ツインテールのように可愛すぎるスタイル', '像双马尾一样过于可爱的风格', '像雙馬尾一樣過於可愛的風格')),
        card('reference/female/semantic/hair-avoid/c/harsh-layer.jpg', 'generated', 'portrait', localized('끊기는 느낌이 강한 과한 레이어', '段差が強すぎる過剰なレイヤー', '断层感过强的过度层次', '斷層感過強的過度層次')),
        card('reference/female/semantic/hair-avoid/c/messy.jpg', 'generated', 'portrait', localized('정돈되지 않고 지저분한 질감', '整っていない雑然とした質感', '不够整齐的凌乱质感', '不夠整齊的凌亂質感'))
      ];
    }
    if (gender === 'female' && group === 'a' && section === 'hair-avoid') {
      return [
        card('reference/female/semantic/hair-avoid/a/heavy-straight.jpg', 'generated', 'portrait', localized('지나치게 무겁고 평평한 블랙 일자머리', '重く平坦すぎる黒髪ストレート', '过于厚重扁平的黑色直发', '過於厚重扁平的黑色直髮')),
        card('reference/female/semantic/hair-avoid/a/slick-back.jpg', 'generated', 'portrait', localized('강한 젖은 질감의 슬릭백', '強いウェット質感のスリックバック', '强烈湿发质感的背头', '強烈濕髮質感的背頭')),
        card('reference/female/semantic/hair-avoid/a/hime-cut.jpg', 'generated', 'portrait', localized('시크하고 무거운 히메컷', 'シックで重い姫カット', '冷峻厚重的姬发式', '冷峻厚重的姬髮式'))
      ];
    }
    if (gender === 'female' && group === 'd' && section === 'hair-avoid') {
      return [
        card('reference/female/semantic/hair-avoid/d/tight-wave.jpg', 'generated', 'portrait', localized('지나치게 풍성하고 자잘한 웨이브', 'ボリュームがありすぎる細かなウェーブ', '过于蓬松细碎的卷发', '過於蓬鬆細碎的捲髮')),
        card('reference/female/semantic/hair-avoid/d/cute-pony.jpg', 'generated', 'portrait', localized('귀여운 앞머리와 하이 포니테일', '可愛い前髪とハイポニーテール', '可爱刘海与高马尾', '可愛瀏海與高馬尾')),
        card('reference/female/semantic/hair-avoid/d/baby-hair.jpg', 'generated', 'portrait', localized('잔머리를 과하게 연출한 러블리 스타일', '後れ毛を作り込みすぎたラブリースタイル', '过度塑造碎发的甜美风格', '過度塑造碎髮的甜美風格'))
      ];
    }
    let directory;
    if (isHair) {
      directory = gender === 'female'
        ? 'reference/female/hair/' + (recommended ? 'recommended/' : 'avoid/') + group
        : 'reference/male/hair/' + (recommended ? '' : 'avoid-ppt/') + group;
    } else {
      directory = gender === 'female'
        ? 'reference/female/makeup/' + (recommended ? 'recommended/' : 'avoid/') + typeAsset
        : 'reference/male/grooming' + (recommended ? '-detail/' + context.typeCode.toLowerCase() : '/avoid/' + group);
    }
    return indexedCards(directory, captions, gender === 'female' && !isHair ? 'ppt' : 'generated', isHair ? 'natural' : 'portrait');
  }

  return Object.freeze({ getReferenceCards, getDailyOutfitCards: dailyCards });
});
