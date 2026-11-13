// 音：効果音は効果音ラボ。BGM は main・drive・cert の3曲
// 音のファイルは se/（art-src/build_sound.py で作る）。読み込めなかった音は、その場で合成した音で代わりに鳴らす
let ctx = null;
let master = null;
let sfxGain = null;
let muted = false;
const buffers = {};
let engineSrc = null;
let engineGain = null;
let ambSrc = null;
let ambGain = null;
let bgmGain = null;
let meter = null;
let motorSrc = null;
let beepTimer = null; let beepEvery = 420;
const bgmEls = {};
let bgmNow = null;
// 声（Gemini TTS で作ったもの。voice/ に入っている）。スタートを押してから読み込む
const VOICES = ['v_intro', 'v_check', 'v_load', 'v_loadfast', 'v_go', 'v_pita', 'v_yield', 'v_back', 'v_backgreat', 'v_thanks', 'v_thanks2', 'v_gohan', 'v_cool', 'v_call1', 'v_call2'];
const voiceBuf = {};
let voiceNow = null;
let voiceWant = null; // まだ読みこめていない声：読みこめたとき、まだ同じ場面なら鳴らす

const SFX_FILES = ['tap', 'good', 'bag', 'miss', 'clear', 'stamp', 'line', 'hazard', 'crossing', 'brake', 'perfect', 'engine', 'air', 'motor', 'door', 'start', 'clap', 'bowl', 'town', 'check'];
const VOL = { tap: 0.5, good: 0.6, bag: 0.9, miss: 0.6, clear: 0.7, stamp: 0.9, line: 0.7, hazard: 0.5, crossing: 0.45, brake: 0.55, perfect: 0.6, air: 0.55, door: 0.7, start: 0.7, clap: 0.6, bowl: 0.8, check: 0.6 };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  // 出口の音量を測る（テストで「本当に音が出ているか」を確かめる）
  meter = ctx.createAnalyser();
  meter.fftSize = 1024;
  master.connect(meter);
  // どのタッチでも音を起こす（ブラウザが止めていても再開する）。iPhone は消音スイッチを無視して鳴らす設定にする
  const wake = () => { if (ctx.state !== 'running') ctx.resume(); };
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  // iPhone 用：最初に無音を1回鳴らして、音の出口を開けておく
  try { const b = ctx.createBuffer(1, 1, 22050); const s0 = ctx.createBufferSource(); s0.buffer = b; s0.connect(ctx.destination); s0.start(0); } catch {}
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.6;
  bgmGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.9;
  sfxGain.connect(master);
  loadAll();
  VOICES.forEach((n) => fetch(`voice/${n}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((ab) => new Promise((ok, ng) => ctx.decodeAudioData(ab, ok, ng))).then((b) => { voiceBuf[n] = b; if (voiceWant && voiceWant.name === n && performance.now() < voiceWant.until) { voiceWant = null; audio.voice(n); } }).catch(() => {}));
  return ctx;
}

async function loadAll() {
  await Promise.all(SFX_FILES.map(async (n) => {
    try {
      const res = await fetch(`se/${n}.mp3`);
      if (!res.ok) return;
      const ab = await res.arrayBuffer();
      buffers[n] = await new Promise((ok, ng) => ctx.decodeAudioData(ab, ok, ng));
    } catch { /* 合成の音で代わりに鳴らす */ }
  }));
}

function play(name, { vol = VOL[name] ?? 0.7, rate = 1 } = {}) {
  const b = buffers[name];
  if (!b) return false;
  const s = ctx.createBufferSource();
  s.buffer = b;
  s.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = vol;
  s.connect(g).connect(sfxGain);
  s.start();
  return true;
}

function loop(name, vol, dest = sfxGain) {
  const b = buffers[name];
  if (!b) return null;
  const s = ctx.createBufferSource();
  s.buffer = b;
  s.loop = true;
  // mp3 の頭としっぽには無音のすき間があるので、少し内側をくり返す（音が途切れない）
  s.loopStart = Math.min(0.08, b.duration * 0.1);
  s.loopEnd = Math.max(s.loopStart + 0.1, b.duration - 0.08);
  const g = ctx.createGain();
  g.gain.value = vol;
  s.connect(g).connect(dest);
  s.start(0, s.loopStart);
  return { s, g };
}

// 読み込み前・読み込めなかったときの代わりの音
function tone(freq, dur, type = 'triangle', vol = 0.2) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const FALLBACK = { tap: () => tone(880, 0.06), good: () => tone(1320, 0.15), bag: () => tone(180, 0.12, 'sine', 0.4), miss: () => tone(260, 0.2, 'square', 0.08), clear: () => [0, 1, 2].forEach((i) => setTimeout(() => tone(880 * 1.26 ** i, 0.2), i * 90)), stamp: () => tone(120, 0.15, 'sine', 0.4), line: () => tone(1500, 0.15, 'sine'), hazard: () => tone(1100, 0.12, 'square', 0.06) };

// テスト用：音の状態を外から読む
function level() {
  if (!meter) return 0;
  const d = new Float32Array(meter.fftSize);
  meter.getFloatTimeDomainData(d);
  let m = 0; for (const v of d) m = Math.max(m, Math.abs(v));
  return Math.round(m * 1000) / 1000;
}
window.__audio = () => ({ voices: Object.keys(voiceBuf).length, voiceNow, level: level(), ctx: ctx && ctx.state, loaded: Object.keys(buffers).length, bgm: Object.fromEntries(Object.entries(bgmEls).map(([k, v]) => [k, { buf: !!v.buf, playing: !!v.node }])), muted });

// 救急車のサイレン（ピーポー：960Hz と 770Hz を 0.65秒ずつ）。vol で近さ、pitch で通りすぎた音（少し低く）
let siren = null;
function sirenSet(vol, pitch = 1) {
  if (!ctx) return;
  if (vol <= 0) { if (siren) { const sr = siren; siren = null; sr.g.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(() => { try { sr.o.stop(); clearInterval(sr.iv); } catch {} }, 700); } return; }
  if (!siren) {
    const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
    o.type = 'square'; f.type = 'lowpass'; f.frequency.value = 2400; g.gain.value = 0;
    o.connect(f).connect(g).connect(sfxGain); o.start();
    siren = { o, g, hi: true, pitch: 1, iv: null };
    const flip = () => { if (!siren) return; siren.hi = !siren.hi; siren.o.frequency.setTargetAtTime((siren.hi ? 960 : 770) * siren.pitch, ctx.currentTime, 0.01); };
    flip(); siren.iv = setInterval(flip, 650);
  }
  siren.pitch = pitch;
  siren.g.gain.setTargetAtTime(Math.min(0.16, vol * 0.16), ctx.currentTime, 0.2);
}

export const audio = {
  siren: sirenSet,
  init() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
  get muted() { return muted; },
  setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  },
  sfx(name, opt) {
    if (!ctx) return;
    if (!play(name, opt)) FALLBACK[name]?.();
  },
  // BGM：'main'（ふだん）・'drive'（運転中）・'cert'（修了証）・null（止める）。読み込みはスタートを押してから
  // iPhone は audio 要素の音量を変えられないので、効果音と同じく Web Audio で鳴らす
  bgm(track) {
    if (!ctx || track === bgmNow) return;
    const prev = bgmNow ? bgmEls[bgmNow] : null;
    bgmNow = track;
    if (prev && prev.node) { const n = prev.node; prev.node = null; n.g.gain.setTargetAtTime(0, ctx.currentTime, 0.25); setTimeout(() => { try { n.s.stop(); } catch {} }, 1500); }
    if (!track) return;
    const startIt = () => {
      const e = bgmEls[track];
      if (bgmNow !== track || !e.buf || e.node) return;
      const s = ctx.createBufferSource();
      s.buffer = e.buf; s.loop = track !== 'cert'; // 修了証の 曲は 1回だけ（最後は 静かに 小さくなる）
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(g).connect(bgmGain);
      s.start();
      g.gain.setTargetAtTime(track === 'drive' ? 0.5 : 0.55, ctx.currentTime, 0.4);
      e.node = { s, g };
    };
    if (!bgmEls[track]) {
      bgmEls[track] = { buf: null, node: null };
      fetch(`se/bgm_${track}.mp3`).then((r) => r.arrayBuffer()).then((ab) => new Promise((ok, ng) => ctx.decodeAudioData(ab, ok, ng)))
        .then((buf) => { bgmEls[track].buf = buf; startIt(); }).catch(() => {});
    } else startIt();
  },
  // 声：鳴っている声は止めて、新しい声を鳴らす。声の間は曲を小さくする。鳴った長さ（秒）を返す（無ければ 0）
  voice(name, { wait = 0 } = {}) {
    voiceWant = null;
    if (voiceNow && (!name || voiceBuf[name])) { try { voiceNow.s.stop(); } catch {} voiceNow = null; bgmGain && bgmGain.gain.setTargetAtTime(0.6, ctx.currentTime, 0.3); }
    if (!name || !ctx) return 0;
    if (!voiceBuf[name]) { if (wait) voiceWant = { name, until: performance.now() + wait }; return 0; }
    const s = ctx.createBufferSource(); s.buffer = voiceBuf[name];
    const g = ctx.createGain(); g.gain.value = 1.15;
    s.connect(g).connect(master);
    const t = ctx.currentTime;
    bgmGain.gain.cancelScheduledValues(t); bgmGain.gain.setTargetAtTime(0.18, t, 0.08);
    s.start();
    const me = { s, name }; voiceNow = me;
    s.onended = () => { if (voiceNow === me) { voiceNow = null; bgmGain.gain.setTargetAtTime(0.6, ctx.currentTime, 0.4); } };
    return s.buffer.duration;
  },
  // エンジンの音（speed は 0〜1、-1 で止める）
  engine(speed) {
    if (!ctx) return;
    if (speed < 0) {
      if (engineSrc) { const e = engineSrc; engineSrc = null; e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(() => { try { e.s.stop(); } catch {} }, 600); }
      if (ambSrc) { const a = ambSrc; ambSrc = null; a.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => { try { a.s.stop(); } catch {} }, 1200); }
      return;
    }
    if (!engineSrc) engineSrc = loop('engine', 0);
    if (!ambSrc) ambSrc = loop('town', 0);
    const t = ctx.currentTime;
    if (engineSrc) {
      engineSrc.s.playbackRate.setTargetAtTime(0.75 + speed * 0.6, t, 0.2);
      engineSrc.g.gain.setTargetAtTime(0.18 + speed * 0.3, t, 0.2);
    }
    if (ambSrc) ambSrc.g.gain.setTargetAtTime(0.18, t, 0.5);
  },
  // パワーゲートが動くときのモーター音と「ピッ ピッ」。every：ピッの間（バックでは かべに近いほど速くなる）
  beep(on, every = 420) {
    if (!ctx) return;
    if (on && beepTimer && beepEvery !== every) { clearInterval(beepTimer); beepEvery = every; beepTimer = setInterval(() => tone(1760, 0.1, 'square', 0.05), every); return; }
    if (on && !beepTimer) {
      motorSrc = loop('motor', 0.35);
      tone(1760, 0.1, 'square', 0.05);
      beepEvery = every;
      beepTimer = setInterval(() => tone(1760, 0.1, 'square', 0.05), every);
    } else if (!on && beepTimer) {
      clearInterval(beepTimer); beepTimer = null;
      if (motorSrc) { const m = motorSrc; motorSrc = null; m.g.gain.setTargetAtTime(0, ctx.currentTime, 0.08); setTimeout(() => { try { m.s.stop(); } catch {} }, 300); }
    }
  },
};

function fade(el, to, ms, done) {
  const from = el.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(step); else done?.();
  };
  requestAnimationFrame(step);
}
