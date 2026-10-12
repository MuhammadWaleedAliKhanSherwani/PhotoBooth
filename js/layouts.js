/* =========================================================================
   layouts.js — print layouts, frame colours, editable text and the composer.
   ========================================================================= */

function stripLayout(id, name, n) {
  const pad = 40, sw = 520, sh = 390, gap = 24, cap = 170;
  const slots = [];
  for (let i = 0; i < n; i++) slots.push({ x: pad, y: pad + i * (sh + gap), w: sw, h: sh });
  const h = pad + n * sh + (n - 1) * gap + cap;
  return { id, name, w: 600, h, shots: n, slots, caption: { y: h - cap, h: cap, kind: 'strip' } };
}

function gridLayout(id, name, cols, rows) {
  const pad = 40, sw = 540, sh = 405, gap = 30, cap = 170;
  const slots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) slots.push({ x: pad + c * (sw + gap), y: pad + r * (sh + gap), w: sw, h: sh });
  }
  const w = pad * 2 + cols * sw + (cols - 1) * gap;
  const h = pad + rows * sh + (rows - 1) * gap + cap;
  return { id, name, w, h, shots: cols * rows, slots, caption: { y: h - cap, h: cap, kind: 'strip' } };
}

function twinStrips() {
  const base = stripLayout('twin', 'Twin Strips', 4);
  const slots = [];
  base.slots.forEach((s, i) => {
    slots.push({ ...s, shot: i });
    slots.push({ ...s, x: s.x + 560, shot: i });
  });
  return { ...base, w: 1160, slots, caption: { ...base.caption, cols: [[0, 580], [580, 580]] } };
}

function filmLayout() {
  const padX = 50, sw = 480, sh = 360, gap = 40, top = 120;
  const slots = [0, 1, 2].map((i) => ({ x: padX + i * (sw + gap), y: top, w: sw, h: sh }));
  return { id: 'film', name: 'Film Roll', w: padX * 2 + 3 * sw + 2 * gap, h: 600, shots: 3, slots, radius: 4, caption: { kind: 'film' } };
}

/* ---- professional layouts: flat mats, hairlines, serif titles, no cute patterns ---- */
function panelsLayout(id, name, n, panelW, panelH) {
  const pad = 70, gap = 30, cap = 190;
  const slots = [];
  for (let i = 0; i < n; i++) slots.push({ x: pad + i * (panelW + gap), y: pad, w: panelW, h: panelH });
  const w = pad * 2 + n * panelW + (n - 1) * gap;
  return { id, name, w, h: pad + panelH + cap, shots: n, slots, pro: true, caption: { y: pad + panelH, h: cap, kind: 'pro' } };
}

function contactSheet() {
  const pad = 60, sw = 440, sh = 330, gap = 24, top = 100, label = 56;
  const slots = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) slots.push({ x: pad + c * (sw + gap), y: top + r * (sh + label), w: sw, h: sh });
  }
  return { id: 'contact', name: 'Contact Sheet', w: pad * 2 + 3 * sw + 2 * gap, h: 1000, shots: 6, slots, pro: true, caption: { y: 870, h: 130, kind: 'contact' } };
}

const LAYOUTS = [
  stripLayout('classic4', 'Classic Strip', 4),
  stripLayout('trio', 'Trio Strip', 3),
  twinStrips(),
  { id: 'polaroid', name: 'Polaroid', w: 900, h: 1120, shots: 1, radius: 4, slots: [{ x: 60, y: 60, w: 780, h: 780 }], caption: { y: 840, h: 280, kind: 'polaroid' } },
  { id: 'heart', name: 'Heart', w: 1000, h: 1120, shots: 1, slots: [{ x: 60, y: 40, w: 880, h: 800, shape: 'heart' }], caption: { y: 880, h: 240, kind: 'strip' } },
  gridLayout('grid4', 'Grid of 4', 2, 2),
  {
    id: 'biglittle', name: 'Big & Little', w: 1200, h: 1279, shots: 3,
    slots: [{ x: 40, y: 40, w: 1120, h: 630 }, { x: 40, y: 700, w: 545, h: 409 }, { x: 615, y: 700, w: 545, h: 409 }],
    caption: { y: 1109, h: 170, kind: 'strip' },
  },
  filmLayout(),
  gridLayout('six', 'Six Pack', 2, 3),
  { id: 'postcard', name: 'Postcard', w: 1600, h: 1000, shots: 1, radius: 6, slots: [{ x: 50, y: 50, w: 960, h: 720 }], caption: { kind: 'postcard' } },

  // ✦ pro
  { id: 'gallery', name: 'Gallery Mat', w: 1200, h: 1560, shots: 1, pro: true, keyline: true,
    slots: [{ x: 150, y: 150, w: 900, h: 1125 }], caption: { y: 1300, h: 260, kind: 'pro-center' } },
  panelsLayout('diptych', 'Diptych', 2, 615, 820),
  panelsLayout('triptych', 'Triptych', 3, 530, 707),
  { id: 'editorial', name: 'Editorial', w: 1500, h: 1150, shots: 3, pro: true,
    slots: [{ x: 60, y: 60, w: 820, h: 900 }, { x: 910, y: 60, w: 530, h: 435 }, { x: 910, y: 525, w: 530, h: 435 }],
    caption: { y: 960, h: 190, kind: 'pro' } },
  { id: 'lookbook', name: 'Lookbook', w: 1200, h: 1340, shots: 4, pro: true,
    slots: [{ x: 60, y: 60, w: 1080, h: 720 }, { x: 60, y: 810, w: 340, h: 340 }, { x: 430, y: 810, w: 340, h: 340 }, { x: 800, y: 810, w: 340, h: 340 }],
    caption: { y: 1150, h: 190, kind: 'pro' } },
  { id: 'cleangrid', name: 'Clean Grid', w: 1176, h: 1306, shots: 4, pro: true,
    slots: [{ x: 60, y: 60, w: 520, h: 520 }, { x: 596, y: 60, w: 520, h: 520 }, { x: 60, y: 596, w: 520, h: 520 }, { x: 596, y: 596, w: 520, h: 520 }],
    caption: { y: 1116, h: 190, kind: 'pro' } },
  contactSheet(),
];
const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];

/** Which slot is shot number `i` taken for? (decides the preview's crop) */
function slotForShot(L, i) {
  return L.slots.find((s, idx) => (s.shot ?? idx) === i) || L.slots[0];
}

/* ---------- frame colours (plus any custom colour) ---------- */
const FRAMES = [
  { id: 'cream', name: 'Milk', bg: '#fffaf2', text: '#6b4428', dots: 'rgba(168,117,77,.09)' },
  { id: 'white', name: 'Gallery White', bg: '#ffffff', text: '#222222' },
  { id: 'matcha', name: 'Matcha', bg: '#c9dcae', text: '#3e5a2a', dots: 'rgba(255,255,255,.38)' },
  { id: 'hazel', name: 'Hazelnut', bg: '#a8754d', text: '#fff3e3', dots: 'rgba(255,255,255,.12)' },
  { id: 'strawberry', name: 'Strawberry Milk', bg: '#f9d3dc', text: '#a8455f', dots: 'rgba(255,255,255,.55)' },
  { id: 'sky', name: 'Sky', bg: '#cfe3f2', text: '#3b5a78', dots: 'rgba(255,255,255,.5)' },
  { id: 'lavender', name: 'Lavender', bg: '#e3d7f2', text: '#5b4a7a', dots: 'rgba(255,255,255,.5)' },
  { id: 'midnight', name: 'Midnight', bg: '#2b2320', text: '#f6e7d2', dots: 'rgba(255,255,255,.06)' },
  { id: 'black', name: 'Gallery Black', bg: '#111111', text: '#f2f2f2' },
  { id: 'kraft', name: 'Kraft Paper', bg: '#cfae84', text: '#4a3020', speckle: true },
  { id: 'seventies', name: "'70s", bg: '#f2d8a7', text: '#7a3b1b', stripes: ['#d9622b', '#e9a03b', '#7a3b1b'] },
];
const frameById = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];

function isLight(hex) {
  const [r, g, b] = hexRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** frame for a session: one of the presets, or 'custom' + any colour she picks */
function frameFor(s) {
  if (s.frame !== 'custom' || !s.frameColor) return frameById(s.frame);
  const light = isLight(s.frameColor);
  return {
    id: 'custom', name: 'Custom', bg: s.frameColor,
    text: light ? '#3b2a20' : '#fff7ee',
    dots: light ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.08)',
  };
}

/* ---------- fonts ---------- */
const FONTS = {
  script: { name: 'Script', css: '"Pacifico", "Brush Script MT", cursive' },
  hand: { name: 'Handwritten', css: '"Caveat", "Segoe Print", cursive', w: '600' },
  rounded: { name: 'Rounded', css: '"Fredoka", system-ui, sans-serif', w: '500' },
  retro: { name: 'Retro', css: '"Righteous", "Fredoka", sans-serif' },
  pixel: { name: 'Pixel', css: '"VT323", ui-monospace, monospace' },
  serif: { name: 'Serif', css: '"DM Serif Display", Georgia, serif' },
  modern: { name: 'Modern', css: '"Montserrat", "Segoe UI", sans-serif', w: '600' },
};
const fontCss = (id, size) => `${FONTS[id].w || '400'} ${Math.round(size)}px ${FONTS[id].css}`;

function fitText(ctx, text, fontId, size, maxW) {
  ctx.font = fontCss(fontId, size);
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size = Math.max(12, (size * maxW) / w);
    ctx.font = fontCss(fontId, size);
  }
  return size;
}

function titleFont(s, L) {
  if (s.font && s.font !== 'auto') return s.font;
  if (L.pro) return 'serif';
  if (L.caption.kind === 'polaroid') return 'hand';
  return s.retro ? 'retro' : 'script';
}
function subFont(s, L) {
  if (L.pro) return 'modern';
  if (L.caption.kind === 'polaroid') return 'hand';
  return s.retro ? 'pixel' : 'rounded';
}

/** letter-spaced text (canvas letterSpacing isn't everywhere yet) */
function spacedText(ctx, text, x, y, spacing, align = 'left') {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.save();
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.restore();
  return total;
}

function dateLabel(d, retro) {
  if (retro) {
    return `${String(d.getMonth() + 1).padStart(2, '0')}·${String(d.getDate()).padStart(2, '0')}·${d.getFullYear()}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- editable text fields ---------- */
const TEXT_FIELDS = {
  caption: { label: 'Caption' },
  sub: { label: 'Small line', def: (s, L) => (L.pro ? dateLabel(s.date, false).toUpperCase() : dateLabel(s.date, s.retro)) },
  greeting: { label: 'Greeting', def: (s) => (s.retro ? 'GREETINGS FROM' : 'greetings from') },
  msg1: { label: 'Message', def: () => 'wish you were here…' },
  msg2: { label: 'Message (2nd line)', def: () => 'oh wait, you are ♡' },
  to: { label: 'To', def: () => 'To: Maheen' },
  addr1: { label: 'Address', def: () => '12 Matcha & Hazelnut Lane' },
  addr2: { label: 'Address (2nd line)', def: () => 'Cat Town ♡' },
  postmark: { label: 'Postmark', def: () => 'MEOW CITY' },
  edgeTop: { label: 'Film edge (top)', def: () => 'MAHEEN 400 ♡ SAFETY FILM' },
  edgeBottom: { label: 'Film edge (bottom)', def: () => '▸ KODAK-ISH 400TX' },
  header: { label: 'Header', def: () => 'MAHEEN · CONTACT SHEET' },
};

/** which text fields a layout shows (in the order the editor lists them) */
function layoutTextKeys(L) {
  switch (L.caption.kind) {
    case 'postcard': return ['greeting', 'caption', 'msg1', 'msg2', 'to', 'addr1', 'addr2', 'postmark', 'sub'];
    case 'film': return ['caption', 'sub', 'edgeTop', 'edgeBottom'];
    case 'contact': return ['header', 'caption', 'sub'];
    default: return ['caption', 'sub'];
  }
}

/** the text for a field: what she typed, else the default ('' hides it) */
function txt(s, key, L) {
  if (key === 'caption') return s.caption || '';
  const v = s.texts?.[key];
  if (v != null) return v;
  const f = TEXT_FIELDS[key];
  return f.def ? f.def(s, L || layoutById(s.layout)) : '';
}

/** text colour: hers if she picked one, otherwise whatever suits the spot */
const ink = (s, fallback) => s.textColor || fallback;

/* ---------- helpers ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
}

function heartBoxPath(ctx, s) {
  ctx.beginPath();
  const cx = s.x + s.w / 2;
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * TAU;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const x = cx + (hx / 16) * (s.w / 2);
    const y = s.y + ((11.8 - hy) / 28.8) * s.h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function dotFill(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/* ---------- backgrounds ---------- */
function drawPaper(ctx, L, T, seed) {
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, L.w, L.h);
  if (L.pro) return; // pro prints stay clean
  if (T.dots) {
    ctx.fillStyle = T.dots;
    const sp = 34;
    for (let y = sp / 2, row = 0; y < L.h; y += sp, row++) {
      for (let x = (row % 2 ? sp / 2 : 0) + sp / 4; x < L.w; x += sp) dotFill(ctx, x, y, 4.5);
    }
  }
  if (T.speckle) {
    const rng = mulberry32(seed);
    const n = Math.round((L.w * L.h) / 500);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rng() < 0.5 ? 'rgba(70,40,20,.13)' : 'rgba(255,245,225,.18)';
      const r = 1 + rng() * 2.2;
      ctx.fillRect(rng() * L.w, rng() * L.h, r, r);
    }
  }
  if (T.stripes) {
    T.stripes.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(6 + i * 10, 0, 7, L.h);
      ctx.fillRect(L.w - 13 - i * 10, 0, 7, L.h);
    });
  }
}

function drawFilmBase(ctx, L, T, s) {
  ctx.fillStyle = '#1d1613';
  ctx.fillRect(0, 0, L.w, L.h);
  ctx.fillStyle = T.id === 'midnight' || T.id === 'black' ? '#f6e7d2' : T.bg;
  for (let x = 22; x < L.w - 30; x += 56) {
    roundRect(ctx, x, 28, 26, 34, 5); ctx.fill();
    roundRect(ctx, x, L.h - 62, 26, 34, 5); ctx.fill();
  }
  ctx.fillStyle = ink(s, '#f0a040');
  ctx.font = fontCss('pixel', 26);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  L.slots.forEach((sl, i) => ctx.fillText(`${i + 1}  ▸ ${i + 1}A`, sl.x + 4, 92));
  ctx.textAlign = 'right';
  ctx.fillText(txt(s, 'edgeTop', L), L.w - 50, 92);
}

/* ---------- captions ---------- */
function drawCaption(ctx, L, T, s) {
  const cap = L.caption;
  const tf = titleFont(s, L), sf = subFont(s, L);
  const title = txt(s, 'caption', L), sub = txt(s, 'sub', L);
  ctx.save();
  ctx.fillStyle = ink(s, T.text);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (cap.kind === 'strip') {
    (cap.cols || [[0, L.w]]).forEach(([x, w]) => {
      const cx = x + w / 2;
      let size = Math.min(cap.h * 0.34, 72);
      if (title) {
        size = fitText(ctx, title, tf, size, w * 0.52);
        ctx.fillText(title, cx, cap.y + cap.h * (sub ? 0.38 : 0.5));
      }
      if (sub) {
        ctx.font = fontCss(sf, title ? Math.max(18, size * (sf === 'pixel' ? 0.5 : 0.38)) : sf === 'pixel' ? 34 : 26);
        ctx.globalAlpha = 0.72;
        ctx.fillText(sub, cx, cap.y + cap.h * (title ? 0.74 : 0.5));
        ctx.globalAlpha = 1;
      }
    });
  } else if (cap.kind === 'polaroid') {
    if (title) {
      fitText(ctx, title, tf, tf === 'hand' ? 96 : 72, L.w * 0.7);
      ctx.fillText(title, L.w / 2, cap.y + cap.h * 0.42);
    }
    if (sub) {
      ctx.globalAlpha = 0.6;
      fitText(ctx, sub, sf, 30, L.w * 0.5);
      ctx.textAlign = 'right';
      ctx.fillText(sub, L.w - 70, cap.y + cap.h * 0.8);
    }
  } else if (cap.kind === 'film') {
    ctx.fillStyle = ink(s, '#f6e7d2');
    if (title) {
      fitText(ctx, title, tf, 40, L.w * 0.4);
      ctx.fillText(title, L.w / 2, 510);
    }
    ctx.fillStyle = ink(s, '#f0a040');
    ctx.font = fontCss('pixel', 26);
    ctx.textAlign = 'left';
    ctx.fillText(txt(s, 'edgeBottom', L), 50, 512);
    ctx.textAlign = 'right';
    if (sub) ctx.fillText(sub, L.w - 50, 512);
  } else if (cap.kind === 'postcard') {
    drawPostcard(ctx, L, T, s);
  } else if (cap.kind === 'pro' || cap.kind === 'contact') {
    drawProCaption(ctx, L, s, tf, sf, title, sub);
  } else if (cap.kind === 'pro-center') {
    const cx = L.w / 2;
    if (title) {
      fitText(ctx, title, tf, 76, L.w * 0.7);
      ctx.fillText(title, cx, cap.y + cap.h * 0.38);
    }
    if (sub) {
      ctx.font = fontCss(sf, 22);
      ctx.globalAlpha = 0.7;
      spacedText(ctx, sub.toUpperCase(), cx, cap.y + cap.h * (title ? 0.68 : 0.45), 6, 'center');
    }
  }
  ctx.restore();
}

/** clean editorial caption: hairline, serif title on the left, spaced small caps on the right */
function drawProCaption(ctx, L, s, tf, sf, title, sub) {
  const cap = L.caption;
  const left = Math.min(...L.slots.map((sl) => sl.x));
  const right = Math.max(...L.slots.map((sl) => sl.x + sl.w));
  const y = cap.y + cap.h * 0.52;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillRect(left, cap.y + 26, right - left, 2);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  if (title) {
    fitText(ctx, title, tf, Math.min(cap.h * 0.36, 64), (right - left) * 0.55);
    ctx.fillText(title, left, y);
  }
  if (sub) {
    ctx.font = fontCss(sf, 22);
    ctx.globalAlpha = 0.7;
    spacedText(ctx, sub.toUpperCase(), right, y, 5, 'right');
  }
  ctx.restore();

  if (L.caption.kind === 'contact') {
    // header + frame numbers, like a darkroom proof sheet
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = fontCss('modern', 22);
    ctx.globalAlpha = 0.8;
    spacedText(ctx, txt(s, 'header', L).toUpperCase(), left, 52, 6, 'left');
    spacedText(ctx, `${L.shots} FRAMES · ISO 400`, right, 52, 6, 'right');
    ctx.font = fontCss('pixel', 30);
    L.slots.forEach((sl, i) => {
      ctx.globalAlpha = 0.75;
      ctx.textAlign = 'left';
      ctx.fillText(`▲ ${String(i + 1).padStart(2, '0')}`, sl.x, sl.y + sl.h + 26);
      ctx.textAlign = 'right';
      ctx.globalAlpha = 0.45;
      ctx.fillText(`${i + 1}A`, sl.x + sl.w, sl.y + sl.h + 26);
    });
    ctx.restore();
  }
}

function drawPostcard(ctx, L, T, s) {
  const color = ink(s, T.text);
  const tf = titleFont(s, L);
  const title = txt(s, 'caption', L);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const greeting = txt(s, 'greeting', L);
  if (greeting) {
    ctx.globalAlpha = 0.75;
    fitText(ctx, greeting, 'rounded', 34, 900);
    ctx.fillText(greeting, 530, 822);
    ctx.globalAlpha = 1;
  }
  if (title) {
    fitText(ctx, title, tf, 84, 900);
    ctx.fillText(title, 530, 900);
  }

  // divider
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1070, 80);
  ctx.lineTo(1070, 920);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // stamp (perforated)
  const sx = 1350, sy = 70, sw = 190, sh = 220;
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.fillStyle = T.bg;
  for (let x = sx; x <= sx + sw; x += 19) { dotFill(ctx, x, sy, 6); dotFill(ctx, x, sy + sh, 6); }
  for (let y = sy; y <= sy + sh; y += 22) { dotFill(ctx, sx, y, 6); dotFill(ctx, sx + sw, y, 6); }
  ctx.fillStyle = s.retro ? '#e9a03b' : '#c9dcae';
  ctx.fillRect(sx + 16, sy + 16, sw - 32, sh - 32);
  ctx.save();
  ctx.translate(sx + sw / 2, sy + sh / 2 - 12);
  STICKERS.cat(ctx, 120, mulberry32(s.seed + 7));
  ctx.restore();
  ctx.fillStyle = '#4a3426';
  ctx.font = fontCss('pixel', 30);
  ctx.fillText(`♡ ${s.date.getFullYear()}`, sx + sw / 2, sy + sh - 32);

  // postmark
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(1310, 190, 74, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(1310, 190, 60, 0, TAU); ctx.stroke();
  const pm = txt(s, 'postmark', L), pd = txt(s, 'sub', L);
  if (pm) { fitText(ctx, pm, 'pixel', 26, 104); ctx.fillText(pm, 1310, pd ? 176 : 190); }
  if (pd) { fitText(ctx, pd, 'pixel', 26, 104); ctx.fillText(pd, 1310, pm ? 206 : 190); }
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const y = 140 + i * 30;
    ctx.moveTo(1100, y);
    for (let x = 1100; x <= 1232; x += 22) ctx.quadraticCurveTo(x + 11, y + (i % 2 ? 8 : -8), x + 22, y);
    ctx.stroke();
  }
  ctx.restore();

  // message + address
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  [['msg1', 380], ['msg2', 432]].forEach(([k, y]) => {
    const t = txt(s, k, L);
    if (t) { fitText(ctx, t, 'hand', 44, 430); ctx.fillText(t, 1110, y); }
  });
  const lines = ['to', 'addr1', 'addr2'];
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2.5;
  lines.forEach((_, i) => {
    ctx.beginPath();
    ctx.moveTo(1110, 620 + i * 96);
    ctx.lineTo(1540, 620 + i * 96);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((k, i) => {
    const t = txt(s, k, L);
    if (!t) return;
    fitText(ctx, t, 'hand', 50, 420);
    ctx.fillText(t, 1116, 610 + i * 96);
  });
}

/* ---------- stickers on the print ---------- */
function drawStickersOn(ctx, L, s) {
  const rng = mulberry32(s.seed);
  const set = s.retro ? RETRO_SET : CUTE_SET;
  const pick = () => set[(rng() * set.length) | 0];
  const many = L.slots.length > 4;

  L.slots.forEach((slot) => {
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].sort(() => rng() - 0.5);
    const count = many ? (rng() < 0.6 ? 1 : 0) : rng() < 0.45 ? 2 : 1;
    for (let c = 0; c < count; c++) {
      const [cx, cy] = corners[c];
      const size = Math.min(slot.w, slot.h) * (0.2 + rng() * 0.08);
      const inset = size * 0.12;
      let x = slot.x + cx * slot.w + (cx ? -inset : inset);
      let y = slot.y + cy * slot.h + (cy ? -inset : inset);
      if (slot.shape === 'heart') { x = slot.x + slot.w * (cx ? 0.86 : 0.14); y = slot.y + slot.h * (cy ? 0.62 : 0.12); }
      const edge = size * 0.48;
      x = Math.min(Math.max(x, edge), L.w - edge);
      y = Math.min(Math.max(y, edge), L.h - edge);
      drawSticker(ctx, pick(), x, y, size, (rng() - 0.5) * 0.7, rng);
    }
  });

  const cap = L.caption;
  if (cap.kind === 'strip') {
    (cap.cols || [[0, L.w]]).forEach(([x, w]) => {
      const sz = Math.min(cap.h * 0.62, 110);
      drawSticker(ctx, s.retro ? 'cassette' : 'strawmatcha', x + w * 0.12 + sz * 0.2, cap.y + cap.h * 0.5, sz, -0.18, rng);
      drawSticker(ctx, s.retro ? 'smiley' : 'hazel', x + w * 0.88 - sz * 0.2, cap.y + cap.h * 0.5, sz, 0.15, rng);
    });
  } else if (cap.kind === 'polaroid') {
    drawSticker(ctx, 'cat', 120, cap.y + cap.h * 0.45, 120, -0.2, rng);
    drawSticker(ctx, s.retro ? 'daisy' : 'heart', L.w - 110, cap.y + cap.h * 0.3, 80, 0.25, rng);
  }
}

/* ---------- the composer ---------- */
function compose(shots, s) {
  const L = layoutById(s.layout);
  const F = filterById(s.filter);
  const T = frameFor(s);
  const c = makeCanvas(L.w, L.h);
  const ctx = c.getContext('2d');

  if (L.caption.kind === 'film') drawFilmBase(ctx, L, T, s);
  else drawPaper(ctx, L, T, s.seed);

  L.slots.forEach((slot, i) => {
    const shot = shots[(slot.shot ?? i) % shots.length];
    const img = renderFiltered(shot, shot.width, shot.height, slot.w, slot.h, F, { seed: (slot.shot ?? i) + 1 + s.seed, date: s.date });
    ctx.save();
    if (slot.shape === 'heart') heartBoxPath(ctx, slot);
    else roundRect(ctx, slot.x, slot.y, slot.w, slot.h, L.radius ?? (L.pro ? 0 : 12));
    if (!L.pro) {
      ctx.save();
      ctx.shadowColor = 'rgba(60,40,20,.18)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = T.bg;
      ctx.fill();
      ctx.restore();
    }
    ctx.clip();
    ctx.drawImage(img, slot.x, slot.y);
    ctx.restore();
    if (slot.shape === 'heart') {
      heartBoxPath(ctx, slot);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
    if (L.keyline) {
      // thin bevel line around the photo, like a framed gallery mat
      ctx.save();
      ctx.strokeStyle = ink(s, T.text);
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 2;
      ctx.strokeRect(slot.x - 22, slot.y - 22, slot.w + 44, slot.h + 44);
      ctx.restore();
    }
  });

  drawCaption(ctx, L, T, s);
  if (s.stickers) drawStickersOn(ctx, L, s);
  return c;
}
