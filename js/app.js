/* =========================================================================
   app.js — Maheen's Photobooth ♡
   ========================================================================= */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const els = {
    video: $('#video'),
    preview: $('#preview'),
    placeholder: $('#cam-placeholder'),
    camError: $('#cam-error'),
    countdown: $('#countdown'),
    poseMsg: $('#pose-msg'),
    flash: $('#flash'),
    badge: $('#shot-badge'),
    tray: $('#shot-tray'),
    filterList: $('#filter-list'),
    filterTabs: $('#filter-tabs'),
    resultTabs: $('#result-tabs'),
    layoutList: $('#layout-list'),
    frameList: $('#frame-list'),
    caption: $('#caption'),
    galleryCount: $('#gallery-count'),
    toast: $('#toast'),
    resultModal: $('#result-modal'),
    resultCanvas: $('#result-canvas'),
    resultFilters: $('#result-filters'),
    resultFrames: $('#result-frames'),
    resultStickers: $('#result-stickers'),
    loveNote: $('#love-note'),
    savedNote: $('#saved-note'),
    galleryModal: $('#gallery-modal'),
    galleryGrid: $('#gallery-grid'),
    galleryEmpty: $('#gallery-empty'),
    gallerySub: $('#gallery-sub'),
    viewerModal: $('#viewer-modal'),
    viewerImg: $('#viewer-img'),
  };

  /* ---------------- settings ---------------- */
  const SETTINGS_KEY = 'maheen-pb-settings-v1';
  const DEFAULTS = {
    mode: 'cute',
    filterByMode: { cute: 'original', retro: 'disposable' },
    frameByMode: { cute: 'cream', retro: 'kraft' },
    layout: 'classic4',
    caption: 'Maheen ♡',
    timer: 3,
    stickers: true,
    sound: true,
    mirror: true,
    frameColor: '#f4c2d0',
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { /* ignore */ }
  const state = {
    ...DEFAULTS,
    ...saved,
    filterByMode: { ...DEFAULTS.filterByMode, ...saved.filterByMode },
    frameByMode: { ...DEFAULTS.frameByMode, ...saved.frameByMode },
    stream: null,
    facing: 'user',
    busy: false,
    cancel: false,
    shotIndex: 0,
    filterTab: 'cute',
  };
  const persist = () => {
    const { mode, filterByMode, frameByMode, frameColor, layout, caption, timer, stickers, sound, mirror } = state;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ mode, filterByMode, frameByMode, frameColor, layout, caption, timer, stickers, sound, mirror }));
    } catch { /* ignore */ }
  };
  const curFilter = () => filterById(state.filterByMode[state.mode]);
  const curFrame = () => state.frameByMode[state.mode];
  const curTheme = () => frameFor({ frame: curFrame(), frameColor: state.frameColor });
  const curLayout = () => layoutById(state.layout);

  /* ---------------- sounds (all synthesised, no files) ---------------- */
  let actx = null;
  function ac() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function beep(freq = 880, dur = 0.12, type = 'sine', vol = 0.12) {
    if (!state.sound) return;
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function shutterSound() {
    if (!state.sound) return;
    const a = ac(); if (!a) return;
    const len = Math.floor(a.sampleRate * 0.18);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.8;
    const g = a.createGain();
    g.gain.value = 0.5;
    src.connect(bp).connect(g).connect(a.destination);
    src.start();
    beep(1900, 0.03, 'square', 0.05);
  }
  function mew() {
    if (!state.sound) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    const vib = a.createOscillator(), vg = a.createGain();
    o.type = 'sawtooth';
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.linearRampToValueAtTime(1200, t + 0.45);
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(980, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(560, t + 0.45);
    vib.frequency.value = 9;
    vg.gain.value = 18;
    vib.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(lp).connect(g).connect(a.destination);
    o.start(t); vib.start(t);
    o.stop(t + 0.55); vib.stop(t + 0.55);
  }
  function chime() {
    [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.08), i * 90));
  }

  /* ---------------- little UI helpers ---------------- */
  let toastTimer;
  function toast(msg, ms = 2800) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  function heartsBurst(x, y, n = 8) {
    const glyphs = state.mode === 'retro' ? ['✦', '☮', '♡', '✿'] : ['♡', '♥', '🐾', '✿'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'burst';
      el.textContent = glyphs[i % glyphs.length];
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = 50 + Math.random() * 50;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      el.style.setProperty('--dy', `${Math.sin(a) * d - 30}px`);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  }

  function confetti() {
    const glyphs = state.mode === 'retro' ? ['✦', '☮', '★', '✿', '♡'] : ['♡', '🐾', '🍵', '🍓', '☕', '✿', '♥'];
    for (let i = 0; i < 36; i++) {
      const el = document.createElement('span');
      el.className = 'confetti';
      el.textContent = glyphs[i % glyphs.length];
      el.style.left = `${Math.random() * 100}vw`;
      el.style.animationDelay = `${Math.random() * 0.8}s`;
      el.style.animationDuration = `${2 + Math.random() * 1.5}s`;
      el.style.fontSize = `${14 + Math.random() * 18}px`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4500);
    }
  }

  const NOTES = {
    cute: [
      'Maheen, the camera is officially obsessed with you ♡',
      'The cats have reviewed this. 10/10, purrfect.',
      'Prettier than a perfectly poured latte ☕',
      'Certified cutest member of the strawberry matcha club 🍓',
      'This one is going straight on the fridge',
      'Warning: dangerously cute levels detected',
      'Somebody call a museum, we have a masterpiece',
      'Even Gina woke up for this one',
      'Miso, Gina & Blackie all voted: 10/10',
    ],
    retro: [
      'Far out, Maheen ✌ totally groovy',
      'Developed in 1 hour — no film wasted',
      'Pure 35mm magic ✦',
      'Rewind it, play it again, still cute',
      'Radical. Tubular. Maheen.',
      'Straight out of a vintage scrapbook',
    ],
  };
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function greet() {
    const h = new Date().getHours();
    const lines =
      h < 5 ? ['up late, Maheen? the cats are too 🌙', 'midnight photoshoot? iconic ♡'] :
      h < 12 ? ['good morning Maheen ☀ matcha first?', 'morning pretty ♡ the lattes are ready'] :
      h < 17 ? ['good afternoon Maheen ♡ hazelnut latte break?', 'hi Maheen! the cats saved you a seat'] :
      ['good evening Maheen ✨ golden hour selfies?', 'hi pretty ♡ ready for a photoshoot?'];
    $('#greeting').textContent = pick(lines);
  }

  /* ---------------- mode (cute / retro) ---------------- */
  function applyMode(announce) {
    document.body.classList.toggle('retro', state.mode === 'retro');
    $$('.mode-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
    document.querySelector('meta[name="theme-color"]').content = state.mode === 'retro' ? '#f4e4c1' : '#f6efe3';
    state.filterTab = curFilter().group;
    buildFilterChips();
    buildFrames(els.frameList, curFrame(), state.frameColor, (id, color) => {
      state.frameByMode[state.mode] = id;
      if (color) state.frameColor = color;
      persist();
      refreshPanelNames();
      buildLayouts();
    });
    buildLayouts();
    refreshPanelNames();
    buildFloaties();
    if (announce) {
      toast(state.mode === 'retro' ? 'Retro mode — groovy ✌ the cats found their sunglasses' : 'Cute mode ♡ back to matcha & kittens');
      beep(state.mode === 'retro' ? 330 : 990, 0.15, state.mode === 'retro' ? 'square' : 'sine', 0.08);
    }
  }

  function refreshPanelNames() {
    $('#filter-name').textContent = curFilter().name;
    $('#layout-name').textContent = curLayout().name;
    $('#frame-name').textContent = curTheme().name;
  }

  /* ---------------- filter chips with live thumbnails ---------------- */
  let thumbCanvases = [];
  const sample = makeSampleScene();

  function makeSampleScene() {
    const c = makeCanvas(320, 240);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 240);
    g.addColorStop(0, '#f9d3dc');
    g.addColorStop(0.6, '#fff1e0');
    g.addColorStop(1, '#c9dcae');
    x.fillStyle = g;
    x.fillRect(0, 0, 320, 240);
    x.fillStyle = 'rgba(255,214,107,.85)';
    x.beginPath(); x.arc(250, 60, 30, 0, TAU); x.fill();
    x.fillStyle = '#9cbf7a';
    x.beginPath(); x.ellipse(80, 250, 140, 60, 0, 0, TAU); x.fill();
    x.fillStyle = '#b07a4f';
    x.beginPath(); x.ellipse(270, 260, 120, 60, 0, 0, TAU); x.fill();
    drawSticker(x, 'cat', 160, 130, 150, 0, mulberry32(4));
    return c;
  }

  function chipEl(f, selected, onPick, size = [76, 57]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (selected ? ' active' : '');
    b.dataset.id = f.id;
    b.title = f.name;
    const c = makeCanvas(size[0], size[1]);
    const s = document.createElement('span');
    s.textContent = f.name;
    b.append(c, s);
    b.addEventListener('click', () => onPick(f.id));
    return { b, c };
  }

  /** tab row: ♡ Cute · ☀ Natural · 📷 Dazz · 📼 Retro */
  function buildTabs(container, active, onPick) {
    container.innerHTML = '';
    FILTER_GROUPS.forEach((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'tab';
      b.className = 'tab' + (g.id === active ? ' active' : '');
      b.setAttribute('aria-selected', g.id === active);
      b.textContent = g.label;
      b.addEventListener('click', () => onPick(g.id));
      container.appendChild(b);
    });
  }

  function buildFilterChips() {
    buildTabs(els.filterTabs, state.filterTab, (tab) => { state.filterTab = tab; buildFilterChips(); });
    els.filterList.innerHTML = '';
    thumbCanvases = [];
    FILTERS.filter((f) => f.group === state.filterTab).forEach((f) => {
      const { b, c } = chipEl(f, f.id === curFilter().id, (id) => {
        state.filterByMode[state.mode] = id;
        persist();
        $$('.chip', els.filterList).forEach((x) => x.classList.toggle('active', x.dataset.id === id));
        refreshPanelNames();
        if (!state.stream) drawIdlePreview();
      });
      els.filterList.appendChild(b);
      thumbCanvases.push({ c, f });
    });
    updateThumbs();
  }

  function thumbSource() {
    const v = els.video;
    if (state.stream && v.readyState >= 2 && v.videoWidth) return [v, v.videoWidth, v.videoHeight, state.mirror];
    return [sample, sample.width, sample.height, false];
  }

  function updateThumbs() {
    const [src, w, h, mirror] = thumbSource();
    thumbCanvases.forEach(({ c, f }) => renderFiltered(src, w, h, c.width, c.height, f, { target: c, mirror }));
  }

  /* ---------------- layouts ---------------- */
  function buildLayouts() {
    els.layoutList.innerHTML = '';
    const T = curTheme();
    LAYOUTS.forEach((L, idx) => {
      if (L.pro && !LAYOUTS[idx - 1]?.pro) {
        const d = document.createElement('div');
        d.className = 'layout-divider';
        d.textContent = '✦ pro layouts';
        els.layoutList.appendChild(d);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'layout-card' + (L.id === state.layout ? ' active' : '');
      b.dataset.id = L.id;
      const mini = document.createElement('div');
      mini.className = 'mini' + (L.caption.kind === 'film' ? ' film' : '');
      mini.style.aspectRatio = `${L.w} / ${L.h}`;
      mini.style.background = L.caption.kind === 'film' ? '#1d1613' : L.pro && T.id === 'cream' ? '#fff' : T.bg;
      L.slots.forEach((s) => {
        const i = document.createElement('i');
        if (s.shape === 'heart') i.className = 'heart';
        i.style.left = `${(s.x / L.w) * 100}%`;
        i.style.top = `${(s.y / L.h) * 100}%`;
        i.style.width = `${(s.w / L.w) * 100}%`;
        i.style.height = `${(s.h / L.h) * 100}%`;
        mini.appendChild(i);
      });
      const name = document.createElement('span');
      name.textContent = L.name;
      const sub = document.createElement('small');
      sub.textContent = L.shots === 1 ? '1 shot' : `${L.shots} shots`;
      b.append(mini, name, sub);
      b.addEventListener('click', () => {
        if (state.busy) return;
        state.layout = L.id;
        persist();
        $$('.layout-card', els.layoutList).forEach((x) => x.classList.toggle('active', x.dataset.id === L.id));
        refreshPanelNames();
        shapeKey = '';
        if (!state.stream) drawIdlePreview();
        else previewSize();
      });
      els.layoutList.appendChild(b);
    });
  }

  /* ---------------- frame swatches ---------------- */
  function buildFrames(container, selected, customColor, onPick) {
    container.innerHTML = '';
    FRAMES.forEach((T) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (T.id === selected ? ' active' : '');
      b.dataset.id = T.id;
      b.title = T.name;
      b.style.background = T.stripes
        ? `linear-gradient(90deg, ${T.stripes[0]} 0 18%, ${T.stripes[1]} 18% 34%, ${T.bg} 34%)`
        : T.bg;
      b.addEventListener('click', () => {
        $$('.swatch', container).forEach((x) => x.classList.toggle('active', x === b));
        onPick(T.id);
      });
      container.appendChild(b);
    });
    container.appendChild(colorSwatch(selected === 'custom', customColor, 'Pick any frame colour', (hex) => {
      $$('.swatch', container).forEach((x) => x.classList.toggle('active', x.classList.contains('custom')));
      onPick('custom', hex);
    }));
  }

  /** a rainbow swatch wrapping <input type=color>; shows the picked colour once chosen */
  function colorSwatch(active, color, title, onInput) {
    const l = document.createElement('label');
    l.className = 'swatch custom' + (active ? ' active' : '');
    l.title = title;
    if (active && color) l.style.background = color;
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = color || '#f4c2d0';
    inp.setAttribute('aria-label', title);
    let t;
    inp.addEventListener('input', () => {
      l.style.background = inp.value;
      clearTimeout(t);
      t = setTimeout(() => onInput(inp.value), 120);
    });
    inp.addEventListener('click', () => { l.style.background = inp.value; onInput(inp.value); });
    l.appendChild(inp);
    return l;
  }

  /* ---------------- camera ---------------- */
  async function startCamera() {
    els.camError.hidden = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      showCamError(window.isSecureContext === false
        ? 'The camera only works on https:// or localhost. Pick photos instead, or open the hosted link ♡'
        : "This browser can't use the camera. Pick photos instead ♡");
      return false;
    }
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: state.facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      state.stream = stream;
      els.video.srcObject = stream;
      await els.video.play().catch(() => {});
      els.placeholder.hidden = true;
      document.body.classList.add('cam-on');
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      $('#btn-flip').hidden = devices.filter((d) => d.kind === 'videoinput').length < 2;
      return true;
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError' ? 'Camera permission was blocked — allow it in the browser settings, or pick photos instead.' :
        err.name === 'NotFoundError' ? "Couldn't find a camera. You can still pick photos from your gallery ♡" :
        `Camera trouble (${err.name}). Try again or pick photos instead.`;
      showCamError(msg);
      return false;
    }
  }

  function stopCamera() {
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
    document.body.classList.remove('cam-on');
  }

  function showCamError(msg) {
    els.placeholder.hidden = false;
    els.camError.textContent = msg;
    els.camError.hidden = false;
  }

  /* ---------------- live preview loop ---------------- */
  const PREVIEW_W = Math.min(720, Math.round(Math.max(480, window.innerWidth * 0.6)));
  let lastThumb = 0;

  function previewSize() {
    const slot = slotForShot(curLayout(), state.shotIndex);
    syncShape(slot);
    return [PREVIEW_W, Math.round((PREVIEW_W * slot.h) / slot.w)];
  }

  /** the camera window takes the exact shape of the photo slot it's filling */
  const cameraWrap = $('.camera-wrap');
  const ratioBadge = $('#ratio-badge');
  let shapeKey = '';
  function ratioName(w, h) {
    const r = w / h;
    const named = [[1, '1:1'], [4 / 3, '4:3'], [3 / 4, '3:4'], [16 / 9, '16:9'], [4 / 5, '4:5'], [3 / 2, '3:2'], [2 / 3, '2:3']];
    const hit = named.find(([v]) => Math.abs(v - r) < 0.02);
    if (hit) return hit[1];
    return r >= 1 ? `${r.toFixed(2)}:1` : `1:${(1 / r).toFixed(2)}`;
  }
  function syncShape(slot) {
    const key = `${slot.w}x${slot.h}`;
    if (key === shapeKey) return;
    shapeKey = key;
    cameraWrap.style.setProperty('--ar', (slot.w / slot.h).toFixed(4));
    ratioBadge.textContent = `${curLayout().name} · ${ratioName(slot.w, slot.h)}`;
    // show the shape briefly, then get out of the way of date stamps & HUDs
    ratioBadge.classList.add('show');
    clearTimeout(syncShape.t);
    syncShape.t = setTimeout(() => ratioBadge.classList.remove('show'), 2600);
  }

  function drawIdlePreview() {
    const [w, h] = previewSize();
    renderFiltered(sample, sample.width, sample.height, w, h, curFilter(), { target: els.preview });
  }

  function loop(t) {
    requestAnimationFrame(loop);
    const v = els.video;
    if (!state.stream || v.readyState < 2 || !v.videoWidth) return;
    const [w, h] = previewSize();
    renderFiltered(v, v.videoWidth, v.videoHeight, w, h, curFilter(), { target: els.preview, mirror: state.mirror });
    if (!state.busy && t - lastThumb > 450) {
      lastThumb = t;
      updateThumbs();
    }
  }

  function grabFrame() {
    const v = els.video;
    const vw = v.videoWidth, vh = v.videoHeight;
    const k = Math.min(1, 1600 / Math.max(vw, vh));
    const c = makeCanvas(vw * k, vh * k);
    drawCover(c.getContext('2d'), v, vw, vh, c.width, c.height, state.mirror);
    return c;
  }

  /* ---------------- shooting session ---------------- */
  function showCount(n) {
    els.countdown.innerHTML = '';
    if (n == null) return;
    const s = document.createElement('span');
    s.textContent = n;
    els.countdown.appendChild(s);
  }

  async function countdown(secs) {
    for (let n = secs; n > 0; n--) {
      if (state.cancel) return false;
      showCount(n);
      beep(n === 1 ? 1320 : 880, 0.12, state.mode === 'retro' ? 'square' : 'sine', state.mode === 'retro' ? 0.05 : 0.12);
      await wait(1000);
    }
    showCount(null);
    return !state.cancel;
  }

  function flash() {
    els.flash.classList.remove('go');
    void els.flash.offsetWidth;
    els.flash.classList.add('go');
  }

  async function say(msg, ms) {
    els.poseMsg.textContent = msg;
    els.poseMsg.classList.add('show');
    await wait(ms);
    els.poseMsg.classList.remove('show');
  }

  function setBusy(on) {
    state.busy = on;
    document.body.classList.toggle('shooting', on);
    $('#btn-snap').disabled = on;
  }

  async function startSession() {
    if (state.busy) return;
    if (!state.stream && !(await startCamera())) return;
    const L = curLayout();
    const shots = [];
    state.cancel = false;
    setBusy(true);
    els.tray.innerHTML = '';
    els.badge.hidden = false;
    try {
      for (let i = 0; i < L.shots; i++) {
        state.shotIndex = i;
        els.badge.textContent = `${i + 1} / ${L.shots}`;
        if (i > 0) await say(pick(['next pose!', 'make a silly face!', 'cute one now ♡', 'blow a kiss!', 'peace sign ✌', 'cat ears! 🐱']), 900);
        else if (L.shots > 1) await say(`${L.shots} photos — get ready!`, 900);
        if (!(await countdown(state.timer))) throw new Error('cancelled');
        flash();
        shutterSound();
        const frame = grabFrame();
        shots.push(frame);
        const thumb = makeCanvas(96, (96 * frame.height) / frame.width);
        thumb.getContext('2d').drawImage(frame, 0, 0, thumb.width, thumb.height);
        els.tray.appendChild(thumb);
        await wait(450);
      }
    } catch {
      showCount(null);
      toast('Cancelled — no worries, take your time ♡');
      return;
    } finally {
      setBusy(false);
      state.shotIndex = 0;
      els.badge.hidden = true;
    }
    openResult(shots);
  }

  /* ---------------- upload instead of camera ---------------- */
  async function loadFiles(files) {
    files = [...files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const L = curLayout();
    const shots = [];
    for (const file of files.slice(0, L.shots)) {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = url;
        });
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = makeCanvas(img.naturalWidth * k, img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        shots.push(c);
      } catch {
        /* skip unreadable files */
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (!shots.length) return toast("Couldn't read those photos 😿");
    if (files.length < L.shots) toast(`${curLayout().name} uses ${L.shots} photos — repeating the ones you picked ♡`);
    openResult(shots);
  }

  /* ---------------- result ---------------- */
  let session = null;
  let renderToken = 0;

  const fontsReady = (() => {
    if (!document.fonts?.load) return Promise.resolve();
    const all = Promise.all(
      ['40px Pacifico', '600 40px Caveat', '40px VT323', '40px Righteous', '500 40px Fredoka', '40px "DM Serif Display"', '600 40px Montserrat'].map((f) => document.fonts.load(f))
    ).catch(() => {});
    return Promise.race([all, wait(3000)]);
  })();

  async function openResult(shots) {
    session = {
      id: Date.now(),
      shots,
      layout: state.layout,
      mode: state.mode,
      filter: curFilter().id,
      frame: curFrame(),
      stickers: state.stickers && !layoutById(state.layout).pro,
      caption: state.caption,
      frameColor: state.frameColor,
      texts: {},
      textColor: null,
      font: 'auto',
      seed: (Math.random() * 1e9) | 0,
      date: new Date(),
      blob: null,
      base: null,
      dirty: false,
      custom: [],
      sel: -1,
    };
    buildResultControls();
    syncStickerEditor();
    els.loveNote.textContent = pick(NOTES[state.mode]);
    els.savedNote.classList.remove('show');
    openModal(els.resultModal);
    await renderResult();
    confetti();
    chime();
  }

  function buildResultFilters(tab) {
    buildTabs(els.resultTabs, tab, buildResultFilters);
    els.resultFilters.innerHTML = '';
    const shot = session.shots[0];
    FILTERS.filter((f) => f.group === tab).forEach((f) => {
      const { b, c } = chipEl(f, f.id === session.filter, (id) => {
        session.filter = id;
        $$('.chip', els.resultFilters).forEach((x) => x.classList.toggle('active', x.dataset.id === id));
        buildTextEditor();
        renderResult();
      }, [64, 48]);
      renderFiltered(shot, shot.width, shot.height, c.width, c.height, f, { target: c, seed: 1 });
      els.resultFilters.appendChild(b);
    });
  }

  function buildResultControls() {
    buildResultFilters(filterById(session.filter).group);
    buildFrames(els.resultFrames, session.frame, session.frameColor, (id, color) => {
      session.frame = id;
      if (color) session.frameColor = color;
      renderResult();
    });
    buildTextEditor();
    els.resultStickers.checked = session.stickers;
  }

  async function renderResult() {
    const token = ++renderToken;
    await fontsReady;
    if (token !== renderToken || !session) return;
    // retro filters always get the retro print style; cute ones never; the rest follow the booth mode
    const group = filterById(session.filter).group;
    const s = { ...session, retro: group === 'retro' || (group !== 'cute' && session.mode === 'retro') };
    els.resultModal.classList.add('rendering');
    await wait(16); // let the spinner paint
    const out = compose(session.shots, s);
    if (token !== renderToken) return;
    session.base = out;
    paintResult();
    els.resultModal.classList.remove('rendering');
    await exportResult();
  }

  /** base print + the stickers she placed herself */
  function finalCanvas() {
    const c = makeCanvas(session.base.width, session.base.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(session.base, 0, 0);
    drawStickerList(ctx, session.custom);
    return c;
  }

  /** on-screen version: same as the final print, plus a dashed ring around the selected sticker */
  function paintResult() {
    if (!session?.base) return;
    const rc = els.resultCanvas, base = session.base;
    if (rc.width !== base.width) rc.width = base.width;
    if (rc.height !== base.height) rc.height = base.height;
    const ctx = rc.getContext('2d');
    ctx.drawImage(base, 0, 0);
    drawStickerList(ctx, session.custom);
    const st = session.custom[session.sel];
    if (st) {
      ctx.save();
      ctx.setLineDash([st.size * 0.08, st.size * 0.06]);
      ctx.lineWidth = Math.max(3, st.size * 0.025);
      ctx.strokeStyle = 'rgba(227,127,156,.95)';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.size * 0.62, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  let exportToken = 0;
  async function exportResult() {
    const sess = session;
    if (!sess?.base) return;
    const t = ++exportToken;
    sess.dirty = true;
    const blob = await new Promise((r) => finalCanvas().toBlob(r, 'image/jpeg', 0.92));
    if (t !== exportToken || !blob) return;
    sess.blob = blob;
    sess.dirty = false;
    try {
      await PhotoStore.save(sess.id, blob);
      els.savedNote.textContent = (await PhotoStore.ok())
        ? "✓ tucked away in this browser's cache"
        : '✓ kept for this visit (open the hosted link to keep photos for good)';
      els.savedNote.classList.add('show');
    } catch {
      els.savedNote.textContent = "couldn't save to cache — download it to keep it ♡";
      els.savedNote.classList.add('show');
    }
    updateGalleryCount();
  }

  /* ---------------- text & colour editor ---------------- */
  const INKS = ['#6b4428', '#3b2a20', '#ffffff', '#e3557f', '#5f8a43', '#d9622b', '#3b5a78', '#7c5cbf'];
  let textTimer;
  const rerenderSoon = () => { clearTimeout(textTimer); textTimer = setTimeout(renderResult, 300); };
  const printStyle = () => {
    const group = filterById(session.filter).group;
    return { ...session, retro: group === 'retro' || (group !== 'cute' && session.mode === 'retro') };
  };

  function buildTextEditor() {
    const L = layoutById(session.layout);
    const s = printStyle();
    const box = $('#text-fields');
    box.innerHTML = '';
    layoutTextKeys(L).forEach((key) => {
      const f = TEXT_FIELDS[key];
      const lab = document.createElement('label');
      lab.className = 'field compact';
      const span = document.createElement('span');
      span.textContent = f.label;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 40;
      inp.value = txt(s, key, L);
      inp.placeholder = '(hidden)';
      inp.addEventListener('input', () => {
        if (key === 'caption') session.caption = inp.value.trim();
        else session.texts[key] = inp.value;
        rerenderSoon();
      });
      lab.append(span, inp);
      box.appendChild(lab);
    });

    const fonts = $('#font-chips');
    fonts.innerHTML = '';
    [['auto', 'Auto', null], ...Object.entries(FONTS).map(([id, f]) => [id, f.name, f])].forEach(([id, name, f]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'font-chip' + (session.font === id ? ' active' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', session.font === id);
      b.textContent = name;
      if (f) { b.style.fontFamily = f.css; if (f.w) b.style.fontWeight = f.w; }
      b.addEventListener('click', () => {
        session.font = id;
        $$('.font-chip', fonts).forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); });
        renderResult();
      });
      fonts.appendChild(b);
    });

    const inks = $('#ink-swatches');
    inks.innerHTML = '';
    const pickInk = (el, color) => {
      session.textColor = color;
      $$('.swatch', inks).forEach((x) => x.classList.toggle('active', x === el));
      renderResult();
    };
    const auto = document.createElement('button');
    auto.type = 'button';
    auto.className = 'swatch auto' + (!session.textColor ? ' active' : '');
    auto.title = 'Automatic (matches the frame)';
    auto.textContent = 'A';
    auto.addEventListener('click', () => pickInk(auto, null));
    inks.appendChild(auto);
    INKS.forEach((col) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (session.textColor === col ? ' active' : '');
      b.style.background = col;
      b.title = col;
      b.addEventListener('click', () => pickInk(b, col));
      inks.appendChild(b);
    });
    const custom = colorSwatch(session.textColor && !INKS.includes(session.textColor), session.textColor, 'Pick any text colour', (hex) => {
      session.textColor = hex;
      $$('.swatch', inks).forEach((x) => x.classList.toggle('active', x === custom));
      rerenderSoon();
    });
    inks.appendChild(custom);
  }

  $('#text-reset').addEventListener('click', () => {
    session.texts = {};
    session.caption = state.caption;
    session.textColor = null;
    session.font = 'auto';
    buildTextEditor();
    renderResult();
  });
  els.resultStickers.addEventListener('change', () => { session.stickers = els.resultStickers.checked; renderResult(); });
  $('#btn-shuffle').addEventListener('click', () => {
    session.seed = (Math.random() * 1e9) | 0;
    session.stickers = els.resultStickers.checked = true;
    renderResult();
  });
  async function freshBlob() {
    if (session && (session.dirty || !session.blob)) await exportResult();
    return session?.blob;
  }
  $('#btn-share').addEventListener('click', async () => { const b = await freshBlob(); if (b) shareBlob(b, session.id); });
  $('#btn-download').addEventListener('click', async () => { const b = await freshBlob(); if (b) downloadBlob(b, session.id); });

  /* ---------------- customise stickers ---------------- */
  const stEdit = $('#sticker-edit');
  const stSize = $('#st-size');
  const stRot = $('#st-rot');
  const stClear = $('#st-clear');

  (function buildPalette() {
    const box = $('#sticker-palette');
    STICKER_PALETTE.forEach(({ kind, label }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'st-btn';
      b.title = label;
      b.setAttribute('aria-label', `Add ${label} sticker`);
      const c = makeCanvas(72, 72);
      drawSticker(c.getContext('2d'), kind, 36, 38, 50, 0, mulberry32(7));
      b.appendChild(c);
      b.addEventListener('click', () => addSticker(kind));
      box.appendChild(b);
    });
  })();

  /* ---- custom stickers: uploaded pictures (kept in the cache) & typed text ---- */
  const myStickers = $('#my-stickers');
  const myEmpty = $('#my-empty');
  const TEXT_COLORS = ['#e3557f', '#6b4428', '#5f8a43', '#d9622b', '#2f2a28', '#7c5cbf'];
  let textColor = TEXT_COLORS[0];

  async function blobToDrawable(blob) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(blob); } catch { /* fall through */ }
    }
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function addMyStickerButton(id, canvasLike) {
    const kind = `u:${id}`;
    CUSTOM_STICKERS.set(kind, canvasLike);
    const wrap = document.createElement('div');
    wrap.className = 'st-mine';
    wrap.dataset.kind = kind;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'st-btn';
    b.title = 'My sticker';
    b.setAttribute('aria-label', 'Add my sticker');
    const c = makeCanvas(72, 72);
    drawSticker(c.getContext('2d'), kind, 36, 36, 60, 0);
    b.appendChild(c);
    b.addEventListener('click', () => addSticker(kind, 1.3));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'st-del';
    del.textContent = '×';
    del.title = 'Remove from my stickers';
    del.setAttribute('aria-label', 'Remove from my stickers');
    del.addEventListener('click', async () => {
      if (!confirm('Remove this from your stickers? (It stays on photos you already made.)')) return;
      await StickerStore.remove(id);
      wrap.remove();
      myEmpty.hidden = !!myStickers.querySelector('.st-mine');
    });
    wrap.append(b, del);
    myStickers.insertBefore(wrap, myEmpty.nextSibling);
    myEmpty.hidden = true;
  }

  (async function loadMyStickers() {
    const items = await StickerStore.list().catch(() => []);
    for (const item of items.reverse()) {
      try { addMyStickerButton(item.id, await blobToDrawable(item.blob)); } catch { /* skip broken */ }
    }
  })();

  $('#st-upload').addEventListener('change', async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    let added = 0;
    for (const file of files) {
      try {
        const img = await blobToDrawable(file);
        const sticker = makeImageSticker(img, img.width, img.height);
        const id = Date.now() + added;
        const blob = await new Promise((r) => sticker.toBlob(r, 'image/png'));
        if (blob) await StickerStore.save(id, blob).catch(() => {});
        addMyStickerButton(id, sticker);
        if (session?.base) addSticker(`u:${id}`, 1.3);
        added++;
      } catch {
        toast("Couldn't read that picture 😿");
      }
    }
    if (added) toast(added > 1 ? `${added} new stickers made ♡` : 'New sticker made ♡ it\'s saved in "my stickers"');
  });

  (function buildTextColors() {
    const box = $('#text-colors');
    TEXT_COLORS.forEach((col, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tc' + (i === 0 ? ' active' : '');
      b.style.background = col;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === 0);
      b.setAttribute('aria-label', `Text colour ${i + 1}`);
      b.addEventListener('click', () => {
        textColor = col;
        $$('.tc', box).forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); });
      });
      box.appendChild(b);
    });
  })();

  $('#text-sticker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#st-text');
    const text = input.value.trim();
    if (!text || !session?.base) return;
    await fontsReady;
    const kind = `t:${Date.now()}`;
    CUSTOM_STICKERS.set(kind, makeTextSticker(text, textColor, filterById(session.filter).group === 'retro' || session.mode === 'retro'));
    addSticker(kind, 2.2);
    input.value = '';
  });

  function addSticker(kind, scale = 1) {
    if (!session?.base) return;
    const { width: W, height: H } = session.base;
    const unit = Math.min(W, H) * 0.2 * scale;
    const n = session.custom.length;
    session.custom.push({
      kind,
      x: W / 2 + ((n % 5) - 2) * unit * 0.35,
      y: H * 0.45 + ((n % 3) - 1) * unit * 0.35,
      size: unit,
      unit,
      rot: (Math.random() - 0.5) * 0.4,
      seed: (Math.random() * 1e9) | 0,
    });
    session.sel = session.custom.length - 1;
    beep(1200, 0.06, 'sine', 0.06);
    stickersChanged();
  }

  function stickersChanged() {
    paintResult();
    syncStickerEditor();
    exportResult();
  }

  function syncStickerEditor() {
    const st = session?.custom[session.sel];
    stEdit.hidden = !st;
    stClear.hidden = !session?.custom.length;
    els.resultCanvas.classList.toggle('has-stickers', !!session?.custom.length);
    if (st) {
      stSize.value = st.size / st.unit;
      stRot.value = Math.round((st.rot * 180) / Math.PI);
    }
  }

  const selected = () => session?.custom[session.sel];
  stSize.addEventListener('input', () => { const st = selected(); if (st) { st.size = st.unit * Number(stSize.value); paintResult(); } });
  stRot.addEventListener('input', () => { const st = selected(); if (st) { st.rot = (Number(stRot.value) * Math.PI) / 180; paintResult(); } });
  [stSize, stRot].forEach((el) => el.addEventListener('change', () => exportResult()));
  $('#st-dup').addEventListener('click', () => {
    const st = selected(); if (!st) return;
    session.custom.push({ ...st, x: st.x + st.size * 0.4, y: st.y + st.size * 0.3, seed: (Math.random() * 1e9) | 0 });
    session.sel = session.custom.length - 1;
    stickersChanged();
  });
  $('#st-front').addEventListener('click', () => {
    const st = selected(); if (!st) return;
    session.custom.splice(session.sel, 1);
    session.custom.push(st);
    session.sel = session.custom.length - 1;
    stickersChanged();
  });
  function deleteSelected() {
    if (!selected()) return;
    session.custom.splice(session.sel, 1);
    session.sel = -1;
    stickersChanged();
  }
  $('#st-delete').addEventListener('click', deleteSelected);
  stClear.addEventListener('click', () => {
    session.custom = [];
    session.sel = -1;
    stickersChanged();
  });

  // drag stickers around on the print
  (function stickerDragging() {
    const rc = els.resultCanvas;
    let drag = null;
    const toCanvas = (e) => {
      const r = rc.getBoundingClientRect();
      return [((e.clientX - r.left) * rc.width) / r.width, ((e.clientY - r.top) * rc.height) / r.height];
    };
    const hit = (x, y) => {
      const list = session?.custom || [];
      for (let i = list.length - 1; i >= 0; i--) {
        if (Math.hypot(x - list[i].x, y - list[i].y) < list[i].size * 0.55) return i;
      }
      return -1;
    };
    rc.addEventListener('pointerdown', (e) => {
      if (!session?.custom.length) return;
      const [x, y] = toCanvas(e);
      const i = hit(x, y);
      session.sel = i;
      if (i >= 0) {
        const st = session.custom[i];
        drag = { id: e.pointerId, dx: x - st.x, dy: y - st.y, moved: false };
        rc.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
      paintResult();
      syncStickerEditor();
    });
    rc.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) {
        if (e.pointerType === 'mouse') rc.style.cursor = hit(...toCanvas(e)) >= 0 ? 'grab' : '';
        return;
      }
      const [x, y] = toCanvas(e);
      const st = session.custom[session.sel];
      st.x = Math.min(Math.max(x - drag.dx, 0), rc.width);
      st.y = Math.min(Math.max(y - drag.dy, 0), rc.height);
      drag.moved = true;
      rc.style.cursor = 'grabbing';
      paintResult();
    });
    const end = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      rc.style.cursor = '';
      if (moved) exportResult();
    };
    rc.addEventListener('pointerup', end);
    rc.addEventListener('pointercancel', end);
    let wheelTimer;
    rc.addEventListener('wheel', (e) => {
      const st = selected();
      if (!st) return;
      e.preventDefault();
      st.size = Math.min(st.unit * 3, Math.max(st.unit * 0.3, st.size * (e.deltaY < 0 ? 1.08 : 0.92)));
      paintResult();
      syncStickerEditor();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(exportResult, 300);
    }, { passive: false });
  })();
  $('#btn-retake').addEventListener('click', () => {
    closeModal(els.resultModal);
    if (state.stream) startSession();
  });

  /* ---------------- sharing ---------------- */
  const fileName = (id) => {
    const d = new Date(id);
    const p = (n) => String(n).padStart(2, '0');
    return `maheen-photobooth-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`;
  };

  function downloadBlob(blob, id) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(id);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function shareBlob(blob, id) {
    const text = 'from Maheen\'s photobooth ♡🐱🍵';
    const file = new File([blob], fileName(id), { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: "Maheen's Photobooth" });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Desktop fallback: save the picture, then open WhatsApp so it can be attached.
    downloadBlob(blob, id);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    toast('Photo downloaded — attach it in the WhatsApp chat that just opened 📎', 5000);
  }

  /* ---------------- gallery ---------------- */
  let galleryUrls = [];
  let viewing = null;

  async function updateGalleryCount() {
    const n = await PhotoStore.count().catch(() => 0);
    els.galleryCount.textContent = n;
    els.galleryCount.hidden = n === 0;
  }

  async function openGallery() {
    galleryUrls.forEach((u) => URL.revokeObjectURL(u));
    galleryUrls = [];
    const items = await PhotoStore.list().catch(() => []);
    els.galleryGrid.innerHTML = '';
    els.galleryEmpty.hidden = items.length > 0;
    $('#btn-clear').hidden = items.length === 0;
    els.gallerySub.textContent = items.length
      ? `${items.length} photo${items.length > 1 ? 's' : ''} saved in this browser · tap one to share`
      : '';
    items.forEach((item) => {
      const url = URL.createObjectURL(item.blob);
      galleryUrls.push(url);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'g-item';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Saved photo';
      img.loading = 'lazy';
      const when = document.createElement('small');
      when.textContent = new Date(item.id).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      b.append(img, when);
      b.addEventListener('click', () => openViewer(item, url));
      els.galleryGrid.appendChild(b);
    });
    openModal(els.galleryModal);
  }

  function openViewer(item, url) {
    viewing = item;
    els.viewerImg.src = url;
    openModal(els.viewerModal);
  }

  $('#viewer-share').addEventListener('click', () => viewing && shareBlob(viewing.blob, viewing.id));
  $('#viewer-download').addEventListener('click', () => viewing && downloadBlob(viewing.blob, viewing.id));
  $('#viewer-delete').addEventListener('click', async () => {
    if (!viewing || !confirm('Delete this photo? 😿')) return;
    await PhotoStore.remove(viewing.id);
    viewing = null;
    closeModal(els.viewerModal);
    updateGalleryCount();
    openGallery();
  });
  $('#btn-clear').addEventListener('click', async () => {
    if (!confirm('Delete ALL saved photos from this browser? This cannot be undone.')) return;
    await PhotoStore.clear();
    updateGalleryCount();
    openGallery();
    toast('Album cleared');
  });

  /* ---------------- modals ---------------- */
  function openModal(m) {
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add('open'));
  }
  function closeModal(m) {
    m.classList.remove('open');
    setTimeout(() => { m.hidden = true; }, 200);
  }
  $$('.modal').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('[data-close]')) closeModal(m);
    });
  });

  /* ---------------- cats & cuteness ---------------- */
  function bounce(el) {
    el.classList.remove('bounce');
    void el.getBoundingClientRect();
    el.classList.add('bounce');
  }

  const CAT_LINES = {
    miso: ['Miso says mrrp ♡', 'Miso wants a strawberry matcha too 🍓🍵', 'Miso approves this photoshoot', 'Miso is doing the slow blink at you'],
    gina: ['Gina woke up… and went right back to sleep 😴', 'Gina, the fluffiest princess 👑', 'Gina demands chin scratches', 'Gina is too fluffy to function'],
    blackie: ['Blackie is watching you 👀', 'Blackie says: pose harder', 'Blackie is plotting to steal the hazelnut latte ☕', 'Blackie thinks you look cute today'],
  };
  $$('.cat').forEach((cat) => {
    cat.addEventListener('click', (e) => {
      bounce(cat);
      mew();
      heartsBurst(e.clientX, e.clientY);
      if (CAT_LINES[cat.dataset.cat]) toast(pick(CAT_LINES[cat.dataset.cat]));
      if (cat.classList.contains('cat-loaf')) {
        cat.classList.add('awake');
        clearTimeout(cat._sleep);
        cat._sleep = setTimeout(() => cat.classList.remove('awake'), 2600);
      }
    });
  });
  $$('.latte').forEach((cup) => cup.addEventListener('click', (e) => {
    bounce(cup);
    beep(660, 0.08, 'sine', 0.08);
    setTimeout(() => beep(990, 0.12, 'sine', 0.08), 80);
    heartsBurst(e.clientX, e.clientY, 6);
    toast({
      strawberry: 'sip sip 🍓🍵 strawberry matcha, extra pink',
      raspberry: 'raspberry matcha 💗🍵 tangy & cute, just like you',
      hazelnut: 'one hazelnut latte, extra love ☕',
    }[cup.dataset.drink]);
  }));

  // the black cat on top of the camera watches your cursor 👀
  const pupils = $('.peek-cat .pupils');
  const peek = $('.peek-cat');
  window.addEventListener('pointermove', (e) => {
    const r = peek.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height * 0.6);
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(5, d / 40);
    pupils.style.transform = `translate(${(dx / d) * m}px, ${(dy / d) * m * 0.7}px)`;
  });

  function buildFloaties() {
    const box = $('#floaties');
    box.innerHTML = '';
    const glyphs = state.mode === 'retro' ? ['✦', '✿', '☮', '♡'] : ['♡', '🐾', '✿', '♡'];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDelay = `${-Math.random() * 24}s`;
      s.style.animationDuration = `${18 + Math.random() * 14}s`;
      s.style.fontSize = `${12 + Math.random() * 16}px`;
      box.appendChild(s);
    }
  }

  // secret: type "meow" anywhere
  let typed = '';
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === 'meow') {
      $$('.cat').forEach((c, i) => setTimeout(() => bounce(c), i * 120));
      mew();
      setTimeout(mew, 350);
      toast('meow meow 🐱 the cats say hi, Maheen');
    }
  });

  /* ---------------- wiring ---------------- */
  $$('.mode-toggle button').forEach((b) => b.addEventListener('click', () => {
    if (state.busy || state.mode === b.dataset.mode) return;
    state.mode = b.dataset.mode;
    persist();
    applyMode(true);
    if (!state.stream) drawIdlePreview();
  }));

  $('#btn-camera').addEventListener('click', startCamera);
  $('#btn-snap').addEventListener('click', () => { ac(); startSession(); });
  $('#btn-flip').addEventListener('click', async () => {
    state.facing = state.facing === 'user' ? 'environment' : 'user';
    state.mirror = state.facing === 'user';
    persist();
    await startCamera();
  });
  $('#btn-mirror').addEventListener('click', () => {
    state.mirror = !state.mirror;
    persist();
    toast(state.mirror ? 'Mirror on 🪞' : 'Mirror off');
  });
  $('#btn-gallery').addEventListener('click', openGallery);
  ['#file-input', '#file-input-ph'].forEach((sel) => $(sel).addEventListener('change', (e) => {
    loadFiles(e.target.files);
    e.target.value = '';
  }));

  els.caption.value = state.caption;
  els.caption.addEventListener('input', () => { state.caption = els.caption.value.trim(); persist(); });

  $$('#timer button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.t) === state.timer);
    b.addEventListener('click', () => {
      state.timer = Number(b.dataset.t);
      persist();
      $$('#timer button').forEach((x) => x.classList.toggle('active', x === b));
    });
  });
  const optStickers = $('#opt-stickers');
  optStickers.checked = state.stickers;
  optStickers.addEventListener('change', () => { state.stickers = optStickers.checked; persist(); });
  const optSound = $('#opt-sound');
  optSound.checked = state.sound;
  optSound.addEventListener('change', () => { state.sound = optSound.checked; persist(); if (state.sound) mew(); });

  window.addEventListener('keydown', (e) => {
    const openModalEl = $$('.modal').find((m) => !m.hidden);
    if ((e.key === 'Delete' || e.key === 'Backspace') && !els.resultModal.hidden && !e.target.matches('input, textarea') && selected()) {
      e.preventDefault();
      deleteSelected();
      return;
    }
    if (e.key === 'Escape') {
      if (state.busy) state.cancel = true;
      else if (openModalEl) closeModal($$('.modal').filter((m) => !m.hidden).pop());
      return;
    }
    if (e.code === 'Space' && !openModalEl && !e.target.matches('input, textarea, button')) {
      e.preventDefault();
      ac();
      startSession();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.busy) state.cancel = true;
  });

  /* ---------------- boot ---------------- */
  greet();
  applyMode(false);
  drawIdlePreview();
  fontsReady.then(() => { if (!state.stream) drawIdlePreview(); });
  updateGalleryCount();
  requestAnimationFrame(loop);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
