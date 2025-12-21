import { create } from "zustand";

// LocalStorage key + broadcast channel
const PERSIST_KEY = "kk-game-v1";
const CH = new BroadcastChannel("kk-game-v1");

// --------- Helpers ----------
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function computeBank(answers, revealed) {
  // Sum of points of revealed answers (index aligns with answers array)
  return answers.reduce((sum, a, idx) => (revealed.includes(idx) ? sum + (a.p || 0) : sum), 0);
}

function serializableState(s) {
  // Only plain data (no functions) for cross-tab sync
  return {
    title: s.title,
    titleFont: s.titleFont,
    teamA: s.teamA,
    teamB: s.teamB,
    strikesA: s.strikesA,
    strikesB: s.strikesB,
    buzz: s.buzz,
    roundMultiplier: s.roundMultiplier,
    rounds: s.rounds,
    currentRoundIndex: s.currentRoundIndex,
    revealed: s.revealed,
    bank: s.bank,
    total: s.total
  };
}

function persistSave(s) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(serializableState(s)));
  } catch {}
}

function persistLoad() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --------- Defaults ----------
const defaultState = {
  title: "K'mmunity Klash",
  titleFont: "Bangers",
  teamA: 0,
  teamB: 0,
  strikesA: 0,
  strikesB: 0,
  buzz: null, // "A" | "B" | null
  roundMultiplier: 1,
  rounds: [], // [{ q: string, answers: [{a:string,p:number}], mult?:number }]
  currentRoundIndex: -1,
  revealed: [], // [idx, ...]
  bank: 0,
  total: 0
};

// --------- Store ----------
export const useGame = create((set, get) => ({
  ...defaultState,
  // --- core setState with broadcast + persist
  _apply(partial) {
    set(partial);
    const s = get();
    const payload = serializableState(s);
    persistSave(payload);
    try { CH.postMessage({ type: "state", payload }); } catch {}
  },

  // --- boot (load persisted)
  boot() {
    const saved = persistLoad();
    if (saved) {
      set({ ...defaultState, ...saved });
    }
    // listen for other tabs
    CH.onmessage = (evt) => {
      if (!evt?.data) return;
      if (evt.data.type === "state") {
        set({ ...evt.data.payload });
      }
      if (evt.data.type === "ping") {
        try { CH.postMessage({ type: "state", payload: serializableState(get()) }); } catch {}
      }
    };
    // Ask for latest when a new tab opens
    try { CH.postMessage({ type: "ping" }); } catch {}
  },

  // --- setup
  setTitle(title) {
    get()._apply({ title });
  },
  setTitleFont(titleFont) {
    get()._apply({ titleFont });
  },
  setMultiplier(n) {
    const m = clamp(+n || 1, 1, 4);
    get()._apply({ roundMultiplier: m, bank: computeBank(get().rounds[get().currentRoundIndex]?.answers || [], get().revealed) });
  },

  loadCsvRounds(rows) {
    // rows: [{round,question,a1,p1,a2,p2,...}]
    const rounds = rows.map((r) => {
      const answers = [];
      for (let i = 1; i <= 8; i++) {
        const a = r[`a${i}`];
        const p = Number(r[`p${i}`]);
        if (a && !Number.isNaN(p)) answers.push({ a: String(a), p: p });
      }
      return {
        q: String(r.question || "").trim(),
        answers,
        mult: Number(r.round) || 1
      };
    }).filter(r => r.q && r.answers.length);

    const next = {
      rounds,
      currentRoundIndex: rounds.length ? 0 : -1,
      revealed: [],
      strikesA: 0,
      strikesB: 0,
      buzz: null,
    };
    const bank = computeBank(rounds[next.currentRoundIndex]?.answers || [], []);
    get()._apply({ ...next, bank, total: 0, teamA: 0, teamB: 0 });
  },

  loadSample() {
    // 3 quick rounds
    const rounds = [
      { q: "Name something people do before a big meeting", answers: [
        { a: "Prepare slides", p: 35 }, { a: "Get coffee", p: 25 },
        { a: "Practice", p: 20 }, { a: "Check notes", p: 10 }, { a: "Review agenda", p: 5 }
      ], mult: 1 },
      { q: "Name a device people check first thing in the morning", answers: [
        { a: "Phone", p: 45 }, { a: "Tablet", p: 5 }, { a: "Smartwatch", p: 10 }
      ], mult: 1 },
      { q: "Name something you always find in a backpack", answers: [
        { a: "Notebook", p: 30 }, { a: "Pen", p: 25 }, { a: "Laptop", p: 20 }, { a: "Water bottle", p: 15 }, { a: "Snacks", p: 10 }
      ], mult: 1 }
    ];
    const bank = computeBank(rounds[0].answers, []);
    get()._apply({
      rounds, currentRoundIndex: 0, revealed: [], bank,
      strikesA: 0, strikesB: 0, buzz: null, teamA: 0, teamB: 0, total: 0
    });
  },

  selectRound(index) {
    const i = clamp(index, 0, (get().rounds.length || 1) - 1);
    const answers = get().rounds[i]?.answers || [];
    const bank = computeBank(answers, []);
    get()._apply({
      currentRoundIndex: i, revealed: [], strikesA: 0, strikesB: 0, buzz: null, bank
    });
  },

  // --- game actions
  revealAnswer(slotIdx) {
    const s = get();
    const i = s.currentRoundIndex;
    if (i < 0) return;
    const answers = s.rounds[i]?.answers || [];
    if (!answers[slotIdx]) return;
    if (s.revealed.includes(slotIdx)) return;

    const revealed = [...s.revealed, slotIdx].sort((a,b) => a-b);
    const bank = computeBank(answers, revealed);
    get()._apply({ revealed, bank, total: bank });
  },

  hideAnswer(slotIdx) {
    const s = get();
    const i = s.currentRoundIndex;
    if (i < 0) return;
    const answers = s.rounds[i]?.answers || [];
    const revealed = s.revealed.filter(x => x !== slotIdx);
    const bank = computeBank(answers, revealed);
    get()._apply({ revealed, bank, total: bank });
  },

  addStrike(team) {
    if (team !== "A" && team !== "B") return;
    const key = team === "A" ? "strikesA" : "strikesB";
    const next = clamp(get()[key] + 1, 0, 3);
    get()._apply({ [key]: next });
  },
  clearStrikes() {
    get()._apply({ strikesA: 0, strikesB: 0 });
  },

  setBuzz(team) {
    if (team !== "A" && team !== "B") return;
    get()._apply({ buzz: team });
  },
  resetBuzz() {
    get()._apply({ buzz: null });
  },

  awardTo(team) {
    if (team !== "A" && team !== "B") return;
    const s = get();
    const mult = s.rounds[s.currentRoundIndex]?.mult || s.roundMultiplier || 1;
    const delta = (s.bank || 0) * mult;
    if (delta <= 0) return;
    const update = team === "A" ? { teamA: s.teamA + delta } : { teamB: s.teamB + delta };
    // Move to next round but keep strikes reset and bank 0
    const nextIdx = s.currentRoundIndex + 1 < s.rounds.length ? s.currentRoundIndex + 1 : s.currentRoundIndex;
    const nextAnswers = s.rounds[nextIdx]?.answers || [];
    const bankNext = nextIdx === s.currentRoundIndex ? 0 : computeBank(nextAnswers, []);
    get()._apply({
      ...update,
      bank: 0,
      total: 0,
      revealed: nextIdx === s.currentRoundIndex ? s.revealed : [],
      strikesA: 0,
      strikesB: 0,
      buzz: null,
      currentRoundIndex: nextIdx,
      // preload next bank if we advanced
      ...(nextIdx !== s.currentRoundIndex ? { bank: bankNext } : {})
    });
  },

  resetScores() {
    const s = get();
    const i = s.currentRoundIndex;
    const answers = s.rounds[i]?.answers || [];
    const bank = computeBank(answers, []);
    get()._apply({
      teamA: 0, teamB: 0, strikesA: 0, strikesB: 0, revealed: [], bank, total: bank, buzz: null
    });
  },
}));

// Initialize listeners as soon as file is imported
try {
  // Guard against SSR
  if (typeof window !== "undefined") {
    useGame.getState().boot?.();
  }
} catch {}
