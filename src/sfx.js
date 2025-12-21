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

function safePlay(fn) {
  try {
    const res = fn && fn();
    if (res && typeof res.then === "function") res.catch(() => {});
  } catch {}
}

export default { ...sounds, safePlay };
