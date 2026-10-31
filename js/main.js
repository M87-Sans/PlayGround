(() => {
  'use strict';
  const H = window.H;
  const { clamp, rand, lerp, state } = H;

  H.currentChoices = [];

  const ICONS = {
    brood: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 10c-2.3 0-3.6 1.5-3.6 3.4 0 1 .4 1.9 1.1 2.6-3.1.8-5.3 3-5.3 5.8 0 .6.6.9 1 .5l3.8-2.4 3 3.6 3-3.6 3.8 2.4c.5.4 1 .1 1-.5 0-2.8-2.2-5-5.3-5.8.7-.7 1.1-1.6 1.1-2.6 0-1.9-1.3-3.4-3.6-3.4Z"/><circle cx="14.2" cy="14" r=".8" fill="currentColor"/><circle cx="17.8" cy="14" r=".8" fill="currentColor"/><path d="M5.5 6.5 2.5 9M27 7l2.8 2.5M7 25l-2 2M26 25l2 2" stroke-linecap="round"/></svg>',
    fangs: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 7c3 5 5 9.5 5.5 16C14 17 15.2 12 16 8c.8 4 2 9 3.5 15C20 16.5 22 12 25 7" stroke-linecap="round"/><path d="M9 12c.6 5 1.2 8 1.5 10M23 12c-.6 5-1.2 8-1.5 10" opacity=".45"/></svg>',
    frenzy: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 25c6-2 11-7 14-14M12 11l7 2-2 7M6 18l7 2-2 7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="2"/></svg>',
    wings: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 17C11 17 5 14 4 6c3.4 1.4 6.2 1.4 8.7.7C15.2 6 16 9 16 12c0-3 .8-6 3.3-5.3 2.5.7 5.3.7 8.7-.7-1 8-7 11-12 11Z" stroke-linejoin="round"/><path d="M16 17v9M13 23h6" stroke-linecap="round"/></svg>',
    surge: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="16" cy="16" r="4.5"/><circle cx="16" cy="16" r="9.5" stroke-dasharray="3 4"/><circle cx="16" cy="16" r="13.5" opacity=".45"/><path d="M16 2v3M16 27v3M2 16h3M27 16h3" stroke-linecap="round"/></svg>',
    hide: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 3 27 7v8c0 7-4.7 11.7-11 14-6.3-2.3-11-7-11-14V7L16 3Z" stroke-linejoin="round"/><path d="M16 9c-2.4 0-4 1.6-4 4 0 2.7 4 7 4 7s4-4.3 4-7c0-2.4-1.6-4-4-4Z" opacity=".7"/></svg>',
    carrion: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M25 16c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c3 0 5.5 1.5 7 3.6" stroke-linecap="round"/><path d="M22 5v5.5h-5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="currentColor" opacity=".55"/></svg>',
    moon: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20.5 4.5A12 12 0 1 0 27.5 24 9.5 9.5 0 0 1 20.5 4.5Z" stroke-linejoin="round"/><path d="M9 7.5 10 10l2.5 1L10 12l-1 2.5L8 12l-2.5-1L8 10l1-2.5ZM25 12l.6 1.4L27 14l-1.4.6L25 16l-.6-1.4L23 14l1.4-.6L25 12Z" fill="currentColor" stroke="none" opacity=".75"/></svg>',
    feast: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 28S5 21 5 13a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15Z" stroke-linejoin="round"/><path d="M16 10v11M11 15h10" stroke-linecap="round" opacity=".6"/></svg>'
  };

  H.UPGRADES = [
    {
      id: 'brood', name: 'Broodmother', tier: 'SWARM', icon: ICONS.brood, max: 5,
      desc: 'The brood splits. More mouths, more bodies between you and the light.',
      stat: '+6 MAX SWARM',
      apply(h, s) { h.max += 6; H.addBats(6, h.x, h.y, true); }
    },
    {
      id: 'fangs', name: 'Serrated Fangs', tier: 'FANGS', icon: ICONS.fangs, max: 5,
      desc: 'Every bite tears deeper. The horde learns the shape of armor.',
      stat: '+24% BITE DAMAGE',
      apply(h) { h.damage *= 1.24; }
    },
    {
      id: 'frenzy', name: 'Blood Frenzy', tier: 'TEMPO', icon: ICONS.frenzy, max: 5,
      desc: 'The horde does not chew. It shreds.',
      stat: '+17% BITE SPEED',
      apply(h) { h.biteRate *= 1.17; }
    },
    {
      id: 'wings', name: 'Night Wings', tier: 'FLIGHT', icon: ICONS.wings, max: 4,
      desc: 'The swarm spills across the ground like smoke. Nothing outruns it.',
      stat: '+9% MOVE & SWARM SPEED',
      apply(h) { h.speed *= 1.09; h.coreSpeed *= 1.08; }
    },
    {
      id: 'surge', name: 'Crimson Echo', tier: 'SURGE', icon: ICONS.surge, max: 4,
      desc: 'Your surge returns sooner, and hits like a scream.',
      stat: '-18% SURGE COOLDOWN  ·  +4 DAMAGE',
      apply(h) { h.surgeCdMax *= 0.82; h.surgeDamage += 4; h.surgeCd = Math.min(h.surgeCd, h.surgeCdMax); }
    },
    {
      id: 'hide', name: 'Grave Hide', tier: 'HIDE', icon: ICONS.hide, max: 2,
      desc: 'Blades find fewer bodies than they expect.',
      stat: '-1 BAT LOST PER STRIKE',
      apply(h) { h.armor = (h.armor || 0) + 1; }
    },
    {
      id: 'carrion', name: 'Carrion Feast', tier: 'FEAST', icon: ICONS.carrion, max: 3,
      desc: 'Each soul calls another winged thing out of the dark.',
      stat: '+1 BAT PER SOUL',
      apply(h) { h.soulBonus = (h.soulBonus || 0) + 1; }
    },
    {
      id: 'moon', name: 'Blood Moon', tier: 'MOON', icon: ICONS.moon, max: 4,
      desc: 'The moon leans close. The horde grows bold.',
      stat: '+3 MAX  ·  +8% BITE',
      apply(h) { h.max += 3; H.addBats(3, h.x, h.y, true); h.damage *= 1.08; }
    },
    {
      id: 'feast', name: 'Red Feast', tier: 'FEAST', icon: ICONS.feast, max: 99,
      desc: 'Tear open the fallen and let the swarm remember what it is.',
      stat: 'RESTORE 7 BATS',
      apply(h) { H.addBats(7, h.x, h.y, true); }
    }
  ];

  H.showCards = () => {
    const pool = H.UPGRADES.filter((u) => (state.upgrades[u.id] || 0) < u.max);
    const chosen = [];
    const copy = pool.slice();
    while (chosen.length < 3 && copy.length) {
      chosen.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    H.currentChoices = chosen;
    H.el.cards.innerHTML = chosen.map((u, i) => {
      const stacks = state.upgrades[u.id] || 0;
      return `<button class="card" type="button" data-upgrade="${u.id}" aria-label="${u.name}: ${u.stat}">
        <span class="card-key">[${i + 1}]</span>
        <span class="card-icon">${u.icon}</span>
        <span class="card-tier">${u.tier}${stacks ? `  ·  RANK ${stacks + 1}` : ''}</span>
        <h3>${u.name}</h3>
        <p>${u.desc}</p>
        <span class="card-stat">${u.stat}</span>
      </button>`;
    }).join('');
    H.el.cards.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('click', () => {
        const up = H.UPGRADES.find((u) => u.id === card.dataset.upgrade);
        H.chooseUpgrade(up);
      });
    });
  };

  H.chooseUpgrade = (up) => {
    if (!up || state.mode !== 'levelup') return;
    H.applyUpgrade(up);
  };

  H.showBanner = (kicker, text, ms = 2200, boss = false) => {
    clearTimeout(state.bannerTimer);
    H.el.bannerKicker.textContent = kicker;
    H.el.bannerText.textContent = text;
    H.el.banner.classList.toggle('boss', boss);
    H.el.banner.classList.remove('show');
    requestAnimationFrame(() => H.el.banner.classList.add('show'));
    state.bannerTimer = setTimeout(() => H.el.banner.classList.remove('show'), ms);
  };

  H.toast = (text, ms = 2000) => {
    clearTimeout(state.toastTimer);
    H.el.toast.textContent = text;
    H.el.toast.classList.add('show');
    state.toastTimer = setTimeout(() => H.el.toast.classList.remove('show'), ms);
  };

  H.showMenu = () => {
    state.mode = 'attract';
    H.el.hud.classList.add('hidden');
    H.el.levelScreen.classList.add('hidden');
    H.el.pause.classList.add('hidden');
    H.el.end.classList.add('hidden');
    H.el.title.classList.remove('hidden');
    H.el.lowHorde.classList.remove('on');
    H.el.joystick.classList.remove('on');
    H.el.banner.classList.remove('show');
    H.el.toast.classList.remove('show');
    H.input.keys.clear();
    H.input.joy = null;
    H.input.joyX = H.input.joyY = 0;
    H.renderBest();
    H.updateSoundButtons();
  };

  H.pauseGame = () => {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    H.el.pause.classList.remove('hidden');
    H.input.keys.clear();
    H.input.joy = null;
    H.input.joyX = H.input.joyY = 0;
    H.el.joystick.classList.remove('on');
    const tips = [
      'Bats feed automatically. Position the heart, not each fang.',
      'A blood surge shreds arrows and spells too. Save it for a bad moment.',
      'Souls restore bats. Fight inside the purple trail, not at its edge.',
      'Elite defenders have a gold mark — and far more meat.',
      'The Dawnbringer arrives when the final minute begins. Keep a surge ready.',
      'Your horde is your health bar. Never let it get thin in the open.'
    ];
    H.el.pauseTip.textContent = H.pick(tips);
  };

  H.resumeGame = () => {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    H.el.pause.classList.add('hidden');
    H.input.keys.clear();
  };

  H.toggleSound = () => H.sound.toggle();

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ' || key === 'spacebar') e.preventDefault();
    if (MOVE_KEYS.has(key)) {
      if (state.mode === 'playing') {
        e.preventDefault();
        H.input.keys.add(key);
      }
      return;
    }
    if (state.mode === 'attract') {
      if (key === 'enter' || key === ' ') {
        e.preventDefault();
        H.startGame();
      }
      return;
    }
    if (state.mode === 'playing') {
      if (key === ' ' && !e.repeat) { e.preventDefault(); H.activateSurge(); }
      else if (key === 'escape' || key === 'p') { e.preventDefault(); H.pauseGame(); }
      else if (key === 'm') H.toggleSound();
      return;
    }
    if (state.mode === 'levelup') {
      if (key === '1' || key === '2' || key === '3') {
        const idx = Number(key) - 1;
        H.chooseUpgrade(H.currentChoices[idx]);
      }
      return;
    }
    if (state.mode === 'paused') {
      if (key === 'escape' || key === 'p') { e.preventDefault(); H.resumeGame(); }
      else if (key === 'm') H.toggleSound();
      return;
    }
    if (state.mode === 'ended') {
      if (key === 'enter' || key === ' ') { e.preventDefault(); H.startGame(); }
      else if (key === 'escape') H.showMenu();
      return;
    }
  });

  window.addEventListener('keyup', (e) => {
    H.input.keys.delete(e.key.toLowerCase());
  });

  window.addEventListener('blur', () => {
    H.input.keys.clear();
    H.input.joy = null;
    H.input.joyX = H.input.joyY = 0;
    H.el.joystick.classList.remove('on');
  });

  // Virtual joystick for touch devices
  const canvas = H.canvas;
  function beginJoy(e) {
    if (e.pointerType !== 'touch' || state.mode !== 'playing') return;
    e.preventDefault();
    H.input.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    const j = H.el.joystick;
    j.style.left = `${e.clientX}px`;
    j.style.top = `${e.clientY}px`;
    j.classList.add('on');
    H.el.joystickKnob.style.transform = 'translate(0px, 0px)';
    H.el.mobileHint.style.opacity = '0';
    H.el.mobileHint.style.transition = 'opacity .5s ease';
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  }
  function moveJoy(e) {
    const j = H.input.joy;
    if (!j || j.id !== e.pointerId) return;
    e.preventDefault();
    let dx = e.clientX - j.ox, dy = e.clientY - j.oy;
    const d = Math.hypot(dx, dy);
    const max = 46;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    H.input.joyX = dx / max;
    H.input.joyY = dy / max;
    H.el.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function endJoy(e) {
    const j = H.input.joy;
    if (!j || j.id !== e.pointerId) return;
    H.input.joy = null;
    H.input.joyX = H.input.joyY = 0;
    H.el.joystick.classList.remove('on');
  }
  canvas.addEventListener('pointerdown', beginJoy, { passive: false });
  canvas.addEventListener('pointermove', moveJoy, { passive: false });
  canvas.addEventListener('pointerup', endJoy);
  canvas.addEventListener('pointercancel', endJoy);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  H.el.surgeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    H.activateSurge();
  });
  H.el.surgeBtn.addEventListener('click', (e) => { e.preventDefault(); H.activateSurge(); });

  H.el.startBtn.addEventListener('click', () => { H.sound.ensure(); H.startGame(); });
  H.el.retryBtn.addEventListener('click', () => { H.sound.ensure(); H.startGame(); });
  H.el.menuBtn.addEventListener('click', () => H.showMenu());
  H.el.resumeBtn.addEventListener('click', () => H.resumeGame());
  H.el.pauseBtn.addEventListener('click', () => H.pauseGame());
  H.el.quitBtn.addEventListener('click', () => H.showMenu());
  H.el.soundBtn.addEventListener('click', () => H.toggleSound());
  H.el.titleSound.addEventListener('click', () => H.toggleSound());
  H.el.pauseSound.addEventListener('click', () => H.toggleSound());
  H.el.pause.addEventListener('click', (e) => {
    if (e.target === H.el.pause) H.resumeGame();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') H.pauseGame();
  });

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------
  function desiredZoom() {
    if (H.W >= 1280) return 1.42;
    if (H.W >= 900) return 1.28;
    if (H.W >= 640) return 1.14;
    return 1.03;
  }

  function clampCamera() {
    const cam = H.camera;
    const halfW = H.W / (2 * cam.zoom);
    const halfH = H.H / (2 * cam.zoom);
    cam.x = clamp(cam.x, halfW, H.WW - halfW);
    cam.y = clamp(cam.y, halfH, H.WH - halfH);
  }

  H.snapCamera = () => {
    if (!state.horde) return;
    const cam = H.camera;
    cam.zoom = desiredZoom();
    const halfW = H.W / (2 * cam.zoom);
    const halfH = H.H / (2 * cam.zoom);
    cam.x = clamp(state.horde.x + state.horde.vx * 0.1, halfW, H.WW - halfW);
    cam.y = clamp(state.horde.y + state.horde.vy * 0.1, halfH, H.WH - halfH);
    cam.initialized = true;
  };

  H.updateCamera = (dt) => {
    if (!state.horde) return;
    const cam = H.camera;
    const zTarget = desiredZoom();
    cam.zoom = lerp(cam.zoom, zTarget, 1 - Math.exp(-dt * 3));
    const halfW = H.W / (2 * cam.zoom);
    const halfH = H.H / (2 * cam.zoom);
    const tx = clamp(state.horde.x + state.horde.vx * 0.13, halfW, H.WW - halfW);
    const ty = clamp(state.horde.y + state.horde.vy * 0.13, halfH, H.WH - halfH);
    const k = 1 - Math.exp(-dt * 8);
    cam.x = lerp(cam.x, tx, k);
    cam.y = lerp(cam.y, ty, k);
    clampCamera();
  };

  // ---------------------------------------------------------------------------
  // Boot + loop
  // ---------------------------------------------------------------------------
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      H.resize();
      if (state.mode !== 'attract') H.snapCamera();
      H.render();
    });
  });

  H.resize();
  H.initAttract();
  H.renderBest();
  H.updateSoundButtons();
  H.showMenu();

  let last = performance.now();
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.12);
    last = now;
    H.updateAmbient(dt);
    if (state.mode === 'playing') {
      H.updateWorld(dt);
      H.updateCamera(dt);
    } else if (state.mode === 'attract') {
      H.updateAttract(dt);
    }
    H.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Exposed for debugging and capture automation.
  window.__HORDE__ = { H, state };
})();
