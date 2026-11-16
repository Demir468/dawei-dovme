// Procedural Flash-Era Slapstick SFX & Male Pain Voice Synthesizer (Web Audio API)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.voiceEnabled = true;
    this.noiseBuffer = null;
    this.lastVoiceTime = 0;
    this.unlocked = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this._buildNoiseBuffer();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.unlocked) {
      try {
        // Play silent 1-frame buffer to unlock iOS Safari Web Audio hardware channel
        const silent = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = silent;
        src.connect(this.ctx.destination);
        src.start(0);
        this.unlocked = true;
      } catch (_) {}
    }
  }

  vibrate(weapon) {
    if (!navigator.vibrate || !this.sfxEnabled) return;
    try {
      if (weapon === 'kick') navigator.vibrate([40, 18, 28]);
      else if (weapon === 'punch' || weapon === 'slipper') navigator.vibrate(26);
      else navigator.vibrate(15);
    } catch (_) {}
  }

  _buildNoiseBuffer() {
    const sr = this.ctx.sampleRate;
    const len = sr * 1.5;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
  }

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    return src;
  }

  playHit(weapon, intensity = 1.0, damagePct = 0) {
    this.init();
    this.vibrate(weapon);
    if (!this.ctx) return;

    if (this.sfxEnabled) {
      switch (weapon) {
        case 'slap':
          this._playSlap(intensity);
          break;
        case 'punch':
          this._playPunch(intensity);
          break;
        case 'kick':
          this._playKick(intensity);
          break;
        case 'slipper':
          this._playSlipper(intensity);
          break;
        case 'tomato':
          this._playTomato(intensity);
          break;
        default:
          this._playSlap(intensity);
      }
    }

    if (this.voiceEnabled) {
      const now = performance.now();
      if (now - this.lastVoiceTime > 110) {
        this.lastVoiceTime = now;
        this.playPainVoice(weapon, intensity, damagePct);
      }
    }
  }

  // Crisp skin-smack slap ("ŞRAAAK!")
  _playSlap(intensity = 1) {
    const t = this.ctx.currentTime;

    // Whoosh lead-in
    const whoosh = this._noiseSource();
    const wFilter = this.ctx.createBiquadFilter();
    wFilter.type = 'bandpass';
    wFilter.frequency.setValueAtTime(500, t);
    wFilter.frequency.exponentialRampToValueAtTime(1600, t + 0.045);
    wFilter.Q.value = 1.8;
    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.18, t);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    whoosh.connect(wFilter).connect(wGain).connect(this.ctx.destination);
    whoosh.start(t);
    whoosh.stop(t + 0.06);

    // Sharp skin crack transient
    const crack = this._noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2300 + Math.random() * 500, t + 0.02);
    hp.Q.value = 1.1;

    const cGain = this.ctx.createGain();
    cGain.gain.setValueAtTime(0.001, t);
    cGain.gain.setValueAtTime(0.85 * intensity, t + 0.018);
    cGain.gain.exponentialRampToValueAtTime(0.14, t + 0.055);
    cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    crack.connect(hp).connect(cGain).connect(this.ctx.destination);
    crack.start(t + 0.015);
    crack.stop(t + 0.18);

    // Palm hollow pop
    const pop = this.ctx.createOscillator();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(420 + Math.random() * 80, t + 0.018);
    pop.frequency.exponentialRampToValueAtTime(115, t + 0.09);
    const pGain = this.ctx.createGain();
    pGain.gain.setValueAtTime(0.55 * intensity, t + 0.018);
    pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    pop.connect(pGain).connect(this.ctx.destination);
    pop.start(t + 0.018);
    pop.stop(t + 0.11);
  }

  // Heavy meaty punch ("GÜM! KÜT!")
  _playPunch(intensity = 1) {
    const t = this.ctx.currentTime;

    // Deep body/jaw thud
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(155, t);
    sub.frequency.exponentialRampToValueAtTime(36, t + 0.16);
    const sGain = this.ctx.createGain();
    sGain.gain.setValueAtTime(0.95 * intensity, t);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    sub.connect(sGain).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.21);

    // Mid punch crunch
    const crunch = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(850 + Math.random() * 250, t);
    lp.Q.value = 0.9;
    const cGain = this.ctx.createGain();
    cGain.gain.setValueAtTime(0.75 * intensity, t);
    cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    crunch.connect(lp).connect(cGain).connect(this.ctx.destination);
    crunch.start(t);
    crunch.stop(t + 0.15);

    // Knuckle snap
    const snap = this.ctx.createOscillator();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(290, t);
    snap.frequency.exponentialRampToValueAtTime(68, t + 0.07);
    const snGain = this.ctx.createGain();
    snGain.gain.setValueAtTime(0.38 * intensity, t);
    snGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    snap.connect(snGain).connect(this.ctx.destination);
    snap.start(t);
    snap.stop(t + 0.09);
  }

  // Thunderous boot kick ("BAAAM!")
  _playKick(intensity = 1) {
    const t = this.ctx.currentTime;

    // Heavy sub boom
    const boom = this.ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(130, t);
    boom.frequency.exponentialRampToValueAtTime(26, t + 0.28);
    const bGain = this.ctx.createGain();
    bGain.gain.setValueAtTime(1.0, t);
    bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.31);
    boom.connect(bGain).connect(this.ctx.destination);
    boom.start(t);
    boom.stop(t + 0.32);

    // Distorted punchy mid-bass
    const mid = this.ctx.createOscillator();
    mid.type = 'triangle';
    mid.frequency.setValueAtTime(210, t);
    mid.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    const mGain = this.ctx.createGain();
    mGain.gain.setValueAtTime(0.65 * intensity, t);
    mGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    mid.connect(mGain).connect(this.ctx.destination);
    mid.start(t);
    mid.stop(t + 0.21);

    // Cloth/boot impact noise
    const thud = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.setValueAtTime(1150, t);
    bp.frequency.exponentialRampToValueAtTime(260, t + 0.22);
    const tGain = this.ctx.createGain();
    tGain.gain.setValueAtTime(0.8 * intensity, t);
    tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
    thud.connect(bp).connect(tGain).connect(this.ctx.destination);
    thud.start(t);
    thud.stop(t + 0.24);
  }

  // Iconic Turkish "Anne Terliği" rubber smack ("ŞLAAAK!")
  _playSlipper(intensity = 1) {
    const t = this.ctx.currentTime;

    // Fast spinning slipper whistle
    const spin = this.ctx.createOscillator();
    spin.type = 'sine';
    spin.frequency.setValueAtTime(620, t);
    spin.frequency.exponentialRampToValueAtTime(1180, t + 0.04);
    const spGain = this.ctx.createGain();
    spGain.gain.setValueAtTime(0.16, t);
    spGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    spin.connect(spGain).connect(this.ctx.destination);
    spin.start(t);
    spin.stop(t + 0.05);

    // Razor-sharp rubber sole whip-crack
    const whip = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2950, t + 0.025);
    bp.Q.value = 1.4;
    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.95 * intensity, t + 0.025);
    wGain.gain.exponentialRampToValueAtTime(0.18, t + 0.07);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    whip.connect(bp).connect(wGain).connect(this.ctx.destination);
    whip.start(t + 0.025);
    whip.stop(t + 0.22);

    // Hollow rubber bounce tone
    const rub = this.ctx.createOscillator();
    rub.type = 'square';
    rub.frequency.setValueAtTime(520, t + 0.025);
    rub.frequency.exponentialRampToValueAtTime(165, t + 0.11);
    const rFilter = this.ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 1300;
    const rGain = this.ctx.createGain();
    rGain.gain.setValueAtTime(0.36 * intensity, t + 0.025);
    rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    rub.connect(rFilter).connect(rGain).connect(this.ctx.destination);
    rub.start(t + 0.025);
    rub.stop(t + 0.13);
  }

  // Wet juicy rotten tomato splat ("ŞPLÖRT!")
  _playTomato(intensity = 1) {
    const t = this.ctx.currentTime;

    // Wet squelch noise with wobbling filter
    const wet = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950, t);
    bp.frequency.exponentialRampToValueAtTime(320, t + 0.14);
    bp.frequency.exponentialRampToValueAtTime(720, t + 0.22);
    bp.Q.value = 3.2;

    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.8 * intensity, t);
    wGain.gain.exponentialRampToValueAtTime(0.25, t + 0.12);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    wet.connect(bp).connect(wGain).connect(this.ctx.destination);
    wet.start(t);
    wet.stop(t + 0.3);

    // Juicy bubble pops
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const st = t + i * 0.045;
      const baseF = 240 + Math.random() * 260;
      osc.frequency.setValueAtTime(baseF, st);
      osc.frequency.exponentialRampToValueAtTime(baseF * 2.1, st + 0.04);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.24, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.05);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.055);
    }
  }

  playToothPop() {
    this.init();
    if (!this.ctx || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(1850, t + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  playKO() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.sfxEnabled) {
      // Boxing ring triple bell: DING - DING - DING!
      [0, 0.18, 0.36].forEach((offset) => {
        [1180, 1775, 2420].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + offset);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.22 / (idx + 1), t + offset);
          g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.55);
          osc.connect(g).connect(this.ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.58);
        });
      });
    }
    if (this.voiceEnabled) {
      this._synthesizeVocal({
        f0Start: 225,
        f0Peak: 255,
        f0End: 98,
        dur: 0.75,
        f1: 720,
        f2: 1180,
        f3: 2550,
        roughness: 0.45,
        vol: 0.55
      });
    }
  }

  playHeal() {
    this.init();
    if (!this.ctx || !this.sfxEnabled) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.22);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.24);
    });
  }

  // Formant-synthesized comedic male pain grunts, yelps & groans ("AH!", "OOF!", "ÖĞH!", "AYY!")
  playPainVoice(weapon, intensity = 1, damagePct = 0) {
    // Choose vowel & pitch profile based on weapon & how beaten up he is
    const groggyShift = damagePct > 65 ? 0.85 : 1.0;
    const rnd = Math.random();

    let preset;
    if (weapon === 'slipper') {
      // High comedic yelp: "AYY!" / "AİİH!"
      preset = {
        f0Start: (195 + rnd * 40) * groggyShift,
        f0Peak: (295 + rnd * 55) * groggyShift,
        f0End: (155 + rnd * 25) * groggyShift,
        dur: 0.24 + rnd * 0.08,
        f1: 680,
        f2: 1850,
        f3: 2750,
        roughness: 0.22,
        vol: 0.44
      };
    } else if (weapon === 'kick') {
      // Heavy winded gut-groan: "ÖÖĞH!" / "OOF!"
      preset = {
        f0Start: (145 + rnd * 25) * groggyShift,
        f0Peak: (165 + rnd * 25) * groggyShift,
        f0End: (88 + rnd * 18) * groggyShift,
        dur: 0.32 + rnd * 0.1,
        f1: 460,
        f2: 920,
        f3: 2350,
        roughness: 0.42,
        vol: 0.5
      };
    } else if (weapon === 'punch') {
      // Sharp jaw grunt: "UGH!" / "AAH!"
      const isAh = rnd > 0.45;
      preset = {
        f0Start: (160 + rnd * 35) * groggyShift,
        f0Peak: (215 + rnd * 40) * groggyShift,
        f0End: (112 + rnd * 20) * groggyShift,
        dur: 0.22 + rnd * 0.08,
        f1: isAh ? 730 : 510,
        f2: isAh ? 1220 : 1020,
        f3: 2480,
        roughness: 0.34,
        vol: 0.46
      };
    } else if (weapon === 'tomato') {
      // Disgusted splutter: "BÖĞK!" / "PÜH!"
      preset = {
        f0Start: (155 + rnd * 30) * groggyShift,
        f0Peak: (180 + rnd * 30) * groggyShift,
        f0End: (118 + rnd * 20) * groggyShift,
        dur: 0.2 + rnd * 0.07,
        f1: 520,
        f2: 1420,
        f3: 2400,
        roughness: 0.35,
        vol: 0.4
      };
    } else {
      // Slap sting: "AH!" / "OW!"
      preset = {
        f0Start: (175 + rnd * 35) * groggyShift,
        f0Peak: (245 + rnd * 45) * groggyShift,
        f0End: (135 + rnd * 25) * groggyShift,
        dur: 0.19 + rnd * 0.07,
        f1: 760,
        f2: 1340,
        f3: 2600,
        roughness: 0.25,
        vol: 0.42
      };
    }

    this._synthesizeVocal(preset);
  }

  _synthesizeVocal({ f0Start, f0Peak, f0End, dur, f1, f2, f3, roughness, vol }) {
    const t = this.ctx.currentTime + 0.025;

    // Glottal source (sawtooth + sub-harmonic roughness + vibrato)
    const glottal = this.ctx.createOscillator();
    glottal.type = 'sawtooth';
    glottal.frequency.setValueAtTime(f0Start, t);
    glottal.frequency.linearRampToValueAtTime(f0Peak, t + dur * 0.22);
    glottal.frequency.exponentialRampToValueAtTime(Math.max(55, f0End), t + dur);

    // Roughness / vocal fry modulator
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 28 + Math.random() * 14;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = f0Peak * roughness * 0.16;
    lfo.connect(lfoGain).connect(glottal.frequency);

    // Aspiration breath burst
    const breath = this._noiseSource();
    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.22, t);
    breathGain.gain.exponentialRampToValueAtTime(0.02, t + dur);

    const mix = this.ctx.createGain();
    mix.gain.value = 1.0;
    glottal.connect(mix);
    breath.connect(breathGain).connect(mix);

    // 3 Parallel Formant Filters
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.001, t);
    master.gain.linearRampToValueAtTime(vol, t + 0.022);
    master.gain.setValueAtTime(vol * 0.85, t + dur * 0.45);
    master.gain.exponentialRampToValueAtTime(0.001, t + dur);
    master.connect(this.ctx.destination);

    const formants = [
      { freq: f1, q: 5.5, gain: 1.0 },
      { freq: f2, q: 7.0, gain: 0.65 },
      { freq: f3, q: 8.5, gain: 0.28 }
    ];

    formants.forEach((fm) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(fm.freq, t);
      bp.frequency.linearRampToValueAtTime(fm.freq * 0.88, t + dur);
      bp.Q.value = fm.q;
      const fg = this.ctx.createGain();
      fg.gain.value = fm.gain;
      mix.connect(bp).connect(fg).connect(master);
    });

    glottal.start(t);
    lfo.start(t);
    breath.start(t);
    glottal.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
    breath.stop(t + dur + 0.02);
  }
}

window.SoundEngine = SoundEngine;
