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
  // epoch-based banking so award->0 sticks until new reveals
  revealedEpochs: Array(8).fill(-1),
  bankEpoch: 0,
  bank: 0,
  teamA: { score: 0, strikes: 0 },
  teamB: { score: 0, strikes: 0 },
  buzz: null,
  strikeFlash: null, // { team:'A'|'B', id:number }
  // NEW: studio SFX driver (Studio listens to this and plays sounds)
  lastEvent: null, // { type:'reveal'|'strike'|'buzz'|'award', id:number, meta?:any }
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        revealed: Array.isArray(parsed?.revealed)
          ? parsed.revealed.slice(0, 8).concat(Array(8).fill(false)).slice(0, 8)
          : Array(8).fill(false),
        revealedEpochs: Array.isArray(parsed?.revealedEpochs)
          ? parsed.revealedEpochs.slice(0, 8).concat(Array(8).fill(-1)).slice(0, 8)
          : Array(8).fill(-1),
      };
    }
  } catch {}
  return { ...defaultState };
}

let state = loadState();

function persistAndBroadcast() {
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

// Compute bank from tiles revealed in current bankEpoch only
function computeBankFromEpoch(st) {
  const idx = st.selectedRoundIndex;
  if (idx == null) return 0;
  const round = st.rounds[idx];
  if (!round) return 0;
  const m = Number(st.roundMultiplier || 1);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    if (st.revealed[i] && st.revealedEpochs[i] === st.bankEpoch) {
      sum += Number(round.answers?.[i]?.points || 0);
    }
  }
  return sum * m;
}

function setState(patch) {
  state = { ...state, ...patch };
  persistAndBroadcast();
}

function resetForRoundChange(newIndex) {
  setState({
    selectedRoundIndex: newIndex,
    roundMultiplier: state.rounds[newIndex]?.round || 1,
    revealed: Array(8).fill(false),
    revealedEpochs: Array(8).fill(-1),
    bankEpoch: 0,
    bank: 0,
    teamA: { ...state.teamA, strikes: 0 },
    teamB: { ...state.teamB, strikes: 0 },
    buzz: null,
    strikeFlash: null,
    lastEvent: null,
  });
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
    state = {
      ...state,
      rounds,
      selectedRoundIndex,
      roundMultiplier,
      revealed: Array(8).fill(false),
      revealedEpochs: Array(8).fill(-1),
      bankEpoch: 0,
      bank: 0,
      teamA: { score: 0, strikes: 0 },
      teamB: { score: 0, strikes: 0 },
      buzz: null,
      strikeFlash: null,
      lastEvent: null,
    };
    persistAndBroadcast();
  },
  loadSample() {
    this.loadCsv(SAMPLE_CSV);
  },
  setSelectedRound(index) {
    const idx = Number(index);
    if (Number.isNaN(idx)) return;
    resetForRoundChange(idx);
  },
  reveal(i) {
    if (i < 0 || i > 7) return;
    const arr = state.revealed.slice();
    arr[i] = true;
    const epochs = state.revealedEpochs.slice();
    epochs[i] = state.bankEpoch;
    const next = { ...state, revealed: arr, revealedEpochs: epochs };
    next.bank = computeBankFromEpoch(next);
    next.lastEvent = { type: "reveal", id: Date.now(), meta: { i } };
    state = next;
    persistAndBroadcast();
  },
  hide(i) {
    if (i < 0 || i > 7) return;
    const arr = state.revealed.slice();
    arr[i] = false;
    const next = { ...state, revealed: arr };
    next.bank = computeBankFromEpoch(next);
    state = next;
    persistAndBroadcast();
  },
  setRoundMultiplier(m) {
    const next = { ...state, roundMultiplier: Number(m) || 1 };
    next.bank = computeBankFromEpoch(next);
    state = next;
    persistAndBroadcast();
  },
  award(team) {
    const t = team === "A" ? "teamA" : "teamB";
    const score = (state[t].score || 0) + (state.bank || 0);
    state = {
      ...state,
      [t]: { ...state[t], score },
      bank: 0,
      bankEpoch: state.bankEpoch + 1, // start new epoch so old reveals don't add back
      lastEvent: { type: "award", id: Date.now(), meta: { team } },
    };
    persistAndBroadcast();
  },
  strike(team) {
    const t = team === "A" ? "teamA" : "teamB";
    const strikes = Math.min(3, (state[t].strikes || 0) + 1);
    const flash = { team: team === "A" ? "A" : "B", id: Date.now() };
    state = {
      ...state,
      [t]: { ...state[t], strikes },
      strikeFlash: flash,
      lastEvent: { type: "strike", id: flash.id, meta: { team } },
    };
    persistAndBroadcast();
    setTimeout(() => {
      state = { ...state, strikeFlash: null };
      persistAndBroadcast();
    }, 900);
  },
  clearStrikes() {
    setState({
      teamA: { ...state.teamA, strikes: 0 },
      teamB: { ...state.teamB, strikes: 0 },
    });
  },
  buzz(team) {
    setState({
      buzz: team === "A" ? "A" : "B",
      lastEvent: { type: "buzz", id: Date.now(), meta: { team } },
    });
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

function parseCsvTextInternal(text) {
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

export { parseCsvTextInternal as parseCsvText };
