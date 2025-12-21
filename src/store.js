// src/store.js
// Single source of truth for host + studio tabs.
// Persists to localStorage and syncs via BroadcastChannel.

const VERSION = 'kk-game-v1';
const STORAGE_KEY = VERSION;

const bc = (() => {
  try {
    return new BroadcastChannel('kk-bus');
  } catch {
    return null;
  }
})();

const defaultState = () => ({
  title: 'K’mmunity Klash',
  font: 'Bangers',
  roundMultiplier: 1,
  // round: { question, answers: [{ text, points, revealed }] }
  round: null,
  bank: 0,
  teamA: { score: 0, strikes: 0 },
  teamB: { score: 0, strikes: 0 },
  // UI
  buzz: null, // 'A' | 'B' | null
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // guard shape
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

let state = loadState();
const listeners = new Set();

function emit() {
  // persist
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  // notify same-tab
  listeners.forEach((fn) => fn(state));
  // broadcast cross-tab
  try {
    bc?.postMessage({ type: 'kk-state', payload: state });
  } catch {}
}

// Cross-tab receive
bc?.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg?.type !== 'kk-state') return;
  state = msg.payload;
  listeners.forEach((fn) => fn(state));
});

// ---- Helpers ----
function recalcBank() {
  if (!state.round) {
    state.bank = 0;
    return;
  }
  const total =
    state.round.answers
      .filter((a) => a.revealed)
      .reduce((sum, a) => sum + (Number(a.points) || 0), 0) || 0;
  state.bank = total * (Number(state.roundMultiplier) || 1);
}

function setRound(data) {
  // data: { question, answers:[{text, points}], multiplier? }
  state.round = {
    question: data.question,
    answers: (data.answers || []).map((a) => ({
      text: a.text,
      points: Number(a.points) || 0,
      revealed: false,
    })),
  };
  state.roundMultiplier = Number(data.multiplier || 1);
  state.bank = 0;
  state.teamA.strikes = 0;
  state.teamB.strikes = 0;
  state.buzz = null;
  emit();
}

function revealIndex(idx) {
  if (!state.round) return;
  const entry = state.round.answers[idx];
  if (!entry) return;
  entry.revealed = !entry.revealed; // toggle
  recalcBank();
  emit();
}

function clearRoundUI() {
  state.buzz = null;
  emit();
}

function awardTo(teamKey /* 'teamA' | 'teamB' */) {
  const amt = Number(state.bank) || 0;
  if (amt <= 0) return;
  if (!['teamA', 'teamB'].includes(teamKey)) return;

  // ✅ add points, then zero the bank
  const team = state[teamKey];
  team.score = Number(team.score || 0) + amt;
  state.bank = 0;

  // optional: clear strikes on award (classic Feud behavior keeps strikes; we’ll keep them)
  emit();
}

function addStrike(teamKey) {
  if (!['teamA', 'teamB'].includes(teamKey)) return;
  const team = state[teamKey];
  team.strikes = Math.min(3, (Number(team.strikes) || 0) + 1);
  emit();
}

function clearStrikes() {
  state.teamA.strikes = 0;
  state.teamB.strikes = 0;
  emit();
}

function setTitle(t) {
  state.title = t || 'K’mmunity Klash';
  emit();
}

function setFont(f) {
  state.font = f || 'Bangers';
  emit();
}

function setMultiplier(m) {
  state.roundMultiplier = Number(m) || 1;
  recalcBank();
  emit();
}

function buzz(teamKey) {
  state.buzz = teamKey; // 'teamA' or 'teamB'
  emit();
}

function resetBuzz() {
  state.buzz = null;
  emit();
}

function resetScores() {
  state.teamA.score = 0;
  state.teamB.score = 0;
  state.teamA.strikes = 0;
  state.teamB.strikes = 0;
  state.bank = 0;
  if (state.round?.answers) {
    state.round.answers.forEach((a) => (a.revealed = false));
  }
  emit();
}

// Public API
export const Store = {
  get: () => state,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  // Mutations
  setRound,
  revealIndex,
  clearRoundUI,
  awardTo,
  addStrike,
  clearStrikes,
  setTitle,
  setFont,
  setMultiplier,
  buzz,
  resetBuzz,
  resetScores,
  // utilities for CSV/Sheets mapping
  fromRow(row) {
    // row: { round, question, a1, p1, a2, p2, ... }
    const answers = [];
    for (let i = 1; i <= 8; i++) {
      const text = row[`a${i}`];
      const pts = Number(row[`p${i}`]);
      if (text && !Number.isNaN(pts)) answers.push({ text, points: pts });
    }
    return {
      question: row.question?.toString() || 'Round',
      answers,
      multiplier: Number(row.round) || 1,
    };
  },
};
