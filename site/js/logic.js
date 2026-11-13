// あしかわ おこめ便：ゲームのルール（画面を描く処理は main.js / drive3d.js）
// ブラウザなしの Node でも動く。tools/check.mjs が自動プレイで何百回も回す。
// 時間は advance(dt) で一定の刻み（1/60秒）ずつ進める。

export const CONFIG = {
  step: 1 / 60,
  bagColors: ['blue', 'red', 'pink', 'green'],
  // 倉庫：おみせごとの注文（色ごとの袋の数）。seed で色の組み合わせが変わる
  load: { superBags: 7, gohanBags: 5, palletSlots: 1, hintAfter: 2, timeLimit: 30 },
  lock: 0.6, // 場面が切りかわってから、この秒数は操作を受けつけない（画面の切りかわりの演出の時間）
  gate: { seconds: 2.4 }, // 台が上下し、台車が 出入りするのが 見える 長さ
  drive: {
    accel: 3.4, // おしているときの加速（m/s²）
    brake: 7.5, // はなしたときの減速（m/s²）
    react: 1.4, // 止まる線までの距離が「この秒数ぶん走る距離＋止まるのに要る距離」になったら、信号が赤になる・人が出てくる（ムリゲーにしない）
    autoStopZone: 3, // 線の手前この距離を速いまま越えると、きゅうブレーキ（先輩がとめる）
    perfectZone: 2.5, // 線の手前この距離までに止まると「ぴったり停止」（いちばん上の判定「ピタッ！」と同じ）
    stoppedSpeed: 0.35,
    // 止まった位置の点：線までの距離（m）がこれ以下なら [点, 名前]
    stopGrades: [[2.5, 100, 'ピタッ！'], [5, 60, 'いいね！'], [10, 30, 'OK'], [Infinity, 10, 'はやめ']],
    laneTime: 0.9, // 車線を変えるのにかかる秒数
    cue: 55, // 車線の合図が出る距離（m）。これに「速さ×1秒」を足した所で出る
    etcCheck: 40, // 料金所：バーの この距離（m）手前に「ゆっくり」の線。線を こえるとき 時速20キロ（＋少し）いかなら OK
    slowAnnounce: 48, // ゆっくり区間の 知らせは 線の この距離（m）手前（指を はなす 時間が じゅうぶん ある）
    slowTol: 1.4, // 線を こえるときの ゆるさ（m/s。時速 約5キロ） // 料金所：バーの この距離（m）手前で 速さを読む。時速20km以下ならバーが開く。速すぎるとバーは開かず、先輩が止める
    etcReopen: 1.0, // 止まってから バーが開くまでの秒数
    ambWindow: 4.0, // 救急車：サイレンが きこえてから この秒数の うちに 止まって ゆずる（まにあわないと 先輩が とめる）
    stopRange: 25, // 線から この距離（m）より 手前で 止まっても、線で 止まった ことには しない
    ambQuick: 2.2, // この秒数の うちに 止まれたら「すばやく ゆずった！」
    ambPass: 3.2, // 止まってから 救急車が 追いこして いくまでの 秒数
    zoneAccel: 0.4,
    softBrake: 3.2, // ゆっくり 区間で 指を はなしたときの ブレーキ（ふだんは 7.5）
    etcSoftFrom: 90, // 料金所の この距離（m）手前から ゆっくり 区間
    etcTol: 1.4, // 料金所の 判定の ゆるさ（m/s。じそく20キロ ＋ 約5キロ まで OK）
    zoneBrakeAfter: 0.9, // スクールゾーンで 赤が この秒数 つづくと、先輩が ブレーキ // スクールゾーンの中の加速（ふだんの何倍か）
    zoneOver: 0.8, // スクールゾーン：制限より これ（m/s）以上 速いと「はやすぎ」に数える（指を はなすのが少し おくれても いいように）
    zoneGrades: [[0.4, 100, 'スクールゾーン ばっちり！'], [1.5, 60, 'スクールゾーン いいね！'], [3, 30, 'スクールゾーン OK'], [Infinity, 10, 'もうすこし ゆっくり']],
  },
  // バックで搬入口に付ける（上から見た図：搬入口のかべが y=0、トラックのうしろが y）
  // ハンドルを右へ回すと、トラックのうしろは画面の右へ寄る（見たまま）。ハンドルをまっすぐにすると、トラックもまっすぐにもどる
  // ずれすぎたら先輩が止めて、少し前に出してくれる（やり直しの回数がふえると先輩がハンドルを手伝う）
  // 2けんめ（ひとりで）は本番：はじめの ずれが大きく、上から見た図に「進む先の点線」が出ない（バックモニターの線だけ）
  back: { speed: 1.4, maxTh: 0.32, thRate: 2.2, startY: 11, startX: 1.6, hardY: 12, hardX: 2.0, great: 0.15, greatTh: 0.05, ok: 0.6, stopY: 3.2, stopX: 1.0, wallX: 2.3 },
  // 点数
  points: { check: 10, bag: 10, comboStep: 5, comboMax: 30, loadTimeBonus: 6, loadTimeBase: 30, gate: 20, cones: 80, keepLeft: 50, yield: 120, stay: 60, park: 30, backGreat: 150, backOk: 80, backRetry: 30, place: 30, stamp: 20, careful: 50, onTime: 100, onTimeLate: 60, ambulance: 100 },
  legs: {
    leg1: { length: 275, goal: { type: 'goal', at: 270, wait: 0.5 }, vmax: 15, place: 'しずおか{市|し}', hazards: [
      { type: 'signal', at: 60, wait: 1.5 },
      { type: 'walker', at: 112, wait: 1.9 },
      { type: 'signal', at: 216, wait: 1.5 },
    ], pandaAt: 140, ambulanceAt: 236,
    // 小学校の前：じそく30キロ（秒速8.3m）いかで走る。指を おしたり はなしたりして 速さを たもつ
    zones: [{ type: 'school', from: 152, until: 200, limit: 8.3 }] },
    // 出発する前（止まっている間）に、なかまから連絡がくる。運転中にスマホを見ない
    leg2a: { length: 70, vmax: 13, place: 'しずおか{市|し}', hazards: [], choiceAt: 0 },
    // 高速道路：左が走行車線(0)、右が追いこし車線(1)。工事の車線規制→走行車線にもどる→合流でゆずる→もどる→渋滞の最後尾
    highway: { length: 556, goal: { type: 'etc', at: 505, slow: 5.6 }, vmax: 22, place: 'とうめい こうそくどうろ', lanes: true, hazards: [
      { type: 'jam', at: 425, wait: 1.5 }, // 料金所の ゆっくりの 線（465m）より 40m 手前で 止まる
    ], laneEvents: [
      { type: 'cones', at: 108, until: 148 },
      { type: 'keepLeft', at: 230 },
      { type: 'merge', at: 315 },
      { type: 'keepLeft', at: 390 },
    ] },
    local: { length: 249, goal: { type: 'goal', at: 244, wait: 0.5 }, vmax: 12, place: 'こくどう', hazards: [
      { type: 'signal', at: 54, wait: 1.5 },
      { type: 'walker', at: 101, wait: 1.9 },
      { type: 'jam', at: 150, wait: 2.4 },
      { type: 'signal', at: 199, wait: 1.5 },
    ] },
  },
  // 時計：遊んでいる時間（説明・道を えらぶ画面をのぞく）1秒 ＝ 1.5分。朝 7:18 から（救急車の ぶん 4分 はやめた）。スーパーは 10:00、ごはんやさんは おひるの じゅんびに まにあう 11:30 まで
  //   しめきりの 45分前までに つくと「よゆう」（100点）、しめきりまでなら「じかんどおり」（60点）、おくれたら 0点
  //   ゆっくりな子でも 半分くらいは まにあい、なれた子は「よゆう」を ねらえる（子どもによって 速さが ちがうので 2だん）
  //   仕分けの まちがい・きゅうブレーキ・バックの やりなおし・下道 などで おそくなる（あわてると 安全や 正かくさで 点が へる）
  clock: { start: 438, rate: 1.5, deadlines: { store1: 600, store2: 690 }, early: 45, legStore: { leg1: 'store1', highway: 'store2', local: 'store2' } },
  // 毎回ちがう道：遊ぶたびに、道ごとに どれか1つの ならびを えらぶ（じゃま・スクールゾーン・車線の できごとの 場所と順番）
  variants: {
    leg1: [
      { hazards: [{ type: 'signal', at: 60, wait: 1.5 }, { type: 'walker', at: 112, wait: 1.9 }, { type: 'signal', at: 216, wait: 1.5 }], zones: [{ type: 'school', from: 152, until: 200, limit: 8.3 }], pandaAt: 140 },
      { hazards: [{ type: 'car', at: 60, wait: 1.2 }, { type: 'walker', at: 164, wait: 1.9 }, { type: 'signal', at: 216, wait: 1.5 }], zones: [{ type: 'school', from: 100, until: 150, limit: 8.3 }], pandaAt: 175 },
      { hazards: [{ type: 'signal', at: 60, wait: 1.5 }, { type: 'walker', at: 112, wait: 1.9 }, { type: 'car', at: 216, wait: 1.2 }], zones: [{ type: 'school', from: 152, until: 200, limit: 8.3 }], pandaAt: 140 },
    ],
    highway: [
      // conesR：右の車線だけ 工事（左を そのまま 走るのが 正解。「合図が出たら おす」では なく、見て きめる）
      { laneEvents: [{ type: 'cones', at: 108, until: 148 }, { type: 'keepLeft', at: 200 }, { type: 'conesR', at: 250, until: 280 }, { type: 'merge', at: 345 }, { type: 'keepLeft', at: 410 }] },
      { laneEvents: [{ type: 'merge', at: 106 }, { type: 'keepLeft', at: 180 }, { type: 'conesR', at: 220, until: 250 }, { type: 'cones', at: 310, until: 350 }, { type: 'keepLeft', at: 410 }] },
    ],
    local: [
      { hazards: [{ type: 'signal', at: 54, wait: 1.5 }, { type: 'walker', at: 101, wait: 1.9 }, { type: 'jam', at: 150, wait: 2.4 }, { type: 'signal', at: 199, wait: 1.5 }] },
      { hazards: [{ type: 'jam', at: 54, wait: 2.4 }, { type: 'signal', at: 101, wait: 1.5 }, { type: 'walker', at: 150, wait: 1.9 }, { type: 'signal', at: 199, wait: 1.5 }] },
    ],
  },
  stores: {
    store1: { name: 'スーパー', town: 'しずおか{市|し}', spots: ['front', 'back', 'road'], areas: ['rice', 'cold', 'box'] },
    store2: { name: 'ごはんやさん', town: 'ふじ{市|し}', spots: ['front', 'side', 'corner'], areas: ['kitchen', 'seat', 'outside'], cardSeconds: 4 },
  },
  // 星の決め方
  stars: {
    accuracy: [0, 3], // 0こ→★3、3こまで→★2、それより多い→★1
    safety: [0, 1], // 自動ブレーキ 0回→★3、1回→★2、2回以上→★1
    speed: [125, 165], // あそんでいる時間（説明の時間はのぞく）125秒以内→★3、165秒以内→★2
  },
};

// 台本（話す人：senpai 先輩 / kometa コメ太 / staff 倉庫の人 / clerk お店の人 / line なかまの連絡）
// {漢字|よみ} はふりがな
export const TALKS = {
  // 読む時間を へらす（11/13：16行→10行）。画面に説明が出る場面は、会話では くりかえさない
  intro: [
    ['senpai', 'おはよう！ きょうから きみも {芦川商運|あしかわしょううん}の ドライバーだ！ よろしくな！'],
    ['clerk', '（でんわ）スーパーです！ おこめの たなが もうすぐ からっぽなの。よろしくね！'],
    ['owner', '（でんわ）ごはんやさんだよ。おひるの おにぎりに つかうんだ。まってるよ！'],
  ],
  toLoad: [
    ['senpai', 'よし、てんけん ばっちり！ あんぜんが いちばんだ！'],
  ],
  toGate: [
    ['senpai', 'だいしゃは パワーゲートで トラックに のせるよ。'],
  ],
  leg1: [
    ['senpai', 'しゅっぱつ！ あんぜんうんてんで いこう！'],
  ],
  store1: [
    ['senpai', 'おみせごとに、とめる ばしょと おく ばしょが ちがう。この「マニュアル」を {見|み}て やってみよう！'],
  ],
  leg2: [
    ['senpai', 'すごいぞ！ つぎの ごはんやさんは、ひとりで いってみよう。'],
  ],
  store2: [
    ['kometa', 'ついた！ マニュアルカードを よく {見|み}て おぼえてね！'],
  ],
  done: [], // 「ぜんぶ とどけたよ！」は つぎの 画面に 出るので、会話は なし（パワーゲートを ゆっくりにした ぶん）
};

// ゲームの進む順番
export const FLOW = [
  { kind: 'talk', id: 'intro' },
  { kind: 'morning' },
  { kind: 'talk', id: 'toLoad' },
  { kind: 'load' },
  { kind: 'talk', id: 'toGate' },
  { kind: 'gate', dir: 'up' },
  { kind: 'talk', id: 'leg1' },
  { kind: 'drive', leg: 'leg1' },
  { kind: 'talk', id: 'store1' },
  { kind: 'deliver', store: 'store1' },
  { kind: 'talk', id: 'leg2' },
  { kind: 'drive', leg: 'leg2a' },
  { kind: 'talk', id: 'store2' },
  { kind: 'deliver', store: 'store2' },
  { kind: 'talk', id: 'done' },
  { kind: 'return' },
  { kind: 'gohan' },
  { kind: 'cert' },
];

// 事務所の画面に出る、トラックの5つの状態（会社の品質管理ページより）
export const STATUS = ['走行中', '荷下ろし中', '荷積み中', '待機', '休憩'];

export function seededRandom(seed = Date.now()) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame({ config = CONFIG, random = Math.random } = {}) {
  const C = config;
  const rnd = random;
  const s = {}; // 状態
  let bagSeq = 0;

  const emit = (type, data = {}) => s.events.push({ type, ...data });
  // 点を足す（part：load 倉庫・drive 運転・deliver 納品）
  // ありがとうの ハート（安全で 思いやりのある 運転や しごとに、まわりの人が くれる）。who：くれた人
  const heart = (n, who) => { if (n <= 0) return; s.score.hearts += n; s.score.heartLog.push(who); emit('heart', { n, who }); };
  const addPoints = (n, label, part) => {
    if (n <= 0) return;
    s.score.points += n;
    s.score.parts[part] += n;
    emit('points', { n, label, part });
  };

  function reset() {
    Object.keys(s).forEach((k) => delete s[k]);
    Object.assign(s, {
      phase: 'title', // 今の場面（FLOW の kind と同じ名前。最初は title）
      step: -1, // FLOW の何番目か
      time: 0, // 全体の時間
      playTime: 0, // 説明（talk）をのぞいた、あそんでいる時間
      status: '待機',
      lockT: 0,
      events: [],
      talk: null,
      morning: null,
      load: null,
      gate: null,
      drive: null,
      deliver: null,
      score: { mistakes: 0, autoStops: 0, legStops: {}, kidsWaited: 0, careful: [], onTime: {}, hearts: 0, heartLog: [], perfectStops: 0, reviews: 0, route: null, points: 0, combo: 0, maxCombo: 0, parts: { load: 0, drive: 0, deliver: 0 }, backs: [] },
      result: null,
      delivered: [],
      legs: makeLegs(),
    });
  }
  // この回の道（CONFIG.legs を もとに、variants から1つ えらんで 上書き）
  function makeLegs() {
    const out = {};
    for (const [id, L] of Object.entries(C.legs)) {
      const vs = (C.variants && C.variants[id]) || [];
      const k = vs.length ? Math.floor(rnd() * vs.length) : -1;
      out[id] = { ...L, ...(k >= 0 ? vs[k] : {}), variant: k, key: `${id}-${k}-${Math.floor(rnd() * 1e9)}` };
    }
    return out;
  }

  // ---------- 場面の準備 ----------
  function enter(stepIdx) {
    s.step = stepIdx;
    const f = FLOW[stepIdx];
    s.phase = f.kind;
    s.lockT = C.lock;
    emit('phase', { phase: f.kind });
    if (f.kind === 'talk') {
      if (!TALKS[f.id] || !TALKS[f.id].length) { enter(stepIdx + 1); return; } // 行の ない 会話は とばす
      s.talk = { id: f.id, lines: TALKS[f.id], i: 0 };
    } else if (f.kind === 'morning') {
      s.status = '待機';
      s.morning = { items: ['tire', 'light', 'mirror'], done: [] };
    } else if (f.kind === 'load') {
      s.status = '荷積み中';
      setupLoad();
    } else if (f.kind === 'gate') {
      s.status = f.dir === 'up' ? '荷積み中' : '荷下ろし中';
      s.gate = { dir: f.dir, progress: 0, holding: false, done: false };
    } else if (f.kind === 'drive') {
      s.status = '走行中';
      setupLeg(f.leg);
    } else if (f.kind === 'deliver') {
      s.status = '荷下ろし中';
      setupDeliver(f.store);
    } else if (f.kind === 'return') {
      s.status = '走行中';
      s.returnTrip = { ready: false, t: 0 };
    } else if (f.kind === 'gohan') {
      s.status = '休憩';
    } else if (f.kind === 'cert') {
      s.status = '休憩';
      s.result = computeResult();
      emit('finish', { result: s.result });
    }
  }

  function next() {
    if (s.step + 1 < FLOW.length) enter(s.step + 1);
  }

  // ---------- 倉庫 ----------
  function makeOrder(n, colors) {
    // n 袋を、colors の色に分ける（どの色も1袋以上）
    const order = {};
    colors.forEach((c) => { order[c] = 1; });
    for (let i = colors.length; i < n; i++) {
      const c = colors[Math.floor(rnd() * colors.length)];
      order[c] += 1;
    }
    return order;
  }

  function setupLoad() {
    const colors = shuffle(C.bagColors, rnd);
    // スーパーは3色、ごはんやさんは2色。1色は両方にまたがる（どちらに入れても正しい袋がある）
    const superColors = colors.slice(0, 3);
    const gohanColors = [colors[3], colors[0]];
    const orders = {
      super: makeOrder(C.load.superBags, superColors),
      gohan: makeOrder(C.load.gohanBags, gohanColors),
    };
    const bags = [];
    for (const cart of ['super', 'gohan']) {
      for (const [color, n] of Object.entries(orders[cart])) {
        for (let i = 0; i < n; i++) bags.push({ id: `b${++bagSeq}`, color });
      }
    }
    const queue = shuffle(bags, rnd);
    const pallet = [];
    for (let i = 0; i < C.load.palletSlots; i++) pallet.push(queue.shift() || null);
    s.load = {
      orders,
      placed: { super: {}, gohan: {} },
      queue,
      pallet,
      misses: {}, // 袋ごとのまちがいの数
      hint: null, // { bagId, cart }
      total: bags.length,
      count: 0,
      done: false,
      t: 0,
    };
  }

  function need(cart, color) {
    const L = s.load;
    return (L.orders[cart][color] || 0) - (L.placed[cart][color] || 0);
  }

  function dropBag(bagId, cart) {
    if (s.phase !== 'load' || s.load.done) return false;
    const L = s.load;
    const slot = L.pallet.findIndex((b) => b && b.id === bagId);
    if (slot < 0 || !['super', 'gohan'].includes(cart)) return false;
    const bag = L.pallet[slot];
    if (need(cart, bag.color) > 0) {
      L.placed[cart][bag.color] = (L.placed[cart][bag.color] || 0) + 1;
      L.pallet[slot] = L.queue.shift() || null;
      L.count += 1;
      if (L.hint && L.hint.bagId === bagId) L.hint = null;
      emit('good', { what: 'bag', cart, color: bag.color });
      const sc = s.score;
      sc.combo += 1;
      sc.maxCombo = Math.max(sc.maxCombo, sc.combo);
      const bonus = Math.min(C.points.comboMax, (sc.combo - 1) * C.points.comboStep);
      addPoints(C.points.bag + bonus, sc.combo >= 2 ? `${sc.combo}れんぞく！` : 'OK！', 'load');
      if (L.count >= L.total) {
        L.done = true;
        const t = Math.max(0, C.points.loadTimeBase - L.t);
        addPoints(Math.round(t * C.points.loadTimeBonus), 'はやい！', 'load');
        emit('clear', { what: 'load' });
      }
      return true;
    }
    L.misses[bagId] = (L.misses[bagId] || 0) + 1;
    s.score.mistakes += 1;
    s.score.combo = 0;
    const right = need('super', bag.color) > 0 ? 'super' : 'gohan';
    if (L.misses[bagId] >= C.load.hintAfter) L.hint = { bagId, cart: right };
    emit('miss', { what: 'bag', cart, color: bag.color });
    return false;
  }

  // ---------- パワーゲート ----------
  function gateTick(dt) {
    const G = s.gate;
    if (G.done) return;
    { // 自動で上がる（押すだけの操作は なくした）
      G.progress = Math.min(1, G.progress + dt / C.gate.seconds);
      if (G.progress >= 1) {
        G.done = true;
        addPoints(C.points.gate, 'のせた！', 'load');
        emit('clear', { what: 'gate' });
      }
    }
  }

  // ---------- 運転 ----------
  function setupLeg(legId) {
    const L = s.legs[legId];
    s.drive = {
      leg: legId,
      layoutKey: L.key,
      place: L.place,
      length: L.length,
      vmax: L.vmax,
      s: 0,
      v: 0,
      holding: false,
      hazards: [...L.hazards, ...(L.goal ? [{ ...L.goal }] : [])].map((h, i) => ({ ...h, id: `${legId}-${i}`, revealed: false, active: false, cleared: false, stopT: 0, perfect: false })),
      zones: (L.zones || []).map((z, i) => ({ ...z, id: `${legId}-z${i}`, on: false, done: false, overT: 0, over: false })),
      amb: L.ambulanceAt != null ? { at: L.ambulanceAt, state: 'wait', t: 0, ok: null, forced: false } : null,
      choiceAt: L.choiceAt ?? null,
      choosing: false,
      lanes: !!L.lanes,
      lane: 0, // 0 左（走行車線）・1 右（追いこし車線）
      laneX: 0, // 0〜1 のあいだを動く（見た目用）
      laneEvents: (L.laneEvents || []).map((e, i) => ({ ...e, id: `${legId}-L${i}`, cued: false, done: false, ok: null })),
      cue: null, // いま出ている車線の合図 { type, side }
      stopGrade: null,
      emergency: null,
      pandaAt: L.pandaAt ?? null,
      arrived: false,
      message: null,
      time: 0,
    };
  }

  function switchLeg(legId) {
    // 走っている途中で道を切りかえる（ICから先）
    const keep = s.drive;
    setupLeg(legId);
    s.drive.v = keep.v;
    s.drive.time = keep.time;
  }

  function driveTick(dt) {
    const D = s.drive;
    const K = C.drive;
    if (D.arrived) return;
    D.time += dt;
    if (D.choosing) {
      D.v = Math.max(0, D.v - K.brake * dt);
      return;
    }
    // 速さ（先輩のきゅうブレーキ中は、線の手前でちょうど止まる強さで減速する）
    if (D.emergency) {
      const rem = Math.max(0.05, D.emergency.at - 0.4 - D.s);
      const dec = Math.max(K.brake, (D.v * D.v) / (2 * rem));
      D.v = Math.max(0, D.v - dec * dt);
      if (D.v <= 0.01) D.emergency = null;
    } else if (D.amb && (D.amb.state === 'passing' || D.amb.forced && D.amb.state === 'coming')) {
      // 救急車に ゆずって 止まっている（または 先輩が 止めている）
      D.v = Math.max(0, D.v - K.brake * dt);
    } else {
      // ゆっくり区間（スクールゾーンの 中・料金所の 線の 先）は、おしていても 上限より 速く ならない（トラックの 速さ リミッター）
      const lim = slowLimit();
      if (D.holding) D.v = lim != null && D.v > lim ? Math.max(lim, D.v - K.softBrake * dt) : Math.min(lim != null ? lim : D.vmax, D.v + K.accel * (lim != null ? 0.6 : 1) * dt);
      else D.v = Math.max(0, D.v - K.brake * dt);
    }
    // 前にある、まだ終わっていない一番近い じゃま
    const h = D.hazards.find((x) => !x.cleared && x.at > D.s - 0.01);
    let limit = Infinity;
    if (h) {
      const reveal = h && h.type === 'etc' ? K.etcCheck + K.slowAnnounce : D.vmax * K.react + (D.vmax * D.vmax) / (2 * K.brake) + 6; // 料金所は ゆっくりの 線の 48m 手前から 知らせる
      if (!h.revealed && h.at - D.s <= reveal) {
        h.revealed = true;
        h.active = true;
        emit('hazard', { hazard: h.type, id: h.id });
      }
      if (h.active && h.type !== 'etc') limit = h.at; // 線を越えてはいけない
    }
    if (h && h.type === 'etc' && h.active) {
      // 料金所（ETC）：バーの手前で 速さを読む。時速20km以下ならバーが開く。速すぎると開かないので、先輩が止める
      if (!h.checked && D.s + D.v * dt >= h.at - K.etcCheck) { // ゆっくりの 線を こえた
        h.checked = true;
        h.speed = D.v;
        if (D.v <= h.slow + K.slowTol) {
          h.open = true; h.ok = true;
          addPoints(100, 'ETC ゆっくり OK！', 'drive');
          s.score.perfectStops += 1;
          emit('perfect', { id: h.id, etc: true });
          emit('etc', { ok: true, v: D.v });
        } else {
          h.ok = false; h.forced = true;
          D.emergency = { at: h.at };
          s.score.autoStops += 1;
          s.score.legStops[D.leg] = (s.score.legStops[D.leg] || 0) + 1;
          emit('etc', { ok: false, v: D.v });
          emit('autostop', { id: h.id, etc: true });
        }
      }
      if (h.checked && !h.open) {
        limit = h.at;
        if (D.v <= K.stoppedSpeed && !D.emergency) {
          h.stopT += dt;
          if (h.stopT >= K.etcReopen) { h.open = true; emit('etcOpen', { id: h.id }); }
        }
      }
      if (h.open && D.s + D.v * dt >= h.at) {
        h.active = false; h.cleared = true;
        emit('hazardClear', { id: h.id, hazard: 'etc' });
      }
    }
    zoneTick(dt);
    ambTick(dt);
    laneTick(dt);
    let ns = D.s + D.v * dt;
    if (h && h.type === 'etc' && limit < Infinity && ns > limit - 0.3) { ns = limit - 0.3; D.v = 0; }
    if (h && h.active && h.type !== 'etc') {
      // いま指をはなしても線の手前で止まれない（止まるのに要る距離が足りない）ときだけ、きゅうブレーキ（先輩がとめる）
      const need = (D.v * D.v) / (2 * K.brake);
      if (D.v > 1.0 && D.s + need > h.at - 0.2 && !h.forced) {
        D.emergency = { at: h.at };
        h.forced = true;
        s.score.autoStops += 1;
        s.score.legStops[D.leg] = (s.score.legStops[D.leg] || 0) + 1;
        emit('autostop', { id: h.id });
      }
      if (ns > limit - 0.3) {
        ns = limit - 0.3;
        D.v = 0;
      }
    }
    D.s = ns;
    // 止まって待つと、じゃまがなくなる（信号が青になる・人がわたりおわる）
    const ambHold = D.amb && (D.amb.state === 'coming' || D.amb.state === 'passing'); // 救急車に ゆずって 止まっているあいだは、線で止まった ことにしない
    // 線から とおすぎる所で 止まっても、止まった ことにしない（もうすこし まえへ）
    // 救急車に ゆずった あと、まだ 走りだしていない あいだだけ（ふだんは 早めに 止まっても「はやめ」で OK）
    if (D.afterAmb && D.v <= K.stoppedSpeed) D.ambWaitT = (D.ambWaitT || 0) + dt;
    if (D.afterAmb && (D.s - D.ambS > 0.8 || (h && h.at - D.s < 3) || D.ambWaitT > 4)) D.afterAmb = false; // 少し 進んだら（線の すぐ 手前・4秒 待ったら そのまま）ふつうに 判定（止まったまま 進めなく ならない） // 少し 進んだら（線の すぐ 手前なら そのまま）ふつうに 判定
    const tooFar = D.afterAmb && h && h.active && h.type !== 'etc'; // 救急車に ゆずって 止まった あとは、走りだすまで 線の 判定を しない
    if (tooFar && D.v <= K.stoppedSpeed && !ambHold) { h.farT = (h.farT || 0) + dt; if (h.farT > 1.5 && !h.farSaid) { h.farSaid = true; emit('tooFar', { id: h.id }); } }
    if (h && h.active && h.type !== 'etc' && !ambHold && !tooFar) {
      if (D.v <= K.stoppedSpeed) {
        if (h.stopT === 0 && !h.forced) {
          const dist = h.at - D.s;
          const g = K.stopGrades.find(([d]) => dist <= d);
          D.stopGrade = { label: g[2], pts: g[1], dist };
          if (dist <= K.perfectZone) {
            h.perfect = true;
            s.score.perfectStops += 1;
            emit('perfect', { id: h.id });
          }
          addPoints(g[1], g[2], 'drive');
        }
        h.stopT += dt;
        if (h.stopT >= h.wait) {
          h.active = false;
          h.cleared = true;
          if (h.type === 'walker' && !h.forced) { s.score.kidsWaited += 1; heart(3, 'kid'); } // 自分で止まって、子どもを わたらせてあげた
          emit('hazardClear', { id: h.id, hazard: h.type, forced: !!h.forced });
          if (h.type === 'goal') { D.arrived = true; D.v = 0; arriveClock(D.leg); emit('arrive', { leg: D.leg }); }
        }
      }
    }
    // ICの手前で、なかまからの連絡
    if (D.choiceAt != null && !D.choosing && D.s >= D.choiceAt) {
      D.choosing = true;
      D.message = 'line';
      emit('line');
    }
    if (!D.arrived && D.s >= D.length) {
      D.s = D.length;
      D.arrived = true;
      D.v = 0;
      arriveClock(D.leg);
      emit('arrive', { leg: D.leg });
    }
    s.status = D.v <= K.stoppedSpeed ? '待機' : '走行中';
  }

  // いまの時刻（分）。おみせに ついたら、まにあったか しらべる
  const clockNow = () => C.clock.start + C.clock.rate * s.playTime;
  function arriveClock(legId) {
    const store = C.clock.legStore[legId];
    if (!store || s.score.onTime[store] != null) return;
    const at = clockNow(); const dl = C.clock.deadlines[store];
    const ok = at <= dl; const early = at <= dl - C.clock.early;
    s.score.onTime[store] = ok;
    if (early) addPoints(C.points.onTime, 'よゆうで とうちゃく！', 'drive');
    else if (ok) addPoints(C.points.onTimeLate, 'じかんどおり！', 'drive');
    emit('arriveTime', { store, ok, early, at: Math.floor(at), deadline: dl });
  }

  // 救急車：うしろから サイレン。止まって ゆずると、追いこしていって「ごきょうりょく ありがとうございます」
  function ambTick(dt) {
    const D = s.drive; const K = C.drive; const a = D.amb;
    if (!a || a.state === 'done') return;
    if (a.state === 'wait') { if (D.s >= a.at) { a.state = 'coming'; a.t = 0; emit('ambulance'); } return; }
    a.t += dt;
    if (a.state === 'coming') {
      if (D.v <= K.stoppedSpeed) { a.ok = !a.forced; a.quick = a.t <= K.ambQuick; a.state = 'passing'; a.t = 0; emit('ambulancePass', { ok: a.ok }); }
      else if (!a.forced && a.t >= K.ambWindow) {
        a.forced = true;
        s.score.autoStops += 1;
        s.score.legStops[D.leg] = (s.score.legStops[D.leg] || 0) + 1;
        emit('autostop', { amb: true });
      }
    } else if (a.state === 'passing' && a.t >= K.ambPass) {
      a.state = 'done';
      if (a.ok) { addPoints(a.quick ? C.points.ambulance : C.points.ambulance / 2, a.quick ? 'すばやく ゆずった！' : 'みちを ゆずった！', 'drive'); heart(5, 'ambulance'); }
      D.afterAmb = true; D.ambS = D.s;
      emit('ambulanceDone', { ok: a.ok });
    }
  }

  // スクールゾーン：はいったら 合図。中では 制限より 速すぎた時間を数え、出たら点
  // いま 走っている ゆっくり区間の 上限（なければ null）
  function slowLimit() {
    const D = s.drive;
    const z = (D.zones || []).find((x) => x.entered && !x.done);
    if (z) return z.limit;
    const e = D.hazards.find((x) => x.type === 'etc' && x.active && x.checked && x.open);
    return e ? e.slow : null;
  }

  // スクールゾーン：線の 48m 手前で 知らせ → 入口の 線を こえるときの 速さで 1回だけ 判定 → 中は 自動で ゆっくり
  function zoneTick(dt) {
    const D = s.drive; const K = C.drive;
    for (const z of D.zones) {
      if (z.done) continue;
      if (!z.on && D.s >= z.from - K.slowAnnounce && !D.hazards.some((x) => x.active && x.type !== 'etc' && x.at < z.from)) { z.on = true; emit('zone', { id: z.id, zone: z.type, limit: z.limit }); } // 止まる 線を こえてから 知らせる
      if (!z.on) continue;
      if (!z.entered && D.s >= z.from) {
        z.entered = true;
        const over = D.v - z.limit;
        const g = over <= K.slowTol ? [100, 'スクールゾーン ばっちり！', 3] : over <= K.slowTol + 2.2 ? [60, 'スクールゾーン いいね！', 2] : [30, 'もうすこし ゆっくり', 0];
        z.overT = Math.max(0, over); z.grade = g[1];
        addPoints(g[0], g[1], 'drive');
        heart(g[2], 'school');
        if (g[0] === 100) { s.score.perfectStops += 1; emit('perfect', { id: z.id, zone: true }); }
        emit('zoneIn', { id: z.id, ok: g[0] >= 60, label: g[1] });
      }
      if (D.s >= z.until) { z.done = true; emit('zoneEnd', { id: z.id, overT: z.overT, label: z.grade }); }
    }
  }

  // 高速道路の車線の合図（工事・走行車線にもどる・合流でゆずる）
  function laneTick(dt) {
    const D = s.drive;
    const K = C.drive;
    if (!D.lanes) return;
    // 見た目の車線の位置をなめらかに動かす
    const target = D.lane;
    const step = dt / K.laneTime;
    D.laneX = D.laneX < target ? Math.min(target, D.laneX + step) : Math.max(target, D.laneX - step);
    for (const e of D.laneEvents) {
      if (e.done) continue;
      const dist = e.at - D.s;
      if (!e.cued && dist <= K.cue + D.v * 1.0) {
        e.cued = true;
        D.cue = { type: e.type, side: e.type === 'keepLeft' ? 'left' : e.type === 'conesR' ? 'stay' : 'right', id: e.id };
        emit('laneCue', { cue: e.type, id: e.id });
      }
      if (!e.cued) break;
      // 右の車線だけ 工事（conesR）：左の車線を そのまま 走るのが 正解。工事の手前で きめる
      if (e.type === 'conesR') {
        if (e.ok == null && dist <= 8) {
          D.cue = null;
          if (D.lane === 0) { e.ok = true; addPoints(C.points.stay, 'そのまま OK！ よく 見たね', 'drive'); emit('laneOk', { cue: e.type, id: e.id }); }
          else { e.ok = false; D.lane = 0; emit('laneHelp', { cue: e.type, id: e.id }); }
        }
        if (e.ok != null && D.s >= e.until) e.done = true; // 工事を ぬけてから つぎの 合図
        break;
      }
      // 合図に正しく応えたら、その場で点
      const want = e.type === 'keepLeft' ? 0 : 1;
      if (e.ok == null && D.lane === want && Math.abs(D.laneX - want) < 0.05) {
        e.ok = true;
        e.done = e.type !== 'cones' || false;
        D.cue = null;
        const pts = { cones: C.points.cones, keepLeft: C.points.keepLeft, merge: C.points.yield }[e.type];
        addPoints(pts, { cones: 'こうじを よけた！', keepLeft: 'そうこうしゃせん OK！', merge: 'ゆずった！' }[e.type], 'drive');
        if (e.type === 'merge') heart(2, 'merge');
        emit('laneOk', { cue: e.type, id: e.id });
      }
      // 間にあわなかったら先輩が車線を変える（点なし）
      if (e.ok == null && dist <= 8) {
        e.ok = false;
        D.lane = want;
        D.cue = null;
        emit('laneHelp', { cue: e.type, id: e.id });
      }
      // 工事の区間のあいだは右の車線にいる（終わったら done）
      if (e.type === 'cones') {
        if (D.s >= e.until) e.done = true;
        else if (e.ok != null && D.s >= e.at - 8) D.lane = 1;
      } else if (e.ok != null) e.done = true;
      break;
    }
  }

  function lane(dir) {
    if (s.phase !== 'drive' || !s.drive.lanes || s.drive.arrived) return false;
    const D = s.drive;
    // 工事の区間の中では左へもどれない
    const cones = D.laneEvents.find((e) => e.type === 'cones' && e.ok != null && !e.done);
    if (dir < 0 && cones && D.s >= cones.at - 8) return false;
    // 右の車線だけ 工事の 区間の中では 右へ いけない
    const conesR = D.laneEvents.find((e) => e.type === 'conesR' && D.s >= e.at - 8 && D.s < e.until);
    if (dir > 0 && conesR) return false;
    const nl = Math.max(0, Math.min(1, D.lane + (dir > 0 ? 1 : -1)));
    if (nl === D.lane) return false;
    D.lane = nl;
    emit('lane', { lane: nl });
    return true;
  }

  function choose(route) {
    if (s.phase !== 'drive' || !s.drive.choosing) return false;
    if (!['highway', 'local'].includes(route)) return false;
    s.score.route = route;
    emit('choose', { route });
    switchLeg(route);
    return true;
  }

  // ---------- 納品 ----------
  function setupDeliver(storeId) {
    const st = C.stores[storeId];
    // 正しい止める場所・置き場所。1けんめは決まり、2けんめは seed でかわる
    let spot; let area;
    if (storeId === 'store1') { spot = 'back'; area = 'rice'; } else {
      spot = st.spots[1 + Math.floor(rnd() * 2)]; // side か corner
      area = 'kitchen';
    }
    s.deliver = {
      store: storeId,
      name: st.name,
      town: st.town,
      spot,
      area,
      guided: storeId === 'store1', // 先輩が教えてくれる
      step: storeId === 'store2' ? 'card' : 'park',
      cardT: 0,
      cardSeconds: st.cardSeconds || 0,
      showCard: storeId === 'store2',
      areaOrder: shuffle(st.areas, rnd), // 置き場所の ならびは 毎回 かわる（答えが いつも 左はし に ならない）
      misses: 0,
      hint: false, // 答えは 光らせない（まちがえたときだけ 光る）
      gate: 0,
      holding: false,
      stamped: false,
      done: false,
    };
  }

  function deliverMiss() {
    const V = s.deliver;
    V.misses += 1;
    s.score.mistakes += 1;
    if (V.misses >= (V.guided ? 1 : 2)) V.hint = true; // 1けんめは 1回、2けんめは 2回 まちがえたら 答えが 光る
    emit('miss', { what: V.step });
  }

  function park(spotId) {
    const V = s.deliver;
    if (s.phase !== 'deliver' || V.step !== 'park') return false;
    if (spotId !== V.spot) { deliverMiss(); return false; }
    if (V.misses === 0) addPoints(C.points.park, 'ここだね！', 'deliver');
    startBack(V, 0);
    V.misses = 0;
    V.hint = false;
    emit('good', { what: 'park' });
    return true;
  }

  // バックで搬入口に付ける（上から見た図。トラックの頭の向き th=0 で前が +y、うしろが搬入口のほう）
  function startBack(V, tries, prev) {
    const B = C.back;
    V.step = 'back';
    const side = rnd() < 0.5 ? -1 : 1;
    const hard = !V.guided;
    const to = prev ? { x: prev.x * 0.5, y: Math.min(hard ? B.hardY : B.startY, prev.y + 4) } : { x: side * (hard ? B.hardX : B.startX), y: hard ? B.hardY : B.startY };
    V.back = { x: to.x, y: to.y, th: 0, steer: 0, holding: false, hard, tries, assist: tries >= 2 ? 1 : tries >= 1 ? 0.6 : 0, done: false, result: null };
    // やり直し：先輩が前に出してくれる動き（このあいだは操作できない）
    if (prev) V.back.pull = { t: 0, dur: 1.6, x0: prev.x, y0: prev.y, th0: prev.th, x1: to.x, y1: to.y };
    emit('backStart', { tries });
  }
  // 先輩が手伝うときの、まっすぐ入るハンドル
  const idealSteer = (b) => Math.max(-1, Math.min(1, (-b.x * 1.6 + b.th * 2.2) / (C.back.maxTh * 1.6)));

  function backTick(dt) {
    const V = s.deliver;
    const K = C.back;
    const b = V.back;
    if (!b || b.done) return;
    if (b.pull) {
      const P = b.pull; P.t += dt;
      const k = Math.min(1, P.t / P.dur); const e = k * k * (3 - 2 * k);
      b.x = P.x0 + (P.x1 - P.x0) * e; b.y = P.y0 + (P.y1 - P.y0) * e; b.th = P.th0 * (1 - e);
      if (k >= 1) b.pull = null;
      return;
    }
    let steer = b.steer;
    if (b.assist > 0) steer = steer * (1 - b.assist) + idealSteer(b) * b.assist;
    b.used = steer;
    if (!V.holding) return;
    const v = K.speed;
    // ハンドルの向きへ、トラックの向きが少しずつ変わる
    const thT = -steer * K.maxTh;
    b.th += (thT - b.th) * Math.min(1, K.thRate * dt);
    b.x -= Math.sin(b.th) * v * dt;
    b.y -= Math.cos(b.th) * v * dt;
    // ずれすぎ：先輩が止めて、少し前に出してから もう一度
    if (Math.abs(b.x) > K.wallX || (b.y < K.stopY && Math.abs(b.x) > K.stopX)) {
      emit('backRetry', { x: b.x });
      V.holding = false;
      startBack(V, b.tries + 1, b);
      return;
    }
    if (b.y <= 0.3) {
      b.y = 0.3;
      b.done = true;
      const ex = Math.abs(b.x); const et = Math.abs(b.th);
      const grade = ex <= K.great && et <= K.greatTh ? 'great' : ex <= K.ok ? 'ok' : 'meh';
      b.result = grade;
      s.score.backs.push({ grade, tries: b.tries, x: ex });
      const pts = grade === 'great' ? C.points.backGreat : grade === 'ok' ? C.points.backOk : C.points.backRetry;
      addPoints(Math.max(C.points.backRetry, pts - b.tries * 30), grade === 'great' ? 'ピタッ！ プロの うで！' : grade === 'ok' ? 'いいね！' : 'とうちゃく', 'deliver');
      emit('backDone', { grade, tries: b.tries });
      V.step = 'gate';
      V.holding = false;
    }
  }

  function steer(v) {
    if (s.phase !== 'deliver' || s.deliver.step !== 'back') return false;
    s.deliver.back.steer = Math.max(-1, Math.min(1, Number(v) || 0));
    return true;
  }

  function place(areaId) {
    const V = s.deliver;
    if (s.phase !== 'deliver' || V.step !== 'place') return false;
    if (areaId !== V.area) { deliverMiss(); return false; }
    if (V.misses === 0) addPoints(C.points.place, 'ぴったり！', 'deliver');
    V.step = 'stamp';
    V.misses = 0;
    emit('good', { what: 'place' });
    return true;
  }

  function stamp() {
    const V = s.deliver;
    if (s.phase !== 'deliver' || V.step !== 'stamp') return false;
    V.stamped = true;
    addPoints(C.points.stamp, 'ありがとう！', 'deliver');
    // きゅうブレーキなしで とどけた：おこめが ゆれずに きれいなまま
    const legs = V.store === 'store1' ? ['leg1'] : ['leg2a', 'highway', 'local'];
    V.careful = legs.every((l) => !s.score.legStops[l]);
    s.score.careful.push(V.store);
    if (!V.careful) s.score.careful.pop();
    if (V.careful) addPoints(C.points.careful, 'ていねい はいそう！', 'deliver');
    heart(2 + (V.careful ? 2 : 0) + (s.score.onTime[V.store] ? 1 : 0), V.store === 'store1' ? 'clerk' : 'owner');
    V.step = 'done';
    V.done = true;
    s.delivered.push(V.store);
    emit('stamp', { careful: V.careful });
    emit('clear', { what: 'deliver' });
    return true;
  }

  function review() {
    // 2けんめで、マニュアルカードを見なおす（少しだけ点がへる）
    const V = s.deliver;
    if (s.phase !== 'deliver' || V.done || V.step === 'card') return false;
    V.showCard = !V.showCard;
    if (V.showCard && !V.guided) s.score.reviews += 1; // 1けんめ（れんしゅう）は 何回 見ても 減点なし
    return true;
  }

  function deliverTick(dt) {
    const V = s.deliver;
    if (V.step === 'card') {
      V.cardT += dt;
      if (V.cardT >= V.cardSeconds) { V.step = 'park'; V.showCard = false; emit('cardHide'); }
    } else if (V.step === 'back') {
      backTick(dt);
    } else if (V.step === 'gate') {
      { // 自動で下りる
        V.gate = Math.min(1, V.gate + dt / C.gate.seconds);
        if (V.gate >= 1) { V.step = 'place'; V.misses = 0; V.hint = false; emit('good', { what: 'gate' }); }
      }
    }
  }

  // ---------- 結果 ----------
  function starFor(value, [a, b]) {
    if (value <= a) return 3;
    if (value <= b) return 2;
    return 1;
  }

  // 部分ごとの「ほぼ満点」の目安（理想のプレイで取れる点）。星はこの割合で決める
  const PART_MAX = { load: 595, drive: 1300, deliver: 560 }; // drive：よゆう 100×2・そのまま 60・救急車 100 をふくむ // deliver：ていねい配送 50×2 をふくむ
  function starRatio(r) { return r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1; }

  function computeResult() {
    const sc = s.score;
    const ratio = (k) => sc.parts[k] / PART_MAX[k];
    const accuracy = starRatio(ratio('load'));
    const safety = starRatio(ratio('drive'));
    const speed = starRatio(ratio('deliver'));
    const total = accuracy + safety + speed;
    const all = sc.points / (PART_MAX.load + PART_MAX.drive + PART_MAX.deliver);
    const rank = all >= 0.85 ? 'S' : all >= 0.65 ? 'A' : all >= 0.45 ? 'B' : 'C';
    const SUM = PART_MAX.load + PART_MAX.drive + PART_MAX.deliver;
    const nextTh = { C: ['B', 0.45], B: ['A', 0.65], A: ['S', 0.85] }[rank];
    const next = nextTh ? { rank: nextTh[0], need: Math.max(1, Math.ceil(nextTh[1] * SUM - sc.points)) } : null;
    const title = { S: 'カッコイイ！プロドライバー', A: 'たのもしい ドライバー', B: 'がんばった ドライバー', C: 'みならい ドライバー' }[rank];
    return { accuracy, safety, speed, total, rank, next, title, points: sc.points, parts: { ...sc.parts }, maxCombo: sc.maxCombo, mistakes: sc.mistakes, autoStops: sc.autoStops, kidsWaited: sc.kidsWaited, careful: [...sc.careful], onTime: { ...sc.onTime }, hearts: sc.hearts, heartLog: [...sc.heartLog], delivered: [...s.delivered], perfectStops: sc.perfectStops, backs: sc.backs, route: sc.route, playTime: s.playTime, time: s.time };
  }

  // ---------- 外から呼ぶ操作 ----------
  const actions = {
    start() { if (s.phase === 'title') { s.time = 0; s.playTime = 0; enter(0); } },
    restart() { reset(); actions.start(); },
    next() {
      // 説明を進める／場面の終わりの「つぎへ」
      if (s.phase === 'talk') {
        s.talk.i += 1;
        if (s.talk.i >= s.talk.lines.length) next();
        return true;
      }
      if (s.phase === 'morning' && s.morning.done.length === 3) { next(); return true; }
      if (s.phase === 'load' && s.load.done) { next(); return true; }
      if (s.phase === 'gate' && s.gate.done) { next(); return true; }
      if (s.phase === 'drive' && s.drive.arrived) {
        // leg2a は IC で highway / local に切りかわって終わる
        next();
        return true;
      }
      if (s.phase === 'deliver' && s.deliver.done) { next(); return true; }
      if (s.phase === 'return' && s.returnTrip.ready) { next(); return true; }
      if (s.phase === 'gohan') { next(); return true; }
      return false;
    },
    check(item) {
      if (s.phase !== 'morning') return false;
      const M = s.morning;
      if (!M.items.includes(item) || M.done.includes(item)) return false;
      M.done.push(item);
      emit('good', { what: 'check', item });
      addPoints(C.points.check, 'よし！', 'load');
      if (M.done.length === 3) emit('clear', { what: 'morning' });
      return true;
    },
    dropBag,
    hold(on) {
      on = !!on;
      if (s.phase === 'gate') s.gate.holding = on;
      else if (s.phase === 'drive') s.drive.holding = on;
      else if (s.phase === 'deliver') s.deliver.holding = on;
    },
    choose,
    lane,
    steer,
    park,
    place,
    stamp,
    review,
  };

  function advance(dt) {
    if (s.phase === 'title' || s.phase === 'cert') return;
    s.time += dt;
    if (s.lockT > 0) s.lockT = Math.max(0, s.lockT - dt);
    if (s.phase !== 'talk' && s.phase !== 'gohan' && !(s.phase === 'drive' && s.drive && s.drive.choosing)) s.playTime += dt; // 読むだけの画面（道を えらぶ）では 時計を とめる
    s.clock = clockNow();
    if (s.phase === 'load' && s.load && !s.load.done && s.lockT <= 0) s.load.t += dt;
    if (s.phase === 'gate') gateTick(dt);
    else if (s.phase === 'drive') driveTick(dt);
    else if (s.phase === 'deliver') deliverTick(dt);
    else if (s.phase === 'return') {
      s.returnTrip.t += dt;
      if (s.returnTrip.t >= 1.2) s.returnTrip.ready = true;
    }
  }

  // 一定の刻みで進める（遅い端末でも時間がずれない）
  let acc = 0;
  function tick(realDt) {
    acc += Math.min(realDt, 0.5);
    let n = 0;
    while (acc >= C.step && n < 60) {
      advance(C.step);
      acc -= C.step;
      n += 1;
    }
    return n;
  }

  function drainEvents() {
    const e = s.events;
    s.events = [];
    return e;
  }

  function jump(stepIdx) {
    // テスト用：その場面から始める（?scene=7 など）
    if (s.phase === 'title') actions.start();
    enter(stepIdx);
  }

  // 場面の切りかわり中は操作を受けつけない（start・restart・hold(false) はいつでも）
  const guarded = {};
  for (const [name, fn] of Object.entries(actions)) {
    guarded[name] = (...args) => {
      if (s.lockT > 0 && !['start', 'restart'].includes(name) && !(name === 'hold' && !args[0])) return false;
      return fn(...args);
    };
  }

  reset();
  return { state: s, actions: guarded, advance, tick, drainEvents, jump, need: (c, col) => (s.load ? need(c, col) : 0) };
}
