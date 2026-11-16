// Dawei'yi Dövme - Classic 2000s Turkish Flash Style Stress-Relief Browser Game (PC & Mobile Ready)
(() => {
  const WEAPONS = [
    {
      id: 'punch',
      name: 'Yumruk',
      key: '1',
      damage: 7.5,
      force: 1.05,
      shake: 11,
      words: ['GÜM!', 'KÜT!', 'ÇAT!', 'Boks!']
    },
    {
      id: 'slap',
      name: 'Tokat',
      key: '2',
      damage: 5.5,
      force: 0.95,
      shake: 7,
      words: ['ŞRAAK!', 'ŞAMAR!', 'ÇAT!', 'ŞLAK!']
    },
    {
      id: 'kick',
      name: 'Tekme',
      key: '3',
      damage: 11.5,
      force: 1.45,
      shake: 18,
      words: ['BAAAM!', 'GÜÜM!', 'PAT!', 'TEKME!']
    },
    {
      id: 'tomato',
      name: 'Domates',
      key: '4',
      damage: 3.5,
      force: 0.65,
      shake: 5,
      words: ['ŞPLÖRT!', 'Vıcık!', 'PÖRT!', 'ÇÜRÜK!']
    },
    {
      id: 'slipper',
      name: 'Anne Terliği',
      key: '5',
      damage: 9.5,
      force: 1.25,
      shake: 14,
      words: ['ŞLAAAK!', 'KRİTİK!', 'TERLİK!', 'ZINK!']
    }
  ];

  const QUOTES_LIGHT = [
    'Hehe, yıldönümü ödülü 3 tavuk!',
    '50/50 mi kaybettin? Şanssızlık canım!',
    'Dur, gömleğim kırışacak!',
    'Oranlar %0.6 gayet cömert bence!',
    'Hop! El şakası yapmayalım!'
  ];

  const QUOTES_MID = [
    'Ah gözüm! Şaka yaptım vurma!',
    'Burnum yamuldu! Sunucu parası lazım abi!',
    'Tamam 100 Primogem kod veriyorum dur!',
    'Dişim mi kırıldı?! Dişçi kaç para biliyor musun!',
    'Yüzüme vurma yayına çıkacağım!'
  ];

  const QUOTES_HEAVY = [
    'YETER! Söz bir dahaki banner Qiqi çıkmayacak!',
    'Anne terliği nereden çıktı ya?! Ahh!',
    'Ağzım burnum kan içinde kaldı imdaaat!',
    'Tamam bedava 5 yıldız seçici vereceğim dur artık!',
    'Pes ediyorum! Bütün Primogemler senin olsun!'
  ];

  const STAGE_THEMES = [
    { id: 'fistik', label: 'Mavi', bg: '#0095d5', spot: '#2cc2f5' },
    { id: 'office', label: 'Ofis', bg: '#2c1e38', spot: '#482d5c' },
    { id: 'arena', label: 'Öfke', bg: '#7a121c', spot: '#b01e2b' }
  ];

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const sound = new window.SoundEngine();

  // Dynamic Responsive Stage Layout (Desktop 900x650 vs Mobile Portrait 540x740)
  let isPortrait = false;
  let stageW = 900;
  let stageH = 650;
  let charScale = 0.79;
  let charX = 285;
  let charY = 32;
  let weaponButtons = [];
  let resetBtn = { cx: 846, cy: 594, r: 29 };
  let ultiBtn = { x: 678, y: 568, w: 118, h: 52 };

  function updateStageLayout() {
    const portraitNow = window.innerWidth <= 760 && window.innerHeight > window.innerWidth;
    isPortrait = portraitNow;
    if (isPortrait) {
      stageW = 540;
      stageH = 740;
      charScale = 0.84;
      charX = 50;
      charY = 82;
      weaponButtons = []; // Mobile uses the large thumb dock below the canvas!
      resetBtn = { cx: 492, cy: 690, r: 29 };
      ultiBtn = { x: 322, y: 664, w: 130, h: 52 };
    } else {
      stageW = 900;
      stageH = 650;
      charScale = 0.79;
      charX = 285;
      charY = 32;
      weaponButtons = WEAPONS.map((w, idx) => ({
        ...w,
        cx: 68,
        cy: 80 + idx * 103,
        r: 35
      }));
      resetBtn = { cx: 846, cy: 594, r: 29 };
      ultiBtn = { x: 678, y: 568, w: 118, h: 52 };
    }
    if (canvas.width !== stageW || canvas.height !== stageH) {
      canvas.width = stageW;
      canvas.height = stageH;
    }
  }

  updateStageLayout();
  window.addEventListener('resize', updateStageLayout);
  window.addEventListener('orientationchange', () => setTimeout(updateStageLayout, 80));

  // Unlock mobile audio on first touch anywhere
  window.addEventListener('touchstart', () => sound.init(), { passive: true, once: true });
  window.addEventListener('pointerdown', () => sound.init(), { passive: true, once: true });

  let mesh = null;
  let damageRenderer = null;
  let ready = false;

  // Game State
  let currentWeapon = 'slap';
  let slapSide = 1;
  let damagePct = 0;
  let totalHits = 0;
  let combo = 0;
  let comboTimer = 0;
  let rageMeter = 0;
  let ultiActive = false;
  let koTriggered = false;
  let themeIndex = 0;

  // Pointer State
  let pointerX = stageW * 0.5;
  let pointerY = stageH * 0.42;
  let pointerInside = false;
  let isTouchPointer = false;
  let hoveredBtn = null;

  // Visual FX
  let shakeTime = 0;
  let shakeMag = 0;
  let hitFlash = 0;
  let hitStop = 0;
  const weaponSwings = [];
  const particles = [];
  const comicPopups = [];
  let speechBubble = null;
  let dizzyPhase = 0;

  // Load cutout image
  const baseImg = new Image();
  baseImg.onload = () => {
    damageRenderer = new window.DamageRenderer(baseImg);
    mesh = new window.DeformableCharacterMesh(baseImg, 15, 22);
    ready = true;
    showSpeech('Hehe, 50/50 kaybettin galiba? Dokun da stres at!', 3.2);
  };
  baseImg.src = window.DAWEI_CUTOUT_B64 || 'assets/dawei_cutout.png';

  function showSpeech(text, duration = 2.4) {
    speechBubble = { text, timer: duration, maxTimer: duration };
  }

  // Exact coordinate conversion accounting for object-fit: contain letterboxing
  function screenToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const elemRatio = rect.width / rect.height;
    const stageRatio = stageW / stageH;
    let drawW = rect.width;
    let drawH = rect.height;
    let offX = 0;
    let offY = 0;
    if (elemRatio > stageRatio) {
      drawW = rect.height * stageRatio;
      offX = (rect.width - drawW) / 2;
    } else {
      drawH = rect.width / stageRatio;
      offY = (rect.height - drawH) / 2;
    }
    return {
      x: ((clientX - rect.left - offX) / drawW) * stageW,
      y: ((clientY - rect.top - offY) / drawH) * stageH
    };
  }

  function canvasToCharTex(cx, cy) {
    return {
      tx: (cx - charX) / charScale,
      ty: (cy - charY) / charScale
    };
  }

  function performStrike(sx, sy, forcedWeapon = null) {
    if (!ready) return false;
    const wId = forcedWeapon || currentWeapon;
    const weapon = WEAPONS.find((w) => w.id === wId) || WEAPONS[0];

    const { tx, ty } = canvasToCharTex(sx, sy);
    // Slightly wider forgiveness on touch screens so edge taps always register nicely
    if (!mesh.isOpaqueAt(tx, ty, isTouchPointer ? 26 : 18)) {
      return false;
    }

    totalHits++;
    combo = comboTimer > 0 ? combo + 1 : 1;
    comboTimer = 1.65;

    const headBonus = ty < 275 ? 1.2 : 0.85;
    const prevDmg = damagePct;
    damagePct = Math.min(100, damagePct + weapon.damage * headBonus * 0.55);
    if (!ultiActive) {
      rageMeter = Math.min(100, rageMeter + weapon.damage * 1.45);
    }

    let dirX = 0;
    let dirY = 0;
    if (wId === 'slap') {
      slapSide *= -1;
      dirX = slapSide * 1.15;
      dirY = -0.15;
    } else if (wId === 'punch') {
      dirX = tx < 238 ? 0.85 : -0.85;
      if (Math.abs(tx - 238) < 28) dirX = (Math.random() - 0.5) * 0.9;
      dirY = -0.35;
    } else if (wId === 'kick') {
      dirX = tx < 238 ? 1.1 : -1.1;
      dirY = 0.55;
    } else if (wId === 'slipper') {
      dirX = (Math.random() > 0.5 ? 1 : -1) * 1.05;
      dirY = 0.25;
    } else if (wId === 'tomato') {
      dirX = (tx - 238) * 0.006;
      dirY = 0.25;
    }

    const woundResult = damageRenderer.addWound(wId, tx, ty, damagePct);
    damageRenderer.rebuild(damagePct);
    mesh.applyImpulse(tx, ty, dirX, dirY, weapon.force, wId === 'kick' ? 125 : 95);

    sound.playHit(wId, weapon.force, damagePct);
    if (woundResult && woundResult.knockedTooth) {
      sound.playToothPop();
      spawnFlyingTooth(dirX);
    }

    if (prevDmg < 100 && damagePct >= 100 && !koTriggered) {
      koTriggered = true;
      sound.playKO();
      showSpeech('NAKAVT! Yeter abi cüzdanı da yatı da al git!', 4.0);
      spawnComicWord(charX + 240 * charScale, charY + 85 * charScale, 'NAKAVT!!', '#ffeb3b', 1.35);
    } else if (Math.random() < 0.36 || totalHits === 1) {
      const pool = damagePct < 30 ? QUOTES_LIGHT : damagePct < 68 ? QUOTES_MID : QUOTES_HEAVY;
      showSpeech(pool[Math.floor(Math.random() * pool.length)], 2.3);
    }

    shakeTime = 0.16;
    shakeMag = weapon.shake;
    hitFlash = wId === 'kick' ? 0.3 : 0.17;
    if (wId === 'kick' || (woundResult && woundResult.knockedTooth)) {
      hitStop = 0.03;
    }

    spawnWeaponSwing(wId, sx, sy, slapSide);
    spawnHitParticles(wId, sx, sy, dirX, damagePct, ty < 285);

    const word = weapon.words[Math.floor(Math.random() * weapon.words.length)];
    const colors = {
      slap: '#ffeb3b',
      punch: '#ff5252',
      kick: '#ff9800',
      tomato: '#ff3d00',
      slipper: '#f50057'
    };
    spawnComicWord(sx + (Math.random() - 0.5) * 34, sy - 24, word, colors[wId] || '#fff', 1.0);

    updateHudDOM();
    return true;
  }

  function triggerUltimateCombo() {
    if (!ready || ultiActive || rageMeter < 100) return;
    ultiActive = true;
    rageMeter = 0;
    showSpeech('HAYIIIR! 50/50 QİQİ İNTİKAMI GELİYOR!!', 3.0);

    const sequence = [
      'slap', 'slap', 'punch', 'slap', 'punch',
      'slipper', 'punch', 'slap', 'slipper', 'punch', 'kick', 'kick'
    ];
    sequence.forEach((wId, idx) => {
      setTimeout(() => {
        const targetTx = 195 + Math.random() * 90;
        const targetTy = idx === sequence.length - 1 ? 185 : 135 + Math.random() * 115;
        const sx = charX + targetTx * charScale;
        const sy = charY + targetTy * charScale;
        performStrike(sx, sy, wId);
        if (idx === sequence.length - 1) {
          ultiActive = false;
          updateHudDOM();
        }
      }, idx * 105);
    });
  }

  function resetCharacter() {
    if (!ready) return;
    damagePct = 0;
    totalHits = 0;
    combo = 0;
    comboTimer = 0;
    rageMeter = 0;
    koTriggered = false;
    damageRenderer.reset();
    mesh.reset();
    particles.length = 0;
    comicPopups.length = 0;
    sound.playHeal();
    showSpeech('Oh be yüzüm gözüm düzeldi... Yine dövmeyeceksin değil mi?', 3.0);
    updateHudDOM();
  }

  function spawnWeaponSwing(wId, sx, sy, side) {
    weaponSwings.push({
      wId,
      x: sx,
      y: sy,
      side,
      t: 0,
      dur: wId === 'kick' ? 0.28 : 0.22
    });
  }

  function spawnFlyingTooth(dirX) {
    particles.push({
      kind: 'tooth',
      x: charX + 238 * charScale,
      y: charY + 216 * charScale,
      vx: (dirX || 1) * (180 + Math.random() * 110),
      vy: -270 - Math.random() * 90,
      rot: 0,
      vrot: (Math.random() > 0.5 ? 1 : -1) * 14,
      life: 1.3,
      maxLife: 1.3
    });
  }

  function spawnHitParticles(wId, sx, sy, dirX, dmg, onHead) {
    if (wId === 'tomato') {
      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 70 + Math.random() * 230;
        particles.push({
          kind: 'tomato',
          x: sx,
          y: sy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 60,
          r: 3 + Math.random() * 5.5,
          life: 0.65 + Math.random() * 0.3,
          maxLife: 0.95
        });
      }
      return;
    }

    const bloodRatio = Math.min(0.92, 0.22 + (dmg / 100) * 0.75 + (wId === 'kick' || wId === 'punch' ? 0.2 : 0));
    const count = wId === 'kick' ? 22 : wId === 'punch' ? 16 : 12;

    for (let i = 0; i < count; i++) {
      const isBlood = onHead && Math.random() < bloodRatio;
      const spread = (Math.random() - 0.5) * 1.5;
      const baseAngle = dirX >= 0 ? -0.35 + spread : Math.PI + 0.35 + spread;
      const spd = 110 + Math.random() * 280;
      particles.push({
        kind: isBlood ? 'blood' : 'sweat',
        x: sx + (Math.random() - 0.5) * 16,
        y: sy + (Math.random() - 0.5) * 16,
        vx: Math.cos(baseAngle) * spd,
        vy: Math.sin(baseAngle) * spd - 85,
        r: isBlood ? 2.5 + Math.random() * 4.5 : 2.2 + Math.random() * 3.2,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9
      });
    }

    if (wId === 'kick' || wId === 'slipper' || dmg > 50) {
      for (let s = 0; s < 4; s++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({
          kind: 'star',
          x: sx,
          y: sy,
          vx: Math.cos(a) * (120 + Math.random() * 140),
          vy: Math.sin(a) * (120 + Math.random() * 140) - 60,
          rot: Math.random() * 6,
          vrot: 8,
          r: 7 + Math.random() * 5,
          life: 0.5,
          maxLife: 0.5
        });
      }
    }
  }

  function spawnComicWord(x, y, text, color, scale = 1) {
    const minX = isPortrait ? 75 : 175;
    comicPopups.push({
      x: Math.max(minX, Math.min(stageW - 85, x)),
      y: Math.max(75, Math.min(stageH - 70, y)),
      text,
      color,
      scale,
      rot: (Math.random() - 0.5) * 0.38,
      life: 0.62,
      maxLife: 0.62
    });
  }

  // --- INPUT EVENTS (Mouse + Multi-Touch Mobile Ready!) ---
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      isTouchPointer = true;
      return;
    }
    isTouchPointer = false;
    const pt = screenToCanvas(e.clientX, e.clientY);
    pointerX = pt.x;
    pointerY = pt.y;
    pointerInside = true;

    hoveredBtn = null;
    for (const b of weaponButtons) {
      if (Math.hypot(pt.x - b.cx, pt.y - b.cy) <= b.r + 4) {
        hoveredBtn = b.id;
        break;
      }
    }
    if (!hoveredBtn && Math.hypot(pt.x - resetBtn.cx, pt.y - resetBtn.cy) <= resetBtn.r + 4) {
      hoveredBtn = 'reset';
    }
    if (
      !hoveredBtn &&
      rageMeter >= 100 &&
      pt.x >= ultiBtn.x &&
      pt.x <= ultiBtn.x + ultiBtn.w &&
      pt.y >= ultiBtn.y &&
      pt.y <= ultiBtn.y + ultiBtn.h
    ) {
      hoveredBtn = 'ulti';
    }

    canvas.style.cursor = hoveredBtn ? 'pointer' : 'none';
  });

  canvas.addEventListener('pointerleave', () => {
    pointerInside = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isTouchPointer = e.pointerType === 'touch';
    sound.init();

    const pt = screenToCanvas(e.clientX, e.clientY);
    pointerX = pt.x;
    pointerY = pt.y;

    for (const b of weaponButtons) {
      if (Math.hypot(pt.x - b.cx, pt.y - b.cy) <= b.r + 6) {
        currentWeapon = b.id;
        syncWeaponButtonsDOM();
        return;
      }
    }

    if (Math.hypot(pt.x - resetBtn.cx, pt.y - resetBtn.cy) <= resetBtn.r + 8) {
      resetCharacter();
      return;
    }

    if (
      rageMeter >= 100 &&
      pt.x >= ultiBtn.x - 4 &&
      pt.x <= ultiBtn.x + ultiBtn.w + 4 &&
      pt.y >= ultiBtn.y - 4 &&
      pt.y <= ultiBtn.y + ultiBtn.h + 4
    ) {
      triggerUltimateCombo();
      return;
    }

    performStrike(pt.x, pt.y);
  });

  // Prevent context menu on long-press on mobile
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const found = WEAPONS.find((w) => w.key === e.key);
    if (found) {
      currentWeapon = found.id;
      syncWeaponButtonsDOM();
    } else if (e.key === 'r' || e.key === 'R') {
      resetCharacter();
    } else if (e.key === ' ' && rageMeter >= 100) {
      e.preventDefault();
      triggerUltimateCombo();
    }
  });

  // Top Bar Controls
  const btnSfx = document.getElementById('btnSfx');
  const btnVoice = document.getElementById('btnVoice');
  const btnStage = document.getElementById('btnStage');
  const btnResetTop = document.getElementById('btnResetTop');

  if (btnSfx) {
    btnSfx.addEventListener('click', () => {
      sound.init();
      sound.sfxEnabled = !sound.sfxEnabled;
      btnSfx.classList.toggle('muted', !sound.sfxEnabled);
      btnSfx.textContent = sound.sfxEnabled ? '🔊 Efekt' : '🔇 Efekt';
    });
  }

  if (btnVoice) {
    btnVoice.addEventListener('click', () => {
      sound.init();
      sound.voiceEnabled = !sound.voiceEnabled;
      btnVoice.classList.toggle('muted', !sound.voiceEnabled);
      btnVoice.textContent = sound.voiceEnabled ? '🗣️ Ses' : '🤐 Ses';
    });
  }

  if (btnStage) {
    btnStage.addEventListener('click', () => {
      themeIndex = (themeIndex + 1) % STAGE_THEMES.length;
      btnStage.textContent = `🎨 ${STAGE_THEMES[themeIndex].label}`;
    });
  }

  if (btnResetTop) {
    btnResetTop.addEventListener('click', resetCharacter);
  }

  function syncWeaponButtonsDOM() {
    document.querySelectorAll('[data-weapon-chip]').forEach((el) => {
      el.classList.toggle('active', el.dataset.weaponChip === currentWeapon);
    });
  }

  document.querySelectorAll('[data-weapon-chip]').forEach((el) => {
    el.addEventListener('click', () => {
      sound.init();
      currentWeapon = el.dataset.weaponChip;
      syncWeaponButtonsDOM();
    });
  });

  function updateHudDOM() {
    const hitEl = document.getElementById('statHits');
    const dmgEl = document.getElementById('statDamage');
    if (hitEl) hitEl.textContent = totalHits;
    if (dmgEl) dmgEl.textContent = `%${Math.round(damagePct)}`;
  }

  // --- DRAWING HELPERS ---
  function drawWeaponIcon(c, id, size = 1) {
    c.save();
    c.scale(size, size);
    c.lineJoin = 'round';
    c.lineCap = 'round';

    if (id === 'punch') {
      c.fillStyle = '#ffcca0';
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2.6;
      c.beginPath();
      c.roundRect(-14, 6, 18, 16, 4);
      c.fill();
      c.stroke();
      c.beginPath();
      c.roundRect(-17, -15, 34, 24, 9);
      c.fill();
      c.stroke();
      for (let fx = -8; fx <= 8; fx += 8) {
        c.beginPath();
        c.moveTo(fx, -14);
        c.lineTo(fx, -2);
        c.stroke();
      }
      c.fillStyle = '#f5b887';
      c.beginPath();
      c.roundRect(-12, -3, 22, 9, 4.5);
      c.fill();
      c.stroke();
    } else if (id === 'slap') {
      c.fillStyle = '#ffcca0';
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2.4;
      c.rotate(-0.25);
      const fDefs = [
        { x: -12, y: -3, w: 7, h: 15, r: -0.55 },
        { x: -7, y: -14, w: 6.5, h: 20, r: -0.15 },
        { x: 0, y: -16, w: 6.5, h: 22, r: 0 },
        { x: 7, y: -14, w: 6.5, h: 20, r: 0.14 },
        { x: 13, y: -9, w: 6, h: 16, r: 0.3 }
      ];
      fDefs.forEach((f) => {
        c.save();
        c.translate(f.x, f.y);
        c.rotate(f.r);
        c.beginPath();
        c.roundRect(-f.w / 2, -f.h / 2, f.w, f.h, 3);
        c.fill();
        c.stroke();
        c.restore();
      });
      c.beginPath();
      c.roundRect(-11, -4, 23, 21, 7);
      c.fill();
      c.stroke();
    } else if (id === 'kick') {
      c.fillStyle = '#ffcca0';
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2.5;
      c.rotate(0.15);
      c.beginPath();
      c.moveTo(-6, -18);
      c.lineTo(6, -18);
      c.lineTo(10, 4);
      c.quadraticCurveTo(16, 13, 5, 16);
      c.lineTo(-16, 12);
      c.quadraticCurveTo(-21, 6, -13, 2);
      c.lineTo(-5, -3);
      c.closePath();
      c.fill();
      c.stroke();
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(-15 + i * 4.2, 3 - i * 1.6, 2.6, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    } else if (id === 'tomato') {
      c.fillStyle = '#e51c23';
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2.5;
      c.beginPath();
      c.ellipse(0, 3, 18, 15, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255, 190, 190, 0.7)';
      c.beginPath();
      c.ellipse(-7, -2, 5, 3, -0.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#2e9e36';
      c.beginPath();
      c.moveTo(0, -14);
      c.lineTo(4, -8);
      c.lineTo(12, -10);
      c.lineTo(5, -4);
      c.lineTo(8, 1);
      c.lineTo(0, -3);
      c.lineTo(-8, 1);
      c.lineTo(-5, -4);
      c.lineTo(-12, -10);
      c.lineTo(-4, -8);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (id === 'slipper') {
      c.rotate(-0.45);
      c.fillStyle = '#d81b60';
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2.4;
      c.beginPath();
      c.ellipse(0, 0, 12, 22, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#ff80ab';
      c.beginPath();
      c.roundRect(-13, -9, 26, 12, 4);
      c.fill();
      c.stroke();
      c.fillStyle = '#ffeb3b';
      c.beginPath();
      c.arc(0, -3, 3.5, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }

  function drawStageBackground() {
    const theme = STAGE_THEMES[themeIndex];
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, stageW, stageH);

    ctx.fillStyle = theme.spot;
    ctx.beginPath();
    if (isPortrait) {
      ctx.arc(stageW * 0.5, 375, 225, 0, Math.PI * 2);
    } else {
      ctx.arc(485, 315, 238, 0, Math.PI * 2);
    }
    ctx.fill();

    if (theme.id === 'office') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      for (let i = 0; i < 5; i++) {
        drawPrimogem(ctx, 85 + i * 110, 130 + (i % 2) * 310, 18, false);
      }
    }

    ctx.save();
    ctx.font = isPortrait
      ? '900 19px "Comic Sans MS", "Trebuchet MS", cursive, sans-serif'
      : '900 25px "Comic Sans MS", "Trebuchet MS", cursive, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#173d14';
    ctx.fillStyle = '#b9f227';
    ctx.strokeText('DaweiDov.swf', 16, stageH - 16);
    ctx.fillText('DaweiDov.swf', 16, stageH - 16);
    ctx.restore();
  }

  function drawPrimogem(c, x, y, r, cracked) {
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.moveTo(0, -r);
    c.lineTo(r * 0.35, -r * 0.35);
    c.lineTo(r, 0);
    c.lineTo(r * 0.35, r * 0.35);
    c.lineTo(0, r);
    c.lineTo(-r * 0.35, r * 0.35);
    c.lineTo(-r, 0);
    c.lineTo(-r * 0.35, -r * 0.35);
    c.closePath();
    c.fill();
    if (cracked) {
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2;
      c.stroke();
      c.beginPath();
      c.moveTo(-r * 0.2, -r * 0.4);
      c.lineTo(r * 0.1, 0);
      c.lineTo(-r * 0.15, r * 0.45);
      c.stroke();
    }
    c.restore();
  }

  function drawDizzyHalo() {
    if (damagePct < 72 || !mesh) return;
    const intensity = Math.min(1, (damagePct - 72) / 22);
    const crownX = charX + (238 + mesh.headShiftX) * charScale;
    const crownY = charY + (36 + mesh.headShiftY) * charScale;

    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = 'rgba(255, 235, 59, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(crownX, crownY, 74, 20, mesh.headAngle * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const count = 5;
    for (let i = 0; i < count; i++) {
      const ang = dizzyPhase + (i / count) * Math.PI * 2;
      const sx = crownX + Math.cos(ang) * 74;
      const sy = crownY + Math.sin(ang) * 20;
      if (i % 2 === 0) {
        drawStarShape(ctx, sx, sy, 9, '#ffeb3b', '#1b1b1b');
      } else {
        ctx.fillStyle = '#80d8ff';
        drawPrimogem(ctx, sx, sy, 9, true);
      }
    }

    if (damagePct >= 100) {
      const fx = charX + (355 + mesh.torsoShiftX) * charScale;
      const fy = charY + 380 * charScale;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(0.35 + Math.sin(dizzyPhase * 2) * 0.18);
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(0, -68);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -66);
      ctx.quadraticCurveTo(26, -74 + Math.sin(dizzyPhase * 3) * 8, 52, -60);
      ctx.lineTo(48, -26);
      ctx.quadraticCurveTo(24, -36 + Math.sin(dizzyPhase * 3) * 8, 0, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#d32f2f';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('PES!', 12, -43);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawStarShape(c, x, y, r, fill, stroke) {
    c.save();
    c.translate(x, y);
    c.fillStyle = fill;
    c.strokeStyle = stroke;
    c.lineWidth = 1.8;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  function drawWeaponSwings() {
    for (const sw of weaponSwings) {
      const p = sw.t / sw.dur;
      const impactScale = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - p) * 1.6);

      if (sw.wId === 'slap') {
        const arcX = sw.x + (0.35 - p) * sw.side * 190;
        const arcY = sw.y + Math.sin(p * Math.PI) * -18;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 14 * (1 - p);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(arcX - sw.side * 75, arcY + 15);
        ctx.quadraticCurveTo(sw.x, sw.y - 12, arcX, arcY);
        ctx.stroke();

        ctx.translate(arcX, arcY);
        ctx.scale(sw.side * 2.2, 2.2);
        drawWeaponIcon(ctx, 'slap', 1);
      } else if (sw.wId === 'punch') {
        const offset = (1 - Math.sin(Math.min(1, p * 1.5) * Math.PI)) * 120;
        ctx.translate(sw.x, sw.y + offset);
        ctx.scale(2.5, 2.5);
        drawWeaponIcon(ctx, 'punch', 1);
      } else if (sw.wId === 'kick') {
        ctx.strokeStyle = 'rgba(255, 215, 64, 0.75)';
        ctx.lineWidth = 5 * (1 - p);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, 18 + p * 85, 0, Math.PI * 2);
        ctx.stroke();

        const slide = p < 0.3 ? (1 - p / 0.3) * 150 : (p - 0.3) * 80;
        ctx.translate(sw.x + slide * 0.7, sw.y - slide * 0.3);
        ctx.rotate(-0.55);
        ctx.scale(2.9, 2.9);
        drawWeaponIcon(ctx, 'kick', 1);
      } else if (sw.wId === 'slipper') {
        const dist = p < 0.32 ? (1 - p / 0.32) * 160 : (p - 0.32) * 120;
        ctx.translate(sw.x + dist * sw.side, sw.y - dist * 0.4);
        ctx.rotate(p * 14);
        ctx.scale(2.3, 2.3);
        drawWeaponIcon(ctx, 'slipper', 1);
      } else if (sw.wId === 'tomato' && p < 0.35) {
        ctx.translate(sw.x, sw.y + (0.35 - p) * 180);
        ctx.scale(1.8 + impactScale * 0.4, 1.8 - impactScale * 0.4);
        drawWeaponIcon(ctx, 'tomato', 1);
      }

      ctx.restore();
    }
  }

  function drawParticles() {
    for (const pt of particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (pt.kind === 'blood') {
        ctx.fillStyle = '#c60d1e';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pt.r, pt.r * 1.25, Math.atan2(pt.vy, pt.vx), 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'sweat') {
        ctx.fillStyle = '#b3e5fc';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'tomato') {
        ctx.fillStyle = '#e52419';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'tooth') {
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = '#fffef7';
        ctx.strokeStyle = '#1b1b1b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-6, -7, 12, 14, 3);
        cTextToothRoot();
      } else if (pt.kind === 'star') {
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        drawStarShape(ctx, 0, 0, pt.r, '#ffeb3b', '#1b1b1b');
      }
      ctx.restore();
    }
  }

  function cTextToothRoot() {
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-4, 4, 8, 3);
  }

  function drawComicPopups() {
    for (const cp of comicPopups) {
      const progress = 1 - cp.life / cp.maxLife;
      const popScale = (progress < 0.22 ? 0.5 + (progress / 0.22) * 0.75 : 1.25 - progress * 0.2) * cp.scale;
      ctx.save();
      ctx.translate(cp.x, cp.y - progress * 22);
      ctx.rotate(cp.rot);
      ctx.scale(popScale, popScale);
      ctx.globalAlpha = Math.min(1, (cp.life / cp.maxLife) * 1.8);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const spikes = 12;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? 44 : 27;
        const a = (i / (spikes * 2)) * Math.PI * 2;
        const px = Math.cos(a) * rad * 1.35;
        const py = Math.sin(a) * rad * 0.85;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 22px "Trebuchet MS", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#111111';
      ctx.fillStyle = cp.color;
      ctx.strokeText(cp.text, 0, 1);
      ctx.fillText(cp.text, 0, 1);
      ctx.restore();
    }
  }

  function drawToolbarAndHUD() {
    // 1. Left Column Circular Flash Buttons (Desktop / Landscape)
    for (const b of weaponButtons) {
      const isSelected = currentWeapon === b.id;
      const isHovered = hoveredBtn === b.id;
      const sc = isSelected ? 1.08 : isHovered ? 1.04 : 1.0;

      ctx.save();
      ctx.translate(b.cx, b.cy);
      ctx.scale(sc, sc);

      ctx.fillStyle = isSelected ? '#4dd0ff' : '#26bdf2';
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, -b.r * 0.42, b.r * 0.7, b.r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#071c38';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.r + 1, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(0, 65, 110, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      drawWeaponIcon(ctx, b.id, 1.02);

      ctx.font = 'bold 11.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(7, 28, 56, 0.85)';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText(b.name, 0, b.r + 15);
      ctx.fillText(b.name, 0, b.r + 15);
      ctx.restore();
    }

    // 2. Top Health / Condition Bar
    const hpPct = Math.max(0, 100 - damagePct);
    const barX = isPortrait ? 18 : 165;
    const barY = isPortrait ? 12 : 16;
    const barW = isPortrait ? stageW - 36 : 430;
    const barH = 25;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 24, 42, 0.76)';
    ctx.strokeStyle = '#071c38';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 12);
    ctx.fill();
    ctx.stroke();

    if (hpPct > 0) {
      const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      if (hpPct > 55) {
        hpGrad.addColorStop(0, '#4caf50');
        hpGrad.addColorStop(1, '#8bc34a');
      } else if (hpPct > 25) {
        hpGrad.addColorStop(0, '#ff9800');
        hpGrad.addColorStop(1, '#ffeb3b');
      } else {
        hpGrad.addColorStop(0, '#b71c1c');
        hpGrad.addColorStop(1, '#ff1744');
      }
      ctx.fillStyle = hpGrad;
      ctx.beginPath();
      ctx.roundRect(barX + 3, barY + 3, Math.max(12, (barW - 6) * (hpPct / 100)), barH - 6, 9);
      ctx.fill();
    }

    let statusLabel = 'Keyfi Yerinde (Sırıtıyor)';
    if (damagePct >= 100) statusLabel = 'NAKAVT! (Sınırsız Stres Modu)';
    else if (damagePct >= 72) statusLabel = 'Ağzı Burnu Dağıldı / Haşat!';
    else if (damagePct >= 44) statusLabel = 'Gözü Morardı, Burnu Kanıyor!';
    else if (damagePct >= 18) statusLabel = 'Bozuldu / Yanağı Kızardı';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 3;
    ctx.fillText(`DAWEI: ${statusLabel}`, barX + barW / 2, barY + 17);
    ctx.restore();

    // 3. Combo Counter Badge
    if (combo >= 2 && comboTimer > 0) {
      ctx.save();
      ctx.translate(isPortrait ? stageW - 95 : 775, isPortrait ? 66 : 42);
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.06;
      ctx.scale(pulse, pulse);
      ctx.font = isPortrait ? '900 23px "Arial Black", sans-serif' : '900 28px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#111';
      ctx.fillStyle = combo >= 10 ? '#ff1744' : '#ffeb3b';
      ctx.strokeText(`${combo}x KOMBO!`, 0, 0);
      ctx.fillText(`${combo}x KOMBO!`, 0, 0);
      ctx.restore();
    }

    // 4. Speech Bubble
    if (speechBubble && speechBubble.timer > 0) {
      const bw = isPortrait ? 330 : 310;
      const bh = isPortrait ? 54 : 62;
      const bx = isPortrait ? 18 : 565;
      const by = isPortrait ? 46 : 62;

      ctx.save();
      ctx.globalAlpha = Math.min(1, speechBubble.timer * 3);
      ctx.fillStyle = 'rgba(255, 254, 249, 0.95)';
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 15);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      if (isPortrait) {
        ctx.moveTo(bx + 165, by + bh - 2);
        ctx.lineTo(bx + 195, by + bh + 16);
        ctx.lineTo(bx + 198, by + bh - 2);
      } else {
        ctx.moveTo(bx + 18, by + bh - 2);
        ctx.lineTo(bx - 22, by + bh + 22);
        ctx.lineTo(bx + 42, by + bh - 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#141414';
      ctx.font = isPortrait ? 'bold 13px "Segoe UI", sans-serif' : 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      wrapText(ctx, speechBubble.text, bx + bw / 2, by + (isPortrait ? 22 : 25), bw - 22, 18);
      ctx.restore();
    }

    // 5. Rage / "50/50 Ulti" Button
    ctx.save();
    if (rageMeter >= 100) {
      const glow = 1 + Math.sin(performance.now() * 0.015) * 0.06;
      ctx.translate(ultiBtn.x + ultiBtn.w / 2, ultiBtn.y + ultiBtn.h / 2);
      ctx.scale(glow, glow);
      ctx.fillStyle = '#ff1744';
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-ultiBtn.w / 2, -ultiBtn.h / 2, ultiBtn.w, ultiBtn.h, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ ULTİ HAZIR!', 0, -5);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('50/50 İNTİKAMI', 0, 12);
    } else {
      ctx.fillStyle = 'rgba(7, 24, 42, 0.76)';
      ctx.strokeStyle = '#071c38';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(ultiBtn.x, ultiBtn.y + 12, ultiBtn.w, 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f50057';
      ctx.beginPath();
      ctx.roundRect(ultiBtn.x + 2, ultiBtn.y + 14, Math.max(0, (ultiBtn.w - 4) * (rageMeter / 100)), 24, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ÖFKE: %${Math.round(rageMeter)}`, ultiBtn.x + ultiBtn.w / 2, ultiBtn.y + 30);
    }
    ctx.restore();

    // 6. Bottom-Right Circular Reset Button
    ctx.save();
    ctx.translate(resetBtn.cx, resetBtn.cy);
    if (hoveredBtn === 'reset') ctx.scale(1.1, 1.1);
    ctx.fillStyle = '#26bdf2';
    ctx.strokeStyle = '#071c38';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, resetBtn.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#071c38';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0.4, Math.PI * 1.85);
    ctx.stroke();
    ctx.fillStyle = '#071c38';
    ctx.beginPath();
    ctx.moveTo(8, -14);
    ctx.lineTo(16, -8);
    ctx.lineTo(6, -5);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText('Yenile', 0, resetBtn.r + 13);
    ctx.restore();
  }

  function drawCustomWeaponCursor() {
    if (isTouchPointer || !pointerInside || hoveredBtn) return;
    ctx.save();
    ctx.translate(pointerX, pointerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.translate(16, 16);
    drawWeaponIcon(ctx, currentWeapon, 0.85);
    ctx.restore();
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (context.measureText(testLine).width > maxWidth && n > 0) {
        context.fillText(line.trim(), x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line.trim(), x, curY);
  }

  // --- MAIN 60FPS GAME LOOP ---
  let lastTime = performance.now();

  function tick(now) {
    const rawDt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (hitStop > 0) {
      hitStop -= rawDt;
      requestAnimationFrame(tick);
      return;
    }

    if (comboTimer > 0) {
      comboTimer -= rawDt;
      if (comboTimer <= 0) combo = 0;
    }
    if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - rawDt);
    if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - rawDt * 2.2);
    if (speechBubble && speechBubble.timer > 0) speechBubble.timer -= rawDt;
    dizzyPhase += rawDt * 4.2;

    if (ready) {
      mesh.update(rawDt, damagePct);
    }

    for (let i = weaponSwings.length - 1; i >= 0; i--) {
      weaponSwings[i].t += rawDt;
      if (weaponSwings[i].t >= weaponSwings[i].dur) weaponSwings.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= rawDt;
      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      pt.vy += 680 * rawDt;
      pt.x += pt.vx * rawDt;
      pt.y += pt.vy * rawDt;
      if (pt.rot !== undefined) pt.rot += pt.vrot * rawDt;
    }

    for (let i = comicPopups.length - 1; i >= 0; i--) {
      comicPopups[i].life -= rawDt;
      if (comicPopups[i].life <= 0) comicPopups.splice(i, 1);
    }

    ctx.save();
    if (shakeTime > 0) {
      const curMag = shakeMag * (shakeTime / 0.16);
      ctx.translate((Math.random() - 0.5) * curMag * 2, (Math.random() - 0.5) * curMag * 2);
    }

    drawStageBackground();

    if (ready) {
      mesh.render(ctx, damageRenderer.compositeCanvas, charX, charY, charScale);
      drawDizzyHalo();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Dawei Sahneye Çıkıyor...', stageW / 2, stageH / 2);
    }

    drawWeaponSwings();
    drawParticles();
    drawComicPopups();

    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 60, 60, ${hitFlash * 0.35})`;
      ctx.fillRect(0, 0, stageW, stageH);
    }

    ctx.restore();

    drawToolbarAndHUD();
    drawCustomWeaponCursor();

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  window.__daweiGame = {
    strikeFace: (wId) => {
      currentWeapon = wId || currentWeapon;
      return performStrike(charX + 238 * charScale, charY + 175 * charScale, wId);
    },
    getState: () => ({ damagePct, totalHits, combo, currentWeapon, koTriggered, isPortrait })
  };
})();
