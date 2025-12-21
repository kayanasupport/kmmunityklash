// Simple, framework-free game store with:
// - subscribe() for React/Studio to listen
// - useGame() hook for React components (useSyncExternalStore)
// - actions object (many aliases) used by Host and Studio
// - BroadcastChannel sync between tabs
// - localStorage persistence
//
// Exports expected by your UI:
//   - actions
//   - subscribe
//   - parseCsvText
//   - useGame

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "kk-game-v1";
const CHANNEL_NAME = "kk-game-bc";

// ------------- helpers -----------------

function deepClone(obj) {
  return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

function nowId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ------------- CSV ---------------------

// Expected headers: round, question, a1,p1, a2,p2, ..., a8,p8  (answers optional, 4–8 typical)
export function parseCsvText(text) {
  // light CSV parser (no commas inside quotes in your data)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => l.split(","));

  const H = (name) => headers.indexOf(name.toLowerCase());

  const out = [];

  for (const cols of rows) {
    const roundMult = Number(cols[H("round")] ?? 1) || 1;
    const question = (cols[H("question")] ?? "").trim();

    const answers = [];
    for (let i = 1; i <= 8; i++) {
      const a = cols[H(`a${i}`)];
      const p = cols[H(`p${i}`)];
      if (a && a.trim().length) {
        answers.push({
          text: a.trim(),
          points: Number(p ?? 0) || 0,
          revealed: false,
          slot: i,
        });
      }
    }

    if (question || answers.length) {
      out.push({
        id: nowId(),
        roundMultiplier: roundMult,
        question,
        answers,
      });
    }
  }

  return out;
}

// ------------- core store --------------

const initialState = {
  title: "K'mmunity Klash",
  font: "Bangers (bold comic)",
  roundMultiplier: 1,
  bank: 0,
  teamA: { score: 0, strikes: 0 },
  teamB: { score: 0, strikes: 0 },
  buzz: null, // "A" | "B" | null
  // current round
  question: "",
  answers: [], // [{text, points, revealed, slot}]
  // inventory of rounds (loaded from CSV or sample)
  rounds: [],
};

// load persisted
let state = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...initialState, ...parsed };
    }
  } catch {}
  return deepClone(initialState);
})();

const listeners = new Set();
const chan = "BroadcastChannel" in globalThis ? new BroadcastChannel(CHANNEL_NAME) : null;

// broadcast handler
if (chan) {
  chan.onmessage = (ev) => {
    if (!ev?.data || ev.data.type !== "kk:state") return;
    // ignore if same snapshot id
    if (ev.data.id && ev.data.id === state.__id) return;

    state = ev.data.payload;
    persist();
    emit();
  };
}

function emit() {
  for (const l of listeners) l();
}

function snapshot() {
  // generate snapshot id for loop prevention
  state.__id = nowId();
  return deepClone(state);
}

function persist() {
  const toSave = deepClone(state);
  delete toSave.__id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

// sync to channel
function broadcast() {
  if (!chan) return;
  chan.postMessage({ type: "kk:state", id: state.__id, payload: state });
}

function setState(updater) {
  const next = typeof updater === "function" ? updater(state) : updater;
  state = { ...state, ...next };
  persist();
  emit();
  broadcast();
}

function updateState(mutator) {
  const next = deepClone(state);
  mutator(next);
  state = next;
  persist();
  emit();
  broadcast();
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useGame(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

// ------------- actions -----------------

function setTitle(title) {
  setState({ title });
}
function setFont(font) {
  setState({ font });
}

function resetScores() {
  updateState((s) => {
    s.teamA.score = 0;
    s.teamB.score = 0;
    s.teamA.strikes = 0;
    s.teamB.strikes = 0;
    s.bank = 0;
    s.buzz = null;
  });
}

function setRoundMultiplier(m) {
  const n = Number(m) || 1;
  setState({ roundMultiplier: n });
}

function setRound(round) {
  updateState((s) => {
    s.roundMultiplier = round?.roundMultiplier ?? 1;
    s.question = round?.question ?? "";
    s.answers = (round?.answers ?? []).map((a, i) => ({
      text: a.text ?? "",
      points: Number(a.points ?? 0) || 0,
      revealed: false,
      slot: a.slot ?? i + 1,
    }));
    s.bank = 0;
    s.buzz = null;
    s.teamA.strikes = 0;
    s.teamB.strikes = 0;
  });
}

function setRounds(rounds) {
  updateState((s) => {
    s.rounds = rounds ?? [];
  });
}

function revealAnswer(index1) {
  const idx = Number(index1) - 1;
  updateState((s) => {
    const a = s.answers[idx];
    if (!a || a.revealed) return;
    a.revealed = true;
    s.bank += a.points * (s.roundMultiplier || 1);
  });
}

function hideAnswer(index1) {
  const idx = Number(index1) - 1;
  updateState((s) => {
    const a = s.answers[idx];
    if (!a || !a.revealed) return;
    a.revealed = false;
    s.bank -= a.points * (s.roundMultiplier || 1);
    if (s.bank < 0) s.bank = 0;
  });
}

function addStrike(team) {
  const t = team?.toUpperCase() === "B" ? "teamB" : "teamA";
  updateState((s) => {
    s[t].strikes = Math.min(3, (s[t].strikes || 0) + 1);
  });
}

function clearStrikes(team) {
  const t = team?.toUpperCase() === "B" ? "teamB" : "teamA";
  updateState((s) => {
    s[t].strikes = 0;
  });
}

function awardTo(team) {
  const t = team?.toUpperCase() === "B" ? "teamB" : "teamA";
  updateState((s) => {
    const add = s.bank || 0;
    s[t].score += add;
    s.bank = 0;
    s.buzz = null;
    s.teamA.strikes = 0;
    s.teamB.strikes = 0;
  });
}

function setBuzz(team) {
  const v = team ? team.toUpperCase() : null;
  setState({ buzz: v === "A" || v === "B" ? v : null });
}

function resetBuzz() {
  setState({ buzz: null });
}

function loadFromCsvText(text) {
  const rounds = parseCsvText(text);
  setRounds(rounds);
  if (rounds.length) setRound(rounds[0]);
}

// Provide lots of aliases so the host UI won't break if it calls slightly different names.
export const actions = {
  // config
  setTitle,
  setFont,
  setRoundMultiplier,
  resetScores,

  // rounds
  setRound,
  setRounds,
  loadFromCsvText,

  // answers
  revealAnswer,
  hideAnswer,
  reveal: revealAnswer,
  toggleReveal: revealAnswer,

  // strikes
  addStrike,
  clearStrikes,
  strike: addStrike,
  strikeA: () => addStrike("A"),
  strikeB: () => addStrike("B"),
  clearStrikesA: () => clearStrikes("A"),
  clearStrikesB: () => clearStrikes("B"),

  // awards / bank / buzz
  awardTo,
  award: awardTo,
  awardA: () => awardTo("A"),
  awardB: () => awardTo("B"),
  setBuzz,
  resetBuzz,
  buzz: setBuzz,
  buzzA: () => setBuzz("A"),
  buzzB: () => setBuzz("B"),
};

// ------------- convenience for non-React usage --------

export const getState = () => state;
