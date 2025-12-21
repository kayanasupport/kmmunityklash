import { create } from "zustand";

/* ---------- Cross-tab sync ---------- */
const BC =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("kk-game")
    : null;
const STORAGE_KEY = "kk_state";

const readPersist = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};

// Only serialize gameplay primitives (no functions)
const snap = (s) => ({
  title: s.title,
  titleFont: s.titleFont,
  sheetId: s.sheetId,
  hostMode: s.hostMode,
  round: s.round,         // {question, multiplier, answers[{text,points,revealed}]}
  roundBank: s.roundBank, // numeric
  teamA: s.teamA,         // {name, score, strikes}
  teamB: s.teamB,
  buzzingTeam: s.buzzingTeam
});
const persistAndBroadcast = (get) => {
  const s = snap(get());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (BC) BC.postMessage(s);
  } catch {}
};

/* ---------- Helpers ---------- */
const sumRevealed = (answers=[]) =>
  answers.reduce((t,a)=>t + (a?.revealed ? (Number(a.points)||0) : 0), 0);

/* ---------- Defaults ---------- */
const defaults = {
  title: "K'mmunity Klash",
  titleFont: "Bangers",
  sheetId:
    (typeof window !== "undefined" &&
      new URLSearchParams(location.search).get("sheet")) ||
    (typeof window !== "undefined" && localStorage.getItem("sheetId")) ||
    "",
  hostMode: true,

  round: { question: "", multiplier: 1, answers: [] },
  roundBank: 0,

  teamA: { name: "Team A", score: 0, strikes: 0 },
  teamB: { name: "Team B", score: 0, strikes: 0 },
  buzzingTeam: "",
};

export const useGame = create((set, get) => ({
  ...defaults,
  ...(readPersist() || {}),

  /* ----- Meta ----- */
  toggleHost: () => { set((s)=>({hostMode:!s.hostMode})); persistAndBroadcast(get); },
  setTitle: (title) => { set({ title }); persistAndBroadcast(get); },
  setTitleFont: (titleFont) => { set({ titleFont }); persistAndBroadcast(get); },

  /* ----- Round management ----- */
  setRound: (round) => {
    const next = {
      question: String(round.question || ""),
      multiplier: Number(round.multiplier) || 1,
      answers: (round.answers || []).map((a)=>({
        text: String(a.text || ""),
        points: Number(a.points) || 0,
        revealed: false,
      })),
    };
    set({ round: next, roundBank: 0, buzzingTeam: "" });
    persistAndBroadcast(get);
  },

  /* ----- Reveal / hide (Bank is recomputed from revealed answers) ----- */
  reveal: (index) => {
    const s = get();
    const answers = s.round.answers.map((a,i)=>
      i===index ? { ...a, revealed: !a.revealed } : a
    );
    const round = { ...s.round, answers };
    const roundBank = sumRevealed(answers);
    set({ round, roundBank });
    persistAndBroadcast(get);
  },
  hide: (i)=>get().reveal(i),

  /* ----- Strikes ----- */
  addStrike: (team) => {
    const key = team === "A" ? "teamA" : "teamB";
    const t = get()[key];
    const strikes = Math.min(3, Number(t?.strikes||0) + 1);
    set({ [key]: { ...t, strikes } });
    persistAndBroadcast(get);
  },
  clearStrikes: () => {
    set({
      teamA: { ...get().teamA, strikes: 0 },
      teamB: { ...get().teamB, strikes: 0 },
    });
    persistAndBroadcast(get);
  },

  /* ----- Buzz ----- */
  buzz: (team)=>{ set({buzzingTeam: team}); persistAndBroadcast(get); },
  resetBuzz: ()=>{ set({buzzingTeam:""}); persistAndBroadcast(get); },

  /* ----- Award bank ----- */
  awardRound: (team) => {
    const s = get();
    const key = team === "A" ? "teamA" : "teamB";
    const bank = Number(s.roundBank) || 0;
    const mult = Number(s.round?.multiplier) || 1;
    const gain = bank * mult;

    const cur = s[key];
    const nextTeam = { ...cur, score: (Number(cur.score)||0) + gain };

    set({
      [key]: nextTeam,
      roundBank: 0,
      buzzingTeam: "",
      teamA: { ...s.teamA, strikes: 0 },
      teamB: { ...s.teamB, strikes: 0 },
    });
    persistAndBroadcast(get);
  },

  resetScores: () => {
    set({
      teamA: { name: "Team A", score: 0, strikes: 0 },
      teamB: { name: "Team B", score: 0, strikes: 0 },
      roundBank: 0,
      buzzingTeam: "",
    });
    persistAndBroadcast(get);
  },

  updateTeam: (key, patch) => {
    set({ [key]: { ...get()[key], ...patch } });
    persistAndBroadcast(get);
  },
}));

/* ---------- Inbound sync ---------- */
if (BC) {
  BC.onmessage = (e) => { try { useGame.setState(e.data, false); } catch {} };
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (ev)=>{
    if (ev.key === STORAGE_KEY && ev.newValue) {
      try { useGame.setState(JSON.parse(ev.newValue), false); } catch {}
    }
  });
}
