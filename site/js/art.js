// 絵の部品（すべて手描きのSVG。画像ファイルは使わない）
// 会社の色：紋章の紺・赤い輪・金の文字、社名板の黄色、作業着の紺、梱包スタッフの青いベスト

export const COL = {
  navy: '#1b264e',
  red: '#c0304a',
  gold: '#d8b84a',
  sign: '#f4c20d',
  ink: '#232838',
  uniform: '#22304a',
  vest: '#3d5fb0',
  silver: '#c9d0d8',
  orange: '#ea9900',
  cream: '#fff8ea',
};

// 米袋の色（銘柄ごとに色がちがう）。色が見分けにくい人のために、しるしも付ける
export const BAG = {
  blue: { fill: '#2f7fe0', mark: 'circle', name: 'あお' },
  red: { fill: '#e2483d', mark: 'tri', name: 'あか' },
  pink: { fill: '#ee6fb0', mark: 'heart', name: 'ピンク' },
  green: { fill: '#2eaa5c', mark: 'star', name: 'みどり' },
};

// Codex で描いた絵（site/img）。art-src/build_assets.py で作る
export const IMG = (name) => `img/${name}.webp`;
export const PRELOAD = ['title', 'warehouse', 'emblem', 'senpai', 'staff', 'clerk', 'owner', 'buddy', 'kometa_happy', 'kometa_wow', 'kometa_worry',
  'bag_blue', 'bag_red', 'bag_pink', 'bag_green', 'lay_blue', 'lay_red', 'lay_pink', 'lay_green', 'cart_empty', 'cart_full', 'pallet',
  'yard', 'rear_truck', 'lift', 'store_super', 'store_gohan', 'evening', 'table', 'truck_side',
  'area_rice', 'area_cold', 'area_box', 'area_kitchen', 'area_seat', 'area_outside'];
export function preload() {
  return Promise.all(PRELOAD.map((n) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = IMG(n); })));
}
export const emblemImg = (cls = '') => `<img class="emblem-img ${cls}" src="${IMG('emblem')}" alt="芦川商運の紋章">`;

let uid = 0;
const nid = (p) => `${p}${++uid}`;

// ---------- 紋章（公式ロゴをもとに描き直したもの） ----------
export function emblem(size = 80) {
  const top = nid('et');
  const bot = nid('eb');
  const clip = nid('ec');
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 200 200" aria-label="芦川商運の紋章">
  <defs>
    <path id="${top}" d="M 32 100 A 68 68 0 0 1 168 100"/>
    <path id="${bot}" d="M 26 100 A 74 74 0 0 0 174 100"/>
    <clipPath id="${clip}"><circle cx="100" cy="100" r="54"/></clipPath>
  </defs>
  <circle cx="100" cy="100" r="96" fill="#fff" stroke="${COL.red}" stroke-width="5"/>
  <circle cx="100" cy="100" r="58" fill="${COL.navy}" stroke="${COL.red}" stroke-width="3"/>
  <text font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="25" fill="${COL.red}" letter-spacing="3"><textPath href="#${top}" startOffset="50%" text-anchor="middle">ASHIKAWA</textPath></text>
  <text font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="25" fill="${COL.red}" letter-spacing="3"><textPath href="#${bot}" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">SHIZUOKA</textPath></text>
  <circle cx="18" cy="100" r="4" fill="${COL.red}"/><circle cx="182" cy="100" r="4" fill="${COL.red}"/>
  <g clip-path="url(#${clip})">
    <path fill="#fff" d="M 58 160 C 56 128 80 112 96 102 C 104 96 108 78 118 70 C 124 64 136 60 143 64 L 150 70 C 144 74 137 76 133 82 C 128 96 131 112 125 126 C 133 128 144 132 143 141 C 132 144 119 140 111 138 C 101 148 80 158 58 160 Z"/>
    <circle cx="131" cy="70" r="2.6" fill="${COL.navy}"/>
  </g>
  <text x="72" y="92" font-family="Georgia, serif" font-weight="700" font-size="36" fill="${COL.gold}" text-anchor="middle">S</text>
  <text x="80" y="104" font-family="Georgia, serif" font-weight="700" font-size="28" fill="${COL.gold}" text-anchor="middle">A</text>
</svg>`;
}

// 紋章を画像（Canvas）にする：3Dのトラックに貼るため
export function emblemImage(px = 256) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(emblem(px).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}`;
  });
}

// ---------- 米袋のしるし ----------
function markPath(mark, x, y, r, fill = '#fff') {
  if (mark === 'circle') return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  if (mark === 'tri') return `<path d="M ${x} ${y - r} L ${x + r} ${y + r * 0.8} L ${x - r} ${y + r * 0.8} Z" fill="${fill}"/>`;
  if (mark === 'heart') return `<path d="M ${x} ${y + r} C ${x - r * 1.6} ${y - r * 0.2} ${x - r * 0.6} ${y - r * 1.4} ${x} ${y - r * 0.4} C ${x + r * 0.6} ${y - r * 1.4} ${x + r * 1.6} ${y - r * 0.2} ${x} ${y + r} Z" fill="${fill}"/>`;
  // star
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'} ${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)} `;
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
}

// 10キロの米袋（色の帯としるし）。会社の袋ではなく、オリジナルの絵
export function bag(color) {
  return `<img class="bag-img" src="${IMG(`bag_${color}`)}" alt="${BAG[color].name}の おこめ" draggable="false">`;
}

export function bagSvg(color, w = 64) {
  const b = BAG[color];
  return `<svg class="bag" width="${w}" height="${w * 1.25}" viewBox="0 0 80 100" aria-label="${b.name}の おこめ">
  <path d="M 12 14 Q 40 4 68 14 L 72 90 Q 40 98 8 90 Z" fill="#fbfaf5" stroke="${COL.ink}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 12 14 Q 40 22 68 14" fill="none" stroke="#b9b3a3" stroke-width="2"/>
  <path d="M 10 48 Q 40 56 70 48 L 71 70 Q 40 78 9 70 Z" fill="${b.fill}"/>
  ${markPath(b.mark, 40, 61, 7)}
  <text x="40" y="38" font-size="15" font-weight="900" text-anchor="middle" fill="${COL.ink}" font-family="'Zen Kaku Gothic New', sans-serif">10kg</text>
  <text x="40" y="88" font-size="10" font-weight="700" text-anchor="middle" fill="#8a8473" font-family="'Zen Kaku Gothic New', sans-serif">おこめ</text>
</svg>`;
}

export function bagIcon(color, s = 22) {
  const b = BAG[color];
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-label="${b.name}"><rect x="2" y="2" width="20" height="20" rx="6" fill="${b.fill}"/>${markPath(b.mark, 12, 12.5, 5.5)}</svg>`;
}

// ---------- コメ太（10キロの米袋の相棒） ----------
export function kometa(mood = 'happy', w = 90) {
  const mouth = {
    happy: '<path d="M 32 66 Q 40 76 48 66" fill="#e2483d" stroke="#232838" stroke-width="2.5" stroke-linecap="round"/>',
    wow: '<ellipse cx="40" cy="69" rx="5" ry="6" fill="#e2483d" stroke="#232838" stroke-width="2.5"/>',
    worry: '<path d="M 33 71 Q 40 64 47 71" fill="none" stroke="#232838" stroke-width="3" stroke-linecap="round"/>',
  }[mood] || '';
  return `<svg class="kometa" width="${w}" height="${w * 1.2}" viewBox="0 0 80 96" aria-label="コメ太">
  <path d="M 8 50 Q 0 56 4 64" fill="none" stroke="#232838" stroke-width="4" stroke-linecap="round"/>
  <path d="M 72 50 Q 80 44 78 36" fill="none" stroke="#232838" stroke-width="4" stroke-linecap="round"/>
  <path d="M 14 12 Q 40 2 66 12 L 70 86 Q 40 94 10 86 Z" fill="#fffdf6" stroke="#232838" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M 14 12 L 20 4 L 28 11 L 36 3 L 44 11 L 52 3 L 60 11 L 66 12" fill="#fffdf6" stroke="#232838" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 12 74 Q 40 82 68 74 L 69 86 Q 40 94 11 86 Z" fill="${COL.navy}"/>
  <text x="40" y="88" font-size="9" font-weight="900" text-anchor="middle" fill="#fff" font-family="'Zen Kaku Gothic New', sans-serif">10kg</text>
  <circle cx="30" cy="50" r="5" fill="#232838"/><circle cx="50" cy="50" r="5" fill="#232838"/>
  <circle cx="31.5" cy="48.3" r="1.8" fill="#fff"/><circle cx="51.5" cy="48.3" r="1.8" fill="#fff"/>
  <ellipse cx="22" cy="60" rx="5" ry="3" fill="#ffb3b3" opacity=".8"/><ellipse cx="58" cy="60" rx="5" ry="3" fill="#ffb3b3" opacity=".8"/>
  ${mouth}
  <path d="M 34 24 q 6 -8 12 0" fill="none" stroke="#e8dcc0" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
}

// ---------- 人（顔はオリジナルの絵） ----------
function face(skin = '#ffd9b8') {
  return `<circle cx="60" cy="52" r="26" fill="${skin}" stroke="#232838" stroke-width="3"/>
  <circle cx="51" cy="54" r="3.4" fill="#232838"/><circle cx="69" cy="54" r="3.4" fill="#232838"/>
  <path d="M 52 64 Q 60 71 68 64" fill="none" stroke="#232838" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="45" cy="62" rx="4.5" ry="2.6" fill="#ffaaa0" opacity=".7"/><ellipse cx="75" cy="62" rx="4.5" ry="2.6" fill="#ffaaa0" opacity=".7"/>`;
}

// 先輩ドライバー（紺の作業着）
export function senpai(w = 96) {
  return `<svg class="person" width="${w}" height="${w * 1.25}" viewBox="0 0 120 150" aria-label="先輩ドライバー">
  <path d="M 22 150 Q 22 98 60 94 Q 98 98 98 150 Z" fill="${COL.uniform}" stroke="#232838" stroke-width="3"/>
  <path d="M 50 96 L 60 112 L 70 96" fill="#e9eef5" stroke="#232838" stroke-width="2.5"/>
  <rect x="72" y="112" width="14" height="10" rx="2" fill="#3a4a6a"/>
  <circle cx="44" cy="118" r="6" fill="#fff" stroke="${COL.red}" stroke-width="2"/>
  ${face()}
  <path d="M 33 50 Q 30 22 60 22 Q 90 22 87 50 Q 80 34 66 36 Q 50 30 33 50 Z" fill="#2a2420" stroke="#232838" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
}

// 倉庫の人（青いベスト・白い帽子）
export function staff(w = 96) {
  return `<svg class="person" width="${w}" height="${w * 1.25}" viewBox="0 0 120 150" aria-label="倉庫の人">
  <path d="M 22 150 Q 22 98 60 94 Q 98 98 98 150 Z" fill="#f2f2f2" stroke="#232838" stroke-width="3"/>
  <path d="M 30 150 L 34 104 Q 46 98 52 100 L 60 150 Z M 90 150 L 86 104 Q 74 98 68 100 L 60 150 Z" fill="${COL.vest}" stroke="#232838" stroke-width="2.5"/>
  ${face()}
  <path d="M 30 48 Q 28 18 60 18 Q 92 18 90 48 Q 60 38 30 48 Z" fill="#fff" stroke="#232838" stroke-width="3"/>
  <path d="M 34 36 q 6 -4 12 0 q 6 -4 12 0 q 6 -4 12 0 q 6 -4 12 0" fill="none" stroke="#c9ced6" stroke-width="2"/>
</svg>`;
}

// お店の人（エプロン）
export function clerk(w = 96, apron = '#2e9b62') {
  return `<svg class="person" width="${w}" height="${w * 1.25}" viewBox="0 0 120 150" aria-label="お店の人">
  <path d="M 22 150 Q 22 98 60 94 Q 98 98 98 150 Z" fill="#f6efe2" stroke="#232838" stroke-width="3"/>
  <path d="M 40 150 L 42 104 L 78 104 L 80 150 Z" fill="${apron}" stroke="#232838" stroke-width="2.5"/>
  ${face()}
  <path d="M 33 52 Q 26 20 60 20 Q 94 20 87 52 Q 84 36 60 34 Q 40 34 33 52 Z" fill="#5a3b28" stroke="#232838" stroke-width="3"/>
</svg>`;
}

// なかまのドライバー（連絡の吹き出し用の小さい顔）
export function buddy(w = 60) {
  return `<svg class="person" width="${w}" height="${w}" viewBox="20 18 80 80" aria-label="なかまのドライバー">
  <rect x="20" y="18" width="80" height="80" rx="18" fill="#06c755"/>
  ${face('#ffe0c4')}
  <path d="M 33 48 Q 32 24 60 24 Q 88 24 87 48 L 33 48 Z" fill="${COL.uniform}"/>
</svg>`;
}

const person = (name) => () => `<img class="av-img" src="${IMG(name)}" alt="" draggable="false">`;
export const AVATAR = { senpai: person('senpai'), kometa: person('kometa_happy'), staff: person('staff'), clerk: person('clerk'), owner: person('owner'), line: person('buddy') };
export const KOMETA = (mood = 'happy') => `<img class="av-img" src="${IMG(`kometa_${mood}`)}" alt="コメ太" draggable="false">`;

// ---------- トラック（横から。2Dの場面用） ----------
// 白い運転席、屋根の上の黄色い社名板、ドアの紋章、銀色の荷台
export function truckSide({ w = 360, hot = [] } = {}) {
  const em = nid('te');
  const glow = (id, cx, cy, r) => (hot.includes(id) ? `<circle class="hot" data-hot="${id}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffcf1f" stroke-width="7"/>` : '');
  return `<svg class="truck-side" width="${w}" height="${w * 0.52}" viewBox="0 0 400 210" aria-label="芦川商運のトラック">
  <defs><linearGradient id="${em}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9edf1"/><stop offset="1" stop-color="#b8c0c9"/></linearGradient></defs>
  <ellipse cx="200" cy="196" rx="190" ry="10" fill="#000" opacity=".15"/>
  <rect x="14" y="40" width="250" height="128" rx="5" fill="url(#${em}g)" stroke="#232838" stroke-width="3"/>
  ${[44, 74, 104, 134, 164, 194, 224].map((x) => `<line x1="${x}" y1="44" x2="${x}" y2="164" stroke="#9aa4ae" stroke-width="1.5"/>`).join('')}
  <rect x="10" y="166" width="380" height="12" rx="3" fill="#3a3f4a"/>
  <path d="M 272 168 L 272 70 Q 274 56 290 54 L 340 54 Q 356 56 368 84 L 384 112 Q 388 120 388 132 L 388 168 Z" fill="#fbfbfb" stroke="#232838" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 300 64 L 338 64 Q 348 66 356 86 L 366 108 L 300 108 Z" fill="#2d4566" stroke="#232838" stroke-width="2.5"/>
  <path d="M 304 68 L 318 68 L 306 100 L 304 100 Z" fill="#fff" opacity=".25"/>
  <rect x="276" y="22" width="96" height="30" rx="4" fill="${COL.sign}" stroke="#232838" stroke-width="3"/>
  <text x="324" y="45" font-size="21" font-weight="900" text-anchor="middle" fill="#111" font-family="'Zen Kaku Gothic New', sans-serif" letter-spacing="1">芦川商運</text>
  <rect x="290" y="50" width="70" height="6" fill="#ddd" stroke="#232838" stroke-width="2"/>
  <g transform="translate(300 116) scale(.2)">${emblem(200).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>
  <line x1="296" y1="112" x2="296" y2="164" stroke="#aab" stroke-width="2"/>
  <rect x="368" y="114" width="20" height="16" rx="3" fill="#fff6c8" stroke="#232838" stroke-width="2.5"/>
  <rect x="380" y="150" width="14" height="18" rx="3" fill="#cfd5dc" stroke="#232838" stroke-width="2.5"/>
  <path d="M 362 62 L 382 60 L 384 90 L 372 92" fill="#cfd5dc" stroke="#232838" stroke-width="3" stroke-linejoin="round"/>
  ${[70, 120, 330].map((x) => `<g><circle cx="${x}" cy="176" r="22" fill="#2a2d33" stroke="#111" stroke-width="3"/><circle cx="${x}" cy="176" r="10" fill="#c9cdd3"/></g>`).join('')}
  ${glow('tire', 330, 176, 30)}${glow('light', 378, 122, 18)}${glow('mirror', 378, 76, 22)}
  <text x="120" y="112" font-size="12" font-weight="700" fill="#e33" opacity=".0">.</text>
</svg>`;
}

// トラックのうしろ（パワーゲート）。progress 0〜1 でリフトの高さ
export function truckRear(progress = 0, { cart = true, dir = 'up' } = {}) {
  const liftY = dir === 'up' ? 268 - progress * 118 : 150 + progress * 118;
  return `<svg class="truck-rear" viewBox="0 0 300 330" aria-label="パワーゲート">
  <ellipse cx="150" cy="318" rx="140" ry="9" fill="#000" opacity=".15"/>
  <rect x="30" y="20" width="240" height="150" rx="6" fill="#d6dbe1" stroke="#232838" stroke-width="3"/>
  <rect x="44" y="32" width="212" height="128" rx="3" fill="#525a66"/>
  <rect x="50" y="38" width="200" height="116" fill="#9aa3ad" opacity=".55"/>
  <text x="150" y="150" font-size="13" font-weight="900" fill="#e43b3b" text-anchor="middle" font-family="'Zen Kaku Gothic New', sans-serif">リフト注意</text>
  <rect x="24" y="168" width="252" height="14" rx="3" fill="#3a3f4a"/>
  <circle cx="58" cy="200" r="22" fill="#2a2d33"/><circle cx="242" cy="200" r="22" fill="#2a2d33"/>
  <rect x="34" y="172" width="16" height="10" rx="2" fill="#e43b3b"/><rect x="250" y="172" width="16" height="10" rx="2" fill="#e43b3b"/>
  <line x1="40" y1="182" x2="40" y2="${liftY}" stroke="#7d8590" stroke-width="6"/><line x1="260" y1="182" x2="260" y2="${liftY}" stroke="#7d8590" stroke-width="6"/>
  <g transform="translate(0 ${liftY - 150})">
    ${cart ? cartSvgInner(150, 74) : ''}
    <rect x="30" y="150" width="240" height="14" rx="3" fill="#aeb6bf" stroke="#232838" stroke-width="3"/>
    <path d="M 40 157 h 220" stroke="#f4c20d" stroke-width="3" stroke-dasharray="10 8"/>
  </g>
  <rect x="0" y="300" width="300" height="30" fill="#8e9097" opacity=".35"/>
</svg>`;
}

// 6輪のカート台車（中身：ふくろ）
function cartSvgInner(cx, top, fill = ['#2f7fe0', '#e2483d', '#2eaa5c']) {
  const x = cx - 46;
  let bags = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      bags += `<rect x="${x + 6 + c * 44}" y="${top + 10 + r * 16}" width="40" height="13" rx="4" fill="#fbfaf5" stroke="#232838" stroke-width="1.5"/><rect x="${x + 6 + c * 44}" y="${top + 16 + r * 16}" width="40" height="4" fill="${fill[(r + c) % fill.length]}"/>`;
    }
  }
  return `<g>
    <rect x="${x}" y="${top}" width="92" height="74" fill="none" stroke="#8b939c" stroke-width="4"/>
    ${bags}
    <line x1="${x}" y1="${top + 74}" x2="${x + 92}" y2="${top + 74}" stroke="#8b939c" stroke-width="5"/>
  </g>`;
}

export function cart(label = '', w = 120, { fillColors } = {}) {
  return `<svg class="cart" width="${w}" height="${w * 1.2}" viewBox="0 0 120 144" aria-label="カート台車">
  <rect x="14" y="8" width="92" height="112" rx="3" fill="rgba(255,255,255,.35)" stroke="#8b939c" stroke-width="5"/>
  ${[32, 56, 80, 104].map((y) => `<line x1="14" y1="${y}" x2="106" y2="${y}" stroke="#a3abb4" stroke-width="2.5"/>`).join('')}
  <line x1="60" y1="8" x2="60" y2="120" stroke="#a3abb4" stroke-width="2"/>
  ${[24, 60, 96].map((x) => `<circle cx="${x}" cy="132" r="8" fill="#3a3f4a"/>`).join('')}
  ${label}
</svg>`;
}

// ---------- アイコン ----------
export const ICON = {
  shop: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M6 18 L10 8 H38 L42 18 Z" fill="#e2483d" stroke="#232838" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 18 q4.5 6 9 0 q4.5 6 9 0 q4.5 6 9 0 q4.5 6 9 0" fill="#fff" stroke="#232838" stroke-width="2.5"/><rect x="9" y="22" width="30" height="20" fill="#fff" stroke="#232838" stroke-width="2.5"/><rect x="20" y="30" width="8" height="12" fill="#7bc1f5" stroke="#232838" stroke-width="2"/></svg>`,
  bowl: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M14 18 q2 -6 0 -10 M24 18 q2 -6 0 -10 M34 18 q2 -6 0 -10" stroke="#9aa" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="24" rx="17" ry="6" fill="#fff" stroke="#232838" stroke-width="2.5"/><path d="M7 24 Q9 40 24 40 Q39 40 41 24 Z" fill="#c0304a" stroke="#232838" stroke-width="2.5"/></svg>`,
  rice: `<svg viewBox="0 0 48 48" width="44" height="44"><rect x="8" y="10" width="32" height="30" rx="5" fill="#fbfaf5" stroke="#232838" stroke-width="2.5"/><rect x="8" y="24" width="32" height="8" fill="#2f7fe0"/><text x="24" y="21" font-size="9" font-weight="900" text-anchor="middle" fill="#232838">こめ</text></svg>`,
  cold: `<svg viewBox="0 0 48 48" width="44" height="44"><rect x="8" y="6" width="32" height="36" rx="4" fill="#dff3ff" stroke="#232838" stroke-width="2.5"/><path d="M24 14 V34 M15 19 L33 29 M33 19 L15 29" stroke="#2f7fe0" stroke-width="3" stroke-linecap="round"/></svg>`,
  box: `<svg viewBox="0 0 48 48" width="44" height="44"><path d="M8 18 L24 10 L40 18 V36 L24 44 L8 36 Z" fill="#d9a066" stroke="#232838" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 18 L24 26 L40 18 M24 26 V44" fill="none" stroke="#232838" stroke-width="2.5"/></svg>`,
  kitchen: `<svg viewBox="0 0 48 48" width="44" height="44"><path d="M14 14 q2 -5 0 -8 M24 14 q2 -5 0 -8 M34 14 q2 -5 0 -8" stroke="#9aa" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="8" y="18" width="32" height="20" rx="5" fill="#9aa3ad" stroke="#232838" stroke-width="2.5"/><rect x="4" y="20" width="6" height="4" rx="2" fill="#232838"/><rect x="38" y="20" width="6" height="4" rx="2" fill="#232838"/><rect x="6" y="15" width="36" height="5" rx="2" fill="#c3cad2" stroke="#232838" stroke-width="2"/></svg>`,
  seat: `<svg viewBox="0 0 48 48" width="44" height="44"><rect x="6" y="16" width="36" height="6" rx="2" fill="#c98a4b" stroke="#232838" stroke-width="2.5"/><path d="M10 22 V40 M38 22 V40" stroke="#232838" stroke-width="3"/><ellipse cx="18" cy="13" rx="6" ry="3" fill="#fff" stroke="#232838" stroke-width="2"/><ellipse cx="31" cy="13" rx="5" ry="2.5" fill="#fff" stroke="#232838" stroke-width="2"/></svg>`,
  outside: `<svg viewBox="0 0 48 48" width="44" height="44"><path d="M6 24 Q24 2 42 24 Z" fill="#7bc1f5" stroke="#232838" stroke-width="2.5"/><path d="M24 24 V38 q0 4 -4 4" fill="none" stroke="#232838" stroke-width="3" stroke-linecap="round"/><path d="M10 32 l-2 5 M18 34 l-2 5 M34 32 l-2 5 M42 34 l-2 5" stroke="#2f7fe0" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  stamp: `<svg viewBox="0 0 48 48" width="40" height="40"><rect x="18" y="4" width="12" height="16" rx="5" fill="#8a5a3a" stroke="#232838" stroke-width="2.5"/><rect x="10" y="20" width="28" height="10" rx="3" fill="#c98a4b" stroke="#232838" stroke-width="2.5"/><rect x="8" y="34" width="32" height="8" rx="2" fill="#e43b3b"/></svg>`,
  star: (on = true, s = 34) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" fill="${on ? '#ffc21a' : '#e3e3e3'}" stroke="${on ? '#b07800' : '#bdbdbd'}" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  sound: (on) => `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/>${on ? '<path d="M16 8 q3 4 0 8 M18.5 5.5 q5 6.5 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 9 L22 15 M22 9 L16 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'}</svg>`,
  card: `<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="4" width="18" height="16" rx="3" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M7 9 H17 M7 13 H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

// ---------- ごはん ----------
export function gohanBowl(w = 220) {
  return `<svg class="gohan" width="${w}" height="${w * 0.9}" viewBox="0 0 220 200" aria-label="ほかほかの ごはん">
  <path class="steam" d="M70 50 q10 -16 0 -32 M110 44 q10 -16 0 -32 M150 50 q10 -16 0 -32" stroke="#c8cdd4" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M30 100 Q30 60 110 56 Q190 60 190 100 Z" fill="#fff" stroke="#232838" stroke-width="4"/>
  ${Array.from({ length: 22 }, (_, i) => `<ellipse cx="${46 + (i * 37) % 130}" cy="${70 + ((i * 13) % 26)}" rx="5" ry="3" fill="#f2efe6" transform="rotate(${(i * 47) % 180} ${46 + (i * 37) % 130} ${70 + ((i * 13) % 26)})"/>`).join('')}
  <circle cx="92" cy="82" r="5" fill="#232838"/><circle cx="128" cy="82" r="5" fill="#232838"/>
  <path d="M100 92 Q110 100 120 92" fill="none" stroke="#232838" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="80" cy="92" rx="6" ry="3.5" fill="#ffb3b3"/><ellipse cx="140" cy="92" rx="6" ry="3.5" fill="#ffb3b3"/>
  <path d="M24 100 Q28 176 110 178 Q192 176 196 100 Z" fill="${COL.navy}" stroke="#232838" stroke-width="4"/>
  <path d="M40 120 Q110 134 180 120" fill="none" stroke="${COL.gold}" stroke-width="5"/>
  <rect x="78" y="176" width="64" height="12" rx="4" fill="${COL.navy}" stroke="#232838" stroke-width="4"/>
</svg>`;
}

// ふりがな {漢字|よみ} → <ruby>
export function ruby(text) {
  return text.replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
}
