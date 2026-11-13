// あしかわ おこめ便：画面（ルールは logic.js、3Dは drive3d.js）
// URL：?ts=3（3倍速）、?seed=1（毎回同じ）、?scene=7（その場面から）、?panda=0（パンダのトラックなし）、?q=low（テスト用の軽い3D）
import { CONFIG, FLOW, STATUS, createGame, seededRandom } from './logic.js';
import * as ART from './art.js';
import { audio } from './audio.js';
import { SITE } from './config.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const TS = Math.max(0.1, Number(params.get('ts')) || 1);
const SEED = params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 1e9);
const PANDA = SITE.PANDA_TRUCK && params.get('panda') !== '0';
const LOW = params.get('q') === 'low'; // テスト用の軽い画質

const frame = $('#frame');
const sceneEl = $('#scene');
const fxEl = $('#fx');
let game = createGame({ config: CONFIG, random: seededRandom(SEED) });
let S = game.state;
let A = game.actions;
let drive = null; // 3D（読み込めなかったら null のまま。2Dだけで遊べる）

const NAMES = { senpai: 'せんぱい', kometa: 'コメ太', staff: 'そうこの スタッフ', clerk: 'スーパーの てんいんさん', owner: 'ごはんやさんの てんちょう', line: 'なかま' };
const STATUS_RUBY = { 走行中: 'そうこうちゅう', 荷下ろし中: 'におろしちゅう', 荷積み中: 'につみちゅう', 待機: 'たいき', 休憩: 'きゅうけい' };
const STATUS_CLASS = { 走行中: 's-move', 荷下ろし中: 's-unload', 荷積み中: 's-load', 待機: 's-wait', 休憩: 's-rest' };

// ---------- 画面の大きさ ----------
function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // スマホを たてに 持っているときは、横はばいっぱいに 広げる（iPhone SE の Safari のように 縦が 短くても 左右に すきまを 作らない）
  //   中の 部品の 大きさ（--u）は、縦が 短いときだけ 少し 小さくして、上下に おさまるようにする
  const portrait = vw <= vh;
  const fw = portrait ? vw : Math.min(vw, vh * 0.58);
  const u = Math.min(fw, vh * 0.56) / 100;
  document.documentElement.style.setProperty('--fw', `${fw}px`);
  document.documentElement.style.setProperty('--u', `${u}px`);
  document.documentElement.classList.toggle('short', vh / (u * 100) < 1.9); // 縦が短い画面（360×640 など）
  drive?.resize();
}
window.addEventListener('resize', layout);
layout();

// ---------- 小さな道具 ----------
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function pop(text, cls = 'good', x = 50, y = 45) {
  const el = h(`<div class="pop ${cls}" style="left:${x}%;top:${y}%">${text}</div>`);
  fxEl.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
function confetti(n = 26) {
  const cols = ['#f4c20d', '#c0304a', '#2f7fe0', '#2eaa5c', '#fff'];
  for (let i = 0; i < n; i++) {
    const el = h(`<i class="confetti" style="left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-duration:${1.4 + Math.random() * 1.4}s;animation-delay:${Math.random() * 0.3}s"></i>`);
    fxEl.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}
const BAGS_TOTAL = CONFIG.load.superBags + CONFIG.load.gohanBags; // はこんだ ふくろ（10kg）の数
const GOHAN_BOWLS = Math.floor((BAGS_TOTAL * 10000) / 68 / 100) * 100; // ごはんの はいすう（茶わん1ぱい ＝ おこめ やく68g）
// 声のつく会話の行（logic.js の TALKS の文と同じ）
const TALK_VOICE = { 'intro:0': 'v_intro', 'intro:1': 'v_call1', 'intro:2': 'v_call2', 'toLoad:0': 'v_check', 'leg1:0': 'v_go' };
// できごとで鳴らす声と、画面に出す同じ文
const VOICE_TEXT = {
  v_load: ['senpai', 'しわけひょうを よく みて、おみせごとに つんでいこう！'],
  v_loadfast: ['senpai', 'はやい！ プロの しわけだ！'],
  v_pita: ['senpai', 'ピタッと ていし！ うまいぞ！'],
  v_yield: ['senpai', 'ナイス！ ゆずりあいが、こうそくどうろの マナーだ！'],
  v_back: ['senpai', 'バックモニターを みながら、ゆっくり さがるぞ！'],
  v_backgreat: ['senpai', 'ピッタリだ！ それが プロの うでだ！'],
  v_thanks: ['clerk', 'いつも ありがとうございます！ ほんとうに たすかります！'],
  v_thanks2: ['owner', 'おっ、いい おこめだね！ いつも ありがとう！'],
  v_cool: ['senpai', 'トラックドライバーは、カッコイイだろ！'],
};
let lastPitaVoice = -1e9;
let ptsFlip = false;
let lastBagCart = null;
function speak(name, ms) {
  const d = audio.voice(name);
  const [who, text] = VOICE_TEXT[name];
  say(text, who, ms || Math.max(2400, (d || 2) * 1000 + 600));
}
let sayTimer = null;
function say(text, who = 'kometa', ms = 2600) {
  const top = S.phase === 'load' || (S.phase === 'deliver' && S.deliver && S.deliver.step === 'back');
  clearTimeout(sayTimer);
  document.querySelectorAll('.mini-kometa, .mini-say').forEach((e) => e.remove());
  const face = who === 'kometa' ? ART.KOMETA(text.includes('？') || text.includes('…') ? 'worry' : text.includes('！') && text.includes('ドキ') ? 'wow' : 'happy') : (ART.AVATAR[who] || ART.AVATAR.senpai)();
  const av = h(`<div class="mini-kometa ${who === 'kometa' ? 'k' : ''} ${top ? 'top' : ''}">${face}</div>`);
  const b = h(`<div class="mini-say ${top ? 'top' : ''}">${ART.ruby(text)}</div>`);
  frame.append(av, b);
  sayTimer = setTimeout(() => { av.remove(); b.remove(); }, ms);
}
function clearSay() { clearTimeout(sayTimer); document.querySelectorAll('.mini-kometa, .mini-say').forEach((e) => e.remove()); }
const setHold = (on) => { holding = on; A.hold(on); };
const onTap = (el, fn) => el.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('tap'); fn(e); });

// 長押しボタン（パワーゲート・運転）。押している状態は毎コマ送り直す
// （場面の切りかわり直後の0.6秒は操作を受けつけないので、1回だけ送ると押し続けても動かないことがある）
let holding = false;
function holdable(el, { onChange }) {
  const set = (on) => { el.classList.toggle('on', on); onChange(on); };
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch {} set(true); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => set(false));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// なぞって運ぶ（タップで選んで、タップで置くこともできる）
let selected = null;
function draggable(el, { ghost, targets, onDrop, onSelect }) {
  let start = null; let g = null;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  el.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    if (!g && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
      g = h(`<div class="drag-ghost">${ghost()}</div>`);
      frame.appendChild(g);
      el.style.opacity = '0.25';
    }
    if (g) {
      const r = frame.getBoundingClientRect();
      g.style.left = `${e.clientX - r.left}px`; g.style.top = `${e.clientY - r.top}px`;
      targets().forEach((t) => t.classList.toggle('target', inside(t, e)));
    }
  });
  const end = (e) => {
    if (!start) return;
    if (g) {
      const hit = targets().find((t) => inside(t, e));
      targets().forEach((t) => t.classList.remove('target'));
      g.remove(); g = null; el.style.opacity = '';
      if (hit) onDrop(hit);
    } else if (e.type === 'pointerup') onSelect();
    start = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
function inside(t, e) { const r = t.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }

// ---------- 場面 ----------
// 説明（talk）のあいだは、次の場面の絵を後ろに出しておく
function visualStep(st) {
  let idx = st.step;
  while (FLOW[idx] && FLOW[idx].kind === 'talk') idx += 1;
  return FLOW[idx] || null;
}
function visualKey(st) {
  if (st.phase === 'title') return 'title';
  const f = visualStep(st);
  if (!f) return 'none';
  if (f.kind === 'drive') return 'drive';
  if (f.kind === 'deliver') return `deliver:${f.store}`;
  return f.kind;
}

let cur = null; // { key, el, render(st), sub }
function buildScene(key) {
  sceneEl.innerHTML = '';
  selected = null;
  const builder = BUILD[key.split(':')[0]];
  cur = builder ? builder(key) : { render() {} };
  cur.key = key;
  if (cur.el) sceneEl.appendChild(cur.el);
  if (drive) drive.setMode(key === 'drive' ? 'drive' : 'off');
  if (!drive || key !== 'drive') $('#three').classList.add('off');
}

const BUILD = {
  title() { return { render() {} }; },
  none() { return { render() {} }; },

  // 朝：しゅっぱつまえの てんけん（Codex の構内の絵。点検する3か所は絵の上の位置を測った）
  morning() {
    const el = h(`<div class="sc">
      <div class="stage"><img src="${ART.IMG('yard')}" alt="" draggable="false"><div class="hot-btns"></div></div>
      <div class="panel-title">しゅっぱつまえの てんけん<small>ひかっている ところを タッチ！</small></div>
      <div class="check-list"><span data-c="tire">タイヤ</span><span data-c="light">ライト</span><span data-c="mirror">ミラー</span></div>
      <div class="bottom-bar"></div>
    </div>`);
    const pos = { tire: [58.6, 81.7], light: [74.2, 74.9], mirror: [64.5, 62.5] };
    let lastSub = '';
    return {
      el,
      render(st) {
        const done = st.morning ? st.morning.done : [];
        const active = st.phase === 'morning';
        const sub = `${active}|${done.join(',')}`;
        if (sub === lastSub) return;
        lastSub = sub;
        const hb = el.querySelector('.hot-btns');
        hb.innerHTML = '';
        for (const id of ['tire', 'light', 'mirror']) {
          const b = h(`<button class="hot-btn ${done.includes(id) ? 'done' : active ? 'glow' : ''}" data-hot="${id}" aria-label="${id}" style="left:${pos[id][0]}%;top:${pos[id][1]}%"></button>`);
          onTap(b, () => A.check(id));
          hb.appendChild(b);
        }
        el.querySelectorAll('.check-list span').forEach((s) => s.classList.toggle('done', done.includes(s.dataset.c)));
        const bar = el.querySelector('.bottom-bar');
        bar.innerHTML = '';
        if (active && done.length === 3) {
          const b = h('<button class="btn pulse" id="next-btn">OK！ そうこへ</button>');
          onTap(b, () => A.next());
          bar.appendChild(b);
        }
      },
    };
  },

  // 倉庫：おこめが 1ふくろずつ 出てくる。しわけひょうを 見て、左（スーパー）か 右（ごはんやさん）へ はじく
  load() {
    const el = h(`<div class="sc sc-warehouse">
      <div class="carts"></div>
      <div class="load-timer"><span>トラックの しゅっぱつまで</span><div class="lt-bar"><i></i></div></div>
      <div class="flick-guide"><span class="fg-l">${ICON_ARROW('left')}スーパー</span><span class="fg-r">ごはんやさん${ICON_ARROW('right')}</span></div>
      <img class="pallet-img" src="${ART.IMG('pallet')}" alt="" draggable="false">
      <div class="pallet"></div>
      <div class="nextbags"><small>つぎ</small><div class="nb"></div></div>
      <div class="bottom-bar"></div>
    </div>`);
    let lastSub = '';
    const cartEls = {};
    const carts = el.querySelector('.carts');
    for (const [id, icon, name] of [['super', ART.ICON.shop, 'スーパー'], ['gohan', ART.ICON.bowl, 'ごはんやさん']]) {
      const c = h(`<div class="cartbox" data-cart="${id}">
        <div class="cart-head">${icon}<span>${name}</span></div>
        <div class="sheet"><div class="sheet-title">しわけひょう</div><div class="rows"></div></div>
        <div class="cart-pic"><img class="cart-img" src="${ART.IMG('cart_empty')}" alt="カート台車" draggable="false"><div class="cart-stack"></div></div>
      </div>`);
      // 台車を タップ：いまの ふくろ（えらんだ ふくろ）を その台車へ
      c.addEventListener('click', () => {
        const b = S.load && S.load.pallet.find((x) => x && (!selected || x.id === selected));
        if (b && !S.load.done) { selected = null; toss(b, id); }
      });
      carts.appendChild(c);
      cartEls[id] = c;
    }
    // ふくろが 台車へ 飛んでいく（見た目だけ。判定は すぐ する）
    function toss(bag, cart, from) {
      const fr = frame.getBoundingClientRect();
      const src = from || el.querySelector(`.bagbtn[data-bag="${bag.id}"]`)?.getBoundingClientRect();
      const dst = cartEls[cart].querySelector('.cart-pic').getBoundingClientRect();
      if (src) {
        const g = h(`<div class="fly-bag">${ART.bag(bag.color)}</div>`);
        g.style.left = `${src.left - fr.left + src.width / 2}px`; g.style.top = `${src.top - fr.top + src.height / 2}px`;
        frame.appendChild(g);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          g.style.left = `${dst.left - fr.left + dst.width / 2}px`; g.style.top = `${dst.top - fr.top + dst.height * 0.55}px`;
          g.classList.add('go');
        }));
        setTimeout(() => g.remove(), 330);
      }
      A.dropBag(bag.id, cart);
    }
    // 指で はじく・台車まで なぞる・タップしてから台車を タップ
    function flickable(btn, bag) {
      let st0 = null;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        st0 = { x: e.clientX, y: e.clientY, id: e.pointerId };
        try { btn.setPointerCapture(e.pointerId); } catch {}
        btn.classList.add('grab');
      });
      btn.addEventListener('pointermove', (e) => {
        if (!st0 || e.pointerId !== st0.id) return;
        const dx = e.clientX - st0.x; const dy = e.clientY - st0.y;
        btn.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.08}deg)`;
        Object.values(cartEls).forEach((t) => t.classList.toggle('target', inside(t, e)));
        el.querySelector('.fg-l').classList.toggle('on', dx < -20);
        el.querySelector('.fg-r').classList.toggle('on', dx > 20);
      });
      const end = (e) => {
        if (!st0) return;
        const dx = e.clientX - st0.x; const dy = e.clientY - st0.y;
        const from = btn.getBoundingClientRect();
        btn.style.transform = ''; btn.classList.remove('grab');
        Object.values(cartEls).forEach((t) => t.classList.remove('target'));
        el.querySelectorAll('.flick-guide .on').forEach((x) => x.classList.remove('on'));
        st0 = null;
        if (e.type !== 'pointerup') return;
        const hit = Object.entries(cartEls).find(([, t]) => inside(t, e));
        if (hit) toss(bag, hit[0], from);
        else if (Math.abs(dx) > 25) toss(bag, dx < 0 ? 'super' : 'gohan', from); // ななめ上に はじいても、左右の向きで きめる
        else if (Math.hypot(dx, dy) < 10) { audio.sfx('tap'); selected = selected === bag.id ? null : bag.id; lastSub = ''; }
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    }
    return {
      el,
      render(st) {
        const L = st.load;
        // しゅっぱつまでの 時間（へっても 失敗には ならない。のこりが ボーナスに なる）
        const left = L ? Math.max(0, 1 - L.t / CONFIG.load.timeLimit) : 1;
        const bar = el.querySelector('.lt-bar i');
        bar.style.width = `${left * 100}%`;
        bar.classList.toggle('low', left < 0.3);
        if (!L) {
          // 説明のあいだは見本を出す
          if (lastSub !== 'preview') {
            lastSub = 'preview';
            el.querySelector('.pallet').innerHTML = `<button class="bagbtn cur" disabled>${ART.bag('blue')}</button>`;
            el.querySelector('.nb').innerHTML = ['red', 'green'].map((c) => ART.bag(c)).join('');
          }
          return;
        }
        const sub = JSON.stringify([L.placed, L.pallet.map((b) => b && b.id), L.hint, selected, st.phase, L.done]);
        if (sub === lastSub) return;
        lastSub = sub;
        for (const id of ['super', 'gohan']) {
          const c = cartEls[id];
          const rows = c.querySelector('.rows');
          rows.innerHTML = Object.entries(L.orders[id]).map(([col, n]) => {
            const got = L.placed[id][col] || 0;
            return `<div class="sheet-row ${got >= n ? 'done' : ''}">${ART.bagIcon(col)}<span>× ${n - got}</span></div>`;
          }).join('');
          const stack = [];
          for (const [col, n] of Object.entries(L.placed[id])) for (let i = 0; i < n; i++) stack.push(`<img src="${ART.IMG(`lay_${col}`)}" alt="" draggable="false">`);
          c.querySelector('.cart-stack').innerHTML = stack.join('');
          c.classList.toggle('hint', !!(L.hint && L.hint.cart === id) || (!!selected && !L.done));
          const remaining = Object.entries(L.orders[id]).reduce((a, [col, n]) => a + n - (L.placed[id][col] || 0), 0);
          c.classList.toggle('full', remaining === 0);
        }
        const pal = el.querySelector('.pallet');
        pal.innerHTML = '';
        L.pallet.forEach((b) => {
          if (!b) return;
          const btn = h(`<button class="bagbtn cur ${selected === b.id ? 'sel' : ''} ${L.hint && L.hint.bagId === b.id ? 'hint' : ''}" data-bag="${b.id}" data-color="${b.color}" aria-label="${ART.BAG[b.color].name}の おこめ">${ART.bag(b.color)}</button>`);
          flickable(btn, b);
          pal.appendChild(btn);
        });
        el.querySelector('.nb').innerHTML = L.queue.slice(0, 2).map((b) => ART.bag(b.color)).join('');
        el.querySelector('.nextbags').style.visibility = L.queue.length ? '' : 'hidden';
        el.querySelector('.flick-guide').style.visibility = L.done ? 'hidden' : '';
        const bb = el.querySelector('.bottom-bar');
        bb.innerHTML = '';
        if (L.done && st.phase === 'load') {
          const nb = h('<button class="btn pulse" id="next-btn">つみおわった！</button>');
          onTap(nb, () => A.next());
          bb.appendChild(nb);
        }
      },
    };
  },

  // パワーゲートで のせる（荷台のうしろ・リフト・台車は Codex の絵の部品）
  gate() {
    const el = h(`<div class="sc sc-warehouse">
      <div class="panel-title">パワーゲートで のせるよ<small>だいしゃごと トラックの にだいへ</small></div>
      ${rigHtml()}
      <div class="bottom-bar"></div>
    </div>`);
    const rig = el.querySelector('.pgate');
    let lastDone = null;
    return {
      el,
      render(st) {
        const G = st.gate;
        const p = G ? G.progress : 0;
        audio.beep(!!(G && !G.done && st.phase === 'gate'));
        rigSet(rig, p); // 台車が 台へ → 台が 上がる → 台車が 荷台の 中へ
        const done = !!(G && G.done);
        if (done !== lastDone) {
          lastDone = done;
          rig.classList.toggle('in', done);
          const bar = el.querySelector('.bottom-bar');
          bar.innerHTML = '';
          if (done && st.phase === 'gate') {
            const nb = h('<button class="btn pulse" id="next-btn">のせた！ しゅっぱつ</button>');
            onTap(nb, () => A.next());
            bar.appendChild(nb);
          }
        }
      },
    };
  },

  // 運転（3D の上に、操作の場所と表示）
  drive() {
    const el = h(`<div class="drive-ui" id="drive-ui">
      <div class="drive-place"></div>
      <div class="alert-slot"></div>
      <div class="road-bar"><i></i><img class="me" style="left:5%" src="${ART.IMG('truck_side')}" alt="" draggable="false"><span class="goal">${ICON_FLAG}</span></div>
      <div class="meter"><span class="dist"></span><div class="needle"></div><b>km/h</b></div>
      <div class="drive-hint"><span class="finger">${ICON_FINGER}</span> おしているあいだ すすむ</div>
      <div class="stopgauge" hidden><b>せんまで</b><div class="sg-bar"><i class="z z1"></i><i class="z z2"></i><i class="z z3"></i><span class="sg-line"></span><span class="sg-me"></span></div><small>ピタッ！で 100てん</small></div>
      <div class="spdgauge" hidden><span class="sp-sign"><b>30</b></span><div class="sp-body"><div class="sp-bar"><i class="sp-ok"></i><span class="sp-me"></span></div><small class="sp-say">あかに しないで はしろう</small></div></div>
      <div class="cue" hidden></div>
      <button class="lane-btn left" id="lane-left" hidden aria-label="左の しゃせんへ">${ICON_ARROW('left')}</button>
      <button class="lane-btn right" id="lane-right" hidden aria-label="右の しゃせんへ">${ICON_ARROW('right')}</button>
      <div class="arrive-slot"></div>
      <div class="line-slot"></div>
    </div>`);
    holdable(el, { onChange: setHold });
    for (const [id, dir] of [['#lane-left', -1], ['#lane-right', 1]]) {
      const b = el.querySelector(id);
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); audio.sfx('tap'); A.lane(dir); });
    }
    // 指でなぞって車線を変える（押したまま左右に動かす）
    let swipeX = null;
    el.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
    el.addEventListener('pointermove', (e) => {
      if (swipeX == null || !S.drive || !S.drive.lanes) return;
      const dx = e.clientX - swipeX;
      if (Math.abs(dx) > 45) { A.lane(dx > 0 ? 1 : -1); swipeX = e.clientX; }
    });
    el.addEventListener('pointerup', () => { swipeX = null; });
    let lastArr = null; let lastChoose = null; let lastLeg = null; let lastCue = null;
    const alertSlot = el.querySelector('.alert-slot');
    return {
      el,
      render(st) {
        // 説明（talk）のあいだは、前の運転の「とうちゃく」などを出さない
        const D = st.phase === 'drive' ? st.drive : null;
        if (!D) {
          el.querySelector('.drive-hint').style.opacity = '0';
          if (lastArr || lastChoose) { el.querySelector('.arrive-slot').innerHTML = ''; el.querySelector('.line-slot').innerHTML = ''; lastArr = null; lastChoose = null; }
          return;
        }
        if (D.leg !== lastLeg) { lastLeg = D.leg; el.querySelector('.drive-place').innerHTML = `${ICON_PIN} ${ART.ruby(D.place)}`; }
        const prog = Math.min(1, D.s / D.length);
        el.querySelector('.road-bar i').style.width = `${prog * 100}%`;
        el.querySelector('.road-bar .me').style.left = `${Math.max(5, prog * 100)}%`;
        const kmh = Math.round(D.v * 3.6);
        el.querySelector('.needle').style.transform = `translateX(-50%) rotate(${-120 + Math.min(1, kmh / 80) * 240}deg)`;
        el.querySelector('.dist').textContent = `${kmh}`;
        const h0 = D.hazards.find((x) => x.active);
        el.querySelector('.drive-hint').style.opacity = !D.holding && !h0 && !D.arrived && !D.choosing && st.phase === 'drive' ? '1' : '0';
        // 止まる線までのメーター（線に近いほど点が高い）
        const sg = el.querySelector('.stopgauge');
        const showSg = !!(h0 && h0.type !== 'etc' && !D.arrived && !(D.amb && (D.amb.state === 'coming' || D.amb.state === 'passing')));
        sg.hidden = !showSg;
        if (showSg) {
          const dist = Math.max(0, h0.at - D.s);
          sg.querySelector('.sg-me').style.bottom = `${Math.min(100, (dist / 40) * 100)}%`;
          sg.classList.toggle('stopped', D.v < 0.4);
        }
        // 料金所：めやすの速さ
        el.querySelector('.meter').classList.toggle('etc', !!(h0 && h0.type === 'etc'));
        // 速さの上限（スクールゾーン 30キロ・料金所 20キロ）：上限の線と いまの速さ。こえたら赤
        const zn = (D.zones || []).find((z) => z.on && !z.done);
        const etcH = h0 && h0.type === 'etc' && !h0.checked ? h0 : null;
        const lim = zn ? zn.limit : etcH ? etcH.slow : null;
        const spg = el.querySelector('.spdgauge');
        spg.hidden = lim == null || D.arrived;
        if (lim != null) {
          const top = lim * 2; // ゲージの右はし
          spg.querySelector('.sp-sign b').textContent = Math.round(lim * 3.6);
          spg.querySelector('.sp-ok').style.width = `${(lim / top) * 100}%`;
          spg.querySelector('.sp-me').style.left = `${Math.min(100, (D.v / top) * 100)}%`;
          const over = zn ? D.s >= zn.from && D.v > lim + CONFIG.drive.zoneOver : D.v > lim; // ゾーンは 入ってから 赤
          spg.classList.toggle('over', over);
          spg.querySelector('.sp-say').textContent = over ? 'はやい！ ゆびを はなそう' : zn ? (D.s < zn.from ? 'もうすぐ スクールゾーン' : 'あかに しないで はしろう') : 'バーの てまえで あかに しない';
        }
        // 高速道路：車線のボタンと合図
        const lanes = !!D.lanes && !D.arrived;
        el.querySelector('#lane-left').hidden = !lanes;
        el.querySelector('#lane-right').hidden = !lanes;
        // 答え（どちらの車線か）は 見せない。両方のボタンを 光らせて「きめる とき」だけ 知らせる
        el.querySelector('#lane-left').classList.toggle('want', !!D.cue);
        el.querySelector('#lane-right').classList.toggle('want', !!D.cue);
        const cueKey = D.cue ? D.cue.id : '';
        if (cueKey !== lastCue) {
          lastCue = cueKey;
          const c = el.querySelector('.cue');
          c.hidden = !D.cue;
          if (D.cue) {
            // 何が おきたかだけ 言う。どうするかは 遊ぶ人が きめる
            const t = { cones: ['この さき こうじ中！', 'どっちの しゃせんを はしる？'], conesR: ['この さき こうじ中！', 'どっちの しゃせんを はしる？'], keepLeft: ['おいこし しゃせんを はしっているよ', 'こうそくどうろの きまりは…？'], merge: ['ひだりから 車が 合流してくる！', 'どうする？'] }[D.cue.type];
            c.innerHTML = `<b>${t[0]}</b><span>${t[1]}</span>`;
          }
        }
        audio.engine(st.phase === 'drive' && !D.arrived ? D.v / 22 : -1);
        if (alertSlot.dataset.until && performance.now() > Number(alertSlot.dataset.until)) { alertSlot.innerHTML = ''; delete alertSlot.dataset.until; }
        // 救急車：近づくほど サイレンが 大きく、通りすぎると 少し低く 遠ざかる
        const am = D.amb && (D.amb.state === 'coming' || D.amb.state === 'passing') ? D.amb : null;
        if (am) {
          const K = CONFIG.drive;
          if (am.state === 'coming') audio.siren(0.35 + 0.65 * Math.min(1, am.t / K.ambWindow), 1);
          else audio.siren(am.t < 1.3 ? 1 : Math.max(0.05, 1 - (am.t - 1.3) / 1.3), am.t < 1.3 ? 1 : 0.92);
        }
        if (am && !alertSlot.dataset.until) {
          const txt = am.state === 'coming' ? 'きゅうきゅうしゃ！ ひだりに よって とまろう' : 'きゅうきゅうしゃが とおるよ';
          if (alertSlot.textContent !== txt) alertSlot.innerHTML = `<div class="alert amb"><i class="lamp"></i>${txt}</div>`;
        } else if ((h0 || zn) && !alertSlot.dataset.until) {
          const txt = h0 ? { signal: 'しんごう！ とまろう', walker: 'ひとが わたるよ！ とまろう', car: 'まえの くるまが とまった！', jam: 'じゅうたいの さいこうび！ とまろう', goal: 'おみせの まえの せんで ぴったり とまろう', etc: h0.checked && !h0.open ? 'ETCの バーが あかない！' : 'りょうきんじょ！ 20キロ いかに' }[h0.type] : 'スクールゾーン！ 30キロ いかで';
          if (alertSlot.textContent !== txt) alertSlot.innerHTML = `<div class="alert ${zn && !h0 ? 'zone' : ''}">${txt}</div>`;
        } else if (!h0 && !zn && !am && !alertSlot.dataset.until && alertSlot.innerHTML) alertSlot.innerHTML = '';
        // とうちゃく
        if (D.arrived !== lastArr) {
          lastArr = D.arrived;
          const slot = el.querySelector('.arrive-slot');
          slot.innerHTML = '';
          if (D.arrived) {
            const b = h(`<div class="bottom-bar"><button class="btn pulse" id="next-btn">とうちゃく！ つぎへ</button></div>`);
            const nb = b.querySelector('button');
            nb.addEventListener('pointerdown', (e) => e.stopPropagation());
            onTap(nb, () => A.next());
            slot.appendChild(b);
          }
        }
        // なかまからの連絡
        if (D.choosing !== lastChoose) {
          lastChoose = D.choosing;
          const slot = el.querySelector('.line-slot');
          slot.innerHTML = '';
          if (D.choosing) {
            const box = h(`<div class="line-box">
              <div class="line-head"><img src="${ART.IMG('buddy')}" alt="" draggable="false"><span>なかまの ドライバー</span></div>
              <div class="line-msg">しゅっぱつまえに れんらくだよ。この さき、こうじで じゅうたい してるよ！ こうそくどうろが すいてるよ。</div>
              <div class="line-choices">
                <button class="btn btn-navy" id="route-highway">こうそくどうろで いく</button>
                <button class="btn btn-sub" id="route-local">このまま したみちで いく</button>
              </div></div>`);
            box.addEventListener('pointerdown', (e) => e.stopPropagation());
            onTap(box.querySelector('#route-highway'), () => A.choose('highway'));
            onTap(box.querySelector('#route-local'), () => A.choose('local'));
            slot.appendChild(box);
          }
        }
      },
      flashAlert(html, ms = 1400) { alertSlot.innerHTML = html; alertSlot.dataset.until = String(performance.now() + ms); },
    };
  },

  // 納品（お店の絵の上で、止める場所・パワーゲート・置き場所・ハンコ）
  deliver(key) {
    const store = key.split(':')[1];
    const conf = CONFIG.stores[store];
    const el = h(`<div class="sc sc-store" style="background-image:url(img/${STORE_IMG[store]}.webp)">
      <div class="dimmer"></div>
      <div class="panel-title">${store === 'store1' ? '1けんめ' : '2けんめ'}：${conf.name}<small>${ART.ruby(conf.town)}</small><span class="guide" hidden></span></div>
      <div class="dv-body"></div>
      <div class="dv-card"></div>
      <div class="bottom-bar"></div>
    </div>`);
    let lastSub = '';
    const body = el.querySelector('.dv-body');
    return {
      el,
      render(st) {
        const V = st.deliver && st.deliver.store === store ? st.deliver : null;
        const step = V ? V.step : 'preview';
        const sub = `${step}|${V ? `${V.hint}|${V.showCard}|${V.misses}` : ''}|${st.phase}|${st.talk ? st.talk.i : ''}`;
        if (V && step === 'card') el.querySelector('.mcard-timer i')?.style.setProperty('width', `${Math.max(0, 1 - V.cardT / V.cardSeconds) * 100}%`);
        if (V && step === 'back') drawBack(el, V);
        if (V && step === 'gate') {
          rigSet(el.querySelector('.pgate'), 1 - V.gate); // 積むときの 逆：台車が 出てくる → 台が 下りる → 地面へ
          audio.beep(V.gate < 1);
        }
        if (sub === lastSub) return;
        lastSub = sub;
        const card = el.querySelector('.dv-card');
        card.innerHTML = '';
        const bar = el.querySelector('.bottom-bar');
        bar.innerHTML = '';
        body.innerHTML = '';
        el.classList.toggle('dim', true); // 地図のうしろの同じ絵は、いつも白く薄める
        const guide = el.querySelector('.guide');
        const G = V && st.phase === 'deliver' ? {
          park: V.guided ? 'せんぱい：うらの「にもつ おろしば」に とめよう' : 'カードの ★の ばしょに とめよう',
          back: V.guided ? 'せんぱい：ハンドルを にぎっている あいだ さがるよ。よこに なぞって まわそう' : 'ほんばん！ てんせん なしで ぴったり つけよう',
          gate: 'パワーゲートで だいしゃを おろすよ',
          place: V.guided ? 'せんぱい：おこめは「おこめの おきば」へ！' : 'カードで みた ばしょへ はこぼう',
          stamp: 'でんぴょうに ハンコを もらおう',
          done: 'とどけたよ！',
        }[step] : '';
        guide.hidden = !G;
        guide.textContent = G || '';
        if (step === 'preview' || step === 'card') {
          body.appendChild(h(`<div class="map-wrap">${storeMap(store, {})}</div>`));
          if (step === 'card') card.appendChild(manualCard(store, V.spot, V.area, { timer: true }));
          else if (store === 'store1' && st.phase === 'talk' && st.talk && st.talk.i >= 0) card.appendChild(manualCard(store, 'back', 'rice', { timer: false }));
          return;
        }
        if (!V.guided && !V.done) {
          const rb = h(`<button class="btn btn-sub mcard-btn" id="review-btn">${ART.ICON.card} カード</button>`);
          onTap(rb, () => A.review());
          card.appendChild(rb);
          if (V.showCard) card.appendChild(manualCard(store, V.spot, V.area, { timer: false, close: true }));
        }
        if (step === 'park') {
          const m = h(`<div class="map-wrap">${storeMap(store, { hint: V.hint ? V.spot : null, tappable: true })}</div>`);
          m.querySelectorAll('.spot').forEach((sp) => onTap(sp, () => A.park(sp.dataset.spot)));
          body.appendChild(m);
        } else if (step === 'back') {
          const wrap = h(`<div class="back-ui">
            <canvas class="back-top" width="360" height="420"></canvas>
            <div class="back-mon"><canvas class="mon" width="320" height="200"></canvas><span>バックモニター</span></div>
            <div class="back-dist"><small>かべまで</small><b>-</b><small>m</small></div>
            <div class="wheel" id="wheel">${WHEEL_SVG}<div class="wheel-tip"><b>にぎると バック</b><span>${ICON_ARROW('left')} よこに なぞって まわす ${ICON_ARROW('right')}</span></div></div>
          </div>`);
          // ハンドルは指1本：にぎっている（おしている）あいだ下がり、よこになぞると回る（マウスでもできる）
          const wheel = wrap.querySelector('#wheel');
          let wx = null; let ang = 0; let pid = null;
          wheel.addEventListener('pointerdown', (e) => {
            e.preventDefault(); wx = e.clientX; pid = e.pointerId;
            ang = (S.deliver && S.deliver.back && S.deliver.back.steer) || 0;
            try { wheel.setPointerCapture(e.pointerId); } catch {}
            wheel.classList.add('on'); setHold(true);
          });
          wheel.addEventListener('pointermove', (e) => {
            if (wx == null || e.pointerId !== pid) return;
            const r = wheel.getBoundingClientRect();
            // いまの ハンドルの角度から回す（やり直しで まっすぐに もどったときに、前の角度へ とばないように）
            ang = (S.deliver && S.deliver.back && S.deliver.back.steer) || 0;
            ang = Math.max(-1, Math.min(1, ang + (e.clientX - wx) / (r.width * 0.7)));
            wx = e.clientX;
            A.steer(ang);
          });
          // 場面が かわって ハンドルが消えたあとに おくれて来る「はなした」は無視する（つぎの場面のボタンを とめてしまわないように）
          const up = () => { if (pid == null) return; wx = null; pid = null; wheel.classList.remove('on'); if (S.phase === 'deliver' && S.deliver && S.deliver.step === 'back') setHold(false); };
          for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) wheel.addEventListener(ev, up);
          wheel.addEventListener('contextmenu', (e) => e.preventDefault());
          body.appendChild(wrap);
          drawBack(el, V);
        } else if (step === 'gate') {
          body.appendChild(h('<div class="rig-floor"></div>'));
          body.appendChild(h(rigHtml()));
          rigSet(el.querySelector('.pgate'), 1);
          // パワーゲートは 自動で 下りる（押すだけの 操作は なくした）
        } else if (step === 'place') {
          const areas = (V.areaOrder || conf.areas).map((a) => `<button class="area ${V.hint && a === V.area ? 'hint' : ''}" data-area="${a}"><img src="${ART.IMG(`area_${a}`)}" alt="" draggable="false"><span>${AREA_LABEL[a]}</span></button>`).join('');
          const wrap = h(`<div><div class="areas">${areas}</div>
            <button class="cart-drag" id="cart-drag" aria-label="だいしゃ"><img src="${ART.IMG('cart_full')}" alt="" draggable="false"></button>
            <div class="drag-tip">だいしゃを おく ばしょへ なぞろう</div></div>`);
          const areaEls = [...wrap.querySelectorAll('.area')];
          areaEls.forEach((a) => onTap(a, () => A.place(a.dataset.area)));
          draggable(wrap.querySelector('#cart-drag'), {
            ghost: () => `<img src="${ART.IMG('cart_full')}" alt="">`,
            targets: () => areaEls,
            onDrop: (t) => A.place(t.dataset.area),
            onSelect: () => {},
          });
          body.appendChild(wrap);
        } else if (step === 'stamp' || step === 'done') {
          const person = store === 'store1' ? 'clerk' : 'owner';
          const wrap = h(`<div>
            <div class="denpyo">
              <h3>のうひん でんぴょう</h3>
              <div class="row"><span>${conf.name} さま</span><span>${ART.ruby(conf.town)}</span></div>
              ${denpyoRows(store)}
              <div class="from"><span><b>${ART.ruby('{芦川商運|あしかわしょううん}')}</b></span><div class="inkan">うけとり<div class="seal ${step === 'done' ? 'on' : ''}">${conf.name === 'スーパー' ? 'スーパー' : 'ごはん'}<br>うけとり</div></div></div>
              ${step === 'done' && V.careful ? '<div class="careful-badge"><small>おこめ ゆれず きれい！</small><b>ていねい はいそう</b></div>' : ''}
            </div>
            <div class="clerk-pop"><img src="${ART.IMG(person)}" alt="" draggable="false"></div></div>`);
          body.appendChild(wrap);
          if (step === 'stamp') {
            const sb = h(`<button class="btn pulse" id="stamp-btn">${ART.ICON.stamp} ハンコを もらう</button>`);
            onTap(sb, () => A.stamp());
            bar.appendChild(sb);
          } else {
            const nb = h('<button class="btn pulse" id="next-btn">つぎへ</button>');
            onTap(nb, () => A.next());
            bar.appendChild(nb);
          }
        }
      },
    };
  },

  // かいしゃに もどる（夕方の絵）
  return() {
    const el = h(`<div class="sc sc-cover" style="background-image:url(img/evening.webp)">
      <div class="big-text" style="top:calc(var(--u)*26)">ぜんぶ とどけたよ！<br>ゆうがた、かいしゃに もどろう</div>
      <div class="bottom-bar"></div>
    </div>`);
    let lastReady = null;
    return {
      el,
      render(st) {
        const ready = st.phase === 'return' && st.returnTrip && st.returnTrip.ready;
        if (ready === lastReady) return;
        lastReady = ready;
        const bar = el.querySelector('.bottom-bar');
        bar.innerHTML = '';
        if (ready) {
          const b = h('<button class="btn pulse" id="next-btn">かいしゃに ついた！</button>');
          onTap(b, () => A.next());
          bar.appendChild(b);
        }
      },
    };
  },

  // ごはんに なった（食卓の絵）
  gohan() {
    const el = h(`<div class="sc sc-cover" style="background-image:url(img/table.webp);background-position:22% bottom">
      <div class="big-text on-photo" style="top:calc(var(--u)*16)">きみが はこんだ おこめが、<br>たくさんの いえの<br>ごはんに なるんだ。</div>
      <div class="gohan-count">
        <div class="gc-row"><span>はこんだ おこめ</span><b>${BAGS_TOTAL * 10}<small>kg</small></b></div>
        <div class="gc-big"><small>ごはん</small><b id="gc-n">0</b><small>ぱいぶん</small></div>
        <div class="gc-note">クラス 30人が まいにち たべても、<br>やく <b>2か月</b> ぶん！</div>
      </div>
      <div class="itadakimasu">いただきます！</div>
      <div class="bottom-bar"><button class="btn pulse" id="next-btn" style="visibility:hidden">しゅうりょうしょうを もらう</button></div>
    </div>`);
    onTap(el.querySelector('#next-btn'), () => A.next());
    // 数え上げ：0 → やく1700ぱい（茶わん1ぱい ＝ おこめ やく68g）
    const goal = GOHAN_BOWLS;
    const t0 = performance.now() + 600;
    let tick = 0;
    const step = () => {
      if (!el.isConnected && performance.now() > t0 + 500) return;
      const k = Math.min(1, Math.max(0, (performance.now() - t0) / 1800));
      const n = Math.round(goal * (1 - (1 - k) ** 3));
      const ne = el.querySelector('#gc-n'); if (ne) ne.innerHTML = `${k >= 1 ? '<i>やく</i>' : ''}${n.toLocaleString()}`;
      if (k > 0 && k < 1 && (tick++ % 4 === 0)) audio.sfx('tap', { vol: 0.25, rate: 1 + k });
      if (k >= 1) {
        audio.sfx('clear'); confetti(30);
        el.querySelector('.gc-note').classList.add('on');
        el.querySelector('#next-btn').style.visibility = '';
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return { el, render() {} };
  },

  cert() { return { render() {} }; },
};


// 小さな記号（絵文字は使わない）
const ICON_PIN = '<svg class="ico" viewBox="0 0 24 24"><path d="M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22z" fill="#e2483d"/><circle cx="12" cy="9.5" r="2.8" fill="#fff"/></svg>';
const ICON_FLAG = '<svg class="ico" viewBox="0 0 24 24"><path d="M5 22V3" stroke="#232838" stroke-width="2.2"/><path d="M6 3h13v10H6z" fill="#fff" stroke="#232838" stroke-width="1.6"/><path d="M6 3h4.3v3.3H6zM14.6 3H19v3.3h-4.4zM10.3 6.3h4.3v3.4h-4.3zM6 9.7h4.3V13H6zM14.6 9.7H19V13h-4.4z" fill="#232838"/></svg>';
const ICON_ARROW = (dir) => `<svg class="ico" viewBox="0 0 24 24"><path d="${dir === 'left' ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20'}" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const WHEEL_SVG = `<svg viewBox="0 0 200 200" aria-label="ハンドル"><defs><radialGradient id="whub" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f4f6f8"/><stop offset="1" stop-color="#8d96a1"/></radialGradient><linearGradient id="wrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f57"/><stop offset="1" stop-color="#15171a"/></linearGradient></defs>
  <circle cx="100" cy="100" r="86" fill="none" stroke="url(#wrim)" stroke-width="24"/>
  <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
  <path d="M22 108 Q60 96 74 104 L74 122 Q50 120 26 128 Z M178 108 Q140 96 126 104 L126 122 Q150 120 174 128 Z M88 128 L112 128 L118 182 L82 182 Z" fill="#2a2e34"/>
  <circle cx="100" cy="110" r="34" fill="url(#whub)" stroke="#2a2e34" stroke-width="5"/>
  <rect x="93" y="6" width="14" height="20" rx="4" fill="#ffd23a"/></svg>`;
const ICON_FINGER = '<svg class="ico" viewBox="0 0 24 24"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l5 1.1c1.2.3 2 1.4 1.8 2.6l-.8 5.3A2.5 2.5 0 0 1 15.5 21H11a3 3 0 0 1-2.3-1.1L5.4 16a1.6 1.6 0 0 1 2.3-2.2L9 15z" fill="#fff" stroke="#fff" stroke-width=".5"/></svg>';

const AREA_NAME = { rice: 'おこめの おきば', cold: 'れいぞうこ', box: 'ダンボール おきば', kitchen: 'ちゅうぼうの いりぐち', seat: 'おきゃくさんの せき', outside: 'おみせの そと' };
const AREA_LABEL = { rice: 'おこめの<br>おきば', cold: 'れいぞうこ', box: 'ダンボール<br>おきば', kitchen: 'ちゅうぼうの<br>いりぐち', seat: 'おきゃくさん<br>の せき', outside: 'おみせの<br>そと' };
const SPOT_NAME = { front: 'おみせの まえ', back: 'にもつ おろしば', road: 'どうろ', side: 'みぎの スペース', corner: 'ひだりの スペース' };

// お店の絵（Codex）。止める場所は、絵の上の位置を測ったもの（%）
const STORE_IMG = { store1: 'store_super', store2: 'store_gohan' };
const SPOTS = {
  store1: { front: [30.6, 58.6], back: [80.7, 50.8], road: [24.7, 87.9] },
  store2: { front: [50.1, 58.6], corner: [13, 41], side: [87.2, 41] },
};
function storeMap(store, { hint = null, tappable = false, star = null, labels = true } = {}) {
  const spots = Object.entries(SPOTS[store]).map(([id, [x, y]]) => `
    <${tappable ? 'button' : 'div'} class="spot ${hint === id ? 'hint' : ''} ${star === id ? 'star' : ''}" data-spot="${id}" style="left:${x}%;top:${y}%" aria-label="${SPOT_NAME[id]}">
      <span class="pin">${star === id ? ART.ICON.star(true, 26) : 'P'}</span>
      ${labels ? `<span class="spot-label">${SPOT_NAME[id]}</span>` : ''}
    </${tappable ? 'button' : 'div'}>`).join('');
  return `<div class="store-map"><img src="${ART.IMG(STORE_IMG[store])}" alt="おみせの ちず" draggable="false">${spots}</div>`;
}

// バック：上から見た図（搬入口のかべが上、y はかべからの距離 m）と、本物のようなバックモニター
const BACK_VIEW = { x0: -6, x1: 6, y0: -3.4, y1: 13.6 }; // Codex の搬入口の絵（かべの下が 上から20%）に 合わせる
const backImgs = {};
// Codex の絵が届くまでは読みにいかない（届いたら このリストから はずす）
const ART_PENDING = new Set([]); // 11/13 Codex の絵が とどいた
function bimg(n) { if (ART_PENDING.has(n)) return {}; if (!backImgs[n]) { backImgs[n] = new Image(); backImgs[n].src = ART.IMG(n); } return backImgs[n]; }
function drawBack(el, V) {
  const b = V.back;
  if (!b) return;
  const cv = el.querySelector('.back-top');
  if (cv) {
    const g = cv.getContext('2d');
    const W = cv.width; const H = cv.height; const VW = BACK_VIEW;
    const sx = (x) => ((x - VW.x0) / (VW.x1 - VW.x0)) * W;
    const sy = (y) => ((y - VW.y0) / (VW.y1 - VW.y0)) * H;
    const ppm = W / (VW.x1 - VW.x0);
    const dock = bimg('docktop');
    if (dock.complete && dock.naturalWidth) g.drawImage(dock, 0, 0, W, H); else drawDockTop(g, W, H, sx, sy, ppm);
    // トラック（うしろの車軸の位置 x,y・向き th。絵は運転席が下）
    const tr = bimg('truck_top');
    const tw = 3.0 * ppm; const tl = tw / 0.4375; // Codex の 上から見た トラックの絵の たて横
    g.save();
    g.translate(sx(b.x), sy(b.y));
    g.rotate(-b.th);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
    if (tr.complete && tr.naturalWidth) g.drawImage(tr, -tw / 2, -0.4 * ppm, tw, tl);
    else drawTruckTop(g, tw, tl, ppm);
    g.restore();
    // このまま下がると どこへ行くか（黄色の点線）。止まる線に入っていれば緑
    if (!b.pull && !b.done && !b.hard) {
      const path = backPath(b, 7);
      const end = path[path.length - 1];
      g.strokeStyle = Math.abs(end[0]) <= 0.6 ? 'rgba(80,230,120,.95)' : 'rgba(255,214,58,.95)';
      g.lineWidth = 4; g.setLineDash([8, 7]);
      for (const off of [-1.05, 1.05]) {
        g.beginPath();
        path.forEach(([x, y, th], i) => { const px = sx(x + off * Math.cos(th)); const py = sy(y - off * Math.sin(th)); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.stroke();
      }
      g.setLineDash([]);
    }
  }
  const mon = el.querySelector('.mon');
  if (mon) drawMonitor(mon, b);
  el.querySelector('#wheel svg')?.style.setProperty('transform', `rotate(${(b.steer || 0) * 120}deg)`);
  const dEl = el.querySelector('.back-dist b'); if (dEl) { const d = Math.max(0, b.y - 0.3); dEl.textContent = d.toFixed(1); el.querySelector('.back-dist').classList.toggle('near', d < 1.2); }
  // バックの ピッピッ：かべに近いほど速く
  const dist = b.y - 0.3;
  audio.beep(V.holding && !b.done && !b.pull, dist > 3 ? 520 : dist > 1.5 ? 260 : 120);
  el.querySelector('.back-ui')?.classList.toggle('pulling', !!b.pull);
}
// このまま下がったときの、トラックのうしろの通り道（ルールの backTick と同じ動き）
function backPath(b, len) {
  const K = CONFIG.back; const pts = [];
  let x = b.x; let y = b.y; let th = b.th; const st = b.used != null ? b.used : (b.steer || 0);
  const dt = 0.1;
  for (let d = 0; d < len && y > 0.3; d += K.speed * dt) {
    pts.push([x, y, th]);
    th += (-st * K.maxTh - th) * Math.min(1, K.thRate * dt);
    x -= Math.sin(th) * K.speed * dt; y -= Math.cos(th) * K.speed * dt;
  }
  pts.push([x, Math.max(0.3, y), th]);
  return pts;
}
// 絵が届くまでの代わり：搬入口を上から見た図（アスファルト・建物・シャッター・車止め・白い線）
let asphalt = null;
function drawDockTop(g, W, H, sx, sy, ppm) {
  if (!asphalt) {
    asphalt = document.createElement('canvas'); asphalt.width = W; asphalt.height = H;
    const a = asphalt.getContext('2d');
    a.fillStyle = '#737a84'; a.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 2600; i++) { a.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; a.fillRect(rnd() * W, rnd() * H, 2, 2); }
    // タイヤのあと
    a.strokeStyle = 'rgba(30,30,30,.12)'; a.lineWidth = 14;
    for (const x of [-0.9, 0.9]) { a.beginPath(); a.moveTo(sx(x), sy(0.4)); a.lineTo(sx(x * 1.1), H); a.stroke(); }
  }
  g.drawImage(asphalt, 0, 0);
  // 建物（上）：屋根のふち・かべ・シャッター
  const wy = sy(0);
  g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, W, wy);
  g.fillStyle = '#cfc4ab'; g.fillRect(0, wy - 6, W, 6);
  g.fillStyle = '#b9ad93'; for (let x = 8; x < W; x += 26) g.fillRect(x, 4, 2, wy - 12);
  const s0 = sx(-1.7); const s1 = sx(1.7);
  g.fillStyle = '#8e97a3'; g.fillRect(s0, wy - 22, s1 - s0, 22);
  g.fillStyle = '#6d7682'; for (let y = wy - 20; y < wy; y += 4) g.fillRect(s0, y, s1 - s0, 1.5);
  g.fillStyle = '#2b6cb0'; g.fillRect(s0 - 6, wy - 26, 6, 26); g.fillRect(s1, wy - 26, 6, 26);
  // 車止め（黒いゴム）
  g.fillStyle = '#1d1f23';
  for (const x of [-1.15, 1.15]) { g.fillRect(sx(x) - 0.22 * ppm, wy, 0.44 * ppm, 0.3 * ppm); }
  // 駐車の白い線と、止める目じるし（黄色）
  g.strokeStyle = '#f4f4f0'; g.lineWidth = 5;
  for (const x of [-1.75, 1.75]) { g.beginPath(); g.moveTo(sx(x), wy); g.lineTo(sx(x), sy(12)); g.stroke(); }
  g.strokeStyle = '#ffd23a'; g.lineWidth = 4; g.setLineDash([10, 8]);
  g.beginPath(); g.moveTo(sx(-1.75), sy(0.3)); g.lineTo(sx(1.75), sy(0.3)); g.stroke(); g.setLineDash([]);
  // 左右：となりの車の止め場所の線
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  for (const x of [-5.2, 5.2]) { g.beginPath(); g.moveTo(sx(x), wy); g.lineTo(sx(x), sy(12)); g.stroke(); }
}
// 絵が届くまでの代わり：トラックを真上から（上が荷台のうしろ、下が運転席）
function drawTruckTop(g, tw, tl, ppm) {
  const x0 = -tw / 2; const top = -0.4 * ppm;
  const boxL = tl * 0.74; const cabY = top + boxL + 0.15 * ppm; const cabL = tl - boxL - 0.15 * ppm;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // 荷台（銀色、横にすじ）
  const gr = g.createLinearGradient(x0, 0, x0 + tw, 0);
  gr.addColorStop(0, '#b9c0c8'); gr.addColorStop(0.5, '#eef1f4'); gr.addColorStop(1, '#b9c0c8');
  g.fillStyle = gr; rr(x0, top, tw, boxL, 4); g.fill();
  g.strokeStyle = 'rgba(80,90,100,.35)'; g.lineWidth = 1.2;
  for (let y = top + 6; y < top + boxL - 4; y += 6) { g.beginPath(); g.moveTo(x0 + 3, y); g.lineTo(x0 + tw - 3, y); g.stroke(); }
  g.strokeStyle = '#4a525c'; g.lineWidth = 2; rr(x0, top, tw, boxL, 4); g.stroke();
  // うしろのランプ（赤）
  g.fillStyle = '#e2483d'; g.fillRect(x0 + 2, top - 2, 7, 4); g.fillRect(x0 + tw - 9, top - 2, 7, 4);
  // 運転席（白）と風よけ
  g.fillStyle = '#fbfcfd'; rr(x0 + 1, cabY, tw - 2, cabL, 7); g.fill();
  g.strokeStyle = '#4a525c'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#e3e8ee'; rr(x0 + 5, cabY + 3, tw - 10, cabL * 0.45, 5); g.fill();
  g.fillStyle = '#5c86b0'; g.fillRect(x0 + 4, cabY + cabL - 7, tw - 8, 5);
  // ミラー
  g.fillStyle = '#23272e';
  g.fillRect(x0 - 7, cabY + cabL * 0.62, 7, 4); g.fillRect(x0 + tw, cabY + cabL * 0.62, 7, 4);
}

// バックモニター：トラックのうしろのカメラから見た地面（駐車の白い線・かべ）と、距離の目安の線・進路の線
function drawMonitor(cv, b) {
  const g = cv.getContext('2d');
  const W = cv.width; const H = cv.height;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#3b4350'); sky.addColorStop(0.35, '#6c7480'); sky.addColorStop(1, '#8a919b');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // 地面の点 (wx, wy) を カメラの画面へ（カメラはトラックのうしろ、高さ1.6m、下向き）
  const cam = (wx, wy) => {
    const dx = wx - b.x; const dy = b.y - wy; // うしろ向きの前方（かべの方向）
    const c = Math.cos(b.th); const sn = Math.sin(b.th);
    const fwd = dy * c + dx * sn; const side = dx * c - dy * sn;
    if (fwd < 0.2) return null;
    const f = W * 0.55;
    return [W / 2 + (side / fwd) * f, H * 0.2 + (1.6 / fwd) * f * 0.9];
  };
  const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); let st = false; for (const p of pts) { const q = cam(p[0], p[1]); if (!q) { st = false; continue; } if (!st) { g.moveTo(q[0], q[1]); st = true; } else g.lineTo(q[0], q[1]); } g.stroke(); };
  // かべとシャッター
  const wl = cam(-6, 0.05); const wr = cam(6, 0.05);
  if (wl && wr) {
    g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, W, wl[1]);
    const sl = cam(-1.6, 0.05); const sr = cam(1.6, 0.05);
    if (sl && sr) { g.fillStyle = '#5b6370'; g.fillRect(sl[0], wl[1] - (sr[0] - sl[0]) * 0.55, sr[0] - sl[0], (sr[0] - sl[0]) * 0.55); }
    for (const bx of [-1.1, 1.1]) { const q = cam(bx, 0.05); if (q) { g.fillStyle = '#222'; g.fillRect(q[0] - 8, q[1] - 14, 16, 14); } }
  }
  // 駐車の白い線（幅3.2m・長さ12m）
  const L = []; for (let y = 0.05; y <= 12; y += 0.5) L.push([-1.6, y]);
  const R = []; for (let y = 0.05; y <= 12; y += 0.5) R.push([1.6, y]);
  line(L, '#ffffff', 4); line(R, '#ffffff', 4);
  // 距離の目安の線（うしろから 0.5m 赤・1m 黄・2m 緑）：画面に固定
  const guide = (d, col) => { const y = H * 0.2 + (1.6 / d) * W * 0.55 * 0.9; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(W * 0.5 - W * 0.55 * (1.3 / d), y); g.lineTo(W * 0.5 + W * 0.55 * (1.3 / d), y); g.stroke(); };
  guide(2, '#2bd16a'); guide(1, '#ffd23a'); guide(0.55, '#ff4d3d');
  // 進路の線（ハンドルに合わせて曲がる）
  if (!b.pull) {
    const path = backPath(b, 6);
    g.strokeStyle = 'rgba(255,214,58,.9)'; g.lineWidth = 3;
    for (const off of [-1.25, 1.25]) line(path.map(([x, y, th]) => [x + off * Math.cos(th), y - off * Math.sin(th)]), 'rgba(255,214,58,.9)', 3);
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, H - 22, W, 22);
  g.fillStyle = '#fff'; g.font = '900 15px sans-serif'; g.textAlign = 'center';
  g.fillText(`かべまで ${Math.max(0, b.y - 0.3).toFixed(1)} m`, W / 2, H - 6);
}

// パワーゲート（横から見た図）：トラックの うしろ（左）に 台。t＝0 台車は 地面、t＝1 台車は 荷台の 中
//   0〜0.3 台車が 台に のる → 0.3〜0.65 台が 荷台の 床の 高さまで 上がる → 0.65〜1 台車が 荷台の 中へ（トラックの うしろに かくれる）
//   下ろすときは t を 1→0 に 動かす（同じ 動きの 逆）
const PG = { floor: 21.8, cartW: 15, gateL: 10.5, gateW: 18.5, truckL: 28 };
function rigSet(rig, t) {
  if (!rig) return;
  const ease = (k) => k * k * (3 - 2 * k);
  const a = ease(Math.min(1, Math.max(0, t / 0.3)));
  const b = ease(Math.min(1, Math.max(0, (t - 0.3) / 0.35)));
  const c = ease(Math.min(1, Math.max(0, (t - 0.65) / 0.35)));
  const lift = b * PG.floor; // 台の 高さ（%）
  const onGate = PG.gateL + (PG.gateW - PG.cartW) / 2;
  const x = 0.5 + a * (onGate - 0.5) + c * (PG.truckL + 16 - onGate); // 台車の 左はし（%）
  rig.style.setProperty('--lift', `${lift.toFixed(2)}%`);
  rig.style.setProperty('--cx', `${x.toFixed(2)}%`);
  rig.style.setProperty('--roll', `${((a + c) * 540).toFixed(0)}deg`);
}
function rigHtml() {
  return `<div class="pgate">
    <div class="pg-ground"></div>
    <img class="pg-cart" src="${ART.IMG('cart_full')}" alt="" draggable="false">
    <img class="pg-truck" src="${ART.IMG('truck_side')}" alt="トラック" draggable="false">
    <div class="pg-gate"><i></i></div>
    <div class="pg-post"></div>
  </div>`;
}

// 伝票：倉庫で積んだ注文どおりの色と数（場面へ飛んだときは注文がないので、数だけ）
function denpyoRows(store) {
  const order = S.load && S.load.orders[store === 'store1' ? 'super' : 'gohan'];
  if (!order) return `<div class="row"><span>おこめ（10kg）</span><span>${store === 'store1' ? CONFIG.load.superBags : CONFIG.load.gohanBags}ふくろ</span></div>`;
  const n = Object.values(order).reduce((a, b) => a + b, 0);
  return `<div class="row"><span>おこめ（10kg）</span><span>${n}ふくろ</span></div>
    <div class="row"><span class="icons">${Object.entries(order).map(([c, k]) => `${ART.bagIcon(c)}<b>×${k}</b>`).join(' ')}</span></div>`;
}

function manualCard(store, spot, area, { timer = false, close = false } = {}) {
  const conf = CONFIG.stores[store];
  const el = h(`<div class="mcard">
    <div class="mcard-head"><small>のうひんさき マニュアル</small>${conf.name}（${ART.ruby(conf.town)}）</div>
    <div class="mcard-body">
      <div class="mcard-map">${storeMap(store, { star: spot, labels: false })}<div class="mcard-cap">${ART.ICON.star(true, 16)} に とめる</div></div>
      <div class="mcard-area">おこめを おくのは<img src="${ART.IMG(`area_${area}`)}" alt="" draggable="false">${AREA_LABEL[area]}</div>
    </div>
    ${timer ? '<div class="mcard-timer"><i></i></div>' : ''}
    ${close ? '<div class="mcard-close"><button class="btn btn-sub" id="card-close">とじる</button></div>' : ''}
  </div>`);
  if (close) onTap(el.querySelector('#card-close'), () => A.review());
  return el;
}
// ---------- 上の表示・吹き出し ----------
const hud = $('#hud');
const talkEl = $('#talk');
let lastTalk = '';
let lastStatus = '';
let lastProg = null;
let shownPoints = 0;
let shownHearts = 0;
// ありがとうの ハートが、くれた人の あたりから 上の メーターへ 飛んでくる
const HEART_SVG = '<svg viewBox="0 0 32 30"><path d="M16 28 C6 20 1 14 1 8.5 A7.5 7.5 0 0 1 16 5 A7.5 7.5 0 0 1 31 8.5 C31 14 26 20 16 28Z" fill="#ff5a7a" stroke="#fff" stroke-width="2.5"/></svg>';
const HEART_FROM = { kid: [78, 60], school: [18, 58], merge: [16, 52], ambulance: [62, 52], clerk: [82, 66], owner: [82, 66], staff: [50, 60] };
function flyHearts(n, who) {
  const fr = frame.getBoundingClientRect(); const tg = $('#hearts')?.getBoundingClientRect();
  if (!tg) return;
  const [fx, fy] = HEART_FROM[who] || [50, 55];
  const tx = ((tg.left + tg.width * 0.3 - fr.left) / fr.width) * 100; const ty = ((tg.top + tg.height / 2 - fr.top) / fr.height) * 100;
  for (let i = 0; i < Math.min(n, 8); i++) {
    const el = h(`<i class="fly-heart">${HEART_SVG}</i>`);
    const sx = fx + (Math.random() - 0.5) * 14; const sy = fy + (Math.random() - 0.5) * 8;
    el.style.left = `${sx}%`; el.style.top = `${sy}%`;
    el.style.setProperty('--dx', `${((tx - sx) / 100) * fr.width}px`); el.style.setProperty('--dy', `${((ty - sy) / 100) * fr.height}px`);
    el.style.animationDelay = `${i * 0.09}s`;
    frame.appendChild(el);
    setTimeout(() => { el.remove(); audio.sfx('tap', { vol: 0.25, rate: 1.6 + i * 0.08 }); $('#hearts')?.classList.remove('bump'); void $('#hearts')?.offsetWidth; $('#hearts')?.classList.add('bump'); }, 900 + i * 90);
  }
}
// きょうの ありがとう アルバム：その回の 見せ場を 写真で のこす
let album = [];
function snapTake(kind, caption, delay = 0) {
  setTimeout(() => { if (!drive || album.some((a) => a.kind === kind)) return; const src = drive.snap(); if (src) album.push({ kind, caption, src }); }, delay);
}
const hhmm = (min) => { const m = Math.floor(min); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
function renderChrome(st) {
  const sc = $('#score');
  if (sc) {
    const target = st.score ? st.score.points : 0;
    if (shownPoints !== target) { shownPoints += Math.ceil((target - shownPoints) * 0.25) || (target - shownPoints); sc.textContent = shownPoints; }
  }
  const hn = st.score ? st.score.hearts : 0;
  if (shownHearts !== hn) { shownHearts = hn; const he = $('#heart-n'); if (he) he.textContent = hn; }
  const showHud = !['title', 'cert', 'gohan'].includes(st.phase);
  hud.hidden = !showHud;
  if (showHud && st.status !== lastStatus) {
    lastStatus = st.status;
    const pill = $('#status');
    pill.innerHTML = `<ruby>${st.status}<rt>${STATUS_RUBY[st.status]}</rt></ruby>`;
    pill.className = `status-pill ${STATUS_CLASS[st.status] || ''}`;
  }
  // お店の札：つぎの お店は「あと ○ぷん」（しめきりまで）、ついた お店は じかんどおりなら ✓、おくれたら △
  const onT = (st.score && st.score.onTime) || {};
  const now = st.clock || CONFIG.clock.start;
  const next = ['store1', 'store2'].find((id) => onT[id] == null);
  const left = next ? Math.ceil(CONFIG.clock.deadlines[next] - now) : null;
  const prog = `${st.delivered.join(',')}|${JSON.stringify(onT)}|${next}|${left}`;
  if (showHud && prog !== lastProg) {
    lastProg = prog;
    $('#progress').innerHTML = [['store1', ART.ICON.shop, 'スーパー'], ['store2', ART.ICON.bowl, 'ごはんやさん']]
      .map(([id, ic, n]) => {
        const r = onT[id]; const isNext = id === next;
        const tail = r === true ? '<span class="chk">✓</span>' : r === false ? '<span class="chk">△</span>' : isNext ? `<em class="left">${left >= 0 ? `あと${left}ぷん` : 'おくれ！'}</em>` : `<em>${hhmm(CONFIG.clock.deadlines[id])}まで</em>`;
        const cls = [st.delivered.includes(id) ? 'done' : '', r === false ? 'late' : '', isNext ? 'next' : '', isNext && left < 0 ? 'over' : isNext && left <= 20 ? 'near' : ''].join(' ');
        return `<div class="stop ${cls}">${ic}<span>${n}</span>${tail}</div>`;
      }).join('');
  }
  if (st.phase === 'talk') {
    const [who, text] = st.talk.lines[st.talk.i];
    const k = `${st.talk.id}:${st.talk.i}`;
    if (k !== lastTalk) {
      lastTalk = k;
      talkEl.hidden = false;
      talkEl.style.animation = 'none'; void talkEl.offsetWidth; talkEl.style.animation = '';
      $('#talk-avatar').innerHTML = ART.AVATAR[who](110);
      $('#talk-avatar').classList.toggle('k', who === 'kometa');
      $('#talk-name').textContent = NAMES[who];
      $('#talk-text').innerHTML = ART.ruby(text);
      audio.voice(TALK_VOICE[k] || null, { wait: 4000 });
    }
  } else if (!talkEl.hidden) { talkEl.hidden = true; lastTalk = ''; }
  sceneEl.classList.toggle('talking', st.phase === 'talk');
}
talkEl.addEventListener('click', () => { audio.sfx('tap'); A.next(); });

// ---------- できごと（音・演出） ----------
function handleEvents() {
  for (const e of game.drainEvents()) {
    switch (e.type) {
      case 'phase':
        clearSay();
        audio.beep(false);
        if (e.phase !== 'drive') audio.engine(-1);
        if (e.phase !== 'cert') audio.bgm(e.phase === 'drive' ? 'drive' : 'main');
        if (e.phase === 'gohan') { audio.sfx('bowl'); setTimeout(() => audio.voice('v_gohan'), 700); }
        if (e.phase === 'load') setTimeout(() => speak('v_load'), 500);
        // 運転の はじめに、この道の しめきりを 大きく 知らせる
        if (e.phase === 'drive' && S.drive && (S.drive.leg === 'leg1' || S.drive.leg === 'leg2a')) {
          const store = S.drive.leg === 'leg1' ? 'store1' : 'store2';
          const mb = h(`<div class="mission"><small>${store === 'store1' ? 'スーパーの おこめが もうすぐ なくなる！' : 'おひるの おにぎりに まにあわせよう！'}</small><b>${hhmm(CONFIG.clock.deadlines[store])} までに ${store === 'store1' ? 'スーパー' : 'ごはんやさん'}へ！</b><em>はやく つくと「よゆう」ボーナス</em></div>`);
          frame.appendChild(mb);
          setTimeout(() => mb.classList.add('out'), 2600);
          setTimeout(() => mb.remove(), 3100);
        }
        break;
      case 'good':
        if (e.what === 'bag') lastBagCart = e.cart;
        audio.sfx({ bag: 'bag', check: 'check', park: 'air', gate: 'door' }[e.what] || 'good');
        if (e.what === 'bag' || e.what === 'place') audio.sfx('good', { vol: 0.35 });
        if (e.what === 'check') pop('よし！', 'good', 70, 50);
        // 点が出るときは「+30 ここだね！」の表示だけにする（同じ言葉を2回 出さない）
        break;
      case 'miss': {
        audio.sfx('miss');
        if (e.what === 'bag') pop('しわけひょうを みてね', 'miss', e.cart === 'super' ? 28 : 72, 30);
        else say({ park: 'マニュアルカードと ちがう ばしょ みたい…', place: 'そこじゃ ないみたい… カードを おもいだそう' }[e.what] || 'もういちど！', 'kometa', 2600);
        document.querySelector(e.what === 'bag' ? `.cartbox[data-cart="${e.cart}"]` : '.dv-body')?.classList.add('shake');
        setTimeout(() => document.querySelectorAll('.shake').forEach((x) => x.classList.remove('shake')), 420);
        break;
      }
      case 'clear':
        audio.sfx('clear');
        if (e.what === 'gate') audio.sfx('door');
        confetti(e.what === 'deliver' ? 40 : 18);
        if (e.what === 'load') { if (S.load && S.load.t < CONFIG.points.loadTimeBase - 8) speak('v_loadfast'); else say('ばっちり！ おみせごとに わけられたね！', 'kometa', 2400); }
        break;
      case 'hazard': audio.sfx(e.hazard === 'walker' ? 'crossing' : 'hazard'); break;
      case 'zone': audio.sfx('line'); say('しょうがっこうの まえだ。子どもが いるから、じそく30キロ いかで はしろう', 'senpai', 3400); break;
      case 'etcOpen': audio.sfx('check'); break;
      case 'heart': flyHearts(e.n, e.who); break;
      case 'zoneEnd': if (e.overT <= CONFIG.drive.zoneGrades[1][0]) snapTake('zone', 'スクールゾーンを ゆっくり はしった'); break;
      case 'tooFar': say('きゅうきゅうしゃ、いったね！ もうすこし まえの せんまで すすもう', 'senpai', 2600); break;
      case 'ambulance': audio.siren(0.3); say('サイレンだ！ きゅうきゅうしゃが くる。ひだりに よって とまろう！', 'senpai', 3200); break;
      case 'ambulancePass': if (e.ok) snapTake('ambulance', 'きゅうきゅうしゃに みちを ゆずった', 1500); break;
      case 'ambulanceDone':
        audio.siren(0);
        if (e.ok) pop('ごきょうりょく<br>ありがとうございます', 'good', 50, 58);
        else say('サイレンが きこえたら すぐ とまろうね', 'senpai', 2600);
        break;
      case 'zoneSlow': audio.sfx('brake'); say('スピード だしすぎ！ ブレーキ！ 子どもが いるよ', 'senpai', 2600); cargoShake(); break;
      case 'points':
        // 倉庫は 入れた台車の上に、ほかは まん中に（つづけて出ても 重ならないよう 少し ずらす）
        ptsFlip = !ptsFlip;
        if (S.phase === 'load' && e.part === 'load' && lastBagCart) pop(`+${e.n}<small>${e.label}</small>`, 'pts', lastBagCart === 'super' ? 27 : 73, 30);
        // 運転は空のあたり、納品は伝票の下の あいている所（カードや文字に かぶらない）
        else pop(`+${e.n}<small>${e.label}</small>`, 'pts', 50, (S.phase === 'deliver' ? (S.deliver && (S.deliver.step === 'back' || S.deliver.step === 'gate') ? 36 : 60) : S.phase === 'drive' ? 26 : 40) + (ptsFlip ? 0 : 6));
        $('#score-box')?.classList.remove('bump'); void $('#score-box')?.offsetWidth; $('#score-box')?.classList.add('bump');
        break;
      case 'laneCue': audio.sfx('line'); break;
      case 'lane': audio.sfx('check'); break;
      case 'laneOk': audio.sfx('good'); if (e.cue === 'merge') { speak('v_yield'); snapTake('merge', 'ごうりゅうの 車に ゆずった', 900); } if (e.cue === 'conesR') snapTake('look', 'こうじを よく 見て はしった', 300); break;
      case 'laneHelp': say(e.cue === 'merge' ? 'あ、合流の車！ 右へ よけるよ。つぎは はやめにね' : e.cue === 'conesR' ? 'こうじは みぎの しゃせんだ！ ひだりに もどるよ。よく 見てね' : e.cue === 'cones' ? 'こうじだ！ みぎへ よけるよ。やじるしを よく 見てね' : 'こうそくどうろは ひだりが きほん。もどるよ', 'senpai', 2800); break;
      case 'etc': if (e.ok) { audio.sfx('check'); snapTake('etc', 'ETCを ゆっくり とおった', 1100); } break; // バーが開く「ピッ」（開かないときは autostop で知らせる）
      case 'perfect':
        if (e.etc) { audio.sfx('good'); break; }
        if (e.zone) { audio.sfx('good'); snapTake('zone', 'スクールゾーンを ゆっくり はしった'); break; }
        audio.sfx('perfect'); audio.sfx('air', { vol: 0.35 }); // 「+100 ピタッ！」は 点の表示で 出る
        snapTake('pita', 'とまる せんで ピタッと とまった', 150);
        if (performance.now() - lastPitaVoice > 25000) { lastPitaVoice = performance.now(); speak('v_pita'); } else say('ふんわり ていし！ おこめも ゆれないよ', 'kometa', 1800);
        break;
      case 'autostop':
        audio.sfx('brake');
        if (e.amb) { cur?.flashAlert?.('<div class="alert">きゅうブレーキ！ きゅうきゅうしゃに ゆずるよ</div>', 1800); cargoShake(); break; }
        if (e.etc) {
          cur?.flashAlert?.('<div class="alert">ETCの バーが あかない！</div>', 2000);
          say('はやすぎると バーが あかないんだ。20キロ いかで とおろう', 'senpai', 3000);
          cargoShake();
          break;
        }
        cur?.flashAlert?.('<div class="alert">あぶない！ きゅうブレーキ！</div>', 1600);
        say(S.drive && S.drive.leg === 'leg1' ? 'あぶなかった！ おこめも ゆれちゃった。はやめに ゆびを はなそうね' : 'わわっ！ おこめが ゆれたよ〜。はやめに とまろうね', S.drive && S.drive.leg === 'leg1' ? 'senpai' : 'kometa', 2800);
        cargoShake();
        break;
      case 'hazardClear':
        cur?.flashAlert?.(`<div class="alert ok">${e.hazard === 'walker' ? 'わたりおわったよ。' : ''}しゅっぱつ OK！</div>`, 1200);
        if (e.hazard === 'walker' && !e.forced) { kidThanks(); snapTake('kid', 'こどもが わたるのを まってあげた', 400); }
        break;
      case 'line': audio.sfx('line'); break;
      case 'choose':
        if (e.route === 'highway') say('こうそくどうろは ひだりの しゃせんが きほん。よける ときだけ みぎへ！', 'senpai', 3600);
        else say('したみちで いこう！ ちゃばたけが 見えるよ', 'kometa', 3000);
        break;
      case 'arrive': {
        audio.sfx('air'); audio.sfx('clear'); audio.engine(-1);
        // とうちゃくのカットイン：Codex のトラックの正面ななめの絵
        const ci = h(`<div class="cutin"><div class="cutin-img" style="background-image:url(${ART.IMG('title')})"></div><b>とうちゃく！</b></div>`);
        frame.appendChild(ci);
        setTimeout(() => ci.classList.add('out'), 1500);
        setTimeout(() => ci.remove(), 2000);
        break;
      }
      case 'arriveTime': {
        if (e.ok) snapTake(e.store === 'store1' ? 'arrive1' : 'arrive2', e.store === 'store1' ? 'スーパーに じかんどおり とうちゃく' : 'ごはんやさんに じかんどおり とうちゃく', 100);
        const who = e.store === 'store1' ? 'clerk' : 'owner';
        setTimeout(() => {
          // まにあったときは「+100 じかんどおり！」の点の表示だけ（同じ言葉を2回 出さない）
          if (!e.ok && S.phase === 'drive') pop(`${hhmm(e.at)} とうちゃく<small>しめきり ${hhmm(e.deadline)}</small>`, 'miss', 50, 46); // つぎの 画面に かさならないよう、運転の 画面の うちに
          if (!e.ok) say(e.store === 'store1' ? 'まってたよ〜。つぎは じかんどおりに おねがいね' : 'おにぎり まにあわないかと おもったよ〜', who, 3000);
        }, 600);
        break;
      }
      case 'stamp': audio.sfx('stamp'); setTimeout(() => speak(S.deliver && S.deliver.store === 'store2' ? 'v_thanks2' : 'v_thanks'), 400); break;
      case 'backStart': if (e.tries === 0) speak('v_back'); else if (e.tries > 0) say(e.tries >= 2 ? 'ストップ！ こんどは せんぱいが ハンドルを てつだうよ。' : 'ストップ！ ずれちゃったね。まえに だすから、もう いちど！', 'senpai', 3200); break;
      case 'backRetry': audio.sfx('miss'); break; // 指は はなさなくてよい（前に出しおわったら、にぎったままで また下がる）
      case 'backDone': setHold(false); audio.sfx('air'); audio.sfx(e.grade === 'great' ? 'perfect' : 'good'); audio.beep(false); if (e.grade === 'great') speak('v_backgreat'); break;
      case 'cardHide': say('カードを おもいだして、トラックを とめよう！', 'kometa', 3200); break;
      case 'finish': showCert(e.result); setTimeout(() => audio.voice('v_cool'), 1200); // 文は 修了証に 書いてある break;
      default: break;
    }
  }
}

// ---------- 運転：おこめが ゆれる（きゅうブレーキ）／子どもが 手をふる ----------
function cargoShake() {
  const k = h(`<div class="cargo-pop"><img src="${ART.IMG('kometa_worry')}" alt="" draggable="false"><b>おこめが ゆれた！</b></div>`);
  frame.appendChild(k);
  setTimeout(() => k.classList.add('out'), 1500);
  setTimeout(() => k.remove(), 1900);
}
function kidThanks() {
  const k = h(`<div class="kid-pop"><img src="${ART.IMG('kid_wave')}" alt="" draggable="false"><b>うんてんしゅさん、<br>まってくれて ありがとう！</b></div>`);
  frame.appendChild(k);
  audio.sfx('good', { vol: 0.5 });
  setTimeout(() => k.classList.add('out'), 2300);
  setTimeout(() => k.remove(), 2700);
}

// ---------- 修了証 ----------
// きょうの ありがとう アルバム（その回の 見せ場の 写真。ならびは 見せ場の大きい順）
const ALBUM_ORDER = ['ambulance', 'kid', 'zone', 'merge', 'look', 'etc', 'pita', 'arrive1', 'arrive2'];
function albumHtml(r) {
  const pics = [...album].sort((a, b) => ALBUM_ORDER.indexOf(a.kind) - ALBUM_ORDER.indexOf(b.kind)).slice(0, 4);
  const heartsLine = `<p class="al-hearts">${HEART_SVG}<span>ありがとう</span><b>${r.hearts || 0}</b><span>こ</span></p>`;
  if (!pics.length) return `<div class="cert-album">${heartsLine}<p class="al-none">つぎは まわりの人を たすけて「ありがとう」を あつめよう！</p></div>`;
  return `<div class="cert-album">${heartsLine}<p class="al-title">きょうの ありがとう アルバム</p><div class="al-grid">${pics.map((p, i) => `<figure class="al-pic" style="--r:${[-3, 2.5, -1.5, 3][i]}deg"><img src="${p.src}" alt=""><figcaption>${p.caption}</figcaption></figure>`).join('')}</div></div>`;
}

// きょう えがおに した 人（とどけた おみせ・まってあげた子・ごはんを たべる みんな）
function smilesHtml(r) {
  const carefulOf = (st) => (r.careful || []).includes(st);
  const people = [
    { img: 'clerk', name: 'スーパーの<br>てんいんさん', on: (r.delivered || []).includes('store1'), heart: carefulOf('store1') },
    { img: 'owner', name: 'ごはんやさんの<br>てんちょう', on: (r.delivered || []).includes('store2'), heart: carefulOf('store2') },
    { img: 'kid_wave', name: 'よこだんほどうの<br>子ども', on: r.kidsWaited > 0, heart: false, off: 'つぎは まって<br>あげよう' },
    { img: 'kometa_happy', name: `ごはん ${GOHAN_BOWLS.toLocaleString()}<br>ぱいぶんの みんな`, on: true, heart: false },
  ];
  const n = people.filter((p) => p.on).length;
  return `<div class="cert-smiles"><p>きょう えがおに した 人 <b>${n}</b>くみ</p><div class="cs-row">${people.map((p) => `<div class="cs ${p.on ? '' : 'off'}"><span class="face"><img src="${ART.IMG(p.img)}" alt="" draggable="false">${p.heart ? '<i>ていねい</i>' : ''}</span><small>${p.on ? p.name : (p.off || p.name)}</small></div>`).join('')}</div></div>`;
}

function dateText() { const d = new Date(); return `${d.getFullYear()}ねん ${d.getMonth() + 1}がつ ${d.getDate()}にち`; }
function showCert(r) {
  audio.bgm('cert'); // 修了証の 曲
  setTimeout(() => audio.sfx('clap'), 700);
  audio.engine(-1);
  confetti(60);
  const stars = (n) => [1, 2, 3].map((i) => ART.ICON.star(i <= n, 28)).join('');
  // じぶんの さいこう記録（この端末だけ。保存できなくても 表示は くずれない）
  let best = null;
  try { const v = localStorage.getItem('okomebin-best'); best = v === null ? null : Number(v); if (best === null || r.points > best) localStorage.setItem('okomebin-best', String(r.points)); } catch {}
  const c = $('#cert');
  c.innerHTML = `
    <div class="cert-card" id="cert-card">
      <div class="em">${ART.emblemImg()}</div>
      <p class="cert-kind">しゅうりょうしょう</p>
      <p class="cert-name">おこめ<ruby>便<rt>びん</rt></ruby>ドライバー</p>
      <div class="cert-score"><div class="rank r${r.rank}"><small>ランク</small><b>${r.rank}</b></div><div class="pts"><small>とくてん</small><b>${r.points}</b>${best && best > r.points ? `<em>じぶんの さいこう ${best}</em>` : best !== null && r.points > best ? '<em class="new">さいこう きろく！</em>' : ''}</div></div>
      ${r.next ? `<p class="cert-next">あと <b>${r.next.need}</b>てんで ${r.next.rank}ランク！</p>` : '<p class="cert-next">さいこうの Sランク！ プロの うでまえだ！</p>'}
      <div class="cert-rows">
        <div class="cert-row"><span>せいかく</span><span class="stars">${stars(r.accuracy)}</span></div>
        <div class="cert-row"><span>あんぜん</span><span class="stars">${stars(r.safety)}</span></div>
        <div class="cert-row"><span>はやさ</span><span class="stars">${stars(r.speed)}</span></div>
      </div>
      <p class="cert-title"><span>${r.title}</span></p>
      ${smilesHtml(r)}
      ${albumHtml(r)}
      <p class="cert-facts">じかんどおり ${Object.values(r.onTime || {}).filter(Boolean).length}/2けん・ぴったり ていし ${r.perfectStops}かい・${r.route === 'highway' ? 'こうそくどうろで ビュン！' : 'したみちで コツコツ'}</p>
      <p class="cert-motto">トラックドライバーは カッコイイ！！</p>
      <div class="cert-sign"><span>${dateText()}</span><span><b>${ART.ruby('{芦川商運|あしかわしょううん}')}</b></span></div>
    </div>
    <div class="cert-btns">
      <button class="btn" id="save-btn">がぞうで ほぞん</button>
      <button class="btn btn-sub" id="retry-btn">もういちど あそぶ</button>
    </div>
    <div class="parents">
      <h3>おうちの方へ</h3>
      <p>株式会社芦川商運（静岡市駿河区）は、静岡県内のスーパーや飲食店などに、お米をはじめとする食品を届けている運送会社です。ゲームの中の「仕分け表」「パワーゲート」「納品先ごとのマニュアル」などは、実際の仕事がもとになっています。</p>
      <a href="${SITE.LINKS.company}" target="_blank" rel="noopener">会社のホームページ</a>
      <a href="${SITE.LINKS.recruit}" target="_blank" rel="noopener">採用サイト（はたらく人の声）</a>
    </div>
    <p class="credit">効果音：効果音ラボ</p>`;
  c.hidden = false;
  c.scrollTop = 0;
  onTap($('#save-btn'), () => saveCert(r));
  onTap($('#retry-btn'), () => restart());
}

async function saveCert(r) {
  // アルバムの写真が あれば、その ぶん 下に のばして 入れる（持ち帰る 画像にも 見せ場が のこる）
  const pics = [...album].sort((a, b) => ALBUM_ORDER.indexOf(a.kind) - ALBUM_ORDER.indexOf(b.kind)).slice(0, 4);
  const extra = pics.length ? 430 : 70;
  const W = 1080; const H = 1500 + extra;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const font = (w, s) => `${w} ${s}px 'Zen Kaku Gothic New', sans-serif`;
  g.fillStyle = '#1b264e'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff8ea'; g.fillRect(40, 40, W - 80, H - 80);
  g.strokeStyle = '#d8b84a'; g.lineWidth = 14; g.strokeRect(70, 70, W - 140, H - 140);
  g.lineWidth = 4; g.strokeRect(92, 92, W - 184, H - 184);
  const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = ART.IMG('emblem'); });
  if (img) g.drawImage(img, W / 2 - 130, 130, 260, 260);
  g.textAlign = 'center'; g.fillStyle = '#1b264e';
  g.font = font(900, 96); g.fillText('しゅうりょうしょう', W / 2, 500);
  g.fillStyle = '#c0304a'; g.font = font(900, 54); g.fillText('おこめびん ドライバー', W / 2, 580);
  const rows = [['せいかく', r.accuracy], ['あんぜん', r.safety], ['はやさ', r.speed]];
  rows.forEach(([n, v], i) => {
    const y = 690 + i * 100;
    g.fillStyle = '#fff'; g.fillRect(200, y - 60, W - 400, 84);
    g.fillStyle = '#232838'; g.textAlign = 'left'; g.font = font(900, 48); g.fillText(n, 240, y);
    for (let k = 0; k < 3; k++) { g.fillStyle = k < v ? '#ffc21a' : '#ddd'; drawStar(g, 640 + k * 90, y - 18, 36); }
  });
  g.textAlign = 'center';
  const smiles = [(r.delivered || []).includes('store1'), (r.delivered || []).includes('store2'), r.kidsWaited > 0, true].filter(Boolean).length;
  g.fillStyle = '#1b264e'; g.font = font(900, 44); g.fillText(`きょう えがおに した 人  ${smiles}くみ`, W / 2, 960);
  g.fillStyle = '#f4c20d'; g.fillRect(170, 1000, W - 340, 100);
  g.fillStyle = '#1b264e'; g.font = font(900, 50); g.fillText(r.title, W / 2, 1068);
  g.fillStyle = '#c0304a'; g.font = font(900, 44); g.fillText(`ランク ${r.rank} ・ ${r.points}てん`, W / 2, 1138);
  g.fillStyle = '#c0304a'; g.font = font(900, 50); g.fillText('トラックドライバーは カッコイイ！！', W / 2, 1210);
  // ありがとうの 数と アルバム
  g.fillStyle = '#d8264f'; g.font = font(900, 46); g.fillText(`ありがとう ${r.hearts || 0} こ`, W / 2, 1280);
  if (pics.length) {
    const imgs = await Promise.all(pics.map((p) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = p.src; })));
    const pw = 220; const ph = 275; const gap = 24; const x0 = (W - (pics.length * pw + (pics.length - 1) * gap)) / 2;
    imgs.forEach((im, i) => {
      const x = x0 + i * (pw + gap); const y = 1320;
      g.fillStyle = '#fff'; g.fillRect(x - 10, y - 10, pw + 20, ph + 70); g.strokeStyle = '#ddd'; g.lineWidth = 2; g.strokeRect(x - 10, y - 10, pw + 20, ph + 70);
      if (im) { const sc = Math.max(pw / im.width, ph / im.height); const sw = pw / sc; const sh = ph / sc; g.drawImage(im, (im.width - sw) / 2, (im.height - sh) * 0.6, sw, sh, x, y, pw, ph); }
      g.fillStyle = '#334'; g.font = font(900, 19); g.textAlign = 'center';
      const cap = pics[i].caption; const half = Math.ceil(cap.length / 2);
      g.fillText(cap.slice(0, half), x + pw / 2, y + ph + 26); g.fillText(cap.slice(half), x + pw / 2, y + ph + 50);
    });
  }
  g.textAlign = 'center';
  g.fillStyle = '#232838'; g.font = font(700, 40); g.fillText(dateText(), W / 2, H - 200 + 0);
  g.font = font(900, 56); g.fillText('芦川商運', W / 2, H - 120);
  const url = cv.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'okomebin-shuryosho.png';
  document.body.appendChild(a); a.click(); a.remove();
  // スマホでは長押しで保存できるように、画像も出す
  const card = $('#cert-card');
  if (card && !document.querySelector('.cert-img')) {
    const im = h(`<img class="cert-img" alt="しゅうりょうしょう" src="${url}">`);
    card.replaceWith(im);
    const note = h('<p style="color:#fff;font-weight:900;text-align:center;font-size:calc(var(--u)*3.4)">がぞうを ながおしすると ほぞんできるよ</p>');
    im.after(note);
  }
}
function drawStar(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// ---------- はじめる・もういちど ----------
function start() {
  audio.init();
  audio.sfx('start');
  audio.bgm('main');
  $('#title').hidden = true;
  A.start();
  const jump = params.get('scene');
  if (jump != null && FLOW[Number(jump)]) game.jump(Number(jump));
}
function restart() {
  game = createGame({ config: CONFIG, random: seededRandom(SEED + Math.floor(Math.random() * 1e6)) });
  S = game.state; A = game.actions;
  exposeDebug();
  $('#cert').hidden = true;
  $('#cert').innerHTML = '';
  lastTalk = ''; lastStatus = ''; lastProg = null; album = []; shownHearts = -1;
  $('#title').hidden = false;
  buildScene('title');
}
onTap($('#start'), start);

const muteBtn = $('#mute');
function renderMute() { muteBtn.innerHTML = ART.ICON.sound(!audio.muted); muteBtn.setAttribute('aria-label', audio.muted ? '音を出す' : '音を消す'); }
onTap(muteBtn, () => { audio.init(); audio.setMuted(!audio.muted); renderMute(); });
renderMute();
$('#title-emblem').innerHTML = ART.emblemImg();
ART.preload();

// キーボード（パソコン用）：スペースで運転
window.addEventListener('keydown', (e) => { if (e.code === 'Space' && S.phase === 'drive') { setHold(true); e.preventDefault(); } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') setHold(false); });

// ---------- テスト用の入口 ----------
function exposeDebug() {
  window.__game = { get state() { return S; }, get actions() { return A; }, game, flow: FLOW, config: CONFIG, get sceneKey() { return cur?.key; }, get has3d() { return !!drive; }, get d3() { return drive && drive.debug(); }, get d3api() { return drive; } };
}
exposeDebug();

// ---------- 3Dの読み込み ----------
async function init3D() {
  try {
    await Promise.race([document.fonts.load("900 40px 'Zen Kaku Gothic New'"), new Promise((r) => setTimeout(r, 2500))]);
  } catch {}
  try {
    const [{ createDrive3D }, img] = await Promise.all([import('./drive3d.js'), ART.emblemImage(256)]);
    drive = await createDrive3D($('#three'), { emblemImg: img, config: CONFIG, panda: PANDA, low: LOW });
    drive.onPanda = () => say('むこうから レッサーパンダの トラック！ あれも {芦川商運|あしかわしょううん}の なかまだよ', 'senpai', 4200);
    layout();
    if (cur) drive.setMode(cur.key === 'drive' ? 'drive' : 'off');
  } catch (err) {
    console.warn('3Dを読み込めなかったので、2Dで続けます', err);
    $('#three').classList.add('off');
  }
}

// ---------- 毎コマ ----------
buildScene('title');
let last = performance.now();
function previewDrive(st) {
  // 走る前の説明のあいだも、トラックを道に出しておく
  const f = visualStep(st);
  if (!f || f.kind !== 'drive') return null;
  const L = (S.legs && S.legs[f.leg]) || CONFIG.legs[f.leg];
  return { leg: f.leg, layoutKey: L.key, place: L.place, length: L.length, vmax: L.vmax, s: 0, v: 0, holding: false, arrived: false, choosing: false, pandaAt: null, hazards: L.hazards.map((x) => ({ ...x, revealed: false, active: false, cleared: false, stopT: 0 })) };
}
function loop(now) {
  // 遅い端末でもゲームの時間がずれないように、0.5秒までは追いかける（logic.js の tick と同じ上限）
  const realDt = Math.min(0.5, (now - last) / 1000);
  last = now;
  if (holding) A.hold(true);
  game.tick(realDt * TS);
  handleEvents();
  const key = visualKey(S);
  if (!cur || key !== cur.key) buildScene(key);
  cur.render(S);
  renderChrome(S);
  if (drive) {
    const st = S.drive && S.phase === 'drive' ? S : { ...S, drive: S.drive && cur.key === 'drive' && S.phase !== 'talk' ? S.drive : previewDrive(S) };
    drive.frame(st, Math.min(0.1, realDt) * TS);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
init3D();
