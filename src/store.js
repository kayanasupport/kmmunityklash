import { create } from "zustand";

const emptyRound = () => ({
  question: "",
  answers: [], // [{text, points, revealed:false}]
  multiplier: 1,
});

export const useGame = create((set, get) => ({
  title: "K'mmunity Klash",
  titleFont: "Bangers",
  sheetId: import.meta.env.VITE_SHEET_ID || "",
  hostMode: true,
  teamA: { name: "Team A", score: 0, strikes: 0 },
  teamB: { name: "Team B", score: 0, strikes: 0 },
  round: emptyRound(),
  roundBank: 0,
  buzzingTeam: null, // 'A' | 'B' | null
  locked: false,

  setTitle: (t) => set({ title: t }),
  setTitleFont: (font) => set({ titleFont: font }),
  toggleHost: () => set({ hostMode: !get().hostMode }),
  updateTeam: (key, patch) =>
    set({ [key]: { ...get()[key], ...patch } }),
  setRound: (round) => set({ round: round || emptyRound(), roundBank: 0, teamA: { ...get().teamA, strikes:0 }, teamB: { ...get().teamB, strikes:0 }, buzzingTeam:null, locked:false }),
  addStrike: (team) => {
    const key = team === "A" ? "teamA" : "teamB";
    const data = get()[key];
    set({ [key]: { ...data, strikes: Math.min(3, data.strikes + 1) } });
  },
  clearStrikes: () => set({ teamA: { ...get().teamA, strikes:0 }, teamB: { ...get().teamB, strikes:0 } }),
  buzz: (team) => { if(get().locked) return; set({ buzzingTeam: team, locked: true }); },
  resetBuzz: () => set({ buzzingTeam:null, locked:false }),
  reveal: (idx) => {
    const r = structuredClone(get().round);
    if(!r.answers[idx] || r.answers[idx].revealed) return;
    r.answers[idx].revealed = true;
    set({ round: r, roundBank: get().roundBank + r.answers[idx].points });
  },
  hide: (idx) => {
    const r = structuredClone(get().round);
    if(!r.answers[idx]) return;
    if(r.answers[idx].revealed){
      r.answers[idx].revealed = false;
      set({ round: r, roundBank: Math.max(0, get().roundBank - r.answers[idx].points) });
    }
  },
  awardRound: (team) => {
    const key = team === "A" ? "teamA" : "teamB";
    const mult = get().round.multiplier || 1;
    const add = get().roundBank * mult;
    const t = get()[key];
    set({ [key]: { ...t, score: t.score + add }, roundBank:0 });
  },
  resetScores: () => set({ teamA:{...get().teamA, score:0}, teamB:{...get().teamB, score:0} }),
}));
