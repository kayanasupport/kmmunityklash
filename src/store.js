import { create } from "zustand";

/**
 * Cross-tab sync:
 * - We persist minimal state into localStorage under 'kk_state'
 * - We broadcast changes via BroadcastChannel('kk-game') so /studio mirrors host instantly
 */
const channel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("kk-game")
  : null;

const STORAGE_KEY = "kk_state";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistAndBroadcast(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (channel) channel.postMessage(state);
  } catch {}
}

const defaultState = {
  title: "K'mmunity Klash",
  titleFont: "Bangers",
  sheetId: (typeof window !== "undefined" && new URLSearchParams(location.search).get("sheet")) ||
           (typeof window !== "undefined" && localStorage.getItem("sheetId")) ||
           "",
  hostMode: true,

  round: { question: "", multiplier: 1, answers: [] },
  roundBank: 0,

  teamA: { name: "Team A", score: 0, strikes: 0 },
  teamB: { name: "Team B", score: 0, strikes: 0 },
  buzzingTeam: "", // "A" | "B" | ""

  // internal guard: prevents feedback loop when applying incoming broadcast
  _applyExternal: false,
};

export const useGame = create((set, get) => ({
  ...defaultState,
  ...(loadPersisted() || {}),

  /** UI controls */
  toggleHost: () => set((s) => ({ hostMode: !s.hostMode }), true),

  setTitle: (title) => {
    set({ title }, true);
    persistAndBroadcast({ ...get(), title });
  },
  setTitleFont: (titleFont) => {
    set({ titleFont }, true);
    persistAndBroadcast({ ...get(), titleFont });
  },

  /** Load a round object {question, multiplier, answers[]} */
  setRound: (round) => {
    const r = {
      question: round.question,
      multiplier: Number(round.multiplier) || 1,
      answers: (round.answers || []).map((a) => ({ ...a, revealed: false })),
    };
    set({ round: r, roundBank: 0, buzzingTeam: "" }, true);
    persistAndBroadcast({ ...get(), round: r, roundBank: 0, buzzingTeam: "" });
  },

  /** Reveal/hide answers */
  reveal: (index) => {
    const s = get();
    const answers = s.round.answers.map((a, i) =>
      i === index ? { ...a, revealed: !a.revealed } : a
    );
    const delta = answers[index].revealed ? s.round.answers[index].points : -s.round.answers[index].points;
    const next = { ...s.round, answers };
    set({ round: next, roundBank: Math.max(0, s.roundBank + delta) }, true);
    persistAndBroadcast({ ...get(), round: next, roundBank: Math.max(0, s.roundBank + delta) });
  },
  hide: (index) => get().reveal(index), // toggle

  /** Strikes */
  addStrike: (team) => {
    const key = team === "A" ? "teamA" : "teamB";
    const t = { ...get()[key], strikes: Math.min(3, get()[key].strikes + 1) };
    const next = { ...get(), [key]: t };
    set(next, true);
    persistAndBroadcast(next);
  },
  clearStrikes: () => {
    const next = { ...get(), teamA: { ...get().teamA, strikes: 0 }, teamB: { ...get().teamB, strikes: 0 } };
    set(next, true);
    persistAndBroadcast(next);
  },

  /** Buzz */
  buzz: (team) => {
    const next = { ...get(), buzzingTeam: team };
    set(next, true);
    persistAndBroadcast(next);
  },
  resetBuzz: () => {
    const next = { ...get(), buzzingTeam: "" };
    set(next, true);
    persistAndBroadcast(next);
  },

  /** Award bank to winner */
  awardRound: (team) => {
    const s = get();
    const key = team === "A" ? "teamA" : "teamB";
    const gain = s.roundBank * (s.round?.multiplier || 1);
    const t = { ...s[key], score: s[key].score + gain };
    const next = { ...s, [key]: t, roundBank: 0, teamA: { ...s.teamA, strikes: 0 }, teamB: { ...s.teamB, strikes: 0 } };
    set(next, true);
    persistAndBroadcast(next);
  },
  resetScores: () => {
    const next = {
      ...get(),
      teamA: { name: "Team A", score: 0, strikes: 0 },
      teamB: { name: "Team B", score: 0, strikes: 0 },
      roundBank: 0,
      buzzingTeam: "",
    };
    set(next, true);
    persistAndBroadcast(next);
  },

  updateTeam: (key, patch) => {
    const next = { ...get(), [key]: { ...get()[key], ...patch } };
    set(next, true);
    persistAndBroadcast(next);
  },
}));

/** Receive external updates from another tab */
if (channel) {
  channel.onmessage = (e) => {
    try {
      const incoming = e.data;
      // apply selective fields
      useGame.setState({ ...incoming, _applyExternal: true }, false);
    } catch {}
  };
}

/** Sync from localStorage on first load (e.g., if Studio opens later) */
try {
  const persisted = loadPersisted();
  if (persisted) {
    useGame.setState({ ...persisted, _applyExternal: true }, false);
  }
} catch {}
