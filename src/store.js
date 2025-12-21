import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Simple cross-tab sync: BroadcastChannel if available, else "storage" events
const bc = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("kk-game")
  : null;

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
  roundBank: 0,         // sum of revealed answer points
  buzzingTeam: null,    // "A" | "B" | null

  teamA: { name: "Team A", score: 0, strikes: 0 },
  teamB: { name: "Team B", score: 0, strikes: 0 },

  sheetId: localStorage.getItem("sheetId") || "",
};

const recalcBank = (round) =>
  (round?.answers || [])
    .filter(a => a.revealed)
    .reduce((sum, a) => sum + (Number(a.points) || 0), 0);

const pushOut = (state) => {
  if (bc) bc.postMessage({ type: "sync", payload: state });
};

export const useGame = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ----- setters -----
      setTitle: (title) => set((s) => {
        const ns = { ...s, title };
        pushOut(ns);
        return ns;
      }),
      setTitleFont: (titleFont) => set((s) => {
        const ns = { ...s, titleFont };
        pushOut(ns);
        return ns;
      }),

      setRound: (round) => set((s) => {
        const clean = {
          question: round?.question || "",
          multiplier: Number(round?.multiplier) || 1,
          answers: (round?.answers || []).map(a => ({
            text: a.text || "",
            points: Number(a.points) || 0,
            revealed: !!a.revealed && !!a.text && Number(a.points) > 0
          })),
        };
        const ns = {
          ...s,
          round: clean,
          roundBank: recalcBank(clean),
          buzzingTeam: null,
          teamA: { ...s.teamA, strikes: 0 },
          teamB: { ...s.teamB, strikes: 0 },
        };
        pushOut(ns);
        return ns;
      }),

      // Reveal/hide one answer (host 1–8)
      reveal: (index) => set((s) => {
        const r = { ...s.round, answers: s.round.answers.map((a, i) =>
          i === index ? { ...a, revealed: !a.revealed } : a
        )};
        const ns = { ...s, round: r, roundBank: recalcBank(r) };
        pushOut(ns);
        return ns;
      }),

      // Buzz control
      buzz: (team) => set((s) => {
        const ns = { ...s, buzzingTeam: team === "A" ? "A" : "B" };
        pushOut(ns);
        return ns;
      }),
      resetBuzz: () => set((s) => {
        const ns = { ...s, buzzingTeam: null };
        pushOut(ns);
        return ns;
      }),

      // Strikes
      addStrike: (team) => set((s) => {
        const key = team === "B" ? "teamB" : "teamA";
        const cur = s[key];
        const next = Math.min(3, (cur.strikes || 0) + 1);
        const ns = { ...s, [key]: { ...cur, strikes: next } };
        pushOut(ns);
        return ns;
      }),
      clearStrikes: () => set((s) => {
        const ns = {
          ...s,
          teamA: { ...s.teamA, strikes: 0 },
          teamB: { ...s.teamB, strikes: 0 },
        };
        pushOut(ns);
        return ns;
      }),

      // Bank award (this was the main issue)
      awardRound: (team) => set((s) => {
        const bank = Number(s.roundBank) || 0;
        const mult = Number(s.round?.multiplier) || 1;
        const delta = bank * mult;

        const key = team === "B" ? "teamB" : "teamA";
        const cur = s[key];

        const ns = {
          ...s,
          [key]: { ...cur, score: (Number(cur.score) || 0) + delta },
          roundBank: 0,
          buzzingTeam: null,
          teamA: { ...s.teamA, strikes: 0 },
          teamB: { ...s.teamB, strikes: 0 },
        };
        pushOut(ns);
        return ns;
      }),

      // Scores/tools
      resetScores: () => set((s) => {
        const ns = {
          ...s,
          teamA: { ...s.teamA, score: 0, strikes: 0 },
          teamB: { ...s.teamB, score: 0, strikes: 0 },
          roundBank: recalcBank(s.round),
          buzzingTeam: null,
        };
        pushOut(ns);
        return ns;
      }),
    }),
    {
      name: "kk-game-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => s, // persist everything
    }
  )
);

// Listen to BroadcastChannel
if (bc) {
  bc.onmessage = (ev) => {
    if (ev?.data?.type === "sync" && ev.data.payload) {
      // hydrate store with incoming state snapshot
      const next = ev.data.payload;
      useGame.setState(next, false, "bc-sync");
    }
  };
}

// Also listen to storage events (fallback)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "kk-game-v1") {
      const data = JSON.parse(e.newValue || "{}")?.state;
      if (data) useGame.setState(data, false, "storage-sync");
    }
  });
}
