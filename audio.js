// Glyph Depths — Procedural Audio via Web Audio API
// No asset files needed — all sounds generated from oscillators and noise

const Audio = (() => {
  let ctx = null;
  let enabled = true;
  let masterGain = null;

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

  return {
    init, resume, setEnabled, isEnabled,
    step, hit, playerHit, kill, pickup, gold,
    levelUp, descend, death, victory, useItem,
    door, miss, crit, merchant, boss
  };
})();
