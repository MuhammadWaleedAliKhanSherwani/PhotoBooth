/* =========================================================================
   layouts.js — print layouts, frame colours and the final composer.
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
  return {
    ...base, w: 1160, slots,
    caption: { ...base.caption, cols: [[0, 580], [580, 580]] },
  };
}

function filmLayout() {
  const padX = 50, sw = 480, sh = 360, gap = 40, top = 120;
  const slots = [0, 1, 2].map((i) => ({ x: padX + i * (sw + gap), y: top, w: sw, h: sh }));
  return { id: 'film', name: 'Film Roll', w: padX * 2 + 3 * sw + 2 * gap, h: 600, shots: 3, slots, radius: 4, caption: { kind: 'film' } };
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
];
const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];

/** Which slot is shot number `i` taken for? (decides the preview's crop) */
function slotForShot(L, i) {
  return L.slots.find((s, idx) => (s.shot ?? idx) === i) || L.slots[0];
}

const FRAMES = [
  { id: 'cream', name: 'Milk', bg: '#fffaf2', text: '#6b4428', dots: 'rgba(168,117,77,.09)' },
  { id: 'matcha', name: 'Matcha', bg: '#c9dcae', text: '#3e5a2a', dots: 'rgba(255,255,255,.38)' },
  { id: 'hazel', name: 'Hazelnut', bg: '#a8754d', text: '#fff3e3', dots: 'rgba(255,255,255,.12)' },
  { id: 'strawberry', name: 'Strawberry Milk', bg: '#f9d3dc', text: '#a8455f', dots: 'rgba(255,255,255,.55)' },
  { id: 'sky', name: 'Sky', bg: '#cfe3f2', text: '#3b5a78', dots: 'rgba(255,255,255,.5)' },
  { id: 'lavender', name: 'Lavender', bg: '#e3d7f2', text: '#5b4a7a', dots: 'rgba(255,255,255,.5)' },
  { id: 'midnight', name: 'Midnight', bg: '#2b2320', text: '#f6e7d2', dots: 'rgba(255,255,255,.06)' },
  { id: 'kraft', name: 'Kraft Paper', bg: '#cfae84', text: '#4a3020', speckle: true },
  { id: 'seventies', name: "'70s", bg: '#f2d8a7', text: '#7a3b1b', stripes: ['#d9622b', '#e9a03b', '#7a3b1b'] },
];
const frameById = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];

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

function fitFont(ctx, text, family, size, maxW) {
  ctx.font = `${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size = Math.max(12, (size * maxW) / w);
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function dateLabel(d, retro) {
  if (retro) {
    return `${String(d.getMonth() + 1).padStart(2, '0')}·${String(d.getDate()).padStart(2, '0')}·${d.getFullYear()}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const FONT = {
  cute: '"Pacifico", "Brush Script MT", cursive',
  retro: '"Righteous", "Fredoka", sans-serif',
  hand: '"Caveat", "Segoe Print", cursive',
  ui: '"Fredoka", system-ui, sans-serif',
  mono: '"VT323", ui-monospace, monospace',
};

/* ---------- backgrounds ---------- */
function drawPaper(ctx, L, T, seed) {
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, L.w, L.h);
  if (T.dots) {
    ctx.fillStyle = T.dots;
    const sp = 34;
    for (let y = sp / 2, row = 0; y < L.h; y += sp, row++) {
      for (let x = (row % 2 ? sp / 2 : 0) + sp / 4; x < L.w; x += sp) {
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, TAU);
        ctx.fill();
      }
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
  ctx.fillStyle = T.id === 'midnight' ? '#f6e7d2' : T.bg;
  for (let x = 22; x < L.w - 30; x += 56) {
    roundRect(ctx, x, 28, 26, 34, 5); ctx.fill();
    roundRect(ctx, x, L.h - 62, 26, 34, 5); ctx.fill();
  }
  ctx.fillStyle = '#f0a040';
  ctx.font = `26px ${FONT.mono}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  L.slots.forEach((sl, i) => ctx.fillText(`${i + 1}  ▸ ${i + 1}A`, sl.x + 4, 92));
  ctx.textAlign = 'right';
  ctx.fillText('MAHEEN 400 ♡ SAFETY FILM', L.w - 50, 92);
}

/* ---------- captions ---------- */
function drawCaption(ctx, L, T, s) {
  const cap = L.caption;
  const retro = s.retro;
  ctx.save();
  ctx.fillStyle = T.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (cap.kind === 'strip') {
    (cap.cols || [[0, L.w]]).forEach(([x, w]) => {
      const cx = x + w / 2;
      if (s.caption) {
        const size = fitFont(ctx, s.caption, retro ? FONT.retro : FONT.cute, Math.min(cap.h * 0.34, 72), w * 0.52);
        ctx.fillText(s.caption, cx, cap.y + cap.h * (retro ? 0.4 : 0.38));
        ctx.font = `${Math.max(18, size * (retro ? 0.5 : 0.38))}px ${retro ? FONT.mono : FONT.ui}`;
      } else {
        ctx.font = `${retro ? 34 : 26}px ${retro ? FONT.mono : FONT.ui}`;
      }
      ctx.globalAlpha = 0.72;
      ctx.fillText(dateLabel(s.date, retro), cx, cap.y + cap.h * (s.caption ? 0.74 : 0.5));
      ctx.globalAlpha = 1;
    });
  } else if (cap.kind === 'polaroid') {
    if (s.caption) {
      fitFont(ctx, s.caption, FONT.hand, 96, L.w * 0.8);
      ctx.fillText(s.caption, L.w / 2, cap.y + cap.h * 0.42);
    }
    ctx.globalAlpha = 0.6;
    ctx.font = `30px ${FONT.hand}`;
    ctx.textAlign = 'right';
    ctx.fillText(dateLabel(s.date, retro), L.w - 70, cap.y + cap.h * 0.8);
  } else if (cap.kind === 'film') {
    ctx.fillStyle = '#f6e7d2';
    if (s.caption) {
      fitFont(ctx, s.caption, retro ? FONT.retro : FONT.cute, 40, L.w * 0.5);
      ctx.fillText(s.caption, L.w / 2, 510);
    }
    ctx.fillStyle = '#f0a040';
    ctx.font = `26px ${FONT.mono}`;
    ctx.textAlign = 'left';
    ctx.fillText('▸ KODAK-ISH 400TX', 50, 512);
    ctx.textAlign = 'right';
    ctx.fillText(dateLabel(s.date, true), L.w - 50, 512);
  } else if (cap.kind === 'postcard') {
    drawPostcard(ctx, L, T, s);
  }
  ctx.restore();
}

function drawPostcard(ctx, L, T, s) {
  const ink = T.text;
  // under the photo
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.75;
  ctx.font = `500 34px ${FONT.ui}`;
  ctx.fillText(s.retro ? 'GREETINGS FROM' : 'greetings from', 530, 822);
  ctx.globalAlpha = 1;
  fitFont(ctx, s.caption || 'the photobooth', s.retro ? FONT.retro : FONT.cute, 84, 900);
  ctx.fillText(s.caption || 'the photobooth', 530, 900);

  // divider
  ctx.strokeStyle = ink;
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
  (STICKERS.cat)(ctx, 120, mulberry32(s.seed + 7));
  ctx.restore();
  ctx.fillStyle = '#4a3426';
  ctx.font = `30px ${FONT.mono}`;
  ctx.fillText(`♡ ${s.date.getFullYear()}`, sx + sw / 2, sy + sh - 32);

  // postmark
  ctx.save();
  ctx.strokeStyle = 'rgba(74,52,38,.55)';
  ctx.fillStyle = 'rgba(74,52,38,.6)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(1310, 190, 74, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(1310, 190, 60, 0, TAU); ctx.stroke();
  ctx.font = `26px ${FONT.mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MEOW CITY', 1310, 176);
  ctx.fillText(dateLabel(s.date, true), 1310, 206);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const y = 140 + i * 30;
    ctx.moveTo(1100, y);
    for (let x = 1100; x <= 1232; x += 22) ctx.quadraticCurveTo(x + 11, y + (i % 2 ? 8 : -8), x + 22, y);
    ctx.stroke();
  }
  ctx.restore();

  // message + address
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.font = `44px ${FONT.hand}`;
  ctx.fillText('wish you were here…', 1110, 380);
  ctx.fillText('oh wait, you are ♡', 1110, 432);

  const lines = ['To: Maheen', '12 Matcha & Hazelnut Lane', 'Cat Town ♡'];
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2.5;
  lines.forEach((_, i) => {
    ctx.beginPath();
    ctx.moveTo(1110, 620 + i * 96);
    ctx.lineTo(1540, 620 + i * 96);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  lines.forEach((t, i) => {
    fitFont(ctx, t, FONT.hand, 50, 420);
    ctx.fillText(t, 1116, 604 + i * 96);
  });
}

function dotFill(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
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
  const T = frameById(s.frame);
  const c = makeCanvas(L.w, L.h);
  const ctx = c.getContext('2d');

  if (L.caption.kind === 'film') drawFilmBase(ctx, L, T, s);
  else drawPaper(ctx, L, T, s.seed);

  L.slots.forEach((slot, i) => {
    const shot = shots[(slot.shot ?? i) % shots.length];
    const img = renderFiltered(shot, shot.width, shot.height, slot.w, slot.h, F, { seed: (slot.shot ?? i) + 1 + s.seed, date: s.date });
    ctx.save();
    if (slot.shape === 'heart') heartBoxPath(ctx, slot);
    else roundRect(ctx, slot.x, slot.y, slot.w, slot.h, L.radius ?? 12);
    ctx.save();
    ctx.shadowColor = 'rgba(60,40,20,.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = T.bg;
    ctx.fill();
    ctx.restore();
    ctx.clip();
    ctx.drawImage(img, slot.x, slot.y);
    ctx.restore();
    if (slot.shape === 'heart') {
      heartBoxPath(ctx, slot);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
  });

  drawCaption(ctx, L, T, s);
  if (s.stickers) drawStickersOn(ctx, L, s);
  return c;
}
