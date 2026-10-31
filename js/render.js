(() => {
  'use strict';
  const H = window.H;
  const { TAU, clamp, lerp, rand, state, el } = H;

  const FONT_SERIF = '"Palatino Linotype","Book Antiqua",Palatino,"Times New Roman",serif';
  const FONT_UI = '"Avenir Next",Avenir,"Segoe UI",system-ui,sans-serif';

  function drawFog(ctx, t) {
    const w = H.W, h = H.H;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const layers = [
      [0.15, 0.3, 0.75, 0.035, 0.007, 0.003],
      [0.62, 0.62, 0.9, 0.028, -0.005, 0.004],
      [0.85, 0.25, 0.6, 0.024, 0.004, 0.006],
      [0.3, 0.8, 1.05, 0.03, -0.004, -0.003],
      [0.52, 0.5, 0.55, 0.018, 0.006, 0.002]
    ];
    for (const [bx, by, scale, alpha, vx, vy] of layers) {
      const x = ((bx + vx * t) % 1.6) * w - w * 0.25;
      const y = ((by + vy * t) % 1.4) * h - h * 0.2;
      const size = Math.max(w, h) * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(H.fogSprite, x - size / 2, y - size / 2, size, size * 0.75);
    }
    ctx.restore();
  }

  function drawAmbient(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of H.ambient) {
      const glow = 0.45 + Math.sin(t * 1.8 + p.phase) * 0.35;
      ctx.globalAlpha = clamp(p.a * glow, 0, 1);
      ctx.fillStyle = p.warm ? '#f2b16d' : '#9a9ce0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Creature rendering
  // ---------------------------------------------------------------------------
  H.drawBat = function drawBat(ctx, b, t, alpha = 1) {
    const bob = Math.sin(t * 2.7 + b.phase) * 2.4;
    const flap = Math.sin(t * 16 + b.phase);
    const lunge = b.lunge || 0;
    const scale = (b.size || 1) * (1 + lunge * 0.2);
    ctx.save();
    ctx.globalAlpha = alpha;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(b.x + 2, b.y + 8, 8 * scale, 3 * scale, 0, 0, TAU);
    ctx.fill();

    ctx.translate(b.x, b.y + bob);
    const tilt = clamp((b.vx || 0) / 600, -0.28, 0.28);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);
    if (lunge > 0.2) {
      ctx.globalAlpha = alpha * 0.34 * lunge;
      ctx.fillStyle = '#ff355a';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
      ctx.globalAlpha = alpha;
    }

    // wings
    const wf = 0.55 + flap * 0.45;
    ctx.fillStyle = '#100a17';
    ctx.strokeStyle = 'rgba(106,31,59,0.65)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-2, -1);
    ctx.bezierCurveTo(-8, -4 - 10 * wf, -19, -7 - 4 * wf, -18, 3);
    ctx.quadraticCurveTo(-13, 1, -11, 6);
    ctx.quadraticCurveTo(-8, 2, -4, 5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.bezierCurveTo(8, -4 - 10 * wf, 19, -7 - 4 * wf, 18, 3);
    ctx.quadraticCurveTo(13, 1, 11, 6);
    ctx.quadraticCurveTo(8, 2, 4, 5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // body + ears
    ctx.fillStyle = '#09060e';
    ctx.beginPath();
    ctx.ellipse(0, 2, 5.2, 6.8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(88,29,52,0.5)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3.4, -3.5); ctx.lineTo(-4.8, -8.6); ctx.lineTo(-1, -5.2); ctx.closePath();
    ctx.moveTo(3.4, -3.5); ctx.lineTo(4.8, -8.6); ctx.lineTo(1, -5.2); ctx.closePath();
    ctx.fill();

    // eyes
    ctx.fillStyle = 'rgba(255,42,75,0.2)';
    ctx.beginPath(); ctx.arc(-2, 0.6, 2.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2, 0.6, 2.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff4965';
    ctx.beginPath(); ctx.arc(-2, 0.6, 1.08, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2, 0.6, 1.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd1d8';
    ctx.beginPath(); ctx.arc(-2, 0.3, 0.35, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2, 0.3, 0.35, 0, TAU); ctx.fill();
    ctx.restore();
  };

  H.drawSurvivor = function drawSurvivor(ctx, e, t) {
    const cfg = H.TYPES[e.kind];
    const alpha = e.intro > 0 ? 0.55 + Math.sin(t * 22) * 0.2 : 1;
    const flip = Math.cos(e.angle) < 0 ? -1 : 1;
    const sc = (e.radius / 15) * 0.87;
    const speed = Math.hypot(e.vx || 0, e.vy || 0);
    const walk = Math.min(1, speed / 75);
    const step = Math.sin(t * 10.5 + e.seed) * 2.4 * walk;
    const bob = Math.sin(t * 10.5 + e.seed) * 0.9 * walk;
    const wind = e.state === 'windup' ? clamp(1 - e.timer / (cfg.windup || 0.5), 0, 1) : 0;
    const aim = e.state === 'aim' ? 1 : 0;
    const cast = e.state === 'cast' ? 1 : 0;

    // Ground shadow and class aura
    ctx.save();
    ctx.globalAlpha = alpha * 0.46;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(e.x + 2, e.y + 2, e.radius * 0.78, e.radius * 0.28, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (e.elite || e.kind === 'cleric' || e.kind === 'mage') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (e.elite ? 0.18 : 0.1);
      const auraColor = e.elite ? '#e8bd70' : e.kind === 'cleric' ? '#ffe8a0' : '#ff8b4f';
      const gr = ctx.createRadialGradient(e.x, e.y - 2, 2, e.x, e.y - 2, e.radius * 1.7);
      gr.addColorStop(0, auraColor);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - 2, e.radius * 1.7, e.radius * 0.72, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(e.x, e.y + bob);
    ctx.scale(flip * sc, sc);

    // Legs and boots
    ctx.fillStyle = '#15111b';
    ctx.strokeStyle = 'rgba(4,3,8,.9)';
    ctx.lineWidth = 0.8;
    ctx.fillRect(-5.4, -13 + step * 0.6, 4.2, 13 - step * 0.6);
    ctx.fillRect(1.8, -13 - step * 0.6, 4.2, 13 + step * 0.6);
    ctx.fillStyle = '#09070d';
    ctx.beginPath();
    ctx.ellipse(-3.3, 0.4, 3.4, 1.7, -0.08, 0, TAU);
    ctx.ellipse(4, 0.4, 3.4, 1.7, 0.08, 0, TAU);
    ctx.fill();

    const sway = Math.sin(t * 2.8 + e.seed) * 1.1 * walk;

    // Cape behind
    ctx.fillStyle = 'rgba(5,4,9,.45)';
    ctx.beginPath();
    ctx.moveTo(-8.6, -31);
    ctx.quadraticCurveTo(-14 + sway, -18, -10.5 - sway, -4);
    ctx.quadraticCurveTo(0, -1, 10.5 - sway, -4);
    ctx.quadraticCurveTo(14 + sway, -18, 8.6, -31);
    ctx.closePath();
    ctx.fill();

    // Torso / robe
    ctx.fillStyle = cfg.color;
    ctx.strokeStyle = 'rgba(3,2,7,.92)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7.6, -31);
    ctx.quadraticCurveTo(-10, -22, -8.2, -11);
    ctx.quadraticCurveTo(0, -8, 8.2, -11);
    ctx.quadraticCurveTo(10, -22, 7.6, -31);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Robe highlight
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.moveTo(-4.5, -30);
    ctx.quadraticCurveTo(-7, -20, -5, -12);
    ctx.quadraticCurveTo(-2.5, -11, -2, -28);
    ctx.closePath(); ctx.fill();

    // Armor / clothing details
    if (e.kind === 'squire' || e.kind === 'knight') {
      ctx.fillStyle = e.kind === 'knight' ? '#a4a5b9' : '#777589';
      ctx.strokeStyle = 'rgba(3,2,7,.72)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-7.5, -29);
      ctx.lineTo(7.5, -29);
      ctx.lineTo(6, -16);
      ctx.quadraticCurveTo(0, -13.5, -6, -16);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -24); ctx.lineTo(6, -24);
      ctx.moveTo(0, -29); ctx.lineTo(0, -15);
      ctx.stroke();
    } else if (e.kind === 'cleric') {
      ctx.strokeStyle = '#e8d69c';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -29); ctx.lineTo(0, -13);
      ctx.moveTo(-4, -23); ctx.lineTo(4, -23);
      ctx.stroke();
      ctx.fillStyle = '#d8ad6a';
      ctx.beginPath(); ctx.arc(0, -22, 1.8, 0, TAU); ctx.fill();
    } else if (e.kind === 'mage') {
      ctx.strokeStyle = 'rgba(255,153,90,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -13); ctx.lineTo(6, -29);
      ctx.moveTo(-6, -29); ctx.lineTo(7, -13);
      ctx.stroke();
      ctx.fillStyle = '#ff9a5e';
      ctx.globalAlpha = alpha * (0.5 + cast * 0.5);
      ctx.beginPath(); ctx.arc(0, -20, 2.1 + cast, 0, TAU); ctx.fill();
      ctx.globalAlpha = alpha;
    } else if (e.kind === 'archer') {
      ctx.strokeStyle = '#b6d39b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-5.5, -27); ctx.lineTo(5.5, -16);
      ctx.moveTo(5.5, -27); ctx.lineTo(-5.5, -16);
      ctx.stroke();
    }

    // Belt
    ctx.fillStyle = '#0c0911';
    ctx.fillRect(-7.5, -14.8, 15, 2.5);
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(-1.6, -15, 3.2, 2.8);

    // Arms
    ctx.fillStyle = cfg.color;
    ctx.strokeStyle = 'rgba(4,3,8,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-8.3, -24 + step * 0.25, 2.4, 5.4, 0.24, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8.3, -24 - step * 0.25, 2.4, 5.4, -0.24, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d2b892';
    ctx.beginPath(); ctx.arc(-8.8, -19.2, 1.8, 0, TAU); ctx.arc(8.8, -19.2, 1.8, 0, TAU); ctx.fill();

    // Head + hood
    ctx.fillStyle = cfg.color;
    ctx.strokeStyle = 'rgba(3,2,7,.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6.8, -32);
    ctx.quadraticCurveTo(-7.4, -41, 0, -42);
    ctx.quadraticCurveTo(7.4, -41, 6.8, -32);
    ctx.quadraticCurveTo(0, -29.5, -6.8, -32);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Face
    ctx.fillStyle = '#d9c3a1';
    ctx.beginPath(); ctx.ellipse(0, -35.6, 4.4, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(12,9,16,.82)';
    ctx.beginPath(); ctx.ellipse(0, -37.5, 4, 2.7, 0, 0, Math.PI); ctx.fill();
    if (e.kind === 'mage' || e.kind === 'archer') {
      ctx.fillStyle = cfg.accent;
      ctx.beginPath(); ctx.arc(-1.5, -35.5, 0.55, 0, TAU); ctx.arc(1.6, -35.5, 0.55, 0, TAU); ctx.fill();
    }

    if (e.kind === 'knight') {
      // Full helm
      ctx.fillStyle = '#b9bac9';
      ctx.strokeStyle = '#4e4d60';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-6, -35);
      ctx.quadraticCurveTo(-6, -43, 0, -43.5);
      ctx.quadraticCurveTo(6, -43, 6, -35);
      ctx.lineTo(5, -31); ctx.lineTo(-5, -31);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#17141d';
      ctx.fillRect(-4.4, -37.2, 8.8, 1.3);
      ctx.fillStyle = '#e8c786';
      ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(-1.4, -49); ctx.lineTo(1.6, -46); ctx.closePath(); ctx.fill();
    } else if (e.kind === 'squire') {
      ctx.fillStyle = '#9d9cab';
      ctx.beginPath();
      ctx.moveTo(-5.6, -39);
      ctx.quadraticCurveTo(0, -46, 5.6, -39);
      ctx.lineTo(5.3, -36);
      ctx.quadraticCurveTo(0, -38.5, -5.3, -36);
      ctx.closePath(); ctx.fill();
    } else if (e.kind === 'cleric') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,231,154,.78)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(0, -46, 8, 2.8, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    if (e.kind === 'archer') {
      ctx.fillStyle = '#6e8f75';
      ctx.beginPath(); ctx.moveTo(-1, -43); ctx.lineTo(-4, -47); ctx.lineTo(2, -44); ctx.closePath(); ctx.fill();
    }

    // Weapons
    ctx.save();
    if (e.kind === 'squire') {
      ctx.translate(9, -22);
      ctx.rotate(0.34 - wind * 1.7 + aim * 0);
      ctx.strokeStyle = '#d7d5df'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -20); ctx.stroke();
      ctx.strokeStyle = '#8c6d42'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 5.5); ctx.stroke();
      ctx.strokeStyle = cfg.accent; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-3.2, 1); ctx.lineTo(3.2, 1); ctx.stroke();
    } else if (e.kind === 'knight') {
      ctx.translate(9.5, -21);
      ctx.rotate(0.4 - wind * 1.9);
      ctx.strokeStyle = '#dedce8'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -30); ctx.stroke();
      ctx.strokeStyle = '#c5a25f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(4, 3); ctx.stroke();
      // shield arm
      ctx.rotate(-0.7);
      ctx.fillStyle = '#373244'; ctx.strokeStyle = '#d8ad6a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(-16, -5, 6.4, 9, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(216,173,106,.55)';
      ctx.beginPath(); ctx.moveTo(-16, -12); ctx.lineTo(-16, 2); ctx.moveTo(-21, -5); ctx.lineTo(-11, -5); ctx.stroke();
    } else if (e.kind === 'archer') {
      ctx.translate(9.5, -25);
      ctx.rotate(-0.18 - aim * 0.45);
      ctx.strokeStyle = '#b9d0a1'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -7, 12, -1.18, 1.18); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,240,210,.62)'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-1.18) * 12, -7 + Math.sin(-1.18) * 12);
      ctx.lineTo(0, -7);
      ctx.lineTo(Math.cos(1.18) * 12, -7 + Math.sin(1.18) * 12);
      ctx.stroke();
      ctx.fillStyle = '#e4e8cc';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-1.4, -9.2); ctx.lineTo(1.4, -9.2); ctx.closePath(); ctx.fill();
    } else if (e.kind === 'mage') {
      ctx.translate(9.5, -18);
      ctx.rotate(0.14 - cast * 0.35);
      ctx.strokeStyle = '#79553c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -24); ctx.stroke();
      const glow = 3.3 + cast * 2.3;
      ctx.fillStyle = '#ff9a5e'; ctx.shadowColor = '#ff6b40'; ctx.shadowBlur = 15 + cast * 14;
      ctx.beginPath(); ctx.arc(0, -26, glow, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffe0a0';
      ctx.beginPath(); ctx.arc(0, -26, glow * 0.45, 0, TAU); ctx.fill();
    } else if (e.kind === 'cleric') {
      ctx.translate(9.5, -17);
      ctx.rotate(0.1);
      ctx.strokeStyle = '#b7995c'; ctx.lineWidth = 2.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -25); ctx.stroke();
      ctx.strokeStyle = '#ffe8a0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -26, 5.2, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5.2, -26); ctx.lineTo(5.2, -26); ctx.stroke();
      ctx.fillStyle = 'rgba(255,242,190,.9)'; ctx.shadowColor = '#ffe8a0'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, -26, 1.9, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    if (e.flash > 0) {
      ctx.globalAlpha = e.flash * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, -25, 10, 19, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = alpha;
    }
    ctx.restore();

    // Archer aim line
    if (e.kind === 'archer' && e.state === 'aim') {
      const h = state.horde;
      ctx.save();
      ctx.globalAlpha = 0.32 + Math.sin(t * 18) * 0.1;
      ctx.strokeStyle = '#d8e4b0';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 7]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y - 14); ctx.lineTo(h.x, h.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // HP bar
    if (e.hp < e.maxHp - 0.01) {
      const w = 32 + e.radius * 0.45;
      const y = e.y - 58 * sc;
      ctx.fillStyle = 'rgba(5,4,9,.82)';
      ctx.fillRect(e.x - w / 2, y, w, 3.6);
      const pct = clamp(e.hp / e.maxHp, 0, 1);
      const grad = ctx.createLinearGradient(e.x - w / 2, 0, e.x + w / 2, 0);
      grad.addColorStop(0, e.elite ? '#b47a28' : '#87132d');
      grad.addColorStop(1, e.elite ? '#f3d186' : '#e35a6f');
      ctx.fillStyle = grad;
      ctx.fillRect(e.x - w / 2 + 0.6, y + 0.6, (w - 1.2) * pct, 2.4);
    }
    if (e.elite) {
      ctx.save();
      ctx.translate(e.x, e.y - 65 * sc);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#d8ad6a';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  };

  H.drawBoss = function drawBoss(ctx, e, t) {
    const r = e.radius;
    ctx.save();
    ctx.globalAlpha = e.intro > 0 ? 0.48 + Math.sin(t * 24) * 0.25 : 1;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(e.x + 4, e.y + r * 0.8, r * 1.1, r * 0.36, 0, 0, TAU); ctx.fill();

    // golden aura
    const aura = ctx.createRadialGradient(e.x, e.y, r * 0.3, e.x, e.y, r * 2.7);
    aura.addColorStop(0, 'rgba(255,224,160,.14)');
    aura.addColorStop(0.48, 'rgba(255,180,90,.05)');
    aura.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(e.x, e.y, r * 2.7, 0, TAU); ctx.fill();

    // ground halo
    ctx.strokeStyle = `rgba(255,226,166,${0.16 + Math.sin(t * 2) * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(e.x, e.y + 6, r * 1.55, 0, TAU); ctx.stroke();
    ctx.setLineDash([2, 11]);
    ctx.beginPath(); ctx.arc(e.x, e.y + 6, r * 1.75, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(e.x, e.y + Math.sin(t * 2.3) * 1.4);
    ctx.scale(Math.cos(e.angle) < 0 ? -1 : 1, 1);

    const wind = e.state === 'windup' ? clamp(1 - e.timer / 0.62, 0, 1) : 0;
    const cast = e.state === 'cast' ? 1 : 0;

    // wings of light
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flap = 0.85 + Math.sin(t * 3.1) * 0.15;
    ctx.fillStyle = 'rgba(255,224,164,.12)';
    ctx.strokeStyle = 'rgba(255,236,192,.38)';
    ctx.lineWidth = 1;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * 10, 2);
      ctx.bezierCurveTo(dir * 48, -28 * flap, dir * 78, -22 * flap, dir * 98, 4);
      ctx.lineTo(dir * 70, 18);
      ctx.lineTo(dir * 58, 8);
      ctx.lineTo(dir * 35, 26);
      ctx.lineTo(dir * 20, 12);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // cloak
    ctx.fillStyle = '#d7c8a7';
    ctx.strokeStyle = 'rgba(38,24,29,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.bezierCurveTo(-24, -18, -34, 16, -24, 40);
    ctx.quadraticCurveTo(0, 50, 24, 40);
    ctx.bezierCurveTo(34, 16, 24, -18, 0, -20);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // armor chest
    ctx.fillStyle = '#f0dfba';
    ctx.beginPath(); ctx.ellipse(0, 3, 19, 21, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9b6d3c'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#b88747';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(9, 4); ctx.lineTo(0, 16); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,218,.7)';
    ctx.beginPath(); ctx.arc(0, 2, 4.2, 0, TAU); ctx.fill();

    // shoulders
    ctx.fillStyle = '#e6d5ac';
    ctx.beginPath(); ctx.arc(-19, -5, 7.5, 0, TAU); ctx.arc(19, -5, 7.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a87a41'; ctx.stroke();

    // head/hood
    ctx.fillStyle = '#3c2b30';
    ctx.beginPath(); ctx.arc(0, -20, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9d8b0';
    ctx.beginPath(); ctx.arc(0, -21, 8.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#291d22';
    ctx.beginPath(); ctx.arc(0, -23, 6.6, 0.08 * Math.PI, 0.92 * Math.PI); ctx.fill();

    // crown
    ctx.strokeStyle = '#ffe4a6'; ctx.fillStyle = '#d8ad6a'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, -29); ctx.lineTo(-7, -38); ctx.lineTo(-2, -32); ctx.lineTo(2, -40); ctx.lineTo(6, -32); ctx.lineTo(10, -37); ctx.lineTo(10, -28);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,231,164,${0.58 + Math.sin(t * 2) * 0.17})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -47, 22, 6, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + t * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 22, -47 + Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 26, -47 + Math.sin(a) * 7.2);
      ctx.stroke();
    }
    ctx.restore();

    // greatsword
    ctx.save();
    ctx.translate(23, 2);
    ctx.rotate(-0.5 + wind * 2.1);
    ctx.strokeStyle = '#f4e8c9'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -62); ctx.stroke();
    ctx.strokeStyle = '#b98945'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(8, 1); ctx.stroke();
    ctx.fillStyle = '#ffe0a0'; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 9, 3.2, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // casting orb
    if (cast) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,222,143,${0.4 + (1 - e.timer / 0.55) * 0.5})`;
      ctx.shadowColor = '#ffce72'; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.arc(0, -12, 11 + (1 - e.timer / 0.55) * 10, 0, TAU); ctx.fill();
      ctx.restore();
    }

    if (e.flash > 0) {
      ctx.globalAlpha = e.flash * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 33, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  function drawRifts(ctx) {
    if (!state.rifts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of state.rifts) {
      const p = 1 - r.life / r.max;
      const a = (1 - p) * 0.55;
      ctx.globalAlpha = a;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.4 + p * 0.8), 0, TAU); ctx.stroke();
      ctx.globalAlpha = a * 0.4;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.15 + p * 0.45), 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * TAU + p * 2;
        ctx.beginPath();
        ctx.moveTo(r.x + Math.cos(ang) * r.r * 0.3, r.y + Math.sin(ang) * r.r * 0.3);
        ctx.lineTo(r.x + Math.cos(ang) * r.r * (0.45 + p * 0.7), r.y + Math.sin(ang) * r.r * (0.45 + p * 0.7));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawTelegraphs(ctx, t) {
    if (!state.telegraphs.length) return;
    for (const tg of state.telegraphs) {
      const p = clamp(1 - tg.life / tg.max, 0, 1);
      ctx.save();
      ctx.translate(tg.x, tg.y);
      ctx.globalAlpha = 0.1 + p * 0.16;
      ctx.fillStyle = tg.color;
      ctx.beginPath(); ctx.arc(0, 0, tg.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.42 + Math.sin(t * 16) * 0.08;
      ctx.strokeStyle = tg.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(0, 0, tg.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(0, 0, tg.r * p, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, tg.r * 0.22, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * tg.r * 0.3, Math.sin(a) * tg.r * 0.3);
        ctx.lineTo(Math.cos(a) * tg.r * 0.9, Math.sin(a) * tg.r * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawSlashes(ctx) {
    if (!state.slashes || !state.slashes.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of state.slashes) {
      const p = s.life / s.max;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = p * 0.85;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.boss ? 10 : 6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, s.r, -0.62, 0.62); ctx.stroke();
      ctx.globalAlpha = p * 0.32;
      ctx.lineWidth = s.boss ? 22 : 13;
      ctx.beginPath(); ctx.arc(0, 0, s.r, -0.55, 0.55); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPickups(ctx, t) {
    if (!state.pickups.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.pickups) {
      const bob = Math.sin(t * 4 + p.phase) * 3;
      const glow = 0.6 + Math.sin(t * 7 + p.phase) * 0.2;
      const fade = p.life < 2 ? p.life / 2 : 1;
      ctx.globalAlpha = fade * glow;
      const grad = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, p.size * 4.5);
      grad.addColorStop(0, p.big ? 'rgba(255,236,180,1)' : 'rgba(216,186,255,1)');
      grad.addColorStop(0.25, p.big ? 'rgba(255,202,108,.55)' : 'rgba(148,96,255,.4)');
      grad.addColorStop(1, 'rgba(90,60,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, p.size * 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = p.big ? '#fff0c7' : '#f0e4ff';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, p.size, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade * 0.45;
      ctx.strokeStyle = p.big ? '#ffd98c' : '#ac85ff';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, p.size * 2.2, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  function drawProjectiles(ctx, t) {
    if (!state.projectiles.length) return;
    for (const p of state.projectiles) {
      ctx.save();
      if (p.kind === 'arrow') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.strokeStyle = '#e0dfc4';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(9, 0); ctx.stroke();
        ctx.fillStyle = '#d8e4b0';
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(5, -2.2); ctx.lineTo(5, 2.2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(216,228,176,.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-11, -3); ctx.moveTo(-8, 0); ctx.lineTo(-11, 3); ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, '#fff6d9');
        grad.addColorStop(0.3, p.color);
        grad.addColorStop(1, 'rgba(255,120,70,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, TAU); ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles(ctx) {
    if (!state.particles.length) return;
    // Additive glows first
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      if (!p.glow) continue;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (const p of state.particles) {
      if (p.glow) continue;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.9;
      ctx.fillStyle = p.color;
      if (p.line) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawTexts(ctx) {
    if (!state.texts.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    for (const t of state.texts) {
      const p = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = p;
      ctx.font = `700 ${t.size}px ${FONT_UI}`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  function drawSurges(ctx) {
    if (!state.surges.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of state.surges) {
      const p = 1 - s.life / s.maxLife;
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.strokeStyle = s.color || '#ff4f6b';
      ctx.lineWidth = 2 + (1 - p) * 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
      if (!s.thin) {
        ctx.globalAlpha = (1 - p) * 0.24;
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.91, 0, TAU); ctx.stroke();
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU + p * 0.8;
          ctx.globalAlpha = (1 - p) * 0.3;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x + Math.cos(a) * s.r * 0.55, s.y + Math.sin(a) * s.r * 0.55);
          ctx.lineTo(s.x + Math.cos(a) * s.r * 1.08, s.y + Math.sin(a) * s.r * 1.08);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawHorde(ctx, t) {
    const h = state.horde;
    if (!h) return;

    // Dark ground stain beneath the swarm
    ctx.save();
    ctx.globalAlpha = 0.5;
    const gg = ctx.createRadialGradient(h.x, h.y + 4, 0, h.x, h.y + 4, 90);
    gg.addColorStop(0, 'rgba(52,8,24,.46)');
    gg.addColorStop(0.65, 'rgba(24,4,14,.18)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(h.x, h.y + 4, 90, 0, TAU); ctx.fill();
    ctx.restore();

    // Heart glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beat = 1 + Math.sin(t * 5.2) * 0.12 + h.pulse * 0.55;
    const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 56 * beat);
    grad.addColorStop(0, 'rgba(255,72,102,.42)');
    grad.addColorStop(0.3, 'rgba(199,31,68,.17)');
    grad.addColorStop(1, 'rgba(100,10,40,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(h.x, h.y, 56 * beat, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = 'rgba(255,104,127,.42)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(h.x, h.y, 14 + Math.sin(t * 5.2) * 1.3, 0, TAU); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + t * 0.8;
      const r1 = 18, r2 = 24 + Math.sin(t * 3 + i) * 3;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(h.x + Math.cos(a) * r1, h.y + Math.sin(a) * r1);
      ctx.lineTo(h.x + Math.cos(a) * r2, h.y + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // The heart itself
    ctx.save();
    ctx.translate(h.x, h.y + Math.sin(t * 3) * 1.2);
    const pulse = 1 + Math.sin(t * 5.2) * 0.08 + h.pulse * 0.24;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#170912';
    ctx.strokeStyle = 'rgba(255,91,116,.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-12, 1, -9, -9, -3.5, -7);
    ctx.bezierCurveTo(-1.5, -6, 0, -3.5, 0, -3.5);
    ctx.bezierCurveTo(0, -3.5, 1.5, -6, 3.5, -7);
    ctx.bezierCurveTo(9, -9, 12, 1, 0, 10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,178,150,.36)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-2, 0); ctx.lineTo(-4, 3); ctx.stroke();
    ctx.restore();

    for (const b of h.bats) H.drawBat(ctx, b, t);
  }

  // ---------------------------------------------------------------------------
  // World scene
  // ---------------------------------------------------------------------------
  function drawWorldScene(ctx, t) {
    drawCampfire(ctx, H.WW * 0.53, H.WH * 0.515, 0.72, t);
    drawRifts(ctx);
    drawTelegraphs(ctx, t);
    drawPickups(ctx, t);
    drawSlashes(ctx);

    const sorted = state.survivors.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) {
      if (e.boss) H.drawBoss(ctx, e, t);
      else H.drawSurvivor(ctx, e, t);
    }

    drawHorde(ctx, t);
    drawProjectiles(ctx, t);
    drawParticles(ctx);
    drawSurges(ctx);
    drawTexts(ctx);
  }

  function drawBossBar(ctx) {
    const boss = state.boss;
    if (!boss || state.mode === 'attract' || state.mode === 'ended') return;
    const w = Math.min(450, H.W * (H.W <= 640 ? 0.68 : 0.46));
    const x = H.W / 2 - w / 2;
    const y = H.W <= 640 ? 78 : 107;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.font = `800 7px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,226,166,.65)';
    ctx.fillText('T H E   D A W N B R I N G E R', H.W / 2, y - 6);
    ctx.fillStyle = 'rgba(7,5,11,.8)';
    ctx.fillRect(x, y, w, 4);
    const pct = clamp(boss.hp / boss.maxHp, 0, 1);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#8f1734');
    grad.addColorStop(0.55, '#e0a84e');
    grad.addColorStop(1, '#ffe7ad');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 0.5, y + 0.5, (w - 1) * pct, 3);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = 'rgba(255,235,190,.5)';
    ctx.strokeRect(x, y, w, 4);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Title diorama
  // ---------------------------------------------------------------------------
  function drawCampfire(ctx, x, y, s, t) {
    // warm ground light
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 210 * s);
    glow.addColorStop(0, 'rgba(255,176,83,.35)');
    glow.addColorStop(0.3, 'rgba(230,105,50,.12)');
    glow.addColorStop(1, 'rgba(140,40,30,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, 210 * s, 0, TAU); ctx.fill();

    // stone ring
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU + 0.15;
      const rx = Math.cos(a) * 31 * s, ry = Math.sin(a) * 18 * s;
      ctx.fillStyle = i % 2 ? '#1d1820' : '#141018';
      ctx.beginPath(); ctx.ellipse(rx, ry, 6 * s, 4.5 * s, a, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,187,104,.08)'; ctx.stroke();
    }
    ctx.strokeStyle = '#2a1a1e'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16 * s, -8 * s); ctx.lineTo(16 * s, 9 * s); ctx.moveTo(16 * s, -8 * s); ctx.lineTo(-16 * s, 9 * s); ctx.stroke();
    ctx.restore();

    // flames
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const flick = Math.sin(t * 9.3) * 3 + Math.sin(t * 14.1) * 1.5;
    const layers = [
      [28, 66 + flick, 'rgba(255,93,45,.52)'],
      [19, 49 + flick * 0.7, 'rgba(255,169,74,.68)'],
      [10, 31 + flick * 0.4, 'rgba(255,236,178,.9)']
    ];
    for (const [ww, hh, col] of layers) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-ww * s, 4 * s);
      ctx.bezierCurveTo(-ww * 1.2 * s, -hh * 0.25 * s, -6 * s, -hh * 0.72 * s, -2 * s + flick, -hh * s);
      ctx.bezierCurveTo(8 * s, -hh * 0.62 * s, ww * 1.2 * s, -hh * 0.22 * s, ww * s, 4 * s);
      ctx.closePath();
      ctx.fill();
    }
    // embers
    for (let i = 0; i < 9; i++) {
      const seed = i * 17.17;
      const life = ((t * (0.18 + i * 0.013) + seed) % 1);
      const ex = Math.sin(seed + t * 1.5) * 24 * s * life;
      const ey = -life * 120 * s;
      ctx.globalAlpha = (1 - life) * 0.7;
      ctx.fillStyle = i % 3 ? '#ffca78' : '#ff7a49';
      ctx.beginPath(); ctx.arc(ex, ey, (1.2 + (i % 2)) * s * (1 - life * 0.5), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawAttract(ctx, t) {
    const compact = H.W <= 760;
    const fx = compact ? H.W * 0.7 : H.W * 0.72;
    const fy = compact ? H.H * 0.32 : H.H * 0.54;
    const s = clamp(Math.min(H.W, H.H) / 720, 0.72, 1.25);

    // The Dawnfire's halo behind the scene
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(fx, fy - 18, 0, fx, fy - 18, 270 * s);
    halo.addColorStop(0, 'rgba(255,206,128,.22)');
    halo.addColorStop(0.32, 'rgba(216,128,72,.08)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(fx, fy - 18, 270 * s, 0, TAU); ctx.fill();

    // faint sun/moon disc
    ctx.globalAlpha = 0.42;
    const disc = ctx.createRadialGradient(fx + 150 * s, fy - 205 * s, 0, fx + 150 * s, fy - 205 * s, 88 * s);
    disc.addColorStop(0, 'rgba(255,243,214,.9)');
    disc.addColorStop(0.7, 'rgba(243,192,120,.5)');
    disc.addColorStop(1, 'rgba(216,132,88,0)');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(fx + 150 * s, fy - 205 * s, 88 * s, 0, TAU); ctx.fill();
    ctx.restore();

    const bats = [];
    for (const b of H.attract.bats) {
      const a = b.a + t * b.spd;
      const r = b.r * s * (0.92 + Math.sin(t * 0.8 + b.ph) * 0.08);
      bats.push({
        x: fx + Math.cos(a) * r,
        y: fy + Math.sin(a) * r * 0.55 + b.lift * s,
        vx: -Math.sin(a) * 50, vy: Math.cos(a) * 20,
        phase: b.ph, size: b.s * s, lunge: 0, wing: 1, ring: 1
      });
    }
    const back = bats.filter((b) => b.y < fy);
    const front = bats.filter((b) => b.y >= fy);

    back.forEach((b) => H.drawBat(ctx, b, t, 0.92));
    drawCampfire(ctx, fx, fy + 22 * s, s, t);

    // Defenders around the pyre
    for (const d of H.attract.survivors) {
      const e = {
        x: fx + Math.cos(d.a) * d.r * s,
        y: fy + Math.sin(d.a) * d.r * 0.7 * s,
        angle: d.angle + Math.sin(t * 0.35 + d.a) * 0.08,
        kind: d.kind,
        radius: H.TYPES[d.kind].radius * s,
        intro: 0, seed: d.a * 9, flash: 0,
        state: 'idle', timer: 0,
        hp: 1, maxHp: 1
      };
      H.drawSurvivor(ctx, e, t);
    }

    front.forEach((b) => H.drawBat(ctx, b, t, 1));

    // Foreground swoop silhouettes
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 2; i++) {
      const a = t * 0.45 + i * Math.PI;
      const x = fx + Math.cos(a) * 290 * s;
      const y = fy + Math.sin(a * 0.7) * 120 * s + 190 * s;
      H.drawBat(ctx, { x, y, vx: 100, phase: i * 2, size: 1.6 * s, lunge: 0, wing: 1, ring: 1 }, t, 0.8);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------
  H.render = () => {
    const ctx = H.ctx;
    const w = H.W, h = H.H;
    ctx.setTransform(H.DPR, 0, 0, H.DPR, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const mode = state.mode;
    const t = mode === 'attract' ? H.attract.t : state.t;

    ctx.save();
    let sx = 0, sy = 0;
    if (mode !== 'attract') {
      const intensity = state.shake || 0;
      sx = (Math.random() - 0.5) * intensity;
      sy = (Math.random() - 0.5) * intensity;
      const cam = H.camera;
      const z = cam.initialized ? cam.zoom : 1;
      const vizW = w / z, vizH = h / z;
      const srcX = clamp(cam.x - vizW / 2, 0, H.WW - vizW) * H.DPR;
      const srcY = clamp(cam.y - vizH / 2, 0, H.WH - vizH) * H.DPR;
      ctx.drawImage(H.backgroundCanvas, srcX, srcY, vizW * H.DPR, vizH * H.DPR, sx, sy, w, h);
      ctx.translate(w / 2 + sx, h / 2 + sy);
      ctx.scale(z, z);
      ctx.translate(-cam.x, -cam.y);
      drawWorldScene(ctx, t);
    } else {
      ctx.translate(sx, sy);
      ctx.drawImage(H.titleBackgroundCanvas, 0, 0, w, h);
      drawAttract(ctx, t);
    }

    ctx.restore();

    drawFog(ctx, t);
    drawAmbient(ctx, t);

    // Damage and event washes
    if (mode !== 'attract' && mode !== 'ended') {
      if (state.hitFlash > 0) {
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, 'rgba(120,0,24,0)');
        g.addColorStop(0.7, `rgba(145,4,32,${state.hitFlash * 0.2})`);
        g.addColorStop(1, `rgba(190,8,40,${state.hitFlash * 0.42})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255,224,184,${state.flash * 0.14})`;
        ctx.fillRect(0, 0, w, h);
      }
      drawBossBar(ctx);
    }

    // Dawn creeping into the edges in the final minute
    if (mode !== 'attract' && mode !== 'ended' && state.bossSpawned && !state.bossDefeated) {
      const pulse = 0.04 + Math.sin(t * 1.3) * 0.012;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(255,210,150,0)');
      g.addColorStop(1, `rgba(255,202,132,${pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  };
})();
