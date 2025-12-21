import { create } from "zustand";

const STORAGE_KEY = "kk-game-v1";

function initialState(){
  return {
    title: "K'mmunity Klash",
    multiplier: 1,
    scores: { A:0, B:0 },
    strikes: { A:0, B:0 },
    bank: 0,
    round: {
      question: "Load a round...",
      answers: [],      // [{answer, points}]
      revealed: [],     // [bool, ...]
    }
  };
}

// load persisted
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return initialState();
    return { ...initialState(), ...JSON.parse(raw) };
  }catch{
    return initialState();
  }
}

export const useGame = create((set, get) => {
  const bc = new BroadcastChannel("kk");

  // broadcast helper
  const post = (type, payload={}) => {
    bc.postMessage({ type, payload });
  };

  // persist helper
  const commit = (next) => {
    set(next);
    const state = get().state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    post("state", state);
  };

  // initialize with persisted state and emit it once
  const state = load();
  set({ state, bc });

  // when other tabs send state
  bc.addEventListener("message", (e) => {
    if(e.data?.type === "state"){
      set({ state: e.data.payload });
    }
  });

  return {
    bc,
    state,
    resetScores: () => commit(s => {
      s.state.scores = {A:0, B:0};
      s.state.strikes = {A:0, B:0};
      s.state.bank = 0;
    }),
    setTitle: (title) => commit(s => { s.state.title = title }),
    setMultiplier: (m) => commit(s => { s.state.multiplier = m }),
    loadRound: (round) => commit(s => {
      // round: {question, answers:[{answer, points},...]}
      s.state.round = {
        question: round.question,
        answers: round.answers,
        revealed: new Array(round.answers.length).fill(false),
      };
      s.state.bank = 0;
      s.state.strikes = {A:0, B:0};
    }),
    reveal: (i) => commit(s => {
      const r = s.state.round;
      if(!r) return;
      if(!r.revealed[i]){
        r.revealed[i] = true;
        const pts = r.answers[i]?.points ?? 0;
        s.state.bank += pts * (s.state.multiplier || 1);
      }
    }),
    hide: (i) => commit(s => {
      const r = s.state.round;
      if(!r) return;
      if(r.revealed[i]){
        r.revealed[i] = false;
        const pts = r.answers[i]?.points ?? 0;
        s.state.bank -= pts * (s.state.multiplier || 1);
        if(s.state.bank < 0) s.state.bank = 0;
      }
    }),
    award: (team) => commit(s => {
      const t = (team === "A" ? "A" : "B");
      s.state.scores[t] += s.state.bank;
      s.state.bank = 0;
      s.state.strikes = {A:0, B:0};
    }),
    strike: (team) => commit(s => {
      const t = (team === "A" ? "A" : "B");
      s.state.strikes[t] = Math.min(3, (s.state.strikes[t] || 0) + 1);
      // tell studio to flash the big X
      const at = Date.now();
      post("strike-overlay", { team:t, at });
    }),
    clearStrikes: () => commit(s => { s.state.strikes = {A:0, B:0} }),
  };
});
