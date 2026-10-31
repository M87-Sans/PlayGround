(() => {
  'use strict';
  const H = window.H;
  const { TAU, clamp, lerp, rand, randInt, pick, dist, angleTo, state } = H;

  H.RUN_TIME = 180;
  H.START_HORDE = 30;

  H.TYPES = {
    squire: { name: 'Squire', hp: 27, speed: 88, radius: 15, soul: 2, dmg: 1, range: 66, windup: 0.42, cool: 1.08, color: '#5f5c6e', accent: '#d8ad6a' },
    archer: { name: 'Archer', hp: 21, speed: 76, radius: 14, soul: 3, dmg: 1, range: 250, cool: 1.9, color: '#3e5b49', accent: '#b6d39b' },
    mage: { name: 'Pyromancer', hp: 33, speed: 67, radius: 15, soul: 4, dmg: 3, range: 235, cool: 3.3, color: '#5a2934', accent: '#ff9a5e' },
    cleric: { name: 'Cleric', hp: 39, speed: 64, radius: 15, soul: 4, dmg: 1, range: 240, cool: 4.2, color: '#6f6449', accent: '#fff0a6' },
    knight: { name: 'Knight', hp: 92, speed: 58, radius: 19, soul: 6, dmg: 2, range: 76, windup: 0.62, cool: 1.55, color: '#494a5c', accent: '#e8c786' },
    boss: { name: 'Dawnbringer', hp: 760, speed: 54, radius: 40, soul: 30, dmg: 3, range: 0, color: '#e7d9b1', accent: '#ffe0a0' }
  };

  H.initAttract = () => {
    H.attract.bats = [];
    for (let i = 0; i < 42; i++) {
      H.attract.bats.push({
        a: rand(0, TAU), r: rand(105, 245), s: rand(0.72, 1.25),
        ph: rand(0, TAU), spd: rand(0.16, 0.46), lift: rand(-8, 18)
      });
    }
    H.attract.survivors = [
      { kind: 'knight', a: -2.45, r: 92, angle: 0.65 },
      { kind: 'archer', a: -0.1, r: 106, angle: -3.05 },
      { kind: 'cleric', a: 1.4, r: 80, angle: 3.85 }
    ];
  };

  H.formatTime = (sec) => {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  H.makeBat = (h, i) => {
    const a = rand(0, TAU), r = rand(5, 24);
    return {
      x: h.x + Math.cos(a) * r,
      y: h.y + Math.sin(a) * r,
      vx: 0, vy: 0,
      phase: rand(0, TAU),
      drift: rand(0, TAU),
      biteCd: rand(0, 0.45),
      lunge: 0,
      size: rand(0.9, 1.32),
      wing: rand(0.75, 1.25),
      ring: rand(0.75, 1.25),
      index: i
    };
  };

  H.addBats = (n, x, y, burst = true) => {
    const h = state.horde;
    if (!h) return;
    for (let i = 0; i < n; i++) {
      if (h.count >= h.max) break;
      const b = H.makeBat(h, h.bats.length);
      if (x != null) {
        const a = rand(0, TAU), r = rand(2, 22);
        b.x = x + Math.cos(a) * r; b.y = y + Math.sin(a) * r;
        if (burst) {
          b.vx = Math.cos(a) * rand(30, 130);
          b.vy = Math.sin(a) * rand(30, 130);
        }
      }
      h.bats.push(b);
      h.count++;
    }
  };

  H.removeBats = (n, x, y) => {
    const h = state.horde;
    if (!h || h.count <= 0) return;
    const amount = Math.min(h.count, Math.max(1, Math.floor(n)));
    for (let i = 0; i < amount; i++) {
      let idx = h.bats.length - 1, best = Infinity;
      if (x != null && h.bats.length > 4) {
        for (let j = 0; j < h.bats.length; j++) {
          const b = h.bats[j];
          const d = (b.x - x) ** 2 + (b.y - y) ** 2;
          if (d < best) { best = d; idx = j; }
        }
      }
      const [b] = h.bats.splice(idx, 1);
      if (b) H.burst(b.x, b.y, '#56101f', 4, 80, 0.5, 2.2);
    }
    h.count = h.bats.length;
    if (h.count <= 0) H.endGame(false, 'wiped');
  };

  H.damageHorde = (amount, x, y, heavy = false) => {
    if (state.mode !== 'playing') return;
    const h = state.horde;
    if (!h) return;
    const loss = Math.max(1, Math.round(amount) - (h.armor || 0));
    H.removeBats(loss, x, y);
    state.hitFlash = Math.max(state.hitFlash, heavy ? 0.55 : 0.34);
    state.shake = Math.max(state.shake, heavy ? 18 : 8);
    H.sound.hurt();
    H.floatText(x ?? h.x, y ?? h.y - 12, `-${loss}`, '#ff6b81', 14);
    H.burst(x ?? h.x, y ?? h.y, '#d22e4e', heavy ? 16 : 7, heavy ? 180 : 110, 0.7, 3);
  };

  H.burst = (x, y, color, n = 8, speed = 100, life = 0.5, size = 2) => {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(speed * 0.2, speed);
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(life * 0.5, life), max: life, size: rand(size * 0.5, size),
        color, drag: rand(2, 5), glow: false, line: false
      });
    }
  };

  H.floatText = (x, y, text, color = '#f6dca7', size = 13) => {
    state.texts.push({ x, y, text, color, size, life: 0.8, max: 0.8, vx: rand(-8, 8) });
  };

  H.spawnSurvivor = (kind, x, y, opts = {}) => {
    const cfg = H.TYPES[kind];
    if (!cfg) return null;
    const scale = kind === 'boss' ? 1 : 1 + state.elapsed / 250 + state.wave * 0.035;
    const elite = !opts.noElite && kind !== 'boss' && state.elapsed > 28 && Math.random() < 0.11;
    const hp = cfg.hp * scale * (elite ? 1.9 : 1) * (opts.hpMult || 1);
    const e = {
      kind,
      x, y,
      vx: 0, vy: 0,
      hp, maxHp: hp,
      speed: cfg.speed * (elite ? 0.92 : 1),
      radius: cfg.radius * (elite ? 1.14 : 1),
      angle: angleTo(x, y, state.horde.x, state.horde.y),
      state: 'idle',
      timer: 0,
      cd: rand(0.3, 1.3),
      attackAngle: 0,
      flash: 0,
      dmgAccum: 0,
      textTimer: rand(0.1, 0.4),
      elite,
      dead: false,
      boss: kind === 'boss',
      intro: kind === 'boss' ? 1.15 : (opts.intro || 0),
      summonAt: [0.66, 0.33],
      summons: 0,
      pattern: 0,
      poison: 0,
      healPulse: 0,
      seed: rand(0, 100)
    };
    state.survivors.push(e);
    state.spawnCount++;
    if (kind === 'boss') {
      state.boss = e;
      state.bossSpawned = true;
      H.addRift(x, y, 110, '#ffe2a3');
      H.sound.boss();
      state.shake = 26;
      state.flash = 0.4;
    } else {
      H.addRift(x, y, 34, '#c45a62');
    }
    return e;
  };

  H.addRift = (x, y, r, color) => {
    state.rifts.push({ x, y, r, color, life: 0.85, max: 0.85 });
  };

  H.spawnGroup = (count, forcedKind) => {
    const h = state.horde;
    if (!h) return;
    const zoom = H.camera.zoom || 1.2;
    const reachX = H.W / (2 * zoom) + 86;
    const reachY = H.H / (2 * zoom) + 86;
    const moving = Math.hypot(h.vx, h.vy) > 45;
    const a = moving ? Math.atan2(h.vy, h.vx) + rand(-1.15, 1.15) : rand(0, TAU);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * rand(38, 62);
      let x = h.x + Math.cos(a) * reachX - Math.sin(a) * spread;
      let y = h.y + Math.sin(a) * reachY + Math.cos(a) * spread;
      x = clamp(x, 22, H.WW - 22); y = clamp(y, 28, H.WH - 28);
      H.spawnSurvivor(forcedKind || H.weightedKind(), x, y);
    }
  };

  H.weightedKind = () => {
    const t = state.elapsed;
    const r = Math.random();
    if (t < 28) return r < 0.68 ? 'squire' : 'archer';
    if (t < 62) return r < 0.46 ? 'squire' : r < 0.78 ? 'archer' : 'mage';
    if (t < 105) return r < 0.35 ? 'squire' : r < 0.59 ? 'archer' : r < 0.82 ? 'mage' : 'cleric';
    return r < 0.26 ? 'squire' : r < 0.48 ? 'archer' : r < 0.68 ? 'mage' : r < 0.84 ? 'cleric' : 'knight';
  };

  // ---------------------------------------------------------------------------
  // Run lifecycle
  // ---------------------------------------------------------------------------
  H.startGame = () => {
    H.sound.ensure();
    state.mode = 'playing';
    state.t = 0;
    state.timeLeft = H.RUN_TIME;
    state.runTime = H.RUN_TIME;
    state.elapsed = 0;
    state.level = 1;
    state.xp = 0;
    state.xpNext = 6;
    state.pendingLevels = 0;
    state.kills = 0;
    state.score = 0;
    state.spawnTimer = 2.3;
    state.spawnCount = 0;
    state.wave = 1;
    state.boss = null;
    state.bossSpawned = false;
    state.bossDefeated = false;
    state.survivors = [];
    state.projectiles = [];
    state.pickups = [];
    state.particles = [];
    state.texts = [];
    state.telegraphs = [];
    state.surges = [];
    state.rifts = [];
    state.slashes = [];
    state.shake = 0;
    state.hitFlash = 0;
    state.flash = 0;
    state.upgrades = {};
    state.biteSfx = 0;
    state.bannerTimer = 0;
    state.toastTimer = 0;
    state.lowHorde = false;
    state.chimeAt = 8;

    const max = H.START_HORDE;
    state.horde = {
      x: H.WW * 0.51, y: H.WH * 0.56, vx: 0, vy: 0,
      count: 0, max,
      bats: [],
      damage: 1.28,
      biteRate: 2.05,
      speed: 252,
      coreSpeed: 252,
      surgeCd: 0,
      surgeCdMax: 7.8,
      surgeDamage: 17,
      armor: 0,
      soulBonus: 0,
      wasCooling: false,
      moveDust: 0,
      pulse: 0
    };
    H.addBats(max, state.horde.x, state.horde.y, false);
    state.horde.count = state.horde.bats.length;
    H.snapCamera?.();

    H.el.hud.classList.remove('hidden');
    H.el.title.classList.add('hidden');
    H.el.levelScreen.classList.add('hidden');
    H.el.pause.classList.add('hidden');
    H.el.end.classList.add('hidden');
    H.el.joystick.classList.remove('on');
    H.el.lowHorde.classList.remove('on');
    H.el.endWrap.classList.remove('victory');
    H.input.keys.clear();
    H.input.joy = null;
    H.input.joyX = 0; H.input.joyY = 0;
    H.updateHud();
    H.showBanner('NIGHT I', 'THE HUNT BEGINS', 2400);
    H.toast(H.input.touchMode || H.W <= 640 ? 'Drag to move  ·  Tap to blood surge' : 'WASD to move  ·  SPACE to blood surge', 3600);

    // The first defenders form a ring around the pyre.
    const cx = H.WW * 0.53, cy = H.WH * 0.515;
    const r = Math.min(H.WW, H.WH) * 0.085;
    H.spawnSurvivor('squire', cx + Math.cos(-1.4) * r, cy + Math.sin(-1.4) * r, { noElite: true });
    H.spawnSurvivor('archer', cx + Math.cos(0.1) * r, cy + Math.sin(0.1) * r, { noElite: true });
    H.spawnSurvivor('squire', cx + Math.cos(2.45) * r, cy + Math.sin(2.45) * r, { noElite: true });
    H.spawnSurvivor('mage', cx + Math.cos(3.75) * r, cy + Math.sin(3.75) * r, { noElite: true });
    state.spawnCount = 0;
  };

  H.endGame = (victory, reason) => {
    if (state.mode === 'ended') return;
    state.mode = 'ended';
    const survived = clamp(H.RUN_TIME - state.timeLeft, 0, H.RUN_TIME);
    const best = H.store.get('horde.best', { kills: 0, time: 0, level: 1, victories: 0 });
    const isBest = state.kills > best.kills || (victory && !best.victories);
    const newBest = {
      kills: Math.max(best.kills || 0, state.kills),
      time: Math.max(best.time || 0, survived),
      level: Math.max(best.level || 1, state.level),
      victories: (best.victories || 0) + (victory ? 1 : 0)
    };
    H.store.set('horde.best', newBest);
    H.el.hud.classList.add('hidden');
    H.el.levelScreen.classList.add('hidden');
    H.el.pause.classList.add('hidden');
    H.el.end.classList.remove('hidden');
    H.el.newBest.classList.toggle('hidden', !isBest);
    H.el.endWrap.classList.toggle('victory', victory);
    H.el.joystick.classList.remove('on');
    H.input.joy = null;
    if (victory) {
      H.el.endKicker.textContent = 'THE DAWNFIRE IS OUT';
      H.el.endHeading.textContent = 'The light goes out.';
      H.el.endCopy.textContent = 'The Dawnbringer falls. Her last prayer dissolves between a thousand teeth. The sun will not rise over this valley again.';
      H.sound.victory();
    } else {
      H.el.endKicker.textContent = 'THE LIGHT PREVAILS';
      H.el.endHeading.textContent = reason === 'dawn' ? 'Dawn broke.' : 'The swarm scattered.';
      H.el.endCopy.textContent = reason === 'dawn'
        ? 'You ran out of night. The first ray of sun burns through the last of the horde, and the valley belongs to the living again.'
        : 'The last of your bats burst into ash. The defenders hold their pyre, trembling, until morning comes.';
      H.sound.defeat();
    }
    H.el.endKills.textContent = state.kills;
    H.el.endTime.textContent = H.formatTime(survived);
    H.el.endLevel.textContent = `LV ${state.level}`;
    H.el.endRecord.textContent = `BLOOD RECORD  ·  ${newBest.kills} DEVOURED  ·  ${H.formatTime(newBest.time)} SURVIVED${newBest.victories ? `  ·  ${newBest.victories} DAWNS BROKEN` : ''}`;
    H.renderBest();
    H.updateHud();
  };

  H.renderBest = () => {
    const b = H.store.get('horde.best', null);
    if (!b || (!b.kills && !b.victories)) {
      H.el.bestRecord.textContent = 'THE NIGHT HAS NOT BEEN SURVIVED';
      return;
    }
    if (b.victories) {
      H.el.bestRecord.textContent = `${b.victories} DAWN${b.victories > 1 ? 'S' : ''} BROKEN  ·  BEST ${b.kills} DEVOURED`;
    } else {
      H.el.bestRecord.textContent = `BEST  ·  ${b.kills} DEVOURED  ·  ${H.formatTime(b.time)} SURVIVED`;
    }
  };

  // ---------------------------------------------------------------------------
  // Surges, souls, upgrades
  // ---------------------------------------------------------------------------
  H.activateSurge = () => {
    if (state.mode !== 'playing') return;
    const h = state.horde;
    if (!h || h.surgeCd > 0) return;
    h.surgeCd = h.surgeCdMax;
    h.wasCooling = true;
    h.pulse = 1;
    state.shake = Math.max(state.shake, 16);
    state.flash = Math.max(state.flash, 0.28);
    H.sound.surge();
    state.surges.push({ x: h.x, y: h.y, r: 10, max: 330, life: 0.55, maxLife: 0.55 });
    state.surges.push({ x: h.x, y: h.y, r: 10, max: 250, life: 0.72, maxLife: 0.72, delay: 0.08 });
    for (const b of h.bats) b.lunge = 1;
    const power = h.surgeDamage + state.level * 1.5;
    for (const e of state.survivors) {
      const d = dist(h.x, h.y, e.x, e.y);
      if (d < 335) {
        H.damageSurvivor(e, e.boss ? power * 0.75 : power);
        const a = angleTo(h.x, h.y, e.x, e.y);
        const push = e.boss ? 14 : 54;
        e.x += Math.cos(a) * push; e.y += Math.sin(a) * push;
      }
    }
    for (const p of state.projectiles) {
      if (dist(h.x, h.y, p.x, p.y) < 335 && !p.dead) {
        p.dead = true;
        H.burst(p.x, p.y, p.color || '#f6dca7', 5, 70, 0.4, 1.8);
      }
    }
    H.burst(h.x, h.y, '#e3425f', 34, 380, 0.8, 3.5);
    H.floatText(h.x, h.y - 40, 'BLOOD SURGE', '#ff8297', 15);
  };

  H.addSoul = (x, y, value, boss = false) => {
    const orbs = boss ? 10 : 1;
    for (let i = 0; i < orbs; i++) {
      const a = rand(0, TAU), sp = rand(20, 110);
      state.pickups.push({
        x: x + rand(-6, 6), y: y + rand(-6, 6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        value: boss ? Math.ceil(value / orbs) : value,
        phase: rand(0, TAU), life: 16, dead: false,
        size: boss ? rand(4, 7) : rand(2.3, 4.2),
        big: boss
      });
    }
  };

  H.collectSoul = (p) => {
    p.dead = true;
    const h = state.horde;
    if (!h) return;
    H.addBats(1 + (h.soulBonus || 0), h.x, h.y, true);
    state.xp += p.value;
    H.floatText(p.x, p.y - 6, `+${p.value}`, p.big ? '#ffe5a7' : '#cba6ff', p.big ? 16 : 11);
    H.burst(p.x, p.y, '#b98cff', 4, 50, 0.35, 1.6);
    let leveled = false;
    while (state.xp >= state.xpNext && state.level < 30) {
      state.xp -= state.xpNext;
      state.level++;
      state.pendingLevels++;
      state.xpNext = Math.round(5 + Math.pow(state.level + 1, 1.45) * 3.2);
      leveled = true;
    }
    if (leveled && state.mode === 'playing') H.openLevelUp();
  };

  H.applyUpgrade = (up) => {
    if (!up) return;
    state.upgrades[up.id] = (state.upgrades[up.id] || 0) + 1;
    up.apply(state.horde, state);
    state.pendingLevels = Math.max(0, state.pendingLevels - 1);
    state.mode = 'playing';
    H.el.levelScreen.classList.add('hidden');
    H.sound.level();
    state.flash = Math.max(state.flash, 0.18);
    H.updateHud();
    if (state.pendingLevels > 0) {
      setTimeout(() => { if (state.mode === 'playing') H.openLevelUp(); }, 320);
    }
  };

  H.openLevelUp = () => {
    if (state.mode !== 'playing' && state.mode !== 'levelup') return;
    if (state.mode === 'levelup') return;
    state.mode = 'levelup';
    H.input.keys.clear();
    H.input.joy = null;
    H.el.joystick.classList.remove('on');
    H.el.levelScreen.classList.remove('hidden');
    H.el.levelCount.textContent = `LEVEL ${state.level}`;
    H.el.levelHeading.textContent = state.pendingLevels > 1 ? 'Choose a mutation' : 'The horde evolves';
    H.sound.level();
    H.showCards();
  };

  // ---------------------------------------------------------------------------
  // World update
  // ---------------------------------------------------------------------------
  H.updateWorld = (dt) => {
    const h = state.horde;
    if (!h) return;
    state.t += dt;
    state.timeLeft -= dt;
    state.elapsed = H.RUN_TIME - state.timeLeft;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      H.endGame(false, 'dawn');
      return;
    }

    // Core movement
    let mx = 0, my = 0;
    const k = H.input.keys;
    if (k.has('a') || k.has('arrowleft')) mx -= 1;
    if (k.has('d') || k.has('arrowright')) mx += 1;
    if (k.has('w') || k.has('arrowup')) my -= 1;
    if (k.has('s') || k.has('arrowdown')) my += 1;
    mx += H.input.joyX; my += H.input.joyY;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const deadzone = 0.08;
    if (Math.abs(mx) < deadzone) mx = 0;
    if (Math.abs(my) < deadzone) my = 0;
    const tvx = mx * h.coreSpeed, tvy = my * h.coreSpeed;
    const accel = 1 - Math.exp(-dt * 11);
    h.vx = lerp(h.vx, tvx, accel);
    h.vy = lerp(h.vy, tvy, accel);
    h.x = clamp(h.x + h.vx * dt, 38, H.WW - 38);
    h.y = clamp(h.y + h.vy * dt, 56, H.WH - 42);
    h.pulse = Math.max(0, h.pulse - dt * 2.5);
    if (Math.hypot(h.vx, h.vy) > 80) {
      h.moveDust -= dt;
      if (h.moveDust <= 0) {
        h.moveDust = 0.07;
        state.particles.push({
          x: h.x + rand(-16, 16), y: h.y + rand(4, 18),
          vx: -h.vx * 0.08 + rand(-10, 10), vy: -h.vy * 0.08 + rand(-8, 8),
          life: rand(0.3, 0.6), max: 0.6, size: rand(1, 3), color: '#4f2335', drag: 4, glow: false
        });
      }
    }

    // Cooldown
    if (h.surgeCd > 0) {
      h.surgeCd = Math.max(0, h.surgeCd - dt);
      if (h.surgeCd === 0 && h.wasCooling) {
        h.wasCooling = false;
        H.toast('BLOOD SURGE READY', 1400);
      }
    }

    H.updateSpawner(dt);
    H.updateBats(dt);
    for (const e of state.survivors) {
      if (!e.dead) H.updateSurvivor(e, dt);
    }
    state.survivors = state.survivors.filter((e) => !e.dead);

    H.updateProjectiles(dt);
    H.updateTelegraphs(dt);
    H.updatePickups(dt);
    H.updateParticles(dt);
    H.updateSurges(dt);
    H.updateRifts(dt);

    // Ambient sound stinger
    if (state.elapsed > state.chimeAt) {
      state.chimeAt += 11;
      H.sound.chimeNow();
    }

    state.shake = Math.max(0, state.shake - dt * 42);
    state.hitFlash = Math.max(0, state.hitFlash - dt * 2.2);
    state.flash = Math.max(0, state.flash - dt * 2.3);
    H.updateHud();
  };

  H.updateSpawner = (dt) => {
    state.spawnTimer -= dt;
    const elapsed = state.elapsed;

    if (elapsed >= 120 && !state.bossSpawned) {
      state.wave = 3;
      const side = clamp(H.W / (2 * H.camera.zoom) * 0.48, 90, 280);
      const dir = state.horde.x < H.WW * 0.5 ? 1 : -1;
      const bx = clamp(state.horde.x + side * dir, 120, H.WW - 120);
      const by = clamp(state.horde.y - 80, 100, H.WH - 100);
      const boss = H.spawnSurvivor('boss', bx, by, { noElite: true, hpMult: 1 });
      if (boss) {
        boss.intro = 1.4;
        H.showBanner('THE DAWNBRINGER', 'SHE HAS COME TO END YOU', 3800, true);
        H.toast('Break the light. Kill the Dawnbringer.', 4200);
        H.el.objective.textContent = 'Destroy the Dawnbringer. Break the dawn.';
        for (let i = 0; i < 2; i++) {
          const a = i ? 2.5 : 0.6;
          H.spawnSurvivor('knight', bx + Math.cos(a) * 150, by + Math.sin(a) * 100, { noElite: true, intro: 0.8 });
        }
      }
    } else if (elapsed >= 60 && state.wave < 2) {
      state.wave = 2;
      H.showBanner('NIGHT II', 'THEY PRAY TO THE DAWN', 2600);
      H.spawnGroup(4);
      state.spawnTimer = 4;
    } else if (elapsed >= 30 && state.wave < 2 && state.spawnCount < 9) {
      // small nudge to keep the clearing busy
    }

    if (state.spawnTimer <= 0) {
      const alive = state.survivors.length;
      if (alive < 24) {
        const base = 1 + Math.floor(elapsed / 30);
        const count = clamp(base + (Math.random() < 0.35 ? 1 : 0), 1, 5);
        H.spawnGroup(count);
      }
      state.spawnTimer = Math.max(1.3, 4.0 - elapsed / 65) + rand(0, 1.1);
    }
  };

  H.updateBats = (dt) => {
    const h = state.horde;
    const orbitR = 15 + Math.sqrt(h.count) * 5.7;
    for (const b of h.bats) {
      b.biteCd -= dt;
      b.lunge = Math.max(0, b.lunge - dt * 5);
      let target = null, bd = 64;
      for (const e of state.survivors) {
        if (e.dead) continue;
        const d = dist(b.x, b.y, e.x, e.y) - e.radius;
        if (d < bd) { bd = d; target = e; }
      }
      let tx, ty, sp;
      if (target && dist(h.x, h.y, target.x, target.y) < 260) {
        const a = b.phase + state.t * 1.6;
        const rr = target.radius + 5 + Math.sin(b.phase * 3) * 5;
        tx = target.x + Math.cos(a) * rr;
        ty = target.y + Math.sin(a) * rr;
        sp = 470;
      } else {
        const a = b.phase + state.t * (0.42 + b.ring * 0.12);
        const wob = Math.sin(state.t * 2.4 + b.drift) * 5;
        tx = h.x + Math.cos(a) * (orbitR * b.ring) + wob;
        ty = h.y + Math.sin(a) * (orbitR * b.ring) + wob * 0.7;
        sp = 330;
      }
      const dx = tx - b.x, dy = ty - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const urgency = d > 120 ? 1.35 : 1;
      const desiredVX = dx / d * sp * urgency;
      const desiredVY = dy / d * sp * urgency;
      const t = 1 - Math.exp(-dt * (target ? 13 : 7));
      b.vx = lerp(b.vx, desiredVX, t);
      b.vy = lerp(b.vy, desiredVY, t);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const fromCore = dist(b.x, b.y, h.x, h.y);
      if (fromCore > 520) {
        // The farthest wings of the horde catch up instead of being left behind.
        b.x = lerp(b.x, h.x, 0.12);
        b.y = lerp(b.y, h.y, 0.12);
      }
      if (target && b.biteCd <= 0) {
        const hitD = dist(b.x, b.y, target.x, target.y);
        if (hitD < target.radius + 13) {
          b.biteCd = 1 / h.biteRate * rand(0.84, 1.16);
          b.lunge = 1;
          H.damageSurvivor(target, h.damage * (b.size || 1));
          if (Math.random() < 0.35) {
            state.particles.push({
              x: b.x, y: b.y, vx: rand(-60, 60), vy: rand(-60, 60),
              life: 0.22, max: 0.22, size: rand(1, 2.4), color: '#ff4b67', drag: 6, glow: true
            });
          }
          if (H.now() - state.biteSfx > 0.07) {
            state.biteSfx = H.now();
            H.sound.bite();
          }
        }
      }
    }
  };

  H.damageSurvivor = (e, amount) => {
    if (!e || e.dead) return;
    if (e.intro > 0) return;
    let dmg = amount;
    if (e.kind === 'knight') dmg *= 0.88;
    e.hp -= dmg;
    e.flash = 1;
    e.dmgAccum += dmg;
    if (e.textTimer <= 0) {
      e.textTimer = 0.24;
      const shown = Math.max(1, Math.round(e.dmgAccum));
      e.dmgAccum = 0;
      H.floatText(e.x + rand(-5, 5), e.y - e.radius - 12, String(shown), e.boss ? '#ffe1a6' : '#f4d7ba', e.boss ? 16 : 12);
    }
    if (e.hp <= 0) H.killSurvivor(e);
  };

  H.killSurvivor = (e) => {
    if (e.dead) return;
    e.dead = true;
    state.kills++;
    state.score += (e.boss ? 5000 : 60) + e.kind.length * 12;
    const cfg = H.TYPES[e.kind];
    const soulValue = Math.round(cfg.soul * (e.elite ? 1.8 : 1));
    H.addSoul(e.x, e.y, soulValue, e.boss);
    H.burst(e.x, e.y, '#b98cff', e.boss ? 35 : 8, e.boss ? 250 : 90, 0.8, 2.2);
    H.burst(e.x, e.y, '#8e1830', e.boss ? 45 : 14, e.boss ? 300 : 140, 0.8, 3);
    H.burst(e.x, e.y, '#d3c4a4', e.boss ? 20 : 4, 90, 0.6, 1.6);
    H.floatText(e.x, e.y - e.radius - 22, e.boss ? 'DEVOURED' : (e.elite ? 'ELITE DEVOURED' : 'DEVOURED'), e.boss ? '#ffe0a0' : '#e0c8a7', e.boss ? 24 : 10);
    if (e.boss) {
      state.bossDefeated = true;
      state.boss = null;
      state.flash = 0.7;
      state.shake = 36;
      H.sound.boom();
      H.endGame(true, 'boss');
    } else {
      H.sound.kill();
    }
    state.shake = Math.max(state.shake, e.boss ? 36 : 3);
  };

  function enemyMove(e, tx, ty, speedMult, dt) {
    let dx = tx - e.x, dy = ty - e.y;
    let d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    let sx = 0, sy = 0;
    for (const o of state.survivors) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oy = e.y - o.y;
      const od = Math.hypot(ox, oy);
      if (od > 0.1 && od < e.radius + o.radius + 5) {
        sx += ox / od * (1 - od / (e.radius + o.radius + 5));
        sy += oy / od * (1 - od / (e.radius + o.radius + 5));
      }
    }
    const sp = e.speed * speedMult;
    e.vx = lerp(e.vx, (dx + sx * 1.8) * sp, 1 - Math.exp(-dt * 5));
    e.vy = lerp(e.vy, (dy + sy * 1.8) * sp, 1 - Math.exp(-dt * 5));
    e.x = clamp(e.x + e.vx * dt, 28, H.WW - 28);
    e.y = clamp(e.y + e.vy * dt, 36, H.WH - 36);
  }

  function faceTarget(e, dt, speed = 8) {
    const target = angleTo(e.x, e.y, state.horde.x, state.horde.y);
    let diff = target - e.angle;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    e.angle += diff * Math.min(1, dt * speed);
  }

  H.updateSurvivor = (e, dt) => {
    if (e.intro > 0) {
      e.intro -= dt;
      e.flash = Math.max(0, e.flash - dt * 3);
      return;
    }
    const h = state.horde;
    const d = dist(e.x, e.y, h.x, h.y);
    e.flash = Math.max(0, e.flash - dt * 4.5);
    e.dmgAccum += 0; // accumulator lives on the survivor until its text timer fires
    e.textTimer -= dt;
    if (e.textTimer <= 0 && e.dmgAccum > 0) {
      e.textTimer = 0.24;
      H.floatText(e.x + rand(-4, 4), e.y - e.radius - 10, String(Math.max(1, Math.round(e.dmgAccum))), e.boss ? '#ffe1a6' : '#f4d7ba', e.boss ? 15 : 11);
      e.dmgAccum = 0;
    }
    if (e.boss) { H.updateBoss(e, dt, d); return; }

    faceTarget(e, dt, 5);

    if (e.kind === 'archer') {
      if (e.state === 'aim') {
        e.timer -= dt;
        e.cd -= dt;
        if (d > 160) enemyMove(e, h.x, h.y, 0.35, dt);
        else if (d < 130) enemyMove(e, e.x * 2 - h.x, e.y * 2 - h.y, 0.8, dt);
        if (e.timer <= 0) {
          H.fireArrow(e);
          e.state = 'idle';
          e.cd = H.TYPES.archer.cool * rand(0.86, 1.12);
        }
      } else {
        e.cd -= dt;
        if (d > 300) enemyMove(e, h.x, h.y, 1, dt);
        else if (d < 185) enemyMove(e, e.x * 2 - h.x, e.y * 2 - h.y, 1, dt);
        else {
          const a = angleTo(e.x, e.y, h.x, h.y);
          enemyMove(e, e.x + Math.cos(a + Math.PI / 2) * 50, e.y + Math.sin(a + Math.PI / 2) * 50, 0.4, dt);
        }
        if (e.cd <= 0 && d < 460) {
          e.state = 'aim';
          e.timer = 0.55;
          e.attackAngle = angleTo(e.x, e.y, h.x, h.y);
          H.sound.arrow();
        }
      }
      return;
    }

    if (e.kind === 'mage') {
      e.cd -= dt;
      if (d < 180) enemyMove(e, e.x * 2 - h.x, e.y * 2 - h.y, 0.9, dt);
      else if (d > 285) enemyMove(e, h.x, h.y, 0.8, dt);
      else {
        const a = angleTo(e.x, e.y, h.x, h.y);
        const dir = e.seed % 2 < 1 ? 1 : -1;
        enemyMove(e, e.x + Math.cos(a + Math.PI / 2 * dir) * 50, e.y + Math.sin(a + Math.PI / 2 * dir) * 50, 0.35, dt);
      }
      if (e.cd <= 0 && d < 500) {
        e.cd = H.TYPES.mage.cool * rand(0.9, 1.15);
        e.state = 'cast';
        e.timer = 0.45;
        const lead = 0.62;
        const px = clamp(h.x + h.vx * lead + rand(-18, 18), 60, H.WW - 60);
        const py = clamp(h.y + h.vy * lead + rand(-18, 18), 60, H.WH - 60);
        state.telegraphs.push({
          x: px, y: py, r: 74, life: 0.95, max: 0.95,
          kind: 'fire', color: '#ff8b4f', dmg: 3, e
        });
        H.sound.magic();
        H.burst(e.x, e.y, '#ff9a5e', 8, 80, 0.5, 2);
      }
      if (e.state === 'cast') {
        e.timer -= dt;
        if (e.timer <= 0) e.state = 'idle';
      }
      return;
    }

    if (e.kind === 'cleric') {
      e.cd -= dt;
      e.healPulse += dt;
      if (d < 175) enemyMove(e, e.x * 2 - h.x, e.y * 2 - h.y, 0.75, dt);
      else if (d > 320) enemyMove(e, h.x, h.y, 0.8, dt);
      else {
        const a = angleTo(e.x, e.y, h.x, h.y);
        enemyMove(e, e.x + Math.cos(a - Math.PI / 2) * 40, e.y + Math.sin(a - Math.PI / 2) * 40, 0.3, dt);
      }
      if (e.cd <= 0) {
        e.cd = H.TYPES.cleric.cool * rand(0.9, 1.1);
        let healed = 0;
        for (const o of state.survivors) {
          if (o.dead || o === e) continue;
          if (dist(e.x, e.y, o.x, o.y) < 230 && o.hp < o.maxHp) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.14);
            healed++;
            H.burst(o.x, o.y, '#ffe8a0', 5, 45, 0.6, 1.8);
          }
        }
        if (healed) H.floatText(e.x, e.y - 30, 'MENDED', '#ffe8a0', 10);
        if (d < 300) {
          state.telegraphs.push({ x: h.x, y: h.y, r: 62, life: 0.85, max: 0.85, kind: 'holy', color: '#ffe8a0', dmg: 1, e });
        }
        H.burst(e.x, e.y, '#ffe8a0', 12, 80, 0.9, 2);
      }
      return;
    }

    // Melee: squire & knight
    const cfg = H.TYPES[e.kind];
    if (e.state === 'windup') {
      e.timer -= dt;
      e.attackAngle = angleTo(e.x, e.y, h.x, h.y);
      if (e.timer <= 0) {
        e.state = 'idle';
        e.cd = cfg.cool * rand(0.88, 1.16);
        state.slashes = state.slashes || [];
        state.slashes.push({ x: e.x, y: e.y, angle: e.attackAngle, r: cfg.range + 10, life: 0.28, max: 0.28, color: e.kind === 'knight' ? '#f0cd8b' : '#e8d7bb' });
        if (dist(e.x, e.y, h.x, h.y) < cfg.range + 22) {
          H.damageHorde(cfg.dmg, h.x, h.y, e.kind === 'knight');
        }
        state.shake = Math.max(state.shake, e.kind === 'knight' ? 10 : 4);
        H.sound.tone({ f: e.kind === 'knight' ? 140 : 240, f2: 70, dur: 0.18, type: 'sawtooth', vol: 0.04 });
      }
    } else {
      e.cd -= dt;
      if (e.cd <= 0 && d < cfg.range + 20) {
        e.state = 'windup';
        e.timer = cfg.windup;
        e.attackAngle = angleTo(e.x, e.y, h.x, h.y);
      } else if (d > cfg.range - 6) {
        enemyMove(e, h.x, h.y, 1, dt);
      }
    }
  };

  H.updateBoss = (e, dt, d) => {
    const h = state.horde;
    faceTarget(e, dt, 3.5);
    e.flash = Math.max(0, e.flash - dt * 4.5);
    e.healPulse += dt;
    if (e.hp / e.maxHp < e.summonAt[e.summons] && e.summons < 2) {
      e.summons++;
      const n = e.summons === 1 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU);
        H.spawnSurvivor(i === 0 ? 'knight' : 'squire', e.x + Math.cos(a) * 85, e.y + Math.sin(a) * 85, { noElite: true, intro: 0.5 });
      }
      H.floatText(e.x, e.y - 50, 'RISE', '#ffe0a0', 20);
      H.showBanner('THE DAWNBRINGER', 'SHE CALLS THE FAITHFUL', 1700, true);
      H.sound.boss();
      state.shake = Math.max(state.shake, 14);
    }
    if (e.state === 'windup') {
      e.timer -= dt;
      e.attackAngle = angleTo(e.x, e.y, h.x, h.y);
      if (e.timer <= 0) {
        e.state = 'idle';
        e.cd = 1.5;
        state.slashes = state.slashes || [];
        state.slashes.push({ x: e.x, y: e.y, angle: e.attackAngle, r: 150, life: 0.36, max: 0.36, color: '#ffe1a6', boss: true });
        if (dist(e.x, e.y, h.x, h.y) < 165) H.damageHorde(3, h.x, h.y, true);
        H.sound.boom();
        state.shake = Math.max(state.shake, 20);
      }
      return;
    }
    if (e.state === 'cast') {
      e.timer -= dt;
      if (e.timer <= 0) {
        if (e.pattern % 2 === 0) {
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * TAU + state.t * 0.4;
            state.projectiles.push({
              x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
              r: 5, life: 4.2, dmg: 1, color: '#ffe0a0', kind: 'orb', trail: true, dead: false
            });
          }
          H.sound.magic();
        } else {
          for (let i = 0; i < 3; i++) {
            const a = angleTo(e.x, e.y, h.x, h.y) + (i - 1) * 0.28;
            state.projectiles.push({
              x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
              r: 8, life: 3.2, dmg: 3, color: '#ff9a5e', kind: 'bossbolt', trail: true, dead: false
            });
          }
          H.sound.arrow();
        }
        e.pattern++;
        e.state = 'idle';
        e.cd = 1.25;
      }
      return;
    }
    e.cd -= dt;
    if (d < 180) {
      if (e.cd <= 0) {
        e.state = 'windup';
        e.timer = 0.62;
      }
    } else {
      enemyMove(e, h.x, h.y, 1, dt);
      if (e.cd <= 0) {
        e.state = 'cast';
        e.timer = 0.55;
        e.cd = 3;
      }
    }
  };

  H.fireArrow = (e) => {
    const h = state.horde;
    const lead = 0.18;
    const tx = h.x + h.vx * lead, ty = h.y + h.vy * lead;
    const a = angleTo(e.x, e.y, tx, ty) + rand(-0.055, 0.055);
    state.projectiles.push({
      x: e.x + Math.cos(a) * 16, y: e.y + Math.sin(a) * 16,
      vx: Math.cos(a) * 435, vy: Math.sin(a) * 435,
      r: 4, life: 2.4, dmg: 1, color: '#d8e4b0', kind: 'arrow', angle: a, trail: true, dead: false
    });
    H.sound.arrow();
  };

  H.updateProjectiles = (dt) => {
    const h = state.horde;
    const hitR = 23 + Math.sqrt(h.count) * 2.2;
    for (const p of state.projectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.trail && Math.random() < 0.65) {
        state.particles.push({
          x: p.x, y: p.y, vx: -p.vx * 0.05, vy: -p.vy * 0.05,
          life: 0.26, max: 0.26, size: p.kind === 'arrow' ? 1 : 2.4,
          color: p.color, drag: 5, glow: true
        });
      }
      if (p.x < -50 || p.x > H.WW + 50 || p.y < -50 || p.y > H.WH + 50) p.dead = true;
      if (p.life <= 0) p.dead = true;
      if (!p.dead && dist(p.x, p.y, h.x, h.y) < hitR + p.r) {
        p.dead = true;
        H.damageHorde(p.dmg, p.x, p.y, p.dmg >= 3);
        H.burst(p.x, p.y, p.color, 8, 100, 0.4, 2);
      }
    }
    state.projectiles = state.projectiles.filter((p) => !p.dead);
  };

  H.updateTelegraphs = (dt) => {
    const h = state.horde;
    for (const t of state.telegraphs) {
      if (t.dead) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.dead = true;
        const hit = dist(t.x, t.y, h.x, h.y) < t.r + 10;
        if (t.kind === 'holy') {
          H.burst(t.x, t.y, '#ffe8a0', 26, 170, 0.7, 3);
          if (hit) H.damageHorde(t.dmg, h.x, h.y);
          H.sound.magic();
        } else {
          H.burst(t.x, t.y, t.color, 30, 240, 0.7, 4);
          H.burst(t.x, t.y, '#ffcf8a', 12, 300, 0.5, 2.4);
          if (hit) H.damageHorde(t.dmg, h.x, h.y, true);
          H.sound.boom();
          state.shake = Math.max(state.shake, 14);
        }
        state.surges.push({ x: t.x, y: t.y, r: 6, max: t.r * 1.25, life: 0.34, maxLife: 0.34, color: t.color, thin: true });
      }
    }
    state.telegraphs = state.telegraphs.filter((t) => !t.dead);
  };

  H.updatePickups = (dt) => {
    const h = state.horde;
    for (const p of state.pickups) {
      if (p.dead) continue;
      p.life -= dt;
      p.phase += dt * 4;
      const d = dist(p.x, p.y, h.x, h.y);
      if (d < 290) {
        const a = angleTo(p.x, p.y, h.x, h.y);
        const pull = 380 + (290 - d) * 4.5;
        p.vx = lerp(p.vx, Math.cos(a) * pull, 1 - Math.exp(-dt * 7));
        p.vy = lerp(p.vy, Math.sin(a) * pull, 1 - Math.exp(-dt * 7));
      } else {
        p.vx *= Math.exp(-dt * 2.4);
        p.vy *= Math.exp(-dt * 2.4);
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (d < 24 + p.size) H.collectSoul(p);
      if (p.life <= 0) p.dead = true;
    }
    state.pickups = state.pickups.filter((p) => !p.dead);
  };

  H.updateParticles = (dt) => {
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const drag = Math.exp(-dt * (p.drag || 3));
      p.vx *= drag; p.vy *= drag;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const t of state.texts) {
      t.life -= dt;
      t.y -= dt * 34;
      t.x += t.vx * dt;
    }
    state.texts = state.texts.filter((t) => t.life > 0);
    if (state.slashes) {
      for (const s of state.slashes) s.life -= dt;
      state.slashes = state.slashes.filter((s) => s.life > 0);
    }
  };

  H.updateSurges = (dt) => {
    for (const s of state.surges) {
      if (s.delay > 0) { s.delay -= dt; continue; }
      s.life -= dt;
      const t = 1 - s.life / s.maxLife;
      s.r = lerp(10, s.max, H.easeOut(clamp(t, 0, 1)));
    }
    state.surges = state.surges.filter((s) => s.life > 0 || s.delay > 0);
  };

  H.updateRifts = (dt) => {
    for (const r of state.rifts) { r.life -= dt; r.r += dt * 50; }
    state.rifts = state.rifts.filter((r) => r.life > 0);
  };

  H.updateAttract = (dt) => {
    H.attract.t += dt;
  };

  H.updateHud = () => {
    const h = state.horde;
    if (!h) return;
    H.el.hordeCount.textContent = h.count;
    H.el.hordeMax.textContent = h.max;
    H.el.hordeMeter.style.width = `${clamp(h.count / h.max, 0, 1) * 100}%`;
    H.el.kills.textContent = state.kills;
    H.el.levelValue.textContent = state.level;
    H.el.xpText.textContent = `${Math.floor(state.xp)} / ${state.xpNext} SOULS`;
    H.el.xpFill.style.width = `${clamp(state.xp / state.xpNext, 0, 1) * 100}%`;
    H.el.timer.textContent = H.formatTime(state.timeLeft);
    const urgent = state.timeLeft <= 30;
    H.el.timerPanel.classList.toggle('urgent', urgent);
    if (state.bossSpawned && !state.bossDefeated) {
      H.el.phaseLabel.textContent = 'FINAL NIGHT';
      H.el.timerSub.textContent = 'THE DAWNBRINGER';
    } else {
      const night = state.elapsed < 60 ? 'I' : state.elapsed < 120 ? 'II' : 'III';
      H.el.phaseLabel.textContent = `NIGHT ${night}`;
      H.el.timerSub.textContent = 'UNTIL DAWN';
    }
    if (!state.bossSpawned) {
      H.el.objective.textContent = state.elapsed < 25
        ? 'Devour the defenders. Grow the swarm.'
        : state.elapsed < 60
          ? 'Their prayers are calling something. Feed faster.'
          : 'The Dawnfire weakens. Keep the horde whole.';
    }
    const low = h.count / h.max < 0.34;
    if (low !== state.lowHorde) {
      state.lowHorde = low;
      H.el.lowHorde.classList.toggle('on', low);
    }
    const cooling = h.surgeCd > 0;
    H.el.surgeBtn.classList.toggle('cooling', cooling);
    H.el.abilityCd.textContent = cooling ? `${h.surgeCd.toFixed(1)}s` : 'READY';
  };

  H.rescaleWorld = (oldW, oldH, oldWW, oldWH) => {
    const sx = oldWW ? H.WW / oldWW : H.W / oldW;
    const sy = oldWH ? H.WH / oldWH : H.H / oldH;
    if (state.horde) {
      state.horde.x = clamp(state.horde.x * sx, 38, H.WW - 38);
      state.horde.y = clamp(state.horde.y * sy, 56, H.WH - 42);
      for (const b of state.horde.bats) { b.x *= sx; b.y *= sy; }
    }
    const arrs = [state.survivors, state.projectiles, state.pickups, state.particles, state.texts, state.telegraphs, state.surges, state.rifts, state.slashes || []];
    for (const arr of arrs) for (const o of arr) { o.x = (o.x || 0) * sx; o.y = (o.y || 0) * sy; if (o.r) o.r *= (sx + sy) / 2; }
  };
})();
