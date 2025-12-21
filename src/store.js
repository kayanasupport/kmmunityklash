import { useSyncExternalStore } from "react";

const STORAGE_KEY = "kk-game-v1";
const STATE_BC_NAME = "kk-bc";
const EVENT_BC_NAME = "kk-evt"; // instant SFX/events

let stateBc, eventBc;
try { stateBc = new BroadcastChannel(STATE_BC_NAME); } catch { stateBc = null; }
try { eventBc = new BroadcastChannel(EVENT_BC_NAME); } catch { eventBc = null; }

let listeners = new Set();
let isApplyingRemote = false;

const defaultState = {
  title: "K’mmunity Klash",
  font: "Bangers",
  rounds: [],
  selectedRoundIndex: null,
  roundMultiplier: 1,
  revealed: Array(8).fill(false),
  revealedEpochs: Array(8).fill(-1),
  bankEpoch: 0,
  bankOpen: true, // NEW: only count reveals while open
  bank: 0,
  teamA: { score: 0, strikes: 0 },
  teamB: { score: 0, strikes: 0 },
  buzz: null,
  strikeFlash: null,
  lastEvent: null, // still persisted for resilience
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

function postState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  if (stateBc && !isApplyingRemote) {
    try { stateBc.postMessage({ type: "state", payload: state }); } catch {}
  }
  for (const l of listeners) l();
}

function postEvent(evt) {
  // evt: { type, id, meta }
  if (eventBc) {
    try { eventBc.postMessage(evt); } catch {}
  }
}

if (stateBc) {
  stateBc.onmessage = (ev) => {
    const { data } = ev;
    if (!data || data.type !== "state") return;
    isApplyingRemote = true;
    state = data.payload;
    for (const l of listeners) l();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    isApplyingRemote = false;
  };
}

export function useGame(selector) {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => selector(state),
    () => selector(state)
  );
}

function computeBank(st) {
  if (!st.bankOpen) return 0;
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
  postState();
}

function resetForRoundChange(newIndex) {
  state = {
    ...state,
    selectedRoundIndex: newIndex,
    roundMultiplier: state.rounds[newIndex]?.round || 1,
    revealed: Array(8).fill(false),
    revealedEpochs: Array(8).fill(-1),
    bankEpoch: 0,
    bankOpen: true,
    bank: 0,
    teamA: { ...state.teamA, strikes: 0 },
    teamB: { ...state.teamB, strikes: 0 },
    buzz: null,
    strikeFlash: null,
    lastEvent: null,
  };
  postState();
}

const SAMPLE_CSV = `round,question,a1,p1,a2,p2,a3,p3,a4,p4,a5,p5,a6,p6,a7,p7,a8,p8
1,Name something you bring to a picnic,Food,38,Blanket,22,Drinks,18,Utensils,8,Napkins,6,Games,4,Ice,3,Music,1
2,Name a household chore people avoid,Dishes,36,Laundry,24,Vacuum,14,Bathroom,12,Dusting,7,Windows,4,Trash,2,Yardwork,1
3,Name something people check twice before travel,Passport,30,Tickets,22,Money,18,Phone,10,Charger,8,Luggage,6,Itinerary,4,Keys,2`;

export const actions = {
  loadCsv(text) {
    let rounds = [];
    try { rounds = parseCsvTextInternal(text); }
    catch (e) { alert(e.message || "Failed to parse CSV"); return; }

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
      bankOpen: true,
      bank: 0,
      teamA: { score: 0, strikes: 0 },
      teamB: { score: 0, strikes: 0 },
      buzz: null,
      strikeFlash: null,
      lastEvent: null,
    };
    postState();
  },
  loadSample() { this.loadCsv(SAMPLE_CSV); },
  setSelectedRound(index) {
    const idx = Number(index);
    if (!Number.isNaN(idx)) resetForRoundChange(idx);
  },

  reveal(i) {
    if (i < 0 || i > 7) return;
    const revealed = state.revealed.slice();
    const epochs = state.revealedEpochs.slice();
    revealed[i] = true;
    // only mark as countable if bank is open
    epochs[i] = state.bankOpen ? state.bankEpoch : -1;

    const next = { ...state, revealed, revealedEpochs: epochs };
    next.bank = computeBank(next);
    const evt = { type: "reveal", id: Date.now(), meta: { i } };
    next.lastEvent = evt;
    state = next;
    postState();
    postEvent(evt);
  },
  hide(i) {
    if (i < 0 || i > 7) return;
    const revealed = state.revealed.slice();
    revealed[i] = false;
    const next = { ...state, revealed };
    next.bank = computeBank(next);
    state = next;
    postState();
  },

  setRoundMultiplier(m) {
    const next = { ...state, roundMultiplier: Number(m) || 1 };
    next.bank = computeBank(next);
    state = next;
    postState();
  },

  award(team) {
    const t = team === "A" ? "teamA" : "teamB";
    const score = (state[t].score || 0) + (state.bank || 0);
    const evt = { type: "award", id: Date.now(), meta: { team } };
    state = {
      ...state,
      [t]: { ...state[t], score },
      bank: 0,
      bankOpen: false,      // freeze further counting
      bankEpoch: state.bankEpoch + 1,
      lastEvent: evt,
    };
    postState(); postEvent(evt);
  },

  // NEW: explicitly freeze bank for reveal-only demo of remaining answers
  endRound() {
    const evt = { type: "award", id: Date.now(), meta: { team: null } };
    state = {
      ...state,
      bank: 0,
      bankOpen: false,
      bankEpoch: state.bankEpoch + 1,
      lastEvent: evt,
    };
    postState(); postEvent(evt);
  },

  strike(team) {
    const key = team === "A" ? "teamA" : "teamB";
    const strikes = Math.min(3, (state[key].strikes || 0) + 1);
    const flash = { team: team === "A" ? "A" : "B", id: Date.now() };
    const evt = { type: "strike", id: flash.id, meta: { team } };
    state = {
      ...state,
      [key]: { ...state[key], strikes },
      strikeFlash: flash,
      lastEvent: evt,
    };
    postState(); postEvent(evt);
    setTimeout(() => { state = { ...state, strikeFlash: null }; postState(); }, 900);
  },
  clearStrikes() {
    setState({
      teamA: { ...state.teamA, strikes: 0 },
      teamB: { ...state.teamB, strikes: 0 },
    });
  },

  buzz(team) {
    const evt = { type: "buzz", id: Date.now(), meta: { team } };
    setState({ buzz: team === "A" ? "A" : "B", lastEvent: evt });
    postEvent(evt);
  },
  resetBuzz() { setState({ buzz: null }); },

  resetScores() {
    const evt = { type: "reset", id: Date.now() };
    state = {
      ...state,
      teamA: { score: 0, strikes: 0 },
      teamB: { score: 0, strikes: 0 },
      bank: 0,
      bankOpen: true,
      bankEpoch: state.bankEpoch + 1,
      buzz: null,
      lastEvent: evt,
    };
    postState(); postEvent(evt);
  },
  transferAll(from, to) {
    const src = from === "A" ? "teamA" : "teamB";
    const dst = to === "A" ? "teamA" : "teamB";
    if (src === dst) return;
    const amount = state[src].score || 0;
    const evt = { type: "transfer", id: Date.now(), meta: { from, to, amount } };
    state = {
      ...state,
      [src]: { ...state[src], score: 0 },
      [dst]: { ...state[dst], score: (state[dst].score || 0) + amount },
      lastEvent: evt,
    };
    postState(); postEvent(evt);
  },

  setTitle(title) { setState({ title }); },
  setFont(font) { setState({ font }); },
};

function parseCsvTextInternal(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const req = ["round","question","a1","p1","a2","p2","a3","p3","a4","p4","a5","p5","a6","p6","a7","p7","a8","p8"];
  if (!req.every((k) => header.includes(k))) throw new Error("CSV headers must include: " + req.join(", "));
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return lines.slice(1).map((line) => {
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
}

export { parseCsvTextInternal as parseCsvText };
