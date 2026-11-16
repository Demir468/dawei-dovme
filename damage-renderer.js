// Anatomical Progressive Injury & Localized Wound Compositor (525 x 790 Character Space)
class DamageRenderer {
  constructor(baseImg) {
    this.baseImg = baseImg;
    this.w = baseImg.naturalWidth || baseImg.width || 525;
    this.h = baseImg.naturalHeight || baseImg.height || 790;

    // Persistent player-inflicted hit marks (bruises, slap prints, boot treads, tomato splats)
    this.woundMultiplyCanvas = document.createElement('canvas');
    this.woundMultiplyCanvas.width = this.w;
    this.woundMultiplyCanvas.height = this.h;
    this.wMulCtx = this.woundMultiplyCanvas.getContext('2d');

    this.woundOverCanvas = document.createElement('canvas');
    this.woundOverCanvas.width = this.w;
    this.woundOverCanvas.height = this.h;
    this.wOverCtx = this.woundOverCanvas.getContext('2d');

    // Final composited texture fed into the 2D Deformable Mesh
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = this.w;
    this.compositeCanvas.height = this.h;
    this.compCtx = this.compositeCanvas.getContext('2d');

    // Scratch buffer for blend operations
    this.fxCanvas = document.createElement('canvas');
    this.fxCanvas.width = this.w;
    this.fxCanvas.height = this.h;
    this.fxCtx = this.fxCanvas.getContext('2d');

    this.teethKnocked = [false, false];
    this.hitCount = 0;
    this.lastDamagePct = -1;
    this.dirty = true;

    this.rebuild(0);
  }

  reset() {
    this.wMulCtx.clearRect(0, 0, this.w, this.h);
    this.wOverCtx.clearRect(0, 0, this.w, this.h);
    this.teethKnocked = [false, false];
    this.hitCount = 0;
    this.dirty = true;
    this.rebuild(0);
  }

  isOnFace(tx, ty) {
    // Elliptical check for head/face/neck skin area
    const dx = (tx - 236) / 82;
    const dy = (ty - 168) / 110;
    return dx * dx + dy * dy <= 1.15;
  }

  // Stamp localized hit wound at texture coords (tx, ty)
  addWound(weapon, tx, ty, damagePct) {
    this.hitCount++;
    const onFace = this.isOnFace(tx, ty);

    if (weapon === 'slap') {
      this._stampSlapPrint(tx, ty, onFace);
    } else if (weapon === 'punch') {
      this._stampBruise(tx, ty, onFace ? 34 : 42, 0.55);
      if (onFace && (damagePct > 28 || Math.random() < 0.45)) {
        this._stampCut(tx + (Math.random() - 0.5) * 14, ty + (Math.random() - 0.5) * 10, 16 + Math.random() * 12);
      }
      // Direct mouth punch can knock out a tooth early!
      if (Math.hypot(tx - 238, ty - 216) < 42) {
        if (!this.teethKnocked[0]) {
          this.teethKnocked[0] = true;
          this.dirty = true;
          return { knockedTooth: true };
        } else if (damagePct > 40 && !this.teethKnocked[1]) {
          this.teethKnocked[1] = true;
          this.dirty = true;
          return { knockedTooth: true };
        }
      }
    } else if (weapon === 'kick') {
      this._stampBruise(tx, ty, onFace ? 44 : 56, 0.68);
      this._stampBootPrint(tx, ty);
      if (onFace) {
        this._stampBloodSplatter(tx, ty, 18);
        if (!this.teethKnocked[0] && damagePct > 20) {
          this.teethKnocked[0] = true;
          this.dirty = true;
          return { knockedTooth: true };
        }
      } else {
        // Blood drops from face onto shirt on heavy kicks
        if (damagePct > 35) {
          this._stampBloodSplatter(tx + (Math.random() - 0.5) * 30, ty, 10);
        }
      }
    } else if (weapon === 'slipper') {
      this._stampSlipperWelt(tx, ty, onFace);
      if (onFace && damagePct > 30) {
        this._stampCut(tx, ty, 14);
      }
    } else if (weapon === 'tomato') {
      this._stampTomatoSplat(tx, ty);
    }

    // Unlock teeth progressively by total damage as well
    let knockedTooth = false;
    if (damagePct >= 36 && !this.teethKnocked[0]) {
      this.teethKnocked[0] = true;
      knockedTooth = true;
    }
    if (damagePct >= 68 && !this.teethKnocked[1]) {
      this.teethKnocked[1] = true;
      knockedTooth = true;
    }

    this.dirty = true;
    return { knockedTooth };
  }

  _stampSlapPrint(tx, ty, onFace) {
    const ctx = onFace ? this.wMulCtx : this.wOverCtx;
    ctx.save();
    ctx.translate(tx, ty);
    const fromLeft = tx < 238;
    ctx.rotate((fromLeft ? -0.35 : 0.35) + (Math.random() - 0.5) * 0.3);
    ctx.scale(fromLeft ? 1 : -1, 1);

    // Angry red flushed glow around palm
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 38);
    glow.addColorStop(0, onFace ? 'rgba(205, 45, 55, 0.42)' : 'rgba(210, 50, 50, 0.22)');
    glow.addColorStop(0.65, onFace ? 'rgba(225, 75, 75, 0.22)' : 'rgba(210, 60, 60, 0.08)');
    glow.addColorStop(1, 'rgba(225, 80, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();

    // Palm + 5 fingers silhouette
    ctx.fillStyle = onFace ? 'rgba(188, 28, 42, 0.36)' : 'rgba(185, 35, 45, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    const fingers = [
      { x: -13, y: -2, rx: 3.2, ry: 10, rot: -0.65 }, // thumb
      { x: -7, y: -15, rx: 2.8, ry: 13, rot: -0.22 },
      { x: -1, y: -18, rx: 2.9, ry: 15, rot: -0.04 },
      { x: 5, y: -16, rx: 2.8, ry: 14, rot: 0.14 },
      { x: 11, y: -11, rx: 2.5, ry: 11, rot: 0.32 }
    ];
    fingers.forEach((f) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, f.rx, f.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  _stampBruise(tx, ty, radius, alpha) {
    const ctx = this.wMulCtx;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.scale(1.15, 0.88);

    const g = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
    g.addColorStop(0, `rgba(58, 12, 74, ${alpha * 0.72})`);
    g.addColorStop(0.38, `rgba(92, 22, 88, ${alpha * 0.55})`);
    g.addColorStop(0.7, `rgba(145, 42, 58, ${alpha * 0.32})`);
    g.addColorStop(0.9, `rgba(168, 115, 38, ${alpha * 0.14})`);
    g.addColorStop(1, 'rgba(168, 115, 38, 0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _stampCut(tx, ty, len) {
    const ctx = this.wOverCtx;
    ctx.save();
    ctx.translate(tx, ty);
    const angle = (Math.random() - 0.5) * 0.9;
    ctx.rotate(angle);

    // Red inflamed halo
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, len * 0.8);
    g.addColorStop(0, 'rgba(175, 18, 28, 0.45)');
    g.addColorStop(1, 'rgba(175, 18, 28, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, len * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Sharp crimson gash
    ctx.strokeStyle = '#5c050c';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, 0);
    ctx.quadraticCurveTo(0, -2.2, len * 0.5, 0.8);
    ctx.stroke();

    ctx.strokeStyle = '#d41322';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-len * 0.4, 0.4);
    ctx.quadraticCurveTo(0, -1.2, len * 0.4, 1.0);
    ctx.stroke();
    ctx.restore();

    // Vertical blood drip in world-down direction
    const dripLen = 10 + Math.random() * 24;
    const dGrad = ctx.createLinearGradient(tx, ty, tx, ty + dripLen);
    dGrad.addColorStop(0, 'rgba(180, 8, 18, 0.92)');
    dGrad.addColorStop(0.8, 'rgba(135, 5, 12, 0.82)');
    dGrad.addColorStop(1, 'rgba(110, 4, 10, 0.95)');
    ctx.strokeStyle = dGrad;
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx - 1.5, ty + dripLen * 0.4, tx + 1.8, ty + dripLen * 0.7, tx + 0.5, ty + dripLen);
    ctx.stroke();

    ctx.fillStyle = 'rgba(155, 8, 16, 0.92)';
    ctx.beginPath();
    ctx.arc(tx + 0.5, ty + dripLen, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _stampBloodSplatter(tx, ty, count = 12) {
    const ctx = this.wOverCtx;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.7) * 34;
      const bx = tx + Math.cos(ang) * dist;
      const by = ty + Math.sin(ang) * dist;
      const r = 1.1 + Math.random() * 3.4;
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(168, 10, 20, 0.85)' : 'rgba(105, 6, 12, 0.88)';
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * (0.8 + Math.random() * 0.6), ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _stampBootPrint(tx, ty) {
    const ctx = this.wOverCtx;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-0.35 + (Math.random() - 0.5) * 0.5);

    ctx.fillStyle = 'rgba(38, 32, 30, 0.42)';
    // Boot sole bars (tread pattern)
    for (let y = -26; y <= 8; y += 6.5) {
      const halfW = 14 - Math.abs(y + 9) * 0.22;
      ctx.fillRect(-halfW, y, halfW * 2, 3.6);
    }
    // Boot heel
    ctx.beginPath();
    ctx.roundRect(-11, 15, 22, 16, 5);
    ctx.fill();
    ctx.restore();
  }

  _stampSlipperWelt(tx, ty, onFace) {
    const ctx = onFace ? this.wMulCtx : this.wOverCtx;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-0.5 + (Math.random() - 0.5) * 0.8);

    // Oval red slipper mark
    const g = ctx.createRadialGradient(0, 0, 5, 0, 0, 34);
    g.addColorStop(0, onFace ? 'rgba(205, 25, 45, 0.5)' : 'rgba(190, 35, 45, 0.28)');
    g.addColorStop(0.75, onFace ? 'rgba(220, 60, 75, 0.26)' : 'rgba(190, 45, 55, 0.12)');
    g.addColorStop(1, 'rgba(220, 60, 75, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Waffle criss-cross sole texture
    ctx.strokeStyle = onFace ? 'rgba(155, 15, 30, 0.28)' : 'rgba(145, 20, 35, 0.22)';
    ctx.lineWidth = 1.2;
    for (let i = -14; i <= 14; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, -22);
      ctx.lineTo(i + 6, 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + 6, -22);
      ctx.lineTo(i, 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  _stampTomatoSplat(tx, ty) {
    const ctx = this.wOverCtx;
    ctx.save();
    ctx.translate(tx, ty);

    // Irregular juicy tomato pulp blob
    const lobes = 9;
    ctx.fillStyle = 'rgba(218, 28, 18, 0.86)';
    ctx.beginPath();
    for (let i = 0; i <= lobes * 2; i++) {
      const a = (i / (lobes * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? 18 + Math.random() * 14 : 10 + Math.random() * 7;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.quadraticCurveTo(px * 1.08, py * 1.08, px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Glossy inner pulp highlight
    ctx.fillStyle = 'rgba(248, 72, 42, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-3, -2, 11, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Tiny yellow tomato seeds
    ctx.fillStyle = 'rgba(252, 218, 95, 0.92)';
    for (let s = 0; s < 6; s++) {
      const sa = Math.random() * Math.PI * 2;
      const sd = 4 + Math.random() * 12;
      ctx.save();
      ctx.translate(Math.cos(sa) * sd, Math.sin(sa) * sd);
      ctx.rotate(sa);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.3, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Tomato juice drip
    const dripH = 18 + Math.random() * 32;
    ctx.strokeStyle = 'rgba(215, 32, 18, 0.78)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx + 3, ty + 8);
    ctx.lineTo(tx + 2, ty + 8 + dripH);
    ctx.stroke();
  }

  // Rebuild full composited character texture for current damagePct (0..100)
  rebuild(damagePct) {
    const rounded = Math.round(damagePct);
    if (!this.dirty && rounded === this.lastDamagePct) return;
    this.lastDamagePct = rounded;
    this.dirty = false;

    const c = this.compCtx;
    const fx = this.fxCtx;
    const w = this.w;
    const h = this.h;

    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(this.baseImg, 0, 0, w, h);

    // 1. MULTIPLY LAYER (Bruises, Black Eyes, Skin Flushing)
    fx.clearRect(0, 0, w, h);
    fx.drawImage(this.woundMultiplyCanvas, 0, 0);

    // Progressive cheek & nose flush (10% -> 100%)
    if (damagePct > 8) {
      const flushA = Math.min(0.45, ((damagePct - 8) / 80) * 0.45);
      this._drawRadialTint(fx, 184, 182, 34, `rgba(215, 65, 75, ${flushA})`);
      this._drawRadialTint(fx, 282, 178, 34, `rgba(215, 65, 75, ${flushA})`);
      this._drawRadialTint(fx, 238, 182, 22, `rgba(195, 45, 58, ${flushA * 1.1})`);
    }

    // Progressive LEFT BLACK EYE / Sol Göz Morarması (18% -> 100%) at (198, 149)
    if (damagePct > 18) {
      const t = Math.min(1, (damagePct - 18) / 55);
      this._drawEyeShiner(fx, 198, 150, 32, 23, -0.1, t);
    }

    // Progressive RIGHT BLACK EYE / Sağ Göz Morarması (42% -> 100%) at (270, 147)
    if (damagePct > 42) {
      const t = Math.min(1, (damagePct - 42) / 50);
      this._drawEyeShiner(fx, 270, 148, 33, 24, 0.12, t);
    }

    // Nose bridge & jaw contusions (50% -> 100%)
    if (damagePct > 48) {
      const t = Math.min(1, (damagePct - 48) / 45);
      this._drawRadialTint(fx, 237, 160, 20, `rgba(88, 20, 82, ${t * 0.55})`);
      this._drawRadialTint(fx, 180, 212, 30, `rgba(78, 18, 86, ${t * 0.48})`);
    }

    c.save();
    c.globalCompositeOperation = 'multiply';
    c.drawImage(fx.canvas, 0, 0);
    c.restore();

    // 2. SOURCE-OVER ANATOMICAL INJURIES (Missing Teeth, Cuts, Nosebleed, Swollen Bags, Band-Aid)
    c.save();
    c.globalCompositeOperation = 'source-over';

    // Player's direct over-wounds (cuts, blood drops, boot treads, tomato splats)
    c.drawImage(this.woundOverCanvas, 0, 0);

    // Swollen dark eye-bag creases & bloodshot sclera tint
    if (damagePct > 25) {
      const tL = Math.min(1, (damagePct - 25) / 50);
      c.strokeStyle = `rgba(54, 8, 48, ${tL * 0.65})`;
      c.lineWidth = 2.2;
      c.beginPath();
      c.arc(198, 149, 17, 0.25, Math.PI - 0.25);
      c.stroke();
    }
    if (damagePct > 48) {
      const tR = Math.min(1, (damagePct - 48) / 45);
      c.strokeStyle = `rgba(54, 8, 48, ${tR * 0.65})`;
      c.lineWidth = 2.2;
      c.beginPath();
      c.arc(270, 147, 17, 0.25, Math.PI - 0.25);
      c.stroke();
    }

    // Missing Tooth #1 (x:229, y:213) & Missing Tooth #2 (x:248, y:213) inside open smile!
    if (this.teethKnocked[0] || damagePct >= 36) {
      c.fillStyle = '#1b070a';
      c.beginPath();
      c.roundRect(228, 213, 8.5, 7.2, 1.5);
      c.fill();
    }
    if (this.teethKnocked[1] || damagePct >= 68) {
      c.fillStyle = '#1b070a';
      c.beginPath();
      c.roundRect(247, 212.5, 8.5, 7.2, 1.5);
      c.fill();
    }

    // Blood-tinged teeth/gums at high damage
    if (damagePct > 45) {
      const bt = Math.min(0.65, ((damagePct - 45) / 50) * 0.65);
      c.fillStyle = `rgba(165, 10, 18, ${bt})`;
      c.fillRect(214, 212.5, 50, 3.0);
    }

    // Split lower lip (30%+)
    if (damagePct > 30) {
      const lt = Math.min(1, (damagePct - 30) / 40);
      c.fillStyle = `rgba(115, 6, 18, ${lt * 0.9})`;
      c.beginPath();
      c.ellipse(258, 225, 5.5, 3.2, 0.2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = `rgba(190, 12, 24, ${lt * 0.92})`;
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(258, 226);
      c.bezierCurveTo(260, 236, 257, 244, 259, 252 * lt + 226 * (1 - lt));
      c.stroke();
    }

    // Split right eyebrow + temple blood stream (44%+)
    if (damagePct > 44) {
      const et = Math.min(1, (damagePct - 44) / 40);
      c.strokeStyle = '#59040b';
      c.lineWidth = 3.0;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(271, 128);
      c.lineTo(285, 134);
      c.stroke();

      // Glossy blood running down right temple
      const streamEnd = 134 + et * 74;
      c.strokeStyle = 'rgba(172, 10, 20, 0.9)';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(283, 133);
      c.bezierCurveTo(293, 150, 290, 175, 288, streamEnd);
      c.stroke();

      c.fillStyle = 'rgba(145, 6, 15, 0.94)';
      c.beginPath();
      c.arc(288, streamEnd, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // Heavy Nosebleed (54%+) from nostrils (223, 190) and (253, 189)
    if (damagePct > 54) {
      const nt = Math.min(1, (damagePct - 54) / 38);
      // Left nostril stream
      const endL = 191 + nt * 24;
      c.strokeStyle = 'rgba(158, 8, 16, 0.94)';
      c.lineWidth = 3.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(224, 190);
      c.quadraticCurveTo(222, 202, 225, endL);
      c.stroke();

      // Right nostril stream overflowing past mouth onto chin!
      const endR = 190 + nt * 64;
      c.lineWidth = 3.6;
      c.beginPath();
      c.moveTo(251, 189);
      c.bezierCurveTo(249, 205, 253, 228, 248, endR);
      c.stroke();

      // Specular wet blood highlight
      c.strokeStyle = 'rgba(255, 95, 95, 0.45)';
      c.lineWidth = 1.0;
      c.beginPath();
      c.moveTo(250, 191);
      c.lineTo(250, Math.min(212, endR));
      c.stroke();
    }

    // Shirt collar blood splatters & Cracked miHoYo badge (62%+)
    if (damagePct > 62) {
      const st = Math.min(1, (damagePct - 62) / 35);
      const drops = [
        { x: 222, y: 318, r: 3.5 },
        { x: 256, y: 334, r: 4.2 },
        { x: 238, y: 365, r: 2.8 },
        { x: 274, y: 352, r: 3.1 },
        { x: 210, y: 348, r: 2.4 }
      ];
      drops.forEach((d) => {
        c.fillStyle = `rgba(162, 12, 22, ${st * 0.82})`;
        c.beginPath();
        c.ellipse(d.x, d.y, d.r, d.r * 1.3, 0.1, 0, Math.PI * 2);
        c.fill();
      });

      // Crack line across miHoYo badge (321, 427)
      c.strokeStyle = `rgba(255, 255, 255, ${st * 0.85})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(316, 419);
      c.lineTo(322, 427);
      c.lineTo(319, 431);
      c.lineTo(326, 436);
      c.stroke();
    }

    // Left cheek gash + Crooked blood-soaked Band-Aid on forehead (74%+)
    if (damagePct > 74) {
      const bt = Math.min(1, (damagePct - 74) / 22);
      // Cheekbone cut
      c.strokeStyle = `rgba(140, 8, 18, ${bt * 0.92})`;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(169, 171);
      c.lineTo(189, 178);
      c.stroke();

      c.strokeStyle = `rgba(175, 10, 20, ${bt * 0.88})`;
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(179, 175);
      c.lineTo(177, 212);
      c.stroke();

      // Classic Flash crooked X / Band-Aid ("yara bandı") on forehead (205, 106)
      c.save();
      c.globalAlpha = bt;
      c.translate(204, 107);
      c.rotate(-0.28);
      c.fillStyle = '#e5be96';
      c.strokeStyle = '#7a5230';
      c.lineWidth = 1.3;
      c.beginPath();
      c.roundRect(-18, -6, 36, 12, 5);
      c.fill();
      c.stroke();

      c.fillStyle = '#f5dec4';
      c.fillRect(-6, -5, 12, 10);
      // Red blood seeping through gauze pad
      c.fillStyle = 'rgba(185, 18, 28, 0.78)';
      c.beginPath();
      c.arc(1, 0, 3.6, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    c.restore();

    // 3. STRICT SILHOUETTE MASKING (Ensure zero marks ever float outside Da Wei's cutout!)
    c.save();
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(this.baseImg, 0, 0, w, h);
    c.restore();
  }

  _drawRadialTint(ctx, cx, cy, r, color) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawEyeShiner(ctx, cx, cy, rx, ry, rot, intensity) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(1, ry / rx);

    const g = ctx.createRadialGradient(0, 2, rx * 0.12, 0, 2, rx);
    g.addColorStop(0, `rgba(42, 6, 56, ${intensity * 0.78})`);
    g.addColorStop(0.45, `rgba(78, 16, 86, ${intensity * 0.65})`);
    g.addColorStop(0.75, `rgba(138, 36, 62, ${intensity * 0.38})`);
    g.addColorStop(0.92, `rgba(165, 110, 35, ${intensity * 0.18})`);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 2, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

window.DamageRenderer = DamageRenderer;
