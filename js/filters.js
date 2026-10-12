/* =========================================================================
   filters.js — colour-matrix filters + film effects.
   Everything is done with plain pixel maths so the live preview and the
   final photo look identical on every browser (Safari included).
   ========================================================================= */

const TAU = Math.PI * 2;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ---------- 4x5 colour matrices (rows R,G,B,A; last column = offset 0..255) ---------- */
const CM = {
  id: () => [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  // a ∘ b  (b is applied first)
  mul(a, b) {
    const o = new Array(20);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[r * 5 + k] * b[k * 5 + c];
        if (c === 4) s += a[r * 5 + 4];
        o[r * 5 + c] = s;
      }
    }
    return o;
  },
  chain: (...ms) => ms.reduce((acc, m) => CM.mul(m, acc), CM.id()),
  sat(s) {
    const r = 0.2126 * (1 - s), g = 0.7152 * (1 - s), b = 0.0722 * (1 - s);
    return [r + s, g, b, 0, 0, r, g + s, b, 0, 0, r, g, b + s, 0, 0, 0, 0, 0, 1, 0];
  },
  bright: (b) => [b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0],
  con(c) {
    const o = 128 * (1 - c);
    return [c, 0, 0, 0, o, 0, c, 0, 0, o, 0, 0, c, 0, o, 0, 0, 0, 1, 0];
  },
  scale: (r, g, b) => [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0],
  add: (r, g, b) => [1, 0, 0, 0, r, 0, 1, 0, 0, g, 0, 0, 1, 0, b, 0, 0, 0, 1, 0],
  sepia(a = 1) {
    const S = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131];
    const m = CM.id();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) m[r * 5 + c] = (r === c ? 1 - a : 0) + a * S[r * 3 + c];
    }
    return m;
  },
  hue(deg) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0, 0,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0, 0,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0, 0,
      0, 0, 0, 1, 0,
    ];
  },
};

const duo = (dark, light) => [...hexRgb(dark), ...hexRgb(light)];

/* ---------- the filters ---------- */
const FILTERS = [
  // ♡ cute
  { id: 'original', name: 'Original', group: 'cute', m: CM.id(), identity: true },
  { id: 'matcha', name: 'Matcha', group: 'cute', m: CM.chain(CM.sat(0.88), CM.scale(0.96, 1.04, 0.9), CM.add(10, 16, 6), CM.con(0.94)) },
  { id: 'hazelnut', name: 'Hazelnut', group: 'cute', m: CM.chain(CM.sepia(0.3), CM.sat(1.1), CM.scale(1.08, 1, 0.88), CM.bright(1.03)), vignette: 0.15 },
  { id: 'strawberry', name: 'Strawberry Milk', group: 'cute', m: CM.chain(CM.sat(0.9), CM.con(0.92), CM.add(22, 6, 14), CM.bright(1.03)), glow: 0.15 },
  { id: 'peach', name: 'Peachy', group: 'cute', m: CM.chain(CM.sat(1.1), CM.scale(1.06, 1, 0.94), CM.add(14, 6, 0)) },
  { id: 'dreamy', name: 'Dreamy', group: 'cute', m: CM.chain(CM.con(0.86), CM.sat(0.85), CM.add(14, 8, 18), CM.bright(1.05)), glow: 0.35 },
  { id: 'honey', name: 'Honey', group: 'cute', m: CM.chain(CM.sepia(0.2), CM.sat(1.25), CM.scale(1.1, 1.02, 0.85), CM.con(1.05)) },
  { id: 'sakura', name: 'Sakura', group: 'cute', m: CM.chain(CM.hue(-8), CM.add(20, 0, 12), CM.sat(1.1)), glow: 0.2 },
  { id: 'blueberry', name: 'Blueberry', group: 'cute', m: CM.chain(CM.sat(0.95), CM.scale(0.92, 1, 1.1), CM.add(0, 6, 18)) },
  { id: 'cloud', name: 'Cloud B&W', group: 'cute', m: CM.chain(CM.sat(0), CM.con(1.05), CM.bright(1.06)) },
  { id: 'noir', name: 'Noir', group: 'cute', m: CM.chain(CM.sat(0), CM.con(1.45)), vignette: 0.5, grain: 18 },
  { id: 'matchaduo', name: 'Matcha Duo', group: 'cute', m: CM.con(1.1), duo: duo('#2f4a22', '#eef5dc') },
  { id: 'hazelduo', name: 'Hazel Duo', group: 'cute', m: CM.con(1.1), duo: duo('#3b2414', '#f8e6cf') },

  // 📼 retro
  { id: 'disposable', name: "Disposable '98", group: 'retro', m: CM.chain(CM.bright(1.1), CM.con(1.1), CM.sat(1.15), CM.scale(1.05, 1, 0.92)), grain: 22, vignette: 0.35, leak: 0.18, stamp: true },
  { id: 'polaroid', name: "Polaroid '72", group: 'retro', m: CM.chain(CM.con(0.9), CM.sat(0.8), CM.sepia(0.15), CM.add(12, 8, 0)), vignette: 0.3, grain: 10, leak: 0.25 },
  { id: 'kodachrome', name: 'Kodachrome', group: 'retro', m: CM.chain(CM.sat(1.35), CM.con(1.15), CM.scale(1.08, 1, 0.9)), vignette: 0.25, grain: 8 },
  { id: 'vhs', name: 'VHS Tape', group: 'retro', m: CM.chain(CM.sat(1.25), CM.con(1.08), CM.add(0, 0, 8)), chroma: 3, scan: 0.16, grain: 14, vhs: true },
  { id: 'super8', name: 'Super 8', group: 'retro', m: CM.chain(CM.scale(1.1, 1, 0.8), CM.sat(0.9), CM.con(1.1)), grain: 20, vignette: 0.55, leak: 0.35 },
  { id: 'faded80s', name: "Faded '80s", group: 'retro', m: CM.chain(CM.con(0.8), CM.add(25, 18, 30), CM.sat(0.75)), grain: 10 },
  { id: 'crossproc', name: 'Cross Process', group: 'retro', m: CM.chain(CM.con(1.2), CM.scale(1.1, 1.1, 0.7), CM.add(-10, 0, 30), CM.sat(1.3)), vignette: 0.2 },
  { id: 'sepia1920', name: 'Sepia 1920', group: 'retro', m: CM.chain(CM.sepia(1), CM.con(1.1), CM.add(6, 4, 0)), grain: 26, vignette: 0.6 },
  { id: 'lomo', name: 'Lomo', group: 'retro', m: CM.chain(CM.sat(1.4), CM.con(1.25), CM.scale(1, 1.05, 0.95)), vignette: 0.75 },
  { id: 'riso', name: 'Riso Zine', group: 'retro', m: CM.con(1.15), duo: duo('#2346b8', '#ffd9e4'), grain: 16 },
  { id: 'gameboy', name: 'Game Boy', group: 'retro', m: CM.chain(CM.con(1.15), CM.bright(1.05)), pixelate: 4,
    palette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'].map(hexRgb), dither: 56 },

  // ☀ natural — clean everyday edits
  { id: 'natural', name: 'Natural', group: 'natural', m: CM.sat(1.05), curve: { all: [[0, 4], [128, 131], [255, 252]] } },
  { id: 'vivid', name: 'Vivid', group: 'natural', m: CM.chain(CM.sat(1.35), CM.con(1.08)) },
  { id: 'warm', name: 'Warm', group: 'natural', m: CM.chain(CM.scale(1.06, 1.01, 0.92), CM.add(6, 2, 0)) },
  { id: 'cool', name: 'Cool', group: 'natural', m: CM.chain(CM.scale(0.94, 1, 1.07), CM.add(0, 2, 8)) },
  { id: 'bright', name: 'Bright', group: 'natural', m: CM.bright(1.04), curve: { all: [[0, 10], [128, 150], [255, 255]] } },
  { id: 'golden', name: 'Golden Hour', group: 'natural', m: CM.chain(CM.scale(1.12, 1.02, 0.82), CM.sat(1.15)), glow: 0.15, leak: 0.15 },
  { id: 'softskin', name: 'Soft Skin', group: 'natural', m: CM.chain(CM.sat(0.95), CM.add(8, 4, 4)), soften: 0.35, glow: 0.1 },
  { id: 'crisp', name: 'Crisp', group: 'natural', m: CM.sat(1.1), curve: { all: [[0, 0], [64, 54], [192, 206], [255, 255]] } },
  { id: 'fade', name: 'Fade', group: 'natural', m: CM.sat(0.85), curve: { all: [[0, 40], [128, 132], [255, 235]] } },
  { id: 'pop', name: 'Pop', group: 'natural', m: CM.chain(CM.sat(1.5), CM.con(1.15), CM.bright(1.03)) },
  { id: 'moody', name: 'Moody', group: 'natural', m: CM.chain(CM.sat(0.75), CM.scale(0.95, 1, 1.04)), curve: { all: [[0, 22], [128, 118], [255, 230]] }, vignette: 0.3 },
  { id: 'dramatic', name: 'Dramatic', group: 'natural', m: CM.sat(0.8), curve: { all: [[0, 0], [70, 48], [180, 200], [255, 255]] }, vignette: 0.45 },
  { id: 'mono', name: 'Mono', group: 'natural', m: CM.chain(CM.sat(0), CM.con(1.1)) },

  // 📷 dazz — film-camera looks (tone curves, halation, flash, leaks, stamps)
  { id: 'dclassic', name: 'D Classic', group: 'dazz', m: CM.chain(CM.sat(1.05), CM.scale(1.06, 1, 0.9)),
    curve: { all: [[0, 18], [64, 66], [190, 200], [255, 245]] }, grain: 12, vignette: 0.25, stamp: true },
  { id: 'cpm35', name: 'CPM 35', group: 'dazz', m: CM.chain(CM.sat(0.92), CM.scale(1.04, 1.01, 0.94)),
    curve: { all: [[0, 20], [70, 75], [180, 192], [255, 248]], r: [[0, 0], [128, 136], [255, 255]], b: [[0, 12], [128, 124], [255, 240]] }, grain: 10, leak: 0.12 },
  { id: 'instc', name: 'Inst C', group: 'dazz', m: CM.chain(CM.bright(1.06), CM.sat(0.9)),
    curve: { all: [[0, 30], [128, 150], [255, 250]], g: [[0, 8], [255, 255]], b: [[0, 22], [128, 132], [255, 240]] }, vignette: 0.15, flash: 0.12 },
  { id: 'grf', name: 'GR F', group: 'dazz', m: CM.chain(CM.sat(0.85), CM.hue(-4)),
    curve: { all: [[0, 0], [60, 48], [190, 210], [255, 255]], b: [[0, 14], [128, 128], [255, 236]] }, grain: 10, vignette: 0.3 },
  { id: 'grdr', name: 'Grd R', group: 'dazz', m: CM.chain(CM.sepia(0.25), CM.sat(1.2), CM.scale(1.1, 1.03, 0.85)),
    curve: { all: [[0, 10], [128, 140], [255, 250]] }, leak: 0.2, grain: 10 },
  { id: 's67', name: 'S 67', group: 'dazz', m: CM.chain(CM.sat(1.1), CM.scale(1.03, 1, 0.96)),
    curve: { all: [[0, 10], [64, 60], [192, 200], [255, 250]] }, glow: 0.12, vignette: 0.2, grain: 5 },
  { id: 'nt16', name: 'NT 16', group: 'dazz', m: CM.chain(CM.sat(1.05), CM.scale(1.04, 1, 0.95)),
    curve: { all: [[0, 16], [128, 140], [255, 252]] }, flash: 0.25, vignette: 0.4, grain: 12, stamp: 'red' },
  { id: 'ne135', name: '135 NE', group: 'dazz', m: CM.chain(CM.sat(1.3), CM.con(1.1)),
    curve: { r: [[0, 6], [255, 255]], b: [[0, 0], [200, 190], [255, 240]] }, grain: 10, filmEdge: 'NE 100' },
  { id: 'fxnr', name: 'Fxn R', group: 'dazz', m: CM.chain(CM.sat(1.15), CM.con(1.05)),
    curve: { r: [[0, 0], [128, 124], [255, 250]], g: [[0, 14], [128, 134], [255, 252]], b: [[0, 6], [128, 126], [255, 235]] }, grain: 14 },
  { id: 'hoga', name: 'HOGA', group: 'dazz', m: CM.chain(CM.sat(1.35), CM.con(1.15)), vignette: 0.85, edgeBlur: 0.9, leak: 0.3, grain: 16 },
  { id: 'kv88', name: 'KV 88', group: 'dazz', m: CM.chain(CM.sat(1.1), CM.con(0.95), CM.add(6, 4, 0)), soften: 0.3, chroma: 2, scan: 0.08, cam: true },
  { id: 'dexp', name: 'D Exp', group: 'dazz', m: CM.chain(CM.hue(12), CM.sat(0.85), CM.add(18, 0, 14)),
    curve: { all: [[0, 34], [128, 128], [255, 230]], g: [[0, 0], [128, 118], [255, 245]] }, grain: 30, leak: 0.35, dust: 1, vignette: 0.35 },
  { id: 'kino', name: 'Kino 800', group: 'dazz', m: CM.chain(CM.scale(0.9, 0.98, 1.12), CM.sat(0.95)),
    curve: { all: [[0, 12], [60, 52], [200, 215], [255, 250]] }, halation: 0.9, grain: 16 },
  { id: 'y1998', name: '1998', group: 'dazz', m: CM.chain(CM.con(1.12), CM.sat(1.2)), flash: 0.3, vignette: 0.5, grain: 18, stamp: true },
  { id: 'slide', name: 'D Slide', group: 'dazz', m: CM.sat(1.5),
    curve: { all: [[0, 0], [50, 36], [200, 215], [255, 255]] }, vignette: 0.3 },
  { id: 'dmono', name: 'D Mono', group: 'dazz', m: CM.sat(0),
    curve: { all: [[0, 0], [60, 40], [190, 215], [255, 255]] }, grain: 34, vignette: 0.35, dust: 0.6 },
];

const FILTER_GROUPS = [
  { id: 'cute', label: '♡ Cute' },
  { id: 'natural', label: '☀ Natural' },
  { id: 'dazz', label: '📷 Dazz' },
  { id: 'retro', label: '📼 Retro' },
];

const filterById = (id) => FILTERS.find((f) => f.id === id) || FILTERS[0];

/* ---------- tone curves → 256-entry lookup tables (monotone cubic) ---------- */
function curveLUT(pts) {
  const n = pts.length;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  const lut = new Uint8ClampedArray(256);
  let k = 0;
  for (let x = 0; x < 256; x++) {
    while (k < n - 2 && x > xs[k + 1]) k++;
    const h = xs[k + 1] - xs[k];
    const t = Math.min(1, Math.max(0, (x - xs[k]) / h));
    const t2 = t * t, t3 = t2 * t;
    lut[x] = (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
  }
  return lut;
}

function filterLuts(f) {
  if (!f.curve) return null;
  if (f._lut) return f._lut;
  const id = [[0, 0], [255, 255]];
  const all = curveLUT(f.curve.all || id);
  f._lut = ['r', 'g', 'b'].map((c) => {
    const ch = curveLUT(f.curve[c] || id);
    const out = new Uint8ClampedArray(256);
    for (let x = 0; x < 256; x++) out[x] = ch[all[x]];
    return out;
  });
  return f._lut;
}

/* ---------- pixel pipeline ---------- */
const NOISE = (() => {
  const a = new Float32Array(65536);
  for (let i = 0; i < a.length; i++) a[i] = Math.random() - 0.5;
  return a;
})();
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function processPixels(d, w, h, f) {
  const m = f.m;
  const m0 = m[0], m1 = m[1], m2 = m[2], m4 = m[4];
  const m5 = m[5], m6 = m[6], m7 = m[7], m9 = m[9];
  const m10 = m[10], m11 = m[11], m12 = m[12], m14 = m[14];
  const grain = f.grain || 0;
  const chroma = f.chroma ? Math.max(1, Math.round((f.chroma * w) / 640)) : 0;
  const src = chroma ? d.slice() : d;
  const du = f.duo;
  const pal = f.palette;
  const pn = pal ? pal.length : 0;
  const dith = f.dither || 0;
  const luts = filterLuts(f);
  const lr = luts && luts[0], lg = luts && luts[1], lb = luts && luts[2];

  for (let y = 0; y < h; y++) {
    let n = (Math.random() * 65536) | 0;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = (row + x) << 2;
      let r, g, b;
      if (chroma) {
        r = src[(row + Math.min(w - 1, x + chroma)) << 2];
        g = src[i + 1];
        b = src[((row + Math.max(0, x - chroma)) << 2) + 2];
      } else {
        r = src[i]; g = src[i + 1]; b = src[i + 2];
      }
      let R = m0 * r + m1 * g + m2 * b + m4;
      let G = m5 * r + m6 * g + m7 * b + m9;
      let B = m10 * r + m11 * g + m12 * b + m14;

      if (lr) {
        R = lr[R < 0 ? 0 : R > 255 ? 255 : R | 0];
        G = lg[G < 0 ? 0 : G > 255 ? 255 : G | 0];
        B = lb[B < 0 ? 0 : B > 255 ? 255 : B | 0];
      }
      if (du) {
        let t = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        R = du[0] + (du[3] - du[0]) * t;
        G = du[1] + (du[4] - du[1]) * t;
        B = du[2] + (du[5] - du[2]) * t;
      }
      if (pal) {
        const l = 0.299 * R + 0.587 * G + 0.114 * B + (BAYER[((y & 3) << 2) | (x & 3)] / 16 - 0.47) * dith;
        let k = ((l * pn) / 256) | 0;
        k = k < 0 ? 0 : k >= pn ? pn - 1 : k;
        R = pal[k][0]; G = pal[k][1]; B = pal[k][2];
      }
      if (grain) {
        const z = NOISE[n++ & 65535] * grain;
        R += z; G += z; B += z;
      }
      d[i] = R; d[i + 1] = G; d[i + 2] = B;
    }
  }
}

const _scratch = {};
function scratch(key, w, h) {
  let c = _scratch[key];
  if (!c) c = _scratch[key] = makeCanvas(w, h);
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return c;
}

function ctx2d(c) {
  return c.getContext('2d', { willReadFrequently: true });
}

/** Draw `src` so it covers a w×h box (center crop), optionally mirrored. */
function drawCover(ctx, src, sw, sh, w, h, mirror) {
  const s = Math.max(w / sw, h / sh);
  const dw = sw * s, dh = sh * s;
  ctx.save();
  if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.restore();
}

/**
 * Render a source (video / canvas / image) through a filter into a w×h canvas.
 * opts: { target, mirror, seed, date }
 */
function renderFiltered(src, sw, sh, w, h, f, opts = {}) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const out = opts.target || makeCanvas(w, h);
  if (out.width !== w) out.width = w;
  if (out.height !== h) out.height = h;
  const ctx = ctx2d(out);

  const px = f.pixelate ? Math.max(2, Math.round((f.pixelate * w) / 640)) : 1;
  let work = out, wctx = ctx, ww = w, wh = h;
  if (px > 1) {
    ww = Math.max(1, Math.round(w / px));
    wh = Math.max(1, Math.round(h / px));
    work = scratch('pix', ww, wh);
    wctx = ctx2d(work);
  }

  wctx.imageSmoothingEnabled = true;
  wctx.imageSmoothingQuality = 'high';
  drawCover(wctx, src, sw, sh, ww, wh, opts.mirror);

  if (!f.identity) {
    const img = wctx.getImageData(0, 0, ww, wh);
    processPixels(img.data, ww, wh, f);
    wctx.putImageData(img, 0, 0);
  }
  if (px > 1) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(work, 0, 0, ww, wh, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }
  applyOverlays(ctx, w, h, f, opts);
  return out;
}

/** a blurred copy of the canvas (downscale → upscale), at 1/div resolution */
function blurredCopy(ctx, w, h, div, key) {
  const gw = Math.max(1, (w / div) | 0), gh = Math.max(1, (h / div) | 0);
  const g = scratch(key, gw, gh);
  const gctx = ctx2d(g);
  gctx.imageSmoothingEnabled = true;
  gctx.imageSmoothingQuality = 'high';
  gctx.clearRect(0, 0, gw, gh);
  gctx.drawImage(ctx.canvas, 0, 0, gw, gh);
  return g;
}

function applyOverlays(ctx, w, h, f, o) {
  const k = w / 640;
  ctx.imageSmoothingEnabled = true;

  if (f.soften) {
    const g = blurredCopy(ctx, w, h, 5, 'soft');
    ctx.save();
    ctx.globalAlpha = f.soften;
    ctx.drawImage(g, 0, 0, g.width, g.height, 0, 0, w, h);
    ctx.restore();
  }

  if (f.edgeBlur) {
    const g = blurredCopy(ctx, w, h, 14, 'edge');
    const mc = scratch('edgeMask', w, h);
    const mctx = mc.getContext('2d');
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, w, h);
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(g, 0, 0, g.width, g.height, 0, 0, w, h);
    mctx.globalCompositeOperation = 'destination-in';
    const gr = mctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.hypot(w, h) / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(0,0,0,${f.edgeBlur})`);
    mctx.fillStyle = gr;
    mctx.fillRect(0, 0, w, h);
    mctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(mc, 0, 0);
  }

  if (f.halation) {
    // red glow bleeding around bright highlights, like cinema film without an anti-halation layer
    const g = blurredCopy(ctx, w, h, 12, 'hal');
    const gctx = ctx2d(g);
    const img = gctx.getImageData(0, 0, g.width, g.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = l > 150 ? Math.min(1, (l - 150) / 80) : 0;
      d[i] = 255 * v; d[i + 1] = 70 * v; d[i + 2] = 30 * v;
    }
    gctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = f.halation;
    ctx.drawImage(g, 0, 0, g.width, g.height, 0, 0, w, h);
    ctx.restore();
  }

  if (f.flash) {
    // on-camera flash: hot centre, falling off fast
    const cx = w / 2, cy = h * 0.45;
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    gr.addColorStop(0, `rgba(255,255,255,${f.flash})`);
    gr.addColorStop(0.55, `rgba(255,250,240,${f.flash * 0.3})`);
    gr.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (f.glow) {
    const gw = Math.max(1, (w / 10) | 0), gh = Math.max(1, (h / 10) | 0);
    const g = scratch('glow', gw, gh);
    const gctx = g.getContext('2d');
    gctx.imageSmoothingEnabled = true;
    gctx.drawImage(ctx.canvas, 0, 0, gw, gh);
    ctx.save();
    ctx.globalAlpha = f.glow;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(g, 0, 0, gw, gh, 0, 0, w, h);
    ctx.restore();
  }

  if (f.leak) {
    const rng = mulberry32((o.seed || 0) * 977 + 13);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const cx = rng() < 0.5 ? -w * 0.05 : w * 1.05;
    const cy = h * (0.15 + rng() * 0.7);
    const rad = Math.max(w, h) * (0.45 + rng() * 0.35);
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    gr.addColorStop(0, `rgba(255,140,50,${f.leak})`);
    gr.addColorStop(0.45, `rgba(255,70,80,${f.leak * 0.55})`);
    gr.addColorStop(1, 'rgba(255,70,80,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (f.vignette) {
    const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(0,0,0,${f.vignette})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }

  if (f.scan) {
    ctx.fillStyle = `rgba(0,0,0,${f.scan})`;
    const step = Math.max(2, Math.round(3 * k));
    const lh = Math.max(1, Math.round(k));
    for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, lh);
  }

  if (f.dust) {
    const rng = mulberry32((o.seed || 0) * 31 + 7);
    const n = Math.round((f.dust * 50 * w * h) / (640 * 480));
    ctx.save();
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rng() < 0.7 ? 'rgba(255,255,255,.75)' : 'rgba(25,15,8,.55)';
      ctx.beginPath();
      ctx.arc(rng() * w, rng() * h, (0.5 + rng() * 1.6) * k, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = Math.max(1, k);
    for (let i = 0; i < 2; i++) {
      const x = rng() * w, y = rng() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (rng() - 0.5) * 80 * k, y + 40 * k, x + (rng() - 0.5) * 60 * k, y + (60 + rng() * 80) * k);
      ctx.stroke();
    }
    ctx.restore();
  }

  const date = o.date || new Date();
  if (f.filmEdge) drawFilmEdge(ctx, w, h, f.filmEdge, o.seed || 0);
  if (f.stamp) drawDateStamp(ctx, w, h, k, date, f.stamp);
  if (f.vhs) drawVhsHud(ctx, w, h, k, date);
  if (f.cam) drawCamHud(ctx, w, h, k, date);
}

/** black scanned-negative border with orange edge print */
function drawFilmEdge(ctx, w, h, label, seed) {
  const b = Math.max(4, Math.round(Math.min(w, h) * 0.05));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  roundRectPath(ctx, b, b, w - 2 * b, h - 2 * b, b * 0.6);
  ctx.fillStyle = '#0d0b0a';
  ctx.fill('evenodd');
  ctx.fillStyle = '#f0a040';
  ctx.font = `${Math.round(b * 0.8)}px "VT323", ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`${label}  ▸`, b * 1.5, h - b / 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${(seed % 36) + 1}A ▸`, w - b * 1.5, h - b / 2);
  ctx.restore();
}

/** 80s camcorder viewfinder */
function drawCamHud(ctx, w, h, k, date) {
  const p = (n) => String(n).padStart(2, '0');
  ctx.save();
  ctx.font = `${Math.round(34 * k)}px "VT323", ui-monospace, monospace`;
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowOffsetX = 2 * k;
  ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(34 * k, 34 * k, 9 * k, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText('REC', 50 * k, 18 * k);
  // battery
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2 * k;
  ctx.strokeRect(w - 76 * k, 22 * k, 44 * k, 22 * k);
  ctx.fillRect(w - 32 * k, 28 * k, 5 * k, 10 * k);
  ctx.fillRect(w - 72 * k, 26 * k, 26 * k, 14 * k);
  // corner brackets
  ctx.lineWidth = 3 * k;
  const m = 20 * k, L = 30 * k;
  [[m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * L);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * L, y);
    ctx.stroke();
  });
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${p(date.getMonth() + 1)}.${p(date.getDate())}.${date.getFullYear()}  ${p(date.getHours())}:${p(date.getMinutes())}`, w - 34 * k, h - 30 * k);
  ctx.restore();
}

const STAMP_COLORS = {
  orange: ['#ffa043', 'rgba(255,90,0,.9)'],
  red: ['#ff5a3c', 'rgba(255,30,0,.9)'],
  yellow: ['#ffd23f', 'rgba(255,170,0,.9)'],
};

function drawDateStamp(ctx, w, h, k, date, style) {
  const [fill, glow] = STAMP_COLORS[style] || STAMP_COLORS.orange;
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const txt = `'${yy}  ${mm}  ${dd}`;
  ctx.save();
  ctx.font = `${Math.round(34 * k)}px "VT323", ui-monospace, monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 8 * k;
  ctx.fillStyle = fill;
  ctx.fillText(txt, w - 22 * k, h - 20 * k);
  ctx.restore();
}

function drawVhsHud(ctx, w, h, k, date) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const hr = date.getHours();
  const ampm = hr < 12 ? 'AM' : 'PM';
  const h12 = String(hr % 12 || 12).padStart(2, ' ');
  const mi = String(date.getMinutes()).padStart(2, '0');
  ctx.save();
  ctx.font = `${Math.round(36 * k)}px "VT323", ui-monospace, monospace`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,.7)';
  ctx.shadowOffsetX = 2 * k;
  ctx.shadowOffsetY = 2 * k;
  ctx.textBaseline = 'top';
  ctx.fillText('PLAY ▶', 24 * k, 18 * k);
  ctx.textAlign = 'right';
  ctx.fillText('SP', w - 24 * k, 18 * k);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${ampm} ${h12}:${mi}`, 24 * k, h - 52 * k);
  ctx.fillText(`${months[date.getMonth()]}. ${String(date.getDate()).padStart(2, '0')} ${date.getFullYear()}`, 24 * k, h - 20 * k);
  ctx.restore();
}
