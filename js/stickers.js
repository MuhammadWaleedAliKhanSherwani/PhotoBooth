/* =========================================================================
   stickers.js — hand-drawn canvas stickers (no images, nothing to load).
   Every sticker is drawn centred on (0,0) with size `s`.
   ========================================================================= */

const STICKER_INK = '#4a3426';

function heartPath(ctx, x, y, s) {
  const t = s / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + t * 0.9);
  ctx.bezierCurveTo(x - t * 1.6, y - t * 0.1, x - t * 0.6, y - t * 1.2, x, y - t * 0.45);
  ctx.bezierCurveTo(x + t * 0.6, y - t * 1.2, x + t * 1.6, y - t * 0.1, x, y + t * 0.9);
  ctx.closePath();
}

/** white die-cut border + soft shadow under a sticker silhouette */
function stickerBase(ctx, s, path) {
  ctx.save();
  ctx.shadowColor = 'rgba(60,40,20,.28)';
  ctx.shadowBlur = s * 0.08;
  ctx.shadowOffsetY = s * 0.03;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.13;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  path();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function dot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function oval(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function kawaiiFace(ctx, x, y, s, happy) {
  ctx.save();
  ctx.strokeStyle = STICKER_INK;
  ctx.fillStyle = STICKER_INK;
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  if (happy) {
    ctx.beginPath();
    ctx.arc(x - s * 0.1, y + s * 0.01, s * 0.04, Math.PI, TAU);
    ctx.moveTo(x + s * 0.14, y + s * 0.01);
    ctx.arc(x + s * 0.1, y + s * 0.01, s * 0.04, Math.PI, TAU);
    ctx.stroke();
  } else {
    dot(ctx, x - s * 0.1, y, s * 0.032, STICKER_INK);
    dot(ctx, x + s * 0.1, y, s * 0.032, STICKER_INK);
  }
  ctx.beginPath();
  ctx.arc(x, y + s * 0.03, s * 0.04, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  oval(ctx, x - s * 0.17, y + s * 0.06, s * 0.045, s * 0.026, 'rgba(247,161,181,.9)');
  oval(ctx, x + s * 0.17, y + s * 0.06, s * 0.045, s * 0.026, 'rgba(247,161,181,.9)');
  ctx.restore();
}

/* ---------- individual stickers ---------- */

function stHeart(ctx, s, rng) {
  const colors = ['#f48fb1', '#e37f9c', '#ff8a80', '#f6b8c8'];
  const p = () => heartPath(ctx, 0, 0, s * 0.95);
  stickerBase(ctx, s, p);
  p();
  ctx.fillStyle = colors[(rng() * colors.length) | 0];
  ctx.fill();
  oval(ctx, -s * 0.2, -s * 0.2, s * 0.08, s * 0.05, 'rgba(255,255,255,.65)', -0.7);
}

function pawPath(ctx, s) {
  ctx.beginPath();
  ctx.ellipse(0, s * 0.14, s * 0.26, s * 0.21, 0, 0, TAU);
  [[-0.29, -0.1, 0.1], [-0.11, -0.29, 0.105], [0.11, -0.29, 0.105], [0.29, -0.1, 0.1]].forEach(([x, y, r]) => {
    ctx.moveTo(x * s + r * s, y * s);
    ctx.ellipse(x * s, y * s, r * s, r * s * 1.2, 0, 0, TAU);
  });
}

function stPaw(ctx, s, rng) {
  const furs = ['#a8754d', '#3a3330', '#f2b880', '#9aa0a8'];
  stickerBase(ctx, s, () => pawPath(ctx, s));
  pawPath(ctx, s);
  ctx.fillStyle = furs[(rng() * furs.length) | 0];
  ctx.fill();
  // pink beans
  oval(ctx, 0, s * 0.16, s * 0.15, s * 0.11, '#f7a1b5');
  [[-0.29, -0.1], [-0.11, -0.29], [0.11, -0.29], [0.29, -0.1]].forEach(([x, y]) => oval(ctx, x * s, y * s, s * 0.05, s * 0.06, '#f7a1b5'));
}

function catHeadPath(ctx, s) {
  ctx.beginPath();
  ctx.ellipse(0, s * 0.06, s * 0.4, s * 0.33, 0, 0, TAU);
  ctx.moveTo(-s * 0.38, -s * 0.02);
  ctx.lineTo(-s * 0.3, -s * 0.42);
  ctx.lineTo(-s * 0.08, -s * 0.24);
  ctx.closePath();
  ctx.moveTo(s * 0.08, -s * 0.24);
  ctx.lineTo(s * 0.3, -s * 0.42);
  ctx.lineTo(s * 0.38, -s * 0.02);
  ctx.closePath();
}

function stCat(ctx, s, rng) {
  const furs = [['#f2b880', '#d98f52'], ['#3a3330', '#5a504c'], ['#b8bec6', '#9aa0a8'], ['#fff4e6', '#e9d6bf']];
  const [fur, stripe] = furs[(rng() * furs.length) | 0];
  const dark = fur === '#3a3330';
  stickerBase(ctx, s, () => catHeadPath(ctx, s));
  catHeadPath(ctx, s);
  ctx.fillStyle = fur;
  ctx.fill();
  // inner ears
  ctx.fillStyle = '#f7a1b5';
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, -s * 0.08); ctx.lineTo(-s * 0.28, -s * 0.32); ctx.lineTo(-s * 0.14, -s * 0.2); ctx.closePath();
  ctx.moveTo(s * 0.14, -s * 0.2); ctx.lineTo(s * 0.28, -s * 0.32); ctx.lineTo(s * 0.32, -s * 0.08); ctx.closePath();
  ctx.fill();
  // forehead stripes
  ctx.strokeStyle = stripe;
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.24); ctx.lineTo(-s * 0.04, -s * 0.15);
  ctx.moveTo(0, -s * 0.26); ctx.lineTo(0, -s * 0.16);
  ctx.moveTo(s * 0.06, -s * 0.24); ctx.lineTo(s * 0.04, -s * 0.15);
  ctx.stroke();

  const ink = dark ? '#fff4e6' : STICKER_INK;
  const happy = rng() < 0.5;
  ctx.strokeStyle = ink;
  ctx.lineWidth = s * 0.03;
  if (happy) {
    ctx.beginPath();
    ctx.arc(-s * 0.15, s * 0.05, s * 0.05, Math.PI * 1.1, Math.PI * 1.9);
    ctx.moveTo(s * 0.2, s * 0.03);
    ctx.arc(s * 0.15, s * 0.05, s * 0.05, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    const eye = dark ? '#f6d66b' : STICKER_INK;
    oval(ctx, -s * 0.15, s * 0.03, s * 0.045, s * 0.055, eye);
    oval(ctx, s * 0.15, s * 0.03, s * 0.045, s * 0.055, eye);
    if (dark) {
      oval(ctx, -s * 0.15, s * 0.03, s * 0.015, s * 0.045, '#1d1613');
      oval(ctx, s * 0.15, s * 0.03, s * 0.015, s * 0.045, '#1d1613');
    }
    dot(ctx, -s * 0.135, s * 0.01, s * 0.016, '#fff');
    dot(ctx, s * 0.165, s * 0.01, s * 0.016, '#fff');
  }
  // nose + ω mouth
  ctx.fillStyle = '#e37f9c';
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, s * 0.1); ctx.lineTo(s * 0.03, s * 0.1); ctx.lineTo(0, s * 0.135); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-s * 0.035, s * 0.14, s * 0.035, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.moveTo(s * 0.07, s * 0.14);
  ctx.arc(s * 0.035, s * 0.14, s * 0.035, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  oval(ctx, -s * 0.25, s * 0.13, s * 0.06, s * 0.035, 'rgba(247,161,181,.85)');
  oval(ctx, s * 0.25, s * 0.13, s * 0.06, s * 0.035, 'rgba(247,161,181,.85)');
  // whiskers
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = s * 0.018;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, s * 0.08); ctx.lineTo(-s * 0.48, s * 0.04);
  ctx.moveTo(-s * 0.3, s * 0.12); ctx.lineTo(-s * 0.48, s * 0.14);
  ctx.moveTo(s * 0.3, s * 0.08); ctx.lineTo(s * 0.48, s * 0.04);
  ctx.moveTo(s * 0.3, s * 0.12); ctx.lineTo(s * 0.48, s * 0.14);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function icedCupPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(-s * 0.27, -s * 0.22);
  ctx.lineTo(s * 0.27, -s * 0.22);
  ctx.lineTo(s * 0.2, s * 0.42);
  ctx.lineTo(-s * 0.2, s * 0.42);
  ctx.closePath();
}

function stMatcha(ctx, s) {
  const straw = () => {
    ctx.save();
    ctx.rotate(0.22);
    ctx.beginPath();
    ctx.rect(s * 0.02, -s * 0.5, s * 0.08, s * 0.4);
    ctx.restore();
  };
  stickerBase(ctx, s, () => { icedCupPath(ctx, s); ctx.save(); ctx.rotate(0.22); ctx.rect(s * 0.02, -s * 0.5, s * 0.08, s * 0.4); ctx.restore(); });
  // straw
  straw();
  ctx.fillStyle = '#f6b8c8';
  ctx.fill();
  // liquid
  icedCupPath(ctx, s);
  const g = ctx.createLinearGradient(0, -s * 0.22, 0, s * 0.42);
  g.addColorStop(0, '#a9cb87');
  g.addColorStop(0.5, '#9cbf7a');
  g.addColorStop(0.52, '#c9dcae');
  g.addColorStop(0.58, '#f6efe0');
  g.addColorStop(1, '#f6efe0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#bcd0a6';
  ctx.lineWidth = s * 0.025;
  ctx.stroke();
  // ice
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  [[-0.12, -0.1, -0.2], [0.08, -0.05, 0.25]].forEach(([x, y, r]) => {
    ctx.save();
    ctx.translate(x * s, y * s);
    ctx.rotate(r);
    ctx.fillRect(-s * 0.07, -s * 0.07, s * 0.14, s * 0.14);
    ctx.restore();
  });
  // lid rim
  ctx.fillStyle = '#e6f0d6';
  ctx.fillRect(-s * 0.3, -s * 0.26, s * 0.6, s * 0.06);
  kawaiiFace(ctx, 0, s * 0.22, s, false);
}

function stHazel(ctx, s) {
  const mug = () => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.14);
    ctx.lineTo(s * 0.24, -s * 0.14);
    ctx.lineTo(s * 0.2, s * 0.3);
    ctx.quadraticCurveTo(s * 0.19, s * 0.38, s * 0.1, s * 0.38);
    ctx.lineTo(-s * 0.16, s * 0.38);
    ctx.quadraticCurveTo(-s * 0.25, s * 0.38, -s * 0.26, s * 0.3);
    ctx.closePath();
    ctx.moveTo(s * 0.22 + s * 0.17, s * 0.08);
    ctx.ellipse(s * 0.22, s * 0.08, s * 0.17, s * 0.13, 0, 0, TAU);
  };
  stickerBase(ctx, s, mug);
  // handle
  ctx.beginPath();
  ctx.ellipse(s * 0.22, s * 0.08, s * 0.12, s * 0.09, 0, 0, TAU);
  ctx.strokeStyle = '#f1e2cf';
  ctx.lineWidth = s * 0.06;
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.14);
  ctx.lineTo(s * 0.24, -s * 0.14);
  ctx.lineTo(s * 0.2, s * 0.3);
  ctx.quadraticCurveTo(s * 0.19, s * 0.38, s * 0.1, s * 0.38);
  ctx.lineTo(-s * 0.16, s * 0.38);
  ctx.quadraticCurveTo(-s * 0.25, s * 0.38, -s * 0.26, s * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#fffaf3';
  ctx.fill();
  ctx.strokeStyle = '#e3cfb8';
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
  ctx.fillStyle = '#a8754d';
  ctx.fillRect(-s * 0.285, s * 0.0, s * 0.51, s * 0.06);
  // coffee + foam heart
  oval(ctx, -s * 0.03, -s * 0.14, s * 0.27, s * 0.06, '#b07a4f');
  ctx.fillStyle = '#f3e3d1';
  heartPath(ctx, -s * 0.03, -s * 0.14, s * 0.1);
  ctx.fill();
  // steam
  ctx.strokeStyle = '#c9a98a';
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  [-0.12, 0.06].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * s, -s * 0.24);
    ctx.quadraticCurveTo(x * s - s * 0.06, -s * 0.31, x * s, -s * 0.37);
    ctx.quadraticCurveTo(x * s + s * 0.06, -s * 0.43, x * s, -s * 0.49);
    ctx.stroke();
  });
  kawaiiFace(ctx, -s * 0.03, s * 0.2, s, true);
}

function sparklePath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.closePath();
}

function stSparkle(ctx, s, rng) {
  const colors = ['#ffd56b', '#ffe8a3', '#c9dcae', '#f6b8c8'];
  stickerBase(ctx, s, () => sparklePath(ctx, s * 0.45));
  sparklePath(ctx, s * 0.45);
  ctx.fillStyle = colors[(rng() * colors.length) | 0];
  ctx.fill();
  ctx.save();
  ctx.translate(s * 0.3, -s * 0.28);
  sparklePath(ctx, s * 0.12);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

function stBow(ctx, s) {
  const bow = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.2, -s * 0.35, -s * 0.5, -s * 0.15, -s * 0.38, s * 0.08);
    ctx.bezierCurveTo(-s * 0.3, s * 0.2, -s * 0.12, s * 0.1, 0, 0);
    ctx.bezierCurveTo(s * 0.12, s * 0.1, s * 0.3, s * 0.2, s * 0.38, s * 0.08);
    ctx.bezierCurveTo(s * 0.5, -s * 0.15, s * 0.2, -s * 0.35, 0, 0);
    ctx.moveTo(-s * 0.05, s * 0.02);
    ctx.lineTo(-s * 0.2, s * 0.4);
    ctx.lineTo(-s * 0.08, s * 0.36);
    ctx.lineTo(0, s * 0.05);
    ctx.lineTo(s * 0.08, s * 0.36);
    ctx.lineTo(s * 0.2, s * 0.4);
    ctx.lineTo(s * 0.05, s * 0.02);
  };
  stickerBase(ctx, s, bow);
  bow();
  ctx.fillStyle = '#f48fb1';
  ctx.fill();
  dot(ctx, 0, 0, s * 0.08, '#e37f9c');
  oval(ctx, -s * 0.25, -s * 0.06, s * 0.06, s * 0.03, 'rgba(255,255,255,.6)', -0.5);
}

/* ---------- retro set ---------- */

function stSmiley(ctx, s) {
  const p = () => { ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, TAU); };
  stickerBase(ctx, s, p);
  p();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = '#3b2416';
  ctx.stroke();
  oval(ctx, -s * 0.13, -s * 0.1, s * 0.045, s * 0.09, '#3b2416');
  oval(ctx, s * 0.13, -s * 0.1, s * 0.045, s * 0.09, '#3b2416');
  ctx.beginPath();
  ctx.arc(0, s * 0.02, s * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function stDaisy(ctx, s, rng) {
  const petals = ['#fffaf0', '#f2a6c0', '#e9a03b'];
  const color = petals[(rng() * petals.length) | 0];
  const p = () => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const x = Math.cos(a) * s * 0.26, y = Math.sin(a) * s * 0.26;
      ctx.moveTo(x + s * 0.16, y);
      ctx.ellipse(x, y, s * 0.16, s * 0.16, 0, 0, TAU);
    }
  };
  stickerBase(ctx, s, p);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    oval(ctx, Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26, s * 0.16, s * 0.16, color);
  }
  dot(ctx, 0, 0, s * 0.17, color === '#e9a03b' ? '#7a3b1b' : '#e9a03b');
  dot(ctx, -s * 0.05, -s * 0.05, s * 0.05, 'rgba(255,255,255,.5)');
}

function stCassette(ctx, s) {
  const w = s * 0.92, h = s * 0.6;
  const body = () => { ctx.beginPath(); roundRectPath(ctx, -w / 2, -h / 2, w, h, s * 0.06); };
  stickerBase(ctx, s, body);
  body();
  ctx.fillStyle = '#2f2b2a';
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, -w * 0.42, -h * 0.4, w * 0.84, h * 0.5, s * 0.03);
  ctx.fillStyle = '#e9a03b';
  ctx.fill();
  ctx.fillStyle = '#d9622b';
  ctx.fillRect(-w * 0.42, -h * 0.4 + h * 0.12, w * 0.84, h * 0.07);
  ctx.beginPath();
  roundRectPath(ctx, -w * 0.28, -h * 0.12, w * 0.56, h * 0.18, s * 0.04);
  ctx.fillStyle = '#4a3f3a';
  ctx.fill();
  dot(ctx, -w * 0.17, -h * 0.03, s * 0.045, '#fff4e6');
  dot(ctx, w * 0.17, -h * 0.03, s * 0.045, '#fff4e6');
  ctx.fillStyle = '#3b2416';
  ctx.font = `${Math.round(s * 0.11)}px "Righteous", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAHEEN MIX', 0, -h * 0.29 + h * 0.02);
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, h * 0.5);
  ctx.lineTo(-w * 0.22, h * 0.22);
  ctx.lineTo(w * 0.22, h * 0.22);
  ctx.lineTo(w * 0.3, h * 0.5);
  ctx.fillStyle = '#4a3f3a';
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const STICKERS = {
  heart: stHeart, paw: stPaw, cat: stCat, matcha: stMatcha, hazel: stHazel,
  sparkle: stSparkle, bow: stBow, smiley: stSmiley, daisy: stDaisy, cassette: stCassette,
};
const CUTE_SET = ['heart', 'paw', 'cat', 'matcha', 'hazel', 'sparkle', 'bow', 'cat', 'heart'];
const RETRO_SET = ['smiley', 'daisy', 'cassette', 'cat', 'sparkle', 'paw', 'daisy', 'hazel', 'matcha'];

function drawSticker(ctx, kind, x, y, size, rot, rng) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  (STICKERS[kind] || stHeart)(ctx, size, rng || Math.random);
  ctx.restore();
}
