import { create } from "zustand";

/** ---- Cross-tab sync helpers ---- */
const BC_NAME = "kk-game";
const STORAGE_KEY = "kk_state";

const channel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(BC_NAME)
    : null;

const readPersist = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Only the serializable, gameplay data (no functions)
const snapshot = (s) => ({
  title: s.title,
  titleFont: s.titleFont,
  sheetId: s.sheetId,
  hostMode: s.hostMode,

  round: s.round,
  roundBank: s.roundBank,

  teamA: s.teamA,
  teamB: s.teamB,
  buzzingTeam: s.buzzingTeam,
});

const persistAndBroadcast = (get) => {
  const snap = snapshot(get());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    if (channel) channel.postMessage(snap);
  } catch {}
};

/** ---- Default data ---- */
const defaultState = {
  title: "K'mmunity Klash",
  titleFont: "Bangers",
  sheetId:
    (typeof window !== "undefined" &&
      new URLSearchParams(location.search).get("sheet")) ||
    (typeof window !== "undefined" && localStorage.getItem("sheetId")) ||
    "",
  hostMode: true,

  round: { question: "", multiplier: 1, answers: [] }, // answers: [{text,points,revealed}]
  roundBank: 0,

  teamA: { name: "Team A", score: 0, strikes: 0 },
  teamB: { name: "Team B", score: 0, strikes: 0 },
  buzzingTeam: "",
};

export const useGame = create((set, get) => ({
  ...defaultState,
  ...(readPersist() || {}),

  /** UI toggles / metadata */
  toggleHost: () => {
    set((s) => ({ hostMode: !s.hostMode }));
    persistAndBroadcast(get);
  },
  setTitle: (title) => {
    set({ title });
    persistAndBroadcast(get);
  },
  setTitleFont: (titleFont) => {
    set({ titleFont });
    persistAndBroadcast(get);
  },

  /** Round management */
  setRound: (round) => {
    const next = {
      question: String(round.question || ""),
      multiplier: Number(round.multiplier) || 1,
      answers: (round.answers || []).map((a) => ({
        text: String(a.text || ""),
        points: Number(a.points) || 0,
        revealed: false,
      })),
    };
    set({ round: next, roundBank: 0, buzzingTeam: "" });
    persistAndBroadcast(get);
  },

  /** Reveal / hide toggles automatically adjust bank */
  reveal: (index) => {
    const s = get();
    const was = s.round.answers[index]?.revealed;
    const pts = Number(s.round.answers[index]?.points || 0);

    const answers = s.round.answers.map((a, i) =>
      i === index ? { ...a, revealed: !a.revealed } : a
    );
    const round = { ...s.round, answers };
    const roundBank = Math.max(0, s.roundBank + (was ? -pts : pts));

    set({ round, roundBank });
    persistAndBroadcast(get);
  },
  hide: (index) => get().reveal(index),

  /** Strikes */
  addStrike: (team) => {
    const key = team === "A" ? "teamA" : "teamB";
    const t = get()[key];
    const strikes = Math.min(3, (t?.strikes || 0) + 1);
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

  /** Buzz */
  buzz: (team) => {
    set({ buzzingTeam: team });
    persistAndBroadcast(get);
  },
  resetBuzz: () => {
    set({ buzzingTeam: "" });
    persistAndBroadcast(get);
  },

  /** Award bank to winner and reset bank/strikes */
  awardRound: (team) => {
    const s = get();
    const key = team === "A" ? "teamA" : "teamB";
    const gain = s.roundBank * (s.round?.multiplier || 1);
    set({
      [key]: { ...s[key], score: s[key].score + gain },
      roundBank: 0,
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

/** ---- Inbound syncs ---- */
// BroadcastChannel
if (channel) {
  channel.onmessage = (e) => {
    const snap = e.data;
    useGame.setState(snap, false);
  };
}
// storage event (covers Safari and when tabs re-open)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (ev) => {
    if (ev.key === STORAGE_KEY && ev.newValue) {
      try {
        useGame.setState(JSON.parse(ev.newValue), false);
      } catch {}
    }
  });
}

