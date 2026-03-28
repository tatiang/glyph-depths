// Glyph Depths — Procedural Audio via Web Audio API
// No asset files needed — all sounds generated from oscillators and noise

const Audio = (() => {
  let ctx = null;
  let enabled = true;
  let masterGain = null;
  let ambientNodes = [];       // Currently playing {osc, gain} objects
  let ambientTimer = null;     // setTimeout ID for next cycle
  let ambientBiome = null;     // Current biome key string
  let ambientStopping = false; // Prevents reschedule during fadeout
  let ambientGain = null;      // Single gain node for mute/unmute control

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(v) { enabled = v; }

  function isEnabled() { return enabled; }

  // Helper: create a gain node with envelope
  function env(attack, decay, sustain, release, duration) {
    if (!ctx || !enabled) return null;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(1, now + attack);
    g.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    g.gain.setValueAtTime(sustain, now + duration - release);
    g.gain.linearRampToValueAtTime(0, now + duration);
    g.connect(masterGain);
    return { gain: g, now };
  }

  // Helper: play oscillator with envelope
  function osc(type, freq, duration, adsr, detune) {
    const e = env(adsr[0], adsr[1], adsr[2], adsr[3], duration);
    if (!e) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    o.connect(e.gain);
    o.start(e.now);
    o.stop(e.now + duration + 0.05);
  }

  // Helper: noise burst
  function noise(duration, adsr) {
    const e = env(adsr[0], adsr[1], adsr[2], adsr[3], duration);
    if (!e) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    // Bandpass filter for shaping
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;
    src.connect(filter);
    filter.connect(e.gain);
    src.start(e.now);
    src.stop(e.now + duration + 0.05);
  }

  // === SOUND EFFECTS ===

  function step() {
    if (!ctx || !enabled) return;
    resume();
    osc('sine', 80, 0.04, [0.005, 0.01, 0.2, 0.02]);
  }

  function hit() {
    if (!ctx || !enabled) return;
    resume();
    noise(0.08, [0.005, 0.02, 0.5, 0.04]);
    osc('sawtooth', 200, 0.06, [0.005, 0.02, 0.3, 0.02]);
  }

  function playerHit() {
    if (!ctx || !enabled) return;
    resume();
    // Dissonant chord
    osc('sawtooth', 150, 0.12, [0.005, 0.03, 0.4, 0.06]);
    osc('sawtooth', 178, 0.12, [0.005, 0.03, 0.4, 0.06]);
    noise(0.1, [0.005, 0.02, 0.3, 0.05]);
  }

  function kill() {
    if (!ctx || !enabled) return;
    resume();
    noise(0.15, [0.005, 0.04, 0.4, 0.08]);
    osc('square', 300, 0.08, [0.005, 0.02, 0.5, 0.03]);
    osc('square', 150, 0.12, [0.03, 0.03, 0.3, 0.05]);
  }

  function pickup() {
    if (!ctx || !enabled) return;
    resume();
    osc('sine', 523, 0.08, [0.005, 0.02, 0.6, 0.03]);
    setTimeout(() => osc('sine', 659, 0.1, [0.005, 0.02, 0.5, 0.04]), 60);
  }

  function gold() {
    if (!ctx || !enabled) return;
    resume();
    osc('sine', 880, 0.06, [0.005, 0.01, 0.5, 0.03]);
    setTimeout(() => osc('sine', 1108, 0.06, [0.005, 0.01, 0.4, 0.03]), 40);
    setTimeout(() => osc('sine', 1318, 0.08, [0.005, 0.01, 0.3, 0.04]), 80);
  }

  function levelUp() {
    if (!ctx || !enabled) return;
    resume();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => osc('sine', freq, 0.2, [0.01, 0.05, 0.4, 0.1]), i * 100);
    });
  }

  function descend() {
    if (!ctx || !enabled) return;
    resume();
    osc('sine', 220, 0.5, [0.01, 0.1, 0.3, 0.3]);
    osc('sine', 110, 0.6, [0.05, 0.1, 0.2, 0.4], 5);
  }

  function death() {
    if (!ctx || !enabled) return;
    resume();
    const notes = [293, 261, 220, 174];
    notes.forEach((freq, i) => {
      setTimeout(() => osc('sawtooth', freq, 0.4, [0.01, 0.05, 0.3, 0.3]), i * 150);
    });
    setTimeout(() => noise(0.3, [0.01, 0.05, 0.2, 0.2]), 500);
  }

  function victory() {
    if (!ctx || !enabled) return;
    resume();
    const notes = [523, 659, 784, 1047, 784, 1047, 1318];
    notes.forEach((freq, i) => {
      setTimeout(() => osc('sine', freq, 0.25, [0.01, 0.05, 0.5, 0.12]), i * 120);
    });
  }

  function useItem() {
    if (!ctx || !enabled) return;
    resume();
    osc('sine', 440, 0.1, [0.005, 0.02, 0.5, 0.05]);
    setTimeout(() => osc('sine', 554, 0.12, [0.005, 0.02, 0.4, 0.06]), 60);
  }

  function door() {
    if (!ctx || !enabled) return;
    resume();
    noise(0.06, [0.005, 0.01, 0.4, 0.03]);
    osc('sine', 120, 0.08, [0.005, 0.02, 0.3, 0.04]);
  }

  function miss() {
    if (!ctx || !enabled) return;
    resume();
    noise(0.05, [0.005, 0.01, 0.2, 0.03]);
  }

  function crit() {
    if (!ctx || !enabled) return;
    resume();
    noise(0.12, [0.005, 0.03, 0.6, 0.06]);
    osc('sawtooth', 400, 0.08, [0.005, 0.02, 0.6, 0.03]);
    osc('square', 600, 0.06, [0.01, 0.02, 0.5, 0.02]);
  }

  function merchant() {
    if (!ctx || !enabled) return;
    resume();
    osc('sine', 392, 0.15, [0.01, 0.04, 0.4, 0.08]);
    setTimeout(() => osc('sine', 494, 0.15, [0.01, 0.04, 0.4, 0.08]), 120);
    setTimeout(() => osc('sine', 588, 0.2, [0.01, 0.04, 0.3, 0.12]), 240);
  }

  function boss() {
    if (!ctx || !enabled) return;
    resume();
    osc('sawtooth', 65, 0.8, [0.05, 0.2, 0.4, 0.4]);
    osc('sawtooth', 98, 0.6, [0.1, 0.1, 0.3, 0.3], 10);
    noise(0.3, [0.02, 0.08, 0.2, 0.15]);
  }

  function danger() {
    if (!ctx || !enabled) return;
    resume();
    // Two low heartbeat-like pulses
    osc('sine', 110, 0.12, [0.005, 0.02, 0.5, 0.07]);
    osc('sine', 82, 0.10, [0.005, 0.02, 0.4, 0.06]);
    setTimeout(() => {
      osc('sine', 110, 0.10, [0.005, 0.02, 0.4, 0.06]);
      osc('sine', 82, 0.08, [0.005, 0.02, 0.3, 0.05]);
    }, 220);
  }

  // Title / intro music — mysterious descending melody with reverb-like echoes
  function titleMusic() {
    if (!ctx || !enabled) return;
    resume();

    // Deep ambient drone
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    const now = ctx.currentTime;
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55; // low A
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.15, now + 0.8);
    droneGain.gain.setValueAtTime(0.15, now + 3.5);
    droneGain.gain.linearRampToValueAtTime(0, now + 5);
    droneOsc.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start(now);
    droneOsc.stop(now + 5.1);

    // Second drone — fifth above, detuned slightly for width
    const drone2 = ctx.createOscillator();
    const droneG2 = ctx.createGain();
    drone2.type = 'sine';
    drone2.frequency.value = 82;
    drone2.detune.value = -8;
    droneG2.gain.setValueAtTime(0, now);
    droneG2.gain.linearRampToValueAtTime(0.08, now + 1);
    droneG2.gain.setValueAtTime(0.08, now + 3);
    droneG2.gain.linearRampToValueAtTime(0, now + 4.5);
    drone2.connect(droneG2);
    droneG2.connect(masterGain);
    drone2.start(now);
    drone2.stop(now + 4.6);

    // Descending melody — haunting minor key notes
    const melody = [
      { freq: 440, time: 0.5, dur: 0.6 },   // A4
      { freq: 392, time: 1.1, dur: 0.5 },   // G4
      { freq: 330, time: 1.7, dur: 0.7 },   // E4
      { freq: 294, time: 2.5, dur: 0.5 },   // D4
      { freq: 262, time: 3.1, dur: 0.8 },   // C4
      { freq: 220, time: 4.0, dur: 1.0 },   // A3 — final note, longer
    ];

    melody.forEach(note => {
      // Main note
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = note.freq;
      g.gain.setValueAtTime(0, now + note.time);
      g.gain.linearRampToValueAtTime(0.18, now + note.time + 0.04);
      g.gain.linearRampToValueAtTime(0.1, now + note.time + note.dur * 0.3);
      g.gain.linearRampToValueAtTime(0, now + note.time + note.dur);
      o.connect(g);
      g.connect(masterGain);
      o.start(now + note.time);
      o.stop(now + note.time + note.dur + 0.05);

      // Echo / ghost note (quieter, slightly delayed)
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = note.freq * 2; // octave up
      g2.gain.setValueAtTime(0, now + note.time + 0.12);
      g2.gain.linearRampToValueAtTime(0.04, now + note.time + 0.16);
      g2.gain.linearRampToValueAtTime(0, now + note.time + note.dur * 0.8);
      o2.connect(g2);
      g2.connect(masterGain);
      o2.start(now + note.time + 0.12);
      o2.stop(now + note.time + note.dur + 0.1);
    });
  }

  // === AMBIENT BIOME AUDIO ===

  const BIOME_AUDIO = {
    sewers: [
      { type: 'sine', freq: 55, gain: 0.10 },
      { type: 'sine', freq: 110, gain: 0.08, detune: -6 },
      { type: 'sine', freq: 220, gain: 0.05 },
      { type: 'noise', freq: 400, gain: 0.05, filter: 'bandpass' }
    ],
    crypt: [
      { type: 'sine', freq: 73.4, gain: 0.10 },
      { type: 'triangle', freq: 110, gain: 0.07, detune: 5 },
      { type: 'triangle', freq: 220, gain: 0.05, detune: -10 },
      { type: 'sine', freq: 146.8, gain: 0.04 },
      { type: 'noise', freq: 200, gain: 0.04, filter: 'bandpass' }
    ],
    citadel: [
      { type: 'sawtooth', freq: 49, gain: 0.07 },
      { type: 'sine', freq: 98, gain: 0.10, detune: 3 },
      { type: 'triangle', freq: 196, gain: 0.06, detune: -5 },
      { type: 'triangle', freq: 130.8, gain: 0.05 },
      { type: 'noise', freq: 600, gain: 0.03, filter: 'bandpass' }
    ],
    abyss: [
      { type: 'sine', freq: 41.2, gain: 0.12 },
      { type: 'sine', freq: 82.4, gain: 0.08, detune: -12 },
      { type: 'sine', freq: 164.8, gain: 0.05 },
      { type: 'noise', freq: 150, gain: 0.06, filter: 'lowpass' }
    ],
    sanctum: [
      { type: 'sine', freq: 65.4, gain: 0.09 },
      { type: 'sine', freq: 131, gain: 0.07, detune: 4 },
      { type: 'sine', freq: 98, gain: 0.05 },
      { type: 'triangle', freq: 262, gain: 0.04 },
      { type: 'sine', freq: 523, gain: 0.025, lfo: { rate: 0.3, depth: 8 } }
    ],
    boss: [
      { type: 'sawtooth', freq: 36.7, gain: 0.09 },
      { type: 'sine', freq: 55, gain: 0.09, detune: 15 },
      { type: 'sine', freq: 110, gain: 0.06 },
      { type: 'noise', freq: 300, gain: 0.05, filter: 'bandpass', Q: 2.0 }
    ]
  };

  function scheduleAmbientCycle(biomeKey) {
    if (ambientStopping) return;
    if (!ctx || !enabled) return;

    // iOS: wait for AudioContext to resume before scheduling
    if (ctx.state === 'suspended') {
      const onResume = () => {
        ctx.removeEventListener('statechange', onResume);
        if (!ambientStopping) scheduleAmbientCycle(biomeKey);
      };
      ctx.addEventListener('statechange', onResume);
      return;
    }

    const layers = BIOME_AUDIO[biomeKey];
    if (!layers) return;

    const now = ctx.currentTime;
    const fadeIn = 2;
    const hold = 4;
    const fadeOut = 2;
    const total = fadeIn + hold + fadeOut; // 8s

    layers.forEach(layer => {
      const layerGain = ctx.createGain();
      // Envelope: fade in → hold → fade out
      layerGain.gain.setValueAtTime(0, now);
      layerGain.gain.linearRampToValueAtTime(layer.gain, now + fadeIn);
      layerGain.gain.setValueAtTime(layer.gain, now + fadeIn + hold);
      layerGain.gain.linearRampToValueAtTime(0, now + total);
      layerGain.connect(ambientGain);

      if (layer.type === 'noise') {
        // Noise layer with filter
        const bufferSize = Math.ceil(ctx.sampleRate * (total + 0.1));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = layer.filter || 'bandpass';
        filter.frequency.value = layer.freq;
        filter.Q.value = layer.Q || 1;
        src.connect(filter);
        filter.connect(layerGain);
        src.start(now);
        src.stop(now + total + 0.05);
        ambientNodes.push({ src, gain: layerGain });
      } else {
        // Oscillator layer
        const o = ctx.createOscillator();
        o.type = layer.type;
        o.frequency.value = layer.freq;
        if (layer.detune) o.detune.value = layer.detune;

        // LFO vibrato (for Sanctum crystalline layer)
        if (layer.lfo) {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.type = 'sine';
          lfo.frequency.value = layer.lfo.rate;
          lfoGain.gain.value = layer.lfo.depth;
          lfo.connect(lfoGain);
          lfoGain.connect(o.detune);
          lfo.start(now);
          lfo.stop(now + total + 0.05);
        }

        o.connect(layerGain);
        o.start(now);
        o.stop(now + total + 0.05);
        ambientNodes.push({ osc: o, gain: layerGain });
      }
    });

    // Schedule next overlapping cycle at 6s (2s before current ends)
    ambientTimer = setTimeout(() => {
      if (!ambientStopping) scheduleAmbientCycle(biomeKey);
    }, (fadeIn + hold) * 1000); // 6000ms
  }

  function startAmbient(biomeKey) {
    if (!ctx) init();
    if (ambientBiome === biomeKey && !ambientStopping) return; // same biome, no-op
    if (ambientBiome !== null) stopAmbient();

    ambientStopping = false;
    ambientBiome = biomeKey;

    if (!ambientGain) {
      ambientGain = ctx.createGain();
      ambientGain.gain.value = 1.0;
      ambientGain.connect(masterGain);
    } else {
      // Restore gain in case it was faded out
      ambientGain.gain.cancelScheduledValues(ctx.currentTime);
      ambientGain.gain.setValueAtTime(1.0, ctx.currentTime);
    }

    if (!enabled) return; // respect mute — will start when re-enabled
    scheduleAmbientCycle(biomeKey);
  }

  function stopAmbient() {
    ambientStopping = true;
    if (ambientTimer) {
      clearTimeout(ambientTimer);
      ambientTimer = null;
    }
    // Fade out the master ambient gain over 1.5s
    if (ambientGain && ctx) {
      const now = ctx.currentTime;
      ambientGain.gain.cancelScheduledValues(now);
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
      ambientGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }
    // Let running nodes self-stop on their own schedule
    ambientNodes = [];
    ambientBiome = null;
  }

  function setAmbientMuted(muted) {
    if (!ambientGain || !ctx) return;
    const now = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(muted ? 0 : 1.0, now + 0.3);
  }

  return {
    init, resume, setEnabled, isEnabled,
    step, hit, playerHit, kill, pickup, gold,
    levelUp, descend, death, victory, useItem,
    door, miss, crit, merchant, boss, danger, titleMusic,
    startAmbient, stopAmbient, setAmbientMuted
  };
})();
