import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ---------- Cross-tab channel ----------
const bc =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("kk-game")
    : null;

// ---------- Serializable state helpers ----------
const SERIAL_KEYS = [
  "title",
  "titleFont",
  "hostMode",
  "round",
  "roundBank",
  "buzzingTeam",
  "teamA",
  "teamB",
  "sheetId",
];

const snapshotFrom = (s) => {
  const snap = {};
  for (const k of SERIAL_KEYS) snap[k] = s[k];
  return snap;
};

const pushOut = (state) => {
  try {
    if (bc) bc.postMessage({ type: "sync", payload: snapshotFrom(state) });
  } catch {
    // ignore cloning errors silently
  }
};

// ---------- Defaults ----------
const initialRound = {
  question: "",
  multiplier: 1,
  answers: [], // { text, points, revealed }
};

const initialState = {
  title: "K'mmunity Klash",
  titleFont: "Bangers",
  hostMode: true,

  round: initialRound,
  roundBank: 0,
  buzzingTeam: null,

  teamA: { name: "Team A", score: 0, strikes: 0 },
  teamB: { name: "Team B", score: 0, strikes: 0 },

  sheetId:
    (typeof window !== "undefined" && localStorage.getItem("sheetId")) || "",
};

// ---------- Utils ----------
const recalcBank = (round) =>
  (round?.answers || [])
    .filter((a) => a.revealed)
    .reduce((sum, a) => sum + (Number(a.points) || 0), 0);

// ---------- Store ----------
export const useGame = create(
  persist(
    (set, get) => ({
      ...initialState,

      // Title / font
      setTitle: (title) =>
        set((s) => {
          const base = snapshotFrom(s);
          const ns = { ...base, title };
          pushOut(ns);
          return ns;
        }),
      setTitleFont: (titleFont) =>
        set((s) => {
          const base = snapshotFrom(s);
          const ns = { ...base, titleFont };
          pushOut(ns);
          return ns;
        }),

      // Round load / reveal
      setRound: (round) =>
        set((s) => {
          const base = snapshotFrom(s);
          const clean = {
            question: round?.question || "",
            multiplier: Number(round?.multiplier) || 1,
            answers: (round?.answers || []).map((a) => ({
              text: a.text || "",
              points: Number(a.points) || 0,
              revealed: !!a.revealed && !!a.text && Number(a.points) > 0,
            })),
          };
          const ns = {
            ...base,
            round: clean,
            roundBank: recalcBank(clean),
            buzzingTeam: null,
            teamA: { ...base.teamA, strikes: 0 },
            teamB: { ...base.teamB, strikes: 0 },
          };
          pushOut(ns);
          return ns;
        }),

      reveal: (index) =>
        set((s) => {
          const base = snapshotFrom(s);
          const r = {
            ...base.round,
            answers: base.round.answers.map((a, i) =>
              i === index ? { ...a, revealed: !a.revealed } : a
            ),
          };
          const ns = { ...base, round: r, roundBank: recalcBank(r) };
          pushOut(ns);
          return ns;
        }),

      // Buzz
      buzz: (team) =>
        set((s) => {
          const base = snapshotFrom(s);
          const ns = { ...base, buzzingTeam: team === "B" ? "B" : "A" };
          pushOut(ns);
          return ns;
        }),
      resetBuzz: () =>
        set((s) => {
          const base = snapshotFrom(s);
          const ns = { ...base, buzzingTeam: null };
          pushOut(ns);
          return ns;
        }),

      // Strikes
      addStrike: (team) =>
        set((s) => {
          const base = snapshotFrom(s);
          const key = team === "B" ? "teamB" : "teamA";
          const cur = base[key];
          const next = Math.min(3, (cur.strikes || 0) + 1);
          const ns = { ...base, [key]: { ...cur, strikes: next } };
          pushOut(ns);
          return ns;
        }),
      clearStrikes: () =>
        set((s) => {
          const base = snapshotFrom(s);
          const ns = {
            ...base,
            teamA: { ...base.teamA, strikes: 0 },
            teamB: { ...base.teamB, strikes: 0 },
          };
          pushOut(ns);
          return ns;
        }),

      // Award
      awardRound: (team) =>
        set((s) => {
          const base = snapshotFrom(s);
          const bank = Number(base.roundBank) || 0;
          const mult = Number(base.round?.multiplier) || 1;
          const delta = bank * mult;

          const key = team === "B" ? "teamB" : "teamA";
          const cur = base[key];

          const ns = {
            ...base,
            [key]: { ...cur, score: (Number(cur.score) || 0) + delta },
            roundBank: 0,
            buzzingTeam: null,
            teamA: { ...base.teamA, strikes: 0 },
            teamB: { ...base.teamB, strikes: 0 },
          };
          pushOut(ns);
          return ns;
        }),

      // Scores/tools
      resetScores: () =>
        set((s) => {
          const base = snapshotFrom(s);
          const ns = {
            ...base,
            teamA: { ...base.teamA, score: 0, strikes: 0 },
            teamB: { ...base.teamB, score: 0, strikes: 0 },
            roundBank: recalcBank(base.round),
            buzzingTeam: null,
          };
          pushOut(ns);
          return ns;
        }),
    }),
    {
      name: "kk-game-v1",
      storage: createJSONStorage(() => localStorage),
      // Persist ONLY the serializable snapshot
      partialize: (s) => snapshotFrom(s),
    }
  )
);

// ---------- Incoming sync ----------
if (bc) {
  bc.onmessage = (ev) => {
    if (ev?.data?.type === "sync" && ev.data.payload) {
      const payload = ev.data.payload;
      useGame.setState(
        (prev) => ({ ...prev, ...payload }),
        false,
        "bc-sync"
      );
    }
  };
}

// Fallback sync for other tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "kk-game-v1") {
      try {
        const parsed = JSON.parse(e.newValue || "{}");
        const data = parsed?.state;
        if (data) useGame.setState((prev) => ({ ...prev, ...data }), false, "storage-sync");
      } catch {
        // ignore
      }
    }
  });
}
