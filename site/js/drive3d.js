// 3Dの場面：タイトルで回るトラックと、静岡を走る場面（Three.js で直接組み立てる。外部の3D素材なし）
// 日本は左側通行：自分のトラックは左の車線、向こうから来る車は右の車線
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const FONT = "'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif";

const NOSE = 3.7; // トラックの位置から 鼻先までの長さ（m）

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 標識車の矢印板：黒い板に、オレンジの光の点で →（ふちは黄色と黒のしま）
function arrowBoardTex() {
  return canvasTex(460, 290, (g, w, h) => {
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    const st = 22;
    for (let i = -h; i < w + h; i += st * 2) {
      g.fillStyle = '#f4c20d';
      for (const [y0, y1] of [[0, 18], [h - 18, h]]) { g.beginPath(); g.moveTo(i, y0); g.lineTo(i + st, y0); g.lineTo(i + st + (y1 - y0), y1); g.lineTo(i + (y1 - y0), y1); g.fill(); }
    }
    // 矢印の形の中に、光の点を ならべる
    const inArrow = (x, y) => { const cy = h / 2; if (x > 90 && x < 270 && Math.abs(y - cy) < 26) return true; if (x >= 250 && x < 380) { const half = (380 - x) * 0.85; return Math.abs(y - cy) < half; } return false; };
    for (let y = 36; y < h - 30; y += 17) for (let x = 60; x < w - 50; x += 17) {
      if (!inArrow(x, y)) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, 8); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(0.35, '#ffa21a'); gr.addColorStop(1, 'rgba(255,120,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
    }
  });
}

function textTex(text, { w = 512, h = 128, bg = '#f4c20d', fg = '#111', size = 84, weight = 900, border = null, sub = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${weight} ${size}px ${FONT}`;
    g.fillText(text, w / 2, sub ? h * 0.4 : h / 2 + size * 0.04);
    if (sub) { g.font = `700 ${size * 0.45}px ${FONT}`; g.fillText(sub, w / 2, h * 0.78); }
  });
}

const mat = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opt });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

// ---------- トラック ----------
export function buildTruck({ emblemTex, kind = 'ashikawa' } = {}) {
  const g = new THREE.Group();
  const white = mat('#fbfbfb', { roughness: 0.35 });
  const chrome = mat('#dfe4ea', { metalness: 0.9, roughness: 0.18 });
  const dark = mat('#2b2f36', { roughness: 0.8 });
  const glass = mat('#203a5c', { roughness: 0.08, metalness: 0.4 });
  const big = kind === 'panda';
  const L = big ? 8.2 : 5.6; // 荷台の長さ
  const boxH = big ? 2.9 : 2.6;

  // シャーシ
  const boxEnd = -1.5 + L;
  const chassis = box(2.1, 0.35, boxEnd + 3.4, dark); chassis.position.set(0, 0.65, (boxEnd - 3.4) / 2); g.add(chassis);
  // 運転席
  const cab = box(2.3, 2.15, 1.9, white); cab.position.set(0, 1.6, -2.65); g.add(cab);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.95), glass); ws.position.set(0, 2.05, -3.605); ws.rotation.y = Math.PI; g.add(ws);
  for (const sx of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), glass); sw.position.set(sx * 1.151, 2.05, -2.85); sw.rotation.y = sx * Math.PI / 2; g.add(sw);
    if (emblemTex) {
      const em = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32), new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true }));
      em.position.set(sx * 1.155, 1.35, -2.55); em.rotation.y = sx * Math.PI / 2; g.add(em);
    }
    // ミラー
    const arm = box(0.08, 0.08, 0.5, chrome); arm.position.set(sx * 1.3, 2.3, -3.45); g.add(arm);
    const mir = box(0.12, 0.6, 0.3, chrome); mir.position.set(sx * 1.38, 2.0, -3.62); g.add(mir);
  }
  const grille = box(1.6, 0.5, 0.05, dark); grille.position.set(0, 1.0, -3.61); g.add(grille);
  const bumper = box(2.36, 0.32, 0.25, chrome); bumper.position.set(0, 0.62, -3.62); g.add(bumper);
  for (const sx of [-1, 1]) {
    const hl = box(0.42, 0.22, 0.06, new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: '#fff2b0', emissiveIntensity: 0.8 })); hl.position.set(sx * 0.85, 0.98, -3.63); g.add(hl);
  }
  // 屋根の上：風よけ＋黄色い社名板＋紋章
  const def = box(2.2, 0.95, 1.0, white); def.position.set(0, 3.15, -2.45); g.add(def);
  const signMat = new THREE.MeshStandardMaterial({ map: textTex('芦川商運', { w: 512, h: 120, size: 92 }), roughness: 0.4, emissive: '#3a2a00', emissiveIntensity: 0.15 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.46), signMat); sign.position.set(0, 2.98, -2.972); sign.rotation.y = Math.PI; g.add(sign);
  const signFrame = box(2.02, 0.52, 0.04, dark); signFrame.position.set(0, 2.98, -2.93); g.add(signFrame);
  if (emblemTex) {
    const em = new THREE.Mesh(new THREE.CircleGeometry(0.21, 32), new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true }));
    em.position.set(0, 3.42, -2.958); em.rotation.y = Math.PI; g.add(em);
  }
  // 荷台
  let boxMat;
  if (big) {
    const side = pandaSideTex();
    boxMat = [
      new THREE.MeshStandardMaterial({ map: side.r, roughness: 0.5 }), // +x（右）
      new THREE.MeshStandardMaterial({ map: side.l, roughness: 0.5 }), // -x（左）
      mat('#f3dea9'), mat('#f3dea9'), new THREE.MeshStandardMaterial({ map: side.back, roughness: 0.5 }), mat('#f3dea9'),
    ];
  } else {
    const rib = canvasTex(256, 64, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#eef1f4'); gr.addColorStop(1, '#b9c1ca');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(80,90,100,.35)'; c.lineWidth = 2;
      for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    });
    rib.wrapS = THREE.RepeatWrapping; rib.repeat.set(2, 1);
    const silver = new THREE.MeshStandardMaterial({ map: rib, metalness: 0.35, roughness: 0.32 });
    const rear = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#d6dbe1'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a939d'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
      c.beginPath(); c.moveTo(w / 2, 10); c.lineTo(w / 2, h - 10); c.stroke();
      c.fillStyle = '#e33'; c.font = `900 26px ${FONT}`; c.textAlign = 'center'; c.fillText('リフト注意', w / 2, h - 30);
    });
    boxMat = [silver, silver, mat('#e6e9ec', { metalness: 0.4 }), mat('#9aa3ad'), new THREE.MeshStandardMaterial({ map: rear, metalness: 0.3, roughness: 0.45 }), mat('#d6dbe1')];
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, boxH, L), boxMat); body.position.set(0, 0.85 + boxH / 2, -1.55 + L / 2 + 0.05); g.add(body);
  // テールランプ
  const tailMat = new THREE.MeshStandardMaterial({ color: '#c81e1e', emissive: '#ff2020', emissiveIntensity: 0.3 });
  for (const sx of [-1, 1]) { const tl = box(0.36, 0.2, 0.06, tailMat); tl.position.set(sx * 0.95, 0.72, boxEnd + 0.04); g.add(tl); }
  // タイヤ
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 20); wheelGeo.rotateZ(Math.PI / 2);
  const tire = mat('#1d1f24', { roughness: 0.9 });
  const hub = mat('#c9cdd3', { metalness: 0.6, roughness: 0.3 });
  const wheels = [];
  const axles = big ? [-2.7, L - 3.2, L - 2.0] : [-2.7, L - 2.6];
  for (const z of axles) {
    for (const sx of [-1, 1]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(wheelGeo, tire));
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.44, 12).rotateZ(Math.PI / 2), hub); w.add(h);
      w.position.set(sx * 1.02, 0.5, z);
      g.add(w); wheels.push(w);
    }
  }
  g.userData = { wheels, tailMat, length: L + 2.3 };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// レッサーパンダのラッピングトラックの荷台（静岡市の広報トラック。絵はオリジナルで描き直し）
function pandaSideTex() {
  const draw = (flip) => canvasTex(1024, 360, (c, w, h) => {
    c.fillStyle = '#f3dea9'; c.fillRect(0, 0, w, h);
    const faceX = flip ? w * 0.74 : w * 0.26;
    // 大きな顔
    c.save(); c.translate(faceX, h * 0.52);
    c.fillStyle = '#b5482c'; for (const ex of [-120, 120]) { c.beginPath(); c.ellipse(ex, -95, 52, 58, ex < 0 ? -0.4 : 0.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; for (const ex of [-120, 120]) { c.beginPath(); c.ellipse(ex, -88, 28, 34, ex < 0 ? -0.4 : 0.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#d0613a'; c.beginPath(); c.ellipse(0, 10, 175, 140, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(-62, -40, 34, 20, -0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(62, -40, 34, 20, 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 70, 90, 62, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a2414'; for (const ex of [-60, 60]) { c.beginPath(); c.ellipse(ex, 4, 18, 24, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; for (const ex of [-54, 66]) { c.beginPath(); c.arc(ex, -4, 6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#2a1a14'; c.beginPath(); c.ellipse(0, 46, 22, 14, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2a1a14'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 58); c.quadraticCurveTo(-20, 86, -36, 74); c.moveTo(0, 58); c.quadraticCurveTo(20, 86, 36, 74); c.stroke();
    c.restore();
    // 文字（トラックに書かれている言葉）
    const tx = flip ? w * 0.3 : w * 0.7;
    c.fillStyle = '#d4362c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 58px ${FONT}`; c.fillText('レッサーパンダの', tx, h * 0.34);
    c.font = `900 74px ${FONT}`; c.fillText('聖地★静岡市', tx, h * 0.56);
    c.fillStyle = '#333'; c.font = `900 30px ${FONT}`; c.fillText('芦川商運', flip ? w * 0.08 : w * 0.92, h * 0.9);
  });
  const back = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f3dea9'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d4362c';
    for (let i = 0; i < 9; i++) { const x = 30 + (i % 3) * 98; const y = 40 + Math.floor(i / 3) * 88; c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x - 14, y - 16, 7, 0, Math.PI * 2); c.arc(x + 14, y - 16, 7, 0, Math.PI * 2); c.fill(); }
  });
  return { r: draw(false), l: draw(true), back };
}

// ---------- トラック（Codex の三面図を箱の面に貼る。2Dの絵と同じ絵柄になる） ----------
// tex = { side, front, rear }（img/truck_*.webp）。kind 'panda' は荷台の横をレッサーパンダの絵にする
export function buildTruckTex(tex, { kind = 'ashikawa' } = {}) {
  const g = new THREE.Group();
  const L = 7.2; // 全長
  const H = L * (tex.side.image.height / tex.side.image.width); // 横から見た高さ（風よけのてっぺんまで）
  const cargoTop = H * (1 - 45 / 422);
  const cargoFrontZ = -L / 2 + L * (1 - 545 / 762); // 荷台の前のはし
  const rearZ = L / 2 - L * (14 / 762);
  const unlit = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, side: THREE.FrontSide, ...extra });
  let sideTex = tex.side;
  if (kind === 'panda') sideTex = pandaSide(tex.side);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(L, H), unlit(sideTex));
  sideR.rotation.y = Math.PI / 2; sideR.position.set(1.21, H / 2, 0); g.add(sideR);
  const flipped = sideTex.clone(); flipped.wrapS = THREE.RepeatWrapping; flipped.repeat.x = -1; flipped.offset.x = 1; flipped.needsUpdate = true;
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(L, H), unlit(flipped));
  sideL.rotation.y = -Math.PI / 2; sideL.position.set(-1.21, H / 2, 0); g.add(sideL);
  const fW = H * (tex.front.image.width / tex.front.image.height);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(fW, H), unlit(tex.front));
  front.rotation.y = Math.PI; front.position.set(0, H / 2, -L / 2 - 0.02); g.add(front);
  const rH = cargoTop;
  const rW = rH * (tex.rear.image.width / tex.rear.image.height);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(rW, rH), unlit(tex.rear));
  rear.position.set(0, rH / 2, rearZ + 0.02); g.add(rear);
  // 中身の箱（ななめから見ても向こうが透けないように）
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const cargoLen = rearZ - cargoFrontZ;
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.38, cargoTop - 1.05, cargoLen), [mat('#c9cfd6'), mat('#c9cfd6'), mat(kind === 'panda' ? '#f3dea9' : '#e4e8ec'), mat('#8a929b'), mat('#c9cfd6'), mat('#c9cfd6')]);
  cargo.position.set(0, 1.05 + (cargoTop - 1.05) / 2, cargoFrontZ + cargoLen / 2); g.add(cargo);
  // 荷台の屋根の筋（上から見たときの質感）
  const ribs = new THREE.Mesh(new THREE.PlaneGeometry(2.3, cargoLen - 0.1), new THREE.MeshBasicMaterial({ map: roofTex(kind), transparent: false }));
  ribs.rotation.x = -Math.PI / 2; ribs.position.set(0, cargoTop + 0.012, cargoFrontZ + cargoLen / 2); g.add(ribs);
  const cabLen = cargoFrontZ - (-L / 2);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.36, H * 0.62, cabLen - 0.1), mat('#f4f6f8'));
  cab.position.set(0, 0.55 + H * 0.31, -L / 2 + cabLen / 2); g.add(cab);
  const defl = new THREE.Mesh(new THREE.BoxGeometry(2.3, H * 0.26, cabLen * 0.55), mat('#f7f8fa'));
  defl.position.set(0, H * 0.86, -L / 2 + cabLen * 0.45); g.add(defl);
  const under = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, L - 0.4), mat('#2a2d33'));
  under.position.set(0, 0.55, 0); g.add(under);
  // 足元の影（光の向きに関係なく、いつも下に落ちる柔らかい影）
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, L + 1.2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
  // テールランプ（ブレーキで光る）
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff3b2f', transparent: true, opacity: 0 });
  for (const sx of [-1, 1]) { const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), tailMat); tl.position.set(sx * rW * 0.37, rH * 0.17, rearZ + 0.04); g.add(tl); }
  g.userData = { wheels: [], tailMat, length: L, tex: true };
  return g;
}

let _blob = null;
function blobTex() {
  if (_blob) return _blob;
  _blob = canvasTex(128, 256, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.7, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.scale(1, h / w); c.translate(0, 0); c.fillStyle = gr; c.fillRect(0, 0, w, w); c.restore();
  });
  return _blob;
}

function roofTex(kind) {
  return canvasTex(128, 512, (c, w, h) => {
    c.fillStyle = kind === 'panda' ? '#efe0b8' : '#dfe4e9'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(90,100,110,.35)'; c.lineWidth = 3;
    for (let y = 8; y < h; y += 18) { c.beginPath(); c.moveTo(4, y); c.lineTo(w - 4, y); c.stroke(); }
    c.strokeStyle = 'rgba(40,40,40,.5)'; c.lineWidth = 6; c.strokeRect(2, 2, w - 4, h - 4);
  });
}

// レッサーパンダのトラック：芦川のトラックの横の絵の、荷台のところだけクリーム色の絵にする（絵はオリジナルで描き直し）
function pandaSide(sideTex) {
  const img = sideTex.image;
  return canvasTex(img.width, img.height, (c, w, h) => {
    c.drawImage(img, 0, 0);
    const x0 = w * 0.03; const x1 = w * 0.705; const y0 = h * 0.12; const y1 = h * 0.7;
    c.fillStyle = '#f3dea9'; c.strokeStyle = '#3a3a3a'; c.lineWidth = 3;
    c.fillRect(x0, y0, x1 - x0, y1 - y0); c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    const cx = x0 + (x1 - x0) * 0.27; const cy = y0 + (y1 - y0) * 0.55; const s = (y1 - y0) / 360;
    c.save(); c.translate(cx, cy); c.scale(s, s);
    c.fillStyle = '#b5482c'; for (const ex of [-120, 120]) { c.beginPath(); c.ellipse(ex, -95, 52, 58, ex < 0 ? -0.4 : 0.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; for (const ex of [-120, 120]) { c.beginPath(); c.ellipse(ex, -88, 28, 34, ex < 0 ? -0.4 : 0.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#d0613a'; c.beginPath(); c.ellipse(0, 10, 175, 140, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(-62, -40, 34, 20, -0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(62, -40, 34, 20, 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 70, 90, 62, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a2414'; for (const ex of [-60, 60]) { c.beginPath(); c.ellipse(ex, 4, 18, 24, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; for (const ex of [-54, 66]) { c.beginPath(); c.arc(ex, -4, 6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#2a1a14'; c.beginPath(); c.ellipse(0, 46, 22, 14, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = '#d4362c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const tx = x0 + (x1 - x0) * 0.7;
    c.font = `900 ${Math.round((y1 - y0) * 0.13)}px ${FONT}`; c.fillText('レッサーパンダの', tx, y0 + (y1 - y0) * 0.38);
    c.font = `900 ${Math.round((y1 - y0) * 0.17)}px ${FONT}`; c.fillText('聖地★静岡市', tx, y0 + (y1 - y0) * 0.62);
  });
}

export function loadTruckTex() {
  const loader = new THREE.TextureLoader();
  const load = (n) => new Promise((ok, ng) => loader.load(`img/truck_${n}.webp`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok(t); }, undefined, ng));
  return Promise.all(['side', 'front', 'rear'].map(load)).then(([side, front, rear]) => ({ side, front, rear }));
}

// ---------- 景色の絵（Codex） ----------
export function loadScenery() {
  // cone・arrowtruck・tollgate・streetlight・soundwall・fence は Codex の絵が届いたら ここへ足す（いまは 立体の代わりで 描く）
  const names = ['car_red', 'car_white', 'car_navy', 'car_kei', 'ambulance_rear', 'ambulance_side', 'ambulance_front', 'bld1', 'bld2', 'bld3', 'bld4', 'bld5', 'bld6', 'p_vending', 'p_flower', 'p_bike', 'p_bollard', 'p_veggie', 'p_kid1', 'p_kid2', 'p_walker', 'p_post', 'p_planter', 'far', 'cloud1', 'cloud2', 'tree_round', 'pole', 'teabush', 'kid_walk', 'facade4', 'facade5'];
  const loader = new THREE.TextureLoader();
  return Promise.all(names.map((n) => new Promise((ok) => loader.load(`img/${n}.webp`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok([n, t]); }, undefined, () => ok([n, null])))))
    .then((list) => Object.fromEntries(list.filter(([, t]) => t)));
}

// 前を走る車（Codex のうしろ姿の絵の板＋奥行きの箱＋影）。止まるとブレーキランプが光る
const CAR_SPEC = { car_red: [1.48, 0.55], car_white: [1.85, 0.52], car_navy: [1.8, 0.5], car_kei: [1.48, 0.27] };
function buildCarBoard(tex, name) {
  const g = new THREE.Group();
  const [w, lampY] = CAR_SPEC[name];
  const h = w * (tex.image.height / tex.image.width);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4 }));
  face.position.set(0, h / 2, 0); g.add(face);
  // 横から見えたときの 車体（下）と 窓のある屋根（上）。色は その車の色に そろえる
  const col = { car_red: '#c8322b', car_white: '#e6e9ee', car_navy: '#2b3a5c', car_kei: '#e7c23c' }[name] || '#8a919b';
  const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.46, 3.6), new THREE.MeshLambertMaterial({ color: col }));
  body.position.set(0, h * 0.3, -1.85); g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.34, 2.2), [col, col, col, '#3d4a5c', col, col].map((c) => new THREE.MeshLambertMaterial({ color: c })));
  cabin.position.set(0, h * 0.68, -1.9); g.add(cabin);
  const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, h * 0.2, 1.9), new THREE.MeshLambertMaterial({ color: '#3d4a5c' }));
  win.position.set(0, h * 0.7, -1.9); g.add(win);
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2a1f', transparent: true, opacity: 0, depthWrite: false });
  for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.2, h * 0.11), tailMat); t.position.set(sx * w * 0.37, h * lampY, 0.02); g.add(t); }
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.3, 4.6), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.02, -1.6); g.add(sh);
  g.userData = { tailMat, board: true };
  return g;
}

// 同じ絵の板をまとめて1回で描く（list = [[x, z, 高さ], ...]）。カメラはほぼうしろから見るので、板は +z を向ける
function boards(tex, list) {
  if (!tex || !list.length) return new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }), list.length);
  const a = tex.image.width / tex.image.height;
  const m = new THREE.Matrix4();
  list.forEach(([x, z, h], i) => { m.makeScale(h * a, h, 1); m.setPosition(x, 0, z); im.setMatrixAt(i, m); });
  return im;
}

// 道ぞいに続く板（防音壁・フェンス）。板は道と平行（横から見える向き）に、len の長さで並べる
function boardsAlong(tex, list, len) {
  if (!tex || !list.length) return new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0); geo.rotateY(Math.PI / 2);
  tex.wrapS = THREE.RepeatWrapping;
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), list.length);
  const m = new THREE.Matrix4();
  list.forEach(([x, z, h], i) => { m.makeScale(1, h, len); m.setPosition(x, 0, z); im.setMatrixAt(i, m); });
  return im;
}

// いつもこちらを向く板（下のはしが地面）
function sprite(tex, h, x, z) {
  if (!tex) return new THREE.Group();
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.35 });
  const sp = new THREE.Sprite(m);
  sp.center.set(0.5, 0);
  sp.scale.set(h * (tex.image.width / tex.image.height), h, 1);
  sp.position.set(x, 0, z);
  return sp;
}

// ---------- 人・車 ----------
function buildKid() {
  const g = new THREE.Group();
  const skin = mat('#ffd9b8');
  const legs = box(0.28, 0.45, 0.18, mat('#2b3a66')); legs.position.y = 0.23; g.add(legs);
  const body = box(0.38, 0.42, 0.24, mat('#ffffff')); body.position.y = 0.66; g.add(body);
  const pack = box(0.34, 0.36, 0.18, mat('#c0304a')); pack.position.set(0, 0.7, 0.2); g.add(pack);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin); head.position.y = 1.03; g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 16), mat('#ffd400')); hat.position.y = 1.18; g.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), mat('#ffd400')); brim.position.y = 1.13; g.add(brim);
  g.scale.setScalar(1.25);
  return g;
}

function buildCar(color = '#e2483d') {
  const g = new THREE.Group();
  const body = box(1.7, 0.7, 3.8, mat(color, { roughness: 0.35 })); body.position.y = 0.7; g.add(body);
  const top = box(1.5, 0.6, 2.0, mat('#203a5c', { roughness: 0.1, metalness: 0.3 })); top.position.set(0, 1.3, 0.2); g.add(top);
  const tailMat = new THREE.MeshStandardMaterial({ color: '#b41414', emissive: '#ff2020', emissiveIntensity: 0.2 });
  for (const sx of [-1, 1]) { const t = box(0.3, 0.16, 0.05, tailMat); t.position.set(sx * 0.6, 0.85, 1.92); g.add(t); }
  const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14).rotateZ(Math.PI / 2);
  for (const z of [-1.2, 1.2]) for (const sx of [-1, 1]) { const w = new THREE.Mesh(wg, mat('#1d1f24')); w.position.set(sx * 0.82, 0.34, z); g.add(w); }
  g.userData = { tailMat };
  return g;
}

function buildSignal() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.6, 10), mat('#8a9099')); pole.position.set(0, 2.8, 0); g.add(pole);
  const arm = box(3.4, 0.14, 0.14, mat('#8a9099')); arm.position.set(-1.7, 5.4, 0); g.add(arm);
  const housing = box(1.6, 0.55, 0.4, mat('#59606a')); housing.position.set(-2.8, 5.1, 0); g.add(housing);
  const lamps = [];
  const cols = ['#22d16a', '#ffc21a', '#ff3b30'];
  cols.forEach((c, i) => {
    const m = new THREE.MeshStandardMaterial({ color: '#333', emissive: c, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), m);
    lamp.position.set(-2.8 - 0.5 + i * 0.5, 5.1, 0.205);
    g.add(lamp); lamps.push(m);
  });
  g.userData = { lamps, cols };
  return g;
}

function setSignal(sig, which) {
  const { lamps, cols } = sig.userData;
  lamps.forEach((m, i) => { const on = i === which; m.emissiveIntensity = on ? 2.2 : 0; m.color.set(on ? cols[i] : '#333'); });
}

// ---------- 本体 ----------
export async function createDrive3D(canvas, { emblemImg = null, config, panda = true, low = false } = {}) {
  const truckTex = await loadTruckTex().catch(() => null);
  const T = await loadScenery().catch(() => ({}));
  // low：テスト用の軽い画質（自動ブラウザは3Dの計算が遅いため）
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(low ? 0.4 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  // まわりの景色の映りこみ（白い運転席・銀色の荷台・メッキがきれいに見える）
  if (!low) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
  }
  const sky = new THREE.Color('#bfe6ff');
  scene.background = canvasTex(4, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1f7fe8'); gr.addColorStop(0.55, '#7cc4f7'); gr.addColorStop(1, '#d6efff');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(sky, 160, 620);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2000);
  scene.add(new THREE.HemisphereLight('#e6f4ff', '#6b7a5a', 1.3));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
  sun.position.set(-30, 60, 20);
  scene.add(sun);

  let emblemTex = null;
  if (emblemImg) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    c.getContext('2d').drawImage(emblemImg, 0, 0, 256, 256);
    emblemTex = new THREE.CanvasTexture(c); emblemTex.colorSpace = THREE.SRGBColorSpace;
  }
  const truck = truckTex ? buildTruckTex(truckTex) : buildTruck({ emblemTex });
  scene.add(truck);

  let world = new THREE.Group(); scene.add(world);
  // 遠景（富士山・山なみ・駿河湾。Codex の絵）と雲は、いつも地平線のところに見えるよう、トラックについてくる
  const far = new THREE.Group(); scene.add(far);
  if (T.far) {
    const fw = 1750; const fh = fw * (T.far.image.height / T.far.image.width);
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ map: T.far, transparent: true, alphaTest: 0.3, fog: false, depthWrite: false }));
    fm.position.set(290, fh / 2 - 30, -1350); far.add(fm); // 富士山（絵の左から25%）が、まん中より少し左に見える位置
  }
  for (const [n, x, y, z, w] of [['cloud1', -300, 330, -1250, 260], ['cloud2', 220, 380, -1300, 300], ['cloud1', 560, 250, -1250, 200], ['cloud2', -700, 230, -1200, 220]]) {
    if (!T[n]) continue;
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(w, w * (T[n].image.height / T[n].image.width)), new THREE.MeshBasicMaterial({ map: T[n], transparent: true, alphaTest: 0.2, fog: false, depthWrite: false }));
    cm.position.set(x, y, z); far.add(cm);
  }
  far.renderOrder = -1;
  let mode = 'title';
  let leg = null;
  let hz = []; // じゃまの3Dの物
  let laneObjs = []; // 車線の合図の3Dの物
  let blinkers = []; // 点めつする 矢印板
  let pacers = []; // 前を同じ向きに走る車
  let pandaTruck = null;
  let pandaS = null;
  let introT = 0;
  let laneX = -1.8;
  let ambObj = null; let pandaPull = 0; let walkers = []; let ambPull = 0;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let wheelRot = 0;
  let time = 0;
  let pandaSeen = false;
  let pandaTalked = false;
  let arriveT = 0;

  const fuji = (x, z, s = 1) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.ConeGeometry(260 * s, 170 * s, 48, 1, true), mat('#7d9bd0', { roughness: 1, fog: false }));
    m.position.y = 85 * s; g.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(78 * s, 52 * s, 48), mat('#ffffff', { roughness: 1, fog: false }));
    cap.position.y = 170 * s - 26 * s + 1; g.add(cap);
    g.position.set(x, -2, z);
    return g;
  };

  function clearWorld() {
    scene.remove(world);
    world.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    world = new THREE.Group();
    scene.add(world);
    hz = [];
    pacers = [];
    if (pandaTruck) { scene.remove(pandaTruck); pandaTruck = null; }
    pandaS = null;
  }

  // ---------- タイトル ----------
  function buildTitle() {
    clearWorld();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), mat('#9cc48a', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; world.add(ground);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, 0.25, 48), mat('#d9dde2'));
    pad.position.y = 0.12; world.add(pad);
    world.add(fuji(-40, -380, 1.1));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 8), mat('#3f8f4f'));
      t.position.set(Math.cos(a) * 26, 3, Math.sin(a) * 26 - 8); world.add(t);
    }
    truck.position.set(0, 0.25, 0);
    truck.rotation.set(0, 0, 0);
  }

  // ---------- 道 ----------
  function buildLeg(legId, layout) {
    clearWorld();
    const L = layout || config.legs[legId]; // この回の道（毎回ちがう ならび）
    leg = { id: legId, key: L.key, ...L, bridgeAt: legId === 'leg1' ? 60 : null };
    const highway = legId === 'highway';
    const tea = legId === 'local';
    laneX = highway ? -5.4 : -1.8;
    const len = L.length + 160;
    const zEnd = -len;
    // 地面
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, len + 400), mat(highway ? '#7fae6a' : '#a7b59a', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -len / 2 + 60); world.add(ground);
    // 道路
    const roadW = highway ? 16 : 8;
    const roadX = highway ? -0.4 : 0;
    // アスファルト：濃い 灰色に 細かい つぶと、ところどころ 色の ちがう つぎはぎ（その場で 描くので 重さは ふえない）
    const asph = canvasTex(256, 512, (c, w, h) => {
      c.fillStyle = '#7d838d'; c.fillRect(0, 0, w, h);
      let sd = 11; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let i = 0; i < 9000; i++) { const v = rr(); c.fillStyle = v < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; c.fillRect(rr() * w, rr() * h, 1.5, 1.5); }
    });
    asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(roadW / 8, (len + 120) / 16);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, len + 120), new THREE.MeshLambertMaterial({ map: asph }));
    road.rotation.x = -Math.PI / 2; road.position.set(roadX, 0, -len / 2 + 50); world.add(road);
    // 白い線
    const lineMat = new THREE.MeshBasicMaterial({ color: '#f4f4f4' });
    const dashGeo = new THREE.PlaneGeometry(0.16, 3); dashGeo.rotateX(-Math.PI / 2);
    const dashX = highway ? [-3.6, 2.8] : [0];
    const dashes = new THREE.InstancedMesh(dashGeo, highway ? lineMat : new THREE.MeshBasicMaterial({ color: '#ffd23a' }), Math.ceil(len / 8) * dashX.length + 10);
    let di = 0; const m4 = new THREE.Matrix4();
    for (const x of dashX) for (let z = 40; z > zEnd; z -= 8) { m4.makeTranslation(x, 0.02, z); dashes.setMatrixAt(di++, m4); }
    dashes.count = di; world.add(dashes);
    for (const x of highway ? [-7.6, 6.8] : [-3.85, 3.85]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.16, len + 120), lineMat); edge.rotation.x = -Math.PI / 2; edge.position.set(x, 0.02, -len / 2 + 50); world.add(edge);
    }
    if (highway) {
      // ===== 高速道路らしさ（東名・由比〜富士あたり）=====
      // 路肩（左のはしの白い実線の外）と、反対車線
      const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len + 120), mat('#5a5f67', { roughness: 0.95 }));
      shoulder.rotation.x = -Math.PI / 2; shoulder.position.set(-8.9, 0.004, -len / 2 + 50); world.add(shoulder);
      const opp = new THREE.Mesh(new THREE.PlaneGeometry(9, len + 120), mat('#4a4f57', { roughness: 0.95 }));
      opp.rotation.x = -Math.PI / 2; opp.position.set(6.6, 0.004, -len / 2 + 50); world.add(opp);
      // 中央分離帯：コンクリートの台と、緑の目かくしフェンス
      const med = box(1.2, 0.8, len + 120, mat('#c9ccd1')); med.position.set(1.2, 0.4, -len / 2 + 50); world.add(med);
      if (T.fence) {
        const fl = []; for (let z = 40; z > zEnd; z -= 8) fl.push([1.2, z, 1.6]);
        const fence = boardsAlong(T.fence, fl, 8); world.add(fence);
      } else { const f = box(0.08, 1.4, len + 120, mat('#3f8a52')); f.position.set(1.2, 1.5, -len / 2 + 50); world.add(f); }
      // ガードレール（左の路肩）
      const rail = mat('#e8ecef', { metalness: 0.5, roughness: 0.3 });
      const r1 = box(0.12, 0.35, len + 120, rail); r1.position.set(-10.3, 0.75, -len / 2 + 50); world.add(r1);
      // 左：高い防音壁（上は透明な板）
      if (T.soundwall) {
        const wl = []; for (let z = 40; z > zEnd; z -= 10) wl.push([-10.6, z, 5]);
        world.add(boardsAlong(T.soundwall, wl, 10));
      } else {
        const wall = box(0.3, 3.2, len + 120, mat('#b9bec6')); wall.position.set(-10.6, 1.6, -len / 2 + 50); world.add(wall);
        const glass = box(0.1, 1.6, len + 120, new THREE.MeshLambertMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.45 })); glass.position.set(-10.6, 4.0, -len / 2 + 50); world.add(glass);
      }
      // 右の奥：駿河湾（反対車線の向こう）
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, len + 400), mat('#2f7fd1', { roughness: 0.25, metalness: 0.1 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(418, -0.6, -len / 2 + 60); world.add(sea);
      const r2 = box(0.12, 0.35, len + 120, rail); r2.position.set(11.3, 0.75, -len / 2 + 50); world.add(r2);
      // 背の高い街灯
      const lights = []; for (let z = 20; z > zEnd; z -= 36) lights.push([-9.8, z, 11]);
      if (T.streetlight) world.add(boards(T.streetlight, lights));
      else for (const [x, z] of lights) { const pole = box(0.25, 10, 0.25, mat('#9aa1aa')); pole.position.set(x, 5, z); world.add(pole); const arm = box(2.4, 0.18, 0.18, mat('#9aa1aa')); arm.position.set(x + 1.2, 10, z); world.add(arm); }
      // 頭の上の緑の案内標識（門型）
      const signs = [[60, '清水 しみず', 'SHIMIZU 7km'], [250, '富士 ふじ', 'FUJI 2km'], [430, '富士 出口', 'EXIT  ETC']];
      for (const [at, t1, t2] of signs) {
        const z = -at;
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.6), new THREE.MeshBasicMaterial({ map: textTex(t1, { w: 640, h: 250, bg: '#1d7a46', fg: '#fff', size: 92, border: '#fff', sub: t2 }) }));
        // カメラ（高さ7.6m）が下をくぐるよう、板は 9m より上に つける
        sg.position.set(-3.6, 10.4, z); world.add(sg);
        for (const x of [-9.6, 0.6]) { const pl = box(0.3, 11.9, 0.3, mat('#8a9099')); pl.position.set(x, 5.95, z - 0.1); world.add(pl); }
        const beam = box(10.6, 0.35, 0.35, mat('#8a9099')); beam.position.set(-4.5, 11.8, z - 0.15); world.add(beam);
      }
      // 前を同じ向きに走る車（左の車線のずっと前。こちらと同じ速さで走るので近づかない）
      for (const [nm, x, ahead] of [['car_navy', -5.4, 70], ['car_kei', -1.8, 110], ['car_white', -5.4, 150]]) {
        if (!T[nm]) continue;
        const c = buildCarBoard(T[nm], nm); c.userData.ahead = ahead; c.position.set(x, 0, -ahead); world.add(c); pacers.push(c);
      }
    } else {
      // ===== 町（Codex の目標の画面に寄せる：瓦屋根の店や家・敷石の歩道・電柱と電線・道ばたの物・歩く人・影）=====
      const rand = (z, k) => Math.abs(Math.sin(z * 12.9898 + k * 78.233) * 43758.5453) % 1;
      // 歩道：あたたかい色の 敷石と、白い ふちいし
      const pave = canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = '#cdb595'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 32) for (let x = -64; x < w; x += 64) {
          const off = (y / 32) % 2 ? 32 : 0; const v = 205 + ((x * 7 + y * 13) % 23);
          c.fillStyle = `rgb(${v + 12},${v - 8},${v - 40})`; c.fillRect(x + off + 2, y + 2, 60, 28);
        }
      });
      pave.wrapS = pave.wrapT = THREE.RepeatWrapping; pave.repeat.set(1.2, (len + 120) / 3);
      for (const x of [-5.6, 5.6]) {
        const sw = box(3.2, 0.18, len + 120, new THREE.MeshLambertMaterial({ map: pave })); sw.position.set(x, 0.09, -len / 2 + 50); world.add(sw);
        const curb = box(0.22, 0.24, len + 120, mat('#e4e2dc')); curb.position.set(x - Math.sign(x) * 1.6, 0.12, -len / 2 + 50); world.add(curb);
      }
      // 建物：瓦屋根の 八百屋・パン屋・アパート・古い家・薬局・家（Codex の正面の絵の板＋うしろの箱。屋根の形が 空に 出る）
      const bk = ['bld1', 'bld2', 'bld3', 'bld4', 'bld5', 'bld6'].filter((n) => T[n]);
      const slots = [];
      if (bk.length) {
        const per = bk.map(() => []);
        for (let z = 30; z > zEnd + 20; z -= 7.9) {
          for (const side of [-1, 1]) {
            if (tea && side === -1) continue;
            if (leg.bridgeAt && Math.abs(-z - leg.bridgeAt) < 24) continue;
            const k = Math.floor(rand(z, side) * bk.length);
            per[k].push({ side, z, sd: rand(z, side + 3) }); slots.push({ side, z, k });
          }
        }
        const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const sc = new THREE.Vector3(); const m = new THREE.Matrix4();
        const fGeo = new THREE.PlaneGeometry(1, 1); fGeo.translate(0, 0.5, 0);
        // 1棟ずつ：正面の絵を 軒の線で 上下に 切り、屋根の部分だけ うしろへ たおす（たてた 紙に 見えない）。
        //   EAVE＝上から 屋根の 部分の わりあい（0 は たおさない：三角の 屋根を 正面に 見せる家・平らな 屋上の アパート）
        const EAVE = { bld1: 0.18, bld2: 0.19, bld3: 0, bld4: 0.2, bld5: 0, bld6: 0.18 };
        const W = 7.4; // 建物の はば（戸の 高さが 約2mに なる 大きさ）
        per.forEach((list, k) => {
          if (!list.length) return;
          const name = bk[k]; const tex = T[name]; const a = tex.image.width / tex.image.height; const hgt = W / a;
          const e = EAVE[name] || 0; const hWall = hgt * (1 - e); const hRoof = hgt * e; const tilt = 0.95;
          const mkPlane = (h, v0, v1) => { const gg = new THREE.PlaneGeometry(W, h); gg.translate(0, h / 2, 0); const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0)); return gg; };
          const wallGeo = mkPlane(hWall, 0, 1 - e);
          const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
          const walls = new THREE.InstancedMesh(wallGeo, mat, list.length);
          let roofs = null;
          if (e > 0) { const rg = mkPlane(hRoof, 1 - e, 1); rg.rotateX(-tilt); rg.translate(0, hWall, 0); roofs = new THREE.InstancedMesh(rg, mat, list.length); }
          const dep = 7; const top = new THREE.MeshLambertMaterial({ color: '#58606c' }); const sideM = new THREE.MeshLambertMaterial({ color: name === 'bld4' ? '#9a7a56' : '#efe6d2' });
          const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [sideM, sideM, top, sideM, sideM, sideM], list.length);
          list.forEach(({ side, z, sd }, i) => {
            const fx = side * (7.4 + sd * 0.4);
            q.setFromAxisAngle(v.set(0, 1, 0), side < 0 ? Math.PI / 2 : -Math.PI / 2);
            m.compose(v.set(fx, 0, z), q, sc.set(1, 1, 1)); walls.setMatrixAt(i, m); if (roofs) roofs.setMatrixAt(i, m);
            const bh = e > 0 ? hWall : hgt * (name === 'bld3' ? 0.9 : 0.62);
            m.compose(v.set(fx + side * (dep / 2 + 0.02), bh / 2, z), q.identity(), sc.set(dep, bh, W * 0.96)); boxes.setMatrixAt(i, m);
          });
          world.add(boxes, walls); if (roofs) world.add(roofs);
        });
      }
      // 街路樹（歩道の 車道がわ）と 影
      const trees = []; const shadows = [];
      for (let z = 22; z > zEnd; z -= 18) for (const side of [-1, 1]) { if (rand(z, side + 7) < 0.25) continue; trees.push([side * 4.6, z - 6, 4.4]); shadows.push([side * 4.6 + 0.5, z - 6 + 0.6, 2.8, 2.2]); }
      world.add(boards(T.tree_round, trees));
      // 電柱（両がわ）と、電線（たるませて 3本ずつ）
      const poles = []; const poleZ = [];
      for (let z = 14; z > zEnd - 20; z -= 26) poleZ.push(z);
      for (const side of [-1, 1]) for (const z of poleZ) { poles.push([side * 4.25, z, 8.6]); shadows.push([side * 4.25 + 0.52 * 3.2, z + 0.85 * 3.2, 0.4, 6.4]); }
      world.add(boards(T.pole, poles));
      const wpts = [];
      for (const side of [-1, 1]) for (let wi = 0; wi < 3; wi++) {
        const y0 = 8.55 - wi * 0.42; const x0 = side * (4.25 + (wi - 1) * 0.35);
        for (let i = 0; i < poleZ.length - 1; i++) {
          const za = poleZ[i]; const zb = poleZ[i + 1]; const N = 8;
          for (let j = 0; j < N; j++) {
            const t0 = j / N; const t1 = (j + 1) / N;
            wpts.push(x0, y0 - Math.sin(Math.PI * t0) * 0.45, za + (zb - za) * t0, x0, y0 - Math.sin(Math.PI * t1) * 0.45, za + (zb - za) * t1);
          }
        }
      }
      // 道を よこぎる 電線（ときどき。カメラの 上を とおる高さ）
      for (let i = 1; i < poleZ.length; i += 3) { const z = poleZ[i]; for (let j = 0; j < 8; j++) { const t0 = j / 8; const t1 = (j + 1) / 8; wpts.push(-4.25 + 8.5 * t0, 9.4 - Math.sin(Math.PI * t0) * 0.5, z, -4.25 + 8.5 * t1, 9.4 - Math.sin(Math.PI * t1) * 0.5, z); } }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpts, 3));
      const wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#2b2f36', transparent: true, opacity: 0.8 })); wires.userData.noOcclude = true; world.add(wires);
      // 道ばたの物（建物の前の 歩道に）：自動販売機・植木鉢・自転車・植木・ポスト・八百屋の台、車止め
      const props = { p_vending: [], p_flower: [], p_bike: [], p_planter: [], p_post: [], p_veggie: [], p_bollard: [] };
      const PH = { p_vending: 2.1, p_flower: 1.0, p_bike: 1.2, p_planter: 1.15, p_post: 1.5, p_veggie: 1.25, p_bollard: 0.95 };
      for (const { side, z, k } of slots) {
        const r1 = rand(z, side + 11); const r2 = rand(z, side + 13);
        const x = side * 6.6;
        if (k === 0) props.p_veggie.push([x, z + 1.5, PH.p_veggie]);
        else if (r1 < 0.28) props.p_vending.push([x, z + 3.5, PH.p_vending]);
        else if (r1 < 0.5) props.p_bike.push([x, z - 2, PH.p_bike]);
        else if (r1 < 0.62) props.p_post.push([x - side * 0.3, z + 2, PH.p_post]);
        if (r2 < 0.45) props.p_flower.push([x, z - 3.6, PH.p_flower]);
        else if (r2 < 0.7) props.p_planter.push([x, z + 0.4, PH.p_planter]);
        if (r2 > 0.82) props.p_bollard.push([side * 4.4, z, PH.p_bollard]);
      }
      for (const [n, list] of Object.entries(props)) if (T[n] && list.length) { world.add(boards(T[n], list)); list.forEach(([x, z, hh]) => shadows.push([x + 0.2, z + 0.25, hh * 0.9, hh * 0.55])); }
      // 歩く人（登校する小学生・犬の散歩）：ゆっくり 歩いている
      walkers = [];
      if (T.p_kid1 && T.p_kid2) for (let i = 0; i < 4; i++) {
        const z0 = -(30 + i * 62 + rand(i, 21) * 20); const sideX = i % 2 ? 5.9 : -5.9;
        for (const [n, dx] of [['p_kid1', -0.35], ['p_kid2', 0.35]]) { const sp = sprite(T[n], 1.35, sideX + dx, z0); world.add(sp); walkers.push({ o: sp, v: 1.1 }); }
      }
      if (T.p_walker) for (let i = 0; i < 3; i++) {
        const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
        const g = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: T.p_walker, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
        const a = T.p_walker.image.width / T.p_walker.image.height; g.scale.set(1.5 * a, 1.5, 1); g.rotation.y = Math.PI / 2;
        g.position.set(i % 2 ? 6.4 : -6.4, 0.18, -(60 + i * 90)); world.add(g); walkers.push({ o: g, v: 0.9 });
      }
      // 影（電柱・木・物の かげ。朝の光で 右うしろへ のびる）
      if (shadows.length) {
        const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
        const sm = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: 0.85, depthWrite: false }), shadows.length);
        const mm = new THREE.Matrix4(); const qq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.55); const vv = new THREE.Vector3(); const ss = new THREE.Vector3(); // 右うしろへ のびる
        shadows.forEach(([x, z, w, l], i) => { mm.compose(vv.set(x, 0.03, z), qq, ss.set(w, 1, l)); sm.setMatrixAt(i, mm); });
        world.add(sm);
      }
      if (tea) {
        // 茶畑（左がわ）：うねの絵を何列も
        const bushes = [];
        for (let row = 0; row < 7; row++) for (let z = 30; z > zEnd; z -= 9) bushes.push([-10 - row * 4.2, z - (row % 2) * 4, 2.2]);
        world.add(boards(T.teabush, bushes));
      }
      if (legId === 'leg1') {
        // 安倍川の橋（本社は安倍川の河口の近く）
        const bz = -60;
        const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 34), mat('#4d9ad6', { roughness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.5, bz); world.add(water);
        const bank = new THREE.Mesh(new THREE.PlaneGeometry(400, 44), mat('#c9c0a2')); bank.rotation.x = -Math.PI / 2; bank.position.set(0, -0.4, bz); world.add(bank);
        for (const x of [-4.4, 4.4]) { const r = box(0.15, 1.0, 36, mat('#9bb8d6', { metalness: 0.4 })); r.position.set(x, 0.6, bz); world.add(r); }
        const bs = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.4), new THREE.MeshBasicMaterial({ map: textTex('安倍川', { w: 512, h: 200, bg: '#2156a8', fg: '#fff', size: 96, border: '#fff', sub: 'あべかわ' }) }));
        bs.position.set(-4.6, 2.6, bz + 19); world.add(bs);
        const bsp = box(0.12, 2.0, 0.12, mat('#8a9099')); bsp.position.set(-4.6, 1.0, bz + 19.05); world.add(bsp);
      }
    }
    // ゴールの建物
    const goalZ = -L.length;
    // 高速道路と、ICへ向かう道は「出口の看板」で終わる。お店へ着く道は、お店の建物（正面は Codex の絵）
    const exitSign = { leg2a: ['静岡IC', 'しずおか インター'], highway: ['富士IC 出口', 'ふじ インター'] }[legId];
    const shop = { leg1: ['スーパー', '#e2483d', 5], local: ['ごはん', '#2e9b62', 4] }[legId];
    if (exitSign) {
      const gw = highway ? 9 : 6;
      const gs = new THREE.Mesh(new THREE.PlaneGeometry(gw, 2.6), new THREE.MeshBasicMaterial({ map: textTex(exitSign[0], { w: 640, h: 190, bg: '#1d7a46', fg: '#fff', size: 88, border: '#fff', sub: exitSign[1] }) }));
      gs.position.set(laneX + (highway ? 1.5 : 0), 6.6, goalZ - 4); world.add(gs);
      for (const sx of [-1, 1]) { const pl = box(0.3, 7.8, 0.3, mat('#8a9099')); pl.position.set(laneX + (highway ? 1.5 : 0) + sx * (gw / 2 + 0.6), 3.9, goalZ - 4); world.add(pl); }
      const beam = box(gw + 1.6, 0.3, 0.3, mat('#8a9099')); beam.position.set(laneX + (highway ? 1.5 : 0), 7.95, goalZ - 4.1); world.add(beam);
    }
    if (shop) {
      // お店は道の左に、近づくトラックのほうへ正面を向けて建つ
      const gb = box(12, 8.4, 9, mat('#fbf7ee')); gb.position.set(-12.5, 4.2, goalZ - 8); world.add(gb);
      if (T[`facade${shop[2]}`]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(12, 8.4), new THREE.MeshLambertMaterial({ map: T[`facade${shop[2]}`] })); f.position.set(-12.5, 4.2, goalZ - 3.48); world.add(f);
        const f2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 8.4), f.material); f2.rotation.y = Math.PI / 2; f2.position.set(-6.48, 4.2, goalZ - 8); world.add(f2); }
      const gs = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.9), new THREE.MeshBasicMaterial({ map: textTex(shop[0], { w: 512, h: 140, bg: shop[1], fg: '#fff', size: 96 }) }));
      gs.position.set(-12.5, 9.5, goalZ - 3.4); world.add(gs);
    }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(highway ? 7 : 3.7, 0.5), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    flag.rotation.x = -Math.PI / 2; flag.position.set(laneX + (highway ? 1.8 : 0), 0.03, goalZ); world.add(flag);
    // じゃま（logic と同じ順。最後にゴール：お店の前の止まる線、高速は料金所）
    const allH = [...L.hazards, ...(L.goal ? [L.goal] : [])];
    for (const h of allH) {
      // h.at は「トラックの位置（車体のまん中）」が止まる所。線や横断歩道は、鼻先（NOSE m 前）の すぐ先に かく
      const z = -(h.at + (h.type === 'car' || h.type === 'jam' ? 0 : NOSE));
      const stop = new THREE.Mesh(new THREE.PlaneGeometry(highway ? 7 : 3.7, 0.45), lineMat);
      stop.rotation.x = -Math.PI / 2; stop.position.set(laneX + (highway ? 1.8 : 0), 0.025, z);
      if (h.type === 'signal' || h.type === 'walker') world.add(stop);
      const item = { h, objs: {} };
      if (h.type === 'signal') {
        const sig = buildSignal(); sig.position.set(1.0 + 3, 0, z - 4); world.add(sig); item.objs.sig = sig; setSignal(sig, 0);
        const cross = new THREE.Group();
        for (let x = -3.5; x <= 3.5; x += 1.0) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3), lineMat); st.rotation.x = -Math.PI / 2; st.position.set(x, 0.022, z - 2.5); cross.add(st); }
        world.add(cross);
      } else if (h.type === 'walker') {
        for (let x = -3.5; x <= 3.5; x += 1.0) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3.2), lineMat); st.rotation.x = -Math.PI / 2; st.position.set(x, 0.022, z - 2.6); world.add(st); }
        const kidTex = T.kid_walk && (() => { const t = T.kid_walk.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; t.needsUpdate = true; return t; })(); // 左向きに 反転
        const kid = kidTex ? sprite(kidTex, 1.6, 5.4, z - 2.6) : buildKid(); if (!T.kid_walk) { kid.position.set(5.4, 0.18, z - 2.6); kid.rotation.y = Math.PI / 2; } world.add(kid); item.objs.kid = kid;
        const ps = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c, w, h) => {
          c.fillStyle = '#1c63c9'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
          c.fillStyle = '#fff'; c.beginPath(); c.moveTo(64, 16); c.lineTo(114, 108); c.lineTo(14, 108); c.closePath(); c.fill();
          c.fillStyle = '#1c63c9'; c.beginPath(); c.arc(66, 46, 8, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#1c63c9'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 56); c.lineTo(60, 78); c.lineTo(48, 96); c.moveTo(60, 78); c.lineTo(74, 96); c.moveTo(52, 64); c.lineTo(76, 68); c.stroke();
          c.fillStyle = '#1c63c9'; for (let x = 30; x < 100; x += 14) c.fillRect(x, 100, 8, 6);
        }) }));
        ps.position.set(-4.4, 2.6, z + 6); world.add(ps);
        const psp = box(0.1, 2.2, 0.1, mat('#8a9099')); psp.position.set(-4.4, 1.1, z + 6.05); world.add(psp);
      } else if (h.type === 'goal') {
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        gl.rotation.x = -Math.PI / 2; gl.position.set(laneX, 0.03, z); world.add(gl);
        const tri = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: textTex('ここで とまる', { w: 512, h: 512, bg: 'rgba(0,0,0,0)', fg: '#ffffff', size: 70 }), transparent: true, depthWrite: false }));
        tri.rotation.x = -Math.PI / 2; tri.position.set(laneX, 0.035, z + 2.4); world.add(tri);
      } else if (h.type === 'etc') {
        // 料金所（ETC）：屋根はカメラより上（9m）。島（ブース）のあいだが車線。バーは 止まったトラックの鼻先より 前
        const g = new THREE.Group();
        const zb = -(h.at + NOSE + 0.9); // バーの位置
        const lanesX = [-9.0, -5.4, -1.8];
        const roofMat = mat('#eef1f4');
        const roof = box(15.4, 0.7, 13, roofMat); roof.position.set(-5.4, 9.6, zb - 4); g.add(roof);
        const under = box(15.4, 0.08, 13, mat('#c9ced6')); under.position.set(-5.4, 9.22, zb - 4); g.add(under);
        // 屋根の前の帯：車線ごとの案内（ETC専用はむらさき、ETC/一般はみどり）
        const fas = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 1.3), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 88, (c, w, hh) => {
          c.fillStyle = '#f4f6f8'; c.fillRect(0, 0, w, hh); c.fillStyle = '#5b6470'; c.fillRect(0, hh - 6, w, 6);
          const lw = w / 15.4 * 3.6;
          [['ETC/一般', '#2e9b62'], ['ETC専用', '#6b3fa0'], ['ETC/一般', '#2e9b62']].forEach(([t, col], i) => {
            const cx = (lanesX[i] + 5.4 + 7.7) / 15.4 * w;
            c.fillStyle = col; c.fillRect(cx - lw * 0.42, 10, lw * 0.84, hh - 26);
            c.fillStyle = '#fff'; c.font = `900 40px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, cx, hh / 2 - 6);
          });
        }) }));
        fas.position.set(-5.4, 9.6, zb + 2.52); g.add(fas);
        // 島：コンクリートの台・黄色と黒の はな・白いブース・柱
        const stripe = canvasTex(64, 64, (c, w, hh) => { c.fillStyle = '#ffd21f'; c.fillRect(0, 0, w, hh); c.fillStyle = '#1d1f23'; for (let i = -2; i < 4; i++) { c.beginPath(); c.moveTo(i * 24, hh); c.lineTo(i * 24 + 12, hh); c.lineTo(i * 24 + 12 + hh, 0); c.lineTo(i * 24 + hh, 0); c.closePath(); c.fill(); } });
        const stripeMat = new THREE.MeshLambertMaterial({ map: stripe });
        for (const ix of [-10.8, -7.2, -3.6, 0]) {
          const isl = box(0.9, 0.3, 12, mat('#d9d6cf')); isl.position.set(ix, 0.15, zb - 4); g.add(isl);
          const nose = box(0.92, 0.9, 0.9, stripeMat); nose.position.set(ix, 0.45, zb + 2.3); g.add(nose);
          const booth = box(0.86, 2.4, 2.6, mat('#fbfbf8')); booth.position.set(ix, 1.5, zb - 3); g.add(booth);
          const win = box(0.88, 0.8, 2.2, mat('#7fb6e0', { roughness: 0.2 })); win.position.set(ix, 2.0, zb - 3); g.add(win);
          const pil = box(0.4, 9.2, 0.4, mat('#c4c9d0')); pil.position.set(ix, 4.6, zb - 8); g.add(pil);
        }
        // 20キロの標識（屋根の柱の前）
        const s20 = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c, w, hh) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#d8262c'; c.lineWidth = 16; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#1b3b8f'; c.font = `900 64px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('20', 64, 68); }) }));
        s20.position.set(-7.2, 3.4, zb + 2.8); g.add(s20);
        const s20p = box(0.09, 3.4, 0.09, mat('#8a9099')); s20p.position.set(-7.2, 1.7, zb + 2.74); g.add(s20p);
        // 道の「ETC」の文字（むらさき）
        const etcPaint = new THREE.MeshBasicMaterial({ map: textTex('ETC', { w: 256, h: 128, bg: 'rgba(0,0,0,0)', fg: '#8a5cc8', size: 100 }), transparent: true, depthWrite: false });
        for (const dz of [14, 30]) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), etcPaint); pm.rotation.x = -Math.PI / 2; pm.position.set(-5.4, 0.03, zb + dz); g.add(pm); }
        // バー（黄色と黒）：島の右はしを軸に、上へ はね上がる
        const bars = [];
        for (const lx of [-5.4, -1.8]) {
          const piv = new THREE.Group(); piv.position.set(lx - 1.35, 1.05, zb); piv.userData = { lx, zb };
          const bar = box(2.9, 0.12, 0.12, new THREE.MeshLambertMaterial({ map: stripe })); bar.position.set(1.45, 0, 0); piv.add(bar);
          const mach = box(0.45, 1.1, 0.45, mat('#ffcf1f')); mach.position.set(-0.05, -0.5, 0); piv.add(mach);
          g.add(piv); bars.push(piv);
        }
        world.add(g);
        item.objs.bars = bars;
      } else if (h.type === 'car' || h.type === 'jam') {
        const cars = [];
        const n = h.type === 'jam' ? 3 : 1;
        const colors = ['#e2483d', '#2f7fe0', '#f2f2f2', '#2e2e2e', '#f4c20d'];
        const carNames = ['car_red', 'car_white', 'car_navy', 'car_kei'];
        const mk = (i) => { const nm = carNames[(i + Math.floor(h.at)) % 4]; return T[nm] ? buildCarBoard(T[nm], nm) : buildCar(colors[i % colors.length]); };
        for (let i = 0; i < n; i++) { const c = mk(i); c.position.set(laneX, 0, z - 5 - i * 6); world.add(c); cars.push(c); }
        if (h.type === 'jam' && highway) for (let i = 0; i < 3; i++) { const c = mk(i + 2); c.position.set(-1.8, 0, z - 8 - i * 6.5); world.add(c); cars.push(c); c.userData.otherLane = true; }
        item.objs.cars = cars;
      }
      hz.push(item);
    }
    // スクールゾーン：緑にぬった道・「スクールゾーン」「30」の文字・30キロの標識・フェンスと学校の看板・歩道の子どもたち
    for (const zn of (L.zones || [])) {
      const z0 = -(zn.from + NOSE); const z1 = -(zn.until + NOSE); const zl = z0 - z1;
      const green = new THREE.Mesh(new THREE.PlaneGeometry(3.4, zl), new THREE.MeshBasicMaterial({ color: '#3f9a5c', transparent: true, opacity: 0.75, depthWrite: false }));
      green.rotation.x = -Math.PI / 2; green.position.set(laneX, 0.021, (z0 + z1) / 2); world.add(green);
      const paint = (t, size, zz, w, hh) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: textTex(t, { w: 512, h: 256, bg: 'rgba(0,0,0,0)', fg: '#ffffff', size }), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(laneX, 0.03, zz); world.add(m); };
      paint('30', 220, z0 - 4, 2.6, 1.3);
      paint('スクールゾーン', 82, z0 - 9, 3.2, 1.6);
      paint('30', 220, (z0 + z1) / 2, 2.6, 1.3);
      const s30 = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#d8262c'; c.lineWidth = 16; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#1b3b8f'; c.font = `900 64px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('30', 64, 68); }) }));
      s30.position.set(-4.4, 3.1, z0 + 6); world.add(s30);
      const sz = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshBasicMaterial({ map: textTex('スクールゾーン', { w: 320, h: 160, bg: '#1c63c9', fg: '#fff', size: 44, border: '#fff', sub: '7:30〜8:30' }) }));
      sz.position.set(-4.4, 2.05, z0 + 6.01); world.add(sz);
      const szp = box(0.1, 3.0, 0.1, mat('#8a9099')); szp.position.set(-4.4, 1.5, z0 + 5.95); world.add(szp);
      // 学校のフェンス（左の歩道の外）と、門の看板
      const fence = box(0.08, 1.6, zl, mat('#3f8f5a')); fence.position.set(-7.05, 0.8, (z0 + z1) / 2); world.add(fence);
      const gate = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshBasicMaterial({ map: textTex('しょうがっこう', { w: 512, h: 134, bg: '#fffef6', fg: '#1d4f2e', size: 74, border: '#1d4f2e' }) }));
      gate.rotation.y = Math.PI / 2; gate.position.set(-7.0, 2.4, z0 - zl * 0.35); world.add(gate);
      // 歩道を歩く子どもたち（左の歩道）
      if (T.kid_walk) { const kids = []; for (let k = 0; k < 5; k++) kids.push([-5.0 - (k % 2) * 0.6, z0 - 8 - k * (zl - 12) / 4, 1.45]); world.add(boards(T.kid_walk, kids)); }
    }

    // 高速の車線の合図：工事のカラーコーンと矢印板の車、合流の車と合流車線
    laneObjs = [];
    blinkers = [];
    for (const e of (L.laneEvents || [])) {
      const z = -e.at;
      const o = { e, objs: {} };
      if (e.type === 'cones' || e.type === 'conesR') {
        // cones：左の車線を ふさぐ（矢印は →）／conesR：右の車線を ふさぐ（矢印は ←）
        const R = e.type === 'conesR'; const lx = R ? -1.8 : -5.4; const sg = R ? -1 : 1;
        const pts = [];
        for (let ss = e.at - 6; ss <= e.until; ss += 6) pts.push([lx + sg * ((ss < e.at + 10 ? (e.at + 10 - ss) * 0.12 : -1.6) - 0.2), -ss, 0.9]);
        if (T.cone) world.add(boards(T.cone, pts));
        else {
          // 絵がないときの代わり：オレンジと白のカラーコーン（立体）
          const cg = new THREE.ConeGeometry(0.32, 0.9, 12); cg.translate(0, 0.45, 0);
          const cm = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: '#ff6a1a' }), pts.length);
          const m4c = new THREE.Matrix4(); pts.forEach(([x, z], i) => { m4c.makeTranslation(x, 0, z); cm.setMatrixAt(i, m4c); }); world.add(cm);
          const bg = new THREE.CylinderGeometry(0.17, 0.22, 0.16, 12); bg.translate(0, 0.5, 0);
          const bm = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: '#ffffff' }), pts.length);
          pts.forEach(([x, z], i) => { m4c.makeTranslation(x, 0, z); bm.setMatrixAt(i, m4c); }); world.add(bm);
        }
        let ab;
        if (T.arrowtruck) ab = sprite(T.arrowtruck, 3.0, lx, z - 8);
        else {
          // 絵がないときの代わり：白い作業車の上に、黒い板に オレンジの光る矢印（→）の 標識車
          ab = new THREE.Group();
          const car = T.car_white ? buildCarBoard(T.car_white, 'car_white') : box(1.9, 1.6, 3.4, mat('#f2f2f2'));
          if (!T.car_white) car.position.y = 0.8;
          ab.add(car);
          const atex = arrowBoardTex(); if (R) { atex.wrapS = THREE.RepeatWrapping; atex.repeat.x = -1; atex.offset.x = 1; atex.needsUpdate = true; } // ← に
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.45), new THREE.MeshBasicMaterial({ map: atex }));
          panel.position.set(0, 2.55, 0.05); ab.add(panel);
          const back = box(2.3, 1.45, 0.12, mat('#222')); back.position.set(0, 2.55, -0.05); ab.add(back);
          for (const px of [-0.7, 0.7]) { const pl = box(0.1, 0.9, 0.1, mat('#333')); pl.position.set(px, 1.75, -0.1); ab.add(pl); }
          ab.position.set(lx, 0, z - 8);
          ab.userData.blink = panel;
          blinkers.push(panel);
        }
        world.add(ab);
      } else if (e.type === 'merge') {
        // 合流車線（左から入ってくる道）
        const ramp = new THREE.Mesh(new THREE.PlaneGeometry(4, 120), mat('#4a4f57', { roughness: 0.95 }));
        ramp.rotation.x = -Math.PI / 2; ramp.rotation.z = -0.06; ramp.position.set(-10, 0.005, z + 40); world.add(ramp);
        const nm = 'car_white';
        const c = T[nm] ? buildCarBoard(T[nm], nm) : buildCar('#f2f2f2');
        c.position.set(-11, 0, z + 40); world.add(c);
        o.objs.car = c;
      }
      laneObjs.push(o);
    }
    // 救急車（運転1の終わり）：うしろから来て、止まったトラックの右を 追いこしていく
    ambObj = null;
    if (L.ambulanceAt != null) { ambObj = buildAmbulance(); ambObj.visible = false; world.add(ambObj); }
    pandaSeen = false;
    introT = 0;
    truck.position.set(laneX, 0, 0);
    truck.rotation.set(0, 0, 0);
  }

  // 救急車：自分の トラックと 同じ 作り（中身の 箱の 4面に Codex の 前・うしろ・横の 絵を はる。屋根は 箱の 上の面）
  function buildAmbulance() {
    const g = new THREE.Group();
    const S = T.ambulance_side, R = T.ambulance_rear, F = T.ambulance_front;
    const L = 5.0; const H = S ? L * S.image.height / S.image.width : 2.8; const W = R ? H * R.image.width / R.image.height : 2.0;
    const unlit = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, ...extra });
    // 中身の 箱（白い 車体と 屋根。ななめ上から 見ても 向こうが すけない）
    const body = box(W * 0.92, H * 0.66, L * 0.9, new THREE.MeshLambertMaterial({ color: '#f4f6f8' })); body.position.set(0, H * 0.2 + H * 0.33, 0.05); g.add(body);
    if (S) {
      const left = new THREE.Mesh(new THREE.PlaneGeometry(L, H), unlit(S)); left.rotation.y = -Math.PI / 2; left.position.set(-W / 2, H / 2, 0); g.add(left);
      const fl = S.clone(); fl.wrapS = THREE.RepeatWrapping; fl.repeat.x = -1; fl.offset.x = 1; fl.needsUpdate = true;
      const right = new THREE.Mesh(new THREE.PlaneGeometry(L, H), unlit(fl)); right.rotation.y = Math.PI / 2; right.position.set(W / 2, H / 2, 0); g.add(right);
    }
    if (R) { const rear = new THREE.Mesh(new THREE.PlaneGeometry(W, H), unlit(R)); rear.position.set(0, H / 2, L / 2 + 0.01); g.add(rear); }
    if (F) { const fw = H * F.image.width / F.image.height; const front = new THREE.Mesh(new THREE.PlaneGeometry(fw, H), unlit(F)); front.rotation.y = Math.PI; front.position.set(0, H / 2, -L / 2 - 0.01); g.add(front); }
    // 屋根の 赤い 回転灯（点めつ）と、地面の 影
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ff2a1f' });
    for (const z of [-L * 0.36, L * 0.38]) { const lb = box(W * 0.6, 0.16, 0.36, lampMat); lb.position.set(0, H * 0.86 + 0.08, z); g.add(lb); }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.35, L * 1.1), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.02, 0); g.add(sh);
    g.userData.lampMat = lampMat;
    return g;
  }

  // ---------- 毎コマ ----------
  function updateDrive(state, dt) {
    const D = state.drive;
    if (!D) return;
    if (!leg || leg.id !== D.leg || (D.layoutKey && leg.key !== D.layoutKey)) buildLeg(D.leg, state.legs && state.legs[D.leg]);
    const s = D.s;
    truck.position.z = -s;
    // 救急車の サイレンの あいだは、少し 左に よって とまる（道路交通法40条）
    const ambNear = D.amb && (D.amb.state === 'coming' || D.amb.state === 'passing');
    ambPull = ambNear ? Math.min(1, ambPull + dt * 0.8) : Math.max(0, ambPull - dt * 0.5);
    truck.position.x = laneX + (D.lanes ? (D.laneX || 0) * 3.6 : 0) - ambPull * 0.65;
    truck.position.y = Math.sin(time * 18) * 0.012 * Math.min(1, D.v / 5);
    wheelRot -= (D.v * dt) / 0.5;
    (truck.userData.wheels || []).forEach((w) => { w.rotation.x = wheelRot; });
    const braking = !D.holding && D.v > 0.4;
    if (truck.userData.tex) truck.userData.tailMat.opacity = braking ? 0.85 : 0; else truck.userData.tailMat.emissiveIntensity = braking || D.v < 0.4 ? 2.0 : 0.3;
    // じゃまの見た目
    const reveal = D.vmax * config.drive.react + (D.vmax * D.vmax) / (2 * config.drive.brake) + 6;
    // 前を走る車：ゴールの手前では、料金所へ先に入って消える
    const czs = (D.laneEvents || []).filter((e) => e.type === 'cones' || e.type === 'conesR');
    const blinkOn = Math.floor(performance.now() / 380) % 2 === 0;
    blinkers.forEach((pnl) => { pnl.material.color.set(blinkOn ? '#ffffff' : '#5a5a5a'); }); // 消えても 板は 見せたまま（黒い 四角が 浮かない）
    pacers.forEach((c) => {
      const cs = s + c.userData.ahead; c.position.z = -cs;
      // 工事で左の車線が通れない所では、左の車線の車は見せない
      const inCones = czs.some((cz) => (cz.type === 'cones' ? c.position.x < -3 : c.position.x > -3.6) && cs > cz.at - 25 && cs < cz.until + 25);
      c.visible = cs < D.length - 40 && !inCones;
    });
    laneObjs.forEach((o) => {
      const le = (D.laneEvents || []).find((x) => x.type === o.e.type && x.at === o.e.at);
      if (o.objs.car && le) {
        // 合流の車：合図が出たら、合流の地点へ向かって左から入ってくる
        const t = le.cued ? Math.min(1, Math.max(0, (s - (o.e.at - 80)) / 80)) : 0;
        const cs = o.e.at - 40 + t * 70;
        o.objs.car.position.z = -cs;
        o.objs.car.position.x = -11 + Math.min(1, t * 1.3) * (11 - 5.4);
      }
    });
    const live = D.hazards;
    hz.forEach((it, i) => {
      if (it.objs.bars) {
        // ETCで 速さが OK と読まれたら（または 止まって まったら）バーが上がる
        const hh = live[i]; const mine = !!(hh && (hh.open || hh.cleared));
        // 前を走る車が近づいたら、その車線のバーも開く（通りすぎたら閉じる）
        const others = hz.flatMap((o) => o.objs.cars || []);
        for (const b of it.objs.bars) {
          const { lx, zb } = b.userData;
          const carNear = others.some((c) => Math.abs(c.position.x - lx) < 1.2 && c.position.z < zb + 14 && c.position.z > zb - 6);
          const truckLane = Math.abs(truck.position.x - lx) < 1.8;
          const open = carNear || (truckLane && mine);
          b.rotation.z = open ? Math.min(1.45, b.rotation.z + dt * 4) : Math.max(0, b.rotation.z - dt * 3);
        }
      }
      const h = live[i];
      if (!h) return;
      if (it.objs.sig) {
        if (h.cleared) setSignal(it.objs.sig, 0);
        else if (h.active) { h._t = (h._t || 0) + dt; setSignal(it.objs.sig, h._t < 1.0 ? 1 : 2); } else setSignal(it.objs.sig, 0);
      }
      if (it.objs.kid) {
        const k = it.objs.kid;
        // 右の歩道から 左へ わたる（カメラは トラックの右うしろなので、右から来ると よく見える）
        let x = 5.4;
        if (h.cleared) { h._done = (h._done || 0) + dt; x = Math.max(-6.2, -5.1 - h._done * 2.2); } else if (h.active) x = 5.4 - Math.min(1, (h.stopT || 0) / h.wait) * 9 - 1.5;
        k.position.x = x;
        k.position.y = 0.05 + Math.abs(Math.sin(time * 9)) * (h.active || (h.cleared && x > -6.2) ? 0.06 : 0);
      }
      if (it.objs.cars) {
        let carS;
        if (h.cleared) { h._go = (h._go || 0) + dt; carS = h.at + 5 + 2.5 * h._go * h._go; } else if (h.revealed) carS = h.at + 5; else carS = Math.min(h.at + 5, s + reveal + 5);
        it.objs.cars.forEach((c, j) => {
          const base = c.userData.otherLane ? carS + 3 + j * 0.0 : carS;
          const idx = c.userData.otherLane ? j - 3 : j;
          c.position.z = -(base + idx * 6.2);
          const stopped = h.revealed && !h.cleared;
          const hazardBlink = h.type === 'jam' && stopped && Math.floor(time * 3) % 2 === 0;
          if (c.userData.board) c.userData.tailMat.opacity = stopped ? (h.type === 'jam' ? (hazardBlink ? 0.95 : 0.25) : 0.9) : 0;
          else c.userData.tailMat.emissiveIntensity = stopped ? (h.type === 'jam' ? (hazardBlink ? 2.5 : 0.4) : 2.2) : 0.2;
        });
      }
    });
    // レッサーパンダのトラック（向こうの車線から来る）
    if (panda && D.pandaAt != null && !pandaTruck && !pandaSeen && s >= D.pandaAt - 70) {
      pandaTruck = truckTex ? buildTruckTex(truckTex, { kind: 'panda' }) : buildTruck({ emblemTex, kind: 'panda' });
      pandaTruck.rotation.y = Math.PI;
      pandaS = s + 95;
      scene.add(pandaTruck);
      pandaSeen = true;
      pandaTalked = false;
    }
    if (pandaTruck) {
      // 子どもが 横断歩道に いる間は、横断歩道の手前で 止まって 待つ（パンダのトラックも 安全運転）
      let hold = null;
      hz.forEach((it, i) => {
        const h = D.hazards[i];
        if (!it.objs.kid || !h) return;
        const onCross = (h.active && h.revealed !== false) || (h.cleared && it.objs.kid.position.x > -5.8);
        const cw = h.at + NOSE + 2.6; // 横断歩道の位置
        if (onCross && pandaS >= cw + 5.4) hold = Math.max(hold ?? -Infinity, cw + 5.6);
      });
      const prevS = pandaS;
      // 救急車が来たら、向かいの車も 道の はしに よせて 止まる
      const ambNow = D.amb && (D.amb.state === 'coming' || D.amb.state === 'passing');
      pandaPull = ambNow ? Math.min(1, pandaPull + dt * 1.2) : Math.max(0, pandaPull - dt * 0.8);
      if (ambNow) { /* 止まる */ } else if (hold != null) pandaS = Math.max(hold, pandaS - 12 * dt);
      else pandaS -= 12 * dt;
      pandaTruck.position.set(1.9 + pandaPull * 1.3, 0, -pandaS);
      if (!pandaTalked && pandaS - s < 50) { pandaTalked = true; api.onPanda?.(); }
      pandaTruck.userData.wheels.forEach((w) => { w.rotation.x -= (prevS - pandaS) / 0.5; });
      if (pandaS < s - 30) { scene.remove(pandaTruck); pandaTruck = null; }
    }
    if (ambObj && D.amb) {
      const a = D.amb; const K = config.drive;
      let off = null;
      if (a.state === 'coming') off = -55 + 35 * Math.min(1, a.t / K.ambWindow);
      else if (a.state === 'passing') { const k = Math.min(1, a.t / K.ambPass); off = -18 + 58 * k * k; } // だんだん 速く、トラックの 横を とおる
      else if (a.state === 'done') { ambObj.userData.after = (ambObj.userData.after || 0) + dt; off = 40 + ambObj.userData.after * 24; }
      ambObj.visible = off != null && off < 160;
      if (off != null) ambObj.position.set(1.0, 0, -(s + off)); // センターラインの 上を 追いこす（左に よった トラックと すきまを あける）
      ambObj.userData.lampMat.color.set(Math.floor(time * 6) % 2 ? '#ff2a1f' : '#5a0d0a');
    }
    for (const w of walkers) { w.o.position.z -= w.v * dt; w.o.position.y = 0.18 + Math.abs(Math.sin(time * 7 + w.o.position.x)) * 0.04; }
    far.position.set(truck.position.x, 0, truck.position.z);
    // カメラ：はじめは前から回りこみ、そのあと うしろ上から
    introT = Math.min(1, introT + dt / 2.4);
    const e = introT < 1 ? 1 - (1 - introT) ** 3 : 1;
    // とうちゃくしたら、前に回りこんで社名板を見せる（運転の操作が終わってからなので、じゃまにならない）
    arriveT = 0; // とうちゃくは、カメラを回さず絵のカットインで見せる（板の正面を大写しにしない）
    const ea = arriveT * arriveT * (3 - 2 * arriveT);
    const ang = (1 - e) * Math.PI * 0.95 + ea * Math.PI * 0.9;
    // 目標の画面に よせて、少し ひくく・ちかく（トラックが 大きく、道と 町が よく見える）
    const dist = 12.8 - ea * 2.2;
    const back = new THREE.Vector3(Math.sin(ang) * dist * 0.5, 6.4 - (1 - e) * 3.2 - ea * 3.2, Math.cos(ang) * dist);
    camPos.set(truck.position.x + back.x + 0.5, back.y, truck.position.z + back.z);
    camLook.set(truck.position.x + 0.4, 1.4 + ea * 1.2, truck.position.z - (16 * e + 1) * (1 - ea));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function updateTitle(dt) {
    // 正面ななめ前から、黄色い社名板が見える向きで ゆらゆら回す
    truck.rotation.y = -0.55 + Math.sin(time * 0.45) * 0.38;
    const portrait = camera.aspect < 0.75;
    camera.position.set(7.2, 3.6, portrait ? -12.5 : -10.5);
    camera.lookAt(0.2, portrait ? 3.9 : 2.6, 0.4);
    truck.userData.wheels.forEach((w) => { w.rotation.x = 0; });
  }

  function resize() {
    // 隠れている間は測らない（幅0で覚えてしまうと、出したときに1点だけの絵になる）
    if (canvas.classList.contains('off') || !canvas.clientWidth) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 縦長の画面でもトラックがはみ出さないように、横の見える幅を確保する
    camera.fov = w / h < 0.62 ? 64 : 54;
    camera.updateProjectionMatrix();
  }

  const api = {
    onPanda: null,
    // 写真（アルバム用）：いまの3Dを 小さな jpeg に（描いた すぐあとに 読む）
    snap(w = 360) {
      try {
        renderer.render(scene, camera);
        const src = renderer.domElement; const h = Math.round(w * src.height / src.width);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(src, 0, 0, w, h);
        return c.toDataURL('image/jpeg', 0.72);
      } catch { return null; }
    },
    setMode(m) {
      if (m === mode && m !== 'title') return;
      mode = m;
      canvas.classList.toggle('off', m === 'off');
      if (m !== 'off') resize();
      if (m === 'title') { leg = null; buildTitle(); }
      if (m === 'drive') { leg = null; }
    },
    get mode() { return mode; },
    frame(state, dt) {
      if (mode === 'off') return;
      time += dt;
      if (mode === 'title') updateTitle(dt);
      else if (mode === 'drive') updateDrive(state, dt);
      renderer.render(scene, camera);
    },
    resize,
    // カメラとトラックのあいだに、物（看板・屋根など）が はさまっていないか（テスト用）
    occluders() {
      const rc = new THREE.Raycaster();
      const target = truck.position.clone(); target.y += 1.6;
      const dir = target.clone().sub(camera.position); const dist = dir.length(); dir.normalize();
      rc.set(camera.position, dir); rc.far = dist * 0.92; rc.camera = camera;
      const hits = rc.intersectObjects(world.children, true).filter((h) => h.object.visible !== false && !h.object.userData.noOcclude && !h.object.isLineSegments && !(h.object.material && h.object.material.opacity === 0));
      return hits.map((h) => ({ name: h.object.name || h.object.type, d: Math.round(h.distance * 10) / 10, y: Math.round(h.point.y * 10) / 10, z: Math.round(h.point.z * 10) / 10 }));
    },
    debug() { return { calls: renderer.info.render.calls, mode, leg: leg && leg.id, cam: camera.position.toArray().map((x) => Math.round(x * 10) / 10), look: camLook.toArray().map((x) => Math.round(x * 10) / 10), truck: truck.position.toArray().map((x) => Math.round(x * 10) / 10), world: world.children.length, introT, kids: hz.filter((it) => it.objs.kid).map((it) => ({ p: it.objs.kid.position.toArray().map((x) => Math.round(x * 10) / 10), vis: it.objs.kid.visible, sprite: !!it.objs.kid.isSprite })) }; },
    truckScreenY() {
      const v = truck.position.clone(); v.y += 1.5; v.project(camera);
      return (1 - (v.y + 1) / 2) * (canvas.clientHeight || 1);
    },
  };
  buildTitle();
  resize();
  return api;
}
