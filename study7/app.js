/* Study 7 Stage A survey. Behaviour ported from study7_survey_timer_prototype_v17.html; every word comes from the
   language file (strings_*.json) and, for block F, from asrs_official_transcriptions_v1.json. Differences from the
   prototype, all from handoff v14: answers are option indexes; the per-answer ping is gone; the submission carries the
   schema's field names, item_timing with last_s and the "switched on at any point" tool flags; the six sounds and the two
   chimes are the app's audio files; the countdown chime plays at 30 and 25, at 20 and 19, at 15, 14 and 13, then every
   second from 10 to 0 seconds left. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cfg = window.STUDY7_CONFIG || {};
  const Net = window.Study7Net;
  const LANG_BASE = '/assets/lang/study7/';
  const AUDIO_BASE = '/assets/audio/study7/';
  const PRESETS = { long: 10 * 60, short: 3 * 60 };
  const INTERVALS = [10, 20, 30, 60];
  const DONE_KEY = 'study7_stageA_done';
  const AMBER_S = 120, RED_S = 30;
  const CHIME_MARKS = [30, 25, 20, 19, 15, 14, 13, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]; // call_timeout_chime.mp3, seconds left
  const TURNSTILE_WAIT_MS = 10000;
  const ITEM = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--item')) || 52; // wheel row height, from the stylesheet's --item
  const GAIN = 1.5, TAU = 500, SLOP = 8, MIN_MS = 120, MAX_MS = 800; // wheel drag: finger gain, fling travel (ms of release speed), tap-or-drag threshold, glide duration bounds
  const ANDROID = /Android/i.test(navigator.userAgent); // custom touch physics only on Android; iPhone keeps its native scrolling

  let S = null;      // the language file
  let ASRS = null;   // this language's ASRS entry
  let lang = 'en';
  const QTEXT = {}, OPTS = {};
  const params = new URLSearchParams(window.location.search);
  const srcParam = params.get('src');
  const src = srcParam && /^[a-z0-9-]{1,32}$/.test(srcParam) ? srcParam : undefined;

  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S);
  const pad = (n) => String(n).padStart(2, '0');
  const fmtHuman = (s) => { const U = S.setup.units; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return [h ? `${h} ${U.h}` : '', m ? `${m} ${U.m}` : '', x ? `${x} ${U.s}` : ''].filter(Boolean).join(' ') || `0 ${U.s}`; };
  const fmtClock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${pad(m)}:${pad(x)}` : `${pad(m)}:${pad(x)}`; };
  const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no vibration */ } };

  /* ------------------------------------------------------------------
     Language: manifest -> ?lang -> navigator.language -> en; only languages whose ASRS entry is verbatim are offered.
     ------------------------------------------------------------------ */
  async function loadJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }
  async function loadLanguage() {
    const manifest = await loadJson(LANG_BASE + 'index.json');
    const asrsAll = await loadJson(LANG_BASE + manifest.asrs);
    const offered = manifest.languages.filter((l) => asrsAll[l.code] && typeof asrsAll[l.code].status === 'string' && asrsAll[l.code].status.startsWith('verbatim'));
    const codes = offered.map((l) => l.code);
    const pick = (t) => { if (!t) return null; const low = String(t).toLowerCase(); const exact = codes.find((c) => c.toLowerCase() === low); if (exact) return exact;
      const primary = low.split('-')[0]; return codes.find((c) => c.toLowerCase().split('-')[0] === primary) || null; };
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    lang = pick(params.get('lang')) || pick(nav) || (codes.includes('en') ? 'en' : codes[0]);
    const entry = offered.find((l) => l.code === lang);
    S = await loadJson(LANG_BASE + entry.file);
    ASRS = asrsAll[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = S._meta.dir || 'ltr';
    Net.setLanguage(lang, S._meta.questionnaire_version);
    if (params.get('lang') !== lang) { const u = new URL(window.location.href); u.searchParams.set('lang', lang); window.history.replaceState(null, '', u.toString()); }
    const sel = $('lang');
    sel.innerHTML = '';
    offered.forEach((l) => { const o = document.createElement('option'); o.value = l.code; o.textContent = l.label; o.selected = l.code === lang; sel.appendChild(o); });
    sel.addEventListener('change', () => { const u = new URL(window.location.href); u.searchParams.set('lang', sel.value); window.location.assign(u.toString()); });
    $('dataNoticeLink').href = `/study7/data-notice/?lang=${encodeURIComponent(lang)}`;
  }
  function applyStrings() {
    document.title = `${S.welcome.study} · ${S.institute.name}`;
    document.querySelectorAll('[data-s]').forEach((el) => { const v = get(el.dataset.s); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-s-aria]').forEach((el) => { const v = get(el.dataset.sAria); if (typeof v === 'string') el.setAttribute('aria-label', v); });
    $('fsVol').setAttribute('aria-label', `${S.focus.title}: ${S.focus.volume}`);
    $('tsVol').setAttribute('aria-label', `${S.focus.time_signal}: ${S.focus.volume}`);
    $('tsInt').setAttribute('aria-label', `${S.focus.time_signal}: ${S.focus.interval}`);
  }

  /* ------------------------------------------------------------------
     Wheel pickers (scroll-snap columns)
     ------------------------------------------------------------------ */
  const wheels = { h: $('wh'), m: $('wm'), s: $('ws') };
  const picked = { h: 0, m: 0, s: 0 };
  const motion = new Map(); // wheel -> its drag and fling state
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  const snapTo = (el, y) => Math.max(0, Math.min(+el.dataset.max * ITEM, Math.round(y / ITEM) * ITEM));
  if (ANDROID) document.documentElement.classList.add('android');
  function buildWheel(el) {
    const max = +el.dataset.max; const frag = document.createDocumentFragment();
    const padTop = document.createElement('div'); padTop.className = 'pad'; frag.appendChild(padTop);
    for (let i = 0; i <= max; i++) { const d = document.createElement('div'); d.className = 'it'; d.textContent = pad(i); d.dataset.v = i; d.setAttribute('role', 'option'); frag.appendChild(d); }
    const padBot = document.createElement('div'); padBot.className = 'pad'; frag.appendChild(padBot);
    el.appendChild(frag);
    // Drag with gain and a fling: the mouse and pen everywhere, touch on Android (iPhone keeps its native scrolling). A press
    // stops a spinning wheel; a move beyond SLOP becomes a drag (pointer captured, snap off via .drag); release flings by the
    // last 100 ms of finger speed and glide() lands on a row. Trackpad, mouse wheel and keyboard stay native.
    const st = { raf: 0, id: null, moved: false, y0: 0, top0: 0, pos: 0, s: [] }; motion.set(el, st);
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' ? e.button !== 0 : !ANDROID) return;
      cancelAnimationFrame(st.raf);
      Object.assign(st, { id: e.pointerId, moved: false, y0: e.clientY, top0: el.scrollTop, pos: el.scrollTop, s: [{ t: e.timeStamp, y: e.clientY }] });
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== st.id) return;
      if (!st.moved) { if (Math.abs(e.clientY - st.y0) < SLOP) return; st.moved = true; st.y0 = e.clientY; st.top0 = el.scrollTop; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* pointer already gone */ } }
      st.pos = Math.max(0, Math.min(max * ITEM, st.top0 - (e.clientY - st.y0) * GAIN)); el.scrollTop = st.pos;
      st.s.push({ t: e.timeStamp, y: e.clientY }); while (st.s.length > 1 && e.timeStamp - st.s[0].t > 100) st.s.shift();
    });
    const end = (e, fling) => {
      if (e.pointerId !== st.id) return; st.id = null;
      if (!st.moved) { if (el.classList.contains('drag')) glide(el, el.scrollTop); return; } // a tap: the click handler may follow
      const a = st.s[0], b = st.s[st.s.length - 1], dt = b.t - a.t; let v = 0;
      if (fling && st.s.length > 1 && dt >= 15 && e.timeStamp - b.t < 80) v = Math.max(-5, Math.min(5, (b.y - a.y) / dt)); // finger px per ms; a finger at rest before lifting gives no fling
      const target = snapTo(el, st.pos - v * GAIN * TAU);
      glide(el, target, v ? 2 * Math.abs(target - st.pos) / (Math.abs(v) * GAIN) : undefined); // duration matched to the release speed
      if (e.pointerType !== 'mouse') st.moved = false; // touch drags produce no click to swallow
    };
    el.addEventListener('pointerup', (e) => end(e, true)); el.addEventListener('pointercancel', (e) => end(e, false));
    el.addEventListener('click', (e) => { if (st.moved) { st.moved = false; return; } const it = e.target.closest('.it'); if (it) glide(el, (+it.dataset.v) * ITEM); });
    el.addEventListener('keydown', (e) => { const cur = Math.round(el.scrollTop / ITEM); if (e.key === 'ArrowDown') { e.preventDefault(); glide(el, Math.min(max, cur + 1) * ITEM, 0); } if (e.key === 'ArrowUp') { e.preventDefault(); glide(el, Math.max(0, cur - 1) * ITEM, 0); } });
    let raf = 0;
    el.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => highlight(el)); }, { passive: true });
    highlight(el);
  }
  // Every programmatic move of a wheel: cancels its drag or fling, glides to the nearest row (quadratic ease-out; ms 0, reduced
  // motion or no distance is instant) with snap off, and lands exactly on the row before snap returns, so nothing jumps.
  function glide(el, target, ms) {
    const st = motion.get(el); cancelAnimationFrame(st.raf); st.id = null;
    target = snapTo(el, target);
    const from = el.scrollTop, dist = target - from;
    if (ms === undefined) ms = MIN_MS + Math.abs(dist) / 3;
    ms = REDUCED.matches || !dist || !ms ? 0 : Math.max(MIN_MS, Math.min(MAX_MS, ms));
    const land = () => { el.scrollTop = target; el.classList.remove('drag'); highlight(el); };
    if (!ms) { land(); return; }
    el.classList.add('drag');
    const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / ms); el.scrollTop = from + dist * (1 - (1 - p) * (1 - p)); if (p < 1) st.raf = requestAnimationFrame(step); else land(); };
    st.raf = requestAnimationFrame(step);
  }
  function highlight(el) {
    const idx = Math.max(0, Math.min(+el.dataset.max, Math.round(el.scrollTop / ITEM)));
    el.querySelectorAll('.it').forEach((it) => { const d = Math.abs(+it.dataset.v - idx); it.classList.toggle('sel', d === 0); it.classList.toggle('near', d === 1); it.setAttribute('aria-selected', d === 0 ? 'true' : 'false'); });
    const key = el === wheels.h ? 'h' : el === wheels.m ? 'm' : 's';
    if (picked[key] !== idx) { picked[key] = idx; refreshSetup(); }
  }

  /* ------------------------------------------------------------------
     Call setup card: presets vs custom, two buttons vs one
     ------------------------------------------------------------------ */
  function customSeconds() { return picked.h * 3600 + picked.m * 60 + picked.s; }
  function refreshSetup() {
    if (!S) return;
    const cs = customSeconds(); const custom = cs > 0;
    $('presetLabels').hidden = custom; $('customLabel').hidden = !custom; $('customLabel').textContent = fill(S.setup.custom_label, { duration: fmtHuman(cs) });
    $('buttons').hidden = custom; $('btnCall').hidden = !custom; $('reset').classList.toggle('active', custom);
  }

  /* ------------------------------------------------------------------
     Timer (clock-based, survives background tabs)
     ------------------------------------------------------------------ */
  const timer = { active: false, preset: null, duration: 0, startAt: 0, endAt: 0, amberFired: false, fired: new Set() };
  function startTimer(sec, preset) {
    audio.unlock(); audio.preloadChimes();
    Object.assign(timer, { active: true, preset, duration: sec, startAt: Date.now(), endAt: Date.now() + sec * 1000, amberFired: false, fired: new Set() });
    step = 'call'; $('setupScrim').hidden = true; $('topbar').hidden = false; $('survey').hidden = false;
    paraStart();
    Net.post('start', { preset, duration_s: sec, ...(src ? { src } : {}) }).catch(() => {});
    // Time signal marks the start of the countdown and re-anchors its interval to it
    if (ts.on) { audio.chime('tick'); vibrate(40); ts.nextAt = Date.now() + ts.interval * 1000; }
    renderTimer(); window.scrollTo(0, 0);
  }
  function renderTimer() {
    if (!timer.active) return;
    const now = Date.now(); const remaining = timer.endAt - now; const elapsed = now - timer.startAt;
    const cd = $('cd'), bar = $('bar'), top = $('topbar'); const remS = remaining / 1000;
    let state, label;
    if (remaining < 0) { state = 'red'; label = S.timer.overtime; }
    else if (remS <= RED_S) { state = 'red'; label = S.timer.last30; }
    else if (remS <= AMBER_S) { state = 'amber'; label = S.timer.keep_going; }
    else { state = 'green'; label = S.timer.plenty; }
    top.classList.remove('green', 'amber', 'red'); top.classList.add(state); $('status').textContent = label;
    if (remaining >= 0) {
      cd.textContent = fmtClock(remaining);
      bar.firstElementChild.style.width = `${Math.min(100, elapsed / (timer.duration * 1000) * 100)}%`;
      if (!timer.amberFired && remS <= AMBER_S) { timer.amberFired = true; if (timer.duration > AMBER_S) { audio.chime('tick'); vibrate(60); } }
    } else {
      cd.textContent = `-${fmtClock(-remaining)}`; bar.firstElementChild.style.width = '100%';
    }
    // Countdown chime: at 30 and 25 s left, at 20 and 19, at 15, 14 and 13, then every second from 10 to 0. Marks at or above the chosen
    // duration never fire; if several marks fall due at once (a tab returning from the background) only the latest sounds.
    const due = CHIME_MARKS.filter((m) => !timer.fired.has(m) && m < timer.duration && remaining <= m * 1000);
    if (due.length) {
      due.forEach((m) => timer.fired.add(m));
      const mark = Math.min(...due);
      audio.chime('timeout');
      if (mark === 30) vibrate([80, 60, 80]);
      if (mark === 0) vibrate([120, 80, 120, 80, 120]);
    }
    $('el').textContent = fill(S.timer.elapsed, { time: fmtClock(elapsed) });
    $('rem').textContent = fill(S.timer.remaining, { time: remaining >= 0 ? fmtClock(remaining) : `-${fmtClock(-remaining)}`, duration: fmtHuman(timer.duration) });
  }

  /* ------------------------------------------------------------------
     Time signal scheduler (page-wide, independent of the timer)
     ------------------------------------------------------------------ */
  const ts = { on: false, interval: INTERVALS[3], nextAt: 0 };
  const tools = { focusEver: false, lastSound: null, signalEver: false, lastInterval: null };
  function tickSignal() { if (!ts.on) return; const now = Date.now(); if (now >= ts.nextAt) { audio.chime('tick'); ts.nextAt = now + ts.interval * 1000; } }
  function signalOn() { ts.on = true; tools.signalEver = true; tools.lastInterval = ts.interval; audio.unlock(); audio.preloadChimes(); ts.nextAt = Date.now() + ts.interval * 1000; audio.chime('tick'); }
  const intervalLabel = () => S.focus.interval_values[String(ts.interval)];

  setInterval(() => { renderTimer(); tickSignal(); }, 250);
  document.addEventListener('visibilitychange', () => { renderTimer(); tickSignal(); });

  /* ------------------------------------------------------------------
     Audio: the app's sound files, decoded once and looped through the Web Audio graph (volume is a gain node).
     Vorbis where the browser plays it, otherwise the MP3 version; the two chimes are MP3.
     ------------------------------------------------------------------ */
  const audio = (() => {
    let ctx = null; let fs = { kind: null, playing: false, gain: null, source: null };
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = () => { if (!ctx) ctx = new AC(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
    const fsVol = () => (+$('fsVol').value / 100) * 0.6;
    const tsVol = () => (+$('tsVol').value / 100) * 0.5;
    const vorbis = (() => { try { return document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') !== ''; } catch (e) { return false; } })();
    const buffers = new Map();
    const load = (file) => {
      if (!buffers.has(file)) buffers.set(file, fetch(AUDIO_BASE + file).then((r) => { if (!r.ok) throw new Error(file); return r.arrayBuffer(); }).then((b) => ac().decodeAudioData(b)));
      return buffers.get(file);
    };
    const loopFile = (kind) => `${kind}.${vorbis ? 'ogg' : 'mp3'}`;
    const stop = () => { try { if (fs.source) fs.source.stop(); } catch (e) { /* already stopped */ } if (fs.gain) fs.gain.disconnect(); fs = { kind: null, playing: false, gain: null, source: null }; };
    const start = (kind) => {
      stop(); const c = ac(); const g = c.createGain(); g.gain.value = fsVol(); g.connect(c.destination);
      const state = { kind, playing: true, gain: g, source: null }; fs = state;
      tools.focusEver = true; tools.lastSound = kind;
      load(loopFile(kind)).then((buf) => {
        if (fs !== state) return;
        const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
        if (!vorbis) { s.loopStart = 0.05; s.loopEnd = Math.max(0.1, buf.duration - 0.05); } // skip the MP3 encoder padding at the seam
        s.connect(g); s.start(); state.source = s;
      }).catch(() => {});
    };
    const chime = (kind) => { const v = tsVol(); if (v <= 0) return; const c = ac();
      load(kind === 'timeout' ? 'call_timeout_chime.mp3' : 'chime.mp3').then((buf) => { const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.value = v; s.connect(g).connect(c.destination); s.start(); }).catch(() => {}); };
    const setVol = () => { if (fs.gain) fs.gain.gain.setTargetAtTime(fsVol(), ac().currentTime, 0.05); };
    const preloadChimes = () => { load('chime.mp3').catch(() => {}); load('call_timeout_chime.mp3').catch(() => {}); };
    return { unlock: () => { try { ac(); } catch (e) { /* no audio */ } }, start, stop, chime, setVol, preloadChimes, get playing() { return fs.playing; }, get kind() { return fs.kind; } };
  })();

  /* ------------------------------------------------------------------
     Focus Sound card wiring
     ------------------------------------------------------------------ */
  const selectedSound = () => document.querySelector('input[name=sound]:checked').value;
  const paint = (r) => { r.style.setProperty('--p', `${(r.value - r.min) / (r.max - r.min) * 100}%`); };
  document.querySelectorAll('input[type=range]').forEach(paint);
  $('fsVol').addEventListener('input', (e) => { $('fsVolV').textContent = `${e.target.value}%`; paint(e.target); audio.setVol(); });
  $('tsVol').addEventListener('input', (e) => { $('tsVolV').textContent = `${e.target.value}%`; paint(e.target); });
  $('tsInt').addEventListener('input', (e) => { ts.interval = INTERVALS[+e.target.value]; $('tsIntV').textContent = intervalLabel(); if (ts.on) { ts.nextAt = Date.now() + ts.interval * 1000; tools.lastInterval = ts.interval; } paint(e.target); });
  $('tsOn').addEventListener('change', (e) => { if (e.target.checked) signalOn(); else ts.on = false; syncTools(); });
  // one place keeps every button, toggle and status light in step
  function syncTools() {
    const fsOn = audio.playing, tsOnNow = ts.on;
    $('fsOn').checked = fsOn; $('tsOn').checked = tsOnNow;
    $('tbFocus').classList.toggle('on', fsOn); $('tbFocus').setAttribute('aria-pressed', String(fsOn));
    $('tbSignal').classList.toggle('on', tsOnNow); $('tbSignal').setAttribute('aria-pressed', String(tsOnNow));
    document.querySelectorAll('.sq .fs').forEach((el) => el.classList.toggle('on', fsOn));
    document.querySelectorAll('.sq .ts').forEach((el) => el.classList.toggle('on', tsOnNow));
  }
  const toggleFocus = () => { if (audio.playing) audio.stop(); else audio.start(selectedSound()); syncTools(); };
  const toggleSignal = () => { if (ts.on) ts.on = false; else signalOn(); syncTools(); };
  const openCard = () => { $('focusScrim').hidden = false; $('focusClose').focus(); syncTools(); };
  $('sounds').addEventListener('change', () => { audio.start(selectedSound()); syncTools(); });
  $('fsOn').addEventListener('change', (e) => { if (e.target.checked) audio.start(selectedSound()); else audio.stop(); syncTools(); });
  $('tbFocus').addEventListener('click', toggleFocus);
  $('tbSignal').addEventListener('click', toggleSignal);
  $('tbOpen').addEventListener('click', openCard); $('thanksOpen').addEventListener('click', openCard);
  $('focusClose').addEventListener('click', () => { $('focusScrim').hidden = true; });
  $('focusScrim').addEventListener('click', (e) => { if (step !== 'focus' && e.target === e.currentTarget) $('focusScrim').hidden = true; });
  document.addEventListener('keydown', (e) => { if (step !== 'focus' && e.key === 'Escape' && !$('focusScrim').hidden) $('focusScrim').hidden = true; });

  // Onboarding: welcome -> focus sound and time signal (Continue) -> timer setup (Call)
  let step = 'welcome';
  $('welcomeUnder18').addEventListener('click', () => {
    step = 'under18'; $('welcomeScrim').hidden = true; $('underScrim').hidden = false;
    Net.post('under18', {}).catch(() => {}); // anonymous count only: the common fields, nothing else follows
    $('underScrim').querySelector('.follow-btn').focus();
  });
  function openFocusStep(fromScrim) {
    step = 'focus'; $(fromScrim).hidden = true;
    $('fsContinue').hidden = false; $('focusClose').hidden = true;
    $('focusScrim').hidden = false; syncTools(); $('fsOn').focus();
  }
  $('welcomeContinue').addEventListener('click', () => openFocusStep('welcomeScrim'));
  $('fsContinue').addEventListener('click', () => {
    step = 'setup'; $('focusScrim').hidden = true;
    $('fsContinue').hidden = true; $('focusClose').hidden = false;
    $('setupScrim').hidden = false; $('btnShort').focus();
    history.pushState({ step: 'setup' }, ''); // so the back gesture or button returns to the focus card
  });
  // Back (gesture, Android button, browser) while the setup card is open reopens the focus card; Continue comes forward again.
  window.addEventListener('popstate', () => { if (step === 'setup' && !timer.active) openFocusStep('setupScrim'); });
  $('reset').addEventListener('click', () => { Object.values(wheels).forEach((w) => glide(w, 0, MIN_MS)); });
  $('btnLong').addEventListener('click', () => startTimer(PRESETS.long, 'long'));
  $('btnShort').addEventListener('click', () => startTimer(PRESETS.short, 'short'));
  $('btnCall').addEventListener('click', () => startTimer(customSeconds(), 'custom'));

  /* ------------------------------------------------------------------
     Paradata: per-item timing (active time only) and the leave ping. Nothing is sent while answering.
     ------------------------------------------------------------------ */
  const para = { startedAt: 0, activeMs: 0, lastVisible: 0, items: {}, order: 0, lastItem: null };
  const activeNow = () => (para.startedAt ? para.activeMs + (document.hidden ? 0 : Date.now() - para.lastVisible) : 0);
  function paraStart() { para.startedAt = Date.now(); para.lastVisible = Date.now(); }
  document.addEventListener('visibilitychange', () => { if (!para.startedAt) return; if (document.hidden) { para.activeMs += Date.now() - para.lastVisible; } else { para.lastVisible = Date.now(); } });
  let sent = false;
  window.addEventListener('pagehide', () => {
    if (!para.startedAt || sent) return;
    Net.beacon('leave', { last_item: para.lastItem, items_answered: Object.keys(para.items).length, active_s: Math.round(activeNow() / 1000), focus_sound_ever: tools.focusEver, time_signal_ever: tools.signalEver });
  });
  function paraSummary() {
    const rows = Object.entries(para.items).sort((a, b) => a[1].order - b[1].order); let prev = 0;
    return rows.map(([id, r]) => { const out = { item: id, order: r.order, first_s: +(r.first / 1000).toFixed(1), last_s: +(r.last / 1000).toFixed(1), latency_s: +((r.first - prev) / 1000).toFixed(1), changes: r.changes }; prev = r.first; return out; });
  }

  /* ------------------------------------------------------------------
     Survey items, rendered from the language file in _meta.block_order; block F from the ASRS entry only.
     ------------------------------------------------------------------ */
  function buildItems() {
    const wrap = $('items');
    wrap.addEventListener('change', (e) => { if (!e.target.name || !para.startedAt) return; const id = e.target.name, t = activeNow();
      const r = para.items[id] || (para.items[id] = { first: t, last: t, changes: 0, order: ++para.order }); r.last = t; r.changes++; para.lastItem = id; });
    // An answered question loses its red mark; the notice goes once none is left
    wrap.addEventListener('change', (e) => { const q = e.target.closest('.q.missing'); if (q) { q.classList.remove('missing'); if (!wrap.querySelector('.q.missing')) $('unanswered').hidden = true; } });
    S._meta.block_order.forEach((letter) => {
      const b = S.blocks[letter];
      const block = document.createElement('section'); block.className = 'block'; const h = document.createElement('h2'); h.textContent = b.title; block.appendChild(h);
      let entries;
      if (letter === 'F') {
        if (b.lead) { const lead = document.createElement('p'); lead.className = 'lead'; lead.textContent = b.lead; block.appendChild(lead); }
        entries = ASRS.items.map((text, i) => [`asrs${i + 1}`, text, ASRS.scale]);
      } else {
        entries = Object.entries(b.items).map(([id, item]) => [id, item.text, S.options[item.options], item.optional === true]);
      }
      entries.forEach(([id, text, opts, optional]) => {
        QTEXT[id] = text; OPTS[id] = opts;
        const q = document.createElement('div'); q.className = 'q'; if (optional) q.dataset.optional = '1'; const p = document.createElement('p'); p.textContent = text; q.appendChild(p);
        const numeric = opts.length === 11, wide = Math.max(...opts.map((o) => o.length)) > 14;
        const sc = document.createElement('div'); sc.className = 'scale' + (numeric ? ' numeric' : wide ? ' wide' : opts.length === 5 ? ' five' : ''); sc.setAttribute('role', 'radiogroup'); sc.setAttribute('aria-label', text);
        opts.forEach((o, index) => { const l = document.createElement('label'); const i = document.createElement('input'); i.type = 'radio'; i.name = id; i.value = String(index); l.appendChild(i); l.appendChild(document.createTextNode(o)); sc.appendChild(l); });
        q.appendChild(sc);
        if (numeric) { const an = document.createElement('div'); an.className = 'anchors'; const a1 = document.createElement('span'); a1.textContent = S.survey.scale_anchor_none; const a2 = document.createElement('span'); a2.textContent = S.survey.scale_anchor_extreme; an.append(a1, a2); q.appendChild(an); }
        block.appendChild(q);
      });
      if (letter === 'F') { const n = document.createElement('p'); n.className = 'asrs-note'; n.append(b.notice, document.createElement('br'), ASRS.notice); block.appendChild(n); }
      wrap.appendChild(block);
    });
  }

  /* ------------------------------------------------------------------
     Send: Turnstile is loaded and executed now, never earlier. 204 or 409 means sent; anything else shows send_failed.
     ------------------------------------------------------------------ */
  let last = null;
  function buildSubmission(now) {
    const answers = {}; document.querySelectorAll('#items input:checked').forEach((i) => { answers[i.name] = Number(i.value); });
    return {
      answers, timer_used: true, preset: timer.preset, duration_s: timer.duration,
      elapsed_s: Math.round((now - timer.startAt) / 1000), overtime_s: Math.max(0, Math.round((now - timer.endAt) / 1000)),
      focus_sound_ever: tools.focusEver, focus_sound: tools.lastSound, time_signal_ever: tools.signalEver, time_signal_interval_s: tools.signalEver ? tools.lastInterval : null,
      active_time_s: Math.round(activeNow() / 1000), item_timing: paraSummary(), ...(src ? { src } : {}),
    };
  }
  // Required answers: every question except those the language file marks optional. Send refuses while any is open,
  // marks them in red, scrolls to the first and says why; nothing is sent and Turnstile is not loaded.
  const unanswered = () => [...document.querySelectorAll('#items .q:not([data-optional])')].filter((q) => !q.querySelector('input:checked'));
  async function send() {
    const button = $('submit'); if (button.disabled) return;
    const missing = unanswered(); document.querySelectorAll('#items .q.missing').forEach((q) => q.classList.remove('missing'));
    if (missing.length) { missing.forEach((q) => q.classList.add('missing')); $('unanswered').hidden = false; missing[0].scrollIntoView({ block: 'center', behavior: REDUCED.matches ? 'auto' : 'smooth' }); return; }
    button.disabled = true; button.textContent = S.thanks.sending; $('sendError').hidden = true;
    const payload = buildSubmission(Date.now());
    let token = null;
    if (cfg.TURNSTILE_SITE_KEY) { try { token = await Net.getTurnstileToken(cfg.TURNSTILE_SITE_KEY, TURNSTILE_WAIT_MS); } catch (e) { token = null; } }
    if (token) payload.turnstile_token = token; else payload.turnstile = 'unavailable';
    let status = 0;
    try { status = await Net.post('submit', payload); } catch (e) { status = 0; }
    if (status === 204 || status === 409) { finishSend(payload); return; }
    button.disabled = false; button.textContent = S.survey.send; $('sendError').hidden = false;
  }
  function finishSend(payload) {
    sent = true;
    last = { payload, at: new Date() };
    try { window.localStorage.setItem(DONE_KEY, last.at.toISOString()); } catch (e) { /* storage unavailable */ }
    $('submit').hidden = true; $('sendError').hidden = true; $('unanswered').hidden = true; $('surveyHead').hidden = true; $('items').hidden = true; $('thanks').style.display = 'block'; $('thanksFoot').hidden = false; $('survey').classList.add('done');
    timer.active = false; $('topbar').hidden = true; $('thanksOpen').hidden = false; window.scrollTo(0, 0); // the floating pill keeps the Focus Sound card reachable
  }
  $('submit').addEventListener('click', send);

  /* ------------------------------------------------------------------
     Download your answers: a PDF in the answers mockup's design, generated on the device (pdf.js, loaded on tap);
     the plain-text file is the fallback if PDF generation throws.
     ------------------------------------------------------------------ */
  function record() {
    const p = last.payload; const timing = {}; p.item_timing.forEach((r) => { timing[r.item] = r; });
    const T = S.file.tool_rows;
    const presetName = p.preset === 'custom' ? fill(S.setup.custom_label, { duration: fmtHuman(p.duration_s) }) : `${fmtHuman(p.duration_s)} (${p.preset === 'long' ? S.setup.long_call : S.setup.short_call})`;
    const blocks = S._meta.block_order.map((letter) => {
      const b = S.blocks[letter];
      const ids = letter === 'F' ? ASRS.items.map((t, i) => `asrs${i + 1}`) : Object.keys(b.items);
      return { letter, title: b.title, lead: letter === 'F' ? b.lead : null, notice: letter === 'F' ? `${b.notice}\n${ASRS.notice}` : null,
        items: ids.map((id) => ({ id, text: QTEXT[id], label: id in p.answers ? OPTS[id][p.answers[id]] : null, timing: timing[id] || null })) };
    });
    const tools_rows = [
      [T.call_length, presetName],
      [T.time_taken, fmtHuman(p.elapsed_s)],
      [T.overtime, p.overtime_s > 0 ? fmtHuman(p.overtime_s) : T.none],
      [T.focus_sound, p.focus_sound ? S.focus.sounds[p.focus_sound] : T.off],
      [T.time_signal, p.time_signal_ever && p.time_signal_interval_s ? fill(T.on_every, { interval: S.focus.interval_values[String(p.time_signal_interval_s)] }) : T.off],
    ];
    let saved;
    try { saved = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'short' }).format(last.at); } catch (e) { saved = last.at.toISOString().slice(0, 16).replace('T', ' '); }
    return { strings: S, asrs: ASRS, lang, blocks, tools_rows, saved, date: last.at.toISOString().slice(0, 10) };
  }
  function itemMeta(t) {
    if (!t) return '';
    let meta = fill(S.file.answered_after, { seconds: t.latency_s.toFixed(1) });
    if (t.changes > 1) meta += `, ${fill(S.file.changed_times, { n: t.changes - 1 })}`;
    return meta;
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  function downloadText(rec) {
    const F = S.file; const lines = [F.title, F.study_line, `${S.institute.name}, ${S.institute.short}`, fill(F.saved, { datetime: rec.saved }), '', `${F.created_on_device}. ${F.no_identifiers}`, '', F.thank_you_p1, '', F.thank_you_p2, '', F.what_you_answered.toUpperCase(), ''];
    rec.blocks.forEach((b) => {
      lines.push(b.title); if (b.lead) lines.push(b.lead);
      b.items.forEach((it) => { lines.push(it.text); const meta = itemMeta(it.timing); lines.push(`  ${it.label === null ? F.not_answered : it.label}${meta ? `   (${meta})` : ''}`); });
      if (b.notice) lines.push(b.notice);
      lines.push('');
    });
    lines.push(F.tools_title.toUpperCase(), F.tools_p, '');
    rec.tools_rows.forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
    lines.push('', S.survey.credit, '', F.next_title.toUpperCase(), F.next_p1, '', F.next_p2, '', F.footer);
    saveBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `study7-answers-${rec.date}.txt`);
  }
  let pdfModule = null;
  function loadPdfModule() {
    if (window.Study7Pdf) return Promise.resolve(window.Study7Pdf);
    if (!pdfModule) pdfModule = new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = '/study7/pdf.js'; s.onload = () => (window.Study7Pdf ? resolve(window.Study7Pdf) : reject(new Error('pdf module'))); s.onerror = () => { pdfModule = null; reject(new Error('pdf module')); }; document.head.appendChild(s); });
    return pdfModule;
  }
  $('download').addEventListener('click', async () => {
    const button = $('download'); if (!last || button.disabled) return;
    button.disabled = true; button.textContent = S.thanks.preparing; // the file takes a moment to build
    const rec = record();
    try {
      const pdf = await loadPdfModule();
      const blob = await pdf.build(rec);
      saveBlob(blob, `study7-answers-${rec.date}.pdf`);
    } catch (e) {
      downloadText(rec);
    }
    button.disabled = false; button.textContent = S.thanks.download_again;
  });

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  loadLanguage().then(() => {
    applyStrings();
    Object.values(wheels).forEach(buildWheel);
    $('longLabel').textContent = fill(S.setup.long_label, { duration: fmtHuman(PRESETS.long) });
    $('shortLabel').textContent = fill(S.setup.short_label, { duration: fmtHuman(PRESETS.short) });
    $('tsIntV').textContent = intervalLabel();
    refreshSetup(); buildItems(); syncTools(); renderTimer();
    try { if (window.localStorage.getItem(DONE_KEY)) $('repeatNote').hidden = false; } catch (e) { /* storage unavailable */ }
    $('welcomeScrim').hidden = false;
  }).catch((err) => { console.error('Study 7: could not load the language files', err && err.message); });
})();
