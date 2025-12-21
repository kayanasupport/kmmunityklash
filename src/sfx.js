// src/sfx.js
// Tiny helper that returns a preloaded <audio> you can .play()
function makeAudio(path) {
  const a = new Audio(path);
  a.preload = "auto";
  a.crossOrigin = "anonymous";
  return a;
}

/**
 * Export a single object with Audio elements so existing calls like:
 *   sfx.reveal.currentTime = 0; sfx.reveal.play();
 * continue to work exactly as before.
 */
export const sfx = {
  buzz:   makeAudio("/sfx/buzz.mp3"),
  strike: makeAudio("/sfx/strike.mp3"),
  reveal: makeAudio("/sfx/reveal.mp3"),
  award:  makeAudio("/sfx/award.mp3"),
};

// Optional convenience helpers (use or ignore)
export const playBuzz   = () => { sfx.buzz.currentTime = 0;   void sfx.buzz.play(); };
export const playStrike = () => { sfx.strike.currentTime = 0; void sfx.strike.play(); };
export const playReveal = () => { sfx.reveal.currentTime = 0; void sfx.reveal.play(); };
export const playAward  = () => { sfx.award.currentTime = 0;  void sfx.award.play(); };
