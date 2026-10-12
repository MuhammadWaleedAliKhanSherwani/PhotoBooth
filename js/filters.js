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
];

const filterById = (id) => FILTERS.find((f) => f.id === id) || FILTERS[0];

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

function applyOverlays(ctx, w, h, f, o) {
  const k = w / 640;

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

  const date = o.date || new Date();
  if (f.stamp) drawDateStamp(ctx, w, h, k, date);
  if (f.vhs) drawVhsHud(ctx, w, h, k, date);
}

function drawDateStamp(ctx, w, h, k, date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const txt = `'${yy}  ${mm}  ${dd}`;
  ctx.save();
  ctx.font = `${Math.round(34 * k)}px "VT323", ui-monospace, monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255,90,0,.9)';
  ctx.shadowBlur = 8 * k;
  ctx.fillStyle = '#ffa043';
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
