(() => {
  'use strict';

  const H = window.H = window.H || {};
  const TAU = Math.PI * 2;
  H.TAU = TAU;
  H.$ = (sel) => document.querySelector(sel);
  H.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  H.lerp = (a, b, t) => a + (b - a) * t;
  H.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  H.randInt = (a, b) => Math.floor(H.rand(a, b + 1));
  H.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  H.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  H.angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  H.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  H.now = () => performance.now() / 1000;
  H.store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  const canvas = H.canvas = H.$('#game');
  const ctx = H.ctx = canvas.getContext('2d', { alpha: false });
  H.W = 0; H.H = 0; H.WW = 0; H.WH = 0; H.DPR = 1;

  H.el = {
    hud: H.$('#hud'),
    title: H.$('#title-screen'),
    levelScreen: H.$('#level-screen'),
    pause: H.$('#pause-screen'),
    end: H.$('#end-screen'),
    hordeCount: H.$('#horde-count'),
    hordeMax: H.$('#horde-max'),
    hordeMeter: H.$('#horde-meter'),
    timer: H.$('#timer'),
    timerSub: H.$('#timer-sub'),
    phaseLabel: H.$('#phase-label'),
    timerPanel: H.$('.timer-panel'),
    kills: H.$('#kills'),
    levelValue: H.$('#level'),
    xpText: H.$('#xp-text'),
    xpFill: H.$('#xp-fill'),
    objective: H.$('#objective-text'),
    lowHorde: H.$('#low-horde'),
    surgeBtn: H.$('#surge-btn'),
    abilityCd: H.$('#ability-cd'),
    cards: H.$('#cards'),
    levelCount: H.$('#level-count'),
    banner: H.$('#banner'),
    bannerKicker: H.$('#banner-kicker'),
    bannerText: H.$('#banner-text'),
    toast: H.$('#toast'),
    joystick: H.$('#joystick'),
    joystickKnob: H.$('#joystick span'),
    soundBtn: H.$('#sound-btn'),
    titleSound: H.$('#title-sound'),
    pauseSound: H.$('#pause-sound'),
    startBtn: H.$('#start-btn'),
    retryBtn: H.$('#retry-btn'),
    menuBtn: H.$('#menu-btn'),
    resumeBtn: H.$('#resume-btn'),
    pauseBtn: H.$('#pause-btn'),
    quitBtn: H.$('#quit-btn'),
    endMark: H.$('#end-mark'),
    endWrap: H.$('.end-wrap'),
    endKicker: H.$('#end-kicker'),
    endHeading: H.$('#end-heading'),
    endCopy: H.$('#end-copy'),
    endKills: H.$('#end-kills'),
    endTime: H.$('#end-time'),
    endLevel: H.$('#end-level'),
    endRecord: H.$('#end-record'),
    newBest: H.$('#new-best'),
    bestRecord: H.$('#best-record'),
    levelHeading: H.$('#level-heading'),
    levelSub: H.$('.level-sub'),
    pauseTip: H.$('#pause-tip-text'),
    mobileHint: H.$('#mobile-hint')
  };

  H.input = {
    keys: new Set(),
    ax: 0, ay: 0,
    joy: null,
    joyX: 0, joyY: 0,
    touchMode: matchMedia('(pointer: coarse)').matches
  };

  H.state = {
    mode: 'attract',
    t: 0,
    timeLeft: 180,
    runTime: 180,
    elapsed: 0,
    horde: null,
    survivors: [],
    projectiles: [],
    pickups: [],
    particles: [],
    texts: [],
    telegraphs: [],
    surges: [],
    rifts: [],
    level: 1,
    xp: 0,
    xpNext: 6,
    pendingLevels: 0,
    kills: 0,
    score: 0,
    boss: null,
    bossSpawned: false,
    bossDefeated: false,
    spawnTimer: 3,
    spawnCount: 0,
    wave: 1,
    shake: 0,
    hitFlash: 0,
    flash: 0,
    upgrades: {},
    biteSfx: 0,
    chimeAt: 8,
    bannerTimer: 0,
    toastTimer: 0,
    lowHorde: false
  };

  H.attract = { t: 0, bats: [], survivors: [] };
  H.camera = { x: 0, y: 0, zoom: 1.35, initialized: false };

  // ---------------------------------------------------------------------------
  // Sound — procedural, no external assets
  // ---------------------------------------------------------------------------
  class Soundscape {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.ambient = null;
      this.enabled = H.store.get('horde.sound', true) !== false;
      this.noise = null;
      this.chime = 0;
    }
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.34 : 0;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
        this.startAmbient();
      } catch { this.ctx = null; }
    }
    startAmbient() {
      if (!this.ctx || this.ambient) return;
      const ac = this.ctx;
      const bus = ac.createGain();
      bus.gain.value = 0.12;
      bus.connect(this.master);

      const low = ac.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 230;
      low.Q.value = 3;
      low.connect(bus);

      const drone = ac.createGain();
      drone.gain.value = 0.11;
      drone.connect(low);
      [41.2, 61.8, 82.4].forEach((f, i) => {
        const o = ac.createOscillator();
        o.type = i === 0 ? 'sawtooth' : 'sine';
        o.frequency.value = f;
        o.detune.value = (i - 1) * 7;
        const g = ac.createGain();
        g.gain.value = i === 0 ? 0.5 : 0.32;
        o.connect(g);
        g.connect(drone);
        o.start();
      });

      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.047;
      const lfoGain = ac.createGain();
      lfoGain.gain.value = 0.055;
      lfo.connect(lfoGain);
      lfoGain.connect(drone.gain);
      lfo.start();

      const wind = ac.createBufferSource();
      wind.buffer = this.noise;
      wind.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 360;
      bp.Q.value = 0.55;
      const wg = ac.createGain();
      wg.gain.value = 0.03;
      wind.connect(bp); bp.connect(wg); wg.connect(bus);
      wind.start();

      this.ambient = bus;
    }
    setEnabled(on) {
      this.enabled = !!on;
      H.store.set('horde.sound', this.enabled);
      if (this.ctx && this.master) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.linearRampToValueAtTime(this.enabled ? 0.34 : 0, this.ctx.currentTime + 0.25);
      }
      if (this.enabled) this.ensure();
      H.updateSoundButtons();
    }
    toggle() { this.setEnabled(!this.enabled); }
    tone({ f = 220, f2 = 80, dur = 0.12, type = 'sine', vol = 0.12, delay = 0, attack = 0.005 }) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const ac = this.ctx;
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(20, f), t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.03);
    }
    noiseBurst({ dur = 0.15, vol = 0.1, freq = 800, q = 0.8, type = 'bandpass', delay = 0, sweep = 0 }) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx || !this.noise) return;
      const ac = this.ctx;
      const t0 = ac.currentTime + delay;
      const src = ac.createBufferSource();
      src.buffer = this.noise;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t0);
      if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(30, sweep), t0 + dur);
      f.Q.value = q;
      const g = ac.createGain();
      g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0); src.stop(t0 + dur + 0.02);
    }
    bite() {
      if (!this.enabled) return;
      if (H.now() - this.chime < 0.055) return;
      this.chime = H.now();
      this.tone({ f: H.rand(340, 540), f2: 70, dur: 0.055, type: 'triangle', vol: 0.022 });
      this.noiseBurst({ dur: 0.035, vol: 0.018, freq: 1800, q: 1.5 });
    }
    hurt() {
      this.tone({ f: 110, f2: 46, dur: 0.3, type: 'sawtooth', vol: 0.13 });
      this.noiseBurst({ dur: 0.22, vol: 0.1, freq: 380, q: 0.7, sweep: 80 });
    }
    kill() {
      this.tone({ f: 180, f2: 50, dur: 0.22, type: 'triangle', vol: 0.07 });
      this.noiseBurst({ dur: 0.16, vol: 0.05, freq: 700, q: 0.8, sweep: 120 });
    }
    arrow() {
      this.noiseBurst({ dur: 0.12, vol: 0.035, freq: 2400, q: 2.3, sweep: 700 });
    }
    magic() {
      this.tone({ f: 300, f2: 900, dur: 0.22, type: 'sine', vol: 0.035 });
    }
    boom() {
      this.tone({ f: 90, f2: 30, dur: 0.45, type: 'sine', vol: 0.16 });
      this.noiseBurst({ dur: 0.38, vol: 0.13, freq: 520, q: 0.6, sweep: 55, type: 'lowpass' });
    }
    surge() {
      this.tone({ f: 65, f2: 28, dur: 0.55, type: 'sine', vol: 0.19 });
      this.noiseBurst({ dur: 0.5, vol: 0.12, freq: 320, q: 0.5, sweep: 2200, type: 'bandpass' });
      this.tone({ f: 220, f2: 880, dur: 0.2, type: 'sawtooth', vol: 0.025 });
    }
    level() {
      if (!this.enabled) return;
      [0, 0.09, 0.2].forEach((d, i) => this.tone({ f: [261.6, 329.6, 392][i], f2: [261.6, 329.6, 523.2][i], dur: 0.55, type: 'sine', vol: 0.06, delay: d, attack: 0.02 }));
      this.noiseBurst({ dur: 0.7, vol: 0.035, freq: 1900, q: 1.2, sweep: 400 });
    }
    boss() {
      this.tone({ f: 55, f2: 42, dur: 1.3, type: 'sawtooth', vol: 0.15, attack: 0.05 });
      this.tone({ f: 82, f2: 55, dur: 1.1, type: 'sine', vol: 0.1, delay: 0.15 });
      this.noiseBurst({ dur: 1.3, vol: 0.08, freq: 180, q: 0.6, sweep: 50, type: 'lowpass' });
    }
    victory() {
      [0, 0.14, 0.3, 0.48].forEach((d, i) => this.tone({ f: [261.6, 329.6, 392, 523.3][i], f2: [392, 523.3, 659.3, 1046][i], dur: 0.9, type: 'sine', vol: 0.065, delay: d, attack: 0.01 }));
    }
    defeat() {
      [0, 0.16, 0.36].forEach((d, i) => this.tone({ f: [220, 174.6, 130.8][i], f2: [110, 87.3, 65.4][i], dur: 1.2, type: 'sine', vol: 0.07, delay: d, attack: 0.02 }));
    }
    chimeNow() {
      if (!this.enabled) return;
      this.tone({ f: 783.99, f2: 783.99, dur: 1.1, type: 'sine', vol: 0.028, attack: 0.01 });
      this.tone({ f: 1174.66, f2: 1174.66, dur: 0.8, type: 'sine', vol: 0.015, delay: 0.1 });
    }
  }
  H.sound = new Soundscape();

  H.updateSoundButtons = () => {
    const on = H.sound.enabled;
    H.el.soundBtn.classList.toggle('muted', !on);
    H.el.soundBtn.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
    [H.el.titleSound, H.el.pauseSound].forEach((b) => { if (b) b.textContent = `SOUND: ${on ? 'ON' : 'OFF'}`; });
  };

  // ---------------------------------------------------------------------------
  // Canvas sizing + procedural backdrop
  // ---------------------------------------------------------------------------
  H.backgroundCanvas = document.createElement('canvas');
  H.titleBackgroundCanvas = document.createElement('canvas');
  let bgCtx = null;
  H.fogSprite = document.createElement('canvas');
  H.fogSprite.width = 320; H.fogSprite.height = 320;
  {
    const f = H.fogSprite.getContext('2d');
    const g = f.createRadialGradient(160, 160, 0, 160, 160, 160);
    g.addColorStop(0, 'rgba(150,160,205,0.5)');
    g.addColorStop(0.45, 'rgba(120,125,175,0.17)');
    g.addColorStop(1, 'rgba(80,80,130,0)');
    f.fillStyle = g; f.fillRect(0, 0, 320, 320);
  }

  function drawDeadTree(g, x, y, len, ang, depth, width) {
    if (depth <= 0 || len < 4) return;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    g.strokeStyle = depth > 3 ? '#07050b' : '#0d0913';
    g.lineWidth = width;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(
      x + Math.cos(ang + 0.15) * len * 0.55,
      y + Math.sin(ang + 0.15) * len * 0.55,
      ex, ey
    );
    g.stroke();
    const branches = depth > 3 ? 3 : 2;
    for (let i = 0; i < branches; i++) {
      const a = ang + H.rand(-0.62, 0.62) + (i === 0 ? -0.18 : i === 2 ? 0.18 : 0);
      drawDeadTree(g, ex, ey, len * H.rand(0.58, 0.76), a, depth - 1, Math.max(0.7, width * 0.62));
    }
  }

  function drawTomb(g, x, y, s, tilt) {
    g.save();
    g.translate(x, y);
    g.rotate(tilt);
    g.fillStyle = 'rgba(5,4,9,0.72)';
    g.beginPath();
    g.ellipse(2, 3, s * 0.66, s * 0.22, 0, 0, TAU);
    g.fill();
    const grd = g.createLinearGradient(-s * 0.4, -s, s * 0.4, 0);
    grd.addColorStop(0, '#1c1824');
    grd.addColorStop(0.55, '#12101a');
    grd.addColorStop(1, '#0a0810');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(-s * 0.34, 0);
    g.lineTo(-s * 0.34, -s * 0.5);
    g.arc(0, -s * 0.5, s * 0.34, Math.PI, 0);
    g.lineTo(s * 0.34, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(210,190,190,0.07)';
    g.lineWidth = 0.7;
    g.stroke();
    g.strokeStyle = 'rgba(210,190,190,0.11)';
    g.lineWidth = Math.max(1, s * 0.055);
    g.beginPath();
    g.moveTo(0, -s * 0.79); g.lineTo(0, -s * 0.24);
    g.moveTo(-s * 0.15, -s * 0.63); g.lineTo(s * 0.15, -s * 0.63);
    g.stroke();
    g.restore();
  }

  H.paintBackground = (bg, w, h) => {
    if (!w || !h) return;
    bg.width = Math.round(w * H.DPR);
    bg.height = Math.round(h * H.DPR);
    bgCtx = bg.getContext('2d');
    bgCtx.setTransform(H.DPR, 0, 0, H.DPR, 0, 0);
    const g = bgCtx;

    g.fillStyle = '#06040b';
    g.fillRect(0, 0, w, h);

    const base = g.createRadialGradient(w * 0.53, h * 0.51, 10, w * 0.53, h * 0.51, Math.max(w, h) * 0.72);
    base.addColorStop(0, '#23192f');
    base.addColorStop(0.36, '#171022');
    base.addColorStop(0.7, '#0d0915');
    base.addColorStop(1, '#06050b');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);

    const warm = g.createRadialGradient(w * 0.53, h * 0.52, 0, w * 0.53, h * 0.52, Math.min(w, h) * 0.36);
    warm.addColorStop(0, 'rgba(138,92,64,0.2)');
    warm.addColorStop(0.55, 'rgba(82,45,60,0.08)');
    warm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = warm;
    g.fillRect(0, 0, w, h);

    // Ground grain
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const a = Math.random() * 0.032;
      g.fillStyle = Math.random() < 0.55 ? `rgba(235,220,200,${a})` : `rgba(0,0,0,${a * 1.8})`;
      const s = Math.random() < 0.9 ? 1 : 2;
      g.fillRect(x, y, s, s);
    }

    // Dry paths / ash drifts
    for (let i = 0; i < 26; i++) {
      const x = H.rand(w * 0.08, w * 0.92), y = H.rand(h * 0.12, h * 0.9);
      const r = H.rand(30, 130);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const warmTone = Math.random() < 0.5;
      grad.addColorStop(0, warmTone ? 'rgba(125,100,82,0.035)' : 'rgba(105,105,135,0.025)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(x, y, r, r * H.rand(0.3, 0.7), H.rand(0, TAU), 0, TAU); g.fill();
    }

    // Cracks
    for (let i = 0; i < 24; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      let a = Math.random() * TAU;
      g.beginPath(); g.moveTo(x, y);
      const steps = H.randInt(3, 9);
      for (let j = 0; j < steps; j++) {
        a += H.rand(-0.5, 0.5);
        x += Math.cos(a) * H.rand(5, 18);
        y += Math.sin(a) * H.rand(3, 12);
        g.lineTo(x, y);
      }
      g.strokeStyle = `rgba(2,2,6,${H.rand(0.25, 0.6)})`;
      g.lineWidth = H.rand(0.5, 1.4);
      g.stroke();
    }

    // Central ritual circle
    const cx = w * 0.53, cy = h * 0.515;
    const cr = Math.min(w, h) * 0.205;
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = 'rgba(206,168,112,0.075)';
    g.lineWidth = 1;
    [1, 0.86, 0.55, 0.16].forEach((m) => {
      g.beginPath(); g.arc(0, 0, cr * m, 0, TAU); g.stroke();
    });
    g.setLineDash([2, 9]);
    g.strokeStyle = 'rgba(227,66,95,0.08)';
    g.beginPath(); g.arc(0, 0, cr * 0.72, 0, TAU); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU;
      const r1 = cr * (i % 3 ? 0.93 : 0.88), r2 = cr * (i % 3 ? 0.97 : 1.01);
      g.beginPath();
      g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      g.strokeStyle = 'rgba(216,173,106,0.13)';
      g.stroke();
    }
    // Rune marks
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.15;
      const x = Math.cos(a) * cr * 0.79, y = Math.sin(a) * cr * 0.79;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.strokeStyle = 'rgba(227,66,95,0.11)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 0); g.lineTo(0, 6); g.lineTo(-4, 0); g.closePath(); g.stroke();
      g.restore();
    }
    g.restore();

    // Central unlit pyre
    g.save();
    g.translate(cx, cy);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU + 0.2;
      const rx = Math.cos(a) * 38, ry = Math.sin(a) * 22;
      g.fillStyle = i % 2 ? '#17131c' : '#100d15';
      g.beginPath(); g.ellipse(rx, ry, H.rand(5, 9), H.rand(4, 7), a, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(216,173,106,0.045)'; g.stroke();
    }
    g.strokeStyle = '#211720'; g.lineWidth = 5; g.lineCap = 'round';
    [-1, 1].forEach((d) => {
      g.beginPath(); g.moveTo(-18 * d, -10); g.lineTo(17 * d, 11); g.stroke();
    });
    g.strokeStyle = 'rgba(227,66,95,0.2)'; g.lineWidth = 0.8;
    g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.stroke();
    g.restore();

    // Tombstones and rubble
    const tombs = [
      [0.1, 0.24, 18], [0.16, 0.68, 14], [0.26, 0.86, 22], [0.87, 0.2, 20],
      [0.9, 0.74, 16], [0.72, 0.87, 14], [0.06, 0.53, 13], [0.79, 0.12, 14],
      [0.93, 0.44, 12], [0.36, 0.07, 12]
    ];
    tombs.forEach(([tx, ty, s]) => drawTomb(g, w * tx, h * ty, s, H.rand(-0.18, 0.18)));

    for (let i = 0; i < 65; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      if (H.dist(x, y, w * 0.53, h * 0.51) < cr * 0.85) continue;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(40,36,48,0.5)' : 'rgba(15,12,18,0.8)';
      g.beginPath();
      g.ellipse(x, y, H.rand(1.5, 5), H.rand(1, 3), H.rand(0, TAU), 0, TAU);
      g.fill();
    }

    // Dead trees framing the arena
    const treeData = [
      [-w * 0.01, h * 0.35, h * 0.19, -1.45, 6, 9],
      [-w * 0.03, h * 0.72, h * 0.16, -1.3, 5, 8],
      [w * 0.99, h * 0.24, h * 0.2, -1.75, 6, 10],
      [w * 1.02, h * 0.64, h * 0.18, -1.7, 5, 9],
      [w * 0.2, h * 1.02, h * 0.17, -2.2, 5, 8],
      [w * 0.84, h * 1.03, h * 0.2, -2.05, 6, 9],
      [w * 0.38, -h * 0.03, h * 0.13, 1.5, 5, 7],
      [w * 0.64, -h * 0.02, h * 0.15, 1.62, 5, 8]
    ];
    treeData.forEach(([x, y, len, a, d, wd]) => drawDeadTree(g, x, y, len, a, d, wd));

    // Broken pillars near the clearing
    [[0.33, 0.24], [0.73, 0.27], [0.29, 0.77], [0.78, 0.76]].forEach(([px, py], i) => {
      const x = w * px, y = h * py, ph = 28 + (i % 2) * 13;
      g.fillStyle = 'rgba(4,3,8,0.6)';
      g.beginPath(); g.ellipse(x + 3, y + 3, 17, 6, 0, 0, TAU); g.fill();
      g.fillStyle = '#15111b';
      g.fillRect(x - 8, y - ph, 16, ph);
      g.fillStyle = '#0c0911';
      g.fillRect(x + 2, y - ph, 6, ph);
      g.fillStyle = '#1b1522';
      g.fillRect(x - 11, y - 4, 22, 5);
      g.strokeStyle = 'rgba(216,173,106,0.055)';
      g.strokeRect(x - 8, y - ph, 16, ph);
    });

    // Edge shadows
    const edge = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.27, cx, cy, Math.max(w, h) * 0.78);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,0.34)');
    g.fillStyle = edge;
    g.fillRect(0, 0, w, h);
  };

  H.buildBackground = () => {
    H.paintBackground(H.backgroundCanvas, H.WW, H.WH);
    H.paintBackground(H.titleBackgroundCanvas, H.W, H.H);
  };

  H.resize = () => {
    const oldW = H.W, oldH = H.H, oldWW = H.WW, oldWH = H.WH;
    const rect = canvas.getBoundingClientRect();
    H.W = Math.max(320, Math.round(rect.width || window.innerWidth));
    H.H = Math.max(320, Math.round(rect.height || window.innerHeight));
    H.WW = Math.max(Math.round(H.W * 1.65), 1200);
    H.WH = Math.max(Math.round(H.H * 1.55), 900);
    H.DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(H.W * H.DPR);
    canvas.height = Math.round(H.H * H.DPR);
    ctx.setTransform(H.DPR, 0, 0, H.DPR, 0, 0);
    if (oldW && oldH) H.rescaleWorld?.(oldW, oldH, oldWW, oldWH);
    H.buildBackground();
    H.initAmbient();
  };

  // Ambient motes and fog
  H.ambient = [];
  H.initAmbient = () => {
    H.ambient = [];
    const n = Math.round(Math.min(80, H.W * H.H / 19000));
    for (let i = 0; i < n; i++) {
      H.ambient.push({
        x: Math.random() * H.W,
        y: Math.random() * H.H,
        r: H.rand(0.5, 1.8),
        vx: H.rand(-4, 4),
        vy: H.rand(-9, -2),
        phase: H.rand(0, TAU),
        a: H.rand(0.12, 0.62),
        warm: Math.random() < 0.55
      });
    }
  };
  H.updateAmbient = (dt) => {
    for (const p of H.ambient) {
      p.x += p.vx * dt + Math.sin(H.state.t * 0.7 + p.phase) * 2.5 * dt;
      p.y += p.vy * dt;
      if (p.y < -10) { p.y = H.H + 8; p.x = Math.random() * H.W; }
      if (p.x < -10) p.x = H.W + 8;
      if (p.x > H.W + 10) p.x = -8;
    }
  };

  H.updateSoundButtons();
})();
