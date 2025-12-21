// Centralized audio loader & safe play helpers
// Only the Host should trigger sounds. Studio mirrors visuals via broadcast.

function makeAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

const sounds = {
  buzz: makeAudio("/sfx/buzz.mp3"),
  strike: makeAudio("/sfx/strike.mp3"),
  reveal: makeAudio("/sfx/reveal.mp3"),
  award: makeAudio("/sfx/award.mp3"),
};

// safePlay(fn) runs a function that returns a Promise (e.g. audio.play()),
// swallowing any autoplay/interrupt errors so we don't crash the UI.
function safePlay(fn) {
  try {
    const res = fn && fn();
    if (res && typeof res.then === "function") {
      res.catch(() => {});
    }
  } catch {
    // ignore
  }
}

export default {
  ...sounds,
  safePlay,
};
