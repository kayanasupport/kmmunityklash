function makeAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.9;
  return audio;
}

const buzz = makeAudio("/sfx/buzz.mp3");
const strike = makeAudio("/sfx/strike.mp3");
const reveal = makeAudio("/sfx/reveal.mp3");
const award  = makeAudio("/sfx/award.mp3");

async function prime() {
  try {
    await reveal.play(); reveal.pause(); reveal.currentTime = 0;
    await strike.play(); strike.pause(); strike.currentTime = 0;
    await buzz.play();   buzz.pause();   buzz.currentTime = 0;
    await award.play();  award.pause();  award.currentTime = 0;
  } catch {}
}

function safePlay(fn) {
  try { const res = fn && fn(); if (res && typeof res.then === "function") res.catch(() => {}); } catch {}
}

export default { buzz, strike, reveal, award, prime, safePlay };
