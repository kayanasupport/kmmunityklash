import { useSyncExternalStore } from "react";

const STORAGE_KEY = "kk-game-v1";
const BC_NAME = "kk-bc";

let bc;
try {
  bc = new BroadcastChannel(BC_NAME);
} catch {
  bc = null;
}

let listeners = new Set();

let isApplyingRemote = false;

const defaultState = {
  title: "K’mmunity Klash",
  font: "Bangers",
  rounds: [],
  selectedRoundIndex: null,
  roundMultiplier: 1,
  revealed: Array(8).fill(false),
  bank: 0,
  teamA: { score: 0, strikes: 0 },
  teamB: { score: 0, strikes: 0 },
  buzz: null,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure shape
      return {
        ...defaultState,
        ...parsed,
        revealed: Array.isArray(parsed?.revealed) ? parsed.revealed.slice(0, 8).concat(Array(8).fill(false)).slice(0, 8) : Array(8).fill(false),
      };
    }
  } catch {}
  return { ...defaultState };
}

let state = loadState();

function saveAndBroadcast() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  if (bc && !isApplyingRemote) {
    try {
      bc.postMessage({ type: "state", payload: state });
    } catch {}
  }
  for (const l of listeners) l();
}

if (bc) {
  bc.onmessage = (ev) => {
    const { data } = ev;
    if (!data || data.type !== "state") return;
    isApplyingRemote = true;
    state = data.payload;
    for (const l of listeners) l();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
    isApplyingRemote = false;
  };
}

function computeBank(st) {
  const idx = st.selectedRoundIndex;
  if (idx == null) return 0;
  const round = st.rounds[idx];
  if (!round) return 0;
  const sum = st.revealed.reduce((acc, r, i) => {
    if (r) acc += Number(round.answers[i]?.points || 0);
    return acc;
  }, 0);
  return sum * Number(st.roundMultiplier || 1);
}

function setState(patch) {
  state = { ...state, ...patch };
  state.bank = computeBank(state);
  saveAndBroadcast();
}

export function useGame(selector) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state)
  );
}

function parseCsvTextInternal(text) {
  // Very simple CSV parser (assumes no quoted commas for game content)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const req = [
    "round",
    "question",
    "a1","p1","a2","p2","a3","p3","a4","p4","a5","p5","a6","p6","a7","p7","a8","p8"
  ];
  const hasAll = req.every((k) => header.includes(k));
  if (!hasAll) {
    throw new Error("CSV headers must include: " + req.join(", "));
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const round = Number(cols[idx.round] || 1) || 1;
    const question = cols[idx.question] || "";
    const answers = [];
    for (let n = 1; n <= 8; n++) {
      const a = cols[idx["a" + n]] || "";
      const p = Number(cols[idx["p" + n]] || 0) || 0;
      answers.push({ text: a, points: p });
    }
    return { round, question, answers };
  });
  return rows;
}

const SAMPLE_CSV = `round,question,a1,p1,a2,p2,a3,p3,a4,p4,a5,p5,a6,p6,a7,p7,a8,p8
1,Name something you bring to a picnic,Food,38,Blanket,22,Drinks,18,Utensils,8,Napkins,6,Games,4,Ice,3,Music,1
2,Name a household chore people avoid,Dishes,36,Laundry,24,Vacuum,14,Bathroom,12,Dusting,7,Windows,4,Trash,2,Yardwork,1
3,Name something people check twice before travel,Passport,30,Tickets,22,Money,18,Phone,10,Charger,8,Luggage,6,Itinerary,4,Keys,2`;

export const actions = {
  loadCsv(text) {
    let rounds = [];
    try {
      rounds = parseCsvTextInternal(text);
    } catch (e) {
      alert(e.message || "Failed to parse CSV");
      return;
    }
    const selectedRoundIndex = rounds.length ? 0 : null;
    const roundMultiplier = rounds[selectedRoundIndex]?.round || 1;
    setState({
      rounds,
      selectedRoundIndex,
      roundMultiplier,
      revealed: Array(8).fill(false),
      bank: 0,
      teamA: { score: 0, strikes: 0 },
      teamB: { score: 0, strikes: 0 },
      buzz: null,
    });
  },
  loadSample() {
    this.loadCsv(SAMPLE_CSV);
  },
  setSelectedRound(index) {
    const idx = Number(index);
    if (Number.isNaN(idx)) return;
    setState({
      selectedRoundIndex: idx,
      roundMultiplier: state.rounds[idx]?.round || 1,
      revealed: Array(8).fill(false),
      bank: 0,
      teamA: { ...state.teamA, strikes: 0 },
      teamB: { ...state.teamB, strikes: 0 },
      buzz: null,
    });
  },
  reveal(i) {
    const arr = state.revealed.slice();
    arr[i] = true;
    setState({ revealed: arr });
  },
  hide(i) {
    const arr = state.revealed.slice();
    arr[i] = false;
    setState({ revealed: arr });
  },
  setRoundMultiplier(m) {
    setState({ roundMultiplier: Number(m) || 1 });
  },
  award(team) {
    const t = team === "A" ? "teamA" : "teamB";
    const score = (state[t].score || 0) + (state.bank || 0);
    const newTeam = { ...state[t], score };
    setState({
      [t]: newTeam,
      bank: 0, // bank recomputed anyway, but ensure zeroed
    });
  },
  strike(team) {
    const t = team === "A" ? "teamA" : "teamB";
    const strikes = Math.min(3, (state[t].strikes || 0) + 1);
    setState({ [t]: { ...state[t], strikes } });
  },
  buzz(team) {
    setState({ buzz: team === "A" ? "A" : "B" });
  },
  resetBuzz() {
    setState({ buzz: null });
  },
  setTitle(title) {
    setState({ title });
  },
  setFont(font) {
    setState({ font });
  },
};

export { parseCsvTextInternal as parseCsvText };
