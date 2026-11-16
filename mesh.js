// Real-Time 2D Triangle Mesh Deformation, Expression Morphing & Spring Physics
class DeformableCharacterMesh {
  constructor(baseImg, cols = 15, rows = 22) {
    this.w = baseImg.naturalWidth || baseImg.width || 525;
    this.h = baseImg.naturalHeight || baseImg.height || 790;
    this.cols = cols;
    this.rows = rows;
    this.cellW = this.w / cols;
    this.cellH = this.h / rows;

    // Extract alpha map for hit-testing & skipping empty air cells
    const tmp = document.createElement('canvas');
    tmp.width = this.w;
    tmp.height = this.h;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(baseImg, 0, 0, this.w, this.h);
    this.alphaData = tctx.getImageData(0, 0, this.w, this.h).data;

    // Precompute active cells (skip 100% transparent cells for ultra-fast rendering)
    this.activeCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this._cellHasPixels(c, r)) {
          this.activeCells.push({ c, r });
        }
      }
    }

    // Build vertex grid (cols+1) x (rows+1)
    this.verts = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const u = c * this.cellW;
        const v = r * this.cellH;
        // Pin bottom edge so character stays grounded in frame
        const pin = v >= this.h - 25 ? 1 : Math.max(0, (v - 620) / (this.h - 620));
        this.verts.push({
          u,
          v,
          x: u,
          y: v,
          ox: 0, // local impact spring offset
          oy: 0,
          vx: 0,
          vy: 0,
          mobility: 1 - pin
        });
      }
    }

    // Global head/torso spring rig
    this.headAngle = 0;
    this.headAngVel = 0;
    this.headShiftX = 0;
    this.headShiftY = 0;
    this.headVelX = 0;
    this.headVelY = 0;
    this.torsoShiftX = 0;
    this.torsoVelX = 0;

    this.wince = 0; // 0..1 active pain wince on hit
    this.winceDir = 1;
    this.time = 0;
  }

  _cellHasPixels(col, row) {
    const x0 = Math.max(0, Math.floor(col * this.cellW) - 1);
    const y0 = Math.max(0, Math.floor(row * this.cellH) - 1);
    const x1 = Math.min(this.w - 1, Math.ceil((col + 1) * this.cellW) + 1);
    const y1 = Math.min(this.h - 1, Math.ceil((row + 1) * this.cellH) + 1);
    for (let y = y0; y <= y1; y += 3) {
      for (let x = x0; x <= x1; x += 3) {
        if (this.alphaData[(y * this.w + x) * 4 + 3] > 6) return true;
      }
    }
    return false;
  }

  isOpaqueAt(tx, ty, tolerancePx = 12) {
    const ix = Math.round(tx);
    const iy = Math.round(ty);
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return false;
    if (this.alphaData[(iy * this.w + ix) * 4 + 3] > 25) return true;
    // Small forgiveness halo around hair/ears/sleeves for snappy feel
    for (let dy = -tolerancePx; dy <= tolerancePx; dy += 6) {
      for (let dx = -tolerancePx; dx <= tolerancePx; dx += 6) {
        const nx = ix + dx;
        const ny = iy + dy;
        if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h) {
          if (this.alphaData[(ny * this.w + nx) * 4 + 3] > 35) return true;
        }
      }
    }
    return false;
  }

  reset() {
    this.headAngle = 0;
    this.headAngVel = 0;
    this.headShiftX = 0;
    this.headShiftY = 0;
    this.headVelX = 0;
    this.headVelY = 0;
    this.torsoShiftX = 0;
    this.torsoVelX = 0;
    this.wince = 0;
    for (const vt of this.verts) {
      vt.ox = 0;
      vt.oy = 0;
      vt.vx = 0;
      vt.vy = 0;
    }
  }

  // Apply directional physical blow at texture coords (tx, ty)
  applyImpulse(tx, ty, dirX, dirY, force = 1.0, radius = 95) {
    const onHead = ty < 305;
    this.wince = Math.min(1.35, 0.85 + force * 0.35);
    this.winceDir = dirX >= 0 ? 1 : -1;

    if (onHead) {
      // Whip head & neck around pivot (240, 290)
      this.headVelX += dirX * 420 * force;
      this.headVelY += dirY * 260 * force;
      // Torque based on side of face hit + horizontal blow direction
      const leverY = (285 - ty) / 140;
      this.headAngVel += (dirX * 3.8 * leverY + (tx - 238) * 0.012 * dirY) * force;
      this.torsoVelX += dirX * 110 * force;
    } else {
      // Body / chest blow
      this.torsoVelX += dirX * 290 * force;
      this.headVelX += dirX * 160 * force;
      this.headVelY += 120 * force;
      this.headAngVel += -dirX * 1.6 * force;
    }

    // Local flesh dent & ripple wave around exact hit point!
    for (const vt of this.verts) {
      if (vt.mobility <= 0.01) continue;
      const dx = vt.u - tx;
      const dy = vt.v - ty;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const falloff = Math.pow(1 - dist / radius, 1.6) * vt.mobility;
        const radX = dist > 1 ? dx / dist : 0;
        const radY = dist > 1 ? dy / dist : 0;
        // Push in blow direction + slight outward squashwave
        vt.vx += (dirX * 340 + radX * 135) * force * falloff;
        vt.vy += (dirY * 290 + radY * 135) * force * falloff;
      }
    }
  }

  update(dt, damagePct) {
    const clampedDt = Math.min(0.033, dt);
    this.time += clampedDt;

    // Decay impact wince
    this.wince = Math.max(0, this.wince - clampedDt * 3.6);

    // Target resting pose shifts groggily when heavily damaged / K.O.
    const dmg01 = Math.min(1, damagePct / 100);
    const groggySway = dmg01 > 0.5 ? Math.sin(this.time * 4.2) * (dmg01 - 0.5) * 0.09 : 0;
    const koTilt = damagePct >= 98 ? 0.16 : dmg01 * 0.04;
    const koDropY = damagePct >= 98 ? 15 : dmg01 * 4;

    const targetAngle = koTilt + groggySway;
    const targetHeadX = groggySway * 95 + (damagePct >= 98 ? 12 : 0);
    const targetHeadY = koDropY + Math.sin(this.time * 2.4) * (1.8 + dmg01 * 2.5);

    // Underdamped spring physics for juicy cartoon wobble!
    const kHead = 165;
    const dHead = 11.5;
    this.headAngVel += ((targetAngle - this.headAngle) * kHead - this.headAngVel * dHead) * clampedDt;
    this.headAngle += this.headAngVel * clampedDt;

    this.headVelX += ((targetHeadX - this.headShiftX) * kHead - this.headVelX * dHead) * clampedDt;
    this.headShiftX += this.headVelX * clampedDt;

    this.headVelY += ((targetHeadY - this.headShiftY) * kHead - this.headVelY * dHead) * clampedDt;
    this.headShiftY += this.headVelY * clampedDt;

    this.torsoVelX += ((0 - this.torsoShiftX) * 140 - this.torsoVelX * 12) * clampedDt;
    this.torsoShiftX += this.torsoVelX * clampedDt;

    // Update each vertex: local spring + progressive facial expression morph + rig transform
    const pivotX = 240;
    const pivotY = 295;
    const cosA = Math.cos(this.headAngle);
    const sinA = Math.sin(this.headAngle);
    const breath = Math.sin(this.time * 2.6);

    for (const vt of this.verts) {
      // Local impact spring
      vt.vx += (-vt.ox * 210 - vt.vx * 13.5) * clampedDt;
      vt.vy += (-vt.oy * 210 - vt.vy * 13.5) * clampedDt;
      vt.ox += vt.vx * clampedDt;
      vt.oy += vt.vy * clampedDt;

      let px = vt.u + vt.ox;
      let py = vt.v + vt.oy;

      // --- PROGRESSIVE FACIAL MORPHING (Turns smug CEO grin into battered, swollen grimace!) ---
      if (vt.v > 75 && vt.v < 285 && vt.u > 140 && vt.u < 335) {
        // 1. Mouth corners (202, 217) & (275, 214) pull DOWN as damage rises!
        const dLeftMouth = Math.hypot(vt.u - 202, vt.v - 216);
        if (dLeftMouth < 32) {
          const w = (1 - dLeftMouth / 32) * dmg01;
          py += 11.5 * w;
          px -= 2.5 * w;
        }
        const dRightMouth = Math.hypot(vt.u - 275, vt.v - 214);
        if (dRightMouth < 32) {
          const w = (1 - dRightMouth / 32) * dmg01;
          py += 12.5 * w;
          px += 1.5 * w;
        }
        // Center upper lip lifts slightly to invert smile arc into a painful grimace
        const dMidMouth = Math.hypot(vt.u - 238, vt.v - 216);
        if (dMidMouth < 26) {
          const w = (1 - dMidMouth / 26) * dmg01;
          py -= 3.5 * w;
          px -= 3.0 * w; // crooked jaw
        }

        // 2. Swollen eyelids droop shut progressively + squeeze shut during active hit wince!
        const eyeDroop = dmg01 * 5.2 + this.wince * 6.5;
        const dLeftUpperLid = Math.hypot(vt.u - 198, vt.v - 142);
        if (dLeftUpperLid < 24) {
          py += (1 - dLeftUpperLid / 24) * eyeDroop;
        }
        const dRightUpperLid = Math.hypot(vt.u - 270, vt.v - 140);
        if (dRightUpperLid < 24) {
          py += (1 - dRightUpperLid / 24) * (eyeDroop * (dmg01 > 0.4 ? 1 : 0.65));
        }

        // Active hit shock: mouth stretches open & sideways during wince!
        if (this.wince > 0.02) {
          const dJaw = Math.hypot(vt.u - 238, vt.v - 236);
          if (dJaw < 42) {
            const jw = (1 - dJaw / 42) * this.wince;
            py += 9.5 * jw;
            px += this.winceDir * 6.5 * jw;
          }
        }

        // 3. Swollen left cheek puffing outward (40%+ damage)
        if (dmg01 > 0.35) {
          const swell = (dmg01 - 0.35) / 0.65;
          const dCheek = Math.hypot(vt.u - 176, vt.v - 186);
          if (dCheek < 42) {
            const cw = 1 - dCheek / 42;
            px -= 7.5 * swell * cw;
            py += 2.5 * swell * cw;
          }
        }

        // 4. Crooked broken nose bridge/tip (52%+ damage)
        if (dmg01 > 0.52) {
          const nBreak = (dmg01 - 0.52) / 0.48;
          const dNose = Math.hypot(vt.u - 238, vt.v - 180);
          if (dNose < 26) {
            px += 6.2 * nBreak * (1 - dNose / 26);
          }
        }
      }

      // --- HEAD & TORSO ARTICULATED RIG ---
      // Smooth head weight: 1.0 above neck (y<=255), tapering to 0 at chest (y>=370)
      const headWeight = vt.v <= 255 ? 1.0 : vt.v >= 370 ? 0.0 : 1.0 - (vt.v - 255) / 115;
      const torsoWeight = vt.v <= 270 ? 0.35 : vt.v >= 660 ? 0.0 : (1.0 - (vt.v - 270) / 390) * vt.mobility;

      if (headWeight > 0) {
        const rx = px - pivotX;
        const ry = py - pivotY;
        const rotX = pivotX + rx * cosA - ry * sinA + this.headShiftX;
        const rotY = pivotY + rx * sinA + ry * cosA + this.headShiftY;
        px = px * (1 - headWeight) + rotX * headWeight;
        py = py * (1 - headWeight) + rotY * headWeight;
      }

      if (torsoWeight > 0) {
        px += this.torsoShiftX * torsoWeight;
        // Subtle breathing chest expansion
        py += breath * 2.2 * torsoWeight;
      }

      vt.x = px;
      vt.y = py;
    }
  }

  // Render deformed triangle mesh onto target 2D canvas at (destX, destY, scale)
  render(ctx, textureCanvas, destX, destY, scale = 1.0) {
    ctx.save();
    ctx.translate(destX, destY);
    ctx.scale(scale, scale);

    const stride = this.cols + 1;
    const invW = 1 / this.cellW;
    const invH = 1 / this.cellH;

    for (let i = 0; i < this.activeCells.length; i++) {
      const { c, r } = this.activeCells[i];
      const idx00 = r * stride + c;
      const v00 = this.verts[idx00];
      const v10 = this.verts[idx00 + 1];
      const v01 = this.verts[idx00 + stride];
      const v11 = this.verts[idx00 + stride + 1];

      // Triangle 1: (v00, v10, v01)
      this._drawTriUpperLeft(ctx, textureCanvas, v00, v10, v01, invW, invH);
      // Triangle 2: (v11, v01, v10)
      this._drawTriLowerRight(ctx, textureCanvas, v11, v01, v10, invW, invH);
    }

    ctx.restore();
  }

  _drawTriUpperLeft(ctx, tex, v0, v1, v2, invW, invH) {
    // Expand clip triangle slightly (0.65px) from centroid to prevent 2D anti-aliasing seams
    const cx = (v0.x + v1.x + v2.x) * 0.333333;
    const cy = (v0.y + v1.y + v2.y) * 0.333333;

    ctx.save();
    ctx.beginPath();
    this._moveOut(ctx, v0.x, v0.y, cx, cy, true);
    this._moveOut(ctx, v1.x, v1.y, cx, cy, false);
    this._moveOut(ctx, v2.x, v2.y, cx, cy, false);
    ctx.closePath();
    ctx.clip();

    const a = (v1.x - v0.x) * invW;
    const b = (v1.y - v0.y) * invW;
    const c = (v2.x - v0.x) * invH;
    const d = (v2.y - v0.y) * invH;
    const e = v0.x - a * v0.u - c * v0.v;
    const f = v0.y - b * v0.u - d * v0.v;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(tex, 0, 0);
    ctx.restore();
  }

  _drawTriLowerRight(ctx, tex, vc, vLeft, vTop, invW, invH) {
    const cx = (vc.x + vLeft.x + vTop.x) * 0.333333;
    const cy = (vc.y + vLeft.y + vTop.y) * 0.333333;

    ctx.save();
    ctx.beginPath();
    this._moveOut(ctx, vc.x, vc.y, cx, cy, true);
    this._moveOut(ctx, vLeft.x, vLeft.y, cx, cy, false);
    this._moveOut(ctx, vTop.x, vTop.y, cx, cy, false);
    ctx.closePath();
    ctx.clip();

    const a = (vc.x - vLeft.x) * invW;
    const b = (vc.y - vLeft.y) * invW;
    const c = (vc.x - vTop.x) * invH;
    const d = (vc.y - vTop.y) * invH;
    const e = vc.x - a * vc.u - c * vc.v;
    const f = vc.y - b * vc.u - d * vc.v;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(tex, 0, 0);
    ctx.restore();
  }

  _moveOut(ctx, vx, vy, cx, cy, isFirst) {
    const dx = vx - cx;
    const dy = vy - cy;
    const len = Math.hypot(dx, dy) || 1;
    const px = vx + (dx / len) * 0.68;
    const py = vy + (dy / len) * 0.68;
    if (isFirst) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

window.DeformableCharacterMesh = DeformableCharacterMesh;
