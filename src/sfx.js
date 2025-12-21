// src/sfx.js
// Lightweight SFX helper (preloads audio, falls back to WebAudio beep if files are missing)
const sounds = {
  buzz:  new Audio('/sfx/buzz.mp3'),
  strike:new Audio('/sfx/strike.mp3'),
  reveal:new Audio('/sfx/reveal.mp3'),
  award: new Audio('/sfx/award.mp3')
};

let muted = false;
let volume = 0.85;

Object.values(sounds).forEach(a => {
  a.preload = 'auto';
  a.volume = volume;
});

function beep(freq = 880, dur = 160) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, dur);
  } catch { /* ignore */ }
}

export const SFX = {
  play(name) {
    if (muted) return;
    const a = sounds[name];
    if (!a) return;
    try {
      // rewind + play; if blocked or missing, beep fallback
      a.currentTime = 0;
      a.volume = volume;
      const p = a.play();
      if (p && p.catch) p.catch(() => beep());
    } catch { beep(); }
  },
  setMuted(v) { muted = !!v; },
  setVolume(v = 0.85) {
    volume = Math.min(1, Math.max(0, v));
    Object.values(sounds).forEach(a => a.volume = volume);
  },
  isMuted() { return muted; },
  getVolume() { return volume; }
};
