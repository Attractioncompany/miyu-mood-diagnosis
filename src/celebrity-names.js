(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MiyuCelebrityNames = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CELEBRITY_NAMES = Object.freeze({
    'ITZY 류진': 'ITZY · Ryujin',
    'ITZY 리아': 'ITZY · Lia',
    'ITZY 예지': 'ITZY · Yeji',
    'ITZY 유나': 'ITZY · Yuna',
    'ITZY 채령': 'ITZY · Chaeryeong',
    '가수 선미': 'Sunmi · SOLO ARTIST',
    '가수 아이유': 'IU · SOLO ARTIST',
    '가수 예나': 'YENA · SOLO ARTIST',
    '가수 전소미': 'JEON SOMI · SOLO ARTIST',
    '가수 청하': 'CHUNG HA · SOLO ARTIST',
    '가수 츄': 'CHUU · SOLO ARTIST',
    '가수 태연': 'TAEYEON · SOLO ARTIST',
    '김연아': 'Kim Yuna · FIGURE SKATER',
    '뉴진스 민지': 'NewJeans · Minji',
    '뉴진스 하니': 'NewJeans · Hanni',
    '뉴진스 해린': 'NewJeans · Haerin',
    '레드벨벳 아이린': 'Red Velvet · Irene',
    '레드벨벳 웬디': 'Red Velvet · Wendy',
    '레드벨벳 조이': 'Red Velvet · Joy',
    '르세라핌 김채원': 'LE SSERAFIM · Kim Chaewon',
    '르세라핌 사쿠라': 'LE SSERAFIM · Sakura',
    '르세라핌 카즈하': 'LE SSERAFIM · Kazuha',
    '르세라핌 허윤진': 'LE SSERAFIM · Huh Yunjin',
    '르세라핌 홍은채': 'LE SSERAFIM · Hong Eunchae',
    '마마무 솔라': 'MAMAMOO · Solar',
    '마마무 화사': 'MAMAMOO · Hwa Sa',
    '마마무 휘인': 'MAMAMOO · Whee In',
    '배우 고윤정': 'Go Younjung · ACTOR',
    '배우 공효진': 'Kong Hyo-jin · ACTOR',
    '배우 김태리': 'Kim Tae-ri · ACTOR',
    '배우 김태희': 'Kim Tae-hee · ACTOR',
    '배우 김혜수': 'Kim Hye-soo · ACTOR',
    '배우 박보영': 'Park Bo Young · ACTOR',
    '배우 송혜교': 'Song Hye-kyo · ACTOR',
    '배우 수지': 'Suzy · ACTOR',
    '배우 신세경': 'Shin Sae Kyeong · ACTOR',
    '배우 윤아': 'YoonA · ACTOR',
    '배우 이성경': 'Lee Sungkyoung · ACTOR',
    '배우 이영애': 'Lee Young-ae · ACTOR',
    '배우 임지연': 'Lim Ji Yeon · ACTOR',
    '배우 전지현': 'Jun Ji-hyun · ACTOR',
    '배우 정려원': 'Jung Ryeo Won · ACTOR',
    '배우 정은채': 'Jung Eun-chae · ACTOR',
    '배우 정채연': 'Jung Chae Yeon · ACTOR',
    '배우 정호연': 'Jung Ho Yeon · ACTOR',
    '배우 한가인': 'Han Ga In · ACTOR',
    '배우 한예슬': 'Han Ye-seul · ACTOR',
    '배우 한효주': 'Han Hyo Joo · ACTOR',
    '베이비몬스터 아현': 'BABYMONSTER · Ahyeon',
    '블랙핑크 로제': 'BLACKPINK · Rosé',
    '블랙핑크 리사': 'BLACKPINK · Lisa',
    '블랙핑크 제니': 'BLACKPINK · Jennie',
    '블랙핑크 지수': 'BLACKPINK · Jisoo',
    '빌리 츠키': 'Billlie · Tsuki',
    '스테이씨 세은': 'STAYC · Seeun',
    '스테이씨 수민': 'STAYC · Sumin',
    '스테이씨 윤': 'STAYC · Yoon',
    '아이들 미연': 'i-dle · Miyeon',
    '아이들 민니': 'i-dle · Minnie',
    '아이들 소연': 'i-dle · Soyeon',
    '아이들 슈화': 'i-dle · Shuhua',
    '아이들 우기': 'i-dle · Yuqi',
    '아이브 가을': 'IVE · Gaeul',
    '아이브 레이': 'IVE · Rei',
    '아이브 리즈': 'IVE · Liz',
    '아이브 안유진': 'IVE · An Yujin',
    '아이브 이서': 'IVE · Leeseo',
    '아이브 장원영': 'IVE · Jang Wonyoung',
    '아일릿 모카': 'ILLIT · Moka',
    '아일릿 민주': 'ILLIT · Minju',
    '아일릿 원희': 'ILLIT · Wonhee',
    '아일릿 이로하': 'ILLIT · Iroha',
    '에스파 닝닝': 'aespa · Ningning',
    '에스파 윈터': 'aespa · Winter',
    '에스파 지젤': 'aespa · Giselle',
    '에스파 카리나': 'aespa · Karina',
    '엔믹스 규진': 'NMIXX · Kyujin',
    '엔믹스 릴리': 'NMIXX · Lily',
    '엔믹스 배이': 'NMIXX · Bae',
    '엔믹스 설윤': 'NMIXX · Sullyoon',
    '엔믹스 지우': 'NMIXX · Jiwoo',
    '엔믹스 해원': 'NMIXX · Haewon',
    '오마이걸 아린': 'OH MY GIRL · Arin',
    '오마이걸 유아': 'OH MY GIRL · YooA',
    '케플러 김채현': 'Kep1er · Chaehyun',
    '케플러 최유진': 'Kep1er · Yujin',
    '키오라 나띠': 'KISS OF LIFE · Natty',
    '키오프 하늘': 'KISS OF LIFE · Haneul',
    '트리플에스 김유연': 'tripleS · Kim YooYeon',
    '트와이스 나연': 'TWICE · Nayeon',
    '트와이스 다현': 'TWICE · Dahyun',
    '트와이스 모모': 'TWICE · Momo',
    '트와이스 미나': 'TWICE · Mina',
    '트와이스 사나': 'TWICE · Sana',
    '트와이스 지효': 'TWICE · Jihyo',
    '트와이스 쯔위': 'TWICE · Tzuyu',
    '하츠투하츠 지우': 'Hearts2Hearts · Jiwoo'
  });

  function getEnglishLabel(koreanLabel) {
    const key = String(koreanLabel || '').trim();
    return Object.prototype.hasOwnProperty.call(CELEBRITY_NAMES, key)
      ? CELEBRITY_NAMES[key]
      : '';
  }

  function replaceDynamicCelebrityNames(html) {
    let replacementCount = 0;
    const result = String(html).replace(
      /const CAT_PERSONS = (\{[\s\S]*?\});/,
      (_, serializedPeople) => {
        const peopleByCategory = JSON.parse(serializedPeople);
        for (const people of Object.values(peopleByCategory)) {
          for (const person of people) {
            const englishLabel = getEnglishLabel(person.name);
            if (!englishLabel) {
              throw new Error(`Missing celebrity English label: ${String(person.name || '').trim()}`);
            }
            person.name = englishLabel;
            replacementCount += 1;
          }
        }
        if (replacementCount !== 97) {
          throw new Error(`CAT_PERSONS: expected 97 names, found ${replacementCount}`);
        }
        return `const CAT_PERSONS = ${JSON.stringify(peopleByCategory)};`;
      }
    );
    if (replacementCount === 0) throw new Error('CAT_PERSONS: expected one source block');
    return result;
  }

  function replaceCelebrityNames(html) {
    function replaceLabel(prefix, koreanLabel, suffix) {
      const englishLabel = getEnglishLabel(koreanLabel);
      if (!englishLabel) throw new Error(`Missing celebrity English label: ${koreanLabel.trim()}`);
      return `${prefix}${englishLabel}${suffix}`;
    }

    const source = String(html);
    const withDynamicNames = source.includes('const CAT_PERSONS =')
      ? replaceDynamicCelebrityNames(source)
      : source;
    return withDynamicNames
      .replace(
        /(<div class="person-name">)([^<]+)(<\/div>)/g,
        (_, prefix, label, suffix) => replaceLabel(prefix, label, suffix)
      )
      .replace(
        /(<div class="cat-representative">\s*대표 인물\s*·\s*)([^<]+)(<\/div>)/g,
        (_, prefix, label, suffix) => replaceLabel(prefix, label, suffix)
      );
  }

  return Object.freeze({
    CELEBRITY_NAMES,
    getEnglishLabel,
    replaceDynamicCelebrityNames,
    replaceCelebrityNames
  });
}));
